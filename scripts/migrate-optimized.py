"""
优化的数据迁移脚本 - 分批处理，带进度显示
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

def create_all_tables(vercel_url):
    """创建所有表结构"""
    print("[1/2] 创建表结构...")
    conn = psycopg2.connect(vercel_url)
    cur = conn.cursor()
    
    tables_sql = [
        ("classics_books", """
            CREATE TABLE IF NOT EXISTS classics_books (
                id SERIAL PRIMARY KEY,
                orig_id INTEGER,
                name VARCHAR(100) NOT NULL,
                author VARCHAR(100),
                category VARCHAR(20),
                dynasty VARCHAR(20),
                description TEXT
            )
        """),
        ("classics_entries", """
            CREATE TABLE IF NOT EXISTS classics_entries (
                id SERIAL PRIMARY KEY,
                book_id INTEGER REFERENCES classics_books(id) ON DELETE CASCADE,
                book_name VARCHAR(100),
                chapter_name VARCHAR(200),
                ancient_text TEXT NOT NULL,
                modern_text TEXT,
                keywords TEXT[]
            )
        """),
        ("name_samples", """
            CREATE TABLE IF NOT EXISTS name_samples (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(30) NOT NULL,
                surname VARCHAR(10),
                given_name VARCHAR(20),
                gender CHAR(1),
                frequency INTEGER,
                pinyin VARCHAR(100)
            )
        """),
        ("kangxi_dict", """
            CREATE TABLE IF NOT EXISTS kangxi_dict (
                id SERIAL PRIMARY KEY,
                character VARCHAR(10) NOT NULL,
                pinyin VARCHAR(50),
                radical VARCHAR(10),
                stroke_count INTEGER,
                meaning TEXT,
                wuxing VARCHAR(10),
                source VARCHAR(100),
                created_at TIMESTAMP DEFAULT now()
            )
        """),
        ("sensitive_words", """
            CREATE TABLE IF NOT EXISTS sensitive_words (
                id SERIAL PRIMARY KEY,
                word TEXT NOT NULL,
                category VARCHAR(50),
                level INTEGER,
                source_file VARCHAR(100),
                created_at TIMESTAMP DEFAULT now()
            )
        """),
        ("wuxing_characters", """
            CREATE TABLE IF NOT EXISTS wuxing_characters (
                id SERIAL PRIMARY KEY,
                character VARCHAR(10) NOT NULL,
                wuxing VARCHAR(10),
                meaning TEXT,
                suitability TEXT,
                pinyin VARCHAR(50),
                stroke_count INTEGER,
                created_at TIMESTAMP DEFAULT now()
            )
        """),
    ]
    
    for name, sql in tables_sql:
        cur.execute(sql)
        print(f"  -> {name} 表已创建")
    
    # 创建索引
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_ce_book ON classics_entries(book_id)",
        "CREATE INDEX IF NOT EXISTS idx_ce_keywords ON classics_entries USING gin(keywords)",
        "CREATE INDEX IF NOT EXISTS idx_ns_surname ON name_samples(surname)",
        "CREATE INDEX IF NOT EXISTS idx_ns_gender ON name_samples(gender)",
        "CREATE INDEX IF NOT EXISTS idx_kd_char ON kangxi_dict(character)",
        "CREATE INDEX IF NOT EXISTS idx_kd_pinyin ON kangxi_dict(pinyin)",
        "CREATE INDEX IF NOT EXISTS idx_kd_wuxing ON kangxi_dict(wuxing)",
        "CREATE INDEX IF NOT EXISTS idx_sw_word ON sensitive_words(word)",
        "CREATE INDEX IF NOT EXISTS idx_sw_category ON sensitive_words(category)",
        "CREATE INDEX IF NOT EXISTS idx_wx_char ON wuxing_characters(character)",
        "CREATE INDEX IF NOT EXISTS idx_wx_wuxing ON wuxing_characters(wuxing)",
    ]
    for idx_sql in indexes:
        cur.execute(idx_sql)
    
    conn.commit()
    cur.close()
    conn.close()
    print("  -> 所有索引已创建")

def migrate_table(table_name, columns, vercel_url, batch_size=3000):
    """迁移单张表"""
    print(f"\n[迁移] {table_name}...")
    
    # 连接本地
    local_conn = psycopg2.connect(**LOCAL_DB)
    local_cur = local_conn.cursor()
    
    # 获取总数
    local_cur.execute(f"SELECT COUNT(*) FROM {table_name}")
    total = local_cur.fetchone()[0]
    print(f"  本地数据: {total:,} 条")
    
    if total == 0:
        print(f"  -> 跳过（无数据）")
        local_cur.close()
        local_conn.close()
        return
    
    # 连接 Vercel
    vercel_conn = psycopg2.connect(vercel_url)
    vercel_cur = vercel_conn.cursor()
    
    # 清空并准备
    vercel_cur.execute(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE")
    vercel_conn.commit()
    
    # 分批迁移
    cols_str = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    
    local_cur.execute(f"SELECT {cols_str} FROM {table_name}")
    
    inserted = 0
    while True:
        rows = local_cur.fetchmany(batch_size)
        if not rows:
            break
        
        vercel_cur.executemany(
            f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})",
            rows
        )
        vercel_conn.commit()
        inserted += len(rows)
        pct = inserted / total * 100
        print(f"  -> {inserted:,}/{total:,} ({pct:.1f}%)", end="\r")
    
    print(f"\n  -> 完成！共迁移 {inserted:,} 条")
    
    local_cur.close()
    local_conn.close()
    vercel_cur.close()
    vercel_conn.close()

def main():
    if len(sys.argv) < 2:
        print("用法: python migrate-optimized.py <VERCEL_POSTGRES_URL>")
        sys.exit(1)
    
    vercel_url = sys.argv[1]
    
    print("=" * 60)
    print("seekname_db -> Vercel Neon Postgres 数据迁移")
    print("=" * 60)
    
    # 步骤1: 创建表
    create_all_tables(vercel_url)
    
    # 步骤2: 迁移数据（按依赖顺序：先books，再entries）
    print("\n[2/2] 开始数据迁移...")
    
    tables = [
        ("classics_books", ["id", "orig_id", "name", "author", "category", "dynasty", "description"]),
        ("classics_entries", ["id", "book_id", "book_name", "chapter_name", "ancient_text", "modern_text", "keywords"]),
        ("name_samples", ["id", "full_name", "surname", "given_name", "gender", "frequency", "pinyin"]),
        ("kangxi_dict", ["id", "character", "pinyin", "radical", "stroke_count", "meaning", "wuxing", "source", "created_at"]),
        ("sensitive_words", ["id", "word", "category", "level", "source_file", "created_at"]),
        ("wuxing_characters", ["id", "character", "wuxing", "meaning", "suitability", "pinyin", "stroke_count", "created_at"]),
    ]
    
    for table_name, columns in tables:
        migrate_table(table_name, columns, vercel_url)
    
    print("\n" + "=" * 60)
    print("✓ 全部迁移完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
