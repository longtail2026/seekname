#!/usr/bin/env python3
"""
专门为naming_classics表生成BGE-M3嵌入向量 - 精简优化版
针对13,716条常用典籍记录进行向量化
"""

import os
import sys
import logging
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
import torch
from transformers import AutoTokenizer, AutoModel
from typing import List, Tuple, Optional, Dict, Any
import time
import gc

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('naming_classics_vectorization.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BGE_M3_Embedder_Optimized:
    """BGE-M3嵌入模型包装器 - 针对CPU优化"""
    
    def __init__(self, model_name: str = "BAAI/bge-m3", device: str = "cpu"):
        """
        初始化BGE-M3模型，默认使用CPU
        
        Args:
            model_name: HuggingFace模型名称
            device: 设备类型，默认为'cpu'
        """
        self.model_name = model_name
        self.device = device
        
        logger.info(f"加载 BGE-M3 模型: {model_name} 在 {self.device} 上")
        
        try:
            # 加载tokenizer和模型
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModel.from_pretrained(model_name)
            self.model.to(self.device)
            self.model.eval()
            
            logger.info("BGE-M3 模型加载成功")
            logger.info(f"嵌入维度: {self.model.config.hidden_size}")
            
        except Exception as e:
            logger.error(f"加载模型失败: {e}")
            logger.info("尝试从本地缓存加载...")
            # 尝试从可能的本地路径加载
            cache_paths = [
                os.path.expanduser("~/.cache/huggingface/hub"),
                "C:/Users/Administrator/.cache/huggingface/hub",
                "C:/cache/huggingface"
            ]
            
            for cache_path in cache_paths:
                if os.path.exists(cache_path):
                    logger.info(f"检查缓存路径: {cache_path}")
            
            raise
    
    def encode(self, texts: List[str], batch_size: int = 8) -> np.ndarray:
        """
        编码文本为嵌入向量 - CPU优化版，使用较小的批处理大小
        
        Args:
            texts: 文本字符串列表
            batch_size: 推理批大小（CPU使用8）
            
        Returns:
            numpy数组，形状为 (n_texts, embedding_dim)
        """
        if not texts:
            return np.array([])
        
        embeddings = []
        
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                
                # Tokenize
                encoded_input = self.tokenizer(
                    batch_texts,
                    padding=True,
                    truncation=True,
                    max_length=256,  # 缩短最大长度以节省内存
                    return_tensors='pt'
                ).to(self.device)
                
                # 生成嵌入
                model_output = self.model(**encoded_input)
                # 使用[CLS] token的嵌入
                batch_embeddings = model_output.last_hidden_state[:, 0]
                
                # 归一化嵌入
                batch_embeddings = torch.nn.functional.normalize(batch_embeddings, p=2, dim=1)
                
                embeddings.append(batch_embeddings.cpu().numpy())
                
                # 清理缓存
                del encoded_input
                del model_output
                gc.collect()
        
        # 合并所有批次的嵌入
        if embeddings:
            return np.vstack(embeddings)
        return np.array([])
    
    def get_embedding_dim(self) -> int:
        """获取嵌入维度"""
        return self.model.config.hidden_size

class NamingClassicsVectorizer:
    """为naming_classics表向量化"""
    
    def __init__(self, host="localhost", port=5432, database="seekname_db", 
                 user="postgres", password="postgres"):
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.conn = None
        self.cur = None
        self.embedding_dim = 1024  # BGE-M3的固定维度
    
    def connect(self):
        """连接数据库"""
        try:
            self.conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                database=self.database,
                user=self.user,
                password=self.password
            )
            self.cur = self.conn.cursor()
            logger.info("成功连接到数据库")
        except Exception as e:
            logger.error(f"连接数据库失败: {e}")
            raise
    
    def disconnect(self):
        """断开数据库连接"""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()
        logger.info("已断开数据库连接")
    
    def check_table_exists(self) -> bool:
        """检查naming_classics表是否存在"""
        try:
            self.cur.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'naming_classics'
                )
            """)
            return self.cur.fetchone()[0]
        except Exception as e:
            logger.error(f"检查表存在性失败: {e}")
            return False
    
    def clear_existing_embeddings(self):
        """清除现有的嵌入向量"""
        try:
            self.cur.execute("""
                UPDATE naming_classics 
                SET 
                    ancient_text_embedding = NULL,
                    modern_text_embedding = NULL,
                    combined_text_embedding = NULL
                WHERE ancient_text_embedding IS NOT NULL
            """)
            self.conn.commit()
            logger.info("已清除现有的嵌入向量")
        except Exception as e:
            self.conn.rollback()
            logger.error(f"清除嵌入向量失败: {e}")
            raise
    
    def get_total_to_process(self) -> int:
        """获取待处理的总条目数"""
        try:
            self.cur.execute("""
                SELECT COUNT(*) 
                FROM naming_classics 
                WHERE combined_text_embedding IS NULL 
                AND ancient_text IS NOT NULL 
                AND ancient_text != ''
            """)
            return self.cur.fetchone()[0]
        except Exception as e:
            logger.error(f"获取待处理条目数失败: {e}")
            return 0
    
    def get_batch_to_process(self, batch_size: int = 16) -> List[Tuple[int, str, Optional[str]]]:
        """获取待处理的批次条目"""
        try:
            self.cur.execute("""
                SELECT id, ancient_text, modern_text 
                FROM naming_classics 
                WHERE combined_text_embedding IS NULL 
                AND ancient_text IS NOT NULL 
                AND ancient_text != ''
                ORDER BY id
                LIMIT %s
            """, (batch_size,))
            
            return self.cur.fetchall()
        except Exception as e:
            logger.error(f"获取批次条目失败: {e}")
            return []
    
    def generate_embeddings_batch(self, entries: List[Tuple[int, str, Optional[str]]], 
                                 embedder: BGE_M3_Embedder_Optimized) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """为批次条目生成嵌入向量"""
        entry_ids = [e[0] for e in entries]
        ancient_texts = [e[1] for e in entries]
        modern_texts = [e[2] if e[2] else "" for e in entries]
        
        logger.info(f"为 {len(entries)} 个条目生成BGE-M3嵌入向量...")
        
        # 生成古籍文本嵌入
        logger.info(f"生成古籍文本嵌入...")
        ancient_embeddings = embedder.encode(ancient_texts, batch_size=8)
        
        # 生成现代文本嵌入（如果有）
        modern_embeddings = np.array([])
        if any(modern_texts):
            logger.info(f"生成现代文本嵌入...")
            # 过滤掉空文本
            valid_modern_texts = [text for text in modern_texts if text and text.strip()]
            if valid_modern_texts:
                modern_embeddings = embedder.encode(valid_modern_texts, batch_size=8)
            else:
                modern_embeddings = np.array([np.zeros(self.embedding_dim) for _ in range(len(entries))])
        else:
            modern_embeddings = np.array([np.zeros(self.embedding_dim) for _ in range(len(entries))])
        
        # 创建组合嵌入向量（加权平均）
        logger.info(f"创建组合嵌入向量...")
        combined_embeddings = []
        
        for i in range(len(entries)):
            ancient_vec = ancient_embeddings[i]
            
            # 检查现代文本是否存在且非空
            modern_exists = modern_texts[i] and modern_texts[i].strip()
            if modern_exists and len(modern_embeddings) > i:
                modern_vec = modern_embeddings[i]
                # 古籍文本权重更高（0.7），现代文本权重较低（0.3）
                combined = 0.7 * ancient_vec + 0.3 * modern_vec
                # 归一化
                norm = np.linalg.norm(combined)
                if norm > 0:
                    combined = combined / norm
                else:
                    combined = ancient_vec
                combined_embeddings.append(combined)
            else:
                combined_embeddings.append(ancient_vec)
        
        return ancient_embeddings, modern_embeddings, np.array(combined_embeddings)
    
    def store_embeddings_batch(self, entries: List[Tuple[int, str, Optional[str]]], 
                              ancient_embeddings: np.ndarray, 
                              modern_embeddings: np.ndarray,
                              combined_embeddings: np.ndarray):
        """在数据库中存储嵌入向量"""
        try:
            update_data = []
            for i, (entry_id, ancient_text, modern_text) in enumerate(entries):
                # 转换numpy数组为字节
                ancient_bytes = ancient_embeddings[i].astype(np.float32).tobytes()
                
                # 检查现代文本是否存在
                modern_exists = modern_text and modern_text.strip()
                if modern_exists and i < len(modern_embeddings):
                    modern_bytes = modern_embeddings[i].astype(np.float32).tobytes()
                else:
                    modern_bytes = None
                
                combined_bytes = combined_embeddings[i].astype(np.float32).tobytes()
                
                update_data.append((
                    entry_id,
                    ancient_bytes,
                    modern_bytes,
                    combined_bytes
                ))
            
            # 批量更新
            execute_values(
                self.cur,
                """
                UPDATE naming_classics AS nc
                SET 
                    ancient_text_embedding = data.ancient_embedding,
                    modern_text_embedding = data.modern_embedding,
                    combined_text_embedding = data.combined_embedding
                FROM (VALUES %s) AS data(id, ancient_embedding, modern_embedding, combined_embedding)
                WHERE nc.id = data.id
                """,
                update_data
            )
            
            self.conn.commit()
            logger.info(f"已存储 {len(entries)} 个条目的嵌入向量")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"存储嵌入向量失败: {e}")
            raise
    
    def process_all(self, batch_size: int = 16, clear_existing: bool = True):
        """处理所有条目"""
        
        # 检查表是否存在
        if not self.check_table_exists():
            logger.error("naming_classics表不存在！请先运行 create_naming_classics.py")
            return
        
        if clear_existing:
            logger.info("清除现有的嵌入向量...")
            self.clear_existing_embeddings()
        
        total = self.get_total_to_process()
        logger.info(f"待处理的条目总数: {total}")
        
        if total == 0:
            logger.info("所有条目已有嵌入向量")
            return
        
        # 初始化嵌入器
        logger.info("初始化BGE-M3模型（使用本地缓存）...")
        try:
            # 设置环境变量强制使用离线模式
            import os
            os.environ['HF_HUB_OFFLINE'] = '1'
            os.environ['TRANSFORMERS_OFFLINE'] = '1'
            embedder = BGE_M3_Embedder_Optimized(device="cpu")
        except Exception as e:
            logger.error(f"初始化模型失败: {e}")
            logger.info("尝试使用在线模式...")
            # 如果本地缓存失败，尝试在线模式
            import os
            os.environ.pop('HF_HUB_OFFLINE', None)
            os.environ.pop('TRANSFORMERS_OFFLINE', None)
            try:
                embedder = BGE_M3_Embedder_Optimized(device="cpu")
            except Exception as e2:
                logger.error(f"在线模式也失败: {e2}")
                return
        
        processed = 0
        start_time = time.time()
        
        try:
            while True:
                # 获取批次
                entries = self.get_batch_to_process(batch_size)
                if not entries:
                    break
                
                # 生成嵌入向量
                ancient_embeddings, modern_embeddings, combined_embeddings = \
                    self.generate_embeddings_batch(entries, embedder)
                
                # 存储嵌入向量
                self.store_embeddings_batch(entries, ancient_embeddings, modern_embeddings, combined_embeddings)
                
                # 更新进度
                processed += len(entries)
                elapsed = time.time() - start_time
                
                if elapsed > 0:
                    rate = processed / elapsed
                    remaining_seconds = (total - processed) / rate if rate > 0 else 0
                    remaining_minutes = remaining_seconds / 60
                    
                    logger.info(f"进度: {processed}/{total} ({processed/total*100:.1f}%) - "
                               f"速率: {rate:.2f} 条目/秒 - "
                               f"预计剩余时间: {remaining_minutes:.1f} 分钟")
                else:
                    logger.info(f"进度: {processed}/{total} ({processed/total*100:.1f}%)")
                
                # 每处理100个条目保存一次进度
                if processed % 100 == 0:
                    logger.info(f"检查点: 已处理 {processed} 个条目")
                    # 清理内存
                    gc.collect()
        
        except KeyboardInterrupt:
            logger.info("用户中断处理")
            self.conn.rollback()
            raise
        except Exception as e:
            logger.error(f"处理过程中出错: {e}")
            self.conn.rollback()
            raise
        
        total_time = time.time() - start_time
        logger.info(f"处理完成，总耗时: {total_time:.1f} 秒")
        if total_time > 0:
            logger.info(f"平均速率: {processed/total_time:.2f} 条目/秒")
    
    def verify_embeddings(self):
        """验证生成的嵌入向量"""
        try:
            self.cur.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(ancient_text_embedding) as with_ancient,
                    COUNT(modern_text_embedding) as with_modern,
                    COUNT(combined_text_embedding) as with_combined
                FROM naming_classics
            """)
            
            counts = self.cur.fetchone()
            logger.info("\n嵌入向量验证:")
            logger.info(f"  总条目数: {counts[0]}")
            logger.info(f"  有古籍嵌入向量的: {counts[1]}")
            logger.info(f"  有现代嵌入向量的: {counts[2]}")
            logger.info(f"  有组合嵌入向量的: {counts[3]}")
            
            # 检查嵌入向量维度
            self.cur.execute("""
                SELECT octet_length(combined_text_embedding) as embedding_size
                FROM naming_classics
                WHERE combined_text_embedding IS NOT NULL
                LIMIT 1
            """)
            
            result = self.cur.fetchone()
            if result:
                byte_size = result[0]
                float_size = byte_size / 4  # 每个float32占4字节
                logger.info(f"  嵌入向量维度: {float_size:.0f} (基于字节大小计算)")
                logger.info(f"  预期维度: {self.embedding_dim}")
            
        except Exception as e:
            logger.error(f"验证嵌入向量失败: {e}")

def main():
    """主函数"""
    try:
        # 配置数据库连接
        host = os.getenv("DB_HOST", "localhost")
        port = int(os.getenv("DB_PORT", "5432"))
        database = os.getenv("DB_NAME", "seekname_db")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "postgres")
        
        # 初始化向量化器
        vectorizer = NamingClassicsVectorizer(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        
        # 连接数据库
        vectorizer.connect()
        
        # 处理所有条目
        logger.info("开始为naming_classics表生成嵌入向量...")
        logger.info("注意: 使用CPU模式，处理13,716条记录")
        logger.info("预计时间: 根据硬件性能，可能需要数小时")
        
        vectorizer.process_all(
            batch_size=16,  # 较小的批处理大小以适应CPU内存
            clear_existing=True
        )
        
        # 验证嵌入向量
        logger.info("验证生成的嵌入向量...")
        vectorizer.verify_embeddings()
        
        logger.info("\nnaming_classics表向量化完成!")
        logger.info("\n总结:")
        logger.info("1. 只处理常用起名典籍 (13,716条)")
        logger.info("2. 使用BGE-M3模型在CPU上运行")
        logger.info("3. 生成古籍、现代和组合嵌入向量")
        logger.info("4. 存储为PostgreSQL bytea格式")
        
    except Exception as e:
        logger.error(f"naming_classics向量化失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if 'vectorizer' in locals():
            vectorizer.disconnect()

if __name__ == "__main__":
    main()