#!/usr/bin/env python3
"""
检查naming_classics表结构，确认是否有向量化语义列
"""

import psycopg2

# 数据库连接URL
vercel_url = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'

def main():
    """主函数"""
    try:
        print('正在连接Vercel Postgres数据库...')
        conn = psycopg2.connect(vercel_url)
        cur = conn.cursor()
        print('✓ 连接成功')
        
        # 检查naming_classics表结构
        print('\n=== naming_classics表结构 ===')
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'naming_classics'
            ORDER BY ordinal_position
        """)
        
        columns = []
        for row in cur.fetchall():
            column_name, data_type, is_nullable = row
            columns.append(column_name)
            print(f'  {column_name}: {data_type} ({is_nullable})')
        
        # 检查是否有向量相关列
        print('\n=== 向量相关列检查 ===')
        vector_columns = []
        for column in columns:
            if 'embedding' in column.lower() or 'vector' in column.lower():
                vector_columns.append(column)
        
        if vector_columns:
            print(f'找到向量相关列: {vector_columns}')
            
            # 检查向量列的数据类型
            for column in vector_columns:
                cur.execute(f"""
                    SELECT {column} 
                    FROM naming_classics 
                    WHERE {column} IS NOT NULL
                    LIMIT 1
                """)
                result = cur.fetchone()
                if result:
                    print(f'  {column}: 有数据 (示例长度: {len(result[0]) if result[0] else 0})')
                else:
                    print(f'  {column}: 无数据')
        else:
            print('未找到向量相关列')
        
        # 检查是否有语义搜索函数
        print('\n=== 语义搜索相关函数 ===')
        cur.execute("""
            SELECT routine_name, routine_type
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND (routine_name LIKE '%similar%' OR routine_name LIKE '%search%' OR routine_name LIKE '%match%')
        """)
        
        functions = cur.fetchall()
        if functions:
            for func in functions:
                print(f'  {func[0]} ({func[1]})')
        else:
            print('  未找到语义搜索相关函数')
        
        # 检查表数据量
        print('\n=== 表数据统计 ===')
        cur.execute("SELECT COUNT(*) FROM naming_classics")
        total_count = cur.fetchone()[0]
        print(f'总记录数: {total_count}')
        
        # 检查关键词覆盖率
        cur.execute("""
            SELECT COUNT(*) 
            FROM naming_classics 
            WHERE keywords IS NOT NULL AND keywords != ''
        """)
        has_keywords_count = cur.fetchone()[0]
        coverage = (has_keywords_count / total_count * 100) if total_count > 0 else 0
        print(f'有关键词的记录: {has_keywords_count} ({coverage:.1f}%)')
        
        # 检查是否有BGE-M3相关的表或函数
        print('\n=== BGE-M3相关检查 ===')
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%bge%' OR table_name LIKE '%m3%'
        """)
        
        bge_tables = cur.fetchall()
        if bge_tables:
            print(f'BGE-M3相关表: {bge_tables}')
        else:
            print('  未找到BGE-M3相关表')
        
        cur.close()
        conn.close()
        print('\n✓ 检查完成')
        
    except Exception as e:
        print(f'✗ 错误: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()