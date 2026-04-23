import psycopg2

def check_database_tables():
    try:
        conn = psycopg2.connect(
            host='localhost',
            database='seekname_db',
            user='postgres',
            password='postgres'
        )
        cur = conn.cursor()
        
        # 检查所有表
        cur.execute("""
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        tables = cur.fetchall()
        
        print('数据库表列表:')
        for table_name, table_type in tables:
            print(f'  - {table_name} ({table_type})')
        
        # 特别检查classics_entries表
        if any('classics_entries' in table[0] for table in tables):
            cur.execute("""
                SELECT COUNT(*) as total_count,
                       COUNT(DISTINCT book_name) as book_count,
                       MIN(id) as min_id,
                       MAX(id) as max_id
                FROM classics_entries
            """)
            stats = cur.fetchone()
            print(f'\nclassics_entries表统计:')
            print(f'  总条目数: {stats[0]}')
            print(f'  不同典籍数: {stats[1]}')
            print(f'  ID范围: {stats[2]} - {stats[3]}')
            
            # 检查最常出现的典籍
            cur.execute("""
                SELECT book_name, COUNT(*) as count
                FROM classics_entries
                GROUP BY book_name
                ORDER BY count DESC
                LIMIT 10
            """)
            print(f'\n最常出现的典籍 (前10):')
            for book_name, count in cur.fetchall():
                print(f'  - {book_name}: {count} 条')
        
        conn.close()
        return True
        
    except Exception as e:
        print(f'错误: {e}')
        return False

if __name__ == '__main__':
    check_database_tables()