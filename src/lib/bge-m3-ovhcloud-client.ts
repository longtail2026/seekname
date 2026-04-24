/**
 * OVHcloud BGE-M3 嵌入服务客户端
 * 
 * OVHcloud Endpoint: https://oai.endpoints.kepler.ai.cloud.ovh.net/v1
 * 兼容 OpenAI Embedding API 格式，无需 API Key
 * 模型：BAAI/bge-m3 → 1024 维向量
 * 
 * API 格式：
 *   POST /v1/embeddings
 *   Body: { "model": "BAAI/bge-m3", "input": "text" }
 *   Response: { "object": "list", "data": [{ "index": 0, "embedding": [...], "object": "embedding" }], "model": "bge-m3", "usage": {...} }
 */

// OVHcloud 配置
const OVHCLOUD_CONFIG = {
  baseUrl: process.env.OVHCLOUD_BGE_M3_URL || "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
  model: "BAAI/bge-m3",
  dimension: 1024,
  timeout: 30000,      // 30秒超时
  maxRetries: 2,
};

export interface OVHEmbedResult {
  vector: number[];
  dimension: number;
  normalized: boolean;
}

export interface OVHBatchEmbedResult {
  vectors: number[][];
  dimension: number;
  count: number;
  normalized: boolean;
}

/**
 * 检查 OVHcloud 嵌入服务是否可用
 */
export async function checkOVHCloudService(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${OVHCLOUD_CONFIG.baseUrl}/models`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * 调用 OVHcloud OpenAI 兼容 API 生成 BGE-M3 嵌入向量
 * 输入文本，返回 1024 维浮点数数组
 * 无需 API Key
 */
export async function embedText(
  text: string,
  normalize: boolean = true
): Promise<OVHEmbedResult> {
  if (!text || text.trim().length === 0) {
    throw new Error("嵌入文本不能为空");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= OVHCLOUD_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OVHCLOUD_CONFIG.timeout);

      const response = await fetch(`${OVHCLOUD_CONFIG.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OVHCLOUD_CONFIG.model,
          input: text,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OVHcloud API 错误 (${response.status}): ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();

      // OpenAI 兼容格式解析
      // { "data": [{ "embedding": [...], "index": 0, "object": "embedding" }], "model": "bge-m3", "usage": {...} }
      let vector: number[];

      if (data?.data && Array.isArray(data.data)) {
        const first = data.data[0];
        if (first?.embedding && Array.isArray(first.embedding)) {
          vector = first.embedding;
        } else {
          throw new Error(`无法解析 OVHcloud API 响应格式: data[0] 缺少 embedding 字段`);
        }
      } else {
        throw new Error(`无法解析 OVHcloud API 响应: ${JSON.stringify(data).slice(0, 200)}`);
      }

      // 验证维度
      if (vector.length !== OVHCLOUD_CONFIG.dimension) {
        console.warn(`[OVH-BGE-M3] 向量维度异常: 期望 ${OVHCLOUD_CONFIG.dimension}, 实际 ${vector.length}`);
      }

      return {
        vector,
        dimension: vector.length,
        normalized: normalize,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[OVH-BGE-M3] 嵌入请求失败 (尝试 ${attempt + 1}/${OVHCLOUD_CONFIG.maxRetries + 1}): ${lastError.message}`);

      if (attempt < OVHCLOUD_CONFIG.maxRetries) {
        // 指数退避 1s, 2s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error("OVHcloud BGE-M3 嵌入请求全部失败");
}

/**
 * 批量生成文本向量嵌入
 * OVHcloud API 支持批量输入
 */
export async function batchEmbedTexts(
  texts: string[],
  normalize: boolean = true
): Promise<OVHBatchEmbedResult> {
  if (texts.length === 0) {
    return { vectors: [], dimension: 0, count: 0, normalized: normalize };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= OVHCLOUD_CONFIG.maxRetries; attempt++) {
    try {
      const timeoutMs = OVHCLOUD_CONFIG.timeout + texts.length * 500;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${OVHCLOUD_CONFIG.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OVHCLOUD_CONFIG.model,
          input: texts,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OVHcloud 批量 API 错误 (${response.status}): ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();

      // OpenAI 批量格式: data 数组按 index 排序
      if (!data?.data || !Array.isArray(data.data)) {
        throw new Error(`无法解析 OVHcloud 批量响应`);
      }

      const vectors: number[][] = data.data
        .sort((a: any, b: any) => a.index - b.index)
        .map((item: any) => item.embedding);

      // 验证维度
      const dim = vectors[0]?.length || 0;
      if (dim !== OVHCLOUD_CONFIG.dimension) {
        console.warn(`[OVH-BGE-M3] 批量向量维度异常: 期望 ${OVHCLOUD_CONFIG.dimension}, 实际 ${dim}`);
      }

      return {
        vectors,
        dimension: dim,
        count: vectors.length,
        normalized: normalize,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[OVH-BGE-M3] 批量嵌入失败 (尝试 ${attempt + 1}/${OVHCLOUD_CONFIG.maxRetries + 1}): ${lastError.message}`);

      if (attempt < OVHCLOUD_CONFIG.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error("OVHcloud BGE-M3 批量嵌入全部失败");
}

/**
 * 将向量转为 pgvector 格式字符串 '[0.1,0.2,...]'
 */
export function vectorToPgVector(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

// 导出
export const OVHCloudBGE3Client = {
  checkOVHCloudService,
  embedText,
  batchEmbedTexts,
  vectorToPgVector,
};
