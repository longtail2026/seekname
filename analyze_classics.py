import psycopg2
import sys

def analyze_classics_distribution():
    try:
        conn = psycopg2.connect(
            host='localhost',
            database='seekname_db',
            user='postgres',
            password='postgres'
        )
        cur = conn.cursor()
        
        # 获取所有典籍及其统计
        cur.execute("""
            SELECT book_name, COUNT(*) as count
            FROM classics_entries
            GROUP BY book_name
            ORDER BY count DESC
        """)
        all_books = cur.fetchall()
        
        print('所有典籍统计 (共25种):')
        print('=' * 50)
        total_records = 0
        for book_name, count in all_books:
            total_records += count
            print(f'{book_name:15} : {count:6} 条 ({count/total_records*100:.1f}%)')
        
        print(f'\n总条目数: {total_records}')
        
        # 判断哪些是起名常用典籍
        print('\n=== 起名常用典籍判断 ===')
        
        # 常见起名典籍 (根据中国传统文化)
        naming_common_books = [
            '论语', '诗经', '楚辞', '周易', '尚书', '礼记', 
            '唐诗三百首', '宋词三百首', '道德经', '孟子', '庄子'
        ]
        
        # 实际数据库中的典籍
        actual_books = [book[0] for book in all_books]
        
        print('常用典籍检查:')
        for book in naming_common_books:
            if book in actual_books:
                cur.execute("SELECT COUNT(*) FROM classics_entries WHERE book_name = %s", (book,))
                count = cur.fetchone()[0]
                print(f'  ✓ {book}: {count} 条')
            else:
                print(f'  ✗ {book}: 数据库中不存在')
        
        # 当前数据库中的典籍分析
        print('\n=== 当前数据库典籍分类 ===')
        
        # 分类
        categories = {
            '四书五经类': ['论语', '诗经', '礼记', '周易', '尚书'],
            '诗词类': ['唐诗三百首', '宋词三百首'],
            '哲学类': ['道德经', '庄子', '孟子', '管子', '韩非子'],
            '历史类': ['史记', '三国志', '左传', '吕氏春秋', '世说新语'],
            '其他': []
        }
        
        # 将当前数据库典籍分类
        for book_name, count in all_books:
            categorized = False
            for category, books in categories.items():
                if book_name in books:
                    categorized = True
                    break
            
            if not categorized:
                categories['其他'].append(book_name)
        
        # 显示分类统计
        total_without_other = 0
        for category, books in categories.items():
            if category == '其他':
                continue
                
            category_count = 0
            for book in books:
                if book in actual_books:
                    cur.execute("SELECT COUNT(*) FROM classics_entries WHERE book_name = %s", (book,))
                    book_count = cur.fetchone()[0]
                    category_count += book_count
            
            if category_count > 0:
                percentage = category_count / total_records * 100
                print(f'{category:10} : {category_count:6} 条 ({percentage:.1f}%)')
                total_without_other += category_count
        
        other_count = total_records - total_without_other
        other_percentage = other_count / total_records * 100
        print(f'{"其他":10} : {other_count:6} 条 ({other_percentage:.1f}%)')
        
        # 推荐用于向量化的典籍
        print('\n=== 向量化导入推荐方案 ===')
        print('建议只导入以下常用起名典籍:')
        recommended_books = ['论语', '诗经', '楚辞', '周易', '礼记', '道德经', '孟子', '庄子']
        
        total_recommended = 0
        for book in recommended_books:
            if book in actual_books:
                cur.execute("SELECT COUNT(*) FROM classics_entries WHERE book_name = %s", (book,))
                count = cur.fetchone()[0]
                print(f'  - {book}: {count} 条')
                total_recommended += count
        
        print(f'\n推荐导入总数: {total_recommended} 条')
        print(f'节省比例: {(total_records - total_recommended) / total_records * 100:.1f}%')
        
        # 检查是否有naming_classics表
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'naming_classics'
            )
        """)
        has_naming_classics = cur.fetchone()[0]
        
        if has_naming_classics:
            print('\n✓ 发现 naming_classics 表 (已精简的核心典籍)')
            cur.execute("SELECT COUNT(*) FROM naming_classics")
            naming_count = cur.fetchone()[0]
            print(f'  naming_classics表有 {naming_count} 条记录')
        else:
            print('\n✗ 未发现 naming_classics 表')
            print('  可以创建一个只包含常用典籍的精简表')
        
        conn.close()
        
    except Exception as e:
        print(f'错误: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    analyze_classics_distribution()