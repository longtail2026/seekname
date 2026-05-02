#!/usr/bin/env python3
"""检查 ename_dict 表结构"""
import psycopg2

NEON_URL = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

conn = psycopg2.connect(NEON_URL)
cur = conn.cursor()

# 表结构
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='ename_dict' ORDER BY ordinal_position")
print("=== 表结构 ===")
for r in cur.fetchall():
    print(f"  {r[0]:20s} {r[1]}")

# 行数
cur.execute("SELECT COUNT(*) FROM ename_dict")
cnt = cur.fetchone()[0]
print(f"\n总行数: {cnt}")

# 样例
if cnt > 0:
    cur.execute("SELECT english_name, gender, chinese_name, origin, meaning FROM ename_dict LIMIT 5")
    print("\n=== 样例数据 ===")
    for r in cur.fetchall():
        print(f"  {r[0]:20s} | {r[1]:6s} | {r[2]:10s} | {r[3]:15s} | {r[4][:30]}")
    
    cur.execute("SELECT DISTINCT gender FROM ename_dict")
    genders = [r[0] for r in cur.fetchall()]
    print(f"\n性别分类: {genders}")

    cur.execute("SELECT COUNT(*), gender FROM ename_dict GROUP BY gender")
    print("各性别数量:")
    for r in cur.fetchall():
        print(f"  {r[1]:10s}: {r[0]}")

# 检查 embedding
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='ename_dict' AND column_name='embedding'")
has_vec = cur.fetchone()
print(f"\nembedding 向量字段: {'✓ 存在' if has_vec else '✗ 不存在'}")

if has_vec:
    cur.execute("SELECT COUNT(*) FROM ename_dict WHERE embedding IS NOT NULL")
    vec_cnt = cur.fetchone()[0]
    print(f"有向量的行数: {vec_cnt}/{cnt}")

cur.close()
conn.close()