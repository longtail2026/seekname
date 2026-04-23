/**
 * 向量相似度搜索模块
 * 提供基于classics_entries表向量数据的语义搜索功能
 * 
 * 注意：数据库实际表为classics_entries（124120条记录），包含keywords(text[])字段
 * 因生产环境未部署BGE-M3向量嵌入，暂时全部回退到关键词/全文搜索
 */

import { queryRaw } from "./prisma";

// 向量相似度配置
export interface VectorSearchConfig {
  similarityThreshold?: number;  // 相似度阈值
  maxResults?: number;          // 最大返回结果数
  dimension?: number;           // 向量维度
}

// 典籍匹配结果
export interface VectorMatchResult {
  id: number;
  bookName: string;
  ancientText: string;
  modernText: string;
  similarity: number;
  extractedChars: string[];
  meaning: string;
  keywords?: string[];
}

/**
 * 关键词匹配搜索（基于classics_entries表）
 * keywords 字段是 text[] 数组类型，使用 array_to_string 或 unnest 进行匹配
 */
export async function searchSimilarClassicsByKeywords(
  queryText: string,
  gender: "M" | "F" = "M",
  maxResults: number = 10
): Promise<VectorMatchResult[]> {
  try {
    console.log(`[关键词搜索] 开始搜索: "${queryText}"`);

    // 将用户输入拆分为单个关键词（按中文逗号、英文逗号、空格分隔）
    const keywords = queryText
      .split(/[,，、\s]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    console.log(`[关键词搜索] 拆分关键词: [${keywords.join(', ')}]`);

    if (keywords.length === 0) {
      return [];
    }

    // 构建关键词匹配条件
    // 用户输入可能是短语如"聪明智慧,才华艺术"，需要拆分为单个字匹配
    // 同时保留原始短语用于ILIKE匹配
    const searchTerms: string[] = [];
    for (const phrase of keywords) {
      searchTerms.push(phrase);
      // 如果短语包含多个字，也拆分为单个字
      if (phrase.length > 1) {
        for (const char of phrase) {
          searchTerms.push(char);
        }
      }
    }
    // 去重
    const uniqueTerms = [...new Set(searchTerms)];
    
    console.log(`[关键词搜索] 展开搜索词: [${uniqueTerms.join(', ')}]`);

    // 构建关键词匹配条件（适配 text[] 数组类型）：
    // - keywords 是 text[] 数组，使用 array_to_string 转字符串后 ILIKE
    // - ancient_text / modern_text / book_name 是 text，直接 ILIKE
    const conditions = uniqueTerms.map((_, i) => 
      `(array_to_string(keywords, ',') ILIKE $${i + 2} OR ancient_text ILIKE $${i + 2} OR modern_text ILIKE $${i + 2} OR book_name ILIKE $${i + 2})`
    );

    // ORDER BY 使用第一个原始关键词作为优先匹配
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
      maxResults * 3,
      ...uniqueTerms.map(kw => `%${kw}%`),
      `%${firstKeyword}%`  // 优先匹配第一个关键词
    ];

    const entries = await queryRaw<{
      id: string;
      book_name: string;
      ancient_text: string;
      modern_text: string;
      keywords: string[] | string;
    }>(query, params);

    console.log(`[关键词搜索] 找到 ${entries.length} 个匹配典籍`);

    // 转换为统一格式
    const matches: VectorMatchResult[] = entries.map((entry) => {
      const text = entry.ancient_text || entry.modern_text || "";
      // keywords 可能是 text[] 数组或逗号分隔字符串
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
        similarity: 0.8, // 关键词匹配固定较高相似度
        extractedChars: extractMeaningfulChars(text, gender),
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

/**
 * 搜索相似典籍（主入口）
 * 
 * 由于生产环境未部署向量嵌入，统一使用关键词/全文搜索
 * 如需启用向量搜索，需先执行向量化脚本并确保 classics_entries 表包含 
 * combined_text_embedding 列（bytea 类型）
 */
export async function searchSimilarClassicsByVector(
  queryText: string,
  gender: "M" | "F" = "M",
  config: VectorSearchConfig = {}
): Promise<VectorMatchResult[]> {
  try {
    console.log(`[典籍搜索] 开始搜索: "${queryText}"`);
    
    // 直接使用关键词搜索（回退方案）
    const maxResults = config.maxResults ?? 10;
    const results = await searchSimilarClassicsByKeywords(queryText, gender, maxResults);
    
    return results;
  } catch (error) {
    console.error("[典籍搜索] 搜索失败:", error);
    return [];
  }
}

/**
 * 批量搜索相似典籍（优化性能）
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
function extractMeaningfulChars(text: string, gender: "M" | "F" = "M"): string[] {
  if (!text) return [];

  // 常见有意义的字符（按性别偏好）
  const meaningfulChars = {
    // 通用美好字
    universal: ["智", "慧", "仁", "义", "德", "善", "勇", "刚", "强", "成", "功", "健", "康", "安", "宁", "快", "乐", "欣", "悦"],
    // 女性偏好字
    female: ["雅", "婉", "淑", "静", "柔", "美", "丽", "婷", "芸", "兰", "芳", "芷", "馨", "怡", "媛", "婕", "娅", "嫣"],
    // 男性偏好字
    male: ["伟", "雄", "豪", "杰", "俊", "博", "文", "韬", "略", "宇", "轩", "浩", "泽", "涛", "峰", "岩", "磊", "森"],
  };

  const chars: string[] = [];
  const genderChars = gender === "F" ? meaningfulChars.female : meaningfulChars.male;
  const allChars = [...meaningfulChars.universal, ...genderChars];

  // 从文本中提取字符
  for (const char of text) {
    if (allChars.includes(char) && !chars.includes(char)) {
      chars.push(char);
    }
  }

  // 如果提取的字符太少，添加一些默认字符
  if (chars.length < 3) {
    const defaultChars = gender === "F" 
      ? ["雅", "欣", "怡"] 
      : ["浩", "宇", "博"];

    for (const char of defaultChars) {
      if (!chars.includes(char)) {
        chars.push(char);
      }
    }
  }

  return chars.slice(0, 10); // 返回最多10个字符
}

/**
 * 从文本中提取含义
 */
function extractMeaning(text: string): string {
  if (!text) return "美好寓意";

  // 简单提取前30个字符作为含义
  const preview = text.length > 30 ? text.slice(0, 30) + "..." : text;
  return preview;
}

// 导出工具函数
export const VectorSimilaritySearch = {
  searchSimilarClassicsByVector,
  searchSimilarClassicsByKeywords,
  batchSearchSimilarClassics,
};
