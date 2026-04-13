"""
分批导入大表到 Neon Postgres
"""
import psycopg2
import sys

LOCAL_DB = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
    "dbname": "seekname_db"
}

VERCEL_URL = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

def migrate_table(table_name, columns, batch_size=2000):
    """迁移单张表"""
    print(f"\n[{table_name}] 开始迁移...")
    
    # 连接本地
    local_conn = psycopg2.connect(**LOCAL_DB)
    local_cur = local_conn.cursor()
    
    # 获取总数
    local_cur.execute(f"SELECT COUNT(*) FROM {table_name}")
    total = local_cur.fetchone()[0]
    print(f"  本地数据: {total:,} 条")
    
    # 连接 Neon
    neon_conn = psycopg2.connect(VERCEL_URL)
    neon_cur = neon_conn.cursor()
    
    # 清空目标表
    neon_cur.execute(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE")
    neon_conn.commit()
    
    # 分批查询和插入
    cols_str = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    
    local_cur.execute(f"SELECT {cols_str} FROM {table_name}")
    
    inserted = 0
    batch = []
    
    while True:
        row = local_cur.fetchone()
        if row is None:
            # 插入剩余数据
            if batch:
                neon_cur.executemany(
                    f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})",
                    batch
                )
                neon_conn.commit()
                inserted += len(batch)
            break
        
        batch.append(row)
        
        if len(batch) >= batch_size:
            neon_cur.executemany(
                f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})",
                batch
            )
            neon_conn.commit()
            inserted += len(batch)
            pct = inserted / total * 100
            print(f"  -> {inserted:,}/{total:,} ({pct:.1f}%)", end="\r")
            batch = []
    
    print(f"\n  -> 完成！共迁移 {inserted:,} 条")
    
    local_cur.close()
    local_conn.close()
    neon_cur.close()
    neon_conn.close()

def main():
    print("=" * 60)
    print("大表数据迁移到 Neon Postgres")
    print("=" * 60)
    
    # 大表配置 (表名, 列名列表)
    tables = [
        ("kangxi_dict", ["id", "character", "pinyin", "radical", "stroke_count", "meaning", "wuxing", "source", "created_at"]),
        ("name_samples", ["id", "full_name", "surname", "given_name", "gender", "frequency", "pinyin"]),
        ("sensitive_words", ["id", "word", "category", "level", "source_file", "created_at"]),
        ("classics_entries", ["id", "book_id", "book_name", "chapter_name", "ancient_text", "modern_text", "keywords"]),
    ]
    
    for table_name, columns in tables:
        migrate_table(table_name, columns)
    
    print("\n" + "=" * 60)
    print("✓ 所有大表迁移完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
