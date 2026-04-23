import os
import psycopg2
import struct
import numpy as np
from typing import List, Tuple

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """计算两个向量的余弦相似度"""
    if len(vec1) != len(vec2):
        raise ValueError(f"向量维度不匹配: {len(vec1)} != {len(vec2)}")
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = np.sqrt(sum(a * a for a in vec1))
    norm2 = np.sqrt(sum(b * b for b in vec2))
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return dot_product / (norm1 * norm2)

def parse_embedding(embedding_bytes: bytes) -> List[float]:
    """解析bytea格式的嵌入向量为浮点数列表"""
    if not embedding_bytes:
        return []
    
    # 假设是float32数组
    if len(embedding_bytes) % 4 != 0:
        raise ValueError(f"字节长度 {len(embedding_bytes)} 不是4的倍数")
    
    dimension = len(embedding_bytes) // 4
    fmt = f'{dimension}f'
    return list(struct.unpack(fmt, embedding_bytes))

def generate_test_embedding(text: str, dimension: int = 1024) -> bytes:
    """生成测试嵌入向量（模拟BGE-M3）"""
    # 简单哈希生成伪随机向量
    import hashlib
    seed = hashlib.md5(text.encode()).digest()
    np.random.seed(int.from_bytes(seed[:4], 'little'))
    
    # 生成正态分布的向量
    vec = np.random.normal(0, 0.1, dimension).astype(np.float32)
    return vec.tobytes()

def test_similarity():
    """测试相似度计算"""
    print("测试余弦相似度计算...")
    
    # 测试向量
    vec1 = [1.0, 2.0, 3.0]
    vec2 = [1.0, 2.0, 3.0]  # 完全相同
    vec3 = [2.0, 4.0, 6.0]  # 方向相同，长度不同
    vec4 = [-1.0, -2.0, -3.0]  # 方向相反
    
    sim1 = cosine_similarity(vec1, vec2)
    sim2 = cosine_similarity(vec1, vec3)
    sim3 = cosine_similarity(vec1, vec4)
    
    print(f"vec1 vs vec2 (相同): {sim1:.4f}")
    print(f"vec1 vs vec3 (同向): {sim2:.4f}")
    print(f"vec1 vs vec4 (反向): {sim3:.4f}")
    
    # 测试解析函数
    test_vec = np.array([1.0, 2.0, 3.0, 4.0], dtype=np.float32)
    test_bytes = test_vec.tobytes()
    parsed = parse_embedding(test_bytes)
    print(f"\n解析测试: {parsed}")
    
    # 测试生成函数
    test_text = "聪明智慧"
    test_embedding = generate_test_embedding(test_text, 1024)
    print(f"\n生成测试嵌入向量: {len(test_embedding)} 字节")

def query_similar_classics(query_text: str, limit: int = 5):
    """查询与文本相似的典籍"""
    db_url = os.getenv('DATABASE_URL') or 'postgresql://postgres:postgres@localhost:5432/seekname_db'
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # 生成查询文本的嵌入向量
        query_embedding = generate_test_embedding(query_text, 1024)
        query_vector = parse_embedding(query_embedding)
        
        print(f"查询文本: '{query_text}'")
        print(f"查询向量维度: {len(query_vector)}")
        
        # 获取所有典籍的嵌入向量
        cur.execute("""
            SELECT id, book_name, ancient_text, modern_text, combined_text_embedding
            FROM naming_classics 
            WHERE combined_text_embedding IS NOT NULL 
            LIMIT 100  -- 限制数量用于测试
        """)
        
        results = []
        rows = cur.fetchall()
        print(f"获取到 {len(rows)} 条典籍记录")
        
        for row in rows:
            id_, book_name, ancient_text, modern_text, embedding_bytes = row
            
            # 解析典籍的嵌入向量
            try:
                doc_vector = parse_embedding(embedding_bytes.tobytes())
                similarity = cosine_similarity(query_vector, doc_vector)
                
                # 提取预览文本
                preview = ancient_text or modern_text or ""
                if len(preview) > 50:
                    preview = preview[:50] + "..."
                
                results.append({
                    'id': id_,
                    'book_name': book_name,
                    'preview': preview,
                    'similarity': similarity
                })
            except Exception as e:
                print(f"解析典籍 {id_} 失败: {e}")
                continue
        
        # 按相似度排序
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        print(f"\nTop {limit} 相似典籍:")
        for i, result in enumerate(results[:limit]):
            print(f"{i+1}. [{result['book_name']}] 相似度: {result['similarity']:.4f}")
            print(f"   文本: {result['preview']}")
        
        cur.close()
        conn.close()
        
        return results[:limit]
        
    except Exception as e:
        print(f"查询失败: {e}")
        import traceback
        traceback.print_exc()
        return []

if __name__ == "__main__":
    # 运行测试
    test_similarity()
    
    print("\n" + "="*50 + "\n")
    
    # 测试查询
    query_text = "聪明智慧"
    query_similar_classics(query_text, 5)


