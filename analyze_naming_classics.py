#!/usr/bin/env python3
"""
分析 naming_classics 表中13716条记录的典籍分布
查看包含哪些典籍，各个典籍分别有多少条
"""

import psycopg2
import sys

def analyze_naming_classics_distribution():
    """分析naming_classics表中的典籍分布"""
    
    task_progress = """
- [x] 创建分析脚本
- [ ] 连接数据库
- [ ] 查询典籍分布
- [ ] 统计和显示结果
- [ ] 生成总结报告
"""
    
    try:
        print("开始分析 naming_classics 表典籍分布...")
        print("=" * 60)
        
        # 连接数据库
        print("[1/5] 连接数据库...")
        conn = psycopg2.connect(
            host='localhost',
            database='seekname_db',
            user='postgres',
            password='postgres'
        )
        cur = conn.cursor()
        print("✓ 已成功连接到数据库")
        
        task_progress = """
- [x] 创建分析脚本
- [x] 连接数据库
- [ ] 查询典籍分布
- [ ] 统计和显示结果
- [ ] 生成总结报告
"""
        
        # 检查表是否存在
        print("[2/5] 检查 naming_classics 表...")
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'naming_classics'
            )
        """)
        
        if not cur.fetchone()[0]:
            print("✗ naming_classics 表不存在")
            return False
        
        print("✓ naming_classics 表存在")
        
        # 获取总条目数
        print("[3/5] 查询典籍分布...")
        cur.execute("SELECT COUNT(*) FROM naming_classics")
        total_count = cur.fetchone()[0]
        print(f"✓ 总条目数: {total_count}")
        
        # 获取典籍分布
        cur.execute("""
            SELECT book_name, COUNT(*) as count
            FROM naming_classics
            GROUP BY book_name
            ORDER BY count DESC
        """)
        
        results = cur.fetchall()
        
        task_progress = """
- [x] 创建分析脚本
- [x] 连接数据库
- [x] 查询典籍分布
- [ ] 统计和显示结果
- [ ] 生成总结报告
"""
        
        print("[4/5] 统计和显示结果...")
        print("\n" + "=" * 60)
        print("naming_classics 表典籍分布统计")
        print("=" * 60)
        
        # 显示前20个最常出现的典籍
        print(f"\n前20个最常出现的典籍 (共 {len(results)} 种典籍):")
        print("-" * 40)
        
        accumulated_count = 0
        for i, (book_name, count) in enumerate(results[:20], 1):
            accumulated_count += count
            percentage = count / total_count * 100
            accumulated_percentage = accumulated_count / total_count * 100
            print(f"{i:2}. {book_name:15} : {count:5} 条 ({percentage:5.1f}%) | 累计: {accumulated_percentage:5.1f}%")
        
        # 显示所有典籍（如果超过20个）
        if len(results) > 20:
            print(f"\n其他典籍 (共 {len(results)-20} 种):")
            print("-" * 40)
            
            other_total = 0
            for i, (book_name, count) in enumerate(results[20:], 21):
                other_total += count
                percentage = count / total_count * 100
                print(f"{i:2}. {book_name:15} : {count:5} 条 ({percentage:5.1f}%)")
            
            print(f"其他典籍合计: {other_total} 条 ({(other_total/total_count)*100:.1f}%)")
        
        task_progress = """
- [x] 创建分析脚本
- [x] 连接数据库
- [x] 查询典籍分布
- [x] 统计和显示结果
- [ ] 生成总结报告
"""
        
        print("\n[5/5] 生成总结报告...")
        print("\n" + "=" * 60)
        print("典籍分布总结")
        print("=" * 60)
        
        # 按数量分组统计
        group_ranges = [
            (1000, "1000条以上"),
            (500, "500-999条"),
            (100, "100-499条"),
            (50, "50-99条"),
            (10, "10-49条"),
            (1, "1-9条"),
        ]
        
        group_counts = {desc: 0 for _, desc in group_ranges}
        group_books = {desc: [] for _, desc in group_ranges}
        
        for book_name, count in results:
            for threshold, desc in group_ranges:
                if count >= threshold:
                    group_counts[desc] += 1
                    group_books[desc].append((book_name, count))
                    break
        
        print("\n按数量分组统计:")
        print("-" * 40)
        
        total_books = len(results)
        for desc in group_ranges:
            desc_text = desc[1]
            if group_counts[desc_text] > 0:
                percentage = group_counts[desc_text] / total_books * 100
                print(f"{desc_text:15} : {group_counts[desc_text]:3} 种典籍 ({percentage:5.1f}%)")
        
        # 典籍类型分析
        print("\n典籍类型分析:")
        print("-" * 40)
        
        # 常见的典籍类型关键词
        category_keywords = {
            '诗经楚辞类': ['诗经', '楚辞'],
            '四书类': ['论语', '孟子', '大学', '中庸'],
            '五经类': ['周易', '尚书', '礼记', '春秋'],
            '道家经典': ['道德经', '庄子', '列子', '淮南子'],
            '诗词类': ['唐诗', '宋词', '全唐诗', '全宋词'],
            '史书类': ['史记', '汉书', '后汉书', '三国志'],
            '子书类': ['荀子', '管子', '韩非子', '墨子'],
            '其他': []
        }
        
        category_counts = {category: 0 for category in category_keywords}
        category_records = {category: 0 for category in category_keywords}
        
        for book_name, count in results:
            categorized = False
            for category, keywords in category_keywords.items():
                if category == '其他':
                    continue
                    
                for keyword in keywords:
                    if keyword in book_name:
                        category_counts[category] += 1
                        category_records[category] += count
                        categorized = True
                        break
                if categorized:
                    break
            
            if not categorized:
                category_counts['其他'] += 1
                category_records['其他'] += count
        
        for category in category_keywords:
            if category_records[category] > 0:
                record_percentage = category_records[category] / total_count * 100
                book_percentage = category_counts[category] / total_books * 100
                print(f"{category:15} : {category_counts[category]:2} 种典籍, {category_records[category]:5} 条记录 ({record_percentage:5.1f}%)")
        
        # 验证总数
        print("\n" + "=" * 60)
        print("验证统计:")
        print("-" * 40)
        
        # 重新计算总数验证
        recalc_total = 0
        for _, count in results:
            recalc_total += count
        
        if recalc_total == total_count:
            print(f"✓ 总数验证通过: {recalc_total} 条")
        else:
            print(f"✗ 总数不匹配: 计算值={recalc_total}, 查询值={total_count}")
        
        print(f"✓ 不同典籍种类: {len(results)} 种")
        
        # 最常见的5种典籍
        print(f"\n最常见的5种典籍:")
        print("-" * 40)
        top5_total = 0
        for i, (book_name, count) in enumerate(results[:5], 1):
            percentage = count / total_count * 100
            top5_total += count
            print(f"{i}. {book_name:15} : {count:5} 条 ({percentage:5.1f}%)")
        
        top5_percentage = top5_total / total_count * 100
        print(f"前5种典籍合计: {top5_total} 条 ({top5_percentage:.1f}%)")
        
        conn.close()
        
        print("\n" + "=" * 60)
        print("分析完成!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n[错误] 分析过程中出错: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    analyze_naming_classics_distribution()