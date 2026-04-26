# -*- coding: utf-8 -*-
import psycopg2
import json

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="seekname_db",
    user="postgres",
    password="postgres"
)
cur = conn.cursor()

print("=" * 60)
print("1. wuxing_characters 表统计")
print("=" * 60)
cur.execute("SELECT COUNT(*) FROM wuxing_characters")
print(f"  总数: {cur.fetchone()[0]}")

cur.execute("SELECT wuxing, COUNT(*) FROM wuxing_characters GROUP BY wuxing ORDER BY COUNT(*) DESC")
print(f"  五行分布: {cur.fetchall()}")

print("\n示例数据:")
cur.execute("SELECT id, character, wuxing, meaning, pinyin, stroke_count FROM wuxing_characters ORDER BY id LIMIT 22")
for row in cur.fetchall():
    print(f"  id={row[0]}, char={row[1]}, 五行={row[2]}, 意义={row[3]}, 拼音={row[4]}, 笔画={row[5]}")

print("\n" + "=" * 60)
print("2. kangxi_dict 五行字段统计")
print("=" * 60)
cur.execute("SELECT wuxing, COUNT(*)::int AS cnt FROM kangxi_dict WHERE wuxing IS NOT NULL AND wuxing != '' GROUP BY wuxing ORDER BY cnt DESC")
print(f"  分布: {cur.fetchall()}")

print("\n五行类别示例 (每个五行取3条):")
cur.execute("""
    SELECT character, pinyin, wuxing, stroke_count 
    FROM kangxi_dict 
    WHERE wuxing = '木' LIMIT 3
""")
print(f"  木: {cur.fetchall()}")

cur.execute("""
    SELECT character, pinyin, wuxing, stroke_count 
    FROM kangxi_dict 
    WHERE wuxing = '火' LIMIT 3
""")
print(f"  火: {cur.fetchall()}")

cur.execute("""
    SELECT character, pinyin, wuxing, stroke_count 
    FROM kangxi_dict 
    WHERE wuxing = '土' LIMIT 3
""")
print(f"  土: {cur.fetchall()}")

cur.execute("""
    SELECT character, pinyin, wuxing, stroke_count 
    FROM kangxi_dict 
    WHERE wuxing = '金' LIMIT 3
""")
print(f"  金: {cur.fetchall()}")

cur.execute("""
    SELECT character, pinyin, wuxing, stroke_count 
    FROM kangxi_dict 
    WHERE wuxing = '水' LIMIT 3
""")
print(f"  水: {cur.fetchall()}")

print("\n" + "=" * 60)
print("3. name_records 表 (已有八字数据的记录)")
print("=" * 60)
cur.execute("""
    SELECT COUNT(*) FROM name_records 
    WHERE bazi_year IS NOT NULL
""")
print(f"  有八字数据的记录数: {cur.fetchone()[0]}")

cur.execute("""
    SELECT surname, gender, bazi_year, bazi_month, bazi_day, bazi_hour
    FROM name_records 
    WHERE bazi_year IS NOT NULL 
    LIMIT 5
""")
for row in cur.fetchall():
    print(f"  姓={row[0]}, 性别={row[1]}, 年={row[2]}, 月={row[3]}, 日={row[4]}, 时={row[5]}")

print("\n" + "=" * 60)
print("4. 数据库所有表列表")
print("=" * 60)
cur.execute("""
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema='public' ORDER BY table_name
""")
tables = [r[0] for r in cur.fetchall()]
print(f"  {tables}")

cur.close()
conn.close()