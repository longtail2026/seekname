#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""数据库导入脚本 - 带进度反馈"""

import subprocess
import time
import sys

NEON_CONN = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
LOCAL_CONN = "postgresql://postgres:postgres@localhost:5432/seekname_db"
BATCH_SIZE = 300

def get_neon_count(table):
    """获取Neon数据库中的数据量"""
    try:
        result = subprocess.run(
            ['psql', NEON_CONN, '-t', '-c', f'SELECT COUNT(*) FROM {table};'],
            capture_output=True, text=True, timeout=30
        )
        return int(result.stdout.strip())
    except:
        return 0

def get_local_count(table):
    """获取本地数据库中的数据量"""
    try:
        result = subprocess.run(
            ['psql', LOCAL_CONN, '-t', '-c', f'SELECT COUNT(*) FROM {table};'],
            capture_output=True, text=True, timeout=30
        )
        return int(result.stdout.strip())
    except:
        return 0

def import_batch(table, offset, limit):
    """导入一批数据"""
    # 使用pg_dump导出特定批次并直接导入
    where_clause = f"ctid IN (SELECT ctid FROM {table} ORDER BY id LIMIT {limit} OFFSET {offset})"
    
    pg_dump_cmd = [
        'pg_dump', '-h', 'localhost', '-U', 'postgres', 
        '-d', 'seekname_db', '--data-only', '--inserts', 
        '--no-owner', '--no-privileges', '-t', table,
        '--where', where_clause
    ]
    
    try:
        # 执行pg_dump并管道到psql
        dump_process = subprocess.Popen(
            pg_dump_cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL
        )
        psql_process = subprocess.Popen(
            ['psql', NEON_CONN],
            stdin=dump_process.stdout, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        dump_process.stdout.close()
        psql_process.wait(timeout=60)
        return psql_process.returncode == 0
    except Exception as e:
        print(f"    错误: {e}")
        return False

def main():
    print("=" * 50)
    print("  数据库导入开始")
    print("=" * 50)
    print()
    
    # 定义导入任务
    tasks = [
        {"table": "classics_entries", "current": 22113, "target": 124120},
        {"table": "name_samples", "current": 7500, "target": 88431},
        {"table": "sensitive_words", "current": 0, "target": 87042}
    ]
    
    for task in tasks:
        table = task["table"]
        current = task["current"]
        target = task["target"]
        remaining = target - current
        
        if remaining <= 0:
            print(f"[{table}] 已完成 ({target}/{target})")
            continue
        
        print(f"[{table}] 开始导入... 当前: {current}, 目标: {target}, 剩余: {remaining}")
        
        batch_num = 0
        total_batches = (remaining + BATCH_SIZE - 1) // BATCH_SIZE
        
        while current < target:
            batch_num += 1
            offset = task["current"] + (batch_num - 1) * BATCH_SIZE
            limit = min(BATCH_SIZE, target - current)
            
            success = import_batch(table, offset, limit)
            
            if success:
                current += limit
                percent = round((current / target) * 100, 1)
                print(f"  批次 {batch_num}/{total_batches} : {current} / {target} ({percent}%)")
                
                # 每10批次显示一次实际数据库计数
                if batch_num % 10 == 0:
                    actual = get_neon_count(table)
                    print(f"    -> 数据库实际计数: {actual}")
            else:
                print(f"  批次 {batch_num} 失败，重试...")
                time.sleep(1)
                continue
            
            # 小延迟避免过载
            time.sleep(0.1)
        
        final_count = get_neon_count(table)
        print(f"[{table}] 完成! 最终数量: {final_count} / {target}")
        print()
    
    print("=" * 50)
    print("  所有导入任务完成!")
    print("=" * 50)
    print()
    
    # 最终统计
    print("最终数据量统计:")
    result = subprocess.run(
        ['psql', NEON_CONN, '-c', 
         "SELECT 'classics_books' as table_name, COUNT(*) as count FROM classics_books UNION ALL "
         "SELECT 'wuxing_characters', COUNT(*) FROM wuxing_characters UNION ALL "
         "SELECT 'kangxi_dict', COUNT(*) FROM kangxi_dict UNION ALL "
         "SELECT 'classics_entries', COUNT(*) FROM classics_entries UNION ALL "
         "SELECT 'name_samples', COUNT(*) FROM name_samples UNION ALL "
         "SELECT 'sensitive_words', COUNT(*) FROM sensitive_words ORDER BY table_name"],
        capture_output=True, text=True, timeout=30
    )
    print(result.stdout)

if __name__ == "__main__":
    main()
