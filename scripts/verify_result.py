#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验证 naming_materials 生成结果"""
import json
import os

JSON_PATH = "scripts/output_naming_materials/naming_materials_final.json"

if not os.path.exists(JSON_PATH):
    print(f"❌ 文件不存在: {JSON_PATH}")
    exit(1)

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"素材总数: {len(data)}")
print()

# 统计
has_embedding = sum(1 for m in data if m.get('embedding'))
print(f"有向量的素材: {has_embedding}/{len(data)}")

genders = {}
qualities = {}
wuxings = {}
styles_set = set()
for m in data:
    g = m.get('gender', '?')
    genders[g] = genders.get(g, 0) + 1
    q = m.get('quality', 0)
    qualities[q] = qualities.get(q, 0) + 1
    w = m.get('wuxing', '-')
    wuxings[w] = wuxings.get(w, 0) + 1
    s = m.get('style', [])
    if s:
        for st in s:
            styles_set.add(st)

print(f"性别分布: {dict(sorted(genders.items()))}")
print(f"质量分布: {dict(sorted(qualities.items()))}")
print(f"五行分布: {dict(sorted(wuxings.items(), key=lambda x:-x[1]))}")
print(f"风格种类: {len(styles_set)}")
print()

# 前15个素材详情
print("=" * 80)
print("前15个素材:")
print("=" * 80)
for i, m in enumerate(data[:15]):
    phrase = m.get('phrase', '')
    source = m.get('source', '')
    meaning = m.get('meaning', '')
    gender = m.get('gender', '')
    quality = m.get('quality', '')
    wuxing = m.get('wuxing', '')
    keywords = m.get('keywords', [])
    style = m.get('style', [])
    combos = m.get('combos', [])
    
    print(f"\n[{i+1}] {phrase} (质量:{quality} 性别:{gender} 五行:{wuxing})")
    print(f"    来源: {source}")
    print(f"    含义: {meaning}")
    print(f"    关键词: {', '.join(keywords[:5])}")
    print(f"    风格: {', '.join(style[:3])}")
    print(f"    示例组合: {', '.join(combos[:3])}")

# 检查 embedding 维度
if has_embedding > 0:
    emb = next(m['embedding'] for m in data if m.get('embedding'))
    print(f"\n向量维度: {len(emb)}")
    print(f"向量前5个值: {emb[:5]}")

# 全部素材短语列表
print("\n" + "=" * 80)
print(f"全部 {len(data)} 个素材短语:")
print("=" * 80)
for i, m in enumerate(data):
    q = m.get('quality', '?')
    w = str(m.get('wuxing', '-'))
    print(f"  [{i+1:3d}] {str(m.get('phrase',''))[:10]:10s} | {str(m.get('gender','')):4s} | Q{str(q):4s} | 五行:{w:4s} | {str(m.get('source',''))[:30]:30s}")

print(f"\n✅ 验证完成 - 共 {len(data)} 条高质量起名素材")