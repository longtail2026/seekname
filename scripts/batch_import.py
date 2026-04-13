"""
分批导入数据到 Neon Postgres - 每批 500 条
"""
import psycopg2
import time

LOCAL_DB = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
    "dbname": "seekname_db"
}

VERCEL_URL = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

def get_count(conn, table):
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    count = cur.fetchone()[0]
    cur.close()
    return count

def migrate_table(table_name, columns, batch_size=500):
    """分批迁移单张表"""
    print(f"\n[{table_name}] 开始分批迁移...")
    
    # 连接本地
    local_conn = psycopg2.connect(**LOCAL_DB)
    local_cur = local_conn.cursor()
    
    # 获取总数
    total = get_count(local_conn, table_name)
    print(f"  本地数据: {total:,} 条")
    
    if total == 0:
        print(f"  -> 跳过（无数据）")
        local_cur.close()
        local_conn.close()
        return
    
    # 连接 Neon
    neon_conn = psycopg2.connect(VERCEL_URL)
    neon_cur = neon_conn.cursor()
    
    # 获取 Neon 上已有数量
    try:
        existing = get_count(neon_conn, table_name)
        print(f"  Neon 已有: {existing:,} 条")
        if existing >= total:
            print(f"  -> 跳过（已完成）")
            local_cur.close()
            local_conn.close()
            neon_cur.close()
            neon_conn.close()
            return
        start_offset = existing
    except:
        start_offset = 0
    
    # 分批查询和插入
    cols_str = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    
    inserted = start_offset
    offset = start_offset
    
    while offset < total:
        # 查询一批
        local_cur.execute(f"SELECT {cols_str} FROM {table_name} ORDER BY id LIMIT {batch_size} OFFSET {offset}")
        rows = local_cur.fetchall()
        
        if not rows:
            break
        
        # 插入到 Neon
        neon_cur.executemany(
            f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})",
            rows
        )
        neon_conn.commit()
        
        inserted += len(rows)
        offset += len(rows)
        pct = inserted / total * 100
        print(f"  -> {inserted:,}/{total:,} ({pct:.1f}%)", end="\r")
        
        # 短暂暂停避免连接超时
        time.sleep(0.2)
    
    print(f"\n  -> 完成！共迁移 {inserted:,} 条")
    
    local_cur.close()
    local_conn.close()
    neon_cur.close()
    neon_conn.close()

def main():
    print("=" * 60)
    print("seekname_db -> Neon Postgres 分批导入")
    print("每批 500 条，自动跳过已导入数据")
    print("=" * 60)
    
    # 表配置 (表名, 列名列表)
    tables = [
        ("kangxi_dict", ["id", "character", "pinyin", "radical", "stroke_count", "meaning", "wuxing", "source", "created_at"]),
        ("name_samples", ["id", "full_name", "surname", "given_name", "gender", "frequency", "pinyin"]),
        ("sensitive_words", ["id", "word", "category", "level", "source_file", "created_at"]),
        ("classics_entries", ["id", "book_id", "book_name", "chapter_name", "ancient_text", "modern_text", "keywords"]),
    ]
    
    for table_name, columns in tables:
        migrate_table(table_name, columns)
    
    print("\n" + "=" * 60)
    print("全部导入完成！")
    print("=" * 60)
    
    # 验证
    print("\n[最终数据验证]")
    conn = psycopg2.connect(VERCEL_URL)
    cur = conn.cursor()
    tables_check = ["classics_books", "classics_entries", "name_samples", 
                    "kangxi_dict", "sensitive_words", "wuxing_characters"]
    for t in tables_check:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        cnt = cur.fetchone()[0]
        print(f"  {t:<25} {cnt:>8,} 条")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
