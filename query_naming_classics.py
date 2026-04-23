#!/usr/bin/env python3
"""
查询Vercel Postgres中的naming_classics表，列出唐诗和论语各10条数据
"""

import psycopg2
import sys

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
        sys.exit(1)

def check_table_exists(cur):
    """检查表是否存在"""
    cur.execute("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'naming_classics'
        )
    """)
    return cur.fetchone()[0]

def get_table_info(cur):
    """获取表信息"""
    print('\n=== 表结构 ===')
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'naming_classics' 
        ORDER BY ordinal_position
    """)
    
    columns = []
    for col_name, data_type in cur.fetchall():
        columns.append(col_name)
        print(f'  {col_name}: {data_type}')
    
    return columns

def get_book_counts(cur):
    """获取书籍分类统计"""
    print('\n=== 书籍分类统计 ===')
    cur.execute("SELECT DISTINCT book_name FROM naming_classics WHERE book_name IS NOT NULL ORDER BY book_name")
    books = [row[0] for row in cur.fetchall()]
    
    for book in books:
        cur.execute("SELECT COUNT(*) FROM naming_classics WHERE book_name = %s", (book,))
        count = cur.fetchone()[0]
        print(f'  {book}: {count}条记录')
    
    return books

def query_tang_poetry(cur, columns, limit=10):
    """查询唐诗数据"""
    print('\n=== 唐诗数据 (前10条) ===')
    cur.execute("""
        SELECT * FROM naming_classics 
        WHERE book_name = '唐诗' 
        ORDER BY original_id 
        LIMIT %s
    """, (limit,))
    
    rows = cur.fetchall()
    print(f'找到 {len(rows)} 条唐诗记录')
    
    for i, row in enumerate(rows, 1):
        print(f'\n--- 记录 {i} ---')
        for j, col in enumerate(columns):
            value = row[j]
            # 截断长文本以便显示
            if isinstance(value, str) and len(value) > 100:
                value = value[:100] + '...'
            print(f'  {col}: {value}')
    
    return rows

def query_analects(cur, columns, limit=10):
    """查询论语数据"""
    print('\n=== 论语数据 (前10条) ===')
    cur.execute("""
        SELECT * FROM naming_classics 
        WHERE book_name = '论语' 
        ORDER BY original_id 
        LIMIT %s
    """, (limit,))
    
    rows = cur.fetchall()
    print(f'找到 {len(rows)} 条论语记录')
    
    for i, row in enumerate(rows, 1):
        print(f'\n--- 记录 {i} ---')
        for j, col in enumerate(columns):
            value = row[j]
            # 截断长文本以便显示
            if isinstance(value, str) and len(value) > 100:
                value = value[:100] + '...'
            print(f'  {col}: {value}')
    
    return rows

def main():
    """主函数"""
    conn, cur = connect_to_database()
    
    try:
        # 检查表是否存在
        if not check_table_exists(cur):
            print('✗ naming_classics表不存在')
            return
        
        print('✓ naming_classics表存在')
        
        # 获取总记录数
        cur.execute('SELECT COUNT(*) FROM naming_classics')
        total_count = cur.fetchone()[0]
        print(f'\n总记录数: {total_count}')
        
        # 获取表结构
        columns = get_table_info(cur)
        
        # 获取书籍分类
        books = get_book_counts(cur)
        
        # 检查是否有唐诗和论语
        if '唐诗' in books:
            query_tang_poetry(cur, columns)
        else:
            print('\n✗ 未找到唐诗数据')
        
        if '论语' in books:
            query_analects(cur, columns)
        else:
            print('\n✗ 未找到论语数据')
        
        # 如果没有找到唐诗或论语，显示其他书籍的样本
        if '唐诗' not in books or '论语' not in books:
            print('\n=== 其他书籍样本 (前5条) ===')
            for book in books:
                if book not in ['唐诗', '论语']:
                    cur.execute("""
                        SELECT * FROM naming_classics 
                        WHERE book_name = %s 
                        ORDER BY original_id 
                        LIMIT 5
                    """, (book,))
                    
                    rows = cur.fetchall()
                    if rows:
                        print(f'\n{book} (前{len(rows)}条):')
                        for i, row in enumerate(rows, 1):
                            # 只显示关键字段
                            row_dict = dict(zip(columns, row))
                            print(f'  {i}. {row_dict.get("ancient_text", "")[:50]}...')
        
    except Exception as e:
        print(f'\n✗ 查询过程中出错: {e}')
        import traceback
        traceback.print_exc()
    
    finally:
        cur.close()
        conn.close()
        print('\n✓ 数据库连接已关闭')

if __name__ == '__main__':
    main()