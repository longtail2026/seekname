/**
 * BGE-small-zh 嵌入服务客户端
 * 连接本地 Python FastAPI 嵌入服务，生成文本向量
 */

// 嵌入服务配置
const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8765";
const EMBEDDING_TIMEOUT = 30000; // 30秒超时

export interface EmbedResult {
  vector: number[];
  dimension: number;
  normalized: boolean;
}

export interface BatchEmbedResult {
  vectors: number[][];
  dimension: number;
  count: number;
  normalized: boolean;
}

/**
 * 检查嵌入服务是否可用
 */
export async function checkEmbeddingService(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(`${EMBEDDING_SERVICE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) return false;
    const data = await resp.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * 生成单条文本的向量嵌入
 */
export async function embedText(
  text: string,
  normalize: boolean = true
): Promise<EmbedResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT);

  try {
    const resp = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, normalize }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`嵌入服务错误(${resp.status}): ${err}`);
    }

    return await resp.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("嵌入服务超时");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 批量生成文本向量嵌入
 */
export async function batchEmbedTexts(
  texts: string[],
  normalize: boolean = true,
  batchSize: number = 32
): Promise<BatchEmbedResult> {
  if (texts.length === 0) {
    return { vectors: [], dimension: 0, count: 0, normalized: normalize };
  }

  const controller = new AbortController();
  // 批量超时设置为 每批30秒 + 总额外时间
  const timeoutMs = EMBEDDING_TIMEOUT + texts.length * 200;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${EMBEDDING_SERVICE_URL}/batch-embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, normalize, batch_size: batchSize }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`批量嵌入服务错误(${resp.status}): ${err}`);
    }

    return await resp.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("批量嵌入服务超时");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 将向量转为 PostgreSQL pgvector 格式的字符串
 * 例如: '[0.1,0.2,0.3,...]'
 */
export function vectorToPgVector(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/**
 * 将文本转为 pgvector 向量字符串
 * 便捷方法：嵌入 + 格式化
 */
export async function textToPgVector(
  text: string,
  normalize: boolean = true
): Promise<string> {
  const result = await embedText(text, normalize);
  return vectorToPgVector(result.vector);
}

// 导出
export const EmbeddingClient = {
  checkEmbeddingService,
  embedText,
  batchEmbedTexts,
  vectorToPgVector,
  textToPgVector,
};
