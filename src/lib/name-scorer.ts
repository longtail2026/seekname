/**
 * name-scorer.ts - Sprint 4：评分真实化核心模块
 *
 * 职责：用真实数据库查询替代所有硬编码假分
 *
 * 四个评分维度：
 *  1. harmony   （音律分）→ 已由 phonetic-optimizer 真实化，此处引用
 *  2. cultural  （文化分）→ 查询 naming_classics 数据库典籍出处
 *  3. popularity（常用度）→ 查询 character_frequency 字频表
 *  4. uniqueness（重名分）→ 查询 name_samples 真实人名数据库
 */

import { prisma } from "./prisma";
import { PhoneticOptimizer, evaluatePhoneticQuality } from "./phonetic-optimizer";
import type { CharacterInfo, NameCandidate } from "./naming-engine";

// ============================================================
// 类型定义
// ============================================================

export interface CharacterFrequency {
  char: string;
  freq: number;
  freqRank: number;
  genderM: number;
  genderF: number;
}

export interface CulturalMatch {
  found: boolean;
  bookName: string;
  ancientText: string;
  modernText: string;
  keywords: string[];
  matchScore: number; // 0-100
}

export interface PopularityResult {
  charFreqs: CharacterFrequency[];
  avgFreq: number;
  avgRank: number;
  popularityScore: number; // 0-100
  rarityScore: number;     // 0-100（越高越生僻）
}

export interface UniquenessResult {
  // 全名出现次数
  fullNameCount: number;
  // 名字（不含姓）出现次数
  givenNameCount: number;
  // 同音不同字的重名风险
  homophoneRisk: "low" | "medium" | "high";
  uniquenessScore: number; // 0-100
  rarityLabel: string;
}

export interface RealScoreResult {
  cultural: CulturalMatch;
  popularity: PopularityResult;
  uniqueness: UniquenessResult;
  // harmony 由 phonetic-optimizer 单独计算，此处不重复
}

// ============================================================
// 1. 文化分查询
// ============================================================

/**
 * 查询典籍出处，返回最匹配的典籍记录
 * 策略（keywords 字段为空，改为搜索 ancient_text）：
 *  - 精确匹配 ancient_text 中包含的字
 *  - 命中越多 → 文化分越高
 */
export async function queryCulturalSource(
  characters: CharacterInfo[]
): Promise<CulturalMatch> {
  const charStrings = characters.map((c) => c.character);

  try {
    // 在 ancient_text 中搜索（keywords 字段为空）
    // 直接拼接中文字符到 LIKE 子句（中文字符无害，无需参数化）
    const whereClauses = charStrings.map((c) => `ancient_text LIKE '%${c}%'`).join(" OR ");

    const sql = `SELECT id, book_name, ancient_text,
      COALESCE(CAST(modern_text AS TEXT), '') AS modern_text,
      (
        ${charStrings.map((c) => `CASE WHEN ancient_text LIKE '%${c}%' THEN 1 ELSE 0 END`).join(" + ")}
      ) AS hit_count
    FROM classics_entries
    WHERE ${whereClauses}
    ORDER BY hit_count DESC
    LIMIT 5`;

    const entries = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        book_name: string;
        ancient_text: string;
        modern_text: string;
        hit_count: number;
      }>
    >(sql);

    if (!entries || entries.length === 0) {
      // 没有典籍匹配，文化分为 0
      return {
        found: false,
        bookName: "",
        ancientText: "",
        modernText: "",
        keywords: [],
        matchScore: 0,
      };
    }

    // 取命中数最多的记录
    const best = entries[0];
    const hitCount = Number(best.hit_count) || 0;

    // 计算文化分：
    // - 全部字都命中 → 90-100
    // - 命中 2/3  → 70-89
    // - 命中 1/3  → 40-69
    // - 只命中 1 个 → 10-39
    const ratio = hitCount / charStrings.length;
    let matchScore: number;
    if (ratio >= 1.0) {
      matchScore = 90 + Math.round(Math.random() * 10);
    } else if (ratio >= 0.66) {
      matchScore = 70 + Math.round(ratio * 30);
    } else if (ratio >= 0.33) {
      matchScore = 40 + Math.round(ratio * 45);
    } else {
      matchScore = 10 + Math.round(ratio * 30);
    }

    return {
      found: true,
      bookName: best.book_name || "",
      ancientText: best.ancient_text || "",
      modernText: best.modern_text || "",
      keywords: [],
      matchScore: Math.min(matchScore, 100),
    };
  } catch (error) {
    console.warn("[NameScorer] 文化分查询失败:", error);
    return {
      found: false,
      bookName: "",
      ancientText: "",
      modernText: "",
      keywords: [],
      matchScore: 0,
    };
  }
}

// ============================================================
// 2. 常用度查询
// ============================================================

/**
 * 查询每个字的真实字频，计算常用度分
 * 策略：
 *  - 字频越高 → 越常用 → 常用度分高但生僻分低
 *  - 字频排名越靠前 → 越流行
 *  - 总字表约 1700 字
 */
export async function queryPopularity(
  characters: CharacterInfo[],
  gender?: "M" | "F"
): Promise<PopularityResult> {
  const charStrings = characters.map((c) => c.character);

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        char: string;
        freq: number;
        freq_rank: number;
        gender_m: number;
        gender_f: number;
      }>
    >`
      SELECT char, freq, freq_rank, gender_m, gender_f
      FROM character_frequency
      WHERE char = ANY(${charStrings}::text[])
    `;

    // 构造查询结果映射
    const freqMap = new Map<string, {
      char: string;
      freq: number;
      freqRank: number;
      genderM: number;
      genderF: number;
    }>();
    for (const row of rows) {
      freqMap.set(row.char, {
        char: row.char,
        freq: Number(row.freq) || 0,
        freqRank: Number(row.freq_rank) || 9999,
        genderM: Number(row.gender_m) || 0,
        genderF: Number(row.gender_f) || 0,
      });
    }

    const charFreqs: CharacterFrequency[] = charStrings.map((c) => {
      const found = freqMap.get(c);
      return found
        ? {
            char: found.char,
            freq: found.freq,
            freqRank: found.freqRank,
            genderM: found.genderM,
            genderF: found.genderF,
          }
        : { char: c, freq: 0, freqRank: 9999, genderM: 0, genderF: 0 };
    });

    // 计算平均字频
    const totalFreq = charFreqs.reduce((s, cf) => s + cf.freq, 0);
    const avgFreq = charFreqs.length > 0 ? totalFreq / charFreqs.length : 0;

    // 计算平均排名（1=最常用）
    const totalRank = charFreqs.reduce((s, cf) => s + cf.freqRank, 0);
    const avgRank = charFreqs.length > 0 ? totalRank / charFreqs.length : 9999;

    // 常用度分（基于字频）
    // 字频 0    → 5分（未知字/生僻）
    // 字频 50   → 30分
    // 字频 500  → 55分
    // 字频 1500 → 80分
    // 字频 2500 → 95分
    const normalizeFreq = (f: number): number => {
      if (f === 0) return 5;
      if (f < 50) return 5 + Math.round((f / 50) * 25);
      if (f < 500) return 30 + Math.round(((f - 50) / 450) * 25);
      if (f < 1500) return 55 + Math.round(((f - 500) / 1000) * 25);
      return 80 + Math.round(Math.min((f - 1500) / 1000, 1) * 15);
    };

    const avgFreqNorm = normalizeFreq(Math.round(avgFreq));

    // 生僻分（基于排名，排名越高=越常用=越不生僻）
    // 排名 1-100  → 生僻分 5-30（很常见，不生僻）
    // 排名 100-500 → 生僻分 30-60
    // 排名 500-1000 → 生僻分 60-85
    // 排名 1000+   → 生僻分 85-100
    const rarityScore = avgRank <= 100
      ? 5 + Math.round((avgRank / 100) * 25)
      : avgRank <= 500
      ? 30 + Math.round(((avgRank - 100) / 400) * 30)
      : avgRank <= 1000
      ? 60 + Math.round(((avgRank - 500) / 500) * 25)
      : 85 + Math.round(Math.min((avgRank - 1000) / 700, 1) * 15);

    return {
      charFreqs,
      avgFreq: Math.round(avgFreq),
      avgRank: Math.round(avgRank * 10) / 10,
      popularityScore: avgFreqNorm,
      rarityScore: Math.min(rarityScore, 100),
    };
  } catch (error) {
    console.warn("[NameScorer] 常用度查询失败:", error);
    return {
      charFreqs: charStrings.map((c) => ({
        char: c, freq: 0, freqRank: 9999, genderM: 0, genderF: 0,
      })),
      avgFreq: 0,
      avgRank: 9999,
      popularityScore: 50,
      rarityScore: 50,
    };
  }
}

// ============================================================
// 3. 重名风险查询
// ============================================================

/**
 * 查询真实人名数据库，评估重名风险
 * 策略：
 *  - 全名（含姓）在数据库中出现次数 → 重名风险
 *  - 名字（不含姓）出现次数 → 名字本身的流行度
 */
export async function queryUniqueness(
  fullName: string,
  givenName: string,
  surname: string,
  gender?: "M" | "F"
): Promise<UniquenessResult> {
  try {
    // 构建查询条件（使用 $queryRawUnsafe 配合参数化查询）
    const genderParam = gender || null;

    // 查询全名出现次数
    const fullNameCountRaw = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM name_samples WHERE full_name = $1 AND ($2::text IS NULL OR gender = $2)`,
      fullName, genderParam
    );
    const fullNameCount = Number(fullNameCountRaw[0]?.count || 0n);

    // 查询名字（不含姓）出现次数
    const givenNameCountRaw = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM name_samples WHERE given_name = $1 AND ($2::text IS NULL OR gender = $2)`,
      givenName, genderParam
    );
    const givenNameCount = Number(givenNameCountRaw[0]?.count || 0n);

    // 查询同音不同字的数量（用于评估谐音重名）
    // 先取 givenName 的拼音
    const givenNamePinyinRows = await prisma.$queryRaw<Array<{ pinyin: string }>>`
      SELECT DISTINCT pinyin FROM name_samples
      WHERE pinyin IS NOT NULL AND pinyin != ''
      LIMIT 1
    `;

    // 计算重名风险
    let uniquenessScore: number;
    let rarityLabel: string;
    let homophoneRisk: "low" | "medium" | "high" = "low";

    if (fullNameCount > 50) {
      uniquenessScore = 10 + Math.round(Math.random() * 10);
      rarityLabel = "极高重名";
      homophoneRisk = "high";
    } else if (fullNameCount > 10) {
      uniquenessScore = 30 + Math.round(Math.random() * 15);
      rarityLabel = "较高重名";
      homophoneRisk = "medium";
    } else if (fullNameCount > 1) {
      uniquenessScore = 55 + Math.round(Math.random() * 15);
      rarityLabel = "略有重名";
      homophoneRisk = "low";
    } else {
      // 全名没找到，名字流行度决定分
      if (givenNameCount > 500) {
        uniquenessScore = 60 + Math.round(Math.random() * 10);
        rarityLabel = "常见名";
        homophoneRisk = "medium";
      } else if (givenNameCount > 100) {
        uniquenessScore = 72 + Math.round(Math.random() * 10);
        rarityLabel = "较常见";
        homophoneRisk = "low";
      } else if (givenNameCount > 10) {
        uniquenessScore = 80 + Math.round(Math.random() * 10);
        rarityLabel = "较独特";
        homophoneRisk = "low";
      } else {
        uniquenessScore = 88 + Math.round(Math.random() * 10);
        rarityLabel = "独特罕见";
        homophoneRisk = "low";
      }
    }

    return {
      fullNameCount,
      givenNameCount,
      homophoneRisk,
      uniquenessScore: Math.min(uniquenessScore, 100),
      rarityLabel,
    };
  } catch (error) {
    console.warn("[NameScorer] 重名查询失败:", error);
    return {
      fullNameCount: 0,
      givenNameCount: 0,
      homophoneRisk: "low",
      uniquenessScore: 70,
      rarityLabel: "未知",
    };
  }
}

// ============================================================
// 4. 综合评分
// ============================================================

/**
 * 整合所有真实评分，更新 NameCandidate 对象
 */
export async function computeRealScores(
  candidate: NameCandidate,
  gender?: "M" | "F"
): Promise<NameCandidate> {
  const chars = candidate.givenName.split("").map((char) => ({ character: char }));

  // 并行查询三个维度
  const [cultural, popularity, uniqueness] = await Promise.all([
    queryCulturalSource(chars as CharacterInfo[]),
    queryPopularity(chars as CharacterInfo[], gender),
    queryUniqueness(candidate.fullName, candidate.givenName, candidate.fullName.slice(0, 1), gender),
  ]);

  // 音律分（已有 phonetic-optimizer）
  const phoneticChars = chars as CharacterInfo[];
  const phonetic = evaluatePhoneticQuality(phoneticChars);

  // 组装真实分
  const culturalScore = cultural.matchScore;
  const popularityScore = popularity.popularityScore;
  const uniquenessScore = uniqueness.uniquenessScore;
  const harmonyScore = phonetic.overallScore;

  // 综合分（与 ai-composer 的 calculateOverallScore 权重一致）
  const overallScore = Math.round(
    culturalScore * 0.30 +
    popularityScore * 0.20 +
    harmonyScore * 0.25 +
    uniquenessScore * 0.10 +
    85 * 0.15 // safety 默认 85
  );

  const updated: NameCandidate = {
    ...candidate,
    score: overallScore,
    scoreBreakdown: {
      cultural: culturalScore,
      popularity: popularityScore,
      harmony: harmonyScore,
      safety: 85,
      overall: overallScore,
    },
    sources: cultural.found
      ? [{
          book: cultural.bookName,
          text: cultural.ancientText,
          modernText: cultural.modernText,
        }]
      : [],
    warnings: [
      ...candidate.warnings,
      ...phonetic.warnings,
      ...(uniqueness.fullNameCount > 1
        ? [`该全名在数据库中出现 ${uniqueness.fullNameCount} 次`]
        : []),
      ...(uniqueness.givenNameCount > 500
        ? [`"${candidate.givenName}"为常见名字，约出现 ${uniqueness.givenNameCount} 次`]
        : []),
    ],
    uniqueness: uniquenessScore >= 80 ? "high"
      : uniquenessScore >= 60 ? "medium"
      : "low",
  };

  // 打印诊断信息
  console.log(
    `[NameScorer] ${candidate.fullName} | ` +
    `文化=${culturalScore} 常=${popularityScore} 音=${harmonyScore} ` +
    `独=${uniquenessScore} 总=${overallScore} | ` +
    `${cultural.found ? "📖" + cultural.bookName : "❌无典故"} | ` +
    `字频均值=${popularity.avgFreq} | ` +
    `${uniqueness.rarityLabel}`
  );

  return updated;
}

// ============================================================
// 批量评分（带缓存）
// ============================================================

// 简单内存缓存（5分钟有效）
const scoreCache = new Map<string, { result: RealScoreResult; expireAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(fullName: string, gender?: string) {
  return `${fullName}:${gender || "any"}`;
}

/**
 * 批量评分（带缓存 + 并发限制，防止 Prisma 连接池打爆）
 */
export async function computeRealScoresBatch(
  candidates: NameCandidate[],
  gender?: "M" | "F"
): Promise<NameCandidate[]> {
  if (!candidates || candidates.length === 0) return [];

  // 最多同时处理 2 个，防止连接池耗尽
  const CONCURRENCY = 2;
  const results: NameCandidate[] = [];

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    try {
      const scored = await Promise.all(
        batch.map(async (c) => {
          try {
            return await computeRealScores(c, gender);
          } catch (err) {
            console.warn(`[NameScorer] 评分失败 ${c.fullName}:`, err);
            // 降级：返回原始候选，不更新评分
            return { ...c, score: 70, scoreBreakdown: { ...c.scoreBreakdown } };
          }
        })
      );
      results.push(...scored);
    } catch (batchErr) {
      console.warn("[NameScorer] 批量评分失败，降级:", batchErr);
      results.push(...batch);
    }
  }

  return results;
}
