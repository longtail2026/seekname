#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""seekname_db -> Neon 最终补齐导入（无emoji，每5分钟汇报）"""
import psycopg2, time, sys

NEON = dict(host='ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech',
            database='neondb', user='neondb_owner',
            password='npg_2WiMHoA4RdTQ', sslmode='require', connect_timeout=30)
LOCAL = dict(host='localhost', database='seekname_db',
             user='postgres', password='postgres')

BATCH = 200
REPORT_SEC = 300   # 5分钟

def neon_count(table):
    for _ in range(3):
        try:
            with psycopg2.connect(**NEON) as c:
                with c.cursor() as cur:
                    cur.execute(f'SELECT COUNT(*) FROM public.{table}')
                    return cur.fetchone()[0]
        except:
            time.sleep(2)
    return -1

def get_cols(table):
    with psycopg2.connect(**LOCAL) as c:
        with c.cursor() as cur:
            cur.execute("""SELECT column_name FROM information_schema.columns
                           WHERE table_name=%s AND table_schema='public'
                           ORDER BY ordinal_position""", (table,))
            return [r[0] for r in cur.fetchall()]

def import_range(table, id_min, id_max):
    cols = get_cols(table)
    col_str = ', '.join(cols)
    ph = ', '.join(['%s'] * len(cols))
    sql = f'INSERT INTO public.{table} ({col_str}) VALUES ({ph}) ON CONFLICT DO NOTHING'

    total = id_max - id_min + 1
    done = 0
    batch_no = 0
    t0 = time.time()
    t_report = t0

    cur_id = id_min
    while cur_id <= id_max:
        batch_no += 1
        end_id = min(cur_id + BATCH - 1, id_max)

        # 读本地
        try:
            with psycopg2.connect(**LOCAL) as lc:
                with lc.cursor() as cur:
                    cur.execute(f'SELECT {col_str} FROM public.{table} '
                                f'WHERE id >= %s AND id <= %s ORDER BY id', (cur_id, end_id))
                    rows = cur.fetchall()
        except Exception as e:
            print(f'  [ERROR] 本地读取失败: {e}')
            sys.exit(1)

        if not rows:
            cur_id += BATCH
            continue

        # 写Neon，重试3次
        ok = False
        for attempt in range(3):
            try:
                with psycopg2.connect(**NEON) as nc:
                    with nc.cursor() as cur:
                        cur.executemany(sql, rows)
                    nc.commit()
                ok = True
                break
            except Exception as e:
                print(f'  [WARN] 批次{batch_no} 第{attempt+1}次失败: {e}')
                time.sleep(3)
        if not ok:
            print(f'  [ERROR] 批次{batch_no} 三次均失败，停止！')
            sys.exit(1)

        done += len(rows)
        cur_id += BATCH
        pct = round(done / total * 100, 1)

        # 每批打印一行简要进度
        elapsed = int(time.time() - t0)
        print(f'  批次{batch_no:4d} | {done:6d}/{total} ({pct:5.1f}%) | {elapsed//60}m{elapsed%60:02d}s')
        sys.stdout.flush()

        # 每5分钟打印详细汇总
        now = time.time()
        if now - t_report >= REPORT_SEC:
            actual = neon_count(table)
            print(f'\n  ===== 5分钟汇报 ===== {table}: Neon实际 {actual} =====\n')
            sys.stdout.flush()
            t_report = now

        time.sleep(0.05)

    final = neon_count(table)
    elapsed = int(time.time() - t0)
    print(f'\n  [DONE] {table} 完成! 用时 {elapsed//60}m{elapsed%60:02d}s | Neon最终: {final}\n')

def main():
    print('===== seekname_db -> Neon 最终补齐 =====')
    tasks = [
        ('classics_entries', 124077, 124120),   # 44条
        ('name_samples',      78801, 88431),    # ~9631条
        ('sensitive_words',       1, 87042),    # 87042条
    ]
    for table, id_min, id_max in tasks:
        print(f'\n>> {table}  id:{id_min}~{id_max}  共{id_max-id_min+1}条')
        import_range(table, id_min, id_max)

    print('===== 全部完成 =====')
    for t, tgt in [('classics_entries',124120),('name_samples',88431),('sensitive_words',87042)]:
        cnt = neon_count(t)
        status = '[OK]' if cnt >= tgt else f'[差{tgt-cnt}条]'
        print(f'  {t}: {cnt}/{tgt} {status}')

if __name__ == '__main__':
    main()
