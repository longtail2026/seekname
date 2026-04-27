#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""检查本地PostgreSQL的naming_materials表和生成的JSON文件"""
import os, sys, json, psycopg2

# 1. 检查JSON输出文件
output_dir = "scripts/output_naming_materials"
for fname in ["extracted_materials.json", "naming_materials_final.json"]:
    fp = os.path.join(output_dir, fname)
    if os.path.exists(fp):
        with open(fp, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"{fname}: {len(data)} 条")
        if data:
            for m in data[:5]:
                print(f"  {m.get('phrase','?'):8s} Q={m.get('quality','?')} src={m.get('source','')[:25]}")
    else:
        print(f"{fname}: ❌ 文件不存在")

# 2. 检查本地DB
try:
    conn = psycopg2.connect(host='localhost', port=5432, database='seekname_db', user='postgres', password='postgres')
    cur = conn.cursor()
    
    cur.execute("SELECT COUNT(*) FROM naming_materials")
    total = cur.fetchone()[0]
    print(f"\n本地DB naming_materials 总数: {total}")
    
    if total > 0:
        cur.execute("""
            SELECT id, phrase, COALESCE(gender,'?') as g, quality,
                   COALESCE(source,'') as src,
                   CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END as has_vec,
                   COALESCE(keywords::text,'[]') as kw,
                   COALESCE(style::text,'[]') as st,
                   COALESCE(meaning,'') as meaning
            FROM naming_materials 
            ORDER BY quality DESC, id LIMIT 15
        """)
        print(f"{'ID':>4s} {'短语':8s} {'性别':4s} {'质量':4s} {'向量':4s} {'来源/关键词':40s}")
        print("-"*80)
        for r in cur.fetchall():
            print(f"{r[0]:>4d} {r[1]:8s} {r[2]:4s} {r[3]:>4d} {'Y' if r[5] else 'N':4s} {r[4][:40]:40s}")
        
        cur.execute("SELECT quality, COUNT(*) FROM naming_materials GROUP BY quality ORDER BY quality")
        print(f"质量分布: {dict(cur.fetchall())}")
        
        cur.execute("SELECT gender, COUNT(*) FROM naming_materials GROUP BY gender ORDER BY gender")
        print(f"性别分布: {dict(cur.fetchall())}")
        
        cur.execute("SELECT vector_dims(embedding) FROM naming_materials WHERE embedding IS NOT NULL LIMIT 1")
        dim = cur.fetchone()[0] if cur.rowcount > 0 else "N/A"
        print(f"向量维度: {dim}")
    
    conn.close()
except Exception as e:
    print(f"\n❌ DB连接失败: {e}")