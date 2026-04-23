#!/usr/bin/env python3
"""
使用BGE-M3模型生成典籍条目的嵌入向量 - 优化版本V2
优化点：
1. 增加批处理大小（从10到32）
2. 优化推理批大小（从4到16）
3. 添加多进程支持（修复了数据库连接pickle问题）
4. 添加内存使用优化
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
import multiprocessing
from concurrent.futures import ProcessPoolExecutor, as_completed
import gc

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bge_m3_embeddings_optimized_v2.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class BGE_M3_Embedder:
    """BGE-M3嵌入模型包装器 - 优化版本"""
    
    def __init__(self, model_name: str = "BAAI/bge-m3", device: str = None):
        """
        初始化BGE-M3模型
        
        Args:
            model_name: HuggingFace模型名称
            device: 'cuda' 或 'cpu'，自动检测如果为None
        """
        self.model_name = model_name
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        
        logger.info(f"加载 BGE-M3 模型: {model_name} 在 {self.device} 上")
        
        # 加载tokenizer和模型
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()
        
        logger.info("BGE-M3 模型加载成功")
        logger.info(f"嵌入维度: {self.model.config.hidden_size}")
    
    def encode(self, texts: List[str], batch_size: int = 16) -> np.ndarray:
        """
        编码文本为嵌入向量 - 优化版本
        
        Args:
            texts: 文本字符串列表
            batch_size: 推理批大小（增加到16）
            
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
                    max_length=512,
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
                if self.device == 'cuda':
                    torch.cuda.empty_cache()
        
        # 合并所有批次的嵌入
        if embeddings:
            return np.vstack(embeddings)
        return np.array([])
    
    def get_embedding_dim(self) -> int:
        """获取嵌入维度"""
        return self.model.config.hidden_size

class BGE_M3_Vectorizer_Optimized_V2:
    """使用BGE-M3向量化典籍条目 - 优化版本V2（修复多进程问题）"""
    
    def __init__(self, host="localhost", port=5432, database="seekname_db", 
                 user="postgres", password="postgres", num_workers: int = 2):
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.num_workers = num_workers
        self.embedding_dim = 1024  # BGE-M3的固定维度
        self.conn = None
        self.cur = None
    
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
    
    def clear_existing_embeddings(self):
        """清除现有的嵌入向量，为BGE-M3重新生成做准备"""
        try:
            self.cur.execute("""
                UPDATE classics_entries 
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
    
    def get_batch_to_process(self, batch_size: int = 32) -> List[Tuple[int, str, Optional[str]]]:
        """获取待处理的批次条目 - 增加批次大小到32"""
        self.cur.execute("""
            SELECT id, ancient_text, modern_text 
            FROM classics_entries 
            WHERE combined_text_embedding IS NULL 
            AND ancient_text IS NOT NULL 
            AND ancient_text != ''
            ORDER BY id
            LIMIT %s
        """, (batch_size,))
        
        return self.cur.fetchall()
    
    def get_total_to_process(self) -> int:
        """获取待处理的总条目数"""
        self.cur.execute("""
            SELECT COUNT(*) 
            FROM classics_entries 
            WHERE combined_text_embedding IS NULL 
            AND ancient_text IS NOT NULL 
            AND ancient_text != ''
        """)
        return self.cur.fetchone()[0]
    
    def generate_embeddings_batch(self, entries: List[Tuple[int, str, Optional[str]]]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """为批次条目生成嵌入向量 - 优化版本"""
        entry_ids = [e[0] for e in entries]
        ancient_texts = [e[1] for e in entries]
        modern_texts = [e[2] if e[2] else "" for e in entries]
        
        logger.info(f"为 {len(entries)} 个条目生成BGE-M3嵌入向量...")
        
        # 创建工作进程专用的嵌入器
        embedder = BGE_M3_Embedder()
        
        # 生成嵌入向量 - 使用更大的批大小
        ancient_embeddings = embedder.encode(ancient_texts, batch_size=16)
        modern_embeddings = embedder.encode(modern_texts, batch_size=16) if any(modern_texts) else np.array([])
        
        # 清理嵌入器以释放内存
        del embedder
        gc.collect()
        
        # 创建组合嵌入向量（加权平均）
        combined_embeddings = []
        for i, (ancient_vec, modern_vec) in enumerate(zip(ancient_embeddings, modern_embeddings if len(modern_embeddings) > 0 else [None] * len(ancient_embeddings))):
            if modern_vec is not None and np.any(modern_vec):  # 如果现代文本存在
                # 古籍文本权重更高（0.7），现代文本权重较低（0.3）
                combined = 0.7 * ancient_vec + 0.3 * modern_vec
                # 归一化
                norm = np.linalg.norm(combined)
                if norm > 0:
                    combined = combined / norm
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
                modern_bytes = modern_embeddings[i].astype(np.float32).tobytes() if i < len(modern_embeddings) else None
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
                UPDATE classics_entries AS ce
                SET 
                    ancient_text_embedding = data.ancient_embedding,
                    modern_text_embedding = data.modern_embedding,
                    combined_text_embedding = data.combined_embedding
                FROM (VALUES %s) AS data(id, ancient_embedding, modern_embedding, combined_embedding)
                WHERE ce.id = data.id
                """,
                update_data
            )
            
            self.conn.commit()
            logger.info(f"已存储 {len(entries)} 个条目的嵌入向量")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"存储嵌入向量失败: {e}")
            raise
    
    def process_all_single_process(self, batch_size: int = 32, clear_existing: bool = False):
        """单进程处理所有条目 - 优化版本"""
        if clear_existing:
            logger.info("清除现有的嵌入向量...")
            self.clear_existing_embeddings()
        
        total = self.get_total_to_process()
        logger.info(f"待处理的条目总数: {total}")
        
        if total == 0:
            logger.info("所有条目已有嵌入向量")
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
                    self.generate_embeddings_batch(entries)
                
                # 存储嵌入向量
                self.store_embeddings_batch(entries, ancient_embeddings, modern_embeddings, combined_embeddings)
                
                # 更新进度
                processed += len(entries)
                elapsed = time.time() - start_time
                rate = processed / elapsed if elapsed > 0 else 0
                remaining_minutes = (total - processed) / rate / 60 if rate > 0 else 0
                
                logger.info(f"进度: {processed}/{total} ({processed/total*100:.1f}%) - "
                           f"速率: {rate:.2f} 条目/秒 - "
                           f"预计剩余时间: {remaining_minutes:.1f} 分钟")
                
                # 每处理1000个条目保存一次进度
                if processed % 1000 == 0:
                    logger.info(f"检查点: 已处理 {processed} 个条目")
        
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
        logger.info(f"平均速率: {processed/total_time:.2f} 条目/秒" if total_time > 0 else "完成")
    
    def process_all_multiprocess(self, batch_size: int = 32, clear_existing: bool = False):
        """多进程处理所有条目"""
        if clear_existing:
            logger.info("清除现有的嵌入向量...")
            self.clear_existing_embeddings()
        
        total = self.get_total_to_process()
        logger.info(f"待处理的条目总数: {total}")
        
        if total == 0:
            logger.info("所有条目已有嵌入向量")
            return
        
        processed = 0
        start_time = time.time()
        
        try:
            # 首先获取所有待处理的ID
            self.cur.execute("""
                SELECT id, ancient_text, modern_text 
                FROM classics_entries 
                WHERE combined_text_embedding IS NULL 
                AND ancient_text IS NOT NULL 
                AND ancient_text != ''
                ORDER BY id
            """)
            
            all_entries = self.cur.fetchall()
            logger.info(f"获取到 {len(all_entries)} 个待处理条目")
            
            # 分割数据到各个工作进程
            chunk_size = max(1, len(all_entries) // self.num_workers)
            chunks = []
            for i in range(0, len(all_entries), chunk_size):
                chunks.append(all_entries[i:i + chunk_size])
            
            logger.info(f"使用 {len(chunks)} 个工作进程处理 {len(all_entries)} 个条目")
            
            # 使用进程池
            futures = []
            with ProcessPoolExecutor(max_workers=min(self.num_workers, len(chunks))) as executor:
                # 提交任务
                for i, chunk in enumerate(chunks):
                    future = executor.submit(
                        self._process_chunk_multiprocess,
                        chunk,
                        i,
                        self.host,
                        self.port,
                        self.database,
                        self.user,
                        self.password
                    )
                    futures.append(future)
                
                # 收集并处理结果
                for i, future in enumerate(as_completed(futures)):
                    try:
                        chunk_result = future.result()
                        chunk_processed = chunk_result['processed']
                        chunk_time = chunk_result['time']
                        
                        # 在主进程中存储嵌入向量
                        self._store_chunk_embeddings(chunk_result)
                        
                        processed += chunk_processed
                        elapsed = time.time() - start_time
                        rate = processed / elapsed if elapsed > 0 else 0
                        remaining_minutes = (total - processed) / rate / 60 if rate > 0 else 0
                        
                        logger.info(f"进度: {processed}/{total} ({processed/total*100:.1f}%) - "
                                   f"速率: {rate:.2f} 条目/秒 - "
                                   f"预计剩余时间: {remaining_minutes:.1f} 分钟")
                        
                    except Exception as e:
                        logger.error(f"工作进程 {i} 失败: {e}")
                        raise
        
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
        logger.info(f"平均速率: {processed/total_time:.2f} 条目/秒" if total_time > 0 else "完成")
    
    @staticmethod
    def _process_chunk_multiprocess(chunk: List[Tuple[int, str, Optional[str]]], 
                                   chunk_idx: int,
                                   host: str, port: int, database: str, 
                                   user: str, password: str) -> Dict[str, Any]:
        """处理单个数据块（在工作进程中运行）"""
        import time
        import numpy as np
        import torch
        from transformers import AutoTokenizer, AutoModel
        import logging
        
        # 设置工作进程日志
        logging.basicConfig(level=logging.INFO)
        
        start_time = time.time()
        
        # 在工作进程中创建新的模型实例
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-m3")
        model = AutoModel.from_pretrained("BAAI/bge-m3")
        model.to(device)
        model.eval()
        
        entry_ids = [e[0] for e in chunk]
        ancient_texts = [e[1] for e in chunk]
        modern_texts = [e[2] if e[2] else "" for e in chunk]
        
        # 生成嵌入向量
        ancient_embeddings = []
        modern_embeddings = []
        
        with torch.no_grad():
            # 处理古籍文本
            for i in range(0, len(ancient_texts), 16):
                batch_texts = ancient_texts[i:i + 16]
                encoded_input = tokenizer(
                    batch_texts,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors='pt'
                ).to(device)
                
                model_output = model(**encoded_input)
                batch_embeddings = model_output.last_hidden_state[:, 0]
                batch_embeddings = torch.nn.functional.normalize(batch_embeddings, p=2, dim=1)
                ancient_embeddings.append(batch_embeddings.cpu().numpy())
            
            # 处理现代文本（如果有）
            if any(modern_texts):
                for i in range(0, len(modern_texts), 16):
                    batch_texts = modern_texts[i:i + 16]
                    if not any(batch_texts):  # 跳过空文本
                        continue
                    
                    encoded_input = tokenizer(
                        batch_texts,
                        padding=True,
                        truncation=True,
                        max_length=512,
                        return_tensors='pt'
                    ).to(device)
                    
                    model_output = model(**encoded_input)
                    batch_embeddings = model_output.last_hidden_state[:, 0]
                    batch_embeddings = torch.nn.functional.normalize(batch_embeddings, p=2, dim=1)
                    modern_embeddings.append(batch_embeddings.cpu().numpy())
        
        # 合并批次的嵌入
        ancient_embeddings_np = np.vstack(ancient_embeddings) if ancient_embeddings else np.array([])
        modern_embeddings_np = np.vstack(modern_embeddings) if modern_embeddings else np.array([])
        
        # 创建组合嵌入向量
        combined_embeddings = []
        for i in range(len(ancient_embeddings_np)):
            ancient_vec = ancient_embeddings_np[i]
            
            if i < len(modern_embeddings_np) and np.any(modern_embeddings_np[i]):
                modern_vec = modern_embeddings_np[i]
                combined = 0.7 * ancient_vec + 0.3 * modern_vec
                norm = np.linalg.norm(combined)
                if norm > 0:
                    combined = combined / norm
                combined_embeddings.append(combined)
            else:
                combined_embeddings.append(ancient_vec)
        
        combined_embeddings_np = np.array(combined_embeddings)
        
        # 将嵌入向量转换为字节（以便pickle）
        ancient_bytes_list = []
        modern_bytes_list = []
        combined_bytes_list = []
        
        for i in range(len(chunk)):
            ancient_bytes = ancient_embeddings_np[i].astype(np.float32).tobytes()
            modern_bytes = modern_embeddings_np[i].astype(np.float32).tobytes() if i < len(modern_embeddings_np) else None
            combined_bytes = combined_embeddings_np[i].astype(np.float32).tobytes()
            
            ancient_bytes_list.append(ancient_bytes)
            modern_bytes_list.append(modern_bytes)
            combined_bytes_list.append(combined_bytes)
        
        chunk_time = time.time() - start_time
        
        return {
            'chunk_idx': chunk_idx,
            'entry_ids': entry_ids,
            'ancient_bytes': ancient_bytes_list,
            'modern_bytes': modern_bytes_list,
            'combined_bytes': combined_bytes_list,
            'processed': len(chunk),
            'time': chunk_time
        }
    
    def _store_chunk_embeddings(self, chunk_result: Dict[str, Any]):
        """存储工作进程生成的嵌入向量"""
        try:
            update_data = []
            for i, entry_id in enumerate(chunk_result['entry_ids']):
                update_data.append((
                    entry_id,
                    chunk_result['ancient_bytes'][i],
                    chunk_result['modern_bytes'][i],
                    chunk_result['combined_bytes'][i]
                ))
            
            # 批量更新
            execute_values(
                self.cur,
                """
                UPDATE classics_entries AS ce
                SET 
                    ancient_text_embedding = data.ancient_embedding,
                    modern_text_embedding = data.modern_embedding,
                    combined_text_embedding = data.combined_embedding
                FROM (VALUES %s) AS data(id, ancient_embedding, modern_embedding, combined_embedding)
                WHERE ce.id = data.id
                """,
                update_data
            )
            
            self.conn.commit()
            logger.info(f"已存储 {len(update_data)} 个条目的嵌入向量")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"存储嵌入向量失败: {e}")
            raise
    
    def verify_embeddings(self, sample_count: int = 5):
        """验证生成的嵌入向量"""
        try:
            self.cur.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(ancient_text_embedding) as with_ancient,
                    COUNT(modern_text_embedding) as with_modern,
                    COUNT(combined_text_embedding) as with_combined
                FROM classics_entries
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
                FROM classics_entries
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
        # 配置
        host = os.getenv("DB_HOST", "localhost")
        port = int(os.getenv("DB_PORT", "5432"))
        database = os.getenv("DB_NAME", "seekname_db")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "postgres")
        
        # 获取CPU核心数用于多进程
        num_workers = max(1, multiprocessing.cpu_count() // 2)
        logger.info(f"系统CPU核心数: {multiprocessing.cpu_count()}, 使用工作进程数: {num_workers}")
        
        # 询问用户使用哪种模式
        print("\n选择处理模式:")
        print("1. 单进程模式（稳定，内存占用低）")
        print("2. 多进程模式（快速，使用所有CPU核心）")
        choice = input("请输入选择 (1 或 2): ").strip()
        
        # 初始化向量化器
        vectorizer = BGE_M3_Vectorizer_Optimized_V2(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password,
            num_workers=num_workers
        )
        
        # 连接数据库
        vectorizer.connect()
        
        # 处理所有条目
        logger.info("开始使用优化版BGE-M3生成嵌入向量...")
        
        # 根据用户选择执行不同的处理模式
        if choice == "2":
            logger.info("使用多进程模式处理...")
            # 注意：多进程模式需要更多内存，但速度更快
            vectorizer.process_all_multiprocess(
                batch_size=1000,  # 多进程模式使用更大的批次
                clear_existing=True
            )
        else:
            logger.info("使用单进程模式处理...")
            # 单进程模式更稳定
            vectorizer.process_all_single_process(
                batch_size=32, 
                clear_existing=True
            )
        
        # 验证嵌入向量
        logger.info("验证生成的嵌入向量...")
        vectorizer.verify_embeddings()
        
        logger.info("\nBGE-M3向量化优化版V2完成成功!")
        logger.info("\n优化总结:")
        logger.info("1. 批处理大小增加到32（原为10）")
        logger.info("2. 推理批大小增加到16（原为4）")
        logger.info("3. 修复多进程数据库连接问题")
        logger.info("4. 优化内存管理和缓存清理")
        logger.info("\n当前处理进度:")
        
        # 显示当前状态
        vectorizer.cur.execute("SELECT COUNT(combined_text_embedding) FROM classics_entries")
        with_embeddings = vectorizer.cur.fetchone()[0]
        logger.info(f"已有嵌入向量的条目数: {with_embeddings}/124120")
        
    except Exception as e:
        logger.error(f"BGE-M3向量化失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if 'vectorizer' in locals():
            vectorizer.disconnect()

if __name__ == "__main__":
    main()


