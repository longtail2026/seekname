#!/usr/bin/env python3
"""
将 ename_dict_with_meaning.csv（1964条）补充到 Neon DB ename_dict 表。
- 去重：已存在的名字跳过，不存在的插入
- 补充缺失字段（音标、流行度、含义等）
- 重叠名字修正性别（从'中性/未知'更正为'男性/女性'）
- 使用本地 BGE-M3 模型做含义语义向量化
"""
import os
import sys
import csv
import time
import logging
from typing import List, Tuple, Dict

import numpy as np
import psycopg2
from psycopg2.extras import execute_values

import torch
from transformers import AutoTokenizer, AutoModel

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# ── 配置 ──
NEON_URL = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ename_dict_with_meaning.csv")
TABLE_NAME = "ename_dict"
BATCH_SIZE = 32
BGE_MODEL_NAME = "BAAI/bge-m3"


class BGEM3Embedder:
    """BGE-M3 向量化模型"""
    def __init__(self, model_name: str = BGE_MODEL_NAME, device: str = None):
        self.model_name = model_name
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Loading BGE-M3 model: {model_name} on {self.device}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        logger.info("BGE-M3 model loaded successfully")

    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        embeddings = []
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                encoded = self.tokenizer(
                    batch, padding=True, truncation=True,
                    max_length=512, return_tensors='pt'
                ).to(self.device)
                output = self.model(**encoded)
                emb = output.last_hidden_state[:, 0]
                emb = torch.nn.functional.normalize(emb, p=2, dim=1)
                embeddings.append(emb.cpu().numpy())
        return np.vstack(embeddings) if embeddings else np.array([])


def parse_csv(filepath: str) -> List[Dict]:
    """解析 ename_dict_with_meaning.csv"""
    records = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ename = row.get('英文名', '').strip()
            if not ename:
                continue

            gender_raw = row.get('性别', '').strip()
            # 性别标准化：CSV 中的 '中性' -> '中性', '男性' -> '男性', '女性' -> '女性'
            gender = '中性'
            if gender_raw in ('男性', '男'):
                gender = '男性'
            elif gender_raw in ('女性', '女'):
                gender = '女性'

            # 处理音标：去掉 [' ... '] 包裹
            phonetic_raw = row.get('音标', '').strip()
            phonetic = phonetic_raw.strip("[]' ")

            # 处理流行度：去掉星号，只保留数字星数
            popularity_raw = row.get('流行度', '').strip()
            if popularity_raw in ('无', '—', '-', ''):
                popularity = ''
            else:
                # 保留原始星数如 ★★
                popularity = popularity_raw

            meaning = row.get('含义', '').strip()
            chinese_name = row.get('中文译名', '').strip()
            origin = row.get('来源', '').strip()

            records.append({
                'english_name': ename,
                'gender': gender,
                'phonetic': phonetic,
                'chinese_name': chinese_name,
                'origin': origin,
                'popularity': popularity,
                'meaning': meaning,
            })

    logger.info(f"Parsed {len(records)} records from CSV")
    return records


def get_db_data(conn) -> Tuple[Dict[str, Dict], set, set]:
    """获取现有数据库中的名字信息"""
    cur = conn.cursor()
    cur.execute(f"SELECT english_name, gender, chinese_name, origin, meaning, phonetic, popularity FROM {TABLE_NAME}")
    rows = cur.fetchall()
    cur.close()

    db_data = {}
    db_names = set()
    names_with_vec = set()
    for r in rows:
        ename = r[0]
        db_data[ename] = {
            'english_name': ename,
            'gender': r[1] or '',
            'chinese_name': r[2] or '',
            'origin': r[3] or '',
            'meaning': r[4] or '',
            'phonetic': r[5] or '',
            'popularity': r[6] or ''
        }
        db_names.add(ename)

    # 检查哪些有向量
    cur = conn.cursor()
    cur.execute(f"SELECT english_name FROM {TABLE_NAME} WHERE embedding IS NOT NULL")
    for r in cur.fetchall():
        names_with_vec.add(r[0])
    cur.close()

    logger.info(f"DB has {len(db_names)} existing names, {len(names_with_vec)} with embeddings")
    return db_data, db_names, names_with_vec


def process_records(csv_records: List[Dict], db_data: Dict[str, Dict], db_names: set):
    """
    处理所有记录：
    1. 需要插入的新名字（CSV 有但 DB 无）
    2. 需要更新的重叠名字（补充缺失字段、修正性别）
    """
    # CSV name -> record 索引
    csv_by_name = {}
    for rec in csv_records:
        n = rec['english_name']
        if n not in csv_by_name:
            csv_by_name[n] = rec
        # 同名不同性别时，优先保留更具体的
        elif rec['gender'] in ('男性', '女性') and csv_by_name[n]['gender'] == '中性':
            csv_by_name[n] = rec

    # 需要新插入的
    to_insert_list = []
    for ename in sorted(csv_by_name.keys()):
        if ename not in db_names:
            to_insert_list.append(csv_by_name[ename])

    # 需要更新的（重叠名字）
    to_update_list = []
    for ename in sorted(csv_by_name.keys()):
        if ename in db_names and ename in csv_by_name:
            db_rec = db_data[ename]
            csv_rec = csv_by_name[ename]
            updates = {}
            # 性别修正
            if db_rec['gender'] in ('中性', '未知', '') and csv_rec['gender'] in ('男性', '女性'):
                updates['gender'] = csv_rec['gender']
            # 中文译名补充（DB 为空时）
            if not db_rec['chinese_name'] and csv_rec['chinese_name']:
                updates['chinese_name'] = csv_rec['chinese_name']
            # 来源补充
            if not db_rec['origin'] and csv_rec['origin']:
                updates['origin'] = csv_rec['origin']
            # 含义补充（DB 含义较短时）
            if db_rec['meaning'] and len(db_rec['meaning'].strip()) < 15:
                if len(csv_rec['meaning']) > len(db_rec['meaning'].strip()):
                    updates['meaning'] = csv_rec['meaning']
            elif not db_rec['meaning'] and csv_rec['meaning']:
                updates['meaning'] = csv_rec['meaning']
            # 音标补充
            if not db_rec['phonetic'] and csv_rec['phonetic']:
                updates['phonetic'] = csv_rec['phonetic']
            # 流行度补充
            if not db_rec['popularity'] and csv_rec['popularity']:
                updates['popularity'] = csv_rec['popularity']

            if updates:
                updates['english_name'] = ename
                to_update_list.append(updates)

    logger.info(f"New names to insert from CSV: {len(to_insert_list)}")
    logger.info(f"Existing names to update fields: {len(to_update_list)}")
    if to_update_list:
        logger.info("Update details (sample):")
        for u in to_update_list[:5]:
            logger.info(f"  {u['english_name']}: { {k:v for k,v in u.items() if k != 'english_name'} }")
        if len(to_update_list) > 5:
            logger.info(f"  ... and {len(to_update_list)-5} more")

    return to_insert_list, to_update_list


def update_existing(conn, updates: List[Dict]):
    """更新重叠名字的字段"""
    if not updates:
        return
    cur = conn.cursor()
    updated_count = 0
    for u in updates:
        ename = u.pop('english_name')
        set_clauses = []
        values = []
        for k, v in u.items():
            set_clauses.append(f"{k} = %s")
            values.append(v)
        values.append(ename)
        sql = f"UPDATE {TABLE_NAME} SET {', '.join(set_clauses)} WHERE english_name = %s"
        cur.execute(sql, values)
        updated_count += 1
        if updated_count <= 3:
            logger.info(f"  Updated {ename}: set {list(u.keys())}")
    conn.commit()
    cur.close()
    logger.info(f"✅ Updated {updated_count} existing records")


def build_embed_text(record: Dict) -> str:
    """构建用于向量化的文本"""
    name = record['english_name']
    meaning = record['meaning']
    origin = record['origin']
    cname = record['chinese_name']
    gender = record['gender']
    return f"英文名 {name}：{meaning} 来源：{origin} 中文译名：{cname} 性别：{gender}"


def main():
    conn = psycopg2.connect(NEON_URL)
    conn.autocommit = False

    try:
        # 1. 确保唯一索引存在
        cur = conn.cursor()
        cur.execute("""
            SELECT 1 FROM pg_indexes 
            WHERE tablename = %s AND indexdef LIKE '%%UNIQUE%%english_name%%'
        """, (TABLE_NAME,))
        if not cur.fetchone():
            logger.info("Adding unique index on english_name...")
            cur.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS idx_{TABLE_NAME}_ename_unique ON {TABLE_NAME}(english_name)")
            conn.commit()
            logger.info("Unique index added")
        else:
            logger.info("Unique index on english_name already exists")
        cur.close()

        # 2. 解析 CSV
        logger.info("=" * 60)
        logger.info("Parsing ename_dict_with_meaning.csv...")
        csv_records = parse_csv(CSV_PATH)
        logger.info(f"Total CSV records: {len(csv_records)}")

        # 3. 获取 DB 现有数据
        db_data, db_names, names_with_vec = get_db_data(conn)

        # 4. 计算新增和更新
        to_insert, to_update = process_records(csv_records, db_data, db_names)

        # 5. 更新重叠名字
        if to_update:
            logger.info("=" * 60)
            logger.info(f"Updating {len(to_update)} existing records with missing fields...")
            update_existing(conn, to_update)

        # 6. 检查哪些新名字已在 DB 但没向量，需要补充向量
        need_vec_names = []
        for rec in csv_records:
            if rec['english_name'] in db_names and rec['english_name'] not in names_with_vec:
                need_vec_names.append(rec)
        logger.info(f"Existing records missing embeddings (need vectorize): {len(need_vec_names)}")

        # 7. 初始化 BGE-M3
        logger.info("=" * 60)
        logger.info("Initializing BGE-M3 model...")
        embedder = BGEM3Embedder()

        # 8. 插入新记录并向量化
        total_to_process = len(to_insert) + len(need_vec_names)
        if total_to_process > 0:
            logger.info("=" * 60)
            logger.info(f"Processing {total_to_process} records (insert: {len(to_insert)}, re-vectorize: {len(need_vec_names)})...")

            # 合并：先插入新记录，后补充向量
            processed = 0

            # 8a. 插入新记录
            if to_insert:
                logger.info(f"--- Inserting {len(to_insert)} new records ---")
                total = len(to_insert)
                for start in range(0, total, BATCH_SIZE):
                    end = min(start + BATCH_SIZE, total)
                    batch = to_insert[start:end]

                    embed_texts = [build_embed_text(rec) for rec in batch]
                    embeddings = embedder.encode(embed_texts, batch_size=len(embed_texts))
                    logger.info(f"  [{start+1}-{end}/{total}] Generated {len(embeddings)} embeddings")

                    values = []
                    for i, rec in enumerate(batch):
                        emb_list = embeddings[i].tolist()
                        emb_str = '[' + ','.join(f'{x:.8f}' for x in emb_list) + ']'
                        values.append((
                            rec['english_name'],
                            rec['gender'],
                            rec['phonetic'] or '',
                            rec['chinese_name'],
                            rec['origin'],
                            rec['popularity'] or '',
                            rec['meaning'],
                            emb_str
                        ))

                    cur = conn.cursor()
                    execute_values(cur, f"""
                        INSERT INTO {TABLE_NAME}
                        (english_name, gender, phonetic, chinese_name, origin, popularity, meaning, embedding)
                        VALUES %s
                        ON CONFLICT (english_name) DO NOTHING
                    """, values, template="(%s, %s, %s, %s, %s, %s, %s, %s::vector)")
                    conn.commit()
                    cur.close()
                    processed += len(batch)
                    logger.info(f"  Inserted [{start+1}-{end}], total: {processed}/{total_to_process}")

                    time.sleep(0.1)

            # 8b. 补充 DB 已有但缺向量的记录的向量
            if need_vec_names:
                logger.info(f"--- Vectorizing {len(need_vec_names)} existing records ---")
                total = len(need_vec_names)
                vec_processed = 0
                for start in range(0, total, BATCH_SIZE):
                    end = min(start + BATCH_SIZE, total)
                    batch = need_vec_names[start:end]

                    embed_texts = [build_embed_text(rec) for rec in batch]
                    embeddings = embedder.encode(embed_texts, batch_size=len(embed_texts))
                    logger.info(f"  [{start+1}-{end}/{total}] Generated {len(embeddings)} embeddings")

                    cur = conn.cursor()
                    for i, rec in enumerate(batch):
                        emb_list = embeddings[i].tolist()
                        emb_str = '[' + ','.join(f'{x:.8f}' for x in emb_list) + ']'
                        cur.execute(
                            f"UPDATE {TABLE_NAME} SET embedding = %s::vector WHERE english_name = %s",
                            (emb_str, rec['english_name'])
                        )
                    conn.commit()
                    cur.close()
                    vec_processed += len(batch)
                    processed += len(batch)
                    logger.info(f"  Vectorized [{start+1}-{end}], total: {processed}/{total_to_process}")

                    time.sleep(0.1)

            logger.info(f"✅ Processed {processed} records total")
        else:
            logger.info("No new records to insert or vectorize")

        # 9. 最终统计
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {TABLE_NAME}")
        final_cnt = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {TABLE_NAME} WHERE embedding IS NOT NULL")
        vec_cnt = cur.fetchone()[0]
        cur.execute(f"SELECT gender, COUNT(*) FROM {TABLE_NAME} GROUP BY gender ORDER BY gender")
        gender_stats = cur.fetchall()
        cur.close()

        logger.info("=" * 60)
        logger.info(f"🎉 ALL DONE!")
        logger.info(f"  Total rows: {final_cnt}")
        logger.info(f"  With embeddings: {vec_cnt}/{final_cnt}")
        for g, c in gender_stats:
            logger.info(f"    {g}: {c}")

    except Exception as e:
        conn.rollback()
        logger.error(f"Error: {e}", exc_info=True)
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()