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
 * 在 naming_materials 表中做语义向量搜索
 * 向量列：embedding (vector(1024))
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

    const vectorStr = vectorToPgVector(embedding);

    // 2. 在 naming_materials 表中做余弦相似度搜索
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
    const matches: NamingMaterialMatch[] = entries.map((entry) => {
      // 余弦距离转相似度得分 (0~1)
      const similarity = Math.max(0, Math.min(1, 1 - entry.distance / 2));

      // 解析数组字段
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
  } catch (error) {
    console.error("[材料搜索] 向量搜索失败:", error);
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