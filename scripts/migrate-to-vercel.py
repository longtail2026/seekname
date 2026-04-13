"""
将本地 seekname_db 数据迁移到 Vercel Postgres
用法: python migrate-to-vercel.py <VERCEL_POSTGRES_URL>
"""
import psycopg2
import sys
import os

LOCAL_DB = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
    "dbname": "seekname_db"
}

def get_local_conn():
    return psycopg2.connect(**LOCAL_DB)

def get_vercel_conn(url: str):
    """从 Vercel Postgres URL 解析连接参数"""
    # URL 格式: postgresql://user:pass@host:port/db?sslmode=require
    return psycopg2.connect(url)

def create_tables(dst_cur):
    """创建表结构"""
    print("\n[初始化] 创建表结构...")
    
    # classics_books
    dst_cur.execute("""
        CREATE TABLE IF NOT EXISTS classics_books (
            id SERIAL PRIMARY KEY,
            orig_id INTEGER,
            name VARCHAR(100) NOT NULL,
            author VARCHAR(100),
            category VARCHAR(20),
            dynasty VARCHAR(20),
            description TEXT
        )
    """)
    
    # classics_entries
    dst_cur.execute("""
        CREATE TABLE IF NOT EXISTS classics_entries (
            id SERIAL PRIMARY KEY,
            book_id INTEGER REFERENCES classics_books(id) ON DELETE CASCADE,
            book_name VARCHAR(100),
            chapter_name VARCHAR(200),
            ancient_text TEXT NOT NULL,
            modern_text TEXT,
            keywords TEXT[]
        )
    """)
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_ce_book ON classics_entries(book_id)")
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_ce_keywords ON classics_entries USING gin(keywords)")
    
    # name_samples
    dst_cur.execute("""
        CREATE TABLE IF NOT EXISTS name_samples (
            id SERIAL PRIMARY KEY,
            full_name VARCHAR(30) NOT NULL,
            surname VARCHAR(10),
            given_name VARCHAR(20),
            gender CHAR(1),
            frequency INTEGER,
            pinyin VARCHAR(100)
        )
    """)
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_ns_surname ON name_samples(surname)")
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_ns_gender ON name_samples(gender)")
    
    # kangxi_dict
    dst_cur.execute("""
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
    """)
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_kd_char ON kangxi_dict(character)")
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_kd_pinyin ON kangxi_dict(pinyin)")
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_kd_wuxing ON kangxi_dict(wuxing)")
    
    # sensitive_words
    dst_cur.execute("""
        CREATE TABLE IF NOT EXISTS sensitive_words (
            id SERIAL PRIMARY KEY,
            word TEXT NOT NULL,
            category VARCHAR(50),
            level INTEGER,
            source_file VARCHAR(100),
            created_at TIMESTAMP DEFAULT now()
        )
    """)
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_sw_word ON sensitive_words(word)")
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_sw_category ON sensitive_words(category)")
    
    # wuxing_characters
    dst_cur.execute("""
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
    """)
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_wx_char ON wuxing_characters(character)")
    dst_cur.execute("CREATE INDEX IF NOT EXISTS idx_wx_wuxing ON wuxing_characters(wuxing)")
    
    dst_cur.connection.commit()
    print("  -> 表结构创建完成")


def migrate_table(src_cur, dst_cur, table_name, columns, batch_size=5000):
    """迁移单张表"""
    print(f"\n[迁移] {table_name}...")
    
    # 获取本地数据量
    src_cur.execute(f"SELECT COUNT(*) FROM {table_name}")
    total = src_cur.fetchone()[0]
    print(f"  本地数据: {total} 条")
    
    if total == 0:
        print(f"  -> 跳过（无数据）")
        return
    
    # 清空目标表（如果存在数据）
    dst_cur.execute(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE")
    
    # 分批查询和插入
    cols_str = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    
    src_cur.execute(f"SELECT {cols_str} FROM {table_name}")
    
    inserted = 0
    while True:
        rows = src_cur.fetchmany(batch_size)
        if not rows:
            break
        
        dst_cur.executemany(
            f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})",
            rows
        )
        dst_cur.connection.commit()
        inserted += len(rows)
        print(f"  -> 已插入 {inserted}/{total} 条", end="\r")
    
    print(f"\n  -> 完成，共迁移 {inserted} 条")

def main():
    if len(sys.argv) < 2:
        print("用法: python migrate-to-vercel.py <VERCEL_POSTGRES_URL>")
        print("示例: python migrate-to-vercel.py 'postgresql://user:pass@host.vercel-storage.com:5432/db?sslmode=require'")
        sys.exit(1)
    
    vercel_url = sys.argv[1]
    
    print("=" * 50)
    print("seekname_db -> Vercel Postgres 数据迁移")
    print("=" * 50)
    
    try:
        # 连接本地数据库
        print("\n[1/2] 连接本地数据库...")
        local_conn = get_local_conn()
        local_cur = local_conn.cursor()
        print("  -> 已连接 localhost:5432/seekname_db")
        
        # 连接 Vercel Postgres
        print("\n[2/2] 连接 Vercel Postgres...")
        vercel_conn = get_vercel_conn(vercel_url)
        vercel_cur = vercel_conn.cursor()
        print("  -> 已连接 Vercel Postgres")
        
        # 表结构定义 (表名, 列名列表)
        tables = [
            ("classics_books", ["id", "orig_id", "name", "author", "category", "dynasty", "description"]),
            ("classics_entries", ["id", "book_id", "book_name", "chapter_name", "ancient_text", "modern_text", "keywords"]),
            ("name_samples", ["id", "full_name", "surname", "given_name", "gender", "frequency", "pinyin"]),
            ("kangxi_dict", ["id", "character", "pinyin", "radical", "stroke_count", "meaning", "wuxing", "source", "created_at"]),
            ("sensitive_words", ["id", "word", "category", "level", "source_file", "created_at"]),
            ("wuxing_characters", ["id", "character", "wuxing", "meaning", "suitability", "pinyin", "stroke_count", "created_at"]),
        ]
        
        # 先创建表结构
        create_tables(vercel_cur)
        
        print("\n" + "=" * 50)
        print("开始数据迁移...")
        print("=" * 50)
        
        for table_name, columns in tables:
            migrate_table(local_cur, vercel_cur, table_name, columns)
        
        # 关闭连接
        local_cur.close()
        local_conn.close()
        vercel_cur.close()
        vercel_conn.close()
        
        print("\n" + "=" * 50)
        print("✓ 迁移完成！")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
