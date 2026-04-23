#!/usr/bin/env python3
"""
检查孟子、尚书、庄子、礼记、论语等书籍的关键词补充效果
各列举一个示例展示关键词补充后的效果
"""

import psycopg2

# 数据库连接URL
vercel_url = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'

def connect_to_database():
    """连接到数据库"""
    try:
        print('正在连接Vercel Postgres数据库...')
        conn = psycopg2.connect(vercel_url)
        cur = conn.cursor()
        print('✓ 连接成功')
        return conn, cur
    except Exception as e:
        print(f'✗ 连接失败: {e}')
        return None, None

def query_book_example(cur, book_name):
    """查询指定书籍的一个示例"""
    print(f'\n' + '='*60)
    print(f'{book_name}数据示例')
    print('='*60)
    
    try:
        cur.execute("""
            SELECT id, book_name, chapter_name, 
                   SUBSTRING(ancient_text FROM 1 FOR 150) as ancient_text_preview,
                   SUBSTRING(modern_text FROM 1 FOR 150) as modern_text_preview,
                   keywords
            FROM naming_classics 
            WHERE book_name = %s
            AND keywords IS NOT NULL 
            AND keywords != ''
            ORDER BY id
            LIMIT 1
        """, (book_name,))
        
        row = cur.fetchone()
        
        if not row:
            # 如果没有关键词，查询一个无关键词的示例
            cur.execute("""
                SELECT id, book_name, chapter_name, 
                       SUBSTRING(ancient_text FROM 1 FOR 150) as ancient_text_preview,
                       SUBSTRING(modern_text FROM 1 FOR 150) as modern_text_preview,
                       keywords
                FROM naming_classics 
                WHERE book_name = %s
                ORDER BY id
                LIMIT 1
            """, (book_name,))
            row = cur.fetchone()
            
            if not row:
                print(f'  没有找到{book_name}的数据')
                return
        
        id_val, book_name, chapter_name, ancient_preview, modern_preview, keywords = row
        
        print(f'  ID: {id_val}')
        print(f'  书名: {book_name}')
        print(f'  篇章名: {chapter_name}')
        print(f'  原文预览: {ancient_preview}')
        print(f'  现代文预览: {modern_preview}')
        
        if keywords:
            print(f'  关键词: {keywords}')
            # 显示关键词列表
            keyword_list = keywords.split(',')
            print(f'  关键词列表 ({len(keyword_list)}个):')
            for i, keyword in enumerate(keyword_list[:10], 1):  # 最多显示10个
                print(f'    {i}. {keyword.strip()}')
            if len(keyword_list) > 10:
                print(f'    ... 还有{len(keyword_list)-10}个关键词')
        else:
            print(f'  关键词: None (未补充)')
            
    except Exception as e:
        print(f'查询{book_name}数据失败: {e}')

def check_keywords_coverage(cur):
    """检查关键词覆盖率"""
    print('\n' + '='*60)
    print('关键词覆盖率统计')
    print('='*60)
    
    books_to_check = ['孟子', '尚书', '庄子', '礼记', '论语']
    
    try:
        # 使用IN子句一次性查询所有书籍
        placeholders = ','.join(['%s'] * len(books_to_check))
        query = f"""
            SELECT 
                book_name,
                COUNT(*) as total,
                COUNT(CASE WHEN keywords IS NOT NULL AND keywords != '' THEN 1 END) as has_keywords,
                COUNT(CASE WHEN keywords IS NULL OR keywords = '' THEN 1 END) as empty_keywords
            FROM naming_classics 
            WHERE book_name IN ({placeholders})
            GROUP BY book_name
            ORDER BY book_name
        """
        
        cur.execute(query, books_to_check)
        
        print(f'{"书名":<10} {"总数":<8} {"有关键词":<10} {"无关键词":<10} {"覆盖率":<10}')
        print('-'*60)
        
        for row in cur.fetchall():
            book_name, total, has_keywords, empty_keywords = row
            coverage = (has_keywords / total * 100) if total > 0 else 0
            print(f'{book_name:<10} {total:<8} {has_keywords:<10} {empty_keywords:<10} {coverage:.1f}%')
            
    except Exception as e:
        print(f'查询关键词覆盖率失败: {e}')

def main():
    """主函数"""
    conn, cur = connect_to_database()
    
    if not conn or not cur:
        return
    
    try:
        # 检查表是否存在
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'naming_classics'
            )
        """)
        
        if not cur.fetchone()[0]:
            print('✗ naming_classics表不存在')
            return
        
        # 查询各书籍示例
        books_to_check = ['孟子', '尚书', '庄子', '礼记', '论语']
        
        for book_name in books_to_check:
            query_book_example(cur, book_name)
        
        # 检查关键词覆盖率
        check_keywords_coverage(cur)
        
        # 总体统计
        print('\n' + '='*60)
        print('总体统计')
        print('='*60)
        
        cur.execute("SELECT COUNT(*) FROM naming_classics")
        total_count = cur.fetchone()[0]
        print(f'总记录数: {total_count}')
        
        cur.execute("""
            SELECT COUNT(*) 
            FROM naming_classics 
            WHERE keywords IS NOT NULL AND keywords != ''
        """)
        has_keywords_count = cur.fetchone()[0]
        coverage = (has_keywords_count / total_count * 100) if total_count > 0 else 0
        print(f'有关键词的记录: {has_keywords_count} ({coverage:.1f}%)')
        
    except Exception as e:
        print(f'\n✗ 处理过程中出错: {e}')
        import traceback
        traceback.print_exc()
    
    finally:
        cur.close()
        conn.close()
        print('\n✓ 数据库连接已关闭')

if __name__ == '__main__':
    main()