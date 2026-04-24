"""Check database status - simple version"""
import psycopg2
import sys

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/seekname_db')
cur = conn.cursor()

# pgvector
cur.execute("SELECT * FROM pg_extension WHERE extname='vector'")
ext = cur.fetchone()
print(f"pgvector installed: {ext is not None}")

# columns
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='classics_entries' ORDER BY ordinal_position")
cols = [r[0] for r in cur.fetchall()]
print(f"Columns: {', '.join(cols)}")

# check specific columns
has_combined = 'combined_text' in cols
has_embedding = 'combined_text_embedding' in cols
print(f"combined_text: {has_combined}")
print(f"combined_text_embedding: {has_embedding}")

if has_embedding:
    cur.execute("SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='classics_entries' AND column_name='combined_text_embedding'")
    print(f"embedding col type: {cur.fetchone()}")

# count
cur.execute("SELECT COUNT(*) FROM classics_entries")
print(f"Total records: {cur.fetchone()[0]}")

# sample data
cur.execute("SELECT id, book_name, chapter_name, LEFT(ancient_text, 80), LEFT(modern_text, 80), keywords FROM classics_entries LIMIT 2")
for r in cur.fetchall():
    print(f"\nID={r[0]}, Book={r[1]}, Chapter={r[2]}")
    print(f"  Ancient: {r[3]}")
    print(f"  Modern: {r[4]}")
    print(f"  Keywords: {r[5]}")

sys.stdout.flush()
cur.close()
conn.close()
