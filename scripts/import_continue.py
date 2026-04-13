#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""继续导入剩余数据"""

import psycopg2
import time

NEON_CONFIG = {
    'host': 'ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech',
    'database': 'neondb',
    'user': 'neondb_owner',
    'password': 'npg_2WiMHoA4RdTQ',
    'sslmode': 'require',
    'connect_timeout': 30
}

LOCAL_CONFIG = {
    'host': 'localhost',
    'database': 'seekname_db',
    'user': 'postgres',
    'password': 'postgres'
}

BATCH_SIZE = 100

def get_neon_count(table):
    for retry in range(3):
        try:
            conn = psycopg2.connect(**NEON_CONFIG)
            cur = conn.cursor()
            cur.execute(f'SELECT COUNT(*) FROM {table}')
            count = cur.fetchone()[0]
            cur.close()
            conn.close()
            return count
        except:
            time.sleep(2)
    return 0

def get_local_data(table, offset, limit):
    conn = psycopg2.connect(**LOCAL_CONFIG)
    cur = conn.cursor()
    cur.execute(f'SELECT * FROM {table} ORDER BY id LIMIT %s OFFSET %s', (limit, offset))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

def get_columns(table):
    conn = psycopg2.connect(**LOCAL_CONFIG)
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = %s AND table_schema = 'public'
        ORDER BY ordinal_position
    """, (table,))
    columns = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return columns

def insert_batch(table, columns, rows):
    placeholders = ', '.join(['%s'] * len(columns))
    columns_str = ', '.join(columns)
    sql = f'INSERT INTO {table} ({columns_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
    
    for retry in range(3):
        conn = None
        try:
            conn = psycopg2.connect(**NEON_CONFIG)
            cur = conn.cursor()
            cur.executemany(sql, rows)
            conn.commit()
            cur.close()
            conn.close()
            return len(rows)
        except Exception as e:
            if conn:
                try:
                    conn.rollback()
                    conn.close()
                except:
                    pass
            time.sleep(3)
    return 0

def import_table(table, target):
    print(f"\n[{table}] 开始导入...")
    
    current = get_neon_count(table)
    print(f"  当前: {current}, 目标: {target}")
    
    if current >= target:
        print(f"  已完成!")
        return
    
    columns = get_columns(table)
    inserted_total = 0
    batch_num = 0
    
    while current < target:
        batch_num += 1
        limit = min(BATCH_SIZE, target - current)
        offset = current  # 从当前数量开始读取
        
        rows = get_local_data(table, offset, limit)
        if not rows:
            break
        
        inserted = insert_batch(table, columns, rows)
        inserted_total += inserted
        current += inserted
        
        percent = round((current / target) * 100, 1)
        print(f"  批次 {batch_num}: {current}/{target} ({percent}%)")
        
        if batch_num % 50 == 0:
            actual = get_neon_count(table)
            print(f"    -> 验证计数: {actual}")
        
        time.sleep(0.05)
    
    final = get_neon_count(table)
    print(f"[{table}] 完成! 最终: {final}/{target}")

def main():
    print("=" * 50)
    print("  继续导入剩余数据")
    print("=" * 50)
    
    # 继续导入剩余数据
    tasks = [
        ("classics_entries", 124120),  # 还需约 51,444 条
        ("name_samples", 88431),       # 还需约 21,431 条
        ("sensitive_words", 87042)     # 全部 87,042 条
    ]
    
    for table, target in tasks:
        import_table(table, target)
    
    print("\n" + "=" * 50)
    print("  导入完成!")
    print("=" * 50)
    
    # 最终统计
    print("\n最终数据量:")
    for table, target in tasks:
        actual = get_neon_count(table)
        status = "✅" if actual >= target else "⚠️"
        print(f"  {table}: {actual}/{target} {status}")

if __name__ == "__main__":
    main()
