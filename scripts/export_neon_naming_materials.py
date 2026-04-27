#!/usr/bin/env python3
"""
从 Vercel Neon 导出 naming_materials 表全部 500 条记录
输出为 CSV 格式
"""
import psycopg2
import csv
import sys
import os

NEON_URL = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'neon_naming_materials_500.csv')

def main():
    conn = psycopg2.connect(NEON_URL)
    cur = conn.cursor()

    # 先查询列名
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'naming_materials' 
        ORDER BY ordinal_position
    """)
    cols = cur.fetchall()
    print(f"表结构 ({len(cols)} 列):")
    for c in cols:
        print(f"  {c[0]:20s} {c[1]}")

    # 查询所有数据 (不包含 embedding 列，因为太大了)
    cur.execute("""
        SELECT id, phrase, source, source_snippet, meaning, 
               keywords, style, gender, wuxing, quality, combos,
               created_at::text
        FROM naming_materials 
        ORDER BY id
    """)

    rows = cur.fetchall()
    print(f"\n总记录数: {len(rows)}")

    # 输出到 CSV
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # 表头
        headers = ['id', 'phrase', 'source', 'source_snippet', 'meaning',
                   'keywords', 'style', 'gender', 'wuxing', 'quality', 'combos', 'created_at']
        writer.writerow(headers)
        
        for r in rows:
            # 处理数组字段: 将 PostgreSQL 的 {a,b,c} 格式转为可读字符串
            row_clean = []
            for val in r:
                if val is None:
                    row_clean.append('')
                elif isinstance(val, str) and val.startswith('{') and val.endswith('}'):
                    # PostgreSQL array -> comma separated
                    items = [x.strip('"') for x in val[1:-1].split(',') if x.strip()]
                    row_clean.append('; '.join(items))
                else:
                    row_clean.append(str(val))
            writer.writerow(row_clean)
        
    print(f"\nCSV 已写入: {OUTPUT_FILE}")

    # 同时在终端打印前 50 条简要信息
    print(f"\n{'='*100}")
    print(f"前 50 条记录预览:")
    print(f"{'='*100}")
    print(f"{'ID':>4} | {'phrase':<10} | {'source':<25} | {'meaning':<40} | {'gender':<6} | {'wuxing':<6} | {'quality':<3}")
    print(f"{'-'*100}")
    for i, r in enumerate(rows):
        if i >= 50:
            break
        r_id, phrase, source, snippet, meaning = r[0], r[1], r[2] or '', (r[3] or '')[:30], (r[4] or '')[:40]
        keywords, style, gender, wuxing, quality = r[5] or '', r[6] or '', r[7] or 'B', r[8] or '', r[9] or 3
        # 简化 keywords/style 显示
        kw_str = str(keywords)[:20] if isinstance(keywords, str) else '; '.join(keywords if keywords else [])[:20]
        print(f"{r_id:>4} | {phrase:<10} | {source[:25]:<25} | {meaning[:40]:<40} | {str(gender):<6} | {str(wuxing):<6} | {quality}")

    # 打印所有 500 条简约信息到另一个文件
    SIMPLE_OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'neon_naming_materials_list.txt')
    with open(SIMPLE_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(f"{'ID':>4} | phrase      | source                      | meaning                                     | gender | wuxing | quality | keywords\n")
        f.write(f"{'-'*120}\n")
        for r in rows:
            r_id, phrase, source, snippet, meaning = r[0], r[1], r[2] or '', (r[3] or '')[:30], (r[4] or '')[:40]
            keywords_raw, style, gender, wuxing, quality = r[5] or '', r[6] or '', r[7] or 'B', r[8] or '', r[9] or 3
            kw_str = str(keywords_raw)[:25] if isinstance(keywords_raw, str) else ('; '.join(keywords_raw if keywords_raw else []))[:25]
            f.write(f"{r_id:>4} | {str(phrase):<12} | {str(source)[:26]:<26} | {str(meaning)[:40]:<40} | {str(gender):<6} | {str(wuxing):<6} | {quality:<3}   | {kw_str}\n")

    print(f"\n完整列表已写入: {SIMPLE_OUTPUT}")

    cur.close()
    conn.close()

if __name__ == '__main__':
    main()