#!/usr/bin/env python3
"""
将 naming_classics 表中还剩余 bytea 数据 (ancient_text_embedding)
转换为 combined_text_embedding_vec (vector(1024)) 列 — Neon 云数据库版

背景：
- combined_text_embedding 列已被删除释放空间
- 但 ancient_text_embedding 列仍保留 bytea 格式的 1024维向量数据
- 从中解析出 float32 列表，写入 vector(1024) 格式

使用 execute_values 批量更新以提高速度（减少网络往返）
"""

import os
import sys
import logging
import struct
import psycopg2
import psycopg2.extras
import time
import gc

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Neon 数据库连接 URL
NEON_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)

BATCH_SIZE = 200  # 使用更小的批次以减少空间压力


def connect():
    """连接 Neon 数据库"""
    logger.info(f"连接到 Neon 数据库...")
    conn = psycopg2.connect(NEON_DATABASE_URL)
    conn.autocommit = False
    logger.info("连接成功")
    return conn


def get_total_count(conn):
    """获取需要转换的总条目数"""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT COUNT(*) 
            FROM naming_classics 
            WHERE ancient_text_embedding IS NOT NULL 
              AND combined_text_embedding_vec IS NULL
        """)
        return cur.fetchone()[0]
    finally:
        cur.close()


def fetch_batch(conn, limit):
    """分批获取 bytea 数据 (每次从头取，因为更新后 WHERE 排除已处理行)"""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, ancient_text_embedding 
            FROM naming_classics 
            WHERE ancient_text_embedding IS NOT NULL 
              AND combined_text_embedding_vec IS NULL
            ORDER BY id
            LIMIT %s
        """, (limit,))
        return cur.fetchall()
    finally:
        cur.close()


def bytea_to_float32_list(bytea_data):
    """
    将 BYTEA 二进制数据解析为 float32 列表
    
    存储了 1024 个 float32 值（4096 字节）
    """
    if bytea_data is None:
        return None
    
    # psycopg2 返回的是 memoryview 或 bytes
    if isinstance(bytea_data, memoryview):
        raw_bytes = bytes(bytea_data)
    elif isinstance(bytea_data, bytearray):
        raw_bytes = bytes(bytea_data)
    elif isinstance(bytea_data, bytes):
        raw_bytes = bytea_data
    else:
        logger.warning(f"意外的数据类型: {type(bytea_data)}")
        return None
    
    # 解析 float32
    num_floats = len(raw_bytes) // 4
    floats = list(struct.unpack(f'{num_floats}f', raw_bytes))
    
    if num_floats != 1024:
        logger.warning(f"维度异常: 期望 1024, 实际 {num_floats} (bytes={len(raw_bytes)})")
    
    return floats


def floats_to_vector_sql(floats):
    """将 float 列表转为 PostgreSQL vector 字符串格式 '[0.1,0.2,...]'"""
    if floats is None:
        return None
    return '[' + ','.join(f'{v:.8f}' for v in floats) + ']'


def convert_batch(conn, batch_data):
    """
    转换一批 bytea → vector
    
    batch_data: [(id, bytea_data), ...]
    """
    values = []
    for entry_id, bytea_data in batch_data:
        floats = bytea_to_float32_list(bytea_data)
        if floats is None or len(floats) != 1024:
            logger.warning(f"条目 {entry_id}: 跳过（解析失败或维度异常）")
            continue
        
        vector_str = floats_to_vector_sql(floats)
        values.append((entry_id, vector_str))
    
    if not values:
        return 0
    
    cur = conn.cursor()
    try:
        psycopg2.extras.execute_values(
            cur,
            """
            UPDATE naming_classics AS nc
            SET combined_text_embedding_vec = data.vector_val
            FROM (VALUES %s) AS data(id, vector_val)
            WHERE nc.id = data.id
            """,
            values,
            template="(%s, %s::vector)"
        )
        conn.commit()
        return len(values)
    except Exception as e:
        conn.rollback()
        logger.error(f"批量转换失败 (batch size={len(values)}): {e}")
        raise
    finally:
        cur.close()


def verify_conversion(conn):
    """验证转换结果"""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(ancient_text_embedding) as with_bytea,
                COUNT(combined_text_embedding_vec) as with_vector,
                COUNT(*) FILTER (WHERE ancient_text_embedding IS NOT NULL AND combined_text_embedding_vec IS NULL) as not_converted
            FROM naming_classics
        """)
        counts = cur.fetchone()
        logger.info(f"\n转换验证:")
        logger.info(f"  总条目数: {counts[0]}")
        logger.info(f"  有 bytea 嵌入的: {counts[1]}")
        logger.info(f"  有 vector 嵌入的: {counts[2]}")
        logger.info(f"  未转换的: {counts[3]}")
        
        if counts[2] > 0:
            cur.execute("""
                SELECT id, vector_dims(combined_text_embedding_vec) 
                FROM naming_classics 
                WHERE combined_text_embedding_vec IS NOT NULL 
                LIMIT 1
            """)
            sample = cur.fetchone()
            if sample:
                logger.info(f"  样本 ID={sample[0]}, vector 维度={sample[1]}")
        
        return counts[3] == 0
    finally:
        cur.close()


def test_vector_search(conn):
    """测试向量搜索是否正常工作"""
    cur = conn.cursor()
    try:
        logger.info("\n测试向量搜索...")
        cur.execute("""
            SELECT id, book_name, ancient_text, 
                   (combined_text_embedding_vec <=> (
                       SELECT combined_text_embedding_vec 
                       FROM naming_classics 
                       WHERE combined_text_embedding_vec IS NOT NULL 
                       LIMIT 1
                   )) AS distance
            FROM naming_classics
            WHERE combined_text_embedding_vec IS NOT NULL
            ORDER BY combined_text_embedding_vec <=> (
                SELECT combined_text_embedding_vec 
                FROM naming_classics 
                WHERE combined_text_embedding_vec IS NOT NULL 
                LIMIT 1
            )
            LIMIT 5
        """)
        results = cur.fetchall()
        logger.info(f"向量搜索测试: 返回 {len(results)} 条")
        for r in results:
            logger.info(f"  ID={r[0]}, book={r[1]}, distance={r[3]:.6f}")
        logger.info("✅ 向量搜索正常工作！")
    except Exception as e:
        logger.error(f"向量搜索测试失败: {e}")
        raise
    finally:
        cur.close()


def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("bytea → vector(1024) 转换工具 (Neon 版 - 使用 ancient_text_embedding)")
    logger.info("=" * 60)
    
    conn = connect()
    
    try:
        total = get_total_count(conn)
        logger.info(f"需转换的条目数: {total}")
        
        if total == 0:
            logger.info("没有需要转换的条目，直接验证")
        else:
            logger.info(f"\n[步骤 1/2] 开始分批转换 ({total} 条，每批 {BATCH_SIZE} 条)...")
            processed = 0
            start_time = time.time()
            
            while True:
                batch = fetch_batch(conn, BATCH_SIZE)
                if not batch:
                    break
                
                count = convert_batch(conn, batch)
                if count == 0:
                    break
                processed += count
                
                elapsed = time.time() - start_time
                rate = processed / elapsed if elapsed > 0 else 0
                remaining = total - processed
                eta = remaining / rate if rate > 0 else 0
                
                logger.info(f"  进度: {processed}/{total} ({processed/total*100:.1f}%) - "
                           f"速率: {rate:.0f} 条/秒 - 预计剩余: {eta:.0f} 秒")
                
                gc.collect()
        
        # 验证
        logger.info(f"\n[步骤 2/2] 验证转换结果...")
        success = verify_conversion(conn)
        
        if success and total > 0:
            test_vector_search(conn)
        
        logger.info("\n" + "=" * 60)
        if success:
            logger.info("✅ 转换全部完成！所有 bytea 数据已成功转为 vector(1024)")
        else:
            logger.warning("⚠️  部分条目未转换，请检查日志")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"转换失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
