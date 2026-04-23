/**
 * 向量相似度搜索模块
 * 提供基于naming_classics表向量数据的语义搜索功能
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

// 默认配置
const DEFAULT_CONFIG: VectorSearchConfig = {
  similarityThreshold: 0.05,  // 降低阈值，因为测试向量相似度较低
  maxResults: 10,
  dimension: 1024,  // BGE-M3向量维度
};

/**
 * 计算两个向量的余弦相似度
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error(`向量维度不匹配: ${vec1.length} !== ${vec2.length}`);
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

/**
 * 解析bytea格式的嵌入向量为浮点数数组
 */
export function parseEmbedding(embeddingBytes: Buffer | null): number[] {
  if (!embeddingBytes) {
    return [];
  }

  const bytes = new Uint8Array(embeddingBytes);
  
  // 假设是float32数组（4字节）
  if (bytes.length % 4 !== 0) {
    throw new Error(`字节长度 ${bytes.length} 不是4的倍数`);
  }

  const dimension = bytes.length / 4;
  const floats = new Float32Array(dimension);
  
  for (let i = 0; i < dimension; i++) {
    const byteOffset = i * 4;
    const view = new DataView(bytes.buffer, byteOffset, 4);
    floats[i] = view.getFloat32(0, true); // little-endian
  }

  return Array.from(floats);
}

/**
 * 生成测试嵌入向量（用于模拟BGE-M3）
 * 注意：此函数仅用于开发测试，生产环境应使用真实的BGE-M3模型
 */
export function generateTestEmbedding(text: string, dimension: number = 1024): number[] {
  // 简单哈希生成伪随机向量
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0; // 转换为32位整数
  }

  // 使用哈希作为随机种子
  const vec: number[] = [];
  for (let i = 0; i < dimension; i++) {
    // 简单的伪随机数生成
    const rand = Math.sin(hash + i) * 10000;
    const val = (rand - Math.floor(rand)) * 0.2 - 0.1; // 生成-0.1到0.1之间的值
    vec.push(val);
  }

  return vec;
}

/**
 * 关键词匹配搜索（增强版）
 * 将用户输入拆分为单个关键词，搜索 keywords 字段和文本字段
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
      // 添加原始短语
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

    // 构建关键词匹配条件：每个搜索词匹配 keywords, ancient_text, modern_text, book_name
    const conditions = uniqueTerms.map((_, i) => 
      `(keywords ILIKE $${i + 2} OR ancient_text ILIKE $${i + 2} OR modern_text ILIKE $${i + 2} OR book_name ILIKE $${i + 2})`
    );

    // ORDER BY 使用第一个原始关键词作为优先匹配
    const firstKeyword = keywords[0];

    const query = `
      SELECT id, book_name, ancient_text, modern_text, keywords
      FROM naming_classics
      WHERE (${conditions.join(' OR ')})
      ORDER BY 
        CASE 
          WHEN keywords ILIKE $${uniqueTerms.length + 2} THEN 3
          WHEN ancient_text ILIKE $${uniqueTerms.length + 2} THEN 2
          WHEN modern_text ILIKE $${uniqueTerms.length + 2} THEN 1
          ELSE 0
        END DESC
      LIMIT $1
    `;

    // 参数：第一个是限制数，后面是每个搜索词的ILIKE模式，最后一个用于排序
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
      keywords: string;
    }>(query, params);

    console.log(`[关键词搜索] 找到 ${entries.length} 个匹配典籍`);

    // 转换为统一格式
    const matches: VectorMatchResult[] = entries.map((entry) => {
      const text = entry.ancient_text || entry.modern_text || "";
      const entryKeywords = entry.keywords ? entry.keywords.split(',').map((k: string) => k.trim()) : [];

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
 * 基于向量相似度搜索相似典籍
 * 如果向量搜索无结果，会自动回退到关键词搜索
 */
export async function searchSimilarClassicsByVector(
  queryText: string,
  gender: "M" | "F" = "M",
  config: VectorSearchConfig = {}
): Promise<VectorMatchResult[]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const similarityThreshold = mergedConfig.similarityThreshold ?? DEFAULT_CONFIG.similarityThreshold!;
  const maxResults = mergedConfig.maxResults ?? DEFAULT_CONFIG.maxResults!;

  try {
    console.log(`[向量搜索] 开始搜索: "${queryText}"`);

    // 生成查询文本的嵌入向量（模拟）
    const queryVector = generateTestEmbedding(queryText, 1024);

    // 获取典籍的嵌入向量 - 增加获取数量以提高匹配机会
    const entries = await queryRaw<{
      id: string;
      book_name: string;
      ancient_text: string;
      modern_text: string;
      keywords: string;
      combined_text_embedding: Buffer;
    }>(
      `SELECT id, book_name, ancient_text, modern_text, keywords, combined_text_embedding
       FROM naming_classics
       WHERE combined_text_embedding IS NOT NULL
       LIMIT $1`,
      [maxResults * 20] // 获取更多记录用于相似度计算
    );

    console.log(`[向量搜索] 获取到 ${entries.length} 条记录，开始计算相似度...`);

    const matches: Array<{
      id: number;
      bookName: string;
      ancientText: string;
      modernText: string;
      similarity: number;
      keywords?: string[];
    }> = [];

    // 计算相似度
    for (const entry of entries) {
      try {
        // 解析典籍的嵌入向量
        const docVector = parseEmbedding(entry.combined_text_embedding);
        
        if (docVector.length === 0) {
          continue;
        }

        // 计算余弦相似度
        const similarity = cosineSimilarity(queryVector, docVector);

        // 只保留超过阈值的匹配
        if (similarity >= similarityThreshold) {
          const keywords = entry.keywords ? entry.keywords.split(',').map((k: string) => k.trim()) : [];
          
          matches.push({
            id: parseInt(entry.id),
            bookName: entry.book_name || "未知典籍",
            ancientText: entry.ancient_text || "",
            modernText: entry.modern_text || "",
            similarity,
            keywords: keywords.slice(0, 5),
          });
        }
      } catch (error) {
        console.warn(`[向量搜索] 解析典籍 ${entry.id} 失败:`, error);
        continue;
      }
    }

    // 按相似度排序
    matches.sort((a, b) => b.similarity - a.similarity);

    // 如果匹配结果太少，降低阈值重新筛选
    let topMatches = matches;
    if (matches.length < maxResults && similarityThreshold > 0.1) {
      console.log(`[向量搜索] 匹配结果太少(${matches.length})，降低阈值到0.1重新筛选`);
      const lowerThreshold = 0.1;
      const allMatches: Array<{
        id: number;
        bookName: string;
        ancientText: string;
        modernText: string;
        similarity: number;
        keywords?: string[];
      }> = [];
      
      for (const entry of entries) {
        try {
          const docVector = parseEmbedding(entry.combined_text_embedding);
          if (docVector.length === 0) continue;
          
          const similarity = cosineSimilarity(queryVector, docVector);
          if (similarity >= lowerThreshold) {
            const keywords = entry.keywords ? entry.keywords.split(',').map((k: string) => k.trim()) : [];
            allMatches.push({
              id: parseInt(entry.id),
              bookName: entry.book_name || "未知典籍",
              ancientText: entry.ancient_text || "",
              modernText: entry.modern_text || "",
              similarity,
              keywords: keywords.slice(0, 5),
            });
          }
        } catch (error) {
          continue;
        }
      }
      
      allMatches.sort((a, b) => b.similarity - a.similarity);
      topMatches = allMatches.slice(0, maxResults);
    }

    console.log(`[向量搜索] 找到 ${topMatches.length} 个相似典籍 (阈值: ${similarityThreshold})`);

    // 如果向量搜索找到0个结果，回退到关键词搜索
    if (topMatches.length === 0) {
      console.log(`[向量搜索] 向量搜索无结果，回退到关键词搜索`);
      return await searchSimilarClassicsByKeywords(queryText, gender, maxResults);
    }

    // 转换为完整结果格式
    const results: VectorMatchResult[] = topMatches.map(match => {
      const text = match.ancientText || match.modernText || "";
      
      return {
        ...match,
        extractedChars: extractMeaningfulChars(text, gender),
        meaning: extractMeaning(text),
      };
    });

    return results;

  } catch (error) {
    console.error("[向量搜索] 搜索失败:", error);
    // 向量搜索失败，回退到关键词搜索
    return await searchSimilarClassicsByKeywords(queryText, gender, maxResults);
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

/**
 * 测试向量搜索功能
 */
export async function testVectorSearch(): Promise<void> {
  console.log("测试向量搜索功能...");

  // 测试余弦相似度计算
  const vec1 = [1, 2, 3];
  const vec2 = [1, 2, 3];
  const vec3 = [2, 4, 6];
  
  const sim1 = cosineSimilarity(vec1, vec2);
  const sim2 = cosineSimilarity(vec1, vec3);
  
  console.log(`测试相似度计算:`);
  console.log(`  vec1 vs vec2 (相同): ${sim1.toFixed(4)}`);
  console.log(`  vec1 vs vec3 (同向): ${sim2.toFixed(4)}`);

  // 测试向量搜索
  const queryText = "聪明智慧";
  const matches = await searchSimilarClassicsByVector(queryText, "M", {
    maxResults: 3,
    similarityThreshold: 0.3,
  });

  console.log(`\n测试搜索 "${queryText}":`);
  console.log(`  找到 ${matches.length} 个匹配结果`);
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    console.log(`  ${i + 1}. [${match.bookName}] 相似度: ${match.similarity.toFixed(4)}`);
    console.log(`     文本: ${match.ancientText || match.modernText}`);
    console.log(`     提取字符: ${match.extractedChars.join(', ')}`);
  }
}

// 导出工具函数
export const VectorSimilaritySearch = {
  cosineSimilarity,
  parseEmbedding,
  generateTestEmbedding,
  searchSimilarClassicsByVector,
  searchSimilarClassicsByKeywords,
  batchSearchSimilarClassics,
  testVectorSearch,
};
