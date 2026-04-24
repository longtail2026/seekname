import psycopg2
conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/seekname_db')
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
tables = cur.fetchall()
print("Tables in public schema:")
for t in tables:
    print(f"  - {t[0]}")
print()

# Check naming_classics specifically
cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='naming_classics')")
exists = cur.fetchone()[0]
print(f"naming_classics exists: {exists}")

if exists:
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='naming_classics' ORDER BY ordinal_position")
    cols = cur.fetchall()
    print("\nnaming_classics columns:")
    for c in cols:
        print(f"  {c[0]}: {c[1]}")
    cur.execute("SELECT COUNT(*) FROM naming_classics")
    print(f"\nTotal records: {cur.fetchone()[0]}")

# Also check classics_entries details
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='classics_entries' ORDER BY ordinal_position")
cols = cur.fetchall()
print("\nclassics_entries columns:")
for c in cols:
    print(f"  {c[0]}: {c[1]}")
cur.execute("SELECT COUNT(*) FROM classics_entries")
print(f"Total records: {cur.fetchone()[0]}")

cur.close()
conn.close()
