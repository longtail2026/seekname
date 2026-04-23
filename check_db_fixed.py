import os
import sys
import psycopg2
from urllib.parse import urlparse

# 获取数据库URL - 移除schema参数
db_url = os.getenv('DATABASE_URL') or 'postgresql://postgres:postgres@localhost:5432/seekname_db'
print(f'使用数据库URL: {db_url}')

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # 检查naming_classics表结构
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'naming_classics' 
        ORDER BY ordinal_position
    """)
    columns = cur.fetchall()
    print('naming_classics表列结构:')
    for col in columns:
        print(f'  {col[0]}: {col[1]}')
    
    # 检查是否有向量列
    vector_cols = [col for col in columns if 'embedding' in col[0]]
    print(f'\n向量列数量: {len(vector_cols)}')
    for col in vector_cols:
        print(f'  {col[0]}: {col[1]}')
    
    # 检查行数和向量数据
    cur.execute("SELECT COUNT(*) FROM naming_classics")
    total = cur.fetchone()[0]
    print(f'\n总记录数: {total}')
    
    if vector_cols:
        col_name = vector_cols[0][0]
        cur.execute(f"SELECT COUNT(*) FROM naming_classics WHERE {col_name} IS NOT NULL")
        with_vectors = cur.fetchone()[0]
        print(f'有向量数据的记录数: {with_vectors} ({with_vectors/total*100:.1f}%)')
    
    # 检查classics_entries表（BGE-M3指南中提到的表）
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('classics_entries', 'naming_classics')
        AND table_schema = 'public'
    """)
    tables = cur.fetchall()
    print(f'\n相关表: {[t[0] for t in tables]}')
    
    # 如果classics_entries存在，检查其结构
    if any('classics_entries' in t for t in tables):
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'classics_entries' 
            ORDER BY ordinal_position
        """)
        classics_columns = cur.fetchall()
        print('\nclassics_entries表列结构:')
        for col in classics_columns:
            print(f'  {col[0]}: {col[1]}')
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f'错误: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)