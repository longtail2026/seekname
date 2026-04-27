# -*- coding: utf-8 -*-
import psycopg2, sys

conn = psycopg2.connect(host='localhost', database='seekname_db', user='postgres', password='postgres')
cur = conn.cursor()

cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='classics_entries' ORDER BY ordinal_position")
cols = cur.fetchall()
print(f'classics_entries 列数: {len(cols)}')
for c in cols:
    print(f'  {c[0]}: {c[1]}')

cur.execute("SELECT COUNT(*) FROM classics_entries")
print(f'\n总记录数: {cur.fetchone()[0]}')

# Check if naming_materials already exists
cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='naming_materials')")
exists = cur.fetchone()[0]
print(f'\nnaming_materials 表是否存在: {exists}')

if exists:
    cur.execute("SELECT COUNT(*) FROM naming_materials")
    print(f'naming_materials 记录数: {cur.fetchone()[0]}')
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='naming_materials' ORDER BY ordinal_position")
    print('naming_materials 列:')
    for c in cur.fetchall():
        print(f'  {c[0]}: {c[1]}')

cur.close()
conn.close()
print('\n检查完成')