# -*- coding: utf-8 -*-
import psycopg2
import sys

conn_str = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
c = psycopg2.connect(conn_str)
r = c.cursor()

# 整体分布
r.execute("SELECT gender_tag, COUNT(*) FROM naming_classics WHERE gender_tag IS NOT NULL GROUP BY gender_tag ORDER BY COUNT(*) DESC")
print('=' * 80)
print('[性别标签分布]')
total = 0
rows = r.fetchall()
for tag, cnt in rows:
    total += cnt
for tag, cnt in rows:
    print(f'  {tag}: {cnt} ({cnt/total*100:.1f}%)')
r.execute("SELECT COUNT(*) FROM naming_classics WHERE gender_tag IS NULL")
nulls = r.fetchone()[0]
print(f'  未打标: {nulls}')
print(f'  合计: {total}')
print()

# 男 样本
print('=' * 80)
print('[男 样本]')
r.execute("SELECT id, book_name, chapter_name, LEFT(ancient_text, 100), keywords, gender_tag FROM naming_classics WHERE gender_tag='男' LIMIT 3")
for row in r.fetchall():
    print(f'  ID={row[0]}')
    print(f'  典籍: {row[1]}')
    print(f'  篇章: {row[2]}')
    print(f'  原文: {row[3]}')
    print(f'  关键词: {row[4]}')
    print(f'  标签: {row[5]}')
    print()

# 女 样本
print('=' * 80)
print('[女 样本]')
r.execute("SELECT id, book_name, chapter_name, LEFT(ancient_text, 100), keywords, gender_tag FROM naming_classics WHERE gender_tag='女' LIMIT 3")
for row in r.fetchall():
    print(f'  ID={row[0]}')
    print(f'  典籍: {row[1]}')
    print(f'  篇章: {row[2]}')
    print(f'  原文: {row[3]}')
    print(f'  关键词: {row[4]}')
    print(f'  标签: {row[5]}')
    print()

# 中性 样本
print('=' * 80)
print('[中性 样本]')
r.execute("SELECT id, book_name, chapter_name, LEFT(ancient_text, 100), keywords, gender_tag FROM naming_classics WHERE gender_tag='中性' LIMIT 3")
for row in r.fetchall():
    print(f'  ID={row[0]}')
    print(f'  典籍: {row[1]}')
    print(f'  篇章: {row[2]}')
    print(f'  原文: {row[3]}')
    print(f'  关键词: {row[4]}')
    print(f'  标签: {row[5]}')
    print()

c.close()
print('=== DONE ===')
