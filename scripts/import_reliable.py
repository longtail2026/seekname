#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""数据库导入脚本 - 可靠版本，使用Python直接操作数据库"""

import psycopg2
import time
import sys

# Neon 数据库连接
NEON_CONFIG = {
    'host': 'ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech',
    'database': 'neondb',
    'user': 'neondb_owner',
    'password': 'npg_2WiMHoA4RdTQ',
    'sslmode': 'require',
    'connect_timeout': 30
}

# 本地数据库连接
LOCAL_CONFIG = {
    'host': 'localhost',
    'database': 'seekname_db',
    'user': 'postgres',
    'password': 'postgres'
}

BATCH_SIZE = 200

def get_count(conn_config, table):
    """获取表的数据量"""
    try:
        conn = psycopg2.connect(**conn_config)
        cur = conn.cursor()
        cur.execute(f'SELECT COUNT(*) FROM {table}')
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return count
    except Exception as e:
        print(f"  查询错误: {e}")
        return 0

def get_columns(conn_config, table):
    """获取表的列名"""
    conn = psycopg2.connect(**conn_config)
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

def import_table_data(table, start_offset, target_count):
    """导入单表数据"""
    print(f"\n[{table}] 开始导入...")
    
    # 连接本地数据库读取数据
    local_conn = psycopg2.connect(**LOCAL_CONFIG)
    local_cur = local_conn.cursor()
    
    # 连接Neon数据库写入数据
    neon_conn = psycopg2.connect(**NEON_CONFIG)
    neon_cur = neon_conn.cursor()
    
    # 获取列名
    columns = get_columns(LOCAL_CONFIG, table)
    columns_str = ', '.join(columns)
    placeholders = ', '.join(['%s'] * len(columns))
    
    # 获取当前Neon中的数量
    neon_cur.execute(f'SELECT COUNT(*) FROM {table}')
    current_count = neon_cur.fetchone()[0]
    
    if current_count >= target_count:
        print(f"  已完成 ({current_count}/{target_count})")
        local_cur.close()
        neon_cur.close()
        local_conn.close()
        neon_conn.close()
        return
    
    # 从本地读取数据
    local_cur.execute(f'SELECT {columns_str} FROM {table} ORDER BY id LIMIT %s OFFSET %s', 
                      (target_count - start_offset, start_offset))
    
    rows = local_cur.fetchall()
    total_rows = len(rows)
    
    print(f"  从本地读取了 {total_rows} 条记录，当前Neon有 {current_count} 条")
    
    # 分批插入
    inserted = 0
    batch_num = 0
    total_batches = (total_rows + BATCH_SIZE - 1) // BATCH_SIZE
    
    for i in range(0, total_rows, BATCH_SIZE):
        batch_num += 1
        batch = rows[i:i+BATCH_SIZE]
        
        try:
            # 使用ON CONFLICT DO NOTHING跳过已存在的记录
            neon_cur.executemany(
                f'INSERT INTO {table} ({columns_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING',
                batch
            )
            neon_conn.commit()
            inserted += len(batch)
            
            percent = round((inserted / total_rows) * 100, 1)
            print(f"  批次 {batch_num}/{total_batches}: {inserted}/{total_rows} ({percent}%)")
            
            # 每10批次显示一次实际计数
            if batch_num % 10 == 0:
                neon_cur.execute(f'SELECT COUNT(*) FROM {table}')
                actual = neon_cur.fetchone()[0]
                print(f"    -> Neon实际计数: {actual}")
            
        except Exception as e:
            print(f"  批次 {batch_num} 错误: {e}")
            neon_conn.rollback()
            continue
        
        # 小延迟避免过载
        time.sleep(0.05)
    
    # 最终统计
    neon_cur.execute(f'SELECT COUNT(*) FROM {table}')
    final_count = neon_cur.fetchone()[0]
    print(f"[{table}] 完成! 最终数量: {final_count}/{target_count}")
    
    local_cur.close()
    neon_cur.close()
    local_conn.close()
    neon_conn.close()

def main():
    print("=" * 50)
    print("  数据库导入开始 - 可靠版本")
    print("=" * 50)
    
    # 定义导入任务 (表名, 起始offset, 目标数量)
    tasks = [
        ("classics_entries", 22113, 124120),
        ("name_samples", 7500, 88431),
        ("sensitive_words", 0, 87042)
    ]
    
    for table, start_offset, target in tasks:
        import_table_data(table, start_offset, target)
    
    print("\n" + "=" * 50)
    print("  所有导入任务完成!")
    print("=" * 50)
    
    # 最终统计
    print("\n最终数据量统计:")
    conn = psycopg2.connect(**NEON_CONFIG)
    cur = conn.cursor()
    tables = ['classics_books', 'wuxing_characters', 'kangxi_dict', 
              'classics_entries', 'name_samples', 'sensitive_words']
    for table in tables:
        cur.execute(f'SELECT COUNT(*) FROM {table}')
        count = cur.fetchone()[0]
        print(f"  {table}: {count}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
