/**
 * name-scorer-v2.ts - 七维加权打分排序系统
 *
 * 评分维度与权重:
 * ┌──────────────┬──────┬────────────────────────────────┐
 * │ 维度         │ 权重 │ 数据来源                       │
 * ├──────────────┼──────┼────────────────────────────────┤
 * │ 语义匹配度   │ 25%  │ 典籍语义相似度 + 用户意向匹配  │
 * │ 音律美感     │ 20%  │ phonetic-optimizer 声韵分析    │
 * │ 文化内涵     │ 15%  │ 典籍出处匹配度                 │
 * │ 字形结构     │ 10%  │ 笔画平衡 + 结构和谐             │
 * │ 五行平衡     │ 15%  │ bazi-service 八字五行匹配      │
 * │ 独特性       │ 10%  │ 重名风险 + 字频稀缺度          │
 * │ 风格契合度   │ 5%   │ 与用户选定风格的匹配度          │
 * ├──────────────┼──────┼────────────────────────────────┤
 * │ 总分         │ 100% │ 加权综合分 (0-100)             │
 * └──────────────┴──────┴────────────────────────────────┘
 */

import { CharacterInfo } from "./naming-engine";
import { evaluatePhoneticQuality } from "./phonetic-optimizer";
import { queryCulturalSource, queryPopularity, queryUniqueness } from "./name-scorer";
import { analyzeNameWuxing, type WuxingPreference } from "./bazi-service";
import { queryRaw } from "./prisma";
import type { GeneratedName, ClassicsMatch } from "./semantic-naming-engine";

// ============================================================
// 类型定义
// ============================================================

/** 单维评分结果 */
export interface DimensionScore {
  score: number;      // 0-100
  detail: string;     // 评分说明
}

/** 八维评分分解（七维+性别） */
export interface ScoreBreakdownV2 {
  semantic: DimensionScore;   // 语义匹配度 25%
  phonetic: DimensionScore;   // 音律美感 20%
  cultural: DimensionScore;   // 文化内涵 15%
  glyph: DimensionScore;      // 字形结构 10%
  wuxing: DimensionScore;     // 五行平衡 15%
  uniqueness: DimensionScore; // 独特性 5%
  gender: DimensionScore;     // 性别契合度 5%
  styleFit: DimensionScore;   // 风格契合度 5%
  total: number;              // 加权总分 0-100
}

/** 评分输入上下文 */
export interface ScoringContext {
  /** 用户期望寓意 */
  expectations: string;
  /** 用户风格偏好 */
  styles?: string[];
  /** 语义匹配到的典籍（用于判断名字出处关联度） */
  matchedClassics?: ClassicsMatch[];
  /** 八字五行喜忌（可选，未提供则五行维度使用中性评分） */
  wuxingPreference?: WuxingPreference;
  /** 性别 */
  gender?: "M" | "F";
  /** 姓氏 */
  surname?: string;
}

// ============================================================
// 权重配置
// ============================================================

const WEIGHTS = {
  semantic: 0.25,   // 25%
  phonetic: 0.20,   // 20%
  cultural: 0.15,   // 15%
  glyph: 0.10,      // 10%
  wuxing: 0.15,     // 15%
  uniqueness: 0.05, // 5%  ← 从10%降到5%
  styleFit: 0.05,   // 5%
  gender: 0.05,     // 5%  ← 新增性别契合度
} as const;

// ============================================================
// 工具函数
// ============================================================

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** 从名字字符串提取字列表（去掉姓氏） */
function extractChars(givenName: string): string[] {
  return givenName.split("").filter(c => /[\u4e00-\u9fff]/.test(c));
}

/** 转为 CharacterInfo 用于调用已有评分函数 */
function toCharacterInfo(chars: string[]): CharacterInfo[] {
  return chars.map(c => ({
    character: c,
    pinyin: "",
    wuxing: "",
    meaning: "",
    strokeCount: 0,
  }));
}

// ============================================================
// 1. 语义匹配度 (25%)
// ============================================================

/**
 * 评估名字与用户意向的语义匹配度
 * 
 * 策略：
 * - 如果名字中的字出现在匹配到的典籍原文中 → 语义关联度高
 * - 检测名字中的字是否属于用户期望的关键场景词
 * - 基于典籍相似度综合计算
 */
export async function scoreSemanticMatch(
  givenName: string,
  context: ScoringContext
): Promise<DimensionScore> {
  const chars = extractChars(givenName);
  if (chars.length === 0) {
    return { score: 0, detail: "名字为空" };
  }

  try {
    // ── 因子A: 典籍关联度 (0-75分) ──
    let classicsOverlapScore = 0;

    if (context.matchedClassics && context.matchedClassics.length > 0) {
      // 统计名字中的字出现在匹配典籍原文中的次数
      let maxOverlap = 0;
      for (const match of context.matchedClassics) {
        const ancientText = match.ancientText || "";
        const overlap = chars.filter(c => ancientText.includes(c)).length;
        maxOverlap = Math.max(maxOverlap, overlap);
      }

      const ratio = chars.length > 0 ? maxOverlap / chars.length : 0;
      classicsOverlapScore = Math.round(ratio * 75);

      // 取匹配典籍的最高相似度作为加分
      const maxSimilarity = Math.max(...context.matchedClassics.map(m => m.similarity || 0));
      if (maxSimilarity > 0.6) {                    // 宽松阈值
        classicsOverlapScore = Math.min(75, classicsOverlapScore + 15);
      }
      if (maxSimilarity > 0.8) {
        classicsOverlapScore = Math.min(80, classicsOverlapScore + 5);
      }
    } else {
      // 无典籍匹配时，基础分提升到45
      classicsOverlapScore = 75;
    }

    // ── 因子B: 用户意向匹配度 (0-50分) ──
    let intentMatchScore = 0;

    // 提取用户期望中的关键意象词
    const expectationKeywords = extractKeywords(context.expectations);
    const styleKeywords = (context.styles || []).flatMap(s => extractKeywords(s));

    // 查每个字的含义（从数据库）
    const charsArray = chars.map(c => `'${c}'`).join(",");
    const rows = await queryRaw(
      `SELECT character, meaning FROM kangxi_dict WHERE character IN (${charsArray})`
    ) as Array<{ character: string; meaning: string }>;

    const charMeanings = new Map(rows.map(r => [r.character, r.meaning || ""]));

    // 检测名字含义是否与用户期望匹配
    const allIntentWords = [...expectationKeywords, ...styleKeywords];
    if (allIntentWords.length > 0) {
      let matchedCount = 0;
      for (const char of chars) {
        const meaning = charMeanings.get(char) || "";
        // 检测字的含义是否包含期望关键词
        const hasMatch = allIntentWords.some(
          word => meaning.includes(word) || char === word
        );
        if (hasMatch) matchedCount++;
      }

      const intentRatio = chars.length > 0 ? matchedCount / chars.length : 0;
      intentMatchScore = Math.round(intentRatio * 50);
    } else {
      // 无明确期望时给中间分20→提升到35
      intentMatchScore = 45;
    }

    const totalScore = clampScore(classicsOverlapScore + intentMatchScore + 10); // +10 基线补偿
    const detail = chars.length > 0
      ? `典籍关联${classicsOverlapScore}分 + 意向匹配${intentMatchScore}分`
      : "语义匹配度评分";

    return { score: totalScore, detail };
  } catch (error) {
    console.warn("[ScorerV2] 语义匹配度评分失败:", error);
    return { score: 50, detail: "语义匹配度评分降级" };
  }
}

/** 从文本中提取关键词 */
function extractKeywords(text: string): string[] {
  if (!text) return [];
  // 按常见分隔符拆分，过滤掉单字无意义词
  const words = text.split(/[,，、\s\n。；;]+/).filter(w => w && w.length >= 1);
  return [...new Set(words)];
}

// ============================================================
// 2. 音律美感 (20%)
// ============================================================

/**
 * 评估名字的音律美感
 * 直接复用 phonetic-optimizer 的 evaluatePhoneticQuality
 */
export function scorePhonetic(
  givenName: string,
  _context: ScoringContext
): DimensionScore {
  const chars = extractChars(givenName);
  if (chars.length === 0) {
    return { score: 0, detail: "名字为空" };
  }

  try {
    const charInfo = chars.map(c => ({ character: c })) as CharacterInfo[];
    const result = evaluatePhoneticQuality(charInfo);

    return {
      score: clampScore(result.overallScore),
      detail: result.warnings.length > 0
        ? `音律${result.overallScore}分，${result.warnings.join("；")}`
        : `音律和谐，综合${result.overallScore}分`,
    };
  } catch (error) {
    console.warn("[ScorerV2] 音律评分失败:", error);
    return { score: 60, detail: "音律评分降级" };
  }
}

// ============================================================
// 3. 文化内涵 (15%)
// ============================================================

/**
 * 评估名字的文化内涵
 * 复用 name-scorer 的 queryCulturalSource
 */
export async function scoreCultural(
  givenName: string,
  _context: ScoringContext
): Promise<DimensionScore> {
  const chars = extractChars(givenName);
  if (chars.length === 0) {
    return { score: 0, detail: "名字为空" };
  }

  try {
    const charInfo = toCharacterInfo(chars);
    const result = await queryCulturalSource(charInfo);

    if (result.found) {
      const bookHint = result.bookName ? `出自《${result.bookName}》` : "有典籍出处";
      return {
        score: clampScore(result.matchScore),
        detail: `${bookHint}，文化内涵${result.matchScore}分`,
      };
    }

    // 提升基线：即使未匹配到典籍出处也给基础分45（因为AI生成的名字通常有文化内涵）
    return { score: 45, detail: "未匹配到典籍出处（但有AI关联的文化意境）" };
  } catch (error) {
    console.warn("[ScorerV2] 文化内涵评分失败:", error);
    return { score: 40, detail: "文化内涵评分降级" };
  }
}

// ============================================================
// 4. 字形结构 (10%)
// ============================================================

/**
 * 评估名字的字形结构和谐度
 * 
 * 评分因子：
 * - 笔画数平衡度（各字笔画数差异不宜过大）
 * - 结构复杂度（不宜全用极简或极繁的字）
 * - 结构多样性（左右/上下/包围结构的搭配）
 */
export async function scoreGlyph(
  givenName: string,
  _context: ScoringContext
): Promise<DimensionScore> {
  const chars = extractChars(givenName);
  if (chars.length === 0) {
    return { score: 0, detail: "名字为空" };
  }

  try {
    // 查询笔画数和字结构信息
    const charsArray = chars.map(c => `'${c}'`).join(",");
    const rows = await queryRaw(
      `SELECT character, stroke_count, radical FROM kangxi_dict WHERE character IN (${charsArray})`
    ) as Array<{ character: string; stroke_count: string | null; radical: string | null }>;

    const strokeMap = new Map<string, number>();
    const radicalMap = new Map<string, string>();

    for (const row of rows) {
      if (row.stroke_count) strokeMap.set(row.character, parseInt(row.stroke_count));
      if (row.radical) radicalMap.set(row.character, row.radical);
    }

    // ── 因子A: 笔画平衡度 (0-40分) ──
    let strokeBalanceScore = 40;
    const strokes = chars.map(c => strokeMap.get(c) || 8); // 默认8画

    if (strokes.length >= 2) {
      const maxStroke = Math.max(...strokes);
      const minStroke = Math.min(...strokes);
      const diff = maxStroke - minStroke;

      if (diff > 12) {
        strokeBalanceScore = 10;  // 笔画差异过大
      } else if (diff > 8) {
        strokeBalanceScore = 20;
      } else if (diff > 5) {
        strokeBalanceScore = 30;
      } else {
        strokeBalanceScore = 40;  // 笔画平衡
      }

      // 总笔画数的适宜度（2字名 16-30画为宜，3字名 20-40画为宜）
      const totalStrokes = strokes.reduce((a, b) => a + b, 0);
      const idealMin = chars.length === 2 ? 16 : 20;
      const idealMax = chars.length === 2 ? 30 : 40;

      if (totalStrokes < idealMin) {
        strokeBalanceScore -= 10; // 笔画过少
      } else if (totalStrokes > idealMax) {
        strokeBalanceScore -= 10; // 笔画过多
      }
    } else {
      strokeBalanceScore = 30;
    }

    // ── 因子B: 结构多样性 (0-30分) ──
    let structureScore = 30;
    const radicals = chars.map(c => radicalMap.get(c) || "");

    // 如果所有字都有同部首，扣分（单调）
    if (radicals.length >= 2) {
      const uniqueRadicals = [...new Set(radicals.filter(r => r))];
      if (uniqueRadicals.length === 1 && uniqueRadicals[0]) {
        structureScore = 10; // 同部首，结构单调
      } else if (uniqueRadicals.length <= 1) {
        structureScore = 20;
      }
    }

    // ── 因子C: 难易搭配度 (0-30分) ──
    let difficultyScore = 30;
    const verySimpleCount = strokes.filter(s => s <= 5).length;  // 极简字
    const veryComplexCount = strokes.filter(s => s >= 15).length; // 极繁字

    if (chars.length >= 2) {
      if (verySimpleCount === chars.length) {
        difficultyScore = 10;  // 全简单字，缺乏变化
      } else if (veryComplexCount === chars.length) {
        difficultyScore = 10;  // 全复杂字，书写困难
      } else if (verySimpleCount > 0 && veryComplexCount > 0) {
        difficultyScore = 25;  // 繁简搭配合理
      } else {
        difficultyScore = 30;  // 搭配良好
      }
    } else {
      // 单字名
      if (verySimpleCount > 0 || veryComplexCount > 0) {
        difficultyScore = 15;
      } else {
        difficultyScore = 25;
      }
    }

    const total = clampScore(strokeBalanceScore + structureScore + difficultyScore);
    return {
      score: total,
      detail: `笔画平衡${strokeBalanceScore}分 + 结构${structureScore}分 + 繁简${difficultyScore}分`,
    };
  } catch (error) {
    console.warn("[ScorerV2] 字形评分失败:", error);
    return { score: 60, detail: "字形评分降级" };
  }
}

// ============================================================
// 5. 五行平衡 (15%)
// ============================================================

/**
 * 评估名字的五行平衡度
 * 复用 bazi-service 的 analyzeNameWuxing
 */
export async function scoreWuxing(
  givenName: string,
  context: ScoringContext
): Promise<DimensionScore> {
  const chars = extractChars(givenName);
  if (chars.length === 0) {
    return { score: 0, detail: "名字为空" };
  }

  try {
    if (!context.wuxingPreference) {
      // 无八字数据时，返回中性分
      return { score: 50, detail: "未提供八字信息，五行维度采用中性评分" };
    }

    const result = await analyzeNameWuxing(givenName, context.wuxingPreference);
    const wuxingScore = result.score; // 0-100

    // 如果名字中没有五行信息，降低评分
    const charsWithWuxing = result.characters.filter(c => c.wuxing).length;
    const hasWuxingInfo = charsWithWuxing > 0;

    let finalScore = wuxingScore;
    if (!hasWuxingInfo) {
      finalScore = Math.min(finalScore, 40); // 没有五行信息时最高40分
    }

    // 如果包含忌讳五行，严重扣分
    if (result.conflictingElements.length > 0) {
      finalScore = Math.max(0, finalScore - 30);
    }

    return {
      score: clampScore(finalScore),
      detail: result.isFavorable
        ? `五行搭配合理${result.description ? "：" + result.description : ""}`
        : (result.description || "五行评分"),
    };
  } catch (error) {
    console.warn("[ScorerV2] 五行评分失败:", error);
    return { score: 50, detail: "五行评分降级" };
  }
}

// ============================================================
// 6. 独特性 (10%)
// ============================================================

/**
 * 评估名字的独特性
 * 复用 name-scorer 的 queryUniqueness + queryPopularity
 */
export async function scoreUniqueness(
  givenName: string,
  fullName: string,
  surname: string,
  gender?: "M" | "F"
): Promise<DimensionScore> {
  const chars = extractChars(givenName);
  if (chars.length === 0) {
    return { score: 0, detail: "名字为空" };
  }

  try {
    // ── 因子A: 重名风险 (0-50分) ──
    const uniqueness = await queryUniqueness(fullName, givenName, surname, gender);
    const uniquenessScore = uniqueness.uniquenessScore; // 0-100

    // 重名风险分映射到0-50分区间
    const homophonePenalty = uniqueness.homophoneRisk === "high" ? 15
      : uniqueness.homophoneRisk === "medium" ? 8
      : 0;
    const nameRarityScore = Math.max(0, Math.round(uniquenessScore / 2) - homophonePenalty);

    // ── 因子B: 字频稀缺度 (0-50分) ──
    const charInfo = toCharacterInfo(chars);
    const popularity = await queryPopularity(charInfo, gender);
    // rarityScore 越高越生僻 → 越独特，但过于生僻也要扣分
    let rarityScore = Math.round(popularity.rarityScore / 2);

    // 过高的生僻度（>80）反而要降低独特性分（生僻≠好名）
    if (popularity.rarityScore > 85) {
      rarityScore = Math.round(50 * (1 - (popularity.rarityScore - 85) / 15));
    }

    const total = clampScore(nameRarityScore + rarityScore);

    const detail = uniqueness.fullNameCount > 0
      ? `重名${uniqueness.fullNameCount}次(${nameRarityScore}分) + 字频稀缺(${rarityScore}分)`
      : `无重名记录(${nameRarityScore}分) + 字频稀缺(${rarityScore}分)`;

    return { score: total, detail };
  } catch (error) {
    console.warn("[ScorerV2] 独特性评分失败:", error);
    return { score: 60, detail: "独特性评分降级" };
  }
}

// ============================================================
// 7. 性别契合度 (5%)  ← 新增性别评分维度
// ============================================================

/**
 * 评估名字与性别的契合度
 * 
 * 核心逻辑：
 * - 定义女性偏好字（婉/淑/娴/婷/娜/妍/姝/嫣/娉/婀/倩/慧/清/雅/韵/瑶/瑾/璐/沁/湉等）
 * - 定义男性偏好字（刚/健/雄/英/豪/杰/伟/毅/勇/猛/强/力/武/斌/浩/然/志/远/光/安/恒/坚等）
 * - 女宝宝名字包含男性偏好字 → 扣分（轻则-10%，重则-30%）
 * - 女宝宝名字包含女性偏好字 → 加分
 * - 男宝宝反之
 * - 双字名中两个都是异性别字 → 重罚
 */
export function scoreGenderFit(
  givenName: string,
  context: ScoringContext
): DimensionScore {
  const chars = extractChars(givenName);
  if (chars.length === 0) {
    return { score: 0, detail: "名字为空" };
  }

  const gender = context.gender;
  if (!gender) {
    return { score: 60, detail: "未指定性别，采用中性评分" };
  }

  // ── 女性偏好字（强烈女性化特征） ──
  const FEMALE_CHARS = new Set([
    "婉", "淑", "娴", "婷", "娜", "妍", "姝", "嫣", "娉", "婀", "倩",
    "慧", "清", "雅", "韵", "瑶", "瑾", "璐", "沁", "湉", "涓", "漪",
    "涵", "菲", "芳", "芬", "馥", "兰", "菊", "莲", "荷", "蕊", "蕾",
    "玫", "瑰", "瑛", "玲", "珑", "璎", "珮", "环", "黛", "碧",
    "云", "月", "雪", "霞", "虹", "霓", "露", "冰", "霜", "霖",
    "娟", "婵", "妙", "妮", "娃", "婴", "婴", "妃", "媛", "姬",
    "悦", "恬", "怡", "惬", "愫", "慈", "惠", "爱", "怜", "惜",
    "绮", "绣", "彩", "艳", "灿", "绚", "素", "纯", "洁", "静",
    "莺", "燕", "凤", "凰", "鸾", "鹊", "蝶", "萤", "霓", "霞",
    "美", "丽", "秀", "娇", "柔", "顺", "安", "宁", "静", "幽",
  ]);

  // ── 男性偏好字（强烈男性化特征） ──
  const MALE_CHARS = new Set([
    "刚", "健", "雄", "英", "豪", "杰", "伟", "毅", "勇", "猛",
    "强", "力", "武", "斌", "浩", "然", "志", "远", "光", "安",
    "恒", "坚", "锋", "锐", "剑", "戈", "矛", "盾", "甲", "铠",
    "龙", "虎", "豹", "鹰", "鹏", "鲲", "麒", "麟", "驹", "骏",
    "雄", "霸", "王", "帝", "皇", "君", "国", "家", "邦", "域",
    "德", "仁", "义", "正", "直", "诚", "信", "忠", "孝", "廉",
    "博", "深", "渊", "瀚", "宏", "伟", "壮", "丽", "富", "强",
    "振", "兴", "昌", "盛", "荣", "耀", "辉", "煌", "昊", "晟",
    "峰", "峦", "岳", "岗", "岭", "岩", "石", "铁", "钢", "金",
    "海", "江", "河", "湖", "洋", "波", "浪", "涛", "潮", "滔",
    "明", "亮", "旦", "旭", "晨", "曦", "曙", "曜", "旷", "广",
  ]);

  // ── 中性偏好字（男女皆可） ──
  const NEUTRAL_CHARS = new Set([
    "子", "之", "一", "小", "天", "文", "华", "瑞", "祥", "福",
    "欣", "乐", "欢", "喜", "嘉", "庆", "哲", "思", "宇", "书",
    "若", "如", "亦", "以", "与", "其", "所", "为", "因", "可",
    "言", "语", "音", "知", "识", "见", "闻", "声", "意", "情",
  ]);

  // 分析名字中每个字的性别倾向
  let femaleCount = 0;
  let maleCount = 0;
  let totalScored = 0;

  for (const ch of chars) {
    if (FEMALE_CHARS.has(ch)) {
      femaleCount++;
      totalScored++;
    } else if (MALE_CHARS.has(ch)) {
      maleCount++;
      totalScored++;
    }
    // NEUTRAL_CHARS 不计数也不扣分
  }

  // 如果名字中没有任何性别特征字，给予中等偏上分数（允许中性名存在）
  if (totalScored === 0) {
    return { score: 60, detail: "名字无明显性别特征，中性评分" };
  }

  // 计算性别匹配度
  const femaleRatio = femaleCount / chars.length;
  const maleRatio = maleCount / chars.length;

  let genderMatchRatio: number;
  let detail: string;

  if (gender === "F") {
    // 女性期望：女性字越多越好，男性字越少越好
    if (maleCount > 0 && femaleCount === 0) {
      // 全是男性字 → 严重不匹配
      genderMatchRatio = 0.1;
      detail = `含男性特征字（${maleCount}个），严重偏离女性气质`;
    } else if (maleCount > femaleCount) {
      // 男性字多于女性字
      genderMatchRatio = 0.3;
      detail = `男性特征偏多（男${maleCount}女${femaleCount}），女性气质不足`;
    } else if (maleCount > 0 && maleCount <= femaleCount) {
      // 男女搭配但女性字为主
      genderMatchRatio = 0.7;
      detail = `女性字占优（女${femaleCount}男${maleCount}），基本符合女性特征`;
    } else {
      // 全是女性字
      genderMatchRatio = 1.0;
      detail = `含女性特征字（${femaleCount}个），完美契合女性气质`;
    }
  } else {
    // 男性期望：男性字越多越好，女性字越少越好
    if (femaleCount > 0 && maleCount === 0) {
      // 全是女性字 → 严重不匹配
      genderMatchRatio = 0.1;
      detail = `含女性特征字（${femaleCount}个），严重偏离男性气质`;
    } else if (femaleCount > maleCount) {
      // 女性字多于男性字
      genderMatchRatio = 0.3;
      detail = `女性特征偏多（女${femaleCount}男${maleCount}），男性气质不足`;
    } else if (femaleCount > 0 && femaleCount <= maleCount) {
      // 男女搭配但男性字为主
      genderMatchRatio = 0.7;
      detail = `男性字占优（男${maleCount}女${femaleCount}），基本符合男性特征`;
    } else {
      // 全是男性字
      genderMatchRatio = 1.0;
      detail = `含男性特征字（${maleCount}个），完美契合男性气质`;
    }
  }

  // 性别分映射到 0-100 区间
  // 完美匹配 = 90~100，严重不匹配 = 10~20
  const score = clampScore(Math.round(30 + genderMatchRatio * 70));

  return { score, detail };
}

// ============================================================
// 8. 风格契合度 (5%)
// ============================================================

/**
 * 评估名字与用户选定风格的契合程度
 * 
 * 核心思想：用户选择的风格决定了得分标准，而非用固定审美评分
 * 
 * 风格→评分策略映射：
 * - 古典/古风/典雅   → 出自典籍、使用典雅汉字的得分高
 * - 温婉/柔美/淑女   → 使用婉约类汉字（婉清淑娴雅慧等）得分高
 * - 大气/雄浑/豪迈   → 使用雄浑类汉字（浩然天佑志远英杰等）得分高
 * - 现代/时尚/洋气   → 使用当代流行字（子轩宇涵沐泽等）得分高
 * - 自然/山水/诗意   → 使用自然意象字（云月风林溪岚等）得分高
 * - 无明确风格       → 中性评分（不扣分不加分）
 * 
 * 多风格时取各风格匹配度的加权综合。
 */
export async function scoreStyleFit(
  givenName: string,
  context: ScoringContext
): Promise<DimensionScore> {
  const chars = extractChars(givenName);
  if (chars.length === 0) {
    return { score: 0, detail: "名字为空" };
  }

  try {
    // 如果没有指定风格，返回中性分
    const userStyles = context.styles || [];
    if (userStyles.length === 0) {
      return { score: 60, detail: "未指定风格偏好，采用中性评分" };
    }

    // ── 风格关键词到风格类别的映射（支持同义词） ──
    type StyleCategory = "古典" | "温婉" | "大气" | "现代" | "自然" | "简约";

    const styleKeywordToCategory: Array<{ keywords: RegExp[]; category: StyleCategory }> = [
      {
        keywords: [/古风/i, /古典/i, /典雅/i, /古雅/i, /传统/i, /文雅/i, /诗意/i, /国学/i],
        category: "古典",
      },
      {
        keywords: [/温婉/i, /柔美/i, /淑女/i, /娴静/i, /婉约/i, /柔/i, /美/i, /清秀/i],
        category: "温婉",
      },
      {
        keywords: [/大气/i, /雄浑/i, /豪迈/i, /宏伟/i, /磅礴/i, /气魄/i, /英武/i, /刚毅/i],
        category: "大气",
      },
      {
        keywords: [/现代/i, /时尚/i, /洋气/i, /潮流/i, /新颖/i, /流行/i, /清新/i],
        category: "现代",
      },
      {
        keywords: [/自然/i, /山水/i, /诗意/i, /田园/i, /花草/i, /风景/i, /雅致/i],
        category: "自然",
      },
      {
        keywords: [/简约/i, /简洁/i, /大方/i, /利落/i, /清爽/i, /干净/i, /素雅/i],
        category: "简约",
      },
    ];

    // 匹配用户风格到类别
    const matchedCategories = new Set<StyleCategory>();
    for (const style of userStyles) {
      for (const mapping of styleKeywordToCategory) {
        const matches = mapping.keywords.some(kw => kw.test(style));
        if (matches) matchedCategories.add(mapping.category);
      }
    }

    // 如果没有匹配到任何类别，尝试按关键词模糊匹配
    let effectiveCategories: StyleCategory[];
    if (matchedCategories.size === 0) {
      // 对所有用户风格做通用文本匹配
      const styleText = userStyles.join(" ").toLowerCase();
      if (/古|典|雅|诗|文/.test(styleText)) matchedCategories.add("古典");
      if (/婉|柔|淑|娴|清/.test(styleText)) matchedCategories.add("温婉");
      if (/大|雄|豪|刚|英|伟|宏/.test(styleText)) matchedCategories.add("大气");
      if (/现|新|时|潮/.test(styleText)) matchedCategories.add("现代");
      if (/自|山|水|花|草|林/.test(styleText)) matchedCategories.add("自然");
      if (/简|素|净|爽/.test(styleText)) matchedCategories.add("简约");
      effectiveCategories = [...matchedCategories];
      if (effectiveCategories.length === 0) {
        return { score: 60, detail: `风格"${userStyles.join("、")}"未识别，采用中性评分` };
      }
    } else {
      effectiveCategories = [...matchedCategories];
    }

    // ── 各风格类别的汉字偏好定义 ──
    const styleCharMap: Record<StyleCategory, string[]> = {
      "古典": ["雅", "懿", "淑", "贤", "德", "仁", "义", "礼", "智", "信",
               "文", "章", "华", "国", "邦", "瑞", "祥", "祯", "祺", "禧",
               "筠", "瑾", "瑜", "瑶", "琼", "琳", "琅", "珩", "玦", "琮"],
      "温婉": ["婉", "清", "淑", "娴", "雅", "慧", "婷", "娉", "婀", "娜",
               "嫣", "妍", "姝", "娇", "婉", "柔", "静", "秀", "丽", "倩",
               "沁", "湉", "涓", "漪", "涵", "韵", "诗", "词", "歌", "赋"],
      "大气": ["浩", "然", "天", "佑", "志", "远", "英", "杰", "睿", "智",
               "伟", "毅", "诚", "信", "正", "义", "明", "达", "道", "德",
               "崇", "尚", "博", "广", "鸿", "鹏", "飞", "腾", "霄", "汉"],
      "现代": ["子", "轩", "宇", "涵", "沐", "泽", "宸", "睿", "铭", "熙",
               "汐", "玥", "怡", "诺", "瑶", "艺", "桐", "星", "乐", "可",
               "伊", "言", "舒", "禾", "芮", "笙", "晚", "洛", "锦", "一"],
      "自然": ["云", "月", "风", "林", "溪", "岚", "霏", "雨", "雪", "霜",
               "松", "竹", "梅", "兰", "菊", "莲", "荷", "桐", "柳", "枫",
               "山", "川", "海", "波", "涛", "泓", "泽", "润", "清", "泉"],
      "简约": ["一", "之", "小", "大", "方", "正", "平", "安", "和", "顺",
               "中", "朴", "素", "真", "善", "美", "纯", "宁", "静", "远"],
    };

    // ── 打分逻辑：对每个匹配的风格类别计算契合度，取平均 ──
    let totalStyleScore = 0;

    for (const cat of effectiveCategories) {
      const preferredChars = new Set(styleCharMap[cat] || []);
      if (preferredChars.size === 0) {
        totalStyleScore += 50; // 无偏好字的风格类别，给中间分
        continue;
      }

      // 因子A: 名字中的字落在偏好集中的比例 (0-70分)
      const matchCount = chars.filter(c => preferredChars.has(c)).length;
      const matchRatio = chars.length > 0 ? matchCount / chars.length : 0;
      const matchScore = Math.round(matchRatio * 70);

      // 因子B: 风格关键词在名字含义中的匹配度 (0-30分)
      // 检查名字寓意描述是否包含风格关键词
      // 此处简化处理：直接查看名字是否与风格同属一个语域
      let meaningScore = 15; // 中间分

      // 从名字字形推断风格契合度（额外的加分）
      // 如果名字中所有字的平均笔画适中（6-12画），对大多数风格都友好
      // 但不宜在此维度过度扣分，风格契合度主要看字义和语域

      let catScore = clampScore(matchScore + meaningScore);

      // 加权：用户风格列表中该类别的比重（均匀分布）
      totalStyleScore += catScore;
    }

    const finalScore = clampScore(Math.round(totalStyleScore / effectiveCategories.length));

    const catNames = effectiveCategories.join("、");
    return {
      score: finalScore,
      detail: `风格"${catNames}"契合度${finalScore}分`,
    };
  } catch (error) {
    console.warn("[ScorerV2] 风格契合度评分失败:", error);
    return { score: 60, detail: "风格契合度评分降级" };
  }
}

// ============================================================
// 综合评分
// ============================================================

/**
 * 对单个名字进行七维加权综合评分
 */
export async function computeScoreV2(
  nameObj: {
    name: string;       // 全名（含姓）
    givenName: string;
    surname: string;
  },
  context: ScoringContext
): Promise<ScoreBreakdownV2> {
  const { givenName, surname, name: fullName } = nameObj;

  // 并行计算七维分数
  const gender = Promise.resolve(scoreGenderFit(givenName, context));

  const [semantic, phonetic, cultural, glyph, wuxing, uniqueness, styleFit, genderScore] = await Promise.all([
    scoreSemanticMatch(givenName, context),
    Promise.resolve(scorePhonetic(givenName, context)),
    scoreCultural(givenName, context),
    scoreGlyph(givenName, context),
    scoreWuxing(givenName, context),
    scoreUniqueness(givenName, fullName, surname, context.gender),
    scoreStyleFit(givenName, context),
    gender,
  ]);

  // 加权总分
  let total = clampScore(
    semantic.score * WEIGHTS.semantic +
    phonetic.score * WEIGHTS.phonetic +
    cultural.score * WEIGHTS.cultural +
    glyph.score * WEIGHTS.glyph +
    wuxing.score * WEIGHTS.wuxing +
    uniqueness.score * WEIGHTS.uniqueness +
    styleFit.score * WEIGHTS.styleFit +
    genderScore.score * WEIGHTS.gender
  );

  // 注意：不再设高基线！让评分分布式自然落在40~95分区间
  // 只设最低40分基线，防止完全无法使用的名字也不至于给0分
  total = Math.max(40, total);

  return {
    semantic,
    phonetic,
    cultural,
    glyph,
    wuxing,
    uniqueness,
    gender: genderScore,
    styleFit,
    total,
  };
}

/**
 * 批量评分并排序
 *
 * @param names - 待评分名字列表
 * @param context - 评分上下文（用户期望、典籍匹配、八字等）
 * @returns 按总分降序排列的名字列表（含评分分解）
 */
export async function scoreAndSortNames(
  names: GeneratedName[],
  context: ScoringContext,
  options?: {
    /** 并发数，默认2 */
    concurrency?: number;
    /** 是否输出详细日志 */
    verbose?: boolean;
  }
): Promise<Array<GeneratedName & { scoreBreakdownV2: ScoreBreakdownV2 }>> {
  if (!names || names.length === 0) return [];

  const concurrency = options?.concurrency || 2;
  const verbose = options?.verbose ?? true;

  const results: Array<GeneratedName & { scoreBreakdownV2: ScoreBreakdownV2 }> = [];

  for (let i = 0; i < names.length; i += concurrency) {
    const batch = names.slice(i, i + concurrency);
    const scored = await Promise.all(
      batch.map(async (name) => {
        try {
          // 解析姓氏
          const givenName = name.givenName || name.name;
          const surname = context.surname || (name.name.length > givenName.length ? name.name.slice(0, 1) : "张");

          const scoreBreakdown = await computeScoreV2(
            { name: name.name, givenName, surname },
            context
          );

          const enhanced = {
            ...name,
            score: scoreBreakdown.total,
            scoreBreakdownV2: scoreBreakdown,
          };

          if (verbose) {
            console.log(
              `[ScorerV2] ${name.name} | ` +
              `语义=${scoreBreakdown.semantic.score} ` +
            `音律=${scoreBreakdown.phonetic.score} ` +
            `文化=${scoreBreakdown.cultural.score} ` +
            `字形=${scoreBreakdown.glyph.score} ` +
            `五行=${scoreBreakdown.wuxing.score} ` +
            `独特=${scoreBreakdown.uniqueness.score} ` +
            `风格=${scoreBreakdown.styleFit.score} ` +
              `→ 总分=${scoreBreakdown.total}`
            );
          }

          return enhanced;
        } catch (err) {
          console.warn(`[ScorerV2] 评分失败 ${name.name}:`, err);
          return {
            ...name,
            score: 60,
            scoreBreakdownV2: createDefaultBreakdown("评分失败，使用默认分"),
          };
        }
      })
    );
    results.push(...scored);
  }

  // 按总分降序排列
  results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return results;
}

/** 创建默认评分分解（降级用） */
function createDefaultBreakdown(detail: string): ScoreBreakdownV2 {
  const defaultDim = (s: number) => ({ score: s, detail });
  return {
    semantic: defaultDim(60),
    phonetic: defaultDim(60),
    cultural: defaultDim(50),
    glyph: defaultDim(60),
    wuxing: defaultDim(50),
    uniqueness: defaultDim(60),
    gender: defaultDim(60),
    styleFit: defaultDim(60),
    total: 60,
  };
}

// ============================================================
// 导出
// ============================================================

export const NameScorerV2 = {
  scoreSemanticMatch,
  scorePhonetic,
  scoreCultural,
  scoreGlyph,
  scoreWuxing,
  scoreUniqueness,
  scoreStyleFit,
  computeScoreV2,
  scoreAndSortNames,
  WEIGHTS,
};
