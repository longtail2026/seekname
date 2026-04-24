/**
 * 语义搜索服务 - 面向 naming_classics 表
 * 
 * 核心流程：
 * 1. 调用 OVHcloud BGE-M3 API（免费、无需 API Key）生成 1024 维向量
 * 2. 在 naming_classics 表中使用 pgvector 余弦相似度搜索
 * 3. 如果语义搜索结果不足，自动降级到关键词搜索兜底
 * 4. 从匹配的典籍条目中提取字词用于后续 AI 起名
 * 
 * 数据库表：naming_classics（已做 BGE-M3 向量化，embedding 维度 1024）
 * 向量列：combined_text_embedding_vec (vector(1024)) — 原 combined_text_embedding 为 bytea 类型
 * 索引：idx_naming_classics_embedding_vec (HNSW, cosine_ops)
 */

import { queryRaw } from "./prisma";
import { OVHCloudBGE3Client } from "./bge-m3-ovhcloud-client";

// ========== 类型定义 ==========

export interface UserIntent {
  text: string;
  gender?: "M" | "F";
  style?: string[];
}

export interface ClassicsMatch {
  id: number;
  bookName: string;
  ancientText: string;
  modernText: string;
  similarity: number;
  extractedChars: string[];
  meaning: string;
  keywords?: string[];
}

// ========== 配置 ==========

const VECTOR_SEARCH_CONFIG = {
  maxResults: 10,
  minResults: 5,
  similarityThreshold: 0.85, // 余弦距离阈值，>0.85 视为不相关
};

/**
 * 将向量转为 pgvector 格式字符串 '[0.1,0.2,...]'
 */
function vectorToPgVector(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

// ========== 1. OVHcloud BGE-M3 嵌入（无备用，失败则返回空） ==========

/**
 * 调用 OVHcloud API 生成 BGE-M3 向量
 * 免费、无需 API Key
 * 如果失败则抛出错误，由上层决定是否降级到关键词搜索
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await OVHCloudBGE3Client.embedText(text, false);
    console.log(`[语义搜索] OVHcloud 向量已生成，维度=${result.vector.length}`);
    return result.vector;
  } catch (error) {
    console.error("[语义搜索] OVHcloud 嵌入生成失败:", error);
    throw error;
  }
}

// ========== 2. pgvector 余弦相似度搜索（naming_classics 表） ==========

/**
 * 使用 pgvector 余弦距离在 naming_classics 表中做语义搜索
 * 向量列：combined_text_embedding (vector(1024))
 */
export async function searchNamingClassicsByVector(
  userInput: string,
  maxResults: number = VECTOR_SEARCH_CONFIG.maxResults,
  threshold: number = VECTOR_SEARCH_CONFIG.similarityThreshold
): Promise<ClassicsMatch[]> {
  try {
    console.log(`[语义搜索] 开始向量搜索: "${userInput}"`);

    // 1. 生成用户输入的 BGE-M3 向量（仅 OVHcloud）
    let embedding: number[];
    try {
      embedding = await generateEmbedding(userInput);
    } catch {
      // 嵌入失败，跳过向量搜索
      return [];
    }

    const vectorStr = vectorToPgVector(embedding);

    // 2. 在 naming_classics 表中做余弦相似度搜索
    const sql = `
      SELECT 
        id,
        book_name,
        ancient_text,
        modern_text,
        keywords,
        (combined_text_embedding_vec <=> $2::vector) AS distance
      FROM naming_classics
      WHERE combined_text_embedding_vec IS NOT NULL
        AND (combined_text_embedding_vec <=> $2::vector) < $3
      ORDER BY combined_text_embedding_vec <=> $2::vector
      LIMIT $1
    `;

    const entries = await queryRaw<{
      id: string;
      book_name: string;
      ancient_text: string;
      modern_text: string;
      keywords: string | string[];
      distance: number;
    }>(sql, [maxResults, vectorStr, threshold]);

    console.log(`[语义搜索] 找到 ${entries.length} 个语义匹配的典籍条目`);

    // 3. 转换为统一格式
    const matches: ClassicsMatch[] = entries.map((entry) => {
      const text = entry.ancient_text || entry.modern_text || "";

      // 余弦距离转相似度得分 (0~1)
      const similarity = Math.max(0, Math.min(1, 1 - entry.distance / 2));

      let entryKeywords: string[] = [];
      if (Array.isArray(entry.keywords)) {
        entryKeywords = entry.keywords;
      } else if (typeof entry.keywords === "string") {
        entryKeywords = entry.keywords.split(",").map((k: string) => k.trim());
      }

      return {
        id: parseInt(entry.id),
        bookName: entry.book_name || "未知典籍",
        ancientText: entry.ancient_text || "",
        modernText: entry.modern_text || "",
        similarity,
        extractedChars: extractMeaningfulChars(text),
        meaning: extractMeaning(text),
        keywords: entryKeywords.slice(0, 5),
      };
    });

    return matches;
  } catch (error: any) {
    // 检测 pgvector 扩展是否未安装（生产环境常见）
    if (error?.message?.includes?.('"vector" does not exist') || error?.code === '42704') {
      console.warn(
        "[语义搜索] pgvector 扩展未安装，向量搜索不可用。\n" +
        "  ➜ 请在 Neon 数据库上执行: CREATE EXTENSION IF NOT EXISTS vector;\n" +
        "  ➜ 或运行: npx prisma migrate deploy\n" +
        "  ➜ 已自动降级到关键词搜索"
      );
    } else {
      console.error("[语义搜索] 向量搜索失败:", error);
    }
    return [];
  }
}

// ========== 3. 关键词搜索（兜底方案） ==========

/**
 * 关键词搜索兜底方案
 * 在 naming_classics 表的 keywords、ancient_text、modern_text、book_name 字段中搜索
 */
export async function searchNamingClassicsByKeyword(
  userInput: string,
  maxResults: number = VECTOR_SEARCH_CONFIG.maxResults
): Promise<ClassicsMatch[]> {
  try {
    console.log(`[关键词搜索] 开始搜索: "${userInput}"`);

    // 将用户输入拆分为关键词
    const keywords = userInput
      .split(/[,，、\s]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywords.length === 0) {
      return [];
    }

    // 展开搜索词：原始词组 + 每个单字
    const searchTerms: string[] = [];
    for (const phrase of keywords) {
      searchTerms.push(phrase);
      if (phrase.length > 1) {
        for (const char of phrase) {
          searchTerms.push(char);
        }
      }
    }
    const uniqueTerms = [...new Set(searchTerms)];

    // 构建 ILIKE 匹配条件
    const conditions = uniqueTerms.map(
      (_, i) =>
        `(COALESCE(keywords, '') ILIKE $${i + 2} 
          OR COALESCE(ancient_text, '') ILIKE $${i + 2} 
          OR COALESCE(modern_text, '') ILIKE $${i + 2} 
          OR COALESCE(book_name, '') ILIKE $${i + 2})`
    );

    const firstKeyword = keywords[0];

    const sql = `
      SELECT id, book_name, ancient_text, modern_text, keywords
      FROM naming_classics
      WHERE ${conditions.join(" OR ")}
      ORDER BY 
        CASE 
          WHEN COALESCE(keywords, '') ILIKE $${uniqueTerms.length + 2} THEN 3
          WHEN COALESCE(ancient_text, '') ILIKE $${uniqueTerms.length + 2} THEN 2
          WHEN COALESCE(modern_text, '') ILIKE $${uniqueTerms.length + 2} THEN 1
          ELSE 0
        END DESC
      LIMIT $1
    `;

    const params = [
      maxResults,
      ...uniqueTerms.map((kw) => `%${kw}%`),
      `%${firstKeyword}%`,
    ];

    const entries = await queryRaw<{
      id: string;
      book_name: string;
      ancient_text: string;
      modern_text: string;
      keywords: string | string[];
    }>(sql, params);

    console.log(`[关键词搜索] 找到 ${entries.length} 个匹配典籍`);

    const matches: ClassicsMatch[] = entries.map((entry) => {
      const text = entry.ancient_text || entry.modern_text || "";

      let entryKeywords: string[] = [];
      if (Array.isArray(entry.keywords)) {
        entryKeywords = entry.keywords;
      } else if (typeof entry.keywords === "string") {
        entryKeywords = entry.keywords.split(",").map((k: string) => k.trim());
      }

      return {
        id: parseInt(entry.id),
        bookName: entry.book_name || "未知典籍",
        ancientText: entry.ancient_text || "",
        modernText: entry.modern_text || "",
        similarity: 0.7, // 关键词匹配固定相似度
        extractedChars: extractMeaningfulChars(text),
        meaning: extractMeaning(text),
        keywords: entryKeywords.slice(0, 5),
      };
    });

    return matches;
  } catch (error) {
    console.error("[关键词搜索] 搜索失败:", error);
    return [];
  }
}

// ========== 4. 主入口：语义搜索优先，关键词兜底 ==========

/**
 * 主搜索入口
 * 策略：
 * 1. 先用 OVHcloud BGE-M3 向量在 naming_classics 表做语义搜索
 * 2. 如果搜索结果不足，自动用关键词搜索补充
 * 3. 合并去重后返回
 */
export async function searchNamingClassics(
  userInput: string,
  gender: "M" | "F" = "M",
  maxResults: number = VECTOR_SEARCH_CONFIG.maxResults
): Promise<ClassicsMatch[]> {
  try {
    console.log(`[典籍搜索] 开始搜索: "${userInput}", gender=${gender}`);

    const minResults = Math.min(VECTOR_SEARCH_CONFIG.minResults, maxResults);

    // 1. 向量搜索（OVHcloud BGE-M3）
    const vectorResults = await searchNamingClassicsByVector(userInput, maxResults);

    console.log(`[典籍搜索] 向量搜索返回 ${vectorResults.length} 条`);

    // 2. 如果向量搜索结果足够，直接返回
    if (vectorResults.length >= minResults) {
      console.log(`[典籍搜索] 向量搜索结果充足(${vectorResults.length}条)，直接返回`);
      return vectorResults.slice(0, maxResults);
    }

    // 3. 向量搜索结果不足，用关键词搜索兜底
    console.log(
      `[典籍搜索] 向量搜索结果不足(${vectorResults.length}条 < ${minResults}条)，关键词搜索兜底...`
    );
    const keywordResults = await searchNamingClassicsByKeyword(userInput, maxResults);

    // 4. 合并去重（向量结果优先）
    const seenIds = new Set<number>();
    const mergedResults: ClassicsMatch[] = [];

    for (const match of vectorResults) {
      if (!seenIds.has(match.id)) {
        seenIds.add(match.id);
        mergedResults.push(match);
      }
    }

    for (const match of keywordResults) {
      if (!seenIds.has(match.id) && mergedResults.length < maxResults) {
        seenIds.add(match.id);
        mergedResults.push(match);
      }
    }

    console.log(
      `[典籍搜索] 合并后共 ${mergedResults.length} 条结果（向量${vectorResults.length}条 + 关键词${keywordResults.length}条）`
    );

    return mergedResults.slice(0, maxResults);
  } catch (error) {
    console.error("[典籍搜索] 搜索失败:", error);
    console.log("[典籍搜索] 异常降级：使用纯关键词搜索...");
    return await searchNamingClassicsByKeyword(userInput, maxResults);
  }
}

// ========== 辅助函数 ==========

/**
 * 从典籍文本中提取有意义的汉字字符（用于起名）
 */
function extractMeaningfulChars(text: string): string[] {
  if (!text) return [];
  const chars: string[] = [];
  for (const char of text) {
    if (isChineseCharacter(char) && !chars.includes(char)) {
      chars.push(char);
    }
  }
  return chars.slice(0, 10);
}

/**
 * 从文本中提取含义摘要
 */
function extractMeaning(text: string): string {
  if (!text) return "美好寓意";
  return text.length > 30 ? text.slice(0, 30) + "..." : text;
}

function isChineseCharacter(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x4E00 && code <= 0x9FFF;
}

// ========== 导出 ==========

export const SemanticSearchNamingClassics = {
  searchNamingClassics,
  searchNamingClassicsByVector,
  searchNamingClassicsByKeyword,
};
