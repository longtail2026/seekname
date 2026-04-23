import psycopg2

def check_naming_classics():
    try:
        conn = psycopg2.connect(
            host='localhost',
            database='seekname_db',
            user='postgres',
            password='postgres'
        )
        cur = conn.cursor()
        
        # 1. 检查表是否存在
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'naming_classics'
            )
        """)
        exists = cur.fetchone()[0]
        if not exists:
            print("✗ naming_classics表不存在")
            return False
        
        # 2. 获取总条目数
        cur.execute("SELECT COUNT(*) FROM naming_classics")
        total = cur.fetchone()[0]
        print(f"✓ naming_classics总条目数: {total}")
        
        # 3. 检查向量化情况
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(ancient_text_embedding) as with_ancient,
                COUNT(modern_text_embedding) as with_modern,
                COUNT(combined_text_embedding) as with_combined
            FROM naming_classics
        """)
        counts = cur.fetchone()
        print(f"\n向量化状态:")
        print(f"  • 有古籍嵌入向量的: {counts[1]}/{counts[0]}")
        print(f"  • 有现代嵌入向量的: {counts[2]}/{counts[0]}")
        print(f"  • 有组合嵌入向量的: {counts[3]}/{counts[0]}")
        
        # 4. 检查嵌入向量维度
        cur.execute("""
            SELECT octet_length(combined_text_embedding) as embedding_size
            FROM naming_classics
            WHERE combined_text_embedding IS NOT NULL
            LIMIT 1
        """)
        result = cur.fetchone()
        if result:
            byte_size = result[0]
            float_size = byte_size / 4  # 每个float32占4字节
            print(f"\n嵌入向量维度: {float_size:.0f} (基于字节大小计算)")
            print(f"预期维度 (BGE-M3): 1024")
        
        # 5. 检查表结构
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'naming_classics' 
            ORDER BY ordinal_position
        """)
        print(f"\n表结构:")
        for col_name, data_type in cur.fetchall():
            print(f"  • {col_name}: {data_type}")
        
        # 6. 验证13716条记录
        if total == 13716:
            print(f"\n✓ 总条目数正确: {total} 条 (符合预期的 13716 条)")
        else:
            print(f"\n✗ 总条目数不匹配: {total} 条 (预期 13716 条)")
        
        # 7. 检查是否全部向量化
        if counts[3] == total:
            print(f"✓ 所有条目已完成向量化")
        else:
            print(f"✗ 向量化不完整: {counts[3]}/{total} 有条目有组合嵌入向量")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"错误: {e}")
        return False

if __name__ == "__main__":
    print("检查 naming_classics 表...")
    print("=" * 50)
    check_naming_classics()