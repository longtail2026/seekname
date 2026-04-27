import psycopg2
conn = psycopg2.connect(host='localhost',port=5432,database='seekname_db',user='postgres',password='postgres')
cur = conn.cursor()
cur.execute("SELECT column_name||':'||data_type FROM information_schema.columns WHERE table_name='classics_entries' ORDER BY ordinal_position")
print('classics_entries columns:')
for r in cur.fetchall():
    print('  ' + r[0])
cur.execute("SELECT column_name||':'||data_type FROM information_schema.columns WHERE table_name='naming_materials' ORDER BY ordinal_position")
print('naming_materials columns:')
for r in cur.fetchall():
    print('  ' + r[0])
conn.close()