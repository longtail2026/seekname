#!/usr/bin/env python3
"""
将 naming_classics 表中 combined_text_embedding (bytea) 数据
转换为 combined_text_embedding_vec (vector(1024)) 列

背景：
- combined_text_embedding 列被错误创建为 BYTEA 类型（当时 pgvector 未安装）
- 其中存储了 numpy float32 的二进制数据（1024 个 float = 4096 字节）
- 现在需要解析这些二进制数据并写入新的 vector(1024) 列
"""

import os
import sys
import logging
import struct
import psycopg2
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# PostgreSQL 连接配置
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "seekname_db"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
}

def connect():
    """连接数据库"""
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    return conn

def ensure_vector_column(conn):
    """确保 vector(1024) 列存在"""
    cur = conn.cursor()
    try:
        # 检查列是否存在
        cur.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'naming_classics' 
            AND column_name = 'combined_text_embedding_vec'
        """)
        if not cur.fetchone():
            logger.info("添加 combined_text_embedding_vec vector(1024) 列...")
            cur.execute("""
                ALTER TABLE naming_classics 
                ADD COLUMN combined_text_embedding_vec vector(1024)
            """)
            conn.commit()
            logger.info("列添加成功")
        else:
            logger.info("vector 列已存在")
    finally:
        cur.close()

def get_bytea_entries(conn, batch_size=100):
    """获取有 bytea 数据但没有 vector 数据的条目"""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, combined_text_embedding 
            FROM naming_classics 
            WHERE combined_text_embedding IS NOT NULL 
              AND combined_text_embedding_vec IS NULL
            ORDER BY id
            LIMIT %s
        """, (batch_size,))
        return cur.fetchall()
    finally:
        cur.close()

def get_total_count(conn):
    """获取需要转换的总条目数"""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT COUNT(*) 
            FROM naming_classics 
            WHERE combined_text_embedding IS NOT NULL 
              AND combined_text_embedding_vec IS NULL
        """)
        return cur.fetchone()[0]
    finally:
        cur.close()

def bytea_to_float32_list(bytea_data):
    """
    将 BYTEA 二进制数据解析为 float32 列表
    
    vectorize_naming_classics.py 使用 numpy.astype(np.float32).tobytes()
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
    
    # 解析 1024 个 float32
    num_floats = len(raw_bytes) // 4
    floats = list(struct.unpack(f'{num_floats}f', raw_bytes))
    
    # 验证维度
    if num_floats != 1024:
        logger.warning(f"维度异常: 期望 1024, 实际 {num_floats}")
    
    return floats

def floats_to_vector_sql(floats):
    """将 float 列表转为 PostgreSQL vector 字符串格式 '[0.1,0.2,...]'"""
    if floats is None:
        return None
    return '[' + ','.join(f'{v:.15f}' for v in floats) + ']'

def convert_batch(conn, entries):
    """转换一批条目"""
    cur = conn.cursor()
    try:
        for entry_id, bytea_data in entries:
            # 解析 bytea 为 float32 列表
            floats = bytea_to_float32_list(bytea_data)
            if floats is None:
                logger.warning(f"条目 {entry_id}: 无法解析 bytea 数据，跳过")
                continue
            
            # 转为 pgvector 格式
            vector_str = floats_to_vector_sql(floats)
            
            # 更新 vector 列
            cur.execute(
                "UPDATE naming_classics SET combined_text_embedding_vec = %s::vector WHERE id = %s",
                (vector_str, entry_id)
            )
        
        conn.commit()
        return len(entries)
    except Exception as e:
        conn.rollback()
        logger.error(f"批量转换失败: {e}")
        raise
    finally:
        cur.close()

def create_index(conn):
    """创建 HNSW 索引"""
    cur = conn.cursor()
    try:
        logger.info("创建 HNSW 索引...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_naming_classics_embedding_vec
            ON naming_classics
            USING hnsw (combined_text_embedding_vec vector_cosine_ops)
        """)
        conn.commit()
        logger.info("HNSW 索引创建成功")
    except Exception as e:
        conn.rollback()
        logger.warning(f"HNSW 索引创建失败（可能 pgvector 版本不支持），跳过: {e}")
    finally:
        cur.close()

def verify_conversion(conn):
    """验证转换结果"""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(combined_text_embedding) as with_bytea,
                COUNT(combined_text_embedding_vec) as with_vector,
                COUNT(*) FILTER (WHERE combined_text_embedding IS NOT NULL AND combined_text_embedding_vec IS NULL) as not_converted
            FROM naming_classics
        """)
        counts = cur.fetchone()
        logger.info(f"\n转换验证:")
        logger.info(f"  总条目数: {counts[0]}")
        logger.info(f"  有 bytea 嵌入的: {counts[1]}")
        logger.info(f"  有 vector 嵌入的: {counts[2]}")
        logger.info(f"  未转换的: {counts[3]}")
        
        # 验证一个样本的维度
        if counts[2] > 0:
            cur.execute("""
                SELECT id, combined_text_embedding_vec::text 
                FROM naming_classics 
                WHERE combined_text_embedding_vec IS NOT NULL 
                LIMIT 1
            """)
            sample = cur.fetchone()
            if sample:
                vec_str = sample[1]
                dims = len(vec_str.split(','))
                logger.info(f"  样本 ID={sample[0]}, vector 维度 ≈ {dims}")
        
        return counts[3] == 0  # 全部转换成功
    finally:
        cur.close()

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("bytea → vector(1024) 转换工具")
    logger.info("=" * 60)
    
    conn = connect()
    logger.info(f"已连接到数据库: {DB_CONFIG['host']}/{DB_CONFIG['dbname']}")
    
    try:
        # 1. 确保 vector 列存在
        logger.info("\n[步骤 1/5] 确保 vector 列存在...")
        ensure_vector_column(conn)
        
        # 2. 获取待处理条目数
        logger.info("\n[步骤 2/5] 计算待处理条目...")
        total = get_total_count(conn)
        logger.info(f"需转换的条目数: {total}")
        
        if total == 0:
            logger.info("没有需要转换的条目，跳过转换步骤")
            # 直接跳到验证和索引
        else:
            # 3. 分批转换
            logger.info(f"\n[步骤 3/5] 开始分批转换 ({total} 条)...")
            batch_size = 200
            processed = 0
            start_time = time.time()
            
            while True:
                entries = get_bytea_entries(conn, batch_size)
                if not entries:
                    break
                
                count = convert_batch(conn, entries)
                processed += count
                
                elapsed = time.time() - start_time
                rate = processed / elapsed if elapsed > 0 else 0
                remaining = total - processed
                eta = remaining / rate if rate > 0 else 0
                
                logger.info(f"  进度: {processed}/{total} ({processed/total*100:.1f}%) - "
                           f"速率: {rate:.0f} 条/秒 - 预计剩余: {eta:.1f} 秒")
        
        # 4. 创建 HNSW 索引
        logger.info("\n[步骤 4/5] 创建 HNSW 索引...")
        create_index(conn)
        
        # 5. 验证
        logger.info("\n[步骤 5/5] 验证转换结果...")
        success = verify_conversion(conn)
        
        logger.info("\n" + "=" * 60)
        if success:
            logger.info("✅ 转换全部完成！所有 bytea 数据已成功转为 vector(1024)")
            logger.info("   semantic-search-naming-classics.ts 已更新使用 combined_text_embedding_vec")
            logger.info("   关键词搜索兜底方案始终保持可用")
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
