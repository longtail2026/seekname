#!/usr/bin/env python3
"""检查 naming_materials 表在本地和 Neom 的状态"""
import psycopg2
import json

# ========== 本地数据库 ==========
print("=" * 60)
print("【1】 检查本地 PostgreSQL 数据库")
print("=" * 60)

try:
    conn = psycopg2.connect(host='localhost', port=5432, dbname='seekname_db', user='postgres', password='postgres')
    cur = conn.cursor()
    
    # 1. 检查 naming_materials 表是否存在
    cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'naming_materials')")
    exists = cur.fetchone()[0]
    print(f"naming_materials 表是否存在: {exists}")
    
    if exists:
        # 2. 列信息
        cur.execute("""
            SELECT column_name, data_type, udt_name, is_nullable, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'naming_materials' 
            ORDER BY ordinal_position
        """)
        print("\n列信息:")
        for r in cur.fetchall():
            print(f"  {r[0]:20s} | type={str(r[1]):15s} | udt={str(r[2]):15s} | nullable={r[3]} | maxlen={r[4]}")
        
        # 3. 总记录数
        cur.execute('SELECT COUNT(*) FROM naming_materials')
        count = cur.fetchone()[0]
        print(f"\n总记录数: {count}")
        
        # 4. embedding 列实际类型
        if count > 0:
            cur.execute('SELECT pg_typeof(embedding) FROM naming_materials LIMIT 1')
            emb_type = cur.fetchone()[0]
            print(f"embedding 列实际类型: {emb_type}")
            
            # 5. 检查数据
            cur.execute('SELECT id, phrase, source, quality, pg_typeof(embedding) FROM naming_materials LIMIT 10')
            print("\n前10条数据:")
            for r in cur.fetchall():
                print(f"  id={r[0]} | phrase={r[1]:6s} | source={str(r[2])[:30]:30s} | quality={r[3]} | emb_type={r[4]}")
            
            # 6. 检查 embedding 数据长度
            cur.execute("SELECT id, phrase, length(embedding::text) FROM naming_materials LIMIT 3")
            print("\nembedding 数据长度:")
            for r in cur.fetchall():
                print(f"  id={r[0]} | phrase={r[1]:6s} | emb_text_len={r[2]}")
        
        # 7. 检查 pgvector 扩展
        cur.execute("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')")
        has_vector = cur.fetchone()[0]
        print(f"\npgvector 扩展已安装: {has_vector}")
        
        # 8. 尝试向量搜索
        if count > 0 and has_vector:
            cur.execute("SELECT id, phrase, embedding <=> '[0.1,0.2,0.3]'::vector(1024) AS dist FROM naming_materials LIMIT 3")
            print("\npgvector 原生搜索测试:")
            for r in cur.fetchall():
                print(f"  id={r[0]} | phrase={r[1]:6s} | distance={r[2]}")
    else:
        print("naming_materials 表不存在")
    
    conn.close()
except Exception as e:
    print(f"本地数据库连接失败: {e}")
    import traceback
    traceback.print_exc()

# ========== Vercel / Neom 环境变量检查 ==========
print("\n" + "=" * 60)
print("【2】 检查 Vercel/Neom 配置")
print("=" * 60)

# 检查 .env 中是否有 Neom 连接串
neon_url = None
try:
    with open('.env', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('POSTGRES_URL=') and 'neon.tech' in line:
                neon_url = line
            elif line.startswith('DATABASE_URL=') and 'neon.tech' in line:
                neon_url = line
            elif line.startswith('POSTGRES_PRISMA_URL=') and 'neon.tech' in line:
                neon_url = line
            elif line.startswith('POSTGRES_URL_NON_POOLING=') and 'neon.tech' in line:
                neon_url = line
    
    if neon_url:
        print(f"找到 Neom 连接串: {neon_url[:60]}...")
    else:
        print("未在 .env 中找到 Neom 连接串")
        print("当前 DATABASE_URL 为: postgresql://postgres:postgres@localhost:5432/seekname_db")
        
        # 检查 package.json 中是否有 vercel 相关配置
        import subprocess
        result = subprocess.run(['npx', 'vercel', 'env', 'ls', '--plain'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("\nVercel 环境变量:")
            print(result.stdout[:2000])
        else:
            print(f"\nVercel CLI 不可用: {result.stderr[:200]}")
except Exception as e:
    print(f"检查环境变量时出错: {e}")