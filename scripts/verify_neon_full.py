import psycopg2

conn = psycopg2.connect("postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()

cur.execute(
    "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"
)
rows = cur.fetchall()

print(f"=== Neon users 表 ({len(rows)} 列) ===")
for r in rows:
    print(f"  {r[0]:20s} | {r[1]:25s} | 可空:{r[2]:3s} | 默认值:{str(r[3]):10s}")

# 检查是否有用户数据
cur.execute("SELECT COUNT(*) FROM users")
count = cur.fetchone()[0]
print(f"\n当前用户数: {count}")

cur.close()
conn.close()
