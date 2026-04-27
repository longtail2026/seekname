# -*- coding: utf-8 -*-
import psycopg2

conn = psycopg2.connect(host='localhost', database='seekname_db', user='postgres', password='postgres')
cur = conn.cursor()

# List all tables
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
tables = cur.fetchall()
print('All tables:')
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t[0]}")
    cnt = cur.fetchone()[0]
    print(f'  {t[0]}: {cnt} rows')

# classics_entries columns
cur.execute("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='classics_entries' ORDER BY ordinal_position")
print('\nclassics_entries columns:')
for c in cur.fetchall():
    print(f'  {c[0]}: {c[1]} ({c[2]})')

# Sample classics_entries
cur.execute("SELECT * FROM classics_entries LIMIT 3")
colnames = [desc[0] for desc in cur.description]
rows = cur.fetchall()
print('\nclassics_entries samples:')
for r in rows:
    for i, col in enumerate(colnames):
        val = str(r[i])[:80] if r[i] else 'None'
        print(f'  {col}: {val}')
    print()

conn.close()