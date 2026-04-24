/**
 * 向量相似度搜索模块（重写版）
 * 
 * 核心逻辑：
 * 1. 用户输入文本 → 调用本地嵌入服务(BGE-small-zh) → 生成512维向量
 * 2. 使用 pgvector `<=>` 余弦距离算子，在 classics_entries 表中做语义相似度搜索
 * 3. 如果向量搜索结果不足(＜5条)，自动回退到关键词搜索兜底
 * 4. 合并去重后返回最终结果
 */

import { queryRaw } from "./prisma";
import { EmbeddingClient } from "./embedding-client";

// 向量相似度配置
export interface VectorSearchConfig {
  similarityThreshold?: number;  // 相似度阈值（余弦距离，越小越相似）
  maxResults?: number;          // 最大返回结果数
  dimension?: number;           // 向量维度
  vectorOnly?: boolean;         // 仅使用向量搜索（不启用关键词兜底）
}

// 典籍匹配结果
export interface VectorMatchResult {
  id: number;
  bookName: string;
  ancientText: string;
  modernText: string;
  similarity: number;      // 0~1 之间的相似度得分（1为最相似）
  extractedChars: string[];
  meaning: string;
  keywords?: string[];
  searchMethod: "vector" | "keyword"; // 来源标记
}

/**
 * 使用 pgvector 余弦距离(`<=>`)进行语义搜索
 * combined_text_embedding 列存储 512 维向量，使用 HNSW 索引加速
 */
async function searchByVector(
  queryText: string,
  maxResults: number = 10,
  threshold: number = 0.85  // 余弦距离阈值，大于此值视为不相关
): Promise<VectorMatchResult[]> {
  try {
    console.log(`[向量搜索] 开始语义搜索: "${queryText}"`);

    // 1. 检查嵌入服务是否可用
    const serviceAvailable = await EmbeddingClient.checkEmbeddingService();
    if (!serviceAvailable) {
      console.warn("[向量搜索] 嵌入服务不可用，跳过向量搜索");
      return [];
    }

    // 2. 生成用户输入文本的向量
    const embedResult = await EmbeddingClient.embedText(queryText);
    const vectorStr = EmbeddingClient.vectorToPgVector(embedResult.vector);
    console.log(`[向量搜索] 向量已生成，维度=${embedResult.dimension}`);

    // 3. 使用 pgvector 余弦距离搜索
    // combined_text_embedding <=> $2 返回余弦距离（0=完全相同，2=完全相反）
    // 筛选距离 < threshold 的结果
    const query = `
      SELECT 
        id, 
        book_name, 
        ancient_text, 
        modern_text, 
        keywords,
        (combined_text_embedding <=> $2::vector) AS distance
      FROM classics_entries
      WHERE combined_text_embedding IS NOT NULL
        AND (combined_text_embedding <=> $2::vector) < $3
      ORDER BY combined_text_embedding <=> $2::vector
      LIMIT $1
    `;

    const entries = await queryRaw<{
      id: string;
      book_name: string;
      ancient_text: string;
      modern_text: string;
      keywords: string[] | string;
      distance: number;
    }>(query, [maxResults, vectorStr, threshold]);

    console.log(`[向量搜索] 找到 ${entries.length} 个语义匹配的典籍`);

    // 4. 转换为统一格式
    const matches: VectorMatchResult[] = entries.map((entry) => {
      const text = entry.ancient_text || entry.modern_text || "";
      
      // 将余弦距离转为相似度得分（0~1）
      // 余弦距离: 0 → 完全相同 → similarity=1
      // 余弦距离: 1 → 正交 → similarity=0.5
      // 余弦距离: 2 → 完全相反 → similarity=0
      const similarity = Math.max(0, Math.min(1, 1 - entry.distance / 2));

      let entryKeywords: string[] = [];
      if (Array.isArray(entry.keywords)) {
        entryKeywords = entry.keywords;
      } else if (typeof entry.keywords === 'string') {
        entryKeywords = entry.keywords.split(',').map((k: string) => k.trim());
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
        searchMethod: "vector" as const,
      };
    });

    return matches;
  } catch (error) {
    console.error("[向量搜索] 搜索失败:", error);
    return [];
  }
}

/**
 * 关键词匹配搜索（兜底方案）
 * 基于 classsics_entries 表的 keywords(text[])、ancient_text、modern_text、book_name 做 ILIKE 匹配
 */
async function searchByKeywords(
  queryText: string,
  maxResults: number = 10
): Promise<VectorMatchResult[]> {
  try {
    console.log(`[关键词搜索] 开始搜索: "${queryText}"`);

    // 将用户输入拆分为关键词
    const keywords = queryText
      .split(/[,，、\s]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    console.log(`[关键词搜索] 拆分关键词: [${keywords.join(', ')}]`);

    if (keywords.length === 0) {
      return [];
    }

    // 展开搜索词：原始短语 + 单字
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
    const conditions = uniqueTerms.map((_, i) => 
      `(array_to_string(keywords, ',') ILIKE $${i + 2} OR ancient_text ILIKE $${i + 2} OR modern_text ILIKE $${i + 2} OR book_name ILIKE $${i + 2})`
    );

    const firstKeyword = keywords[0];

    const query = `
      SELECT id, book_name, ancient_text, modern_text, keywords
      FROM classics_entries
      WHERE (${conditions.join(' OR ')})
      ORDER BY 
        CASE 
          WHEN array_to_string(keywords, ',') ILIKE $${uniqueTerms.length + 2} THEN 3
          WHEN ancient_text ILIKE $${uniqueTerms.length + 2} THEN 2
          WHEN modern_text ILIKE $${uniqueTerms.length + 2} THEN 1
          ELSE 0
        END DESC
      LIMIT $1
    `;

    const params = [
      maxResults,
      ...uniqueTerms.map(kw => `%${kw}%`),
      `%${firstKeyword}%`
    ];

    const entries = await queryRaw<{
      id: string;
      book_name: string;
      ancient_text: string;
      modern_text: string;
      keywords: string[] | string;
    }>(query, params);

    console.log(`[关键词搜索] 找到 ${entries.length} 个匹配典籍`);

    const matches: VectorMatchResult[] = entries.map((entry) => {
      const text = entry.ancient_text || entry.modern_text || "";
      let entryKeywords: string[] = [];
      if (Array.isArray(entry.keywords)) {
        entryKeywords = entry.keywords;
      } else if (typeof entry.keywords === 'string') {
        entryKeywords = entry.keywords.split(',').map((k: string) => k.trim());
      }

      return {
        id: parseInt(entry.id),
        bookName: entry.book_name || "未知典籍",
        ancientText: entry.ancient_text || "",
        modernText: entry.modern_text || "",
        similarity: 0.7, // 关键词匹配固定为0.7
        extractedChars: extractMeaningfulChars(text),
        meaning: extractMeaning(text),
        keywords: entryKeywords.slice(0, 5),
        searchMethod: "keyword" as const,
      };
    });

    return matches;
  } catch (error) {
    console.error("[关键词搜索] 搜索失败:", error);
    return [];
  }
}

/**
 * 主搜索入口：向量搜索优先，关键词搜索兜底
 * 
 * 策略：
 * 1. 先使用 pgvector 余弦距离搜索语义匹配
 * 2. 如果向量搜索结果不足（＜minResults条），再用关键词搜索补充
 * 3. 合并去重后返回
 */
export async function searchSimilarClassicsByVector(
  queryText: string,
  gender: "M" | "F" = "M",
  config: VectorSearchConfig = {}
): Promise<VectorMatchResult[]> {
  try {
    console.log(`[典籍搜索] 开始搜索: "${queryText}", gender=${gender}`);

    const maxResults = config.maxResults ?? 10;
    const threshold = config.similarityThreshold ?? 0.85;
    const minResults = Math.min(5, maxResults); // 至少需要5条才满足

    // 1. 向量搜索
    const vectorResults = await searchByVector(queryText, maxResults, threshold);

    console.log(`[典籍搜索] 向量搜索返回 ${vectorResults.length} 条`);

    // 2. 如果向量搜索结果足够，直接返回
    if (vectorResults.length >= minResults && !config.vectorOnly === false) {
      console.log(`[典籍搜索] 向量搜索结果充足(${vectorResults.length}条)，直接返回`);
      return vectorResults.slice(0, maxResults);
    }

    // 3. 向量搜索结果不足，用关键词搜索兜底补充
    console.log(`[典籍搜索] 向量搜索结果不足(${vectorResults.length}条)，尝试关键词搜索兜底...`);
    const keywordResults = await searchByKeywords(queryText, maxResults);

    // 4. 合并去重（按id去重，向量结果优先）
    const seenIds = new Set<number>();
    const mergedResults: VectorMatchResult[] = [];

    // 先放入向量搜索结果
    for (const match of vectorResults) {
      if (!seenIds.has(match.id)) {
        seenIds.add(match.id);
        mergedResults.push(match);
      }
    }

    // 再补充关键词搜索结果（去重）
    for (const match of keywordResults) {
      if (!seenIds.has(match.id) && mergedResults.length < maxResults) {
        seenIds.add(match.id);
        mergedResults.push(match);
      }
    }

    console.log(`[典籍搜索] 合并后共 ${mergedResults.length} 条结果（向量${vectorResults.length}条 + 关键词${keywordResults.length}条）`);

    return mergedResults.slice(0, maxResults);
  } catch (error) {
    console.error("[典籍搜索] 搜索失败:", error);
    // 出错时回退到纯关键词搜索
    console.log("[典籍搜索] 搜索异常，回退到关键词搜索");
    return await searchByKeywords(queryText, config.maxResults ?? 10);
  }
}

/**
 * 批量搜索相似典籍
 */
export async function batchSearchSimilarClassics(
  queryTexts: string[],
  gender: "M" | "F" = "M",
  config: VectorSearchConfig = {}
): Promise<Map<string, VectorMatchResult[]>> {
  const results = new Map<string, VectorMatchResult[]>();
  for (const queryText of queryTexts) {
    const matches = await searchSimilarClassicsByVector(queryText, gender, config);
    results.set(queryText, matches);
  }
  return results;
}

/**
 * 从文本中提取有意义的字符（用于起名）
 */
function extractMeaningfulChars(text: string, _gender?: "M" | "F"): string[] {
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

// 导出
export { searchByVector, searchByKeywords };
export const VectorSimilaritySearch = {
  searchSimilarClassicsByVector,
  batchSearchSimilarClassics,
  searchByVector,
  searchByKeywords,
};
