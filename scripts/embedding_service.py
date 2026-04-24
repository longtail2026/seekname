"""
BGE-small-zh 向量嵌入微服务
提供 HTTP API 接口，用于将文本转为 512 维向量
支持单条和批量嵌入
"""

import asyncio
import json
import logging
from typing import List

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
import uvicorn

# 配置日志
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# 全局模型实例（单例加载）
model: SentenceTransformer = None

app = FastAPI(title="BGE-small-zh Embedding Service", version="1.0.0")


# ========== 请求/响应模型 ==========

class EmbedRequest(BaseModel):
    text: str = Field(..., description="待编码的文本")
    normalize: bool = Field(default=True, description="是否归一化向量")


class BatchEmbedRequest(BaseModel):
    texts: List[str] = Field(..., description="待编码的文本列表")
    normalize: bool = Field(default=True, description="是否归一化向量")
    batch_size: int = Field(default=32, description="内部批处理大小")


class EmbedResponse(BaseModel):
    vector: List[float]
    dimension: int
    normalized: bool


class BatchEmbedResponse(BaseModel):
    vectors: List[List[float]]
    dimension: int
    count: int
    normalized: bool


class HealthResponse(BaseModel):
    status: str
    model_name: str
    model_dimension: int
    device: str


# ========== 启动事件 ==========

@app.on_event("startup")
async def load_model():
    global model
    logger.info("正在加载 BGE-small-zh 模型...")
    # 使用 BGE-small-zh-v1.5，输出 512 维向量
    model = SentenceTransformer(
        "BAAI/bge-small-zh-v1.5",
        device="cpu",      # 在开发环境使用 CPU
        cache_folder="C:/Users/Administrator/.cache/huggingface/hub",
    )
    model.eval()
    logger.info(f"模型加载完成！维度: {model.get_sentence_embedding_dimension()}, 设备: {model.device}")


# ========== API 端点 ==========

@app.get("/health", response_model=HealthResponse)
async def health():
    if model is None:
        raise HTTPException(status_code=503, detail="模型尚未加载")
    return HealthResponse(
        status="ok",
        model_name=str(model._modules.get("0", model.__class__.__name__)),
        model_dimension=model.get_sentence_embedding_dimension(),
        device=str(model.device),
    )


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="模型尚未加载")
    try:
        text = request.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="输入文本不能为空")

        # 生成嵌入向量
        emb = model.encode(text, normalize_embeddings=request.normalize)
        vector = emb.tolist()

        return EmbedResponse(
            vector=vector,
            dimension=len(vector),
            normalized=request.normalize,
        )
    except Exception as e:
        logger.error(f"嵌入生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-embed", response_model=BatchEmbedResponse)
async def batch_embed(request: BatchEmbedRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="模型尚未加载")
    try:
        texts = [t.strip() for t in request.texts if t.strip()]
        if not texts:
            raise HTTPException(status_code=400, detail="输入文本列表为空")

        logger.info(f"批量嵌入: {len(texts)} 条文本, batch_size={request.batch_size}")

        # 批量生成嵌入向量
        embeddings = model.encode(
            texts,
            normalize_embeddings=request.normalize,
            batch_size=request.batch_size,
            show_progress_bar=True,
        )
        vectors = [emb.tolist() for emb in embeddings]

        logger.info(f"批量嵌入完成: {len(vectors)} 条, 维度={len(vectors[0])}")

        return BatchEmbedResponse(
            vectors=vectors,
            dimension=len(vectors[0]),
            count=len(vectors),
            normalized=request.normalize,
        )
    except Exception as e:
        logger.error(f"批量嵌入失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== 主入口 ==========

if __name__ == "__main__":
    import sys
    
    port = 8765  # 默认端口
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    
    logger.info(f"启动 BGE-small-zh 嵌入服务，端口: {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
