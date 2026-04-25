#!/usr/bin/env python3
"""
============================================================
  tag_gender_bge_m3_v2.py  (优化版)
  典籍性别打标脚本 v2.0 - 利用已有向量嵌入实现超高速分类
============================================================
  核心策略：
    阶段1: 已知历史人物直接匹配（Python本地，毫秒级）
    阶段2: 关键词规则快速分类（Python本地，毫秒级）
    阶段3: BGE-M3语义分类（利用库中已有向量+pgvector相似度计算）
    
  优化亮点：
    - BGE-M3只需编码3个模板句子（男/女/中性），而非15,815条记录
    - 利用 combined_text_embedding_vec 在 PostgreSQL 内完成向量相似度运算
    - 性能：预计处理15,815条记录只需 1-2 分钟
============================================================
"""

import sys
import os
import time
import re
import json
import logging
import numpy as np
from typing import List, Tuple, Optional, Dict
from datetime import datetime

# ============================================================
# 配置区
# ============================================================

DATABASE_URL = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
MODEL_NAME = "BAAI/bge-m3"
CHECKPOINT_INTERVAL = 2000  # 每2000条写一次数据库
BATCH_SIZE = 2000           # SQL批次大小
SIMILARITY_THRESHOLD = 0.30
GENDER_DIFF_THRESHOLD = 0.05
LOG_FILE = "gender_tag_bge_m3_v2.log"


# ============================================================
# 阶段1：已知历史人物清单
# ============================================================

HISTORICAL_MALES = [
    "孔子", "孟子", "庄子", "老子", "荀子", "墨子", "韩非子",
    "管子", "列子", "曾子", "子思", "子贡", "颜回", "子路",
    "子夏", "子游", "子张", "子产", "子贱", "子华",
    "公西华", "冉有", "宰我", "樊迟", "有若", "闵子骞",
    "仲弓", "原思", "南宫适", "司马牛", "巫马期",
    "管仲", "晏婴", "叔向", "臧文仲", "柳下惠", "伯夷", "叔齐",
    "周公", "文王", "武王", "尧", "舜", "禹", "汤",
    "伊尹", "傅说", "姜尚", "周公旦", "召公", "太公",
    "李白", "杜甫", "王维", "孟浩然", "白居易", "杜牧", "李商隐",
    "王昌龄", "岑参", "王之涣", "刘禹锡", "韩愈", "柳宗元",
    "孟郊", "贾岛", "贺知章", "张籍", "韦应物", "陈子昂",
    "骆宾王", "卢照邻", "杨炯", "王勃", "高适", "元稹",
    "苏轼", "辛弃疾", "李清照", "柳永", "周邦彦", "秦观",
    "欧阳修", "王安石", "陆游", "范仲淹", "岳飞", "文天祥",
    "姜夔", "晏殊", "晏几道", "张先", "贺铸", "黄庭坚",
    "晁补之", "张耒", "陈师道", "周敦颐", "程颐", "程颢",
    "朱熹", "邵雍", "司马光",
    "屈原", "宋玉", "楚怀王",
    "尹吉甫", "召公",
]

HISTORICAL_FEMALES = [
    "西施", "王昭君", "貂蝉", "杨玉环", "杨贵妃",
    "妲己", "褒姒", "孟姜女", "祝英台", "织女", "嫦娥",
    "湘夫人", "湘君", "宓妃", "女娲", "王母", "西王母",
    "许穆夫人", "宣姜", "文姜", "息夫人", "夏姬",
    "赵飞燕", "卓文君", "蔡文姬", "谢道韫",
    "上官婉儿", "薛涛", "鱼玄机", "李冶",
    "花木兰", "秦罗敷", "莫愁", "绿珠",
]

HISTORICAL_MALE_SET = set(HISTORICAL_MALES)
HISTORICAL_FEMALE_SET = set(HISTORICAL_FEMALES)


# ============================================================
# 阶段2：关键词规则
# ============================================================

MALE_KEYWORDS = {
    "刚健", "英武", "雄壮", "豪迈", "阳刚", "俊朗", "宏大",
    "气魄", "雄浑", "边塞", "征战", "将军", "壮士", "英雄",
    "霸王", "君王", "天子", "帝王", "圣王", "贤君", "明君",
    "君子", "大丈夫", "丈夫", "男子", "男儿",
    "剑", "弓", "马", "戈", "戟", "矛", "盾",
    "刚", "强", "健", "武", "勇", "毅", "猛", "威",
    "龙", "虎", "豹", "鹰",
}

FEMALE_KEYWORDS = {
    "柔美", "温婉", "娴淑", "秀丽", "优雅", "婉约", "婀娜",
    "相思", "清丽", "闺怨", "红颜", "佳人", "美人", "玉人",
    "仙子", "天仙", "婵娟", "淑女", "静女", "处子",
    "柔", "婉", "淑", "秀", "丽", "雅", "娴", "静",
    "香", "兰", "蕙", "芝", "蓉", "莲", "荷", "桃", "杏",
    "胭脂", "罗裙", "绣", "钗", "环", "佩", "玉",
    "眉", "眸", "唇", "鬓", "髻", "黛",
    "春", "秋月", "落花",
}

NEUTRAL_KEYWORDS = {
    "自然", "智慧", "明德", "仁爱", "诚信", "中庸", "和谐",
    "道德", "仁义", "礼智", "忠信", "孝悌", "勤俭",
    "天", "地", "日", "月", "星", "辰", "山", "水",
    "仁", "义", "礼", "智", "信", "德", "道",
}


# ============================================================
# 阶段3：BGE-M3 性别标签模板（语义分类用）
# ============================================================

GENDER_TEMPLATES = {
    "男": "适合男孩取名的文字，阳刚、英武、雄壮、豪迈、刚健、有男子气概、体现力量与担当",
    "女": "适合女孩取名的文字，柔美、温婉、娴淑、秀丽、优雅、有女子气质、体现温柔与美好",
    "中性": "中性通用的文字，适合男女皆可取名，平和、自然、智慧、高雅、不偏向任何性别",
}

GENDER_LABELS = ["男", "女", "中性"]


# ============================================================
# 日志配置（去除emoji避免GBK编码问题）
# ============================================================

class GbkSafeFormatter(logging.Formatter):
    """替换emoji为纯文本"""
    def format(self, record):
        msg = super().format(record)
        # 替换常见emoji
        replacements = {
            '\U0001f4da': '[BOOKS]', '\u2705': '[OK]', '\U0001f4ca': '[STATS]',
            '\U0001f389': '[DONE]', '\u26a0\ufe0f': '[WARN]', '\u274c': '[FAIL]',
            '\U0001f525': '[FIRE]', '\U0001f680': '[ROCKET]', '\u23f3': '[WAIT]',
            '\U0001f504': '[AGAIN]', '\U0001f504\ufe0f': '[RETRY]',
        }
        for emoji, text in replacements.items():
            msg = msg.replace(emoji, text)
        return msg

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


# ============================================================
# BGE-M3 编码器（仅编码3个标签模板）
# ============================================================

class BGE_M3_Encoder:
    """使用 BGE-M3 仅编码性别标签模板（3句），然后在数据库内做向量相似度"""

    def __init__(self, model_name: str = MODEL_NAME):
        self.tokenizer = None
        self.model = None
        self.device = None
        self.model_name = model_name
        self.label_embeddings = {}
        self._load_model()
        self._compute_label_embeddings()

    def _load_model(self):
        import torch
        from transformers import AutoTokenizer, AutoModel

        logger.info(f"[BGE-M3] 正在加载模型: {self.model_name}")
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModel.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()

        logger.info(f"[BGE-M3] 模型加载成功 | 设备: {self.device} | 维度: {self.model.config.hidden_size}")

    def _compute_label_embeddings(self):
        import torch

        templates = [GENDER_TEMPLATES[label] for label in GENDER_LABELS]

        with torch.no_grad():
            encoded = self.tokenizer(
                templates,
                padding=True,
                truncation=True,
                max_length=128,
                return_tensors='pt'
            ).to(self.device)

            output = self.model(**encoded)
            embeddings = output.last_hidden_state[:, 0]
            embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
            embeddings = embeddings.cpu().numpy()

        for i, label in enumerate(GENDER_LABELS):
            self.label_embeddings[label] = embeddings[i]

        logger.info(f"[BGE-M3] 已预计算 {len(GENDER_LABELS)} 个标签模板嵌入 (1024维)")

    def get_label_vectors_sql(self) -> str:
        """生成 PostgreSQL pgvector 格式的标签向量"""
        parts = []
        for label in GENDER_LABELS:
            vec = self.label_embeddings[label]
            vec_str = '[' + ','.join(f'{v:.10f}' for v in vec) + ']'
            parts.append(f"('{label}', '{vec_str}'::vector)")
        return ','.join(parts)


# ============================================================
# 数据库操作
# ============================================================

class DatabaseManager:
    def __init__(self, url: str = DATABASE_URL):
        self.url = url
        self.conn = None
        self.cur = None

    def connect(self):
        import psycopg2
        self.conn = psycopg2.connect(self.url)
        self.cur = self.conn.cursor()
        logger.info("[DB] 已连接到 Neon 数据库")

    def disconnect(self):
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()
        logger.info("[DB] 已断开数据库连接")

    def get_total_count(self) -> int:
        self.cur.execute("SELECT COUNT(*) FROM naming_classics")
        return self.cur.fetchone()[0]

    def get_tagged_count(self) -> int:
        self.cur.execute("SELECT COUNT(*) FROM naming_classics WHERE gender_tag IS NOT NULL")
        return self.cur.fetchone()[0]

    def get_distribution(self) -> Dict[str, int]:
        self.cur.execute("""
            SELECT gender_tag, COUNT(*) as cnt
            FROM naming_classics
            WHERE gender_tag IS NOT NULL
            GROUP BY gender_tag
            ORDER BY cnt DESC
        """)
        return {row[0]: row[1] for row in self.cur.fetchall()}

    def update_gender_tag(self, id_list: List[int], tag_list: List[str]):
        """批量更新 gender_tag"""
        from psycopg2.extras import execute_values
        data = [(uid, tag) for uid, tag in zip(id_list, tag_list)]
        execute_values(
            self.cur,
            """
            UPDATE naming_classics AS nc
            SET gender_tag = data.gender_tag
            FROM (VALUES %s) AS data(id, gender_tag)
            WHERE nc.id = data.id
            """,
            data,
            template="(%s::int, %s::varchar)"
        )
        self.conn.commit()

    def commit(self):
        self.conn.commit()


# ============================================================
# 核心打标引擎
# ============================================================

class GenderTagEngine:
    """三阶段性别打标引擎（优化版）"""

    def __init__(self, db: DatabaseManager, encoder: BGE_M3_Encoder):
        self.db = db
        self.encoder = encoder
        self.stats = {"phase1": 0, "phase2": 0, "phase3": 0}

    def _phase1_check(self, chapter_name: str, ancient_text: str) -> Optional[str]:
        """阶段1：历史人物匹配"""
        text = f"{chapter_name or ''} {ancient_text or ''}"
        for person in HISTORICAL_MALE_SET:
            if person in text:
                return "男"
        for person in HISTORICAL_FEMALE_SET:
            if person in text:
                return "女"
        return None

    def _phase2_check(self, keywords_str: str, ancient_text: str, modern_text: str) -> Optional[str]:
        """阶段2：关键词规则"""
        combined = f"{keywords_str or ''} {ancient_text or ''} {modern_text or ''}".lower()
        male_score = sum(1 for kw in MALE_KEYWORDS if kw in combined)
        female_score = sum(1 for kw in FEMALE_KEYWORDS if kw in combined)
        neutral_count = sum(1 for kw in NEUTRAL_KEYWORDS if kw in combined)

        male_score = max(0, male_score - neutral_count // 3)
        female_score = max(0, female_score - neutral_count // 3)

        if male_score >= 2 and male_score > female_score * 2:
            return "男"
        if female_score >= 2 and female_score > male_score * 2:
            return "女"
        if male_score >= 3 and male_score > female_score:
            return "男"
        if female_score >= 3 and female_score > male_score:
            return "女"
        return None

    def _phase3_sql(self, ids: List[int]) -> Optional[List[str]]:
        """
        阶段3：利用pgvector在数据库内完成语义分类（高速！）
        - 将BGE-M3编码的3个标签向量注册为临时表
        - 对每条记录计算余弦相似度，取最高分类
        """
        if not ids:
            return None

        # 构建标签向量SQL
        label_vecs = self.encoder.get_label_vectors_sql()

        sql = f"""
        WITH label_vectors AS (
            SELECT * FROM (VALUES {label_vecs}) AS lv(label, vec)
        ),
        similarities AS (
            SELECT
                nc.id,
                lv.label,
                (1 - (nc.combined_text_embedding_vec <=> lv.vec)) AS similarity
            FROM naming_classics nc
            CROSS JOIN label_vectors lv
            WHERE nc.id = ANY(%s)
        ),
        ranked AS (
            SELECT
                id,
                label,
                similarity,
                ROW_NUMBER() OVER (PARTITION BY id ORDER BY similarity DESC) AS rn
            FROM similarities
        ),
        scored AS (
            SELECT
                id,
                label AS best_label,
                similarity AS best_sim,
                MAX(similarity) OVER (PARTITION BY id) AS top_score,
                -- 同时拿到"中性"的得分用于判断
                MAX(CASE WHEN label = '中性' THEN similarity ELSE 0 END) OVER (PARTITION BY id) AS neutral_score,
                MAX(CASE WHEN label = '男' THEN similarity ELSE 0 END) OVER (PARTITION BY id) AS male_score,
                MAX(CASE WHEN label = '女' THEN similarity ELSE 0 END) OVER (PARTITION BY id) AS female_score
            FROM ranked
            WHERE rn = 1
        )
        SELECT
            id,
            best_label,
            best_sim,
            top_score,
            neutral_score,
            male_score,
            female_score
        FROM scored
        ORDER BY id
        """

        self.db.cur.execute(sql, (ids,))
        rows = self.db.cur.fetchall()

        results = []
        for row in rows:
            id_val, best_label, best_sim, top_score, neutral_score, male_score, female_score = row

            # 相似度阈值判断
            if top_score < SIMILARITY_THRESHOLD:
                results.append((id_val, "中性"))
                continue

            # 如果中性得分最高且优势明显
            if best_label == "中性":
                male_diff = neutral_score - male_score
                female_diff = neutral_score - female_score
                if male_diff > GENDER_DIFF_THRESHOLD and female_diff > GENDER_DIFF_THRESHOLD:
                    results.append((id_val, "中性"))
                else:
                    if male_score > female_score + GENDER_DIFF_THRESHOLD:
                        results.append((id_val, "男"))
                    elif female_score > male_score + GENDER_DIFF_THRESHOLD:
                        results.append((id_val, "女"))
                    else:
                        results.append((id_val, "中性"))
            else:
                # 男 vs 女
                if male_score > female_score + GENDER_DIFF_THRESHOLD:
                    results.append((id_val, best_label))
                elif female_score > male_score + GENDER_DIFF_THRESHOLD:
                    results.append((id_val, best_label))
                else:
                    results.append((id_val, "中性"))

        return results

    def run(self):
        """执行全量打标"""
        total = self.db.get_total_count()
        tagged_before = self.db.get_tagged_count()

        logger.info("=" * 60)
        logger.info("[STATS] 数据库统计")
        logger.info(f"总记录数: {total}")
        logger.info(f"已打标: {tagged_before}")
        logger.info(f"待处理: {total - tagged_before}")
        logger.info("=" * 60)

        if total == tagged_before:
            logger.info("[OK] 所有记录已打标，无需处理")
            return

        # 获取所有待处理记录（一次性）
        self.db.cur.execute("""
            SELECT id, book_name, chapter_name, ancient_text, modern_text, keywords
            FROM naming_classics
            WHERE gender_tag IS NULL
            ORDER BY id
        """)
        all_rows = self.db.cur.fetchall()
        remaining = len(all_rows)

        logger.info(f"共获取 {remaining} 条待处理记录")

        # ---- 分片处理 ----
        offset = 0
        processed = 0
        phase_counts = {"p1": 0, "p2": 0, "p3": 0, "p3_neutral": 0}
        start_time = time.time()

        while offset < remaining:
            batch = all_rows[offset:offset + CHECKPOINT_INTERVAL]
            if not batch:
                break

            batch_start = time.time()
            batch_updates = {}  # id -> tag

            # ---- 阶段1：历史人物（Python本地，毫秒级） ----
            for row in batch:
                row_id = row[0]
                result = self._phase1_check(row[2], row[3])
                if result:
                    batch_updates[row_id] = result
                    phase_counts["p1"] += 1

            # ---- 剩余不进阶段1的 ----
            phase2_candidates = [r for r in batch if r[0] not in batch_updates]

            # ---- 阶段2：关键词规则（Python本地，毫秒级） ----
            for row in phase2_candidates:
                row_id = row[0]
                result = self._phase2_check(row[5], row[3], row[4])
                if result:
                    batch_updates[row_id] = result
                    phase_counts["p2"] += 1

            # ---- 剩余不进阶段1/2的 ----
            phase3_ids = [r[0] for r in phase2_candidates if r[0] not in batch_updates]

            # ---- 阶段3：pgvector 语义分类（高速数据库运算） ----
            if phase3_ids:
                phase3_results = self._phase3_sql(phase3_ids)
                for pid, ptag in phase3_results:
                    batch_updates[pid] = ptag
                phase_counts["p3"] += len(phase3_results)
                phase_counts["p3_neutral"] += sum(1 for _, t in phase3_results if t == "中性")

            # ---- 批量写入数据库 ----
            if batch_updates:
                ids_list = list(batch_updates.keys())
                tags_list = [batch_updates[i] for i in ids_list]
                self.db.update_gender_tag(ids_list, tags_list)

            processed += len(batch)
            offset += len(batch)

            # ---- 输出进度 ----
            elapsed = time.time() - start_time
            pct = processed / remaining * 100
            rate = processed / elapsed if elapsed > 0 else 0
            est_remaining = (remaining - processed) / rate if rate > 0 else 0

            logger.info(
                f"进度: {processed}/{remaining} ({pct:.1f}%) | "
                f"耗时: {elapsed:.1f}s | "
                f"速率: {rate:.1f}条/秒 | "
                f"预估剩余: {est_remaining:.0f}s | "
                f"历史={phase_counts['p1']} 关键词={phase_counts['p2']} BGE-M3语义={phase_counts['p3']}"
            )

        # ---- 完成 ----
        total_time = time.time() - start_time
        dist = self.db.get_distribution()

        logger.info("\n" + "=" * 60)
        logger.info("[DONE] 打标完成！")
        logger.info(f"处理记录: {processed}")
        logger.info(f"总耗时: {total_time:.1f}秒 ({total_time/60:.1f}分钟)")
        if total_time > 0:
            logger.info(f"平均速率: {processed/total_time:.1f}条/秒")
        logger.info(f"\n[STATS] 各阶段贡献:")
        logger.info(f"  阶段1(历史人物): {phase_counts['p1']} ({phase_counts['p1']/processed*100:.1f}%)")
        logger.info(f"  阶段2(关键词):   {phase_counts['p2']} ({phase_counts['p2']/processed*100:.1f}%)")
        logger.info(f"  阶段3(BGE-M3):   {phase_counts['p3']} ({phase_counts['p3']/processed*100:.1f}%)")
        logger.info(f"  其中BGE-M3判中性: {phase_counts['p3_neutral']} ({phase_counts['p3_neutral']/max(phase_counts['p3'],1)*100:.1f}%)")
        logger.info(f"\n[STATS] 性别标签分布:")
        for tag, cnt in sorted(dist.items(), key=lambda x: -x[1]):
            logger.info(f"  {tag}: {cnt} ({cnt/total*100:.1f}%)")

        # ---- 抽样展示 ----
        self._print_samples()

    def _print_samples(self):
        """打印抽样结果"""
        for tag in ["男", "女", "中性"]:
            self.db.cur.execute("""
                SELECT id, book_name, chapter_name,
                       LEFT(ancient_text, 40) as preview,
                       LEFT(keywords, 60) as kw,
                       gender_tag
                FROM naming_classics
                WHERE gender_tag = %s
                LIMIT 5
            """, (tag,))
            samples = self.db.cur.fetchall()
            logger.info(f"\n[SAMPLE] {tag} 样本 ({len(samples)}条):")
            for s in samples:
                kw_txt = s[4][:50] if s[4] else ""
                logger.info(f"  ID={s[0]} | {s[1]} | {str(s[2])[:20] if s[2] else ''} | kw={kw_txt} | -> {s[5]}")


# ============================================================
# 主入口
# ============================================================

def main():
    logger.info("=" * 60)
    logger.info("[BOOKS] 典籍性别打标工具 v2.0 (优化版)")
    logger.info("[BOOKS] 利用已有向量嵌入 + pgvector 高速语义分类")
    logger.info("=" * 60)

    db = DatabaseManager()
    encoder = None
    engine = None

    try:
        # 1. 连接数据库
        logger.info("\n[步骤1/4] 连接数据库...")
        db.connect()
        total = db.get_total_count()
        logger.info(f"[OK] 连接成功，总记录数: {total}")

        # 2. 确保 gender_tag 列存在
        logger.info("\n[步骤2/4] 确保 gender_tag 列就绪...")
        db.cur.execute("""
            ALTER TABLE naming_classics
            ADD COLUMN IF NOT EXISTS gender_tag VARCHAR(10) DEFAULT NULL
        """)
        db.conn.commit()
        logger.info("[OK] gender_tag 列已就绪")

        # 3. 加载 BGE-M3（仅编码3个模板句子）
        logger.info("\n[步骤3/4] 加载 BGE-M3 编码器（仅编码3个性别标签模板）...")
        encoder = BGE_M3_Encoder()
        logger.info("[OK] BGE-M3 编码器已就绪")

        # 4. 执行三阶段打标
        logger.info("\n[步骤4/4] 执行三阶段性别打标...")
        engine = GenderTagEngine(db, encoder)
        engine.run()

        logger.info(f"\n{'='*60}")
        logger.info("[DONE] 全部完成！")
        logger.info(f"详细日志: {LOG_FILE}")
        logger.info(f"{'='*60}")

    except KeyboardInterrupt:
        logger.warning("[WARN] 用户中断，当前进度已保存（已提交批次不会丢失）")
    except Exception as e:
        logger.error(f"[FAIL] 执行失败: {e}")
        import traceback
        traceback.print_exc()
        if db and db.conn:
            db.conn.rollback()
    finally:
        if db:
            db.disconnect()


if __name__ == "__main__":
    main()
