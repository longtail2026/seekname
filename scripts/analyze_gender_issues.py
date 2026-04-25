#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析性别打标偏低的问题 - 检查误判情况
"""
import psycopg2

conn_str = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
c = psycopg2.connect(conn_str)
r = c.cursor()

lines = []

def out(s=""):
    lines.append(s)
    print(s)

out("=" * 70)
out("【1. 各典籍性别分布】")
out("=" * 70)
r.execute("""
    SELECT book_name, 
        COUNT(*) as total,
        SUM(CASE WHEN gender_tag='男' THEN 1 ELSE 0 END) as male,
        SUM(CASE WHEN gender_tag='女' THEN 1 ELSE 0 END) as female,
        SUM(CASE WHEN gender_tag='中性' THEN 1 ELSE 0 END) as neutral
    FROM naming_classics 
    GROUP BY book_name 
    ORDER BY total DESC
""")
out(f"{'典籍':12s} | {'总计':>4s} | {'男':>4s} | {'女':>4s} | {'中性':>5s} | {'女%':>5s}")
out("-" * 50)
for row in r.fetchall():
    female_pct = row[3]/row[1]*100 if row[1] > 0 else 0
    out(f"{row[0]:12s} | {row[1]:4d} | {row[2]:4d} | {row[3]:4d} | {row[4]:5d} | {female_pct:4.1f}%")

out()
out("=" * 70)
out("【2. 女性关键词统计 - 原始数据中有多少含女性相关字】")
out("=" * 70)
keywords = ['妇', '女', '妾', '母', '妻', '嫁', '娘', '姑', '嫂', '妊', '娠', '乳', '娩']
for kw in keywords:
    r.execute(f"SELECT COUNT(*) FROM naming_classics WHERE ancient_text LIKE '%{kw}%'")
    cnt = r.fetchone()[0]
    if cnt > 0:
        out(f"  含'{kw}'字: {cnt}条")

out()
out("【3. 所有女性关键词条目被打标成什么】")
out("-" * 50)
r.execute("""
    SELECT gender_tag, COUNT(*) 
    FROM naming_classics 
    WHERE (ancient_text LIKE '%妇%' OR ancient_text LIKE '%女%' OR ancient_text LIKE '%妾%' 
           OR ancient_text LIKE '%妻%' OR ancient_text LIKE '%嫁%' OR ancient_text LIKE '%母%'
           OR ancient_text LIKE '%娘%' OR ancient_text LIKE '%姑%')
    GROUP BY gender_tag
    ORDER BY COUNT(*) DESC
""")
for row in r.fetchall():
    out(f"  {row[0]}: {row[1]}")

out()
out("=" * 70)
out("【4. 含'妇'字却被判为中性/男的记录（前三本典籍）】")
out("=" * 70)
r.execute("""
    SELECT book_name, COUNT(*) 
    FROM naming_classics 
    WHERE ancient_text LIKE '%妇%' AND (gender_tag='中性' OR gender_tag='男')
    GROUP BY book_name 
    ORDER BY COUNT(*) DESC
""")
for row in r.fetchall():
    out(f"  {row[0]}: {row[1]}条妇字→中性/男")

out()
out("【样本展示 - 妇字被判为中性】")
r.execute("""
    SELECT id, book_name, LEFT(ancient_text, 70), gender_tag 
    FROM naming_classics 
    WHERE ancient_text LIKE '%妇%' AND gender_tag='中性' 
    LIMIT 8
""")
for row in r.fetchall():
    out(f"  ID={row[0]} [{row[1]}]: {row[2]} -> {row[3]}")

out()
out("=" * 70)
out("【5. 含'女'字却被判为中性/男的记录】")
out("=" * 70)
r.execute("""
    SELECT id, book_name, LEFT(ancient_text, 70), gender_tag 
    FROM naming_classics 
    WHERE ancient_text LIKE '%女%' AND gender_tag!='女' 
    LIMIT 10
""")
for row in r.fetchall():
    out(f"  ID={row[0]} [{row[1]}]: {row[2]} -> {row[3]}")

out()
out("=" * 70)
out("【6. 被误判为女的典型 - 含'冠'字（男子冠礼）】")
out("=" * 70)
r.execute("""
    SELECT id, book_name, LEFT(ancient_text, 80), gender_tag 
    FROM naming_classics 
    WHERE ancient_text LIKE '%冠%' AND gender_tag='女' 
    LIMIT 10
""")
for row in r.fetchall():
    out(f"  ID={row[0]} [{row[1]}]: {row[2]} -> {row[3]}")

out()
out("=" * 70)
out("【7. 被误判为女的典型 - 含'君子'】")
out("=" * 70)
r.execute("""
    SELECT id, book_name, LEFT(ancient_text, 70), gender_tag 
    FROM naming_classics 
    WHERE ancient_text LIKE '%君子%' AND gender_tag='女' 
    LIMIT 5
""")
for row in r.fetchall():
    out(f"  ID={row[0]} [{row[1]}]: {row[2]} -> {row[3]}")

out()
out("=" * 70)
out("【8. 含'孔子'但未被判为男的】")
out("=" * 70)
r.execute("""
    SELECT id, book_name, LEFT(ancient_text, 70), gender_tag 
    FROM naming_classics 
    WHERE ancient_text LIKE '%孔子%' AND gender_tag!='男' 
    LIMIT 5
""")
for row in r.fetchall():
    out(f"  ID={row[0]} [{row[1]}]: {row[2]} -> {row[3]}")

out()
out("=" * 70)
out("【9. 被标为女的随机10条 - 人工验证是否正确】")
out("=" * 70)
r.execute("""
    SELECT id, book_name, LEFT(ancient_text, 100), gender_tag 
    FROM naming_classics WHERE gender_tag='女' 
    ORDER BY id 
    LIMIT 10
""")
for i, row in enumerate(r.fetchall()):
    out(f"  #{i+1} ID={row[0]} [{row[1]}]: {row[2]}")
    out(f"      -> {row[3]}")

out()
out("=" * 70)
out("【10. 诗经中被打为女的记录】")
out("=" * 70)
r.execute("""
    SELECT id, chapter_name, LEFT(ancient_text, 80), gender_tag 
    FROM naming_classics 
    WHERE book_name='诗经' AND gender_tag='女' 
    LIMIT 10
""")
for row in r.fetchall():
    out(f"  ID={row[0]} [{row[1]}]: {row[2]} -> {row[3]}")

out()
out("=" * 70)
out("【11. 女性能显性关键词总数 vs 已打标为女的总数】")
out("=" * 70)
r.execute("SELECT COUNT(*) FROM naming_classics WHERE gender_tag='女'")
marked_female = r.fetchone()[0]
r.execute("""
    SELECT COUNT(*) FROM naming_classics 
    WHERE (ancient_text LIKE '%妇%' OR ancient_text LIKE '%妾%' OR ancient_text LIKE '%妻%' 
           OR ancient_text LIKE '%嫁%' OR ancient_text LIKE '%娘%' OR ancient_text LIKE '%姑%'
           OR ancient_text LIKE '%嫂%' OR ancient_text LIKE '%婢%' OR ancient_text LIKE '%姬%'
           OR ancient_text LIKE '%妃%' OR ancient_text LIKE '%嫔%' OR ancient_text LIKE '%媵%'
           OR ancient_text LIKE '%妊%' OR ancient_text LIKE '%娠%' OR ancient_text LIKE '%娩%')
""")
explicit_female_refs = r.fetchone()[0]
out(f"  被标为'女'的总数: {marked_female}")
out(f"  含女性显性关键词的总数: {explicit_female_refs}")
out(f"  差异: {explicit_female_refs - marked_female} (这些被误判为中性/男)")

c.close()

with open('c:\\seekname\\gender_analysis.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"\n共输出 {len(lines)} 行，文件已保存")
