"""检查数据库状态"""
import psycopg2
import sys

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/seekname_db')
cur = conn.cursor()

# 1. 检查classics_entries表结构
print("="*60)
print("classics_entries 表结构:")
print("="*60)
cur.execute("SELECT column_name, udt_name, data_type FROM information_schema.columns WHERE table_name='classics_entries' ORDER BY ordinal_position")
for r in cur.fetchall():
    print(f"  {r[0]:35s} {str(r[1]):15s} {r[2]}")
print()

# 2. 检查嵌入相关的列
print("="*60)
print("嵌入相关列:")
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='classics_entries' AND column_name LIKE '%embed%'")
cols = [c[0] for c in cur.fetchall()]
print(f"  {cols}")
print()

# 3. 检查pgvector扩展
print("="*60)
print("pgvector 扩展:")
cur.execute("SELECT * FROM pg_extension WHERE extname='vector'")
ext = cur.fetchone()
print(f"  {'已安装' if ext else '未安装'}")
if ext:
    print(f"  {ext}")
print()

# 4. 统计嵌入数据
print("="*60)
print("数据统计:")
cur.execute("SELECT COUNT(*) FROM classics_entries")
total = cur.fetchone()[0]
print(f"  总记录数: {total}")

if 'combined_text_embedding' in [c[0] for c in __import__('psycopg2').extras]:
    pass

# Check embedding column specifically
cur.execute("SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='classics_entries' AND column_name='combined_text_embedding'")
emb_col = cur.fetchone()
if emb_col:
    print(f"  嵌入列类型: {emb_col[1]}")
    cur.execute("SELECT COUNT(*) FROM classics_entries WHERE combined_text_embedding IS NOT NULL")
    cnt = cur.fetchone()[0]
    print(f"  已有嵌入向量: {cnt}/{total}")
else:
    print("  没有 combined_text_embedding 列!")

# 5. 查看几条示例数据
print()
print("="*60)
print("示例数据 (前3条):")
cur.execute("SELECT id, title, source, LEFT(content, 100) as content_preview FROM classics_entries LIMIT 3")
for r in cur.fetchall():
    print(f"  ID: {r[0]}")
    print(f"  标题: {r[1]}")
    print(f"  来源: {r[2]}")
    print(f"  内容预览: {r[3]}")
    print()

# 6. 检查关键词搜索相关
print("="*60)
print("关键词搜索相关:")
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='classics_entries' AND column_name LIKE '%keyword%'")
kw_cols = [c[0] for c in cur.fetchall()]
if kw_cols:
    print(f"  关键词列: {kw_cols}")
else:
    print("  没有关键词列")

conn.close()
print("="*60)
print("检查完成!")
