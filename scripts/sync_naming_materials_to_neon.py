#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
同步 naming_materials 表从本地 PostgreSQL 到 Neon 生产数据库

本地：BYTEA 类型 embedding（1024维 float32）
Neon：vector(1024) 类型 embedding + HNSW 索引

执行步骤：
1. 从本地导出全部数据，BYTEA → float32[] 转换
2. 在 Neon 创建 naming_materials 表（用 vector 类型）
3. 批量插入数据到 Neon
4. 创建 HNSW 索引
5. 验证
"""
import os, sys, struct, json
import logging
import psycopg2
import psycopg2.extras

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('sync_naming_materials')

# ========== 数据库配置 ==========

# 本地 PostgreSQL (数据源)
LOCAL_DB = dict(
    host=os.getenv("LOCAL_DB_HOST", "localhost"),
    port=int(os.getenv("LOCAL_DB_PORT", "5432")),
    database=os.getenv("LOCAL_DB_NAME", "seekname_db"),
    user=os.getenv("LOCAL_DB_USER", "postgres"),
    password=os.getenv("LOCAL_DB_PASSWORD", "postgres"),
)

# Neon 生产数据库 (目标)
NEON_DATABASE_URL = os.getenv(
    "NEON_DATABASE_URL",
    "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)

BATCH_SIZE = 50
VECTOR_DIM = 1024


def bytea_to_vector_str(bytea_buffer: memoryview | bytes) -> str:
    """将 BYTEA 二进制数据（每 4 字节 = 1 float32）转为 pgvector 格式字符串"""
    if isinstance(bytea_buffer, memoryview):
        raw = bytes(bytea_buffer)
    else:
        raw = bytea_buffer
    float_count = len(raw) // 4
    floats = struct.unpack(f'<{float_count}f', raw)
    return '[' + ','.join(f'{v:.8f}' for v in floats) + ']'


def parse_array_field(val):
    """解析数据库中的数组字段（可能是 PostgreSQL 数组字符串或 JSON 字符串）"""
    if val is None:
        return None
    if isinstance(val, list):
        return val
    s = str(val)
    if not s:
        return None
    if s.startswith('{') and s.endswith('}'):
        # PostgreSQL 数组格式 {a,b,c}
        return [x.strip('" ') for x in s[1:-1].split(',') if x.strip()]
    if s.startswith('[') or s.startswith('{'):
        try:
            return json.loads(s)
        except:
            pass
    return [s]


def step1_export_local_data():
    """从本地 DB 导出 naming_materials 全部数据"""
    logger.info("=" * 60)
    logger.info("第1步: 从本地 PostgreSQL 导出 naming_materials 数据")
    logger.info("=" * 60)

    conn = psycopg2.connect(**LOCAL_DB)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # 检查有多少条
        cur.execute("SELECT COUNT(*) FROM naming_materials")
        total = cur.fetchone()['count']
        logger.info(f"本地数据量: {total} 条")

        # 检查 embedding 类型和维度
        cur.execute("SELECT data_type FROM information_schema.columns WHERE table_name='naming_materials' AND column_name='embedding'")
        col_info = cur.fetchone()
        logger.info(f"本地 embedding 列类型: {col_info['data_type'] if col_info else 'N/A'}")

        if total == 0:
            logger.error("本地 naming_materials 表为空！无法同步。")
            return []

        # 全量导出
        cur.execute("""
            SELECT 
                id, phrase, source, source_snippet, meaning, 
                keywords, style, gender, wuxing, quality, combos,
                embedding, created_at
            FROM naming_materials 
            ORDER BY id
        """)

        rows = []
        count = 0
        for row in cur:
            emb_bytes = row['embedding']
            if emb_bytes:
                vector_str = bytea_to_vector_str(emb_bytes)
                # 验证维度
                float_count = len(bytes(emb_bytes)) // 4
                if float_count != VECTOR_DIM:
                    logger.warning(f"  行 id={row['id']} 向量维度 {float_count} != 期望 {VECTOR_DIM}，跳过")
                    continue
            else:
                vector_str = None
                logger.warning(f"  行 id={row['id']} (phrase={row['phrase']}) embedding 为空")

            rows.append({
                'id': row['id'],
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
            if count % 100 == 0:
                logger.info(f"  导出进度: {count}/{total}")

        logger.info(f"导出完成: {len(rows)} 条 (含有效 embedding)")
        return rows

    finally:
        cur.close()
        conn.close()


def step2_create_table_on_neon():
    """在 Neon 上创建 naming_materials 表（embedding 用 vector 类型）"""
    logger.info("\n" + "=" * 60)
    logger.info("第2步: 在 Neon 上创建 naming_materials 表")
    logger.info("=" * 60)

    conn = psycopg2.connect(NEON_DATABASE_URL)
    cur = conn.cursor()

    try:
        # 先检查表是否已存在
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'naming_materials'
            )
        """)
        exists = cur.fetchone()[0]

        if exists:
            logger.warning("⚠ Neon 上 naming_materials 表已存在！检查数据结构...")
            cur.execute("""
                SELECT column_name, data_type, udt_name 
                FROM information_schema.columns 
                WHERE table_name = 'naming_materials' 
                ORDER BY ordinal_position
            """)
            cols = cur.fetchall()
            for c in cols:
                logger.info(f"  {c[0]}: {c[1]} (udt={c[2]})")

            # 检查 embedding 列是否为 vector 类型
            has_vector_col = any(c[2] == 'vector' for c in cols)
            if has_vector_col:
                logger.info("✅ 已有 vector 类型 embedding 列，无需重建")
                return  # 已存在且结构正确
            else:
                logger.warning("⚠ 表存在但 embedding 不是 vector 类型，需要删除重建")
                cur.execute("DROP TABLE IF EXISTS naming_materials CASCADE")
                conn.commit()
                logger.info("已删除旧表")

        # 创建序列
        cur.execute("DROP SEQUENCE IF EXISTS naming_materials_id_seq CASCADE")
        cur.execute("CREATE SEQUENCE naming_materials_id_seq START WITH 1")
        conn.commit()

        # 创建表 - embedding 用 vector(1024)
        cur.execute("""
            CREATE TABLE naming_materials (
                id              INTEGER PRIMARY KEY DEFAULT nextval('naming_materials_id_seq'),
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
        conn.commit()
        logger.info("✅ 表创建成功 (embedding = vector(1024))")

        # 验证 pgvector 扩展
        cur.execute("SELECT extname FROM pg_extension WHERE extname='vector'")
        ext = cur.fetchone()
        logger.info(f"pgvector 扩展状态: {ext}")

    finally:
        cur.close()
        conn.close()


def step3_insert_data_to_neon(data):
    """批量插入数据到 Neon"""
    logger.info("\n" + "=" * 60)
    logger.info("第3步: 批量插入数据到 Neon")
    logger.info("=" * 60)

    if not data:
        logger.error("无数据可插入")
        return 0, 0

    conn = psycopg2.connect(NEON_DATABASE_URL)
    cur = conn.cursor()

    total = len(data)
    inserted = 0
    errors = 0

    # 使用序列重置确保 id 连续
    cur.execute("ALTER SEQUENCE naming_materials_id_seq RESTART WITH 1")
    conn.commit()

    for i in range(0, total, BATCH_SIZE):
        batch = data[i:i + BATCH_SIZE]
        batch_values = []
        
        for row in batch:
            batch_values.append((
                row['phrase'],
                row['source'],
                row['source_snippet'],
                row['meaning'],
                row['keywords'],
                row['style'],
                row['gender'],
                row['wuxing'],
                row['quality'],
                row['combos'],
                row['embedding'],  # pgvector 格式字符串
                row['created_at'],
            ))

        try:
            args_str = ','.join(
                cur.mogrify(
                    "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::vector,%s)",
                    vals
                ).decode('utf-8')
                for vals in batch_values
            )
            
            cur.execute(f"""
                INSERT INTO naming_materials 
                    (phrase, source, source_snippet, meaning, keywords, style, 
                     gender, wuxing, quality, combos, embedding, created_at)
                VALUES {args_str}
            """)
            conn.commit()
            inserted += len(batch)
            logger.info(f"  插入进度: {inserted}/{total}")

        except Exception as e:
            conn.rollback()
            errors += len(batch)
            logger.error(f"  批量插入失败 (offset={i}): {e}")
            # 单条重试
            for row in batch:
                try:
                    cur.execute("""
                        INSERT INTO naming_materials 
                            (phrase, source, source_snippet, meaning, keywords, style, 
                             gender, wuxing, quality, combos, embedding, created_at)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::vector,%s)
                    """, (
                        row['phrase'], row['source'], row['source_snippet'],
                        row['meaning'], row['keywords'], row['style'],
                        row['gender'], row['wuxing'], row['quality'],
                        row['combos'], row['embedding'], row['created_at'],
                    ))
                    conn.commit()
                    inserted += 1
                    errors -= 1
                except Exception as e2:
                    conn.rollback()
                    errors += 1
                    logger.warning(f"  单条插入失败 id={row['phrase']}: {e2}")

    logger.info(f"插入完成: 成功 {inserted} 条, 失败 {errors} 条 (共 {total} 条)")
    return inserted, errors


def step4_create_index():
    """在 embedding 列上创建 HNSW 索引"""
    logger.info("\n" + "=" * 60)
    logger.info("第4步: 创建 HNSW 索引")
    logger.info("=" * 60)

    conn = psycopg2.connect(NEON_DATABASE_URL)
    cur = conn.cursor()

    try:
        # 检查索引是否已存在
        cur.execute("""
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'naming_materials' 
              AND indexname = 'idx_naming_materials_embedding'
        """)
        idx_exists = cur.fetchone()

        if idx_exists:
            logger.info("HNSW 索引已存在，跳过")
            return

        # 先检查是否有数据
        cur.execute("SELECT COUNT(*) FROM naming_materials WHERE embedding IS NOT NULL")
        count = cur.fetchone()[0]
        logger.info(f"待索引数据: {count} 条")

        logger.info("正在创建 HNSW 索引（cosine 距离）...")
        cur.execute("""
            CREATE INDEX idx_naming_materials_embedding 
            ON naming_materials 
            USING hnsw (embedding vector_cosine_ops)
        """)
        conn.commit()
        logger.info("✅ HNSW 索引创建成功")

    except Exception as e:
        conn.rollback()
        logger.error(f"索引创建失败: {e}")
        logger.warning("可能 pgvector HNSW 需要特定版本，尝试创建 IVFFlat 索引作为备选...")
        try:
            cur.execute("""
                CREATE INDEX idx_naming_materials_embedding_ivfflat
                ON naming_materials 
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 50)
            """)
            conn.commit()
            logger.info("✅ IVFFlat 索引创建成功")
        except Exception as e2:
            conn.rollback()
            logger.error(f"IVFFlat 索引也失败了: {e2}")
    finally:
        cur.close()
        conn.close()


def step5_verify():
    """验证同步结果"""
    logger.info("\n" + "=" * 60)
    logger.info("第5步: 验证同步结果")
    logger.info("=" * 60)

    conn = psycopg2.connect(NEON_DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        cur.execute("SELECT COUNT(*) FROM naming_materials")
        count = cur.fetchone()['count']
        logger.info(f"Neon naming_materials 总记录数: {count}")

        cur.execute("""
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'naming_materials'
            ORDER BY ordinal_position
        """)
        logger.info("表结构:")
        for c in cur.fetchall():
            logger.info(f"  {c['column_name']:15s} | {c['data_type']:15s} | {c['udt_name'] or ''}")

        cur.execute("""
            SELECT id, phrase, source, meaning, quality 
            FROM naming_materials ORDER BY id LIMIT 10
        """)
        logger.info("前 10 条示例数据:")
        for r in cur.fetchall():
            logger.info(f"  ID={r['id']:4d} | {r['phrase']:8s} | {(r['source'] or ''):15s} | {(r['meaning'] or '')[:20]:20s} | Q={r['quality']}")

        # 测试 pgvector 查询
        cur.execute("""
            SELECT id, phrase, embedding <=> (
                SELECT embedding FROM naming_materials WHERE id = 1
            ) AS distance
            FROM naming_materials
            ORDER BY embedding <=> (SELECT embedding FROM naming_materials WHERE id = 1)
            LIMIT 5
        """)
        logger.info("pgvector 向量搜索测试 (以 id=1 为例):")
        for r in cur.fetchall():
            logger.info(f"  {r['phrase']:8s} | distance={r['distance']:.6f}")

    finally:
        cur.close()
        conn.close()


def main():
    logger.info("=" * 70)
    logger.info("■ 同步 naming_materials 表到 Neon 生产数据库")
    logger.info("=" * 70)

    # 第1步: 导出本地数据
    data = step1_export_local_data()
    if not data:
        logger.error("无数据可同步，终止")
        sys.exit(1)

    # 第2步: 在 Neon 上创建表
    step2_create_table_on_neon()

    # 第3步: 插入数据
    inserted, errors = step3_insert_data_to_neon(data)

    # 第4步: 创建索引
    if inserted > 0:
        step4_create_index()
    else:
        logger.warning("无数据插入，跳过索引创建")

    # 第5步: 验证
    step5_verify()

    logger.info("\n" + "=" * 70)
    logger.info("■ 同步完成！")
    logger.info("=" * 70)


if __name__ == '__main__':
    main()