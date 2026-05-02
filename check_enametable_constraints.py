#!/usr/bin/env python3
"""检查 ename_dict 表的约束和索引"""
import psycopg2

NEON_URL = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
conn = psycopg2.connect(NEON_URL)
cur = conn.cursor()

# 检查约束
cur.execute("""
    SELECT conname, contype 
    FROM pg_constraint 
    WHERE conrelid = 'ename_dict'::regclass
""")
constraints = cur.fetchall()
print("Constraints:")
for r in constraints:
    print(f"  {r[0]} (type={r[1]})")

# 检查索引
cur.execute("""
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'ename_dict'
""")
print("\nIndexes:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1][:100]}")

# 检查 id 列是否是 serial/自增
cur.execute("""
    SELECT column_name, column_default, is_identity
    FROM information_schema.columns 
    WHERE table_name='ename_dict' AND column_name='id'
""")
id_col = cur.fetchone()
print(f"\nid column: default={id_col[1]}, is_identity={id_col[2]}")

cur.close()
conn.close()