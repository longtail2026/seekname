/**
 * 英文名词典语义搜索
 * 
 * 在 Neon PostgreSQL 的 ename_dict 表上做 BGE-M3 向量语义搜索。
 * 用于"英文起名"功能：根据用户输入的中文/英文描述，语义匹配最合适的英文名。
 * 
 * 数据库表：ename_dict（postgresql://neondb...）
 * 向量列：embedding (vector(1024)，已通过 python vectorize_ename_dict.py 生成)
 * 索引：idx_ename_dict_embedding (IVFFlat, cosine_ops)
 */

import { queryRaw } from "./prisma";
import { OVHCloudBGE3Client } from "./bge-m3-ovhcloud-client";

// ========== 类型定义 ==========

export interface EnameSemanticMatch {
  /** 英文名 */
  name: string;
  /** 性别：男性/女性/中性 */
  gender: string;
  /** 音标 */
  phonetic: string;
  /** 中文译名 */
  chinese: string;
  /** 来源/语种 */
  origin: string;
  /** 流行度 */
  popularity: string;
  /** 首字母 */
  firstLetter: string;
  /** 语义相似度得分 (0~1) */
  similarity: number;
}

export interface EnameSemanticSearchOptions {
  /** 最大返回条数 */
  limit?: number;
  /** 相似度阈值 (0~1)，仅返回高于此值的结果 */
  threshold?: number;
  /** 按性别过滤：male / female / neutral / all */
  gender?: string;
  /** 按首字母过滤，例如 "A"、"B"、"C" */
  firstLetter?: string;
  /** 要排除的名字列表 */
  exclude?: string[];
}

// ========== 配置 ==========

const DEFAULT_CONFIG = {
  limit: 30,
  threshold: 0.55,
};

/**
 * 向量转 pgvector 格式字符串
 */
function vectorToPgVector(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/**
 * 非 ASCII 字符简单归一化（用于提高语义匹配质量）
 * 将全角字符转半角，去除多余空格等
 */
function normalizeQuery(text: string): string {
  let result = text.replace(/[\uFF01-\uFF5E]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
  );
  result = result.replace(/\u3000/g, " ");
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

// ========== 核心搜索函数 ==========

/**
 * 生成用户输入的 BGE-M3 嵌入向量
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await OVHCloudBGE3Client.embedText(text, false);
    console.log(`[ename-语义搜索] OVHcloud 向量已生成，维度=${result.vector.length}`);
    return result.vector;
  } catch (error) {
    console.error("[ename-语义搜索] OVHcloud 嵌入生成失败:", error);
    throw error;
  }
}

/**
 * 检查 ename_dict 表是否存在
 */
async function checkTableExists(): Promise<boolean> {
  try {
    const result = await queryRaw<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ename_dict'
      ) AS exists`,
      []
    );
    return result.length > 0 && result[0].exists === true;
  } catch {
    return false;
  }
}

/**
 * 检测 pgvector 是否可用 + ename_dict 是否存在
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
      console.log(`[ename-语义搜索] pgvector 扩展不存在`);
      return false;
    }

    // 2. 检测 ename_dict 表
    const tableExists = await checkTableExists();
    if (!tableExists) {
      pgvectorAvailable = false;
      console.log(`[ename-语义搜索] ename_dict 表不存在`);
      return false;
    }

    // 3. 检测 embedding 列的类型
    const colInfo = await queryRaw<{ data_type: string }>(
      `SELECT data_type FROM information_schema.columns 
       WHERE table_name = 'ename_dict' AND column_name = 'embedding'`,
      []
    );
    if (colInfo.length > 0) {
      pgvectorAvailable =
        colInfo[0].data_type === "USER-DEFINED" ||
        colInfo[0].data_type === "vector";
    } else {
      pgvectorAvailable = false;
    }

    console.log(
      `[ename-语义搜索] pgvector ${pgvectorAvailable ? "可用" : "不可用"}`
    );
  } catch {
    pgvectorAvailable = false;
    console.log(`[ename-语义搜索] pgvector 探测失败`);
  }

  return pgvectorAvailable;
}

/**
 * 主搜索函数：在 ename_dict 表中进行语义搜索
 * 
 * @param query 用户输入的搜索词（中文或英文描述）
 * @param options 搜索选项
 * @returns 按语义相似度降序排列的英文名列表
 */
export async function semanticSearchEname(
  query: string,
  options: EnameSemanticSearchOptions = {}
): Promise<EnameSemanticMatch[]> {
  const { limit = DEFAULT_CONFIG.limit, threshold = DEFAULT_CONFIG.threshold } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const normalizedQuery = normalizeQuery(query);
    console.log(`[ename-语义搜索] 开始搜索: "${normalizedQuery.substring(0, 100)}", limit=${limit}, threshold=${threshold}`);

    // 1. 生成查询向量
    let embedding: number[];
    try {
      embedding = await generateEmbedding(normalizedQuery);
    } catch {
      console.warn("[ename-语义搜索] 向量生成失败，返回空");
      return [];
    }

    // 2. 检查环境
    const usePgvector = await checkPgvectorAvailable();
    if (!usePgvector) {
      console.warn("[ename-语义搜索] pgvector 不可用或 ename_dict 表不存在");
      return [];
    }

    // 3. pgvector 原生余弦距离搜索
    const vectorStr = vectorToPgVector(embedding);

    // 构建动态 WHERE 条件
    const conditions: string[] = ["embedding IS NOT NULL"];
    const params: unknown[] = [limit, vectorStr, threshold / 2]; // 余弦距离阈值 = (1 - threshold) / 2 的近似

    // 性别过滤
    if (options.gender && options.gender !== "all") {
      const genderMap: Record<string, string> = {
        male: "男性",
        female: "女性",
        neutral: "中性",
      };
      const mapped = genderMap[options.gender] || options.gender;
      conditions.push(`gender = $${params.length + 1}`);
      params.push(mapped);
    }

    // 首字母过滤（从 english_name 取首字母）
    if (options.firstLetter) {
      conditions.push(`LOWER(SUBSTRING(english_name, 1, 1)) = LOWER($${params.length + 1})`);
      params.push(options.firstLetter.substring(0, 1));
    }

    // 排除指定名字
    if (options.exclude && options.exclude.length > 0) {
      const excludeLower = options.exclude.map((n) => n.toLowerCase());
      const placeholders = excludeLower.map((_, i) => `$${params.length + i + 1}`);
      conditions.push(`LOWER(english_name) NOT IN (${placeholders.join(",")})`);
      params.push(...excludeLower);
    }

    const whereClause = conditions.join(" AND ");

    const sql = `
      SELECT 
        english_name AS name,
        gender,
        phonetic,
        chinese_name AS chinese,
        origin,
        popularity,
        (embedding <=> $2::vector) AS distance
      FROM ename_dict
      WHERE ${whereClause}
        AND (embedding <=> $2::vector) < $3
      ORDER BY embedding <=> $2::vector
      LIMIT $1
    `;

    console.log(`[ename-语义搜索] SQL 参数: limit=${limit}, threshold=${threshold}`);
    console.log(`[ename-语义搜索] WHERE: ${whereClause}`);

    const entries = await queryRaw<{
      name: string;
      gender: string;
      phonetic: string;
      chinese: string;
      origin: string;
      popularity: string;
      distance: number;
    }>(sql, params);

    console.log(`[ename-语义搜索] 找到 ${entries.length} 个语义匹配的英文名`);

    // 4. 转换为统一格式
    const matches: EnameSemanticMatch[] = entries.map((entry) => {
      // 余弦距离转相似度得分 (0~1)
      // distance = 1 - cosine_similarity，范围 [0, 2]
      // 转换为 [0, 1] 相似度：similarity = 1 - distance/2
      const similarity = Math.max(0, Math.min(1, 1 - entry.distance / 2));

      return {
        name: entry.name || "",
        gender: entry.gender || "",
        phonetic: entry.phonetic || "",
        chinese: entry.chinese || "",
        origin: entry.origin || "",
        popularity: entry.popularity || "无",
        firstLetter: (entry.name || "")[0]?.toUpperCase() || "",
        similarity,
      };
    });

    return matches;
  } catch (error) {
    console.error("[ename-语义搜索] 搜索失败:", error);
    return [];
  }
}

// ========== 便捷搜索函数 ==========

/**
 * 根据中文描述语义搜索英文名
 * 
 * @param description 中文描述，如"温柔优雅的女孩名字"、"强壮勇敢的男孩名字"
 * @param genderFilter 性别过滤
 * @param limit 返回数量
 */
export async function searchByNameDescription(
  description: string,
  genderFilter: "male" | "female" | "neutral" | "all" = "all",
  limit: number = 20
): Promise<EnameSemanticMatch[]> {
  return semanticSearchEname(description, {
    limit,
    threshold: 0.55,
    gender: genderFilter,
  });
}

/**
 * 获取类似名字推荐（基于语义相似度）
 * 
 * @param name 已知英文名，例如 "Alexander"
 * @param exclude 是否排除自身
 * @param count 返回数量
 */
export async function getSimilarNames(
  name: string,
  exclude: boolean = true,
  count: number = 10
): Promise<EnameSemanticMatch[]> {
  // 使用名字本身的含义描述作为搜索词
  const searchQuery = `类似 ${name} 的英文名字`;
  return semanticSearchEname(searchQuery, {
    limit: count + (exclude ? 1 : 0),
    threshold: 0.4,
    exclude: exclude ? [name] : [],
  });
}

/**
 * 根据含义语义搜索
 * 
 * @param meaning 含义关键词，如"光明"、"智慧"、"力量"
 * @param genderFilter 性别过滤
 * @param limit 返回数量
 */
export async function searchByMeaning(
  meaning: string,
  genderFilter: "male" | "female" | "neutral" | "all" = "all",
  limit: number = 20
): Promise<EnameSemanticMatch[]> {
  return semanticSearchEname(`含义为${meaning}的英文名字`, {
    limit,
    threshold: 0.5,
    gender: genderFilter,
  });
}

/**
 * 根据风格/气质搜索
 * 
 * @param vibe 风格描述，如"古典优雅"、"现代时尚"、"自然清新"
 * @param genderFilter 性别过滤
 * @param limit 返回数量
 */
export async function searchByVibe(
  vibe: string,
  genderFilter: "male" | "female" | "neutral" | "all" = "all",
  limit: number = 20
): Promise<EnameSemanticMatch[]> {
  return semanticSearchEname(`${vibe}风格的英文名字`, {
    limit,
    threshold: 0.5,
    gender: genderFilter,
  });
}

// ========== 导出 ==========

export const SemanticEnameSearch = {
  search: semanticSearchEname,
  byDescription: searchByNameDescription,
  similar: getSimilarNames,
  byMeaning: searchByMeaning,
  byVibe: searchByVibe,
};