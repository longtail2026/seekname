#!/usr/bin/env python3
"""
查询Vercel Postgres中naming_classics表的唐诗和论语数据各10条
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

def query_tangshi_data(cur):
    """查询唐诗数据"""
    print('\n' + '='*60)
    print('唐诗数据 (10条)')
    print('='*60)
    
    try:
        cur.execute("""
            SELECT id, book_name, chapter_name, 
                   SUBSTRING(ancient_text FROM 1 FOR 100) as ancient_text_preview,
                   SUBSTRING(modern_text FROM 1 FOR 100) as modern_text_preview,
                   keywords
            FROM naming_classics 
            WHERE book_name = '唐诗'
            ORDER BY id
            LIMIT 10
        """)
        
        rows = cur.fetchall()
        
        if not rows:
            print('没有找到唐诗数据')
            return
        
        for i, row in enumerate(rows, 1):
            id_val, book_name, chapter_name, ancient_preview, modern_preview, keywords = row
            print(f'\n记录 #{i}:')
            print(f'  ID: {id_val}')
            print(f'  书名: {book_name}')
            print(f'  篇章名: {chapter_name}')
            print(f'  原文预览: {ancient_preview}')
            print(f'  现代文预览: {modern_preview}')
            print(f'  关键词: {keywords}')
            print('  ' + '-'*40)
            
    except Exception as e:
        print(f'查询唐诗数据失败: {e}')

def query_lunyu_data(cur):
    """查询论语数据"""
    print('\n' + '='*60)
    print('论语数据 (10条)')
    print('='*60)
    
    try:
        cur.execute("""
            SELECT id, book_name, chapter_name, 
                   SUBSTRING(ancient_text FROM 1 FOR 100) as ancient_text_preview,
                   SUBSTRING(modern_text FROM 1 FOR 100) as modern_text_preview,
                   keywords
            FROM naming_classics 
            WHERE book_name = '论语'
            ORDER BY id
            LIMIT 10
        """)
        
        rows = cur.fetchall()
        
        if not rows:
            print('没有找到论语数据')
            return
        
        for i, row in enumerate(rows, 1):
            id_val, book_name, chapter_name, ancient_preview, modern_preview, keywords = row
            print(f'\n记录 #{i}:')
            print(f'  ID: {id_val}')
            print(f'  书名: {book_name}')
            print(f'  篇章名: {chapter_name}')
            print(f'  原文预览: {ancient_preview}')
            print(f'  现代文预览: {modern_preview}')
            print(f'  关键词: {keywords}')
            print('  ' + '-'*40)
            
    except Exception as e:
        print(f'查询论语数据失败: {e}')

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
        
        # 查询唐诗数据
        query_tangshi_data(cur)
        
        # 查询论语数据
        query_lunyu_data(cur)
        
        # 统计信息
        print('\n' + '='*60)
        print('数据统计')
        print('='*60)
        
        # 唐诗总数
        cur.execute("SELECT COUNT(*) FROM naming_classics WHERE book_name = '唐诗'")
        tangshi_count = cur.fetchone()[0]
        print(f'唐诗总记录数: {tangshi_count}')
        
        # 论语总数
        cur.execute("SELECT COUNT(*) FROM naming_classics WHERE book_name = '论语'")
        lunyu_count = cur.fetchone()[0]
        print(f'论语总记录数: {lunyu_count}')
        
        # 关键词统计
        cur.execute("""
            SELECT 
                book_name,
                COUNT(*) as total,
                COUNT(CASE WHEN keywords IS NOT NULL AND keywords != '' THEN 1 END) as has_keywords,
                COUNT(CASE WHEN keywords IS NULL OR keywords = '' THEN 1 END) as empty_keywords
            FROM naming_classics 
            WHERE book_name IN ('唐诗', '论语')
            GROUP BY book_name
            ORDER BY book_name
        """)
        
        print('\n关键词统计:')
        for row in cur.fetchall():
            book_name, total, has_keywords, empty_keywords = row
            coverage = (has_keywords / total * 100) if total > 0 else 0
            print(f'  {book_name}: {has_keywords}/{total} ({coverage:.1f}%)')
        
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