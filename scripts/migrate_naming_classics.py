#!/usr/bin/env python3
"""
naming_classics 表迁移脚本 - 支持分批导入和用户确认
用法: python scripts/migrate_naming_classics.py <VERCEL_POSTGRES_URL>
"""

import psycopg2
import sys
import os

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

def create_naming_classics_table(vercel_cur):
    """在Vercel上创建naming_classics表"""
    print("\n[步骤1/3] 创建naming_classics表结构...")
    
    vercel_cur.execute("""
        CREATE TABLE IF NOT EXISTS naming_classics (
            id SERIAL PRIMARY KEY,
            original_id INTEGER,
            book_name VARCHAR(100),
            chapter_name VARCHAR(200),
            ancient_text TEXT NOT NULL,
            modern_text TEXT,
            keywords TEXT,
            ancient_text_embedding BYTEA,
            modern_text_embedding BYTEA,
            combined_text_embedding BYTEA,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 创建索引
    vercel_cur.execute("CREATE INDEX IF NOT EXISTS idx_naming_classics_book ON naming_classics(book_name)")
    
    vercel_cur.connection.commit()
    print("  -> naming_classics表结构创建完成")

def count_local_records(local_cur):
    """统计本地naming_classics表的记录数"""
    local_cur.execute("SELECT COUNT(*) FROM naming_classics")
    return local_cur.fetchone()[0]

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

def migrate_with_confirmation(local_cur, vercel_cur, columns, existing_ids, batch_size=500, auto_confirm=True):
    """
    分批迁移数据，每批自动提交并显示进度
    只导入不在existing_ids中的记录
    
    参数:
        local_cur: 本地数据库游标
        vercel_cur: Vercel数据库游标
        columns: 列名列表
        existing_ids: Vercel上已有的original_id集合
        batch_size: 每批处理的记录数（默认500）
        auto_confirm: 自动确认（保留参数兼容性）
    """
    print(f"\n[步骤3/3] 开始分批迁移数据（每批 {batch_size} 条）...")
    
    # 获取总记录数
    total_records = count_local_records(local_cur)
    print(f"  本地总记录数: {total_records} 条")
    
    if total_records == 0:
        print("  -> 本地表中无数据，跳过迁移")
        return 0
    
    # 构建列字符串和占位符
    cols_str = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    
    # 查询所有数据
    local_cur.execute(f"SELECT {cols_str} FROM naming_classics ORDER BY id")
    
    total_migrated = 0
    total_filtered = 0
    batch_count = 0
    total_to_migrate = 0
    
    # 先读取所有行到内存，并过滤
    all_rows = local_cur.fetchall()
    
    # 过滤掉已存在的记录
    filtered_rows = []
    for row in all_rows:
        try:
            original_id_index = columns.index('original_id')
            original_id = row[original_id_index]
            if original_id not in existing_ids:
                filtered_rows.append(row)
            else:
                total_filtered += 1
        except (ValueError, IndexError):
            filtered_rows.append(row)
    
    total_to_migrate = len(filtered_rows)
    
    print(f"  过滤后需要导入的记录数: {total_to_migrate} 条")
    if total_filtered > 0:
        print(f"  跳过已存在记录: {total_filtered} 条")
    
    if total_to_migrate == 0:
        print("  -> 所有记录都已存在，无需导入")
        return 0
    
    # 分批插入
    import time
    start_time = time.time()
    last_report_time = start_time
    
    for i in range(0, total_to_migrate, batch_size):
        batch = filtered_rows[i:i + batch_size]
        batch_count += 1
        current_batch_size = len(batch)
        
        try:
            vercel_cur.executemany(
                f"INSERT INTO naming_classics ({cols_str}) VALUES ({placeholders})",
                batch
            )
            vercel_cur.connection.commit()
            
            total_migrated += current_batch_size
            progress_pct = total_migrated / total_to_migrate * 100
            
            # 每批都显示进度（简短输出）
            print(f"  批次 #{batch_count}: +{current_batch_size} 条 | 累计: {total_migrated}/{total_to_migrate} ({progress_pct:.1f}%)")
            
        except Exception as e:
            print(f"  -> ✗ 批次 #{batch_count} 导入失败: {e}")
            vercel_cur.connection.rollback()
            # 继续下一批
    
    elapsed = time.time() - start_time
    if elapsed > 60:
        print(f"\n  总耗时: {elapsed/60:.1f} 分钟")
    else:
        print(f"\n  总耗时: {elapsed:.1f} 秒")
    
    return total_migrated

def check_existing_data(vercel_cur):
    """检查Vercel上已有的数据"""
    print("\n[步骤2/3] 检查Vercel上已有数据...")
    
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
            
            # 获取已有的original_id列表
            vercel_cur.execute("SELECT original_id FROM naming_classics WHERE original_id IS NOT NULL")
            existing_ids = {row[0] for row in vercel_cur.fetchall()}
            
            print(f"  -> Vercel上已有 {existing_count} 条记录")
            print(f"  -> 已有 {len(existing_ids)} 个不同的original_id")
            
            return existing_ids
        else:
            print("  -> 表不存在，将创建新表")
            return set()
            
    except Exception as e:
        print(f"  -> 检查数据时出错: {e}")
        return set()

def verify_migration(vercel_cur, expected_count):
    """验证迁移结果"""
    print("\n[验证] 检查迁移结果...")
    
    try:
        vercel_cur.execute("SELECT COUNT(*) FROM naming_classics")
        actual_count = vercel_cur.fetchone()[0]
        
        print(f"  Vercel表记录数: {actual_count} 条")
        print(f"  预期记录数: {expected_count} 条")
        
        if actual_count == expected_count:
            print(f"  -> ✓ 验证通过！")
            return True
        else:
            print(f"  -> ✗ 验证失败：记录数不匹配")
            return False
            
    except Exception as e:
        print(f"  -> ✗ 验证时出错: {e}")
        return False

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python scripts/migrate_naming_classics.py <VERCEL_POSTGRES_URL>")
        print("示例: python scripts/migrate_naming_classics.py 'postgresql://user:pass@host.vercel-storage.com:5432/db?sslmode=require'")
        sys.exit(1)
    
    vercel_url = sys.argv[1]
    
    print("=" * 60)
    print("naming_classics 表迁移到 Vercel Postgres")
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
        
        # 1. 创建表结构
        create_naming_classics_table(vercel_cur)
        
        # 2. 检查现有数据
        existing_ids = check_existing_data(vercel_cur)
        
        # 3. 获取列名
        columns = get_column_names(local_cur)
        print(f"\n  检测到列: {columns}")
        
        # 4. 分批迁移数据（只导入新数据）
        migrated_count = migrate_with_confirmation(local_cur, vercel_cur, columns, existing_ids, batch_size=1000, auto_confirm=True)
        
        # 5. 验证结果
        if migrated_count > 0:
            verify_migration(vercel_cur, migrated_count)
        
        # 关闭连接
        local_cur.close()
        local_conn.close()
        vercel_cur.close()
        vercel_conn.close()
        
        print("\n" + "=" * 60)
        print("✓ 迁移操作完成！")
        print(f"  总计迁移记录: {migrated_count} 条")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[错误] 迁移过程中出现异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()