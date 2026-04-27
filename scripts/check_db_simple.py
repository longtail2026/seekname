# -*- coding: utf-8 -*-
import psycopg2

conn = psycopg2.connect(host='localhost', database='seekname_db', user='postgres', password='postgres')
cur = conn.cursor()

# Check naming_classics
cur.execute("SELECT COUNT(*) FROM naming_classics")
print('naming_classics count:', cur.fetchone()[0])

# Check classics_entries
cur.execute("SELECT COUNT(*) FROM classics_entries")
print('classics_entries count:', cur.fetchone()[0])

# naming_classics structure
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='naming_classics' ORDER BY ordinal_position")
print('\nnaming_classics columns:')
for c in cur.fetchall():
    print(f'  {c[0]}: {c[1]}')

# Sample naming_classics records for keywords/style fields
cur.execute("SELECT id, phrase, original, meaning, keywords, style, gender, wuxing FROM naming_classics LIMIT 5")
print('\nnaming_classics samples:')
for r in cur.fetchall():
    print(f'  id={r[0]}, phrase={r[1]}, original={r[2][:30] if r[2] else None}, meaning={r[3]}, keywords={r[4]}, style={r[5]}, gender={r[6]}, wuxing={r[7]}')

cur.close()
conn.close()