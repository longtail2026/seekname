/**
 * name-scorer-v2.ts - 八维加权打分排序系统
 *
 * 评分维度与权重:
 * ┌──────────────┬──────┬────────────────────────────────┐
 * │ 维度         │ 权重 │ 数据来源                       │
 * ├──────────────┼──────┼────────────────────────────────┤
 * │ 语义匹配度   │ 15%  │ 典籍语义相似度 + 用户意向匹配  │ ← v3.1: 增加直白惩罚因子
 * │ 音律美感     │ 20%  │ phonetic-optimizer 声韵分析    │
 * │ 性别契合度   │ 20%  │ 性别特征分析与匹配             │
 * │ 五行平衡     │ 15%  │ bazi-service 八字五行匹配      │
 * │ 文化内涵     │ 10%  │ 典籍出处匹配度                 │
 * │ 字形结构     │ 10%  │ 笔画平衡 + 结构和谐             │
 * │ 独特性       │ 5%   │ 重名风险 + 字频稀缺度          │
 * │ 风格契合度   │ 5%   │ 与用户选定风格的匹配度          │
 * ├──────────────┼──────┼────────────────────────────────┤
 * │ 总分         │ 100% │ 加权综合分 (0-100)             │
 * └──────────────┴──────┴────────────────────────────────┘
 *
 * v3.1 优化（针对用户反馈"评分最高的反而最土气"——四层联动修复方案）：
 *
 * 【问题根因】
 * 用户期望"聪明智慧"→名字叫"智慧"时，语义匹配度居然给80分（因为语义相似度高），
 * 但名字=期望词是"最土气/最偷懒"的做法。直白惩罚只加在性别维度（20%权重），
 * 导致全局影响约7分，完全无法拉低总分。
 * 
 * 【四层联动修复】
 * 
 * 第1层（语义维度）：新增直白惩罚因子（OvertName penalty）
 *   - 名字直接复用用户期望词 → 语义天生降为15分（即使语义相似度再高）
 *   - "智+慧/丽/美"等直白组合 → 语义维度扣40分
 * 
 * 第2层（全局直白惩罚）：新增总量扣减
 *   - 在加权总分计算后，名字直白时直接扣20-40分（不受权重稀释）
 *   - 确保"智慧"类名字的总分无法超过50分
 * 
 * 第3层（性别字库精炼）：
 *   - "慧"维持MALE_LEANING（2010-2025年代，独女名用"慧"确实偏土气）
 *   - 新增"直接概念映射"惩罚（名字是期望词直接复用→全局扣30分）
 * 
 * 第4层（AI prompt + 意境保底）：
 *   - 强化AI prompt指令（禁止偷懒用期望词直接成名字）
 *   - 典籍未匹配时启用意境保底分（不低于40分）
 *   - 文化内涵评分中，名字意境好但无典籍出处时至少45分
 */

import { CharacterInfo } from "./naming-engine";
import { evaluatePhoneticQuality } from "./phonetic-optimizer";
import { queryCulturalSource, queryPopularity, queryUniqueness } from "./name-scorer";
import { analyzeNameWuxing, type WuxingPreference } from "./bazi-service";
import { queryRaw } from "./prisma";
import type { GeneratedName, ClassicsMatch } from "./semantic-naming-engine";
import {
  FEMALE_CHARS,
  MALE_CHARS,
  MALE_LEANING_CHARS,
  FEMALE_LEANING_CHARS,
  NEUTRAL_CHARS,
  checkOvertName,
} from "./gender-chars";

// ============================================================
// 类型定义
// ============================================================

/** 单维评分结果 */
export interface DimensionScore {
  score: number;      // 0-100
  detail: string;     // 评分说明
}

/** 八维评分分解 */
export interface ScoreBreakdownV2 {
  semantic: DimensionScore;   // 语义匹配度 15%
  phonetic: DimensionScore;   // 音律美感 20%
  gender: DimensionScore;     // 性别契合度 20%
  wuxing: DimensionScore;     // 五行平衡 15%
  cultural: DimensionScore;   // 文化内涵 10%
  glyph: DimensionScore;      // 字形结构 10%
  uniqueness: DimensionScore; // 独特性 5%
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
// 权重配置（v3.0：语义15%/性别20%互换）
// ============================================================

const WEIGHTS = {
  semantic: 0.15,   // 15%  ← v3.0: 从20%降至15%（与性别互换）
  phonetic: 0.20,   // 20%
  gender: 0.20,     // 20%  ← v3.0: 从15%提升至20%（与语义互换），性别成为第二重要维度
  wuxing: 0.15,     // 15%
  cultural: 0.10,   // 10%
  glyph: 0.10,      // 10%
  uniqueness: 0.05, // 5%
  styleFit: 0.05,   // 5%
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
// 1. 语义匹配度 (15%)  ← v3.0: 20%→15%
// ============================================================

/**
 * 评估名字与用户意向的语义匹配度
 *
 * v2.1 重要更新：
 * - 加入"直白性惩罚"：名字直接使用期望词（如"智慧""聪明"）会扣分
 * - 好的名字应该"含而不露"，用意象和典故暗示意境，而非直接说教
 * - 如用户期望"聪明智慧"，"灵瑶"比"智慧"更雅致
 *
 * v3.0 重要更新：
 * - 惩罚上限从40提升至60，杜绝"智慧""智丽""智美"等口号名
 * - 新增"精准匹配额外减分"：名字完整复用了用户期望词（如"智慧"→直接取名"智慧"），额外扣30分
 * - "智+慧/丽/美"等老土组合基础惩罚从10→15
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
    // ── 因子A: 典籍关联度 (0-55分) ──
    let classicsOverlapScore = 0;

    if (context.matchedClassics && context.matchedClassics.length > 0) {
      let maxOverlap = 0;
      for (const match of context.matchedClassics) {
        const ancientText = match.ancientText || "";
        const overlap = chars.filter(c => ancientText.includes(c)).length;
        maxOverlap = Math.max(maxOverlap, overlap);
      }

      const ratio = chars.length > 0 ? maxOverlap / chars.length : 0;
      classicsOverlapScore = Math.round(ratio * 55);

      const maxSimilarity = Math.max(...context.matchedClassics.map(m => m.similarity || 0));
      if (maxSimilarity > 0.6) {
        classicsOverlapScore = Math.min(55, classicsOverlapScore + 15);
      }
      if (maxSimilarity > 0.8) {
        classicsOverlapScore = Math.min(60, classicsOverlapScore + 5);
      }
    } else {
      classicsOverlapScore = 55; // 无典籍匹配时也给基础分，但不如有典籍的高
    }

    // ── 因子B: 用户意向匹配度 (0-40分) ──
    let intentMatchScore = 0;

    const expectationKeywords = extractKeywords(context.expectations);
    const styleKeywords = (context.styles || []).flatMap(s => extractKeywords(s));

    const charsArray = chars.map(c => `'${c}'`).join(",");
    const rows = await queryRaw(
      `SELECT character, meaning FROM kangxi_dict WHERE character IN (${charsArray})`
    ) as Array<{ character: string; meaning: string }>;

    const charMeanings = new Map(rows.map(r => [r.character, r.meaning || ""]));

    const allIntentWords = [...expectationKeywords, ...styleKeywords];
    if (allIntentWords.length > 0) {
      let matchedCount = 0;
      for (const char of chars) {
        const meaning = charMeanings.get(char) || "";
        const hasMatch = allIntentWords.some(
          word => meaning.includes(word) || char === word
        );
        if (hasMatch) matchedCount++;
      }

      const intentRatio = chars.length > 0 ? matchedCount / chars.length : 0;
      intentMatchScore = Math.round(intentRatio * 40);
    } else {
      intentMatchScore = 35;
    }

  // ── 因子C: 直白性惩罚 ── v3.1: 三重直白惩罚机制
  // 
  // 【重要】名字直接复用用户期望词是"最土气"的做法，不应用高语义分
  // 例如：用户期望"聪明智慧"→名字叫"智慧"，语义应该极低而非高
  let overtnessPenalty = 0;
  let overtDirectScoreOverride = false; // v3.1: 是否直接覆盖为低分

  // 使用 gender-chars.ts 的 checkOvertName 检测直白名
  const userExpectationList = extractKeywords(context.expectations);
  const overtResult = checkOvertName(givenName, userExpectationList);

  // 第1重：名字直接复用了用户期望中的完整词（如期望"智慧"→名字"智慧"）
  // → 语义分数强制降为15分（这是最严重的直白）
  if (overtResult.isOvert) {
    for (const word of overtResult.overtWords) {
      // 去掉引号等非字内容，判断是否用户在期望中真的用了这个词
      const cleanWord = word.replace(/[^一-龥]/g, "");
      if (cleanWord.length >= 2 && givenName.includes(cleanWord)) {
        // 检查这个词是否真的是用户期望的关键词
        const isInExpectations = userExpectationList.some(
          exp => exp.includes(cleanWord) || cleanWord.includes(exp)
        );
        if (isInExpectations) {
          overtDirectScoreOverride = true; // 强制语义降为15分
          break;
        }
      }
    }
  }

  // 如果发现直接复用期望词 → 语义只有15分（不论典籍关联度多高）
  if (overtDirectScoreOverride) {
    return {
      score: 15,
      detail: "名字直接复用[期望词]，语义维度强制低分（建议使用意象化表达）",
    };
  }

  // 第2重：常规直白组合惩罚
  if (overtResult.isOvert) {
    overtnessPenalty += 35; // 基础直白惩罚
    overtnessPenalty += 5 * (overtResult.overtWords.length - 1); // 每多一个直白词再加分
  }

  // 第3重：特定老土组合额外惩罚（"智+慧/丽/美"等）
  const TACKY_PATTERNS = [
    /智[慧丽美]/g,     // 智慧、智力、智美
    /[美俊]丽/g,       // 美丽、俊丽
    /聪[明慧]/g,       // 聪明、聪慧
    /[才华]艺/g,       // 才艺、华艺
    /仁[爱德]/g,       // 仁爱、仁德
    /富[贵]禄/g,       // 富贵
  ];
  for (const pattern of TACKY_PATTERNS) {
    if (pattern.test(givenName)) {
      overtnessPenalty += 15; // 每个老土组合加15分
      break;
    }
  }

  // v3.1: 上限从60→100（结合三重惩罚，上限放开）
  overtnessPenalty = Math.min(100, overtnessPenalty);

  // ★ v3.2: 如果直白惩罚≥35分，semantic 直接给低分（即便典籍匹配好）
  if (overtnessPenalty >= 35) {
    return {
      score: clampScore(Math.max(0, 50 - overtnessPenalty)),
      detail: `名字过于直白（扣${overtnessPenalty}分），语义维度强制低分`,
    };
  }

  const totalScore = clampScore(classicsOverlapScore + intentMatchScore + 10 - overtnessPenalty);
  const detailParts = [];
  if (classicsOverlapScore > 0) detailParts.push(`典籍关联${classicsOverlapScore}分`);
  if (intentMatchScore > 0) detailParts.push(`意向匹配${intentMatchScore}分`);
  if (overtnessPenalty > 0) detailParts.push(`直白扣分${overtnessPenalty}分`);

  const detail = detailParts.length > 0
    ? detailParts.join(" + ")
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
// 3. 性别契合度 (20%) ← v3.0: 从15%→20%，与语义互换
// ============================================================

/**
 * 评估名字与性别的契合度
 *
 * v2.1 重大更新：
 * 1. 女性字库新增"智/慧/丽/美/明"的严格分类（它们有女性特征但也可用于男性，需要上下文判断）
 * 2. 新增"理性学术类中性字"概念：如"哲/思/文/学/知/识/理/论"等偏理性字，女性使用时适当扣分
 * 3. 新增"世俗老气扣分"：如"智慧"这种太像口号的名字扣性别分
 * 4. 中性名不再给60分保底，当明确指定性别后，中性名应得中等偏下分
 *
 * v3.0 更新：
 * - "慧"从偏女性中性移入偏男性中性
 * - "智+慧"同时出现在女名中→联合惩罚（-35分）
 * - "智慧""美丽"等直白名扣分从25→35
 * - 性别分下限从5→0（允许彻底不及格）
 * - 全中性字名字惩罚从15→25
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
    return { score: 65, detail: "未指定性别，采用中性评分" };
  }

  // 分析名字中每个字的性别倾向
  let femaleStrong = 0;      // 强烈女性特征字
  let maleStrong = 0;        // 强烈男性特征字
  let femaleLeaning = 0;     // 偏女性中性字
  let maleLeaning = 0;       // 偏男性中性字
  let neutralCount = 0;      // 中性字

  for (const ch of chars) {
    if (!/[\u4e00-\u9fff]/.test(ch)) continue;
    if (FEMALE_CHARS.has(ch)) {
      femaleStrong++;
    } else if (MALE_CHARS.has(ch)) {
      maleStrong++;
    } else if (MALE_LEANING_CHARS.has(ch)) {
      maleLeaning++;
    } else if (FEMALE_LEANING_CHARS.has(ch)) {
      femaleLeaning++;
    } else if (NEUTRAL_CHARS.has(ch)) {
      neutralCount++;
    }
    // 未收录字也视为中性
  }

  // ── 额外扣分因子 ──

  // 因子A: 直白老土名扣分（"智慧""美丽"这种口号名）← v3.0: 25→35
  let tackyPenalty = 0;
  const TACKY_FEMALE_NAMES = ["智慧", "聪明", "美丽", "俊秀", "善良", "才华", "爱华"];
  for (const pattern of TACKY_FEMALE_NAMES) {
    if (givenName.includes(pattern)) {
      tackyPenalty += 35; // v3.0: 从25→35
      break;
    }
  }

  // 因子B: 全中性字 → 缺乏性别特征  ← v3.0: 15→25
  let neutralAllPenalty = 0;
  const totalTyped = femaleStrong + maleStrong + femaleLeaning + maleLeaning;
  if (totalTyped === 0 && chars.length >= 2) {
    neutralAllPenalty = 25; // v3.0: 从15→25
  }

  // 因子C: 女名中含偏男性字的扣分（如"智"用在女名）
  let maleLeaningPenalty = 0;
  if (gender === "F" && maleLeaning > 0) {
    maleLeaningPenalty = 15 * maleLeaning;
  }

  // 因子D: 男性字倒错重罚
  let strongCrossPenalty = 0;
  if (gender === "F" && maleStrong > 0) {
    strongCrossPenalty = 20 * maleStrong;
  }

  // 因子E: 检查名字整体印象
  let expectationConflictPenalty = 0;
  if (gender === "F" && context.expectations) {
    const expectationText = context.expectations;
    const hasSmartKeywords = /智|慧|聪|明|睿|哲/.test(expectationText);
    if (hasSmartKeywords && (maleLeaning > 0 || maleStrong > 0)) {
      expectationConflictPenalty = 10;
    }
  }

  // 因子F (v3.0): "智"+"慧"同时出现在女名中→联合惩罚
  let zhiHuiJointPenalty = 0;
  if (gender === "F" && givenName.includes("智") && givenName.includes("慧")) {
    zhiHuiJointPenalty = 35; // "智慧"组合特别扣分
  }

  // ── 总分计算 ──

  let score: number;
  let detail: string;

  if (gender === "F") {
    // ☐ 女名评分
    if (maleStrong > 0 && femaleStrong === 0) {
      score = 10;
      detail = `名字含${maleStrong}个强烈男性特征字，完全不适合女孩`;
    } else if (maleStrong > femaleStrong) {
      score = 20;
      detail = `男性特征（${maleStrong}个）多于女性特征（${femaleStrong}个），女孩气质明显不足`;
    } else if (maleStrong > 0 && maleStrong <= femaleStrong) {
      score = 40;
      detail = `女性字为主但含男性字（女${femaleStrong}男${maleStrong}），性别特征不够纯粹`;
    } else if (maleLeaning > 0 && femaleStrong === 0 && femaleLeaning === 0) {
      score = 35;
      detail = `名字仅含${maleLeaning}个偏男性字，缺乏女性气质`;
    } else if (femaleStrong >= 2) {
      score = 95;
      detail = `双女性特征字（${femaleStrong}个），完美契合女孩气质`;
    } else if (femaleStrong === 1) {
      if (femaleLeaning > 0 || maleLeaning === 0) {
        score = 80;
        detail = `含女性特征字，基本符合女孩气质`;
      } else {
        score = 60;
        detail = `一个女性字但搭配了偏男性字，性别气质较模糊`;
      }
    } else if (femaleLeaning > 0 && maleLeaning === 0) {
      score = 70;
      detail = `含偏女性字（${femaleLeaning}个），温和偏女性气质`;
    } else if (femaleLeaning > 0 && maleLeaning > 0) {
      score = 50;
      detail = `兼有偏女性字（${femaleLeaning}个）和偏男性字（${maleLeaning}个），气质混合`;
    } else {
      score = 45;
      detail = `全中性字，缺乏女性气质`;
    }

    // 应用所有惩罚（v3.0: 下限从5→0）
    score -= (tackyPenalty + neutralAllPenalty + maleLeaningPenalty + strongCrossPenalty + expectationConflictPenalty + zhiHuiJointPenalty);
    score = Math.max(0, score); // v3.0: 从5→0

  } else {
    // ☐ 男名评分
    if (femaleStrong > 0 && maleStrong === 0) {
      score = 10;
      detail = `名字含${femaleStrong}个强烈女性特征字，完全不适合男孩`;
    } else if (femaleStrong > maleStrong) {
      score = 20;
      detail = `女性特征（${femaleStrong}个）多于男性特征（${maleStrong}个），男孩气质明显不足`;
    } else if (femaleStrong > 0 && femaleStrong <= maleStrong) {
      score = 40;
      detail = `男性字为主但含女性字（男${maleStrong}女${femaleStrong}），性别特征不够纯粹`;
    } else if (femaleLeaning > 0 && maleStrong === 0 && maleLeaning === 0) {
      score = 35;
      detail = `名字仅含偏女性字（${femaleLeaning}个），缺乏男性气质`;
    } else if (maleStrong >= 2) {
      score = 95;
      detail = `双男性特征字（${maleStrong}个），完美契合男孩气质`;
    } else if (maleStrong === 1) {
      if (maleLeaning > 0 || femaleLeaning === 0) {
        score = 80;
        detail = `含男性特征字，基本符合男孩气质`;
      } else {
        score = 55;
        detail = `一个男性字但搭配了偏女性字，性别气质较模糊`;
      }
    } else if (maleLeaning > 0) {
      score = 65;
      detail = `含偏男性字（${maleLeaning}个），略微偏男性气质`;
    } else {
      score = 45;
      detail = `全中性字，缺乏男性气质`;
    }

    score = Math.max(0, score); // v3.0: 从5→0
  }

  return { score: clampScore(score), detail };
}

// ============================================================
// 4. 五行平衡 (15%)
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
      return { score: 50, detail: "未提供八字信息，五行维度采用中性评分" };
    }

    const result = await analyzeNameWuxing(givenName, context.wuxingPreference);
    const wuxingScore = result.score;

    const charsWithWuxing = result.characters.filter(c => c.wuxing).length;
    const hasWuxingInfo = charsWithWuxing > 0;

    let finalScore = wuxingScore;
    if (!hasWuxingInfo) {
      finalScore = Math.min(finalScore, 40);
    }

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
// 5. 文化内涵 (10%)
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

    return { score: 45, detail: "未匹配到典籍出处（但有AI关联的文化意境）" };
  } catch (error) {
    console.warn("[ScorerV2] 文化内涵评分失败:", error);
    return { score: 40, detail: "文化内涵评分降级" };
  }
}

// ============================================================
// 6. 字形结构 (10%)
// ============================================================

/**
 * 评估名字的字形结构和谐度
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

    // 因子A: 笔画平衡度 (0-40分)
    let strokeBalanceScore = 40;
    const strokes = chars.map(c => strokeMap.get(c) || 8);

    if (strokes.length >= 2) {
      const maxStroke = Math.max(...strokes);
      const minStroke = Math.min(...strokes);
      const diff = maxStroke - minStroke;

      if (diff > 12) strokeBalanceScore = 10;
      else if (diff > 8) strokeBalanceScore = 20;
      else if (diff > 5) strokeBalanceScore = 30;
      else strokeBalanceScore = 40;

      const totalStrokes = strokes.reduce((a, b) => a + b, 0);
      const idealMin = chars.length === 2 ? 16 : 20;
      const idealMax = chars.length === 2 ? 30 : 40;

      if (totalStrokes < idealMin) strokeBalanceScore -= 10;
      else if (totalStrokes > idealMax) strokeBalanceScore -= 10;
    } else {
      strokeBalanceScore = 30;
    }

    // 因子B: 结构多样性 (0-30分)
    let structureScore = 30;
    const radicals = chars.map(c => radicalMap.get(c) || "");

    if (radicals.length >= 2) {
      const uniqueRadicals = [...new Set(radicals.filter(r => r))];
      if (uniqueRadicals.length === 1 && uniqueRadicals[0]) {
        structureScore = 10;
      } else if (uniqueRadicals.length <= 1) {
        structureScore = 20;
      }
    }

    // 因子C: 难易搭配度 (0-30分)
    let difficultyScore = 30;
    const verySimpleCount = strokes.filter(s => s <= 5).length;
    const veryComplexCount = strokes.filter(s => s >= 15).length;

    if (chars.length >= 2) {
      if (verySimpleCount === chars.length) difficultyScore = 10;
      else if (veryComplexCount === chars.length) difficultyScore = 10;
      else if (verySimpleCount > 0 && veryComplexCount > 0) difficultyScore = 25;
      else difficultyScore = 30;
    } else {
      if (verySimpleCount > 0 || veryComplexCount > 0) difficultyScore = 15;
      else difficultyScore = 25;
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
// 7. 独特性 (5%)
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
    // 因子A: 重名风险 (0-50分)
    const uniqueness = await queryUniqueness(fullName, givenName, surname, gender);
    const uniquenessScore = uniqueness.uniquenessScore;

    const homophonePenalty = uniqueness.homophoneRisk === "high" ? 15
      : uniqueness.homophoneRisk === "medium" ? 8
      : 0;
    const nameRarityScore = Math.max(0, Math.round(uniquenessScore / 2) - homophonePenalty);

    // 因子B: 字频稀缺度 (0-50分)
    const charInfo = toCharacterInfo(chars);
    const popularity = await queryPopularity(charInfo, gender);
    let rarityScore = Math.round(popularity.rarityScore / 2);

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
// 8. 风格契合度 (5%)
// ============================================================

/**
 * 评估名字与用户选定风格的契合程度
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
    const userStyles = context.styles || [];
    if (userStyles.length === 0) {
      return { score: 60, detail: "未指定风格偏好，采用中性评分" };
    }

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

    const matchedCategories = new Set<StyleCategory>();
    for (const style of userStyles) {
      for (const mapping of styleKeywordToCategory) {
        const matches = mapping.keywords.some(kw => kw.test(style));
        if (matches) matchedCategories.add(mapping.category);
      }
    }

    let effectiveCategories: StyleCategory[];
    if (matchedCategories.size === 0) {
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

    let totalStyleScore = 0;

    for (const cat of effectiveCategories) {
      const preferredChars = new Set(styleCharMap[cat] || []);
      if (preferredChars.size === 0) {
        totalStyleScore += 50;
        continue;
      }

      const matchCount = chars.filter(c => preferredChars.has(c)).length;
      const matchRatio = chars.length > 0 ? matchCount / chars.length : 0;
      const matchScore = Math.round(matchRatio * 70);

      let meaningScore = 15;
      let catScore = clampScore(matchScore + meaningScore);
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
 * 对单个名字进行八维加权综合评分（v3.0）
 */
export async function computeScoreV2(
  nameObj: {
    name: string;
    givenName: string;
    surname: string;
  },
  context: ScoringContext
): Promise<ScoreBreakdownV2> {
  const { givenName, surname, name: fullName } = nameObj;

  // 并行计算八维分数
  const gender = Promise.resolve(scoreGenderFit(givenName, context));

  const [semantic, phonetic, wuxing, cultural, glyph, uniqueness, styleFit, genderScore] = await Promise.all([
    scoreSemanticMatch(givenName, context),
    Promise.resolve(scorePhonetic(givenName, context)),
    scoreWuxing(givenName, context),
    scoreCultural(givenName, context),
    scoreGlyph(givenName, context),
    scoreUniqueness(givenName, fullName, surname, context.gender),
    scoreStyleFit(givenName, context),
    gender,
  ]);

  // 加权总分
  let total = clampScore(
    semantic.score * WEIGHTS.semantic +
    phonetic.score * WEIGHTS.phonetic +
    wuxing.score * WEIGHTS.wuxing +
    cultural.score * WEIGHTS.cultural +
    glyph.score * WEIGHTS.glyph +
    uniqueness.score * WEIGHTS.uniqueness +
    styleFit.score * WEIGHTS.styleFit +
    genderScore.score * WEIGHTS.gender
  );

  // v3.1: ★ 全局直白惩罚（第2层）— 不受权重稀释
  // 名字直接复用用户期望词时，在加权总分上直接扣20-40分
  // 这是最关键的一层：确保"智慧"类名字即使其他维度分数再高，总分也不会超过50
  let globalOvertPenalty = 0;
  if (context.expectations) {
    const expectationKeywords = extractKeywords(context.expectations);
    const overtResult = checkOvertName(givenName, expectationKeywords);
    if (overtResult.isOvert) {
      for (const word of overtResult.overtWords) {
        const cleanWord = word.replace(/[^一-龥]/g, "");
        if (cleanWord.length >= 2 && givenName.includes(cleanWord)) {
          // 名字直接复用了用户期望词（如期望"智慧"→取名"智慧"）
          globalOvertPenalty = 40; // 全局扣40分，确保分数极低
          break;
        }
      }
      // 名字包含直白组合但未完全复用时，也扣20分
      if (globalOvertPenalty === 0) {
        globalOvertPenalty = 20;
      }
    }
  }

  // 应用全局直白惩罚
  total = clampScore(total - globalOvertPenalty);

  // v3.0: 低基线防护从40→50，防止过低分带来的体验差
  // v3.1: 如果名字受全局直白惩罚，不应用低基线防护（确保"智慧"类名不要反弹）
  // v3.2: ★ 直白名底线从40→25，确保"智慧""美丽""智丽"等老土名不会排在前面
  if (globalOvertPenalty > 0) {
    total = Math.max(25, total); // 直白名最⾼25分
  } else {
    total = Math.max(50, total); // 正常名字低基线防护50分
  }

  return {
    semantic,
    phonetic,
    gender: genderScore,
    wuxing,
    cultural,
    glyph,
    uniqueness,
    styleFit,
    total,
  };
}

/**
 * 批量评分并排序
 */
export async function scoreAndSortNames(
  names: GeneratedName[],
  context: ScoringContext,
  options?: {
    concurrency?: number;
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
              `性别=${scoreBreakdown.gender.score} ` +
              `五行=${scoreBreakdown.wuxing.score} ` +
              `文化=${scoreBreakdown.cultural.score} ` +
              `字形=${scoreBreakdown.glyph.score} ` +
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

  results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return results;
}

/** 创建默认评分分解（降级用） */
function createDefaultBreakdown(detail: string): ScoreBreakdownV2 {
  const defaultDim = (s: number) => ({ score: s, detail });
  return {
    semantic: defaultDim(60),
    phonetic: defaultDim(60),
    gender: defaultDim(60),
    wuxing: defaultDim(50),
    cultural: defaultDim(50),
    glyph: defaultDim(60),
    uniqueness: defaultDim(60),
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
  scoreGenderFit,
  scoreWuxing,
  scoreCultural,
  scoreGlyph,
  scoreUniqueness,
  scoreStyleFit,
  computeScoreV2,
  scoreAndSortNames,
  WEIGHTS,
};