#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================
  build_naming_materials.py (v2 - 智能提取版)
  
  基于本地 classics_entries 典籍数据(124k条)生成起名素材表 naming_materials
  
  核心策略：
  1. TF-IDF + PCA 快速文本聚类
  2. **每个聚类优先提取最适合作名字的2字短语**
     - 使用"起名好字"评分体系
     - 过滤文言虚词和通用语法结构
     - 优先自然意象、品德修养、美好寓意
  3. 素材短语用BGE-M3编码
  4. 写入 naming_materials 表
==============================================================
"""
import os, sys, json, re, time, gc, pickle, struct
import logging
import numpy as np
import psycopg2
from collections import Counter, defaultdict
from typing import List, Dict, Optional, Tuple, Set
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import PCA
from sklearn.cluster import MiniBatchKMeans

# ============================
# 配置
# ============================
DB_CONFIG = dict(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "5432")),
    database=os.getenv("DB_NAME", "seekname_db"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD", "postgres"),
)

BGE_MODEL_NAME = "BAAI/bge-m3"
N_CLUSTERS = 300               # 聚类数（更多聚类=更细粒度素材）
MIN_CLUSTER_SIZE = 5           # 最小聚类条目数
MAX_MATERIALS = 500            # 最大素材数
OUTPUT_DIR = "scripts/output_naming_materials"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 日志
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(OUTPUT_DIR, 'build.log'), encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger('build_materials')


# ====================================================================
# 起名用字评分体系
# ====================================================================

# ⭐⭐⭐ 顶级起名好字（强烈推荐，寓意美好）
TOP_NAMING_CHARS: Set[str] = set(
    '清溪书瑶若兰婉婷雅静宁慧馨瑶琼玉洁'
    '轩逸晨宇浩然博文君泽睿涵皓然云天'
    '明哲思远舒畅欣悦安澜悠从容若水'
    '芷柔艺馨沐禾韵墨画意诗琴棋书香'
)

# ⭐⭐ 优秀起名字（推荐）
GOOD_NAMING_CHARS: Set[str] = set(
    '德仁义礼智信忠孝恕诚谦善慈恭让和'
    '天地日月山风云雨雪星河海溪林泉'
    '竹兰梅菊松荷柳花草石霜露霞虹'
    '强健勇毅恒坚正直锐劲宏远志刚'
    '美丽雅洁清秀婉柔华丽婷淑娴宁'
    '明珠睿哲智慧颖达通博渊涵悟旷'
    '瑾瑜珂琳璇琪琛玮瑶环玲珑珊珀'
    '枫柏松楠杉桐桃杏荔蓉棠樱杨柳'
    '鸿鹏鹤鸾凤鹰燕鸥鹭莺鹊鸽雁'
    '龙麟麒鹿鹤龟松柏枫'
)

# ❌ 文言虚词/停用字（不适合起名）
STOP_CHARS: Set[str] = set(
    '之乎者也乃而于以其所与及则者所为何若焉兮耳矣但然'
    '已虽然或且在亦由是故此如又而非既将'
    '不无有能可使被从对为因与到'
)

# ❌ 非起名适用短语（常见文言结构，不适合做名字）
BAD_PHRASE_PATTERNS: List[re.Pattern] = [
    re.compile(r'^不.'),      # 不可、不能、不知
    re.compile(r'^有.'),      # 有之、有如
    re.compile(r'^无.'),      # 无如、无乃
    re.compile(r'.$之$'),     # 久之、总之
    re.compile(r'^其.'),      # 其实、其他
    re.compile(r'^是.'),      # 是故、是以
    re.compile(r'^所.'),      # 所以、所谓
    re.compile(r'^诸.'),      # 诸侯、诸将
    re.compile(r'^子.'),      # 子曰、子路
    re.compile(r'^左右$'),    # 专属排除
    re.compile(r'^上下$'),
    re.compile(r'^天下$'),
    re.compile(r'^春秋$'),
]

# ⚙️ 五行映射
WUXING_MAP = {
    '水': '水', '溪': '水', '海': '水', '泉': '水', '霜': '水', '雪': '水',
    '雨': '水', '露': '水', '江': '水', '河': '水', '湖': '水', '波': '水',
    '火': '火', '日': '火', '星': '火', '霞': '火', '光': '火', '明': '火',
    '土': '土', '山': '土', '石': '土', '峰': '土', '岳': '土', '岩': '土',
    '木': '木', '林': '木', '竹': '木', '兰': '木', '梅': '木', '松': '木',
    '柳': '木', '花': '木', '枫': '木', '柏': '木', '桐': '木', '桂': '木',
    '金': '金', '玉': '金', '瑶': '金', '琼': '金', '刚': '金', '剑': '金',
    '铭': '金', '锐': '金',
}

# 👤 性别倾向
FEMININE_CHARS: Set[str] = set(
    '婉婷雅静宁慧馨瑶琼玉洁芷柔艺'
    '姝媚姣娟娇嫣娥娜姿妙媛'
    '兰梅菊荷柳棠杏荔蓉樱'
)
MASCULINE_CHARS: Set[str] = set(
    '刚强健勇毅恒坚正刚锐劲宏远志'
    '龙麟鸿鹏鹤霆震威浩瀚宇'
    '峰岳岩松柏楠杉桐'
)


# ============================
# 1. 加载数据
# ============================
def load_classics_entries(conn, use_sample: int = None) -> List[Dict]:
    """从 classics_entries 加载典籍文本"""
    cur = conn.cursor()
    
    if use_sample:
        sql = "SELECT id, book_name, chapter_name, ancient_text, modern_text FROM classics_entries ORDER BY RANDOM() LIMIT %s"
        cur.execute(sql, (use_sample,))
        logger.warning(f"⚠ 使用抽样模式: {use_sample} 条（仅用于测试）")
    else:
        sql = "SELECT id, book_name, chapter_name, ancient_text, modern_text FROM classics_entries ORDER BY id"
        cur.execute(sql)
    
    rows = cur.fetchall()
    logger.info(f"从 classics_entries 加载了 {len(rows)} 条记录")
    
    records = []
    for r in rows:
        records.append({
            'id': r[0],
            'book_name': r[1] or '',
            'chapter': r[2] or '',
            'ancient_text': r[3] or '',
            'modern_text': r[4] or '',
        })
    
    # 统计
    text_lens = [len(r['ancient_text']) for r in records]
    logger.info(f"原文长度: min={min(text_lens)}, max={max(text_lens)}, avg={np.mean(text_lens):.0f}")
    
    return records


# ============================
# 2. TF-IDF 文本特征提取 + PCA降维
# ============================
def extract_text_features(records: List[Dict], n_features: int = 5000) -> np.ndarray:
    """使用TF-IDF提取文本特征，PCA降维到64维"""
    texts = []
    for r in records:  # 处理全部记录
        t = r['ancient_text'][:300]
        if r['modern_text']:
            t += '。' + r['modern_text'][:100]
        texts.append(t)
    
    logger.info(f"TF-IDF 特征提取（{len(texts)}条, {n_features}维）...")
    t0 = time.time()
    
    vectorizer = TfidfVectorizer(
        analyzer='char',
        ngram_range=(1, 3),
        max_features=n_features,
        sublinear_tf=True,
        dtype=np.float32,
    )
    tfidf = vectorizer.fit_transform(texts)
    logger.info(f"  TF-IDF 矩阵: {tfidf.shape}, 耗时 {time.time()-t0:.1f}s")
    
    # PCA 降维
    pca_dim = min(64, tfidf.shape[0], tfidf.shape[1])
    logger.info(f"  PCA 降维到 {pca_dim} 维...")
    t0 = time.time()
    pca = PCA(n_components=pca_dim, random_state=42)
    features = pca.fit_transform(tfidf.toarray())
    logger.info(f"  PCA 完成, shape={features.shape}, 耗时 {time.time()-t0:.1f}s")
    
    # 保存模型
    with open(os.path.join(OUTPUT_DIR, 'pca_model.pkl'), 'wb') as f:
        pickle.dump(pca, f)
    with open(os.path.join(OUTPUT_DIR, 'tfidf_vectorizer.pkl'), 'wb') as f:
        pickle.dump(vectorizer, f)
    
    return features


# ============================
# 3. MiniBatchKMeans 聚类
# ============================
def run_clustering(features: np.ndarray, n_clusters: int = N_CLUSTERS) -> np.ndarray:
    n = len(features)
    n_clusters = min(n_clusters, n // 3)
    logger.info(f"聚类: {n} 条 -> {n_clusters} 类")
    
    t0 = time.time()
    kmeans = MiniBatchKMeans(
        n_clusters=n_clusters,
        batch_size=4096,
        random_state=42,
        verbose=0,
    )
    labels = kmeans.fit_predict(features)
    logger.info(f"聚类完成, 耗时 {time.time()-t0:.1f}s")
    
    # 统计
    unique, counts = np.unique(labels, return_counts=True)
    size_dist = sorted(counts, reverse=True)
    valid = sum(1 for c in counts if c >= MIN_CLUSTER_SIZE)
    logger.info(f"聚类大小: min={size_dist[-1]}, max={size_dist[0]}, avg={np.mean(size_dist):.0f}")
    logger.info(f"有效聚类 (>={MIN_CLUSTER_SIZE}条): {valid}/{len(counts)}")
    
    with open(os.path.join(OUTPUT_DIR, 'kmeans_model.pkl'), 'wb') as f:
        pickle.dump(kmeans, f)
    
    return labels


# ============================
# 4. 🔥 核心：智能起名素材提取
# ============================

def extract_candidate_phrases(text: str) -> Set[str]:
    """从文本提取所有2字短语候选"""
    if not text:
        return set()
    chars = re.findall(r'[\u4e00-\u9fa5]', text)
    if len(chars) < 2:
        return set()
    phrases = set()
    for i in range(len(chars) - 1):
        c1, c2 = chars[i], chars[i + 1]
        if c1 not in STOP_CHARS and c2 not in STOP_CHARS and c1 != c2:
            phrases.add(c1 + c2)
    return phrases


def score_phrase_for_naming(phrase: str) -> float:
    """
    给一个2字短语打出"起名适用性"评分
    高分的才是真正适合做名字的素材
    """
    if len(phrase) != 2:
        return -999
    
    # 硬性排除：文言虚词结构
    for pat in BAD_PHRASE_PATTERNS:
        if pat.match(phrase):
            return -100
    
    c1, c2 = phrase
    score = 0.0
    
    # === 正向加分 ===
    # 两个都是顶级起名字
    if c1 in TOP_NAMING_CHARS:
        score += 8
    if c2 in TOP_NAMING_CHARS:
        score += 8
    
    # 优秀起名字
    if c1 in GOOD_NAMING_CHARS:
        score += 4
    if c2 in GOOD_NAMING_CHARS:
        score += 4
    
    # 自然意象组合（山+水, 云+月 等）额外加分
    nature = {'天','地','日','月','山','水','云','风','雨','雪','星','海','溪','林','竹','兰','梅','菊'}
    if c1 in nature and c2 in nature:
        score += 5
    
    # 品德组合加分
    virtue = {'德','仁','义','礼','智','信','忠','孝','诚','谦','善','慈','恭','和'}
    if c1 in virtue and c2 in virtue:
        score += 4
    
    # 美好组合
    beauty = {'美','雅','清','秀','婉','柔','华','婷','静','淑','娴','宁','慧','馨'}
    if c1 in beauty and c2 in beauty:
        score += 4
    
    # 一个顶级+一个优秀
    if (c1 in TOP_NAMING_CHARS and c2 in GOOD_NAMING_CHARS) or \
       (c2 in TOP_NAMING_CHARS and c1 in GOOD_NAMING_CHARS):
        score += 3
    
    # === 微小负向 ===
    # 纯形容词组合稍弱
    adj_set = {'大','小','高','低','长','短','远','近','多','少'}
    if c1 in adj_set or c2 in adj_set:
        score -= 1
    
    # 数字相关
    num_set = {'一','二','三','四','五','六','七','八','九','十','百','千','万'}
    if c1 in num_set or c2 in num_set:
        score -= 2
    
    return score


def determine_theme(records: List[Dict]) -> str:
    """判定聚类主题类型"""
    texts = [r.get('ancient_text', '') for r in records[:50]]
    all_text = ''.join(texts)
    
    themes = []
    if any(kw in all_text for kw in ['诗','歌','乐','舞','琴','瑟','音']):
        themes.append('音乐艺术')
    if any(kw in all_text for kw in ['天','地','日','月','星','山','水','海','云']):
        themes.append('自然山水')
    if any(kw in all_text for kw in ['德','仁','义','礼','智','信','圣','贤','君']):
        themes.append('品德修养')
    if any(kw in all_text for kw in ['春','夏','秋','冬','花','雪','月','风']):
        themes.append('四季风景')
    if any(kw in all_text for kw in ['战','兵','军','将','武','伐','攻','守']):
        themes.append('征战军旅')
    if any(kw in all_text for kw in ['道','法','自然','太极','阴阳','虚无']):
        themes.append('道家哲学')
    if any(kw in all_text for kw in ['孝','亲','父','母','兄','弟','家','国']):
        themes.append('家国伦理')
    if any(kw in all_text for kw in ['学','习','教','师','问','知','识','书']):
        themes.append('学问教育')
    
    if themes:
        return themes[0]
    
    # 从book_name推断
    book = records[0].get('book_name', '')
    if '诗经' in book:
        return '古风典雅'
    if '楚辞' in book:
        return '浪漫瑰丽'
    if any(k in book for k in ['论语','孟子','大学','中庸']):
        return '儒家思想'
    if any(k in book for k in ['道德经','庄子','列子']):
        return '道家哲学'
    if '三国' in book or '演义' in book:
        return '豪迈壮志'
    
    return '古典文雅'


def extract_best_phrase_from_cluster(records: List[Dict]) -> Tuple[Optional[str], int]:
    """
    从聚类中提取最好的2字起名短语
    返回 (best_phrase, confidence_score)
    """
    # 1. 收集所有短语及其出现次数
    phrase_counter = Counter()
    char_set = set()  # 所有单字
    
    for r in records:
        text = r.get('ancient_text', '') or ''
        chars = re.findall(r'[\u4e00-\u9fa5]', text)
        char_set.update(chars)
        
        for i in range(len(chars) - 1):
            c1, c2 = chars[i], chars[i + 1]
            if c1 not in STOP_CHARS and c2 not in STOP_CHARS:
                phrase_counter[c1 + c2] += 1
    
    if not phrase_counter:
        return None, 0
    
    # 2. 对每个短语打分（合并频率和语义评分）
    scored_phrases = []
    for phrase, freq in phrase_counter.most_common(200):  # 只看前200高频
        naming_score = score_phrase_for_naming(phrase)
        if naming_score < -50:
            continue  # 跳过明显不适合的
        # 加权：语义评分占主导，频率做微调
        total_score = naming_score * 3 + min(freq, 50) * 0.5
        scored_phrases.append((total_score, phrase, freq))
    
    # 3. 排序取最佳
    scored_phrases.sort(key=lambda x: -x[0])
    
    if not scored_phrases:
        return None, 0
    
    best = scored_phrases[0]
    best_phrase = best[1]
    score_threshold = 15  # 最低可接受评分
    
    if best[0] < score_threshold:
        # 如果最好的都不够好，尝试放宽条件——找组合里有好字的
        for s, p, f in scored_phrases[:10]:
            if any(c in TOP_NAMING_CHARS or c in GOOD_NAMING_CHARS for c in p):
                return p, int(s)
        return None, 0
    
    return best_phrase, int(best[0])


def extract_material_from_cluster(records: List[Dict]) -> Optional[Dict]:
    """
    从单个聚类中提取一个起名素材
    完全重写：优先语义质量而非频率
    """
    if len(records) < MIN_CLUSTER_SIZE:
        return None
    
    cluster_id = records[0].get('_cluster_id', 0)
    
    # 1. 找最佳起名短语
    best_phrase, confidence = extract_best_phrase_from_cluster(records)
    if not best_phrase:
        return None
    
    # 2. 找代表记录（包含此短语）
    representative = None
    for r in records:
        if best_phrase in (r.get('ancient_text', '') or ''):
            representative = r
            break
    if not representative:
        representative = records[0]
    
    ancient = representative.get('ancient_text', '') or ''
    modern = representative.get('modern_text', '') or ''
    book = representative.get('book_name', '') or ''
    chapter = representative.get('chapter', '') or ''
    
    # 3. 出处
    src = f"{book}·{chapter}" if book and chapter else book or chapter or ''
    if len(src) > 100:
        src = src[:100]
    
    # 4. 原文片段
    snippet = ''
    if best_phrase in ancient:
        idx = ancient.index(best_phrase)
        start = max(0, idx - 8)
        end = min(len(ancient), idx + len(best_phrase) + 15)
        snippet = ancient[start:end]
    else:
        snippet = ancient[:60]
    if len(snippet) > 300:
        snippet = snippet[:300]
    
    # 5. 意义（取译文相关部分）
    meaning = ''
    if modern:
        chars = re.findall(r'[\u4e00-\u9fa5]', modern)
        meaning = ''.join(chars[:30])
    if len(meaning) > 100:
        meaning = meaning[:100]
    
    # 6. 风格和关键词
    theme = determine_theme(records[:20])
    style_set = {theme}
    keyword_set = set()
    
    for c in best_phrase:
        if c in TOP_NAMING_CHARS:
            keyword_set.add('美好')
            style_set.add('雅致')
        if c in {'德','仁','义','礼','智','信','忠','孝','诚'}:
            keyword_set.add('品德')
            style_set.add('品德修养')
        if c in {'天','地','日','月','山','水','云','风','雨','雪','星','海','溪','林'}:
            keyword_set.add('自然')
            style_set.add('自然意象')
        if c in {'竹','兰','梅','菊','松','荷','柳','花','草'}-{'花'}:
            keyword_set.add('自然')
            style_set.add('清雅高洁')
        if c in {'强','健','勇','毅','恒','坚','刚','正','直','远'}:
            keyword_set.add('坚强')
            style_set.add('志向远大')
        if c in {'美','雅','清','秀','婉','柔','华','婷','静','淑'}:
            keyword_set.add('美好')
            style_set.add('温婉典雅')
        if c in {'明','睿','哲','智','慧','悟','颖','达','通','博','渊'}:
            keyword_set.add('智慧')
            style_set.add('睿智明达')
    
    if not keyword_set:
        # 回退：用主题推断
        if theme == '自然山水':
            keyword_set.add('自然')
        else:
            keyword_set.add('文雅')
    
    if not style_set:
        style_set.add('古典')
    
    # 7. 性别推断
    scores = {'F': 0, 'M': 0}
    for c in best_phrase:
        if c in FEMININE_CHARS: scores['F'] += 2
        if c in MASCULINE_CHARS: scores['M'] += 2
        if c in TOP_NAMING_CHARS:
            # 从默认倾向判断
            if c in {'轩','逸','晨','宇','浩','然','博','文','涵'}:
                scores['M'] += 1
            elif c in {'清','溪','书','瑶','若','兰','婉','婷','雅','静','宁','慧','馨'}:
                scores['F'] += 1
    
    if scores['F'] >= 3 and scores['F'] > scores['M']:
        gender = 'F'
    elif scores['M'] >= 3 and scores['M'] > scores['F']:
        gender = 'M'
    else:
        gender = 'B'
    
    # 8. 五行
    wuxing_set = set()
    for c in best_phrase:
        if c in WUXING_MAP:
            wuxing_set.add(WUXING_MAP[c])
    wuxing = ''.join(wuxing_set) if wuxing_set else ''
    
    # 9. 姓氏组合（自动生成示例）
    surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '周']
    combos = [f"{s}{best_phrase}" for s in surnames[:6]]
    
    # 10. 质量评分
    quality = 3  # 默认
    if confidence >= 50:
        quality = 5
    elif confidence >= 30:
        quality = 4
    elif best_phrase[0] in TOP_NAMING_CHARS or best_phrase[1] in TOP_NAMING_CHARS:
        quality = 4
    
    material = {
        'phrase': best_phrase,
        'source': src,
        'source_snippet': snippet,
        'meaning': meaning,
        'keywords': sorted(keyword_set)[:5],
        'style': sorted(style_set)[:3],
        'gender': gender,
        'wuxing': wuxing,
        'quality': quality,
        'combos': combos,
        '_cluster_id': cluster_id,
        '_source_count': len(records),
        '_confidence': confidence,
    }
    
    return material


def extract_all_materials(records: List[Dict], cluster_labels: np.ndarray) -> List[Dict]:
    """从所有聚类提取素材（按质量排序）"""
    # 分组
    clusters: Dict[int, List[Dict]] = {}
    for i, rec in enumerate(records):
        cid = int(cluster_labels[i])
        if cid not in clusters:
            clusters[cid] = []
        rec['_cluster_id'] = cid
        clusters[cid].append(rec)
    
    logger.info(f"共 {len(clusters)} 个聚类")
    
    # 提取素材
    materials = []
    for cid in sorted(clusters.keys()):
        group = clusters[cid]
        if len(group) < MIN_CLUSTER_SIZE:
            continue
        m = extract_material_from_cluster(group)
        if m:
            materials.append(m)
            if len(materials) % 50 == 0:
                logger.info(f"  已提取 {len(materials)} 个素材...")
    
    # 按质量+置信度排序，去重
    materials.sort(key=lambda x: (-x['quality'], -x['_confidence'], x['phrase']))
    
    # 去重（相同短语只保留一个）
    seen_phrases = set()
    unique_materials = []
    for m in materials:
        if m['phrase'] not in seen_phrases:
            seen_phrases.add(m['phrase'])
            unique_materials.append(m)
    
    # 截取最多MAX_MATERIALS个
    if len(unique_materials) > MAX_MATERIALS:
        unique_materials = unique_materials[:MAX_MATERIALS]
        # 重新编号
        for i, m in enumerate(unique_materials):
            m['_cluster_id'] = i
    
    logger.info(f"提取 {len(materials)} 个素材 → 去重后 {len(unique_materials)} 个")
    return unique_materials


# ============================
# 5. BGE-M3 编码
# ============================
class BGE_M3_Encoder:
    def __init__(self, model_name: str = BGE_MODEL_NAME):
        import torch
        from transformers import AutoTokenizer, AutoModel
        
        self.device = 'cuda' if __import__('torch').cuda.is_available() else 'cpu'
        logger.info(f"加载 BGE-M3: {model_name} 于 {self.device}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        self.dim = self.model.config.hidden_size
        logger.info(f"BGE-M3 就绪, 输出维度={self.dim}, device={self.device}")
    
    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        import torch
        if not texts:
            return np.array([])
        all_embs = []
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i+batch_size]
                encoded = self.tokenizer(batch, padding=True, truncation=True, max_length=64, return_tensors='pt')
                encoded = {k: v.to(self.device) for k, v in encoded.items()}
                output = self.model(**encoded)
                emb = output.last_hidden_state[:, 0]  # [CLS]
                emb = torch.nn.functional.normalize(emb, p=2, dim=1)
                all_embs.append(emb.cpu().numpy())
        return np.vstack(all_embs)


# ============================
# 6. 创建表
# ============================
def create_table(conn) -> str:
    """创建 naming_materials 表"""
    cur = conn.cursor()
    
    cur.execute("DROP TABLE IF EXISTS naming_materials CASCADE")
    conn.commit()
    
    # try pgvector
    try:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
        conn.commit()
    except:
        conn.rollback()
    
    sql = """
    CREATE TABLE naming_materials (
        id SERIAL PRIMARY KEY,
        phrase VARCHAR(10) NOT NULL,
        source VARCHAR(100),
        source_snippet VARCHAR(300),
        meaning VARCHAR(200),
        keywords TEXT[],
        style VARCHAR(50)[],
        gender CHAR(1) DEFAULT 'B',
        wuxing VARCHAR(10),
        quality INT DEFAULT 3,
        combos TEXT[],
        embedding vector(1024),
        created_at TIMESTAMP DEFAULT NOW()
    )
    """
    
    try:
        cur.execute(sql)
        conn.commit()
        logger.info("naming_materials 表创建成功 (vector类型)")
        
        try:
            cur.execute("CREATE INDEX idx_naming_materials_embedding ON naming_materials USING hnsw (embedding vector_cosine_ops)")
            conn.commit()
            logger.info("HNSW 索引创建成功")
        except:
            conn.rollback()
            logger.info("HNSW 索引不可用，跳过")
        
        return 'vector'
    except Exception as e:
        conn.rollback()
        logger.warning(f"vector类型失败: {e}")
        sql_bytea = sql.replace('embedding vector(1024)', 'embedding BYTEA')
        cur.execute(sql_bytea)
        conn.commit()
        logger.info("使用 BYTEA 类型")
        return 'bytea'


# ============================
# 7. 写入数据库
# ============================
def insert_materials(conn, encoder, materials: List[Dict], vec_type: str):
    """为素材生成向量并写入"""
    cur = conn.cursor()
    
    # 编码素材文本（短语+意义）
    texts = []
    for m in materials:
        phrase = m['phrase']
        meaning = m.get('meaning', '')
        if meaning:
            texts.append(f"'{phrase}'意为{meaning}")
        else:
            texts.append(phrase)
    
    logger.info(f"为 {len(materials)} 个素材生成BGE-M3向量...")
    t0 = time.time()
    embeddings = encoder.encode(texts, batch_size=32)
    logger.info(f"素材向量生成: {embeddings.shape}, 耗时 {time.time()-t0:.1f}s")
    
    # 批量插入
    total = 0
    for i, m in enumerate(materials):
        emb = embeddings[i]
        try:
            if vec_type == 'vector':
                vec_str = '[' + ','.join(f'{v:.8f}' for v in emb) + ']'
                cur.execute("""
                    INSERT INTO naming_materials (phrase, source, source_snippet, meaning, keywords, style, gender, wuxing, quality, combos, embedding)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::vector)
                """, (m['phrase'], m.get('source',''), m.get('source_snippet',''),
                      m.get('meaning',''), m.get('keywords',[]), m.get('style',[]),
                      m.get('gender','B'), m.get('wuxing',''), m.get('quality',3),
                      m.get('combos',[]), vec_str))
            else:
                emb_bytes = emb.astype(np.float32).tobytes()
                cur.execute("""
                    INSERT INTO naming_materials (phrase, source, source_snippet, meaning, keywords, style, gender, wuxing, quality, combos, embedding)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (m['phrase'], m.get('source',''), m.get('source_snippet',''),
                      m.get('meaning',''), m.get('keywords',[]), m.get('style',[]),
                      m.get('gender','B'), m.get('wuxing',''), m.get('quality',3),
                      m.get('combos',[]), psycopg2.Binary(emb_bytes)))
            conn.commit()
            total += 1
        except Exception as e:
            conn.rollback()
            logger.warning(f"插入失败 [{m['phrase']}]: {e}")
    
    logger.info(f"共写入 {total} 条素材到 naming_materials")


# ============================
# 8. 验证
# ============================
def verify_table(conn):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM naming_materials")
    count = cur.fetchone()[0]
    logger.info(f"验证: naming_materials 共 {count} 条")
    
    if count > 0:
        cur.execute("SELECT id, phrase, source, meaning, gender, quality FROM naming_materials ORDER BY quality DESC, id LIMIT 20")
        logger.info("Top素材:")
        for r in cur.fetchall():
            logger.info(f"  ID={r[0]} | {r[1]:6s} | {(r[2] or '')[:20]:20s} | {(r[3] or '')[:18]:18s} | {r[4]} | Q={r[5]}")
        
        cur.execute("SELECT quality, COUNT(*) FROM naming_materials GROUP BY quality ORDER BY quality")
        logger.info("质量分布:")
        for r in cur.fetchall():
            logger.info(f"  Q={r[0]}: {r[1]}条")
        
        cur.execute("SELECT gender, COUNT(*) FROM naming_materials GROUP BY gender ORDER BY gender")
        logger.info("性别分布:")
        for r in cur.fetchall():
            logger.info(f"  {r[0]}: {r[1]}条")
        
        # 展示适合起名的素材
        cur.execute("SELECT id, phrase, source, source_snippet, keywords FROM naming_materials WHERE quality >= 4 ORDER BY id LIMIT 10")
        logger.info("高质量素材(前10):")
        for r in cur.fetchall():
            logger.info(f"  📌 {r[1]} | {(r[2] or '')[:20]} | {(r[3] or '')[:30]} | 关键词:{r[4]}")


# ============================
# 9. 保存JSON
# ============================
def save_json(materials: List[Dict], filename: str):
    clean = []
    for m in materials:
        d = {k: v for k, v in m.items() if not k.startswith('_')}
        clean.append(d)
    
    fp = os.path.join(OUTPUT_DIR, filename)
    with open(fp, 'w', encoding='utf-8') as f:
        json.dump(clean, f, ensure_ascii=False, indent=2)
    logger.info(f"保存 {fp} ({len(clean)} 条)")


# ============================
# 主流程
# ============================
def main():
    use_sample = None  # 设为数字用于测试
    
    logger.info("=" * 60)
    logger.info("■ 构建起名素材库 naming_materials (v2-智能提取)")
    logger.info("=" * 60)
    
    conn = psycopg2.connect(**DB_CONFIG)
    logger.info("DB连接成功")
    
    try:
        # == 第1步: 加载 ==
        logger.info("\n--- 第1步: 加载典籍数据 ---")
        records = load_classics_entries(conn, use_sample)
        N = len(records)
        
        # == 第2步: TF-IDF特征 + 聚类 ==
        logger.info("\n--- 第2步: 文本特征提取+聚类 ---")
        features = extract_text_features(records)
        cluster_labels = run_clustering(features)
        
        del features
        gc.collect()
        
        # == 第3步: 智能提取素材 ==
        logger.info("\n--- 第3步: 智能提取起名素材 ---")
        materials = extract_all_materials(records, cluster_labels)
        logger.info(f"提取 {len(materials)} 个素材")
        
        del records, cluster_labels
        gc.collect()
        
        # 保存中间结果
        save_json(materials, 'extracted_materials.json')
        
        if len(materials) == 0:
            logger.error("没有提取到任何素材，退出")
            return
        
        # 打印前20个素材预览
        logger.info(f"素材预览(前20):")
        for i, m in enumerate(materials[:20]):
            logger.info(f"  [{i+1}] {m['phrase']:6s} | {m.get('source','')[:20]:20s} | 质量={m['quality']} | 风格={m['style']}")
        
        # == 第4步: BGE-M3编码 ==
        logger.info("\n--- 第4步: 素材BGE-M3向量化 ---")
        encoder = BGE_M3_Encoder()
        
        # == 第5步: 创建表+插入 ==
        logger.info("\n--- 第5步: 创建表并写入 ---")
        vec_type = create_table(conn)
        insert_materials(conn, encoder, materials, vec_type)
        
        # == 第6步: 验证 ==
        logger.info("\n--- 第6步: 验证 ---")
        verify_table(conn)
        
        save_json(materials, 'naming_materials_final.json')
        
        logger.info("\n" + "=" * 60)
        logger.info(f"■ 完成！典籍{N}条 → 素材{len(materials)}个")
        logger.info(f"  输出: {OUTPUT_DIR}/")
        logger.info("=" * 60)
        
    except KeyboardInterrupt:
        logger.warning("中断")
    except Exception as e:
        logger.error(f"出错: {e}", exc_info=True)
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()