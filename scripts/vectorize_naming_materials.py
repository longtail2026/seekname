#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
向量化500个起名素材到naming_materials表

从起名素材.txt解析500个字词（200个意向词扩展 + 300个大数据补充），
用BGE-M3生成向量，写入naming_materials表（先清空旧数据）。
"""
import os, sys, re, json, time, struct
import logging
import numpy as np
import psycopg2
from collections import OrderedDict
from typing import List, Dict, Tuple

# 配置
DB_CONFIG = dict(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "5432")),
    database=os.getenv("DB_NAME", "seekname_db"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD", "postgres"),
)

INPUT_FILE = r"C:\Users\Administrator\Desktop\起名素材.txt"
BATCH_SIZE = 32

# 日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('vectorize_naming_materials')


def parse_input_file(filepath: str) -> List[Dict]:
    """
    解析起名素材.txt，提取所有字词及其分类信息
    返回格式: [{'word': '安颐', 'type': '候选词', 'cat': '平安健康', 'meaning': '安适养身', 'style': '古风典雅,稳重成熟'}, ...]
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    results = []
    
    # 分类追踪
    current_category = None
    current_section = None  # 'candidate' (候选词), 'single' (单字), 'supplement_single' (补充单字), 'supplement_word' (补充二字词)
    
    # 分类名称映射
    cat_order = [
        ('平安健康', '一、'),
        ('聪明智慧', '二、'),
        ('事业有成', '三、'),
        ('富贵财富', '四、'),
        ('品德高尚', '五、'),
        ('阳光开朗', '六、'),
        ('美丽俊俏', '七、'),
        ('勇敢坚强', '八、'),
        ('幸福美满', '九、'),
        ('才华艺术', '十、'),
    ]

    # Part tracking (第一部分/第二部分/第三部分)
    part = 0
    
    for line in lines:
        line_stripped = line.strip()
        
        # 跳过空行
        if not line_stripped:
            continue
        
        # 识别部分标题
        if '第一部分' in line_stripped or '候选词扩展表' in line_stripped:
            part = 1
            continue
        if '第二部分' in line_stripped or '各个词汇适合的的单字名' in line_stripped:
            part = 2
            continue
        if '第三部分' in line_stripped or '扩充新增' in line_stripped:
            part = 3
            continue
        
        # 识别分类
        for cat_name, prefix in cat_order:
            if line_stripped.startswith(prefix):
                current_category = cat_name
                break
        
        # 在part 1中识别候选词/单字
        if part == 1:
            if '候选词\t含义\t适合风格' in line_stripped:
                # 表格头后的数据行
                continue
            # 分类名如 "1. 平安健康（10个候选词）"
            if re.match(r'^\d+\.\s+\S+', line_stripped) and '候选词' in line_stripped:
                # 提取分类名
                m = re.match(r'^\d+\.\s+(\S+)', line_stripped)
                if m:
                    current_category = m.group(1)
                continue
            # 数据行: 候选词\t含义\t适合风格
            if '\t' in line_stripped and not line_stripped.startswith('候选词') and not line_stripped.startswith('单字'):
                parts = line_stripped.split('\t')
                word = parts[0].strip()
                if word and re.match(r'^[\u4e00-\u9fa5]{2,4}$', word):
                    meaning = parts[1].strip() if len(parts) > 1 else ''
                    style = parts[2].strip() if len(parts) > 2 else ''
                    results.append({
                        'word': word,
                        'category': current_category or '',
                        'meaning': meaning,
                        'style': style,
                        'type': '候选词',
                        'part': 'part1'
                    })
        
        # 在part 2中识别单字
        if part == 2:
            # 分类名如 "一、平安健康（10个单字）" 已经由上面的cat_order匹配处理
            if '单字\t含义\t音韵\t适合风格\t搭配建议' in line_stripped:
                continue
            # 数据行: 单字\t含义\t音韵\t适合风格\t搭配建议
            if '\t' in line_stripped and not line_stripped.startswith('单字') and not line_stripped.startswith('候选词'):
                parts = line_stripped.split('\t')
                word = parts[0].strip()
                if len(word) == 1 and re.match(r'^[\u4e00-\u9fa5]$', word) and len(parts) >= 4:
                    meaning = parts[1].strip() if len(parts) > 1 else ''
                    tone = parts[2].strip() if len(parts) > 2 else ''
                    style = parts[3].strip() if len(parts) > 3 else ''
                    results.append({
                        'word': word,
                        'category': current_category or '',
                        'meaning': meaning,
                        'style': style,
                        'type': '单字',
                        'part': 'part2'
                    })
        
        # 在part 3中识别补充单字和二字词
        if part == 3:
            # 分类名如 "一、平安健康（补充30个）"
            # 识别单字组头
            if line_stripped == '单字（15个）：' or line_stripped == '单字（15个）:':
                current_section = 'supplement_single'
                continue
            # 识别二字词头
            if line_stripped == '二字词（15个）：' or line_stripped == '二字词（15个）:':
                current_section = 'supplement_word'
                continue
            if '单字\t含义\t适合风格' in line_stripped:
                current_section = 'supplement_single'
                continue
            if '候选词\t含义\t适合风格' in line_stripped:
                current_section = 'supplement_word'
                continue
            
            if current_section == 'supplement_single' and '\t' in line_stripped:
                parts = line_stripped.split('\t')
                word = parts[0].strip()
                if len(word) == 1 and re.match(r'^[\u4e00-\u9fa5]$', word) and len(parts) >= 2:
                    meaning = parts[1].strip() if len(parts) > 1 else ''
                    style = parts[2].strip() if len(parts) > 2 else ''
                    results.append({
                        'word': word,
                        'category': current_category or '',
                        'meaning': meaning,
                        'style': style,
                        'type': '补充单字',
                        'part': 'part3'
                    })
            
            if current_section == 'supplement_word' and '\t' in line_stripped:
                parts = line_stripped.split('\t')
                word = parts[0].strip()
                if len(word) == 2 and re.match(r'^[\u4e00-\u9fa5]{2}$', word) and len(parts) >= 2:
                    meaning = parts[1].strip() if len(parts) > 1 else ''
                    style = parts[2].strip() if len(parts) > 2 else ''
                    results.append({
                        'word': word,
                        'category': current_category or '',
                        'meaning': meaning,
                        'style': style,
                        'type': '补充二字词',
                        'part': 'part3'
                    })

    return results


def load_bge_m3_model():
    """加载BGE-M3模型"""
    from transformers import AutoTokenizer, AutoModel
    import torch
    
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logger.info(f"加载BGE-M3模型于 {device}")
    
    tokenizer = AutoTokenizer.from_pretrained('BAAI/bge-m3')
    model = AutoModel.from_pretrained('BAAI/bge-m3')
    model.to(device)
    model.eval()
    
    logger.info(f"BGE-M3就绪, 维度={model.config.hidden_size}, device={device}")
    return tokenizer, model, device


def encode_texts(tokenizer, model, device, texts: List[str], batch_size: int = BATCH_SIZE) -> np.ndarray:
    """批量编码文本生成向量"""
    import torch
    all_embs = []
    
    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            encoded = tokenizer(batch, padding=True, truncation=True, max_length=64, return_tensors='pt')
            encoded = {k: v.to(device) for k, v in encoded.items()}
            output = model(**encoded)
            emb = output.last_hidden_state[:, 0]  # [CLS] token
            emb = torch.nn.functional.normalize(emb, p=2, dim=1)
            all_embs.append(emb.cpu().numpy())
            
            if (i // batch_size) % 5 == 0:
                logger.info(f"  编码进度: {min(i+batch_size, len(texts))}/{len(texts)}")
    
    return np.vstack(all_embs)


def main():
    logger.info("=" * 60)
    logger.info("■ 向量化起名素材到 naming_materials")
    logger.info("=" * 60)
    
    # 第1步: 解析文件
    logger.info("\n--- 第1步: 解析起名素材.txt ---")
    items = parse_input_file(INPUT_FILE)
    logger.info(f"解析到 {len(items)} 个字词")
    
    # 按类型统计
    type_counts = {}
    for item in items:
        t = item['type']
        type_counts[t] = type_counts.get(t, 0) + 1
    for t, c in type_counts.items():
        logger.info(f"  {t}: {c}个")
    
    # 按分类统计
    cat_counts = {}
    for item in items:
        c = item['category']
        cat_counts[c] = cat_counts.get(c, 0) + 1
    for c, cnt in cat_counts.items():
        logger.info(f"  [{c}]: {cnt}个")
    
    # 保留所有条目，不去重（Part 2单字与Part 3补充单字虽有重复但上下文不同）
    logger.info(f"保留全部 {len(items)} 个字词（不过滤去重）")
    
    # 第2步: 生成向量
    logger.info("\n--- 第2步: BGE-M3向量化 ---")
    tokenizer, model, device = load_bge_m3_model()
    
    # 准备编码文本（字词+含义 增强语义）
    texts = []
    for item in items:
        word = item['word']
        meaning = item['meaning']
        if meaning:
            texts.append(f"'{word}'意为{meaning}")
        else:
            texts.append(word)
    
    embeddings = encode_texts(tokenizer, model, device, texts)
    logger.info(f"向量维度: {embeddings.shape[1]}, 形状: {embeddings.shape}")
    
    # 第3步: 连接数据库并清空旧数据
    logger.info("\n--- 第3步: 连接数据库 ---")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    logger.info("DB连接成功")
    
    # 清空旧数据
    cur.execute("DELETE FROM naming_materials")
    conn.commit()
    logger.info("已清空旧数据")
    
    # 第4步: 批量写入
    logger.info("\n--- 第4步: 写入数据库 ---")
    
    # 检查表字段
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='naming_materials' ORDER BY ordinal_position")
    db_columns = [r[0] for r in cur.fetchall()]
    logger.info(f"表字段: {db_columns}")
    
    # 判断是否支持vector类型
    cur.execute("""
        SELECT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'vector'
        )
    """)
    has_vector = cur.fetchone()[0]
    logger.info(f"支持vector类型: {has_vector}")
    
    use_vector = has_vector
    
    total = 0
    errors = 0
    
    for i, item in enumerate(items):
        word = item['word']
        category = item['category']
        meaning = item['meaning']
        style = item['style']
        item_type = item['type']
        emb = embeddings[i]
        
        try:
            # 将风格字符串转为数组
            style_list = [s.strip() for s in style.split('、') if s.strip()] if style else []
            if category:
                style_list.append(category)
            style_list = list(dict.fromkeys(style_list))  # 去重并保持顺序
            
            # 生成关键词（从含义提取）
            keywords = [category] if category else []
            
            if use_vector:
                vec_str = '[' + ','.join(f'{v:.8f}' for v in emb) + ']'
                cur.execute("""
                    INSERT INTO naming_materials 
                    (phrase, source, source_snippet, meaning, keywords, style, gender, wuxing, quality, combos, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
                """, (
                    word,
                    item_type,  # source: 来源类型
                    '',         # source_snippet
                    meaning,
                    list(set(keywords)),
                    style_list,
                    'B',        # gender
                    '',         # wuxing
                    4,          # quality
                    [],         # combos
                    vec_str
                ))
            else:
                emb_bytes = emb.astype(np.float32).tobytes()
                cur.execute("""
                    INSERT INTO naming_materials 
                    (phrase, source, source_snippet, meaning, keywords, style, gender, wuxing, quality, combos, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    word,
                    item_type,
                    '',
                    meaning,
                    list(set(keywords)),
                    style_list,
                    'B',
                    '',
                    4,
                    [],
                    psycopg2.Binary(emb_bytes)
                ))
            
            conn.commit()
            total += 1
            
        except Exception as e:
            conn.rollback()
            errors += 1
            if errors <= 3:
                logger.warning(f"写入失败 [{word}]: {e}")
        
        if (i + 1) % 50 == 0:
            logger.info(f"  进度: {i+1}/{len(items)} (成功:{total}, 失败:{errors})")
    
    logger.info(f"写入完成: 成功{total}条, 失败{errors}条")
    
    # 第5步: 验证
    logger.info("\n--- 第5步: 验证 ---")
    cur.execute("SELECT COUNT(*) FROM naming_materials")
    count = cur.fetchone()[0]
    logger.info(f"naming_materials 共 {count} 条记录")
    
    if count > 0:
        cur.execute("SELECT id, phrase, source, meaning, quality FROM naming_materials ORDER BY id LIMIT 20")
        logger.info("前20条记录:")
        for r in cur.fetchall():
            logger.info(f"  ID={r[0]} | {r[1]:8s} | {(r[2] or ''):10s} | {(r[3] or '')[:20]:20s} | Q={r[4]}")
        
        # 按类型统计
        cur.execute("SELECT source, COUNT(*) FROM naming_materials GROUP BY source ORDER BY COUNT(*) DESC")
        logger.info("类型分布:")
        for r in cur.fetchall():
            logger.info(f"  {r[0]}: {r[1]}条")
    
    cur.close()
    conn.close()
    
    logger.info("\n" + "=" * 60)
    logger.info(f"■ 完成！共写入 {total} 条到 naming_materials")
    logger.info("=" * 60)


if __name__ == '__main__':
    main()