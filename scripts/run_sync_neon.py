#!/usr/bin/env python3
"""
在 Neon 上重建 naming_materials 表，插入本地正确数据（BYTEA→vector 转换）
"""
import os, sys, struct, json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('sync_neon')

# 配置
NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
LOCAL_DB = dict(
    host='localhost', port=5432, database='seekname_db',
    user='postgres', password='postgres',
)
VECTOR_DIM = 1024
BATCH_SIZE = 50

import psycopg2
import psycopg2.extras

def bytea_to_vector_str(bytea_buffer):
    raw = bytes(bytea_buffer)
    float_count = len(raw) // 4
    floats = struct.unpack(f'<{float_count}f', raw)
    return '[' + ','.join(f'{v:.8f}' for v in floats) + ']'

def parse_array_field(val):
    if val is None: return None
    if isinstance(val, list): return val
    s = str(val)
    if not s: return None
    if s.startswith('{') and s.endswith('}'):
        return [x.strip('" ') for x in s[1:-1].split(',') if x.strip()]
    if s.startswith('[') or s.startswith('{'):
        try: return json.loads(s)
        except: pass
    return [s]

logger.info("=" * 60)
logger.info("第1步: 从本地 PostgreSQL 导出数据")
logger.info("=" * 60)

conn_local = psycopg2.connect(**LOCAL_DB)
cur_local = conn_local.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

cur_local.execute("SELECT COUNT(*) FROM naming_materials")
total = cur_local.fetchone()['count']
logger.info(f"本地数据: {total} 条")

cur_local.execute("""
    SELECT id, phrase, source, source_snippet, meaning, 
           keywords, style, gender, wuxing, quality, combos,
           embedding, created_at
    FROM naming_materials ORDER BY id
""")

rows = []
count = 0
for row in cur_local:
    emb_bytes = row['embedding']
    if emb_bytes:
        vector_str = bytea_to_vector_str(emb_bytes)
        float_count = len(bytes(emb_bytes)) // 4
        if float_count != VECTOR_DIM:
            logger.warning(f"  跳过 id={row['id']} 维度 {float_count}")
            continue
    else:
        vector_str = None
        logger.warning(f"  跳过 id={row['id']} 无 embedding")
    
    rows.append({
        'phrase': row['phrase'],
        'source': row['source'],
        'source_snippet': row['source_snippet'],
        'meaning': row['meaning'],
        'keywords': parse_array_field(row['keywords']),
        'style': parse_array_field(row['style']),
        'gender': row['gender'] or 'B',
        'wuxing': row['wuxing'],
        'quality': row['quality'] or 3,
        'combos': parse_array_field(row['combos']),
        'embedding': vector_str,
        'created_at': row['created_at'],
    })
    count += 1

cur_local.close()
conn_local.close()
logger.info(f"导出完成: {len(rows)} 条")

logger.info("\n" + "=" * 60)
logger.info("第2步: 在 Neon 上创建表并插入数据")
logger.info("=" * 60)

conn_neon = psycopg2.connect(NEON_DATABASE_URL)
cur_neon = conn_neon.cursor()

# 删除旧表重建
cur_neon.execute("DROP TABLE IF EXISTS naming_materials CASCADE")
cur_neon.execute("""
    CREATE TABLE naming_materials (
        id              SERIAL PRIMARY KEY,
        phrase          VARCHAR(10) NOT NULL,
        source          VARCHAR(100),
        source_snippet  VARCHAR(300),
        meaning         VARCHAR(200),
        keywords        TEXT[],
        style           VARCHAR(50)[],
        gender          CHAR(1) DEFAULT 'B',
        wuxing          VARCHAR(10),
        quality         INTEGER DEFAULT 3,
        combos          TEXT[],
        embedding       vector(1024),
        created_at      TIMESTAMP DEFAULT NOW()
    )
""")
conn_neon.commit()
logger.info("✅ 表创建成功 (embedding = vector(1024))")

# 批量插入
inserted = 0
errors = 0
total = len(rows)

for i in range(0, total, BATCH_SIZE):
    batch = rows[i:i + BATCH_SIZE]
    batch_values = []
    for row in batch:
        batch_values.append((
            row['phrase'], row['source'], row['source_snippet'],
            row['meaning'], row['keywords'], row['style'],
            row['gender'], row['wuxing'], row['quality'],
            row['combos'], row['embedding'], row['created_at'],
        ))

    try:
        args_str = ','.join(
            cur_neon.mogrify(
                "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::vector,%s)",
                vals
            ).decode('utf-8')
            for vals in batch_values
        )
        cur_neon.execute(f"""
            INSERT INTO naming_materials 
                (phrase, source, source_snippet, meaning, keywords, style, 
                 gender, wuxing, quality, combos, embedding, created_at)
            VALUES {args_str}
        """)
        conn_neon.commit()
        inserted += len(batch)
        logger.info(f"  插入进度: {inserted}/{total}")
    except Exception as e:
        conn_neon.rollback()
        logger.error(f"  批量失败 offset={i}: {e}")
        errors += len(batch)

logger.info(f"插入完成: 成功 {inserted} 条, 失败 {errors} 条")

logger.info("\n" + "=" * 60)
logger.info("第3步: 创建 HNSW 索引")
logger.info("=" * 60)

try:
    cur_neon.execute("""
        CREATE INDEX idx_naming_materials_embedding 
        ON naming_materials USING hnsw (embedding vector_cosine_ops)
    """)
    conn_neon.commit()
    logger.info("✅ HNSW 索引创建成功")
except Exception as e:
    conn_neon.rollback()
    logger.warning(f"HNSW 失败: {e}，尝试 IVFFlat...")
    try:
        cur_neon.execute("""
            CREATE INDEX idx_naming_materials_embedding
            ON naming_materials USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 50)
        """)
        conn_neon.commit()
        logger.info("✅ IVFFlat 索引创建成功")
    except Exception as e2:
        conn_neon.rollback()
        logger.error(f"索引全部失败: {e2}")

logger.info("\n" + "=" * 60)
logger.info("第4步: 验证")
logger.info("=" * 60)

cur_neon.execute("SELECT COUNT(*) FROM naming_materials")
cnt = cur_neon.fetchone()[0]
logger.info(f"Neon 总记录数: {cnt}")

# 测试 pgvector 查询（以第一条为参考）
cur_neon.execute("""
    SELECT id, phrase, embedding <=> (
        SELECT embedding FROM naming_materials WHERE id = 1
    ) AS distance
    FROM naming_materials
    ORDER BY embedding <=> (SELECT embedding FROM naming_materials WHERE id = 1)
    LIMIT 5
""")
logger.info("向量相似度搜索测试 (参考 id=1):")
for r in cur_neon.fetchall():
    logger.info(f"  id={r[0]} phrase={r[1]} distance={r[2]:.6f}")

cur_neon.close()
conn_neon.close()

logger.info("\n" + "=" * 60)
logger.info("✅ 同步完成！")
logger.info("=" * 60)