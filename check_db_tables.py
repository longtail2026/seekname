import psycopg2
conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/seekname_db')
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
tables = [r[0] for r in cur.fetchall()]
print('Tables:', tables)
if 'naming_classics' in tables:
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='naming_classics' ORDER BY ordinal_position")
    cols = [r[0] for r in cur.fetchall()]
    print('naming_classics columns:', cols)
    cur.execute("SELECT COUNT(*) FROM naming_classics")
    print('naming_classics count:', cur.fetchone()[0])
else:
    print('naming_classics table not found')
if 'classics_entries' in tables:
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='classics_entries' ORDER BY ordinal_position")
    cols = [r[0] for r in cur.fetchall()]
    print('classics_entries columns:', cols)
cur.close()
conn.close()
