#!/usr/bin/env python3
"""Check Neon embedding status"""
import psycopg2

NEON_URL = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

conn = psycopg2.connect(NEON_URL, connect_timeout=10)
cur = conn.cursor()

cur.execute('SELECT COUNT(*) FROM naming_materials WHERE embedding IS NOT NULL')
non_null = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM naming_materials WHERE embedding IS NULL')
nulls = cur.fetchone()[0]
print(f'embedding NOT NULL: {non_null}')
print(f'embedding IS NULL:  {nulls}')

if non_null > 0:
    cur.execute('SELECT id, phrase, vector_dims(embedding) FROM naming_materials WHERE embedding IS NOT NULL LIMIT 3')
    for r in cur.fetchall():
        print(f'  id={r[0]}, phrase={r[1]}, dims={r[2]}')

conn.close()
print('DONE')