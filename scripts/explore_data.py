# -*- coding: utf-8 -*-
import psycopg2

conn = psycopg2.connect(host='localhost', database='seekname_db', user='postgres', password='postgres')
cur = conn.cursor()

# 1. keywords 覆盖
cur.execute("SELECT COUNT(*) FROM classics_entries WHERE keywords IS NOT NULL AND array_length(keywords,1) > 0")
print(f"有keywords: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM classics_entries WHERE keywords IS NULL OR array_length(keywords,1) IS NULL")
print(f"无keywords: {cur.fetchone()[0]}")

# 2. 典籍分布
cur.execute("SELECT book_name, COUNT(*) FROM classics_entries WHERE book_name IS NOT NULL AND book_name != '' GROUP BY book_name ORDER BY COUNT(*) DESC LIMIT 20")
print("\n典籍分布(Top20):")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

# 3. 样本数据
cur.execute("SELECT id, ancient_text, modern_text, keywords FROM classics_entries LIMIT 5")
print("\n样本:")
for r in cur.fetchall():
    print(f"--- id={r[0]} ---")
    print(f"  原文: {str(r[1])[:80] if r[1] else '(空)'}")
    print(f"  译文: {str(r[2])[:60] if r[2] else '(空)'}")
    print(f"  关键词: {r[3]}")

cur.close()
conn.close()