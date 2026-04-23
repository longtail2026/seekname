#!/usr/bin/env python3
"""
创建naming_classics表 - 只包含常用起名典籍的精简表
"""

import psycopg2
import sys
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_naming_classics_table():
    """创建naming_classics表并导入常用典籍数据"""
    
    try:
        conn = psycopg2.connect(
            host='localhost',
            database='seekname_db',
            user='postgres',
            password='postgres'
        )
        cur = conn.cursor()
        
        logger.info("检查naming_classics表是否存在...")
        
        # 检查表是否存在
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'naming_classics'
            )
        """)
        table_exists = cur.fetchone()[0]
        
        if table_exists:
            logger.info("naming_classics表已存在，删除重建...")
            cur.execute("DROP TABLE naming_classics CASCADE")
            conn.commit()
        
        # 创建naming_classics表（根据实际表结构）
        logger.info("创建naming_classics表...")
        cur.execute("""
            CREATE TABLE naming_classics (
                id SERIAL PRIMARY KEY,
                original_id INTEGER REFERENCES classics_entries(id),
                book_name VARCHAR(100),
                chapter_name VARCHAR(200),
                ancient_text TEXT NOT NULL,
                modern_text TEXT,
                keywords TEXT,
                -- 嵌入向量字段
                ancient_text_embedding BYTEA,
                modern_text_embedding BYTEA,
                combined_text_embedding BYTEA,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 创建索引
        cur.execute("CREATE INDEX idx_naming_classics_book ON naming_classics(book_name)")
        cur.execute("CREATE INDEX idx_naming_classics_embedding ON naming_classics(combined_text_embedding)")
        
        # 定义常用起名典籍（根据中国传统起名文化）
        common_naming_books = [
            '论语',      # 儒家经典，常用于起名
            '诗经',      # 诗歌经典，很多名字来源于此
            '楚辞',      # 浪漫主义诗歌，常用作名字
            '礼记',      # 儒家经典，礼仪文化
            '周易',      # 易经，哲学和占卜
            '尚书',      # 历史文献
            '道德经',    # 道家经典
            '孟子',      # 儒家经典
            '庄子',      # 道家哲学
            # 添加诗词类（如果数据库中有）
            '唐诗三百首', # 经典诗歌
            '宋词三百首'  # 经典词作
        ]
        
        # 查看数据库中实际有哪些常用典籍
        cur.execute("""
            SELECT DISTINCT book_name 
            FROM classics_entries 
            WHERE book_name IN %s
        """, (tuple(common_naming_books),))
        
        available_books = [row[0] for row in cur.fetchall()]
        logger.info(f"数据库中可用的常用典籍: {available_books}")
        
        if not available_books:
            logger.warning("数据库中没有常用典籍，将使用所有典籍作为备选")
            # 如果数据库中缺少常用典籍，使用前10个最多的典籍
            cur.execute("""
                SELECT book_name, COUNT(*) as count
                FROM classics_entries
                GROUP BY book_name
                ORDER BY count DESC
                LIMIT 10
            """)
            top_books = cur.fetchall()
            available_books = [book[0] for book in top_books]
            logger.info(f"使用最多的典籍作为备选: {available_books}")
        
        # 插入数据到naming_classics表
        logger.info(f"从classics_entries表中提取常用典籍数据...")
        
        # 先获取总条数
        cur.execute("""
            SELECT COUNT(*) 
            FROM classics_entries 
            WHERE book_name IN %s
        """, (tuple(available_books),))
        
        total_count = cur.fetchone()[0]
        logger.info(f"需要导入的总条数: {total_count}")
        
        # 批量导入数据
        logger.info("开始导入数据...")
        
        # 使用INSERT INTO ... SELECT 语句（修正版，匹配实际表结构）
        cur.execute("""
            INSERT INTO naming_classics (
                original_id, book_name, chapter_name, keywords, ancient_text, modern_text
            )
            SELECT 
                id, book_name, chapter_name, keywords, ancient_text, modern_text
            FROM classics_entries 
            WHERE book_name IN %s
            ORDER BY id
        """, (tuple(available_books),))
        
        conn.commit()
        
        # 验证导入结果
        cur.execute("SELECT COUNT(*) FROM naming_classics")
        imported_count = cur.fetchone()[0]
        
        cur.execute("""
            SELECT book_name, COUNT(*) as count
            FROM naming_classics
            GROUP BY book_name
            ORDER BY count DESC
        """)
        
        books_summary = cur.fetchall()
        
        logger.info("=" * 50)
        logger.info("naming_classics表创建完成!")
        logger.info(f"总导入条数: {imported_count}")
        logger.info("\n各典籍统计:")
        
        for book_name, count in books_summary:
            percentage = count / imported_count * 100
            logger.info(f"  {book_name:15} : {count:6} 条 ({percentage:.1f}%)")
        
        logger.info("=" * 50)
        
        # 检查表大小
        cur.execute("""
            SELECT pg_size_pretty(pg_total_relation_size('naming_classics'))
        """)
        table_size = cur.fetchone()[0]
        logger.info(f"表大小: {table_size}")
        
        # 与原表对比
        cur.execute("SELECT COUNT(*) FROM classics_entries")
        original_count = cur.fetchone()[0]
        
        reduction_percentage = (original_count - imported_count) / original_count * 100
        logger.info(f"\n精简比例: {reduction_percentage:.1f}%")
        logger.info(f"原表: {original_count} 条")
        logger.info(f"精简表: {imported_count} 条")
        
        conn.close()
        logger.info("完成!")
        
        return imported_count
        
    except Exception as e:
        logger.error(f"创建naming_classics表失败: {e}")
        import traceback
        traceback.print_exc()
        return 0

if __name__ == '__main__':
    create_naming_classics_table()