#!/usr/bin/env python3
"""Check Neon database for naming_materials table"""
import psycopg2

NEON_URL = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

print("=" * 60)
print("检查 Neon 生产数据库")
print("=" * 60)

try:
    conn = psycopg2.connect(NEON_URL, connect_timeout=15)
    cur = conn.cursor()
    
    # 1. 检查 naming_materials 表是否存在
    cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'naming_materials')")
    exists = cur.fetchone()[0]
    print(f"\nnaming_materials 表是否存在: {exists}")
    
    # 2. 检查 pgvector 扩展
    cur.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'")
    ext = cur.fetchone()
    print(f"pgvector 扩展: {ext[0] if ext else '未安装'} (version={ext[1] if ext else 'N/A'})")
    
    # 3. 列出所有表
    cur.execute("""
        SELECT table_name, table_schema 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    tables = cur.fetchall()
    print(f"\nNeon public schema 下的所有表 ({len(tables)}):")
    for t in tables:
        print(f"  - {t[0]} (schema={t[1]})")
    
    if exists:
        # 4. 列信息
        cur.execute("""
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'naming_materials' 
            ORDER BY ordinal_position
        """)
        print("\nnaming_materials 表结构:")
        for r in cur.fetchall():
            print(f"  {r[0]:20s} | type={r[1]:15s} | udt={r[2]}")
        
        cur.execute("SELECT COUNT(*) FROM naming_materials")
        count = cur.fetchone()[0]
        print(f"\n总记录数: {count}")
        
        if count > 0:
            cur.execute("SELECT id, phrase, source FROM naming_materials LIMIT 5")
            print("前5条:")
            for r in cur.fetchall():
                print(f"  id={r[0]}, phrase={r[1]}, source={r[2]}")
    
    conn.close()
    
except Exception as e:
    import traceback
    print(f"连接失败: {e}")
    print(traceback.format_exc())