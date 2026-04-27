#!/usr/bin/env python3
"""Check Neon naming_materials column types and test pgvector search"""
import psycopg2
import sys

NEON_URL = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

f = open('neon_check_result.txt', 'w', encoding='utf-8')

def log(s):
    print(s)
    f.write(s + '\n')
    f.flush()

try:
    conn = psycopg2.connect(NEON_URL, connect_timeout=10)
    cur = conn.cursor()
    
    # Set client encoding to UTF8
    cur.execute("SET client_encoding TO 'UTF8'")
    
    # 1. Column info
    cur.execute("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='naming_materials' ORDER BY ordinal_position")
    log("=== naming_materials columns ===")
    for r in cur.fetchall():
        log(f"  {r[0]:30s} data_type={r[1]:15s} udt_name={r[2]}")
    
    # 2. pgvector extension
    cur.execute("SELECT * FROM pg_extension WHERE extname='vector'")
    log(f"\npgvector installed: {cur.fetchone() is not None}")
    
    # 3. Row count
    cur.execute("SELECT COUNT(*) FROM naming_materials")
    log(f"Total rows: {cur.fetchone()[0]}")
    
    # 4. Check embedding type specifically
    cur.execute("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='naming_materials' AND column_name='embedding'")
    e = cur.fetchone()
    log(f"\nembedding column: data_type={e[1]}, udt_name={e[2]}")
    
    # 5. Sample data with proper encoding
    cur.execute("SELECT id, phrase, wuxing FROM naming_materials LIMIT 5")
    log("\n=== Sample rows ===")
    for r in cur.fetchall():
        log(f"  id={r[0]}, phrase={r[1]}, wuxing={r[2]}")
    
    # 6. Test vector_dims
    cur.execute("SELECT COUNT(*) FROM naming_materials WHERE embedding IS NOT NULL")
    non_null = cur.fetchone()[0]
    if non_null > 0:
        cur.execute("SELECT id, phrase, vector_dims(embedding) FROM naming_materials WHERE embedding IS NOT NULL LIMIT 3")
        log(f"\n=== Vector samples ({non_null} non-null) ===")
        for r in cur.fetchall():
            log(f"  id={r[0]}, phrase={r[1]}, dims={r[2]}")
    
    # 7. Test actual pgvector search
    log("\n=== Testing pgvector cosine similarity search ===")
    cur.execute("""
        SELECT id, phrase, 1 - (embedding <=> (SELECT embedding FROM naming_materials WHERE id = 1)) AS similarity
        FROM naming_materials
        WHERE id != 1 AND embedding IS NOT NULL
        ORDER BY embedding <=> (SELECT embedding FROM naming_materials WHERE id = 1)
        LIMIT 5
    """)
    for r in cur.fetchall():
        log(f"  id={r[0]}, phrase={r[1]}, similarity={r[2]:.6f}")
    
    # 8. Test with a literal vector (simulate what semantic-search would do)
    log("\n=== Testing with inline vector query ===")
    cur.execute("""
        SELECT id, phrase, 1 - (embedding <=> '[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0]'::vector)
        FROM naming_materials
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> '[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0]'::vector
        LIMIT 3
    """)
    log("Inline vector query succeeded!")
    for r in cur.fetchall():
        log(f"  id={r[0]}, phrase={r[1]}, similarity={r[2]:.6f}")
    
    conn.close()
    log("\n=== ALL CHECKS PASSED ===")
    
except Exception as e:
    log(f"\nERROR: {e}")
finally:
    f.close()