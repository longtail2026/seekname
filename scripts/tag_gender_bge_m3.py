#!/usr/bin/env python3
"""
============================================================
  tag_gender_bge_m3.py
  典籍性别打标脚本
  使用 BGE-M3 零样本分类 + 历史人物 + 关键词规则
  三阶段递进策略对 naming_classics 表打上 gender_tag
============================================================
  打标逻辑：
    阶段1: 已知历史人物直接匹配（最高优先级）
    阶段2: 关键词规则快速分类
    阶段3: BGE-M3 零样本语义分类（兜底）
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
from dataclasses import dataclass
from datetime import datetime

# ============================================================
# 配置区
# ============================================================

# 数据库连接（从 check_table_structure.py 提取的 Vercel Neon URL）
DATABASE_URL = 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'

# BGE-M3 模型名称
MODEL_NAME = "BAAI/bge-m3"

# 批次大小（越小越省内存，越慢）
BATCH_SIZE = 32

# 每多少条记录写一次数据库（断点续传粒度）
CHECKPOINT_INTERVAL = 500

# 相似度判定阈值
SIMILARITY_THRESHOLD = 0.30       # 最低相似度，低于此值=中性
GENDER_DIFF_THRESHOLD = 0.05      # 男女得分差距阈，低于此值=中性

# 日志文件
LOG_FILE = "gender_tag_bge_m3.log"


# ============================================================
# 阶段1：已知历史人物清单
# ============================================================

HISTORICAL_MALES = [
    # 先秦思想家/儒家弟子
    "孔子", "孟子", "庄子", "老子", "荀子", "墨子", "韩非子",
    "管子", "列子", "曾子", "子思", "子贡", "颜回", "子路",
    "子夏", "子游", "子张", "子产", "子贱", "子华",
    "公西华", "冉有", "宰我", "樊迟", "有若", "闵子骞",
    "仲弓", "原思", "南宫适", "司马牛", "巫马期",
    # 先秦名臣名将
    "管仲", "晏婴", "叔向", "臧文仲", "柳下惠", "伯夷", "叔齐",
    "周公", "文王", "武王", "尧", "舜", "禹", "汤",
    "伊尹", "傅说", "姜尚", "周公旦", "召公", "太公",
    # 唐诗代表人物
    "李白", "杜甫", "王维", "孟浩然", "白居易", "杜牧", "李商隐",
    "王昌龄", "岑参", "王之涣", "刘禹锡", "韩愈", "柳宗元",
    "孟郊", "贾岛", "贺知章", "张籍", "韦应物", "陈子昂",
    "骆宾王", "卢照邻", "杨炯", "王勃", "高适", "元稹",
    # 宋词代表人物
    "苏轼", "辛弃疾", "李清照", "柳永", "周邦彦", "秦观",
    "欧阳修", "王安石", "陆游", "范仲淹", "岳飞", "文天祥",
    "姜夔", "晏殊", "晏几道", "张先", "贺铸", "黄庭坚",
    "晁补之", "张耒", "陈师道", "周敦颐", "程颐", "程颢",
    "朱熹", "邵雍", "司马光",
    # 楚辞相关
    "屈原", "宋玉", "楚怀王",
    # 诗经相关
    "尹吉甫", "召公",
]

HISTORICAL_FEMALES = [
    # 先秦女性（诗经/楚辞中）
    "西施", "王昭君", "貂蝉", "杨玉环", "杨贵妃",
    "妲己", "褒姒", "孟姜女", "祝英台", "织女", "嫦娥",
    "湘夫人", "湘君", "宓妃", "女娲", "王母", "西王母",
    "许穆夫人", "宣姜", "文姜", "息夫人", "夏姬",
    "赵飞燕", "卓文君", "蔡文姬", "谢道韫",
    "上官婉儿", "薛涛", "鱼玄机", "李冶",
    "花木兰", "秦罗敷", "莫愁", "绿珠",
]

# 合并为综合词典（用于快速匹配）
HISTORICAL_MALE_SET = set(HISTORICAL_MALES)
HISTORICAL_FEMALE_SET = set(HISTORICAL_FEMALES)


# ============================================================
# 阶段2：关键词规则
# ============================================================

# 男性倾向关键词
MALE_KEYWORDS = {
    "刚健", "英武", "雄壮", "豪迈", "阳刚", "俊朗", "宏大",
    "气魄", "雄浑", "边塞", "征战", "将军", "壮士", "英雄",
    "霸王", "君王", "天子", "帝王", "圣王", "贤君", "明君",
    "君子", "大丈夫", "丈夫", "男子", "男儿",
    "剑", "弓", "马", "戈", "戟", "矛", "盾",
    "刚", "强", "健", "武", "勇", "毅", "猛", "威",
    "龙", "虎", "豹", "鹰",
}

# 女性倾向关键词
FEMALE_KEYWORDS = {
    "柔美", "温婉", "娴淑", "秀丽", "优雅", "婉约", "婀娜",
    "相思", "清丽", "闺怨", "红颜", "佳人", "美人", "玉人",
    "仙子", "天仙", "婵娟", "淑女", "静女", "处子",
    "花", "月", "柳", "蝶", "燕", "莺",
    "柔", "婉", "淑", "秀", "丽", "雅", "娴", "静",
    "香", "兰", "蕙", "芝", "蓉", "莲", "荷", "桃", "杏",
    "胭脂", "罗裙", "绣", "钗", "环", "佩", "玉",
    "眉", "眸", "唇", "鬓", "髻", "黛",
    "春", "秋月", "落花",
}

# 中性关键词（遇到这些偏向中性）
NEUTRAL_KEYWORDS = {
    "自然", "智慧", "明德", "仁爱", "诚信", "中庸", "和谐",
    "道德", "仁义", "礼智", "忠信", "孝悌", "勤俭",
    "天", "地", "日", "月", "星", "辰", "山", "水",
    "仁", "义", "礼", "智", "信", "德", "道",
}


# ============================================================
# 阶段3：BGE-M3 零样本分类标签模板
# ============================================================

GENDER_TEMPLATES = {
    "男": "适合男孩取名的文字，阳刚、英武、雄壮、豪迈、刚健、有男子气概、体现力量与担当",
    "女": "适合女孩取名的文字，柔美、温婉、娴淑、秀丽、优雅、有女子气质、体现温柔与美好",
    "中性": "中性通用的文字，适合男女皆可取名，平和、自然、智慧、高雅、不偏向任何性别",
}


# ============================================================
# 日志配置
# ============================================================

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
# BGE-M3 零样本分类器
# ============================================================

class BGE_M3_GenderClassifier:
    """使用 BGE-M3 进行性别零样本分类"""

    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.device = None
        self.label_embeddings = {}  # 缓存标签模板嵌入
        self.label_names = ["男", "女", "中性"]
        self._load_model()
        self._compute_label_embeddings()

    def _load_model(self):
        """加载 BGE-M3 模型"""
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
        """预计算所有标签模板的嵌入向量"""
        import torch

        templates = [GENDER_TEMPLATES[label] for label in self.label_names]

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

        for i, label in enumerate(self.label_names):
            self.label_embeddings[label] = embeddings[i]

        logger.info(f"[BGE-M3] 已预计算 {len(self.label_names)} 个标签模板嵌入")

    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """编码文本批次为嵌入向量"""
        import torch

        if not texts:
            return np.array([])

        embeddings = []
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                encoded = self.tokenizer(
                    batch,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors='pt'
                ).to(self.device)

                output = self.model(**encoded)
                batch_emb = output.last_hidden_state[:, 0]
                batch_emb = torch.nn.functional.normalize(batch_emb, p=2, dim=1)
                embeddings.append(batch_emb.cpu().numpy())

        return np.vstack(embeddings) if embeddings else np.array([])

    def classify_batch(self, texts: List[str]) -> List[str]:
        """对一批文本进行性别分类，返回标签列表"""
        if not texts:
            return []

        text_embeddings = self.encode(texts, batch_size=BATCH_SIZE)
        if len(text_embeddings) == 0:
            return ["中性"] * len(texts)

        results = []
        label_vecs = np.array([self.label_embeddings[l] for l in self.label_names])

        for emb in text_embeddings:
            # 计算与三个标签的余弦相似度
            similarities = np.dot(label_vecs, emb)

            idx_male = 0   # "男"
            idx_female = 1  # "女"
            idx_neutral = 2 # "中性"

            max_idx = np.argmax(similarities)
            max_sim = similarities[max_idx]

            # 低于阈值 → 中性
            if max_sim < SIMILARITY_THRESHOLD:
                results.append("中性")
                continue

            # 如果"中性"得分最高且差距够大 → 中性
            if max_idx == idx_neutral:
                male_diff = similarities[idx_neutral] - similarities[idx_male]
                female_diff = similarities[idx_neutral] - similarities[idx_female]
                if male_diff > GENDER_DIFF_THRESHOLD and female_diff > GENDER_DIFF_THRESHOLD:
                    results.append("中性")
                else:
                    # 中性优势不大，看男女谁高
                    if similarities[idx_male] > similarities[idx_female]:
                        results.append("男" if similarities[idx_male] - similarities[idx_female] > GENDER_DIFF_THRESHOLD else "中性")
                    else:
                        results.append("女" if similarities[idx_female] - similarities[idx_male] > GENDER_DIFF_THRESHOLD else "中性")
                continue

            # 男 vs 女 对比
            male_sim = similarities[idx_male]
            female_sim = similarities[idx_female]

            if male_sim > female_sim + GENDER_DIFF_THRESHOLD:
                results.append("男")
            elif female_sim > male_sim + GENDER_DIFF_THRESHOLD:
                results.append("女")
            else:
                results.append("中性")

        return results


# ============================================================
# 数据库操作
# ============================================================

class DatabaseManager:
    """数据库操作管理器"""

    def __init__(self, url: str = DATABASE_URL):
        self.url = url
        self.conn = None
        self.cur = None

    def connect(self):
        """连接数据库"""
        import psycopg2
        self.conn = psycopg2.connect(self.url)
        self.cur = self.conn.cursor()
        logger.info("[DB] 已连接到 Neon 数据库")

    def disconnect(self):
        """断开连接"""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()
        logger.info("[DB] 已断开数据库连接")

    def add_gender_tag_column(self):
        """添加 gender_tag 列（如果不存在）"""
        self.cur.execute("""
            ALTER TABLE naming_classics
            ADD COLUMN IF NOT EXISTS gender_tag VARCHAR(10) DEFAULT NULL
        """)
        self.conn.commit()
        logger.info("[DB] gender_tag 列已添加/已存在")

    def get_total_count(self) -> int:
        """获取总记录数"""
        self.cur.execute("SELECT COUNT(*) FROM naming_classics")
        return self.cur.fetchone()[0]

    def get_tagged_count(self) -> int:
        """获取已打标的记录数"""
        self.cur.execute("""
            SELECT COUNT(*) FROM naming_classics
            WHERE gender_tag IS NOT NULL
        """)
        return self.cur.fetchone()[0]

    def fetch_batch(self, limit: int) -> List[Tuple]:
        """获取一批待处理记录（自动跳过已打标）"""
        self.cur.execute("""
            SELECT id, book_name, chapter_name, ancient_text, modern_text, keywords
            FROM naming_classics
            WHERE gender_tag IS NULL
            ORDER BY id
            LIMIT %s
        """, (limit,))
        return self.cur.fetchall()

    def update_batch(self, updates: List[Tuple[str, int]]):
        """
        批量更新 gender_tag
        updates: [(gender_tag, id), ...]
        """
        from psycopg2.extras import execute_values

        # 构建要更新的数据: (id, gender_tag)
        data = [(uid, tag) for tag, uid in updates]

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
        """提交事务"""
        self.conn.commit()

    def rollback(self):
        """回滚事务"""
        self.conn.rollback()

    def get_distribution(self) -> Dict[str, int]:
        """获取性别标签分布统计"""
        self.cur.execute("""
            SELECT gender_tag, COUNT(*) as cnt
            FROM naming_classics
            WHERE gender_tag IS NOT NULL
            GROUP BY gender_tag
            ORDER BY cnt DESC
        """)
        return {row[0]: row[1] for row in self.cur.fetchall()}

    def get_sample_with_gender(self, tag: str, limit: int = 5) -> List[Tuple]:
        """获取指定标签的样本记录"""
        self.cur.execute("""
            SELECT id, book_name, chapter_name,
                   SUBSTRING(ancient_text FROM 1 FOR 60) as preview,
                   keywords, gender_tag
            FROM naming_classics
            WHERE gender_tag = %s
            LIMIT %s
        """, (tag, limit))
        return self.cur.fetchall()


# ============================================================
# 核心打标引擎
# ============================================================

class GenderTagEngine:
    """三阶段性别打标引擎"""

    def __init__(self, db: DatabaseManager, classifier: BGE_M3_GenderClassifier):
        self.db = db
        self.classifier = classifier
        self.stats = {"phase1_historical": 0, "phase2_keyword": 0, "phase3_bgem3": 0}
        self.results_cache = {}  # id -> gender_tag

    def _phase1_historical_check(self, chapter_name: str, ancient_text: str) -> Optional[str]:
        """
        阶段1：已知历史人物直接匹配
        检查 chapter_name 和 ancient_text 中是否出现已知性别的历史人物
        """
        text = f"{chapter_name or ''} {ancient_text or ''}"

        # 男性人物匹配
        for person in HISTORICAL_MALE_SET:
            if person in text:
                return "男"

        # 女性人物匹配
        for person in HISTORICAL_FEMALE_SET:
            if person in text:
                return "女"

        return None

    def _phase2_keyword_check(self, keywords_str: str, ancient_text: str, modern_text: str) -> Optional[str]:
        """
        阶段2：关键词规则分类
        检查 keywords、原文、现代文中的性别暗示
        """
        combined = f"{keywords_str or ''} {ancient_text or ''} {modern_text or ''}".lower()

        male_score = 0
        female_score = 0

        for kw in MALE_KEYWORDS:
            if kw in combined:
                male_score += 1

        for kw in FEMALE_KEYWORDS:
            if kw in combined:
                female_score += 1

        # 中性关键词抵消
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

        return None  # 无法确定，交给阶段3

    def _prepare_classification_text(self, row: Tuple) -> str:
        """为 BGE-M3 分类准备文本"""
        _, book_name, chapter_name, ancient_text, modern_text, keywords = row

        parts = []
        if chapter_name:
            parts.append(chapter_name)
        if keywords:
            parts.append(f"关键词：{keywords}")
        if ancient_text:
            # 取前200字（BGE-M3 对长文本也能处理，但缩短可提高速度）
            parts.append(ancient_text[:200])
        if modern_text:
            parts.append(modern_text[:200])

        return "。".join(parts)

    def run(self):
        """执行全量打标"""
        import psycopg2

        total = self.db.get_total_count()
        tagged_before = self.db.get_tagged_count()
        remaining = total - tagged_before

        logger.info(f"=" * 60)
        logger.info(f"📊 数据库统计")
        logger.info(f"总记录数: {total}")
        logger.info(f"已打标: {tagged_before}")
        logger.info(f"待处理: {remaining}")
        logger.info(f"=" * 60)

        if remaining == 0:
            logger.info("✅ 所有记录已打标，无需处理")
            return

        # 分片处理
        offset = 0
        processed = 0
        phase_counts = {"phase1": 0, "phase2": 0, "phase3": 0, "phase3_neutral": 0}
        start_time = time.time()

        while offset < remaining:
            batch = self.db.fetch_batch(CHECKPOINT_INTERVAL)
            if not batch:
                break

            batch_start = time.time()
            batch_updates = []

            # ---- 阶段1：历史人物匹配 ----
            phase1_batch = []  # 需要后续处理的记录

            for row in batch:
                _, book_name, chapter_name, ancient_text, modern_text, keywords = row
                result = self._phase1_historical_check(chapter_name, ancient_text)

                if result:
                    batch_updates.append((result, row[0]))
                    self.stats["phase1_historical"] += 1
                    phase_counts["phase1"] += 1
                else:
                    phase1_batch.append(row)

            # ---- 阶段2：关键词规则 ----
            phase2_batch = []

            for row in phase1_batch:
                _, _, _, ancient_text, modern_text, keywords = row
                result = self._phase2_keyword_check(keywords, ancient_text, modern_text)

                if result:
                    batch_updates.append((result, row[0]))
                    self.stats["phase2_keyword"] += 1
                    phase_counts["phase2"] += 1
                else:
                    phase2_batch.append(row)

            # ---- 阶段3：BGE-M3 语义分类 ----
            if phase2_batch:
                texts = [self._prepare_classification_text(row) for row in phase2_batch]
                labels = self.classifier.classify_batch(texts)

                for i, label in enumerate(labels):
                    batch_updates.append((label, phase2_batch[i][0]))

                self.stats["phase3_bgem3"] += len(labels)
                phase_counts["phase3"] += len(labels)
                phase_counts["phase3_neutral"] += sum(1 for l in labels if l == "中性")

            # ---- 批量写入数据库 ----
            if batch_updates:
                self.db.update_batch(batch_updates)

            processed += len(batch)
            offset += len(batch)

            # ---- 输出进度 ----
            elapsed = time.time() - start_time
            batch_time = time.time() - batch_start
            rate = processed / elapsed if elapsed > 0 else 0
            est_remaining = (remaining - processed) / rate if rate > 0 else 0

            pct = processed / remaining * 100
            logger.info(
                f"进度: {processed}/{remaining} ({pct:.1f}%) | "
                f"耗时: {elapsed:.1f}s | "
                f"速率: {rate:.1f}条/秒 | "
                f"预估剩余: {est_remaining:.0f}s | "
                f"阶段1={phase_counts['phase1']} 阶段2={phase_counts['phase2']} 阶段3={phase_counts['phase3']}"
            )

        # ---- 完成 ----
        total_time = time.time() - start_time

        logger.info(f"\n{'='*60}")
        logger.info(f"✅ 打标完成！")
        logger.info(f"处理记录: {processed}")
        logger.info(f"总耗时: {total_time:.1f}秒 ({total_time/60:.1f}分钟)")
        logger.info(f"平均速率: {processed/total_time:.1f}条/秒" if total_time > 0 else "")
        logger.info(f"\n📊 各阶段贡献:")
        logger.info(f"  阶段1(历史人物): {self.stats['phase1_historical']} ({self.stats['phase1_historical']/processed*100:.1f}%)")
        logger.info(f"  阶段2(关键词):   {self.stats['phase2_keyword']} ({self.stats['phase2_keyword']/processed*100:.1f}%)")
        logger.info(f"  阶段3(BGE-M3):   {self.stats['phase3_bgem3']} ({self.stats['phase3_bgem3']/processed*100:.1f}%)")
        logger.info(f"  其中BGE-M3判中性: {phase_counts['phase3_neutral']} ({phase_counts['phase3_neutral']/max(self.stats['phase3_bgem3'],1)*100:.1f}%)")

        # ---- 分布统计 ----
        dist = self.db.get_distribution()
        logger.info(f"\n📊 性别标签分布:")
        for tag, cnt in sorted(dist.items(), key=lambda x: -x[1]):
            logger.info(f"  {tag}: {cnt} ({cnt/total*100:.1f}%)")

    def print_samples(self):
        """打印抽样结果"""
        for tag in ["男", "女", "中性"]:
            samples = self.db.get_sample_with_gender(tag, limit=5)
            logger.info(f"\n📝 {tag} 样本 (5条):")
            for s in samples:
                logger.info(f"  ID={s[0]} | {s[1]} | {s[2][:30] if s[2] else ''} | kw={s[3][:40] if s[3] else ''} | → {s[4]}")


# ============================================================
# 主入口
# ============================================================

def main():
    """主函数"""
    logger.info(f"{'='*60}")
    logger.info(f"📚 典籍性别打标工具 v1.0")
    logger.info(f"{'='*60}")

    db = DatabaseManager()
    classifier = None
    engine = None

    try:
        # 1. 连接数据库
        logger.info("\n[步骤1/4] 连接数据库...")
        db.connect()
        total = db.get_total_count()
        logger.info(f"  ✅ 连接成功，总记录数: {total}")

        # 2. 添加 gender_tag 列
        logger.info("\n[步骤2/4] 添加 gender_tag 列...")
        db.add_gender_tag_column()
        logger.info("  ✅ gender_tag 列已就绪")

        # 3. 加载 BGE-M3 模型
        logger.info("\n[步骤3/4] 加载 BGE-M3 分类器...")
        classifier = BGE_M3_GenderClassifier()
        logger.info("  ✅ BGE-M3 分类器已就绪")

        # 4. 执行打标
        logger.info("\n[步骤4/4] 执行三阶段性别打标...")
        engine = GenderTagEngine(db, classifier)
        engine.run()

        # 5. 输出抽样结果
        engine.print_samples()

        logger.info(f"\n{'='*60}")
        logger.info(f"🎉 全部完成！")
        logger.info(f"详细日志: {LOG_FILE}")
        logger.info(f"{'='*60}")

    except KeyboardInterrupt:
        logger.warning("\n⚠️ 用户中断，当前进度已保存（已提交批次不会丢失）")
    except Exception as e:
        logger.error(f"\n❌ 执行失败: {e}")
        import traceback
        traceback.print_exc()
        if db:
            db.rollback()
    finally:
        if db:
            db.disconnect()


if __name__ == "__main__":
    main()
