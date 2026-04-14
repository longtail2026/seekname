import psycopg2

conn = psycopg2.connect("postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()

# 检查 password 列是否已存在
cur.execute(
    "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='password'"
)
row = cur.fetchone()

if row:
    print("ALREADY_EXISTS: password 列已存在，无需添加")
else:
    # 添加 password 列
    cur.execute("ALTER TABLE users ADD COLUMN password TEXT")
    conn.commit()
    
    # 验证
    cur.execute(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password'"
    )
    verify = cur.fetchone()
    if verify:
        print(f"ADDED_OK: password 列已成功添加，类型={verify[1]}")
    else:
        print("ERROR: 添加失败")

cur.close()
conn.close()
