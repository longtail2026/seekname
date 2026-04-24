#!/usr/bin/env python3
"""测试 bytea 解析逻辑 - 只处理 1 条记录"""
import psycopg2
import struct
import os

NEON_URL = os.getenv("DATABASE_URL", 
    "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")

conn = psycopg2.connect(NEON_URL)
cur = conn.cursor()

# 检查已有 vector 数据
cur.execute("SELECT COUNT(*) FROM naming_classics WHERE combined_text_embedding_vec IS NOT NULL")
existing = cur.fetchone()[0]
print(f"已有 vector 数据的记录数: {existing}")

# 取一条 bytea 数据
cur.execute("SELECT id, combined_text_embedding FROM naming_classics WHERE combined_text_embedding IS NOT NULL AND combined_text_embedding_vec IS NULL LIMIT 1")
row = cur.fetchone()
if not row:
    print("没有需要处理的记录")
    conn.close()
    exit(0)

id_val, bytea_data = row
print(f"ID: {id_val}")
print(f"Type: {type(bytea_data).__name__}")

# 处理 memoryview
if isinstance(bytea_data, memoryview):
    raw = bytes(bytea_data)
elif isinstance(bytea_data, bytearray):
    raw = bytes(bytea_data)
elif isinstance(bytea_data, bytes):
    raw = bytea_data
else:
    print(f"未知类型: {type(bytea_data)}")
    conn.close()
    exit(1)

print(f"Raw bytes length: {len(raw)}")
num_floats = len(raw) // 4
print(f"Expected float32 count: {num_floats}")

if num_floats != 1024:
    print(f"警告: 维度不是 1024，而是 {num_floats}")
    # 可能是文本格式，直接显示前200字节
    print(f"Raw bytes (hex): {raw[:200].hex()}")
    conn.close()
    exit(1)

# 解析 float32
floats = list(struct.unpack(f'{num_floats}f', raw))
print(f"First 5 floats: {floats[:5]}")
print(f"Last 5 floats: {floats[-5:]}")

# 转换为 vector 字符串
vector_str = '[' + ','.join(f'{v:.8f}' for v in floats) + ']'
print(f"Vector str length: {len(vector_str)}")

# 写入数据库
cur.execute("UPDATE naming_classics SET combined_text_embedding_vec = %s::vector WHERE id = %s", (vector_str, id_val))
conn.commit()

# 验证
cur.execute("SELECT id, vector_dims(combined_text_embedding_vec) FROM naming_classics WHERE id = %s", (id_val,))
v = cur.fetchone()
print(f"已更新: ID={v[0]}, 维度={v[1]}")

# 测试余弦相似度搜索
cur.execute("""
    SELECT COUNT(*) FROM naming_classics 
    WHERE combined_text_embedding_vec IS NOT NULL
""")
cnt = cur.fetchone()[0]
print(f"当前有 vector 数据的记录数: {cnt}")

cur.execute("""
    SELECT id, book_name, (combined_text_embedding_vec <=> $1::vector) AS dist
    FROM naming_classics 
    WHERE combined_text_embedding_vec IS NOT NULL
    ORDER BY combined_text_embedding_vec <=> $1::vector
    LIMIT 3
""", (vector_str,))
results = cur.fetchall()
print("余弦相似度搜索测试:")
for r in results:
    print(f"  ID={r[0]}, book={r[1]}, dist={r[2]:.4f}")

conn.close()
print("✅ bytea 解析和 vector 存储测试成功!")
