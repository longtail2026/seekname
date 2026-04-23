#!/usr/bin/env python3
"""
修复naming_classics表的索引问题
"""

import psycopg2
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_naming_classics_index():
    """修复索引问题"""
    try:
        conn = psycopg2.connect(
            host='localhost',
            database='seekname_db',
            user='postgres',
            password='postgres'
        )
        cur = conn.cursor()
        
        logger.info("检查naming_classics表上的索引...")
        
        # 检查现有索引
        cur.execute("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'naming_classics'
        """)
        
        indexes = cur.fetchall()
        logger.info(f"找到 {len(indexes)} 个索引:")
        for idx_name, idx_def in indexes:
            logger.info(f"  - {idx_name}")
        
        # 删除有问题的索引
        problem_index = 'idx_naming_classics_embedding'
        cur.execute(f"DROP INDEX IF EXISTS {problem_index}")
        logger.info(f"已删除索引: {problem_index}")
        
        # 创建更合适的索引（在嵌入向量上使用表达式索引，或者先不创建）
        # BGE-M3嵌入向量是1024维的float32数组，存储为bytea
        # PostgreSQL btree索引不能处理太大的值
        # 我们可以创建一个使用嵌入向量哈希的索引，或者先不创建索引
        
        logger.info("检查表结构...")
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'naming_classics' 
            AND column_name LIKE '%embedding%'
        """)
        
        embedding_cols = cur.fetchall()
        logger.info("嵌入向量列:")
        for col_name, data_type in embedding_cols:
            logger.info(f"  - {col_name}: {data_type}")
        
        # 创建基于哈希的索引（如果需要）
        # 先不创建索引，等数据插入后再创建
        logger.info("暂不创建嵌入向量索引，等数据插入完成后再创建")
        
        # 检查表大小
        cur.execute("""
            SELECT pg_size_pretty(pg_total_relation_size('naming_classics'))
        """)
        table_size = cur.fetchone()[0]
        logger.info(f"naming_classics表当前大小: {table_size}")
        
        # 检查是否有数据
        cur.execute("SELECT COUNT(*) FROM naming_classics")
        total_count = cur.fetchone()[0]
        logger.info(f"naming_classics表总记录数: {total_count}")
        
        cur.execute("SELECT COUNT(*) FROM naming_classics WHERE combined_text_embedding IS NOT NULL")
        with_embeddings = cur.fetchone()[0]
        logger.info(f"已有嵌入向量的记录: {with_embeddings}")
        
        # 清除嵌入向量数据以便重新开始
        if with_embeddings > 0:
            logger.info("清除现有的嵌入向量数据...")
            cur.execute("""
                UPDATE naming_classics 
                SET 
                    ancient_text_embedding = NULL,
                    modern_text_embedding = NULL,
                    combined_text_embedding = NULL
            """)
        
        conn.commit()
        conn.close()
        
        logger.info("索引修复完成!")
        logger.info("建议:")
        logger.info("1. 嵌入向量列(bytea)太大，不适合创建btree索引")
        logger.info("2. 如果需要搜索，考虑使用pgvector扩展或自定义相似度函数")
        logger.info("3. 当前先不创建索引，插入数据后再评估")
        
    except Exception as e:
        logger.error(f"修复索引失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    fix_naming_classics_index()