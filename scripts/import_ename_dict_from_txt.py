#!/usr/bin/env python3
"""
将《英文名大全.txt》补充到 Neon DB ename_dict_with_meaning 表。
- 解析 txt 格式（英文名 中文译名 来源 含义）
- 去重：已存在的名字跳过，不存在的插入
- 重叠名字中修正性别（从'中性/未知'更正为'男性/女性'）
- 使用本地 BGE-M3 模型做含义语义向量化
"""
import os
import sys
import re
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
TXT_PATH = r"C:\Users\Administrator\Desktop\英文名大全.txt"
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


def parse_txt_file(filepath: str) -> Tuple[List[Dict], Dict[str, Dict]]:
    """
    解析《英文名大全.txt》
    返回所有名字记录，以及名字->记录的索引字典
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 分割男女部分
    sections = content.split('- 女生英文名')
    male_section = sections[0]
    female_section = sections[1] if len(sections) > 1 else ''

    # 提取男生部分内容
    if '- 男生英文名' in male_section:
        male_text = male_section.split('- 男生英文名', 1)[1]
    else:
        male_text = male_section

    records = []
    name_index = {}  # name -> record

    def parse_text(text: str, gender: str):
        for line in text.strip().split('\n'):
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('-') or line.startswith('英文名大全'):
                continue
            # 格式: 英文名 中文译名 来源 含义(可能有多词)
            parts = line.split(maxsplit=3)
            if len(parts) < 4:
                # 有些行可能不完整，尝试忽略
                continue
            ename = parts[0].strip()
            cname = parts[1].strip()
            origin = parts[2].strip()
            meaning = parts[3].strip()

            record = {
                'english_name': ename,
                'gender': gender,
                'phonetic': '',  # txt 没有音标字段
                'chinese_name': cname,
                'origin': origin,
                'popularity': '',  # txt 没有流行度字段
                'meaning': meaning,
            }
            records.append(record)
            if ename not in name_index:
                name_index[ename] = record

    parse_text(male_text, '男性')
    parse_text(female_section, '女性')

    logger.info(f"Parsed {len(records)} records from txt (male: {len(male_text.split(chr(10)))} lines, female: {len(female_section.split(chr(10)))} lines)")
    logger.info(f"Unique names: {len(name_index)}")

    return records, name_index


def get_db_data(conn) -> Tuple[Dict[str, Dict], set]:
    """获取现有数据库中的名字信息"""
    cur = conn.cursor()
    cur.execute(f"SELECT english_name, gender, chinese_name, origin, meaning, phonetic, popularity FROM {TABLE_NAME}")
    rows = cur.fetchall()
    cur.close()

    db_data = {}
    db_names = set()
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

    logger.info(f"DB has {len(db_names)} existing names")
    return db_data, db_names


def process_records(txt_records: List[Dict], db_data: Dict[str, Dict], db_names: set):
    """
    处理所有记录：
    1. 需要插入的新名字
    2. 需要更新的重叠名字（修正性别等）
    """
    # 建立 txt name->record 索引（按性别去重，同名不同性别时保留最具体的）
    txt_by_name = {}
    for rec in txt_records:
        n = rec['english_name']
        if n not in txt_by_name:
            txt_by_name[n] = rec
        # 如果已存在，优先保留非空的 gender
        elif rec['gender'] in ('男性', '女性') and txt_by_name[n]['gender'] not in ('男性', '女性'):
            txt_by_name[n] = rec

    # 需要新插入的（txt 有但 DB 没有的）
    to_insert_list = []
    for ename in sorted(txt_by_name.keys()):
        if ename not in db_names:
            rec = txt_by_name[ename]
            rec['popularity'] = ''  # txt 无流行度
            to_insert_list.append(rec)

    # 需要更新的（重叠名字中性别需要变更的）
    to_update_list = []
    for ename in sorted(txt_by_name.keys()):
        if ename in db_names and ename in txt_by_name:
            db_rec = db_data[ename]
            txt_rec = txt_by_name[ename]
            updates = {}
            # 性别修正: DB 为中性/未知，txt 有明确性别
            if db_rec['gender'] in ('中性', '未知', '') and txt_rec['gender'] in ('男性', '女性'):
                updates['gender'] = txt_rec['gender']
            # 中文名补充
            if not db_rec['chinese_name'] and txt_rec['chinese_name']:
                updates['chinese_name'] = txt_rec['chinese_name']
            # 来源补充
            if not db_rec['origin'] and txt_rec['origin']:
                updates['origin'] = txt_rec['origin']
            # 含义补充（如果 DB 含义较短）
            if db_rec['meaning'] and len(db_rec['meaning'].strip()) < 10:
                if len(txt_rec['meaning']) > len(db_rec['meaning'].strip()):
                    updates['meaning'] = txt_rec['meaning']
            if updates:
                updates['english_name'] = ename
                to_update_list.append(updates)

    logger.info(f"New names to insert: {len(to_insert_list)}")
    logger.info(f"Existing names to update (gender/cn/origin/meaning): {len(to_update_list)}")
    for u in to_update_list:
        logger.info(f"  Update {u['english_name']}: { {k:v for k,v in u.items() if k != 'english_name'} }")

    return to_insert_list, to_update_list


def update_existing(conn, updates: List[Dict]):
    """更新重叠名字的字段"""
    if not updates:
        return
    cur = conn.cursor()
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
        logger.info(f"  Updated {ename}: set {list(u.keys())}")
    conn.commit()
    cur.close()
    logger.info(f"✅ Updated {len(updates)} existing records")


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
    cur = conn.cursor()

    try:
        # 1. 确保表存在，并添加 english_name 唯一约束（如不存在）
        cur.execute(f"SELECT COUNT(*) FROM {TABLE_NAME}")
        existing_cnt = cur.fetchone()[0]
        logger.info(f"Table {TABLE_NAME} has {existing_cnt} existing rows")
        
        # 添加唯一约束（如果不存在）
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

        # 2. 解析 txt
        logger.info("=" * 60)
        logger.info("Parsing 英文名大全.txt...")
        txt_records, txt_name_index = parse_txt_file(TXT_PATH)

        # 3. 获取 DB 现有数据
        db_data, db_names = get_db_data(conn)

        # 4. 计算新增和更新
        to_insert, to_update = process_records(txt_records, db_data, db_names)

        # 5. 更新重叠名字
        if to_update:
            logger.info("=" * 60)
            logger.info(f"Updating {len(to_update)} existing records...")
            update_existing(conn, to_update)

        # 6. 初始化 BGE-M3
        logger.info("=" * 60)
        logger.info("Initializing BGE-M3 model...")
        embedder = BGEM3Embedder()

        # 7. 插入新记录并向量化
        if to_insert:
            logger.info("=" * 60)
            logger.info(f"Inserting {len(to_insert)} new records with embeddings...")
            total = len(to_insert)
            inserted = 0

            for start in range(0, total, BATCH_SIZE):
                end = min(start + BATCH_SIZE, total)
                batch = to_insert[start:end]

                # 构建向量化文本
                embed_texts = [build_embed_text(rec) for rec in batch]

                # 向量化
                embeddings = embedder.encode(embed_texts, batch_size=len(embed_texts))
                logger.info(f"  [{start+1}-{end}/{total}] Generated {len(embeddings)} embeddings")

                # 准备插入数据
                # 表结构: id, english_name, gender, phonetic, chinese_name, origin, popularity, meaning, embedding
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

                # 批量插入（跳过重复）
                cur = conn.cursor()
                execute_values(cur, f"""
                    INSERT INTO {TABLE_NAME}
                    (english_name, gender, phonetic, chinese_name, origin, popularity, meaning, embedding)
                    VALUES %s
                    ON CONFLICT (english_name) DO NOTHING
                """, values, template="(%s, %s, %s, %s, %s, %s, %s, %s::vector)")
                conn.commit()
                cur.close()
                inserted += len(batch)
                logger.info(f"  Inserted [{start+1}-{end}], total: {inserted}/{total}")

                time.sleep(0.3)

            logger.info(f"✅ Inserted {inserted} new records with embeddings")
        else:
            logger.info("No new records to insert")

        # 8. 最终统计
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