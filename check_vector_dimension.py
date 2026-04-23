import os
import psycopg2
import struct
import numpy as np

# 获取数据库URL
db_url = os.getenv('DATABASE_URL') or 'postgresql://postgres:postgres@localhost:5432/seekname_db'
print(f'使用数据库URL: {db_url}')

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # 检查向量数据的维度
    print("检查向量数据维度...")
    
    # 获取一条有向量数据的记录
    cur.execute("""
        SELECT ancient_text_embedding, modern_text_embedding, combined_text_embedding
        FROM naming_classics 
        WHERE combined_text_embedding IS NOT NULL 
        LIMIT 1
    """)
    
    row = cur.fetchone()
    if row:
        ancient_embedding, modern_embedding, combined_embedding = row
        
        print(f"ancient_text_embedding 类型: {type(ancient_embedding)}")
        print(f"modern_text_embedding 类型: {type(modern_embedding)}")
        print(f"combined_text_embedding 类型: {type(combined_embedding)}")
        
        # 尝试解析向量数据
        if combined_embedding:
            # bytea数据，尝试解析为浮点数数组
            print(f"combined_text_embedding 长度: {len(combined_embedding)}")
            
            # 尝试解析为float32数组（假设是4字节浮点数）
            if len(combined_embedding) % 4 == 0:
                dimension = len(combined_embedding) // 4
                print(f"可能的维度: {dimension} (假设float32)")
                
                # 解析前几个值
                try:
                    # 使用struct解析
                    fmt = f'{dimension}f'
                    values = struct.unpack(fmt, combined_embedding)
                    print(f"前5个值: {values[:5]}")
                    print(f"值范围: min={min(values):.6f}, max={max(values):.6f}, mean={np.mean(values):.6f}")
                except:
                    print("无法解析为float32数组")
            else:
                print(f"字节长度 {len(combined_embedding)} 不是4的倍数")
    
    # 检查pgvector扩展
    print("\n检查pgvector扩展...")
    try:
        cur.execute("SELECT * FROM pg_available_extensions WHERE name = 'vector'")
        vector_ext = cur.fetchone()
        if vector_ext:
            print(f"pgvector扩展可用: {vector_ext}")
        else:
            print("pgvector扩展不可用")
    except:
        print("查询pgvector扩展失败，可能未安装")
    
    # 检查是否有向量索引
    print("\n检查向量索引...")
    cur.execute("""
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'naming_classics' 
        AND indexdef LIKE '%vector%'
    """)
    vector_indexes = cur.fetchall()
    print(f"向量索引数量: {len(vector_indexes)}")
    for idx in vector_indexes:
        print(f"  索引名: {idx[0]}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f'错误: {e}')
    import traceback
    traceback.print_exc()