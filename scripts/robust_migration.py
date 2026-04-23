#!/usr/bin/env python3
"""
稳健迁移 naming_classics 表 - 使用小批量、连接重试和进度保存
用法: python scripts/robust_migration.py <VERCEL_POSTGRES_URL>
"""

import psycopg2
import sys
import time
import json
import os
from datetime import datetime

# 本地数据库配置
LOCAL_DB = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
    "dbname": "seekname_db"
}

# 进度文件路径
PROGRESS_FILE = "migration_progress.json"

def get_local_connection():
    """连接到本地数据库"""
    return psycopg2.connect(**LOCAL_DB)

def get_vercel_connection(url: str):
    """连接到Vercel Postgres数据库"""
    return psycopg2.connect(url)

def get_column_names(local_cur):
    """获取naming_classics表的列名"""
    local_cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'naming_classics' 
        ORDER BY ordinal_position
    """)
    columns = [row[0] for row in local_cur.fetchall()]
    return columns

def load_progress():
    """加载迁移进度"""
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {
        "last_original_id": 0,
        "total_migrated": 0,
        "start_time": None,
        "last_update": None
    }

def save_progress(progress):
    """保存迁移进度"""
    progress["last_update"] = datetime.now().isoformat()
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)

def check_vercel_status(vercel_url):
    """检查Vercel上当前状态"""
    print("\n[检查状态] Vercel数据库当前状态...")
    
    try:
        conn = get_vercel_connection(vercel_url)
        cur = conn.cursor()
        
        # 检查表是否存在
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'naming_classics'
            )
        """)
        
        if cur.fetchone()[0]:
            # 获取已有记录数
            cur.execute("SELECT COUNT(*) FROM naming_classics")
            existing_count = cur.fetchone()[0]
            
            # 获取最大的original_id
            cur.execute("SELECT MAX(original_id) FROM naming_classics WHERE original_id IS NOT NULL")
            max_id_result = cur.fetchone()[0]
            max_id = max_id_result if max_id_result is not None else 0
            
            print(f"  -> Vercel上已有 {existing_count} 条记录")
            print(f"  -> 最大 original_id: {max_id}")
            
            cur.close()
            conn.close()
            return max_id, existing_count
        else:
            print("  -> 表不存在，请先运行完整迁移脚本")
            cur.close()
            conn.close()
            return 0, 0
            
    except Exception as e:
        print(f"  -> 检查状态时出错: {e}")
        return 0, 0

def robust_migrate_batch(vercel_url, batch_data, columns, batch_num, total_batches):
    """稳健地迁移一个批次的数据"""
    max_retries = 5
    for retry in range(max_retries):
        try:
            conn = get_vercel_connection(vercel_url)
            cur = conn.cursor()
            
            # 构建列字符串和占位符
            cols_str = ", ".join(columns)
            placeholders = ", ".join(["%s"] * len(columns))
            
            cur.executemany(
                f"INSERT INTO naming_classics ({cols_str}) VALUES ({placeholders})",
                batch_data
            )
            conn.commit()
            
            cur.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"    批次 #{batch_num} 第{retry+1}次尝试失败: {e}")
            if retry < max_retries - 1:
                wait_time = 2 ** retry  # 指数退避
                print(f"      等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                print(f"    ✗ 批次 #{batch_num} 导入失败，跳过该批次")
                return False
    
    return False

def migrate_with_progress(local_cur, vercel_url, columns, start_original_id, batch_size=100):
    """
    使用进度跟踪迁移数据
    
    参数:
        local_cur: 本地数据库游标
        vercel_url: Vercel数据库连接URL
        columns: 列名列表
        start_original_id: 开始导入的original_id
        batch_size: 每批处理的记录数（默认100）
    """
    print(f"\n[开始迁移] 从 original_id > {start_original_id} 开始...")
    
    # 统计剩余记录数
    local_cur.execute("SELECT COUNT(*) FROM naming_classics WHERE original_id > %s", (start_original_id,))
    total_remaining = local_cur.fetchone()[0]
    
    if total_remaining == 0:
        print("  -> 没有需要导入的记录")
        return 0, start_original_id
    
    print(f"  总剩余记录数: {total_remaining} 条")
    print(f"  批次大小: {batch_size} 条")
    
    # 查询剩余数据，按original_id排序
    cols_str = ", ".join(columns)
    local_cur.execute(f"SELECT {cols_str} FROM naming_classics WHERE original_id > %s ORDER BY original_id", (start_original_id,))
    
    total_migrated = 0
    batch_count = 0
    start_time = time.time()
    last_original_id = start_original_id
    
    # 加载进度
    progress = load_progress()
    if progress["last_original_id"] > start_original_id:
        print(f"  检测到之前的进度: last_original_id={progress['last_original_id']}")
        last_original_id = progress["last_original_id"]
        total_migrated = progress["total_migrated"]
    
    while True:
        # 获取下一批数据
        rows = local_cur.fetchmany(batch_size)
        if not rows:
            break
        
        batch_count += 1
        current_batch_size = len(rows)
        
        # 获取这批数据的最大original_id
        try:
            original_id_index = columns.index('original_id')
            batch_last_id = max(row[original_id_index] for row in rows if row[original_id_index] is not None)
            last_original_id = batch_last_id
        except:
            pass
        
        # 迁移这个批次
        success = robust_migrate_batch(vercel_url, rows, columns, batch_count, total_remaining // batch_size + 1)
        
        if success:
            total_migrated += current_batch_size
            progress_pct = total_migrated / total_remaining * 100
            
            # 显示进度
            elapsed = time.time() - start_time
            if elapsed > 0:
                speed = total_migrated / elapsed
                remaining_time = (total_remaining - total_migrated) / speed if speed > 0 else 0
                
                print(f"  批次 #{batch_count}: +{current_batch_size} 条 | 累计: {total_migrated}/{total_remaining} ({progress_pct:.1f}%)")
                print(f"    速度: {speed:.1f} 条/秒 | 预计剩余: {remaining_time/60:.1f} 分钟 | 当前 original_id: {last_original_id}")
            
            # 每5批保存一次进度
            if batch_count % 5 == 0:
                progress["last_original_id"] = last_original_id
                progress["total_migrated"] = total_migrated
                if progress["start_time"] is None:
                    progress["start_time"] = datetime.now().isoformat()
                save_progress(progress)
                print(f"    ✓ 进度已保存")
        
        # 每批之间稍作休息，避免服务器压力过大
        time.sleep(0.5)
    
    # 迁移完成，保存最终进度
    progress["last_original_id"] = last_original_id
    progress["total_migrated"] = total_migrated
    if progress["start_time"] is None:
        progress["start_time"] = datetime.now().isoformat()
    save_progress(progress)
    
    elapsed = time.time() - start_time
    if elapsed > 60:
        print(f"\n  总耗时: {elapsed/60:.1f} 分钟")
        print(f"  平均速度: {total_migrated/elapsed:.1f} 条/秒")
    else:
        print(f"\n  总耗时: {elapsed:.1f} 秒")
        print(f"  平均速度: {total_migrated/elapsed:.1f} 条/秒")
    
    return total_migrated, last_original_id

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python scripts/robust_migration.py <VERCEL_POSTGRES_URL>")
        print("示例: python scripts/robust_migration.py 'postgresql://user:pass@host.vercel-storage.com:5432/db?sslmode=require'")
        sys.exit(1)
    
    vercel_url = sys.argv[1]
    
    print("=" * 60)
    print("稳健迁移 naming_classics 表到 Vercel Postgres")
    print("=" * 60)
    
    try:
        # 连接到本地数据库
        print("\n[初始化] 连接数据库...")
        local_conn = get_local_connection()
        local_cur = local_conn.cursor()
        print("  -> 已连接到本地数据库")
        
        # 1. 检查Vercel当前状态
        last_original_id, existing_count = check_vercel_status(vercel_url)
        
        if existing_count == 0:
            print("\n  -> Vercel表为空，请先运行完整迁移脚本")
            local_cur.close()
            local_conn.close()
            sys.exit(1)
        
        # 2. 获取列名
        columns = get_column_names(local_cur)
        print(f"\n  检测到列: {columns}")
        
        # 3. 统计本地剩余记录
        local_cur.execute("SELECT COUNT(*) FROM naming_classics WHERE original_id > %s", (last_original_id,))
        remaining_count = local_cur.fetchone()[0]
        
        if remaining_count == 0:
            print(f"\n  -> 没有需要导入的记录 (original_id > {last_original_id})")
            local_cur.close()
            local_conn.close()
            
            # 删除进度文件
            if os.path.exists(PROGRESS_FILE):
                os.remove(PROGRESS_FILE)
                print(f"  -> 进度文件已删除")
            
            return
        
        print(f"\n  需要导入的记录数: {remaining_count} 条 (original_id > {last_original_id})")
        
        # 4. 检查是否有之前的进度
        progress = load_progress()
        if progress["last_original_id"] > last_original_id:
            print(f"  检测到之前的进度: 已导入 {progress['total_migrated']} 条，最后 original_id: {progress['last_original_id']}")
            response = input(f"  是否从上次进度继续？ (Y/N): ").strip().upper()
            if response == 'Y':
                last_original_id = progress["last_original_id"]
                print(f"  将从 original_id > {last_original_id} 继续导入")
            else:
                print(f"  将从头开始导入 (original_id > {last_original_id})")
                progress = {"last_original_id": last_original_id, "total_migrated": 0, "start_time": None, "last_update": None}
                save_progress(progress)
        else:
            # 初始化进度
            progress = {"last_original_id": last_original_id, "total_migrated": 0, "start_time": None, "last_update": None}
            save_progress(progress)
        
        # 5. 确认是否继续
        response = input(f"\n  是否开始导入 {remaining_count} 条记录？ (Y/N): ").strip().upper()
        if response != 'Y':
            print("  -> 用户取消导入")
            local_cur.close()
            local_conn.close()
            return
        
        # 6. 开始迁移
        migrated_count, final_original_id = migrate_with_progress(
            local_cur, vercel_url, columns, last_original_id, batch_size=100
        )
        
        # 7. 验证结果
        if migrated_count > 0:
            print("\n[验证] 检查迁移结果...")
            try:
                conn = get_vercel_connection(vercel_url)
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM naming_classics")
                final_count = cur.fetchone()[0]
                cur.close()
                conn.close()
                
                print(f"  Vercel表最终记录数: {final_count} 条")
                print(f"  本次导入记录数: {migrated_count} 条")
                print(f"  最后导入的 original_id: {final_original_id}")
                
                if migrated_count == remaining_count:
                    print(f"  -> ✓ 所有剩余记录导入成功！")
                    
                    # 删除进度文件
                    if os.path.exists(PROGRESS_FILE):
                        os.remove(PROGRESS_FILE)
                        print(f"  -> 进度文件已删除")
                else:
                    print(f"  -> ⚠ 部分记录导入成功 ({migrated_count}/{remaining_count})")
                    print(f"  -> 进度已保存，下次可从 original_id > {final_original_id} 继续")
                    
            except Exception as e:
                print(f"  -> 验证时出错: {e}")
        
        # 关闭连接
        local_cur.close()
        local_conn.close()
        
        print("\n" + "=" * 60)
        print("✓ 迁移操作完成！")
        print(f"  本次导入记录: {migrated_count} 条")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[错误] 迁移过程中出现异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()