#!/usr/bin/env python3
"""
使用本地BGE-M3模型对英文名词典进行向量化，并导入Neon数据库。
"""
import os
import sys
import csv
import json
import time
import logging
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from typing import List, Tuple

import torch
from transformers import AutoTokenizer, AutoModel

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ── Neon 连接 ──
NEON_URL = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ename_dict_with_meaning.csv")
TABLE_NAME = "ename_dict"
BATCH_SIZE = 32

# ── BGE-M3 Embedder ──
class BGEM3Embedder:
    def __init__(self, model_name: str = "BAAI/bge-m3", device: str = None):
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

def create_table(conn):
    """创建 ename_dict 表（含 vector 字段）"""
    cur = conn.cursor()
    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename=%s", (TABLE_NAME,))
    if cur.fetchone():
        logger.info(f"Table {TABLE_NAME} already exists, checking vector column...")
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name=%s AND column_name='embedding'", (TABLE_NAME,))
        if not cur.fetchone():
            cur.execute(f"ALTER TABLE {TABLE_NAME} ADD COLUMN embedding vector(1024)")
            logger.info("Added embedding column")
            conn.commit()
        return False
    cur.execute(f"""
        CREATE TABLE {TABLE_NAME} (
            id SERIAL PRIMARY KEY,
            english_name VARCHAR(100) NOT NULL,
            gender VARCHAR(10),
            phonetic VARCHAR(200),
            chinese_name VARCHAR(100),
            origin VARCHAR(100),
            popularity VARCHAR(50),
            meaning TEXT,
            embedding vector(1024)
        )
    """)
    cur.execute(f"CREATE INDEX idx_{TABLE_NAME}_name ON {TABLE_NAME}(english_name)")
    cur.execute(f"CREATE INDEX idx_{TABLE_NAME}_gender ON {TABLE_NAME}(gender)")
    cur.execute(f"CREATE INDEX idx_{TABLE_NAME}_embedding ON {TABLE_NAME} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")
    conn.commit()
    logger.info(f"Table {TABLE_NAME} created successfully with ivfflat index")
    return True

def read_csv_data():
    """读取CSV并返回 (records, texts_for_embedding)"""
    records = []
    texts = []
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 构建向量化的文本：综合含义和中文译名
            name = row.get('英文名', '').strip()
            meaning = row.get('含义', '').strip()
            chinese = row.get('中文译名', '').strip()
            origin = row.get('来源', '').strip()
            # 含义文本用于语义搜索匹配
            embed_text = f"英文名 {name}：{meaning} 来源：{origin} 中文译名：{chinese}"
            records.append({
                'english_name': name,
                'gender': row.get('性别', '').strip(),
                'phonetic': row.get('音标', '').strip(),
                'chinese_name': chinese,
                'origin': origin,
                'popularity': row.get('流行度', '').strip(),
                'meaning': meaning,
            })
            texts.append(embed_text)
    logger.info(f"Read {len(records)} records from CSV")
    return records, texts

def main():
    conn = psycopg2.connect(NEON_URL)
    conn.autocommit = False
    try:
        created = create_table(conn)
        records, texts = read_csv_data()

        # 检查已有数据
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {TABLE_NAME}")
        existing = cur.fetchone()[0]
        if existing > 0:
            logger.info(f"Table already has {existing} rows, will skip already inserted")
            cur.execute(f"SELECT english_name FROM {TABLE_NAME}")
            existing_names = set(r[0] for r in cur.fetchall())
            to_insert = [(r, t) for r, t in zip(records, texts) if r['english_name'] not in existing_names]
            logger.info(f"Skipping {len(records) - len(to_insert)} already inserted, inserting {len(to_insert)} new")
            records, texts = [r for r, _ in to_insert], [t for _, t in to_insert]
        else:
            logger.info(f"Table is empty, inserting all {len(records)} records")
        cur.close()

        if not records:
            logger.info("No new records to insert")
            return

        # 初始化BGE-M3
        embedder = BGEM3Embedder()

        # 分批向量化 + 批量插入
        total = len(records)
        inserted = 0
        for start in range(0, total, BATCH_SIZE):
            end = min(start + BATCH_SIZE, total)
            batch_records = records[start:end]
            batch_texts = texts[start:end]

            # 向量化
            embeddings = embedder.encode(batch_texts, batch_size=len(batch_texts))
            logger.info(f"  [{start+1}-{end}/{total}] Generated {len(embeddings)} embeddings, dim={embeddings.shape[1]}")

            # 准备插入数据
            values = []
            for i, rec in enumerate(batch_records):
                emb_str = '[' + ','.join(f'{x:.8f}' for x in embeddings[i].tolist()) + ']'
                values.append((
                    rec['english_name'],
                    rec['gender'],
                    rec['phonetic'],
                    rec['chinese_name'],
                    rec['origin'],
                    rec['popularity'],
                    rec['meaning'],
                    emb_str
                ))

            # 批量插入
            cur = conn.cursor()
            execute_values(cur, f"""
                INSERT INTO {TABLE_NAME}
                (english_name, gender, phonetic, chinese_name, origin, popularity, meaning, embedding)
                VALUES %s
            """, values, template="(%s, %s, %s, %s, %s, %s, %s, %s::vector)")
            conn.commit()
            cur.close()
            inserted += len(batch_records)
            logger.info(f"  Inserted batch [{start+1}-{end}], total inserted: {inserted}/{total}")

            time.sleep(0.5)

        logger.info(f"✅ All {inserted} records vectorized and imported successfully!")
    finally:
        conn.close()

if __name__ == "__main__":
    main()