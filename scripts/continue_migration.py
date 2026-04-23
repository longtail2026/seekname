#!/usr/bin/env python3
"""
继续迁移 naming_classics 表 - 从上次停止的地方继续导入
用法: python scripts/continue_migration.py <VERCEL_POSTGRES_URL>
"""

import psycopg2
import sys
import time

# 本地数据库配置
LOCAL_DB = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
    "dbname": "seekname_db"
}

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

def count_remaining_records(local_cur, last_original_id):
    """统计需要导入的记录数"""
    local_cur.execute("SELECT COUNT(*) FROM naming_classics WHERE original_id > %s", (last_original_id,))
    return local_cur.fetchone()[0]

def migrate_remaining_data(local_cur, vercel_cur, columns, last_original_id, batch_size=200):
    """
    导入剩余的数据（original_id > last_original_id）
    
    参数:
        local_cur: 本地数据库游标
        vercel_cur: Vercel数据库游标
        columns: 列名列表
        last_original_id: 上次导入的最大original_id
        batch_size: 每批处理的记录数（默认200）
    """
    print(f"\n[开始导入] 导入 original_id > {last_original_id} 的记录...")
    
    # 统计剩余记录数
    remaining_count = count_remaining_records(local_cur, last_original_id)
    print(f"  剩余记录数: {remaining_count} 条")
    
    if remaining_count == 0:
        print("  -> 没有需要导入的记录")
        return 0
    
    # 构建列字符串和占位符
    cols_str = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    
    # 查询剩余数据，按original_id排序
    local_cur.execute(f"SELECT {cols_str} FROM naming_classics WHERE original_id > %s ORDER BY original_id", (last_original_id,))
    
    total_migrated = 0
    batch_count = 0
    start_time = time.time()
    
    while True:
        # 获取下一批数据
        rows = local_cur.fetchmany(batch_size)
        if not rows:
            break
        
        batch_count += 1
        current_batch_size = len(rows)
        
        # 最多重试3次
        max_retries = 3
        success = False
        
        for retry in range(max_retries):
            try:
                vercel_cur.executemany(
                    f"INSERT INTO naming_classics ({cols_str}) VALUES ({placeholders})",
                    rows
                )
                vercel_cur.connection.commit()
                
                total_migrated += current_batch_size
                progress_pct = total_migrated / remaining_count * 100
                
                print(f"  批次 #{batch_count}: +{current_batch_size} 条 | 累计: {total_migrated}/{remaining_count} ({progress_pct:.1f}%)")
                success = True
                break
                
            except Exception as e:
                print(f"  -> 批次 #{batch_count} 第{retry+1}次尝试失败: {e}")
                vercel_cur.connection.rollback()
                
                if retry < max_retries - 1:
                    # 等待后重试
                    wait_time = 2 ** retry  # 指数退避
                    print(f"    等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
                else:
                    print(f"  -> ✗ 批次 #{batch_count} 导入失败，跳过该批次")
        
        # 每10批显示一次详细进度
        if batch_count % 10 == 0:
            elapsed = time.time() - start_time
            if elapsed > 0:
                speed = total_migrated / elapsed
                eta = (remaining_count - total_migrated) / speed if speed > 0 else 0
                print(f"  进度: {total_migrated}/{remaining_count} ({progress_pct:.1f}%) | 速度: {speed:.1f} 条/秒 | 预计剩余: {eta/60:.1f} 分钟")
    
    elapsed = time.time() - start_time
    if elapsed > 60:
        print(f"\n  总耗时: {elapsed/60:.1f} 分钟")
        print(f"  平均速度: {total_migrated/elapsed:.1f} 条/秒")
    else:
        print(f"\n  总耗时: {elapsed:.1f} 秒")
        print(f"  平均速度: {total_migrated/elapsed:.1f} 条/秒")
    
    return total_migrated

def check_vercel_status(vercel_cur):
    """检查Vercel上当前状态"""
    print("\n[检查状态] Vercel数据库当前状态...")
    
    try:
        # 检查表是否存在
        vercel_cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'naming_classics'
            )
        """)
        
        if vercel_cur.fetchone()[0]:
            # 获取已有记录数
            vercel_cur.execute("SELECT COUNT(*) FROM naming_classics")
            existing_count = vercel_cur.fetchone()[0]
            
            # 获取最大的original_id
            vercel_cur.execute("SELECT MAX(original_id) FROM naming_classics WHERE original_id IS NOT NULL")
            max_id_result = vercel_cur.fetchone()[0]
            max_id = max_id_result if max_id_result is not None else 0
            
            print(f"  -> Vercel上已有 {existing_count} 条记录")
            print(f"  -> 最大 original_id: {max_id}")
            
            return max_id
        else:
            print("  -> 表不存在，请先运行完整迁移脚本")
            return 0
            
    except Exception as e:
        print(f"  -> 检查状态时出错: {e}")
        return 0

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python scripts/continue_migration.py <VERCEL_POSTGRES_URL>")
        print("示例: python scripts/continue_migration.py 'postgresql://user:pass@host.vercel-storage.com:5432/db?sslmode=require'")
        sys.exit(1)
    
    vercel_url = sys.argv[1]
    
    print("=" * 60)
    print("继续迁移 naming_classics 表到 Vercel Postgres")
    print("=" * 60)
    
    try:
        # 连接到本地数据库
        print("\n[初始化] 连接数据库...")
        local_conn = get_local_connection()
        local_cur = local_conn.cursor()
        print("  -> 已连接到本地数据库")
        
        # 连接到Vercel数据库
        vercel_conn = get_vercel_connection(vercel_url)
        vercel_cur = vercel_conn.cursor()
        print("  -> 已连接到Vercel Postgres")
        
        # 1. 检查Vercel当前状态
        last_original_id = check_vercel_status(vercel_cur)
        
        if last_original_id == 0:
            print("\n  -> 无法继续迁移，请先运行完整迁移脚本")
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
            vercel_cur.close()
            vercel_conn.close()
            return
        
        print(f"\n  需要导入的记录数: {remaining_count} 条 (original_id > {last_original_id})")
        
        # 4. 确认是否继续
        response = input(f"\n  是否继续导入 {remaining_count} 条记录？ (Y/N): ").strip().upper()
        if response != 'Y':
            print("  -> 用户取消导入")
            local_cur.close()
            local_conn.close()
            vercel_cur.close()
            vercel_conn.close()
            return
        
        # 5. 开始导入剩余数据
        migrated_count = migrate_remaining_data(local_cur, vercel_cur, columns, last_original_id, batch_size=200)
        
        # 6. 验证结果
        if migrated_count > 0:
            print("\n[验证] 检查迁移结果...")
            vercel_cur.execute("SELECT COUNT(*) FROM naming_classics")
            final_count = vercel_cur.fetchone()[0]
            print(f"  Vercel表最终记录数: {final_count} 条")
            print(f"  本次导入记录数: {migrated_count} 条")
            
            if migrated_count == remaining_count:
                print(f"  -> ✓ 所有剩余记录导入成功！")
            else:
                print(f"  -> ⚠ 部分记录导入成功 ({migrated_count}/{remaining_count})")
        
        # 关闭连接
        local_cur.close()
        local_conn.close()
        vercel_cur.close()
        vercel_conn.close()
        
        print("\n" + "=" * 60)
        print("✓ 继续迁移操作完成！")
        print(f"  本次导入记录: {migrated_count} 条")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[错误] 迁移过程中出现异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()