import psycopg2

conn = psycopg2.connect(host='localhost', port=5432, database='seekname_db', user='postgres', password='postgres')
cur = conn.cursor()

print("============================================")
print("  验证 naming_materials 表数据")
print("============================================")

cur.execute('SELECT COUNT(*) FROM naming_materials')
total = cur.fetchone()[0]
print(f"总记录数: {total}")

cur.execute('SELECT COUNT(*) FROM naming_materials WHERE embedding IS NOT NULL')
vec = cur.fetchone()[0]
print(f"有向量的: {vec}")

cur.execute('SELECT MIN(id), MAX(id) FROM naming_materials')
r = cur.fetchone()
print(f"ID范围: [{r[0]} - {r[1]}]")

print("\n--- 前3条数据 ---")
cur.execute('SELECT id, phrase, source, meaning, quality, style FROM naming_materials ORDER BY id LIMIT 3')
for r in cur.fetchall():
    print(f"  id={r[0]} phrase={r[1]} source={r[2]} meaning={r[3]} quality={r[4]} style={r[5]}")

print("\n--- 后3条数据 ---")
cur.execute('SELECT id, phrase, source, meaning, quality, style FROM naming_materials ORDER BY id DESC LIMIT 3')
for r in cur.fetchall():
    print(f"  id={r[0]} phrase={r[1]} source={r[2]} meaning={r[3]} quality={r[4]} style={r[5]}")

print("\n--- 单字样本(5个) ---")
cur.execute("SELECT phrase, meaning FROM naming_materials WHERE LENGTH(phrase)=1 LIMIT 5")
for r in cur.fetchall():
    print(f"  {r[0]} -> {r[1]}")

print("\n--- 二字词样本(5个) ---")
cur.execute("SELECT phrase, meaning FROM naming_materials WHERE LENGTH(phrase)=2 LIMIT 5")
for r in cur.fetchall():
    print(f"  {r[0]} -> {r[1]}")

print("\n--- 按来源分类统计 ---")
cur.execute("SELECT source, COUNT(*) FROM naming_materials GROUP BY source ORDER BY source")
for r in cur.fetchall():
    print(f"  {r[0]:10s} : {r[1]}")

print("\n--- embedding长度验证(取前3条) ---")
cur.execute("SELECT id, phrase, length(embedding) as len FROM naming_materials ORDER BY id LIMIT 3")
for r in cur.fetchall():
    print(f"  id={r[0]} phrase={r[1]} embedding长度={r[2]}")

print("\n✅ 验证完成!")
conn.close()