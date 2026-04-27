import psycopg2, os, sys

# Set PYTHONUTF8 for encoding compatibility
os.environ['PYTHONUTF8'] = '1'
# Replace non-ASCII chars in the URL
url = os.environ.get('DATABASE_URL', '')
if not url:
    print("No DATABASE_URL found")
    sys.exit(1)

conn = psycopg2.connect(url)
cur = conn.cursor()

# Check classics_entries vector columns
cur.execute("""
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name='classics_entries' 
    AND (column_name LIKE '%vector%' OR column_name LIKE '%embed%' OR column_name LIKE '%dense%')
""")
print('classics_entries vector columns:', cur.fetchall())

# Check naming_classics columns
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='naming_classics'")
cols = [r[0] for r in cur.fetchall()]
print(f'naming_classics columns ({len(cols)}):', cols)

# Count naming_classics
cur.execute('SELECT COUNT(*) FROM naming_classics')
print('naming_classics count:', cur.fetchone()[0])

# Check if naming_classics already has dense_vectors
if 'dense_vector' in cols:
    cur.execute('SELECT COUNT(*) FROM naming_classics WHERE dense_vector IS NOT NULL')
    print('naming_classics with vectors:', cur.fetchone()[0])

# Sample some records
cur.execute('SELECT id, book_name, ancient_text FROM classics_entries LIMIT 3')
for r in cur.fetchall():
    print(f'  id={r[0]}, book={r[1]}, text={r[2][:40]}...')

# Check classics_entries count
cur.execute('SELECT COUNT(*) FROM classics_entries')
print(f'classics_entries total: {cur.fetchone()[0]}')

cur.close()
conn.close()