#!/usr/bin/env python3
"""
分析naming_classics表中keywords字段的情况
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

def analyze_keywords(cur):
    """分析keywords字段的情况"""
    print('\n=== 各书籍关键词统计 ===')
    
    # 检查keywords字段的空值情况
    cur.execute("""
        SELECT 
            book_name,
            COUNT(*) as total,
            COUNT(CASE WHEN keywords IS NULL OR keywords = '' THEN 1 END) as empty_keywords,
            COUNT(CASE WHEN keywords IS NOT NULL AND keywords != '' THEN 1 END) as has_keywords
        FROM naming_classics 
        GROUP BY book_name
        ORDER BY book_name
    """)
    
    total_empty = 0
    total_has = 0
    total_all = 0
    
    for row in cur.fetchall():
        book, total, empty, has = row
        total_all += total
        total_empty += empty
        total_has += has
        empty_pct = (empty/total*100) if total > 0 else 0
        print(f'{book}: 总数={total}, 空关键词={empty}({empty_pct:.1f}%), 有关键词={has}')
    
    print(f'\n=== 总体统计 ===')
    print(f'总记录数: {total_all}')
    print(f'空关键词记录: {total_empty} ({(total_empty/total_all*100):.1f}%)')
    print(f'有关键词记录: {total_has} ({(total_has/total_all*100):.1f}%)')
    
    # 检查keywords字段是否被索引
    print('\n=== 关键词相关索引 ===')
    cur.execute("""
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'naming_classics' 
        AND indexdef LIKE '%keywords%'
    """)
    
    indexes = cur.fetchall()
    if indexes:
        for idx in indexes:
            print(f'索引名: {idx[0]}')
            print(f'定义: {idx[1]}')
    else:
        print('没有找到关键词相关索引')
    
    # 检查keywords字段的使用情况
    print('\n=== 关键词字段分析 ===')
    print('1. keywords字段类型: text')
    print('2. 在向量化语义搜索中，keywords字段的作用:')
    print('   - 可以作为辅助过滤条件')
    print('   - 可以提供额外的元数据信息')
    print('   - 可以用于快速分类筛选')
    print('3. 是否可以被删除:')
    print('   - 如果完全依赖向量语义匹配，keywords可能不是必需的')
    print('   - 但保留keywords可以提供更好的可解释性')
    print('   - 建议：保留但不作为主要搜索依据')

def check_vector_search_usage():
    """检查向量搜索的使用情况"""
    print('\n=== 向量搜索分析 ===')
    print('1. 当前数据库包含以下向量字段:')
    print('   - ancient_text_embedding: 古文向量')
    print('   - modern_text_embedding: 现代文向量')
    print('   - combined_text_embedding: 组合向量')
    print('2. 向量搜索原理:')
    print('   - 将用户输入转换为向量')
    print('   - 在向量空间中查找最相似的文本')
    print('   - 使用余弦相似度或欧氏距离')
    print('3. keywords在向量搜索中的作用:')
    print('   - 次要作用：可以作为后过滤条件')
    print('   - 主要搜索应依赖向量相似度')
    print('4. 建议:')
    print('   - 保留keywords字段作为元数据')
    print('   - 但不需要为其创建索引')
    print('   - 主要优化向量索引性能')

def main():
    """主函数"""
    conn, cur = connect_to_database()
    
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
        
        # 分析keywords字段
        analyze_keywords(cur)
        
        # 检查向量搜索使用情况
        check_vector_search_usage()
        
    except Exception as e:
        print(f'\n✗ 分析过程中出错: {e}')
        import traceback
        traceback.print_exc()
    
    finally:
        cur.close()
        conn.close()
        print('\n✓ 数据库连接已关闭')

if __name__ == '__main__':
    main()