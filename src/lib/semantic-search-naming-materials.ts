/**
 * 语义搜索服务 - 面向 naming_materials 表（起名素材表）
 * 
 * 核心用途（新流程）：
 * 1. 收到客户起名意愿后，首先在 naming_materials 表做语义向量匹配
 * 2. 如果匹配到候选素材（短语）→ 直接给出 20~30 个候选名字构成提示词，交由 AI 润色
 * 3. 如果匹配不到 → 返回空，由上层回退到原来的 naming_classics 搜索流程
 * 
 * 数据库表：naming_materials（已做 BGE-M3 向量化，embedding 维度 1024）
 * 向量列：embedding (vector(1024))
 * 索引：idx_naming_materials_embedding (HNSW, cosine_ops)
 */

import { queryRaw } from "./prisma";
import { OVHCloudBGE3Client } from "./bge-m3-ovhcloud-client";

// ========== 类型定义 ==========

export interface NamingMaterialMatch {
  id: number;
  phrase: string;           // 2字候选短语，如"若溪""书瑶"
  source: string;           // 典籍出处
  sourceSnippet: string;    // 原文片段
  meaning: string;          // 释义
  keywords: string[];       // 关键词
  style: string[];          // 风格标签
  gender: string;           // 性别倾向 (M/F/B)
  wuxing: string;           // 五行
  quality: number;          // 质量评分 (1-5)
  similarity: number;       // 语义相似度
}

// ========== 配置 ==========

const VECTOR_SEARCH_CONFIG = {
  maxResults: 30,           // 最多取 30 个候选短语
  minResults: 5,            // 最少需要 5 个才走新路径，否则回退
  similarityThreshold: 0.70, // 余弦距离阈值
};

/**
 * 将向量转为 pgvector 格式字符串 '[0.1,0.2,...]'
 */
function vectorToPgVector(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

// ========== 1. OVHcloud BGE-M3 嵌入 ==========

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await OVHCloudBGE3Client.embedText(text, false);
    console.log(`[材料搜索] OVHcloud 向量已生成，维度=${result.vector.length}`);
    return result.vector;
  } catch (error) {
    console.error("[材料搜索] OVHcloud 嵌入生成失败:", error);
    throw error;
  }
}

// ========== 2. pgvector 余弦相似度搜索（naming_materials 表） ==========

/**
 * BYTEA 转 Float32Array（本地 PostgreSQL 向量存储在 BYTEA 列中）
 * 
 * 向量化脚本写入时使用 struct.pack('f' * dims)，即小端序 4 字节浮点数
 * 格式：每 4 字节 = 1 个 float32
 */
function byteaToFloat32Array(byteaBuffer: Buffer): Float32Array {
  const floatCount = byteaBuffer.byteLength / 4;
  const floats = new Float32Array(floatCount);
  for (let i = 0; i < floatCount; i++) {
    floats[i] = byteaBuffer.readFloatLE(i * 4);
  }
  return floats;
}

/**
 * 计算两个向量的余弦相似度
 */
function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 检测 naming_materials 表是否存在
 */
async function checkTableExists(): Promise<boolean> {
  try {
    const result = await queryRaw<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'naming_materials'
      ) AS exists`,
      []
    );
    return result.length > 0 && result[0].exists === true;
  } catch {
    return false;
  }
}

/**
 * 回退模式：fetch 所有数据到 JS 层，手动计算余弦相似度
 * 适用于本地 PostgreSQL（无 pgvector 扩展，embedding 列为 BYTEA）
 */
async function searchWithBytetFallback(
  embedding: number[],
  maxResults: number,
  threshold: number
): Promise<NamingMaterialMatch[]> {
  // 先检查表是否存在
  const tableExists = await checkTableExists();
  if (!tableExists) {
    console.log(`[材料搜索-回退] naming_materials 表不存在，返回空`);
    return [];
  }

  console.log(`[材料搜索-回退] 使用 BYTEA 回退模式，全量 fetch + JS 计算余弦相似度`);

  // 1. 全量拉取 embedding 字节数据和基本信息
  let allRows: any[];
  try {
    allRows = await queryRaw<{
      id: string;
      phrase: string;
      source: string;
      source_snippet: string;
      meaning: string;
      keywords: string | string[];
      style: string | string[];
      gender: string;
      wuxing: string;
      quality: number;
      embedding: Buffer;
    }>(
      `SELECT 
        id, phrase, source, source_snippet, meaning, keywords, style, gender, wuxing, quality,
        embedding
      FROM naming_materials 
      WHERE embedding IS NOT NULL`,
      []
    );
  } catch (error) {
    console.warn(`[材料搜索-回退] 查询 naming_materials 失败:`, error);
    return [];
  }

  console.log(`[材料搜索-回退] 共拉取 ${allRows.length} 条记录，开始计算余弦相似度`);

  // 2. 逐条解析 BYTEA → Float32Array，计算余弦相似度
  const scored: Array<{ row: typeof allRows[0]; similarity: number }> = [];

  for (const row of allRows) {
    try {
      const bytea = row.embedding;
      if (!bytea) continue;

      const vec = byteaToFloat32Array(bytea);
      const sim = cosineSimilarity(embedding, vec);

      if (sim >= threshold) {
        scored.push({ row, similarity: sim });
      }
    } catch (parseErr) {
      // 跳过无法解析的行
      continue;
    }
  }

  // 3. 按相似度降序排列
  scored.sort((a, b) => b.similarity - a.similarity);
  const top = scored.slice(0, maxResults);

  console.log(`[材料搜索-回退] 计算完成：${scored.length} 条超过阈值，返回前 ${top.length} 条`);

  // 4. 转换为统一格式
  const parseArray = (val: string | string[] | undefined): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [val];
      } catch {
        return val ? val.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
      }
    }
    return [];
  };

  return top.map((entry) => ({
    id: parseInt(entry.row.id),
    phrase: entry.row.phrase || "",
    source: entry.row.source || "",
    sourceSnippet: entry.row.source_snippet || "",
    meaning: entry.row.meaning || "",
    keywords: parseArray(entry.row.keywords).slice(0, 5),
    style: parseArray(entry.row.style).slice(0, 3),
    gender: (entry.row.gender || "B").toUpperCase(),
    wuxing: entry.row.wuxing || "",
    quality: entry.row.quality || 3,
    similarity: entry.similarity,
  }));
}

/**
 * 检测 pgvector 是否可用（通过探测 vector 扩展 + naming_materials 表存在性）
 * 缓存检测结果，避免每次查询都探测
 */
let pgvectorAvailable: boolean | null = null;

async function checkPgvectorAvailable(): Promise<boolean> {
  if (pgvectorAvailable !== null) return pgvectorAvailable;

  try {
    // 1. 检测 pgvector 扩展
    const result = await queryRaw<{ available: boolean }>(
      "SELECT count(*) > 0 AS available FROM pg_extension WHERE extname = 'vector'",
      []
    );
    const vectorExtAvailable = result.length > 0 && result[0].available === true;
    
    if (!vectorExtAvailable) {
      pgvectorAvailable = false;
      console.log(`[材料搜索] pgvector 扩展不存在，使用 BYTEA/空回退模式`);
      return false;
    }

    // 2. 检测 naming_materials 表是否存在
    const tableExists = await checkTableExists();
    if (!tableExists) {
      pgvectorAvailable = false;
      console.log(`[材料搜索] pgvector 扩展存在但 naming_materials 表不存在，将返回空结果`);
      return false;
    }

    // 3. 额外检测：确认 embedding 列是 vector 类型而非 bytea
    const colInfo = await queryRaw<{ data_type: string }>(
      `SELECT data_type FROM information_schema.columns 
       WHERE table_name = 'naming_materials' AND column_name = 'embedding'`,
      []
    );
    if (colInfo.length > 0) {
      pgvectorAvailable = colInfo[0].data_type === 'USER-DEFINED' || colInfo[0].data_type === 'vector';
    } else {
      // 没有 embedding 列，不能用 pgvector 查询
      pgvectorAvailable = false;
    }

    console.log(`[材料搜索] pgvector ${pgvectorAvailable ? '可用' : '不可用'}，将使用${pgvectorAvailable ? '原生 pgvector 查询' : 'BYTEA 回退模式'}`);
  } catch {
    pgvectorAvailable = false;
    console.log(`[材料搜索] pgvector 探测失败，使用 BYTEA 回退模式`);
  }

  return pgvectorAvailable;
}

/**
 * 在 naming_materials 表中做语义向量搜索
 * 向量列：embedding (vector(1024) 或 bytea)
 * 
 * 自动检测环境：
 * - pgvector 可用 → 原生 pgvector 余弦距离搜索
 * - pgvector 不可用 → JS 层手动 cosine similarity 计算
 * 
 * 返回按相似度降序排列的候选短语素材
 */
export async function searchNamingMaterialsByVector(
  userInput: string,
  maxResults: number = VECTOR_SEARCH_CONFIG.maxResults,
  threshold: number = VECTOR_SEARCH_CONFIG.similarityThreshold
): Promise<NamingMaterialMatch[]> {
  try {
    console.log(`[材料搜索] 开始向量搜索 naming_materials: "${userInput}"`);

    // 1. 生成用户输入的 BGE-M3 向量
    let embedding: number[];
    try {
      embedding = await generateEmbedding(userInput);
    } catch {
      // 嵌入失败，无法搜索
      console.warn("[材料搜索] 向量生成失败，返回空");
      return [];
    }

    // 2. 检测环境，选择搜索方式
    const usePgvector = await checkPgvectorAvailable();

    if (usePgvector) {
      // ── pgvector 模式（Neon 生产环境） ──
      console.log(`[材料搜索] 使用 pgvector 原生余弦距离搜索`);

      const vectorStr = vectorToPgVector(embedding);

      const sql = `
        SELECT 
          id,
          phrase,
          source,
          source_snippet,
          meaning,
          keywords,
          style,
          gender,
          wuxing,
          quality,
          (embedding <=> $2::vector) AS distance
        FROM naming_materials
        WHERE embedding IS NOT NULL
          AND (embedding <=> $2::vector) < $3
        ORDER BY embedding <=> $2::vector
        LIMIT $1
      `;

      const entries = await queryRaw<{
        id: string;
        phrase: string;
        source: string;
        source_snippet: string;
        meaning: string;
        keywords: string | string[];
        style: string | string[];
        gender: string;
        wuxing: string;
        quality: number;
        distance: number;
      }>(sql, [maxResults, vectorStr, threshold]);

      console.log(`[材料搜索] naming_materials 找到 ${entries.length} 个语义匹配的候选短语`);

      // 3. 转换为统一格式
      const parseArray = (val: string | string[] | undefined): string[] => {
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [val];
          } catch {
            return val ? val.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
          }
        }
        return [];
      };

      const matches: NamingMaterialMatch[] = entries.map((entry) => {
        // 余弦距离转相似度得分 (0~1)
        const similarity = Math.max(0, Math.min(1, 1 - entry.distance / 2));

        return {
          id: parseInt(entry.id),
          phrase: entry.phrase || "",
          source: entry.source || "",
          sourceSnippet: entry.source_snippet || "",
          meaning: entry.meaning || "",
          keywords: parseArray(entry.keywords).slice(0, 5),
          style: parseArray(entry.style).slice(0, 3),
          gender: (entry.gender || "B").toUpperCase(),
          wuxing: entry.wuxing || "",
          quality: entry.quality || 3,
          similarity,
        };
      });

      return matches;
    } else {
      // ── BYTEA 回退模式（本地开发环境） ──
      return await searchWithBytetFallback(embedding, maxResults, threshold);
    }
  } catch (error) {
    console.error("[材料搜索] 向量搜索失败:", error);
    
    // 如果 pgvector 模式失败，不尝试 BYTEA 回退（因为表可能不存在，BYTEA 也会失败）
    // 直接返回空数组，让上层回退到典籍搜索流程
    return [];
  }
}

// ========== 3. 主入口：先搜 naming_materials，调用方判断是否回退 ==========

/**
 * 主搜索入口（新流程第一阶段）
 * 在 naming_materials 表中做语义搜索，返回候选素材
 * 
 * @param userInput 用户起名意愿文本
 * @param gender 性别
 * @param maxResults 最大结果数（建议 20~30）
 * @returns 匹配到的候选素材，如果为空则调用方应回退到原流程
 */
export async function searchNamingMaterials(
  userInput: string,
  gender: "M" | "F" = "M",
  maxResults: number = VECTOR_SEARCH_CONFIG.maxResults
): Promise<NamingMaterialMatch[]> {
  try {
    console.log(`[材料搜索] 开始: "${userInput}", gender=${gender}`);

    // 注入性别信号增强搜索
    const genderKeywords: Record<string, string> = {
      M: "刚健英武雄壮阳刚俊朗豪迈宏大气魄",
      F: "柔美温婉娴淑秀丽优雅婉约婀娜",
    };
    const genderedInput = `${userInput} ${genderKeywords[gender] || ""}`;

    const results = await searchNamingMaterialsByVector(genderedInput, maxResults);

    if (results.length === 0) {
      console.log("[材料搜索] naming_materials 无匹配结果，调用方需回退");
      return [];
    }

    console.log(`[材料搜索] 返回 ${results.length} 个候选素材`);
    return results;
  } catch (error) {
    console.error("[材料搜索] 搜索失败:", error);
    return [];
  }
}

// ========== 导出 ==========

export const SemanticSearchNamingMaterials = {
  searchNamingMaterials,
  searchNamingMaterialsByVector,
};