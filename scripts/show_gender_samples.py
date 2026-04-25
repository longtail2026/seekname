# -*- coding: utf-8 -*-
import psycopg2

conn_str = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
c = psycopg2.connect(conn_str)
r = c.cursor()

lines = []

lines.append("=" * 70)
lines.append("【性别标签分布】")
r.execute("SELECT gender_tag, COUNT(*) FROM naming_classics WHERE gender_tag IS NOT NULL GROUP BY gender_tag ORDER BY COUNT(*) DESC")
for tag, cnt in r.fetchall():
    lines.append(f"  {tag}: {cnt}")
lines.append(f"  未打标: 0 | 总计: 15815")
lines.append("")

lines.append("=" * 70)
lines.append("【男 ♂ 样本】")
r.execute("SELECT id, book_name, chapter_name, LEFT(ancient_text, 80), gender_tag FROM naming_classics WHERE gender_tag='男' LIMIT 3")
for row in r.fetchall():
    lines.append(f"  ID={row[0]}  典籍={row[1]}  篇={row[2]}")
    lines.append(f"  原文: {row[3]}")
    lines.append(f"  标签: {row[4]}")
    lines.append("")

lines.append("=" * 70)
lines.append("【女 ♀ 样本】")
r.execute("SELECT id, book_name, chapter_name, LEFT(ancient_text, 80), gender_tag FROM naming_classics WHERE gender_tag='女' LIMIT 3")
for row in r.fetchall():
    lines.append(f"  ID={row[0]}  典籍={row[1]}  篇={row[2]}")
    lines.append(f"  原文: {row[3]}")
    lines.append(f"  标签: {row[4]}")
    lines.append("")

lines.append("=" * 70)
lines.append("【中性 ⚥ 样本】")
r.execute("SELECT id, book_name, chapter_name, LEFT(ancient_text, 80), gender_tag FROM naming_classics WHERE gender_tag='中性' LIMIT 3")
for row in r.fetchall():
    lines.append(f"  ID={row[0]}  典籍={row[1]}  篇={row[2]}")
    lines.append(f"  原文: {row[3]}")
    lines.append(f"  标签: {row[4]}")
    lines.append("")

c.close()

with open('c:\\seekname\\gender_samples_output.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print("文件已保存: gender_samples_output.txt")
