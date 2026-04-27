import psycopg2
import json

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/seekname_db')
cur = conn.cursor()

# Check pgvector extension
cur.execute("SELECT * FROM pg_extension WHERE extname='vector'")
ext = cur.fetchall()
print("pgvector installed:", ext)

# classics_entries sample
cur.execute("SELECT id, book_name, ancient_text, modern_text, keywords FROM classics_entries LIMIT 5")
rows = cur.fetchall()
print("\n=== classics_entries samples ===")
for r in rows:
    print(f"  ID={r[0]} | book={r[1]} | ancient={r[2][:80]}... | keywords={r[4]}")
    print()

# Count by book
cur.execute("SELECT book_name, COUNT(*) as cnt FROM classics_entries GROUP BY book_name ORDER BY cnt DESC LIMIT 10")
rows = cur.fetchall()
print("\n=== Top 10 books ===")
for r in rows:
    print(f"  {r[0]}: {r[1]} entries")

# Check classics_books
cur.execute("SELECT id, name, author, category FROM classics_books LIMIT 10")
rows = cur.fetchall()
print("\n=== classics_books ===")
for r in rows:
    print(f"  ID={r[0]} | name={r[1]} | author={r[2]} | cat={r[3]}")

conn.close()