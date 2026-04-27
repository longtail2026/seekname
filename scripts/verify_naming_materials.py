#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""验证 naming_materials 表数据"""

import psycopg2
import json

DB_URL = "postgresql://neondb_owner:npg_2W3hJ4tuQIz2@ep-shrill-forest-a1h19o3a-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # 总数
    cur.execute("SELECT COUNT(*) FROM naming_materials")
    total = cur.fetchone()[0]
    print(f"naming_materials 总记录数: {total}")
    
    # Quality 分布
    cur.execute("SELECT quality, COUNT(*) FROM naming_materials GROUP BY quality ORDER BY quality")
    print(f"Quality 分布: {dict(cur.fetchall())}")
    
    # Gender 分布
    cur.execute("SELECT COALESCE(gender,'?'), COUNT(*) FROM naming_materials GROUP BY gender ORDER BY gender")
    print(f"Gender 分布: {dict(cur.fetchall())}")
    
    # 向量数量
    cur.execute("SELECT COUNT(*) FROM naming_materials WHERE embedding IS NOT NULL")
    vec = cur.fetchone()[0]
    print(f"有向量记录: {vec}")
    
    # Top 20 高质量素材
    cur.execute("""
        SELECT id, phrase, COALESCE(source,'') as source, 
               COALESCE(gender,'') as gender, quality,
               COALESCE(meaning,'') as meaning,
               COALESCE(keywords::text,'[]') as keywords
        FROM naming_materials 
        ORDER BY quality DESC, id 
        LIMIT 20
    """)
    
    print(f"\nTop 20 素材:")
    print(f"{'ID':>4s} {'短语':8s} {'性别':4s} {'质量':4s} {'关键词':30s} {'来源':30s}")
    print("-"*90)
    for r in cur.fetchall():
        kw = r[6]
        try:
            kw_list = json.loads(kw) if kw and kw != '[]' else []
            kw_str = " ".join(kw_list[:3]) if kw_list else ""
        except:
            kw_str = ""
        print(f"{r[0]:>4d} {r[1]:8s} {r[3]:4s} {r[4]:>4d} {kw_str:30s} {r[2][:30]:30s}")
    
    # 统计 embedding 维度
    cur.execute("SELECT vector_dims(embedding) FROM naming_materials WHERE embedding IS NOT NULL LIMIT 1")
    dim = cur.fetchone()[0] if cur.rowcount > 0 else "N/A"
    print(f"\n向量维度: {dim}")
    
    conn.close()
    print("\n✅ 验证完成")

if __name__ == "__main__":
    main()