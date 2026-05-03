/**
 * 英文起名引擎 v4.2
 * 
 * === 架构变更 ===
 * ★ 删除风格偏好所有选项、风格评分
 * ★ 姓氏发音匹配：从150个姓氏映射表匹配（ename-surname-map）
 * ★ 单字名 → 单音节英文名匹配（2200+英文名库）
 * ★ 二字名 → 双音节英文名匹配（2200+英文名库）
 * ★ 数据库匹配完成后，调用DeepSeek AI生成候选（完整提示词模板）
 * ★ DB结果 + AI结果 去重打分排序，最终输出6个候选
 *   评分规则：核心需求80% + 长度偏好20%
 *   核心需求内细分：每个选中的需求等权均匀分配80%权重
 *   DB候选≤10个 + AI候选=10个 = 总候选≤20个参与评分
 * 
 * === V4.2 变更 ===
 * ★ 姓氏英文表达优化：当姓氏在 SURNAME_ENGLISH_MAP 中有映射时，
 *   推荐全名使用海外表达（如"张→Cheung"而非"Zhang"）
 * ★ surnameOverseas 也优先使用 SURNAME_ENGLISH_MAP 中的表达
 * ★ 修复"Gordon Cheung" 排名低于 "Gordon Zhang" 的问题
 */

import { getAllRecords, type EnameRecord } from "./ename-dict";
import {
  getChineseNamePinyin,
  searchByPhoneticMatch,
} from "./ename-phonetic";
import { getSurnameEnglishExpressions, getRecommendedSurnameSpellings, getSurnameChinaOverseas } from "./ename-surname-map";
import { isHardBlocked, getBlacklistPenalty } from "./ename-blacklist";
import { generateEnglishNamesByPrompt } from "./deepseek-client";

// ===== 类型定义 =====

export interface EnameGenerateRequest {
  gender: "male" | "female";
  surname: string;
  fullName?: string;
  needs?: string[];
  avoidFlags?: string[];
  lengthPreference?: "short" | "medium" | "long";
  count?: number;
}

export interface EnameScoredResult {
  name: string;
  gender: string;
  phonetic: string;
  chinese: string;
  origin: string;
  popularity: string;
  meaning: string;
  firstLetter: string;
  score: number;
  phoneticScore: number;
  meaningScore: number;
  styleScore: number;
  popularityScore: number;
  lengthScore: number;
  tags: string[];
  adaptationNote: string;
  recommendedFullName?: string;
  surnameEnglish?: string;
  surnameChina?: string;
  surnameOverseas?: string;
  /** 来源：'db' 来自英文名数据库 / 'ai' 来自 DeepSeek AI 生成 */
  source: "db" | "ai";
}

// ===== 音节计数工具 =====

/**
 * 估算英文名的音节数量（基于元音分组法）
 * 用于单字名→单音节、二字名→双音节的预筛选
 * 
 * 规则：
 *  - 连续的元音字母算1个音节
 *  - 结尾的静默e不计入音节
 *  - y在末尾/中间作为元音处理
 */
function estimateSyllableCount(name: string): number {
  const lower = name.toLowerCase().replace(/[^a-z]/g, '');
  if (lower.length === 0) return 1;

  const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
  const yVowelEnding = lower.endsWith('y') && lower.length > 2;
  
  let count = 0;
  let prevIsVowel = false;
  
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    const isVowel = vowels.has(ch) || 
      (ch === 'y' && i > 0 && i < lower.length - 1) || // y in middle as vowel
      (ch === 'y' && i === lower.length - 1); // y at end as vowel
    
    if (isVowel) {
      if (!prevIsVowel) {
        count++;
      }
      prevIsVowel = true;
    } else {
      prevIsVowel = false;
    }
  }
  
  // 处理结尾静默e（如 "name", "kate" → 减去1个音节）
  // 但"the"、"be"等单音节短词保留
  if (lower.endsWith('e') && count > 1 && lower.length > 3) {
    // 检查是否是真的静默e（前面有辅音，且不是唯一元音）
    const secondLast = lower[lower.length - 2];
    if (!vowels.has(secondLast) && secondLast !== 'y') {
      count--;
    }
  }
  
  return Math.max(1, count);
}

function isMonosyllabic(name: string): boolean {
  return estimateSyllableCount(name) === 1;
}

function isDisyllabic(name: string): boolean {
  return estimateSyllableCount(name) === 2;
}

// ===== 发音匹配评分 =====

/**
 * 发音匹配评分
 */
function calcPhoneticScore(
  name: string,
  givenNamePinyin: string
): { score: number; detail: string; tags: string[] } {
  const tags: string[] = [];
  
  if (!givenNamePinyin) {
    return { score: 20, detail: "无法计算发音匹配", tags: [] };
  }
  
  const results = searchByPhoneticMatch(givenNamePinyin, [{ name, meaning: "", gender: "" }], 1);
  
  if (results.length > 0) {
    const matched = results[0];
    const score = matched.phoneticScore;
    
    if (score >= 85) {
      tags.push("发音完美贴合中文名");
    } else if (score >= 60) {
      tags.push("发音近似中文名");
    } else if (score >= 40) {
      tags.push("发音部分匹配中文名");
    } else {
      tags.push("发音弱相关");
    }
    
    return { score, detail: matched.phoneticDetail || "", tags };
  }
  
  return { score: 0, detail: "无匹配", tags: [] };
}

/**
 * 流行度评分
 */
function calcPopularityScore(popularity: string): number {
  switch (popularity) {
    case "★★★": return 90;
    case "★★": return 70;
    case "★": return 50;
    default: return 30;
  }
}

/**
 * 长度评分（权重20%）
 */
function calcLengthScore(name: string, preference?: "short" | "medium" | "long"): number {
  const len = name.length;
  if (!preference) return 50;
  switch (preference) {
    case "short": return len <= 4 ? 100 : len <= 5 ? 70 : len <= 6 ? 40 : 10;
    case "medium": return len === 5 || len === 6 ? 100 : len === 4 || len === 7 ? 70 : 30;
    case "long": return len >= 7 ? 100 : len >= 6 ? 70 : len >= 5 ? 40 : 10;
  }
}

// ===== 姓氏发音匹配评分（从150个姓氏表中匹配）=====

/**
 * 检查英文名候选的发音是否与姓氏的英文映射发音匹配
 * 例如：surname=张 → 英文表达 "Cheung", "Chang", "Zhang"
 * 候选名 "Chang" 匹配 → 高分
 * 候选名 "Chandler" 以 "Chan" 开头 → 中分
 */
function calcSurnameMatchScore(
  candidateName: string,
  surname: string,
  surnameEnglish?: string,
  surnameChina?: string
): { score: number; matchedExpression: string; detail: string } {
  if (!surname || !candidateName) {
    return { score: 0, matchedExpression: "", detail: "缺少姓氏或英文名" };
  }

  const enameLower = candidateName.trim().toLowerCase();
  const expressions = getSurnameEnglishExpressions(surname);

  if (expressions.length === 0) {
    // 未在150个姓氏表中找到，回退到拼音匹配
    const pinyinFallback = calcSurnamePinyinFallback(surname, candidateName);
    return pinyinFallback;
  }

  // ★★★ V6.5 姓氏在150映射表中 → 根据候选名是否匹配海外表达给分 ★★★
  // 规则：
  // - candidateName 恰好等于姓氏海外表达（如"Cheung"匹配"张→Cheung"）：100分
  // - candidateName 前缀匹配姓氏海外表达（如"Cheung-something"）：90-100分
  // - 姓氏有海外表达（如"张→Cheung"），但候选名不匹配：85分（标准映射分，表示姓氏来源权威）
  // - 姓氏只有大陆拼音（如"王→Wang"）：75分
  // 
  // 海外表达的最终加分在评分循环中通过 surnameBonus 额外处理，
  // 此处只反映姓氏映射本身的质量。
  let bestScore = 75;
  let bestExpr = expressions[0];
  let hasOverseas = false;

  // 判断是否有非拼音的海外表达
  for (const expr of expressions) {
    const exprLower = expr.toLowerCase();
    // 排除纯拼音表达（与surname拼音相同）
    const pinyinExpr = surnameEnglish?.toLowerCase() || surname?.toLowerCase();
    if (exprLower === pinyinExpr) continue;
    if (exprLower === surname?.toLowerCase()) continue;
    // 检查是否拼音变体（如 Zhang→Chan 是海外表达，Zhang→Zhang 是拼音）
    // 简单判断：如果表达式包含拼音的子串
    if (exprLower.includes(pinyinExpr) || pinyinExpr.includes(exprLower)) continue;
    hasOverseas = true;
    break;
  }

  // 候选名与姓氏表达的精确/前缀匹配检查
  let exactMatch = false;
  let prefixMatch = false;
  for (const expr of expressions) {
    const exprLower = expr.toLowerCase();
    if (enameLower === exprLower) {
      exactMatch = true;
      bestExpr = expr;
      break;
    }
    if (enameLower.startsWith(exprLower) && exprLower.length >= 2) {
      const ratio = exprLower.length / enameLower.length;
      if (ratio >= 0.5) {
        prefixMatch = true;
        bestExpr = expr;
      }
    }
  }

  if (exactMatch) {
    bestScore = 100;
    bestExpr = bestExpr || expressions[0];
    return {
      score: 100,
      matchedExpression: bestExpr,
      detail: `英文名"${candidateName}"与姓氏"${surname}"的英文表达"${bestExpr}"完全匹配`,
    };
  }

  if (prefixMatch) {
    bestScore = 95;
    bestExpr = bestExpr || expressions[0];
    return {
      score: 95,
      matchedExpression: bestExpr,
      detail: `英文名"${candidateName}"与姓氏"${surname}"的英文表达"${bestExpr}"前缀匹配`,
    };
  }

  // 无名匹配时的基础分：有海外表达85分，仅拼音75分
  bestScore = hasOverseas ? 85 : 75;
  bestExpr = expressions[0];

  return {
    score: bestScore,
    matchedExpression: bestExpr,
    detail: hasOverseas
      ? `姓氏「${surname}」有海外表达"${bestExpr}"（85分）`
      : `姓氏「${surname}」映射匹配，仅大陆拼音形式（75分）`,
  };
}

/**
 * 姓氏不在映射表时的拼音回退匹配
 */
function calcSurnamePinyinFallback(
  surname: string,
  candidateName: string
): { score: number; matchedExpression: string; detail: string } {
  const results = searchByPhoneticMatch(surname.toLowerCase(), [
    { name: candidateName, meaning: "", gender: "" },
  ], 1);
  
  if (results.length > 0 && results[0].phoneticScore >= 40) {
    return {
      score: results[0].phoneticScore / 2,  // 折半，因为拼音匹配不如英文映射可靠
      matchedExpression: surname,
      detail: `姓氏拼音"${surname}"与英文名部分发音匹配（${results[0].phoneticScore}分）`,
    };
  }
  
  return { score: 0, matchedExpression: "", detail: "姓氏拼音无匹配" };
}

// ===== AI提示词构造 =====

/**
 * 构建DeepSeek提示词（完整结构化版本）
 */
function buildAIPrompt(
  fullName: string,
  gender: "male" | "female",
  surname: string,
  needs: string[],
  avoidFlags: string[],
  lengthPreference?: "short" | "medium" | "long"
): string {
  const genderLabel = gender === "male" ? "男" : "女";
  const needsText = needs.length > 0 ? needs.join("、") : "无特殊要求";
  const avoidText = avoidFlags.length > 0 ? avoidFlags.join("、") : "无";
  const lengthText = lengthPreference
    ? { short: "短名（4字母以内）", medium: "适中（5-6字母）", long: "长名（7字母以上）" }[lengthPreference]
    : "无偏好";

  return `您是一位熟悉中英文化的姓名学大师，我将赴英美地区工作和学习，请为我起一个英文名。
具体要求为：
中文姓名 ${fullName}，${genderLabel}，及客户在网站上的所有起名要求勾选项。
'姓氏+姓名'发音接近中文发音，避免英文有负面含义，容易拼写，发音符合英文发音规则。
请返回10个候选英文名。

补充信息：
- 姓氏：${surname}
- 核心需求：${needsText}
- 避免项：${avoidText}
- 名字长度偏好：${lengthText}

请返回 JSON 数组格式：
[
  {"name": "候选名1", "meaning": "含义说明（30-80字中文）"},
  {"name": "候选名2", "meaning": "含义说明（30-80字中文）"},
  ...
]

注意：只返回合法 JSON 数组，不要 markdown 代码块包裹。`;
}

// ===== 综合起名引擎 =====

/**
 * 获取姓氏的推荐英文表达（优先使用SURNAME_ENGLISH_MAP中的海外表达）
 * 
 * V4.2：优先使用 SURNAME_ENGLISH_MAP（如"张→Cheung"），
 * 回退到 getRecommendedSurnameSpellings（如"张→Zhang"）
 */
function getSurnameEnglish(surname: string): string {
  // 1. 优先使用 SURNAME_ENGLISH_MAP 中的海外表达
  const expressions = getSurnameEnglishExpressions(surname);
  if (expressions.length > 0) {
    return expressions[0];
  }
  
  // 2. 回退到 getRecommendedSurnameSpellings
  const spellings = getRecommendedSurnameSpellings(surname);
  if (spellings.length > 0) {
    return spellings[0];
  }
  
  // 3. 最终回退：姓氏首字母大写
  return surname.charAt(0).toUpperCase();
}

/**
 * 获取姓氏的大陆/海外拼写（海外优先使用SURNAME_ENGLISH_MAP）
 * 
 * V4.2：surnameOverseas 优先使用 SURNAME_ENGLISH_MAP 中的表达
 * （如"张"的 overseas 从原来的"Chang"改为"Cheung"）
 */
function getEnhancedSurnameChinaOverseas(surname: string): { china: string; overseas: string } {
  const base = getSurnameChinaOverseas(surname);
  
  // 覆盖 overseas：优先使用 SURNAME_ENGLISH_MAP 中的表达
  const expressions = getSurnameEnglishExpressions(surname);
  if (expressions.length > 0) {
    return {
      china: base.china,
      overseas: expressions[0],
    };
  }
  
  return base;
}

export async function generateEnglishNames(
  request: EnameGenerateRequest
): Promise<{ success: boolean; data: EnameScoredResult[]; totalCandidates: number; message?: string }> {
  const { gender, surname, fullName, needs = [], avoidFlags = [], lengthPreference, count = 10 } = request;

  try {
    const allNames = getAllRecords();
    const genderCn = gender === "male" ? "男性" : "女性";
    let candidates = allNames.filter((r) => r.gender === genderCn || r.gender === "中性");

    if (candidates.length === 0) {
      return { success: false, data: [], totalCandidates: 0, message: "没有找到匹配性别的英文名" };
    }

    // 解析中文名拼音
    const nameForPhonetic = fullName || surname;
    const pinyinInfo = getChineseNamePinyin(nameForPhonetic);
    const searchPinyin = pinyinInfo.givenName || pinyinInfo.fullPinyin;

    // 分割全名获取名字部分（去除姓氏后的部分）
    let givenName = "";
    if (fullName && fullName.length > 0) {
      givenName = fullName.startsWith(surname) ? fullName.slice(surname.length) : fullName;
    }

    // ===== ★★★ V4.1 新增：按中文字数预筛选音节匹配 ★★★ =====
    // 单字名（如"伟"）→ 只保留单音节英文名
    // 二字名（如"伟杰"）→ 只保留双音节英文名
    // 未知/其他 → 不过滤
    
    let syllableFilterLabel = "";
    const givenNameCharCount = givenName.replace(/\s/g, '').length;
    
    if (givenNameCharCount === 1) {
      // 单字名 → 单音节匹配
      const monosyllabicNames = candidates.filter(r => isMonosyllabic(r.name));
      if (monosyllabicNames.length >= 10) {
        candidates = monosyllabicNames;
        syllableFilterLabel = "单音节";
        console.log(`[ename-generator] 单字名，已筛选为单音节英文名候选：${candidates.length} 个`);
      } else {
        console.log(`[ename-generator] 单字名但单音节候选不足(${monosyllabicNames.length}个)，保留全部候选`);
        syllableFilterLabel = "单音节(候选不足，回退全部)";
      }
    } else if (givenNameCharCount === 2) {
      // 二字名 → 双音节匹配
      const disyllabicNames = candidates.filter(r => isDisyllabic(r.name));
      if (disyllabicNames.length >= 10) {
        candidates = disyllabicNames;
        syllableFilterLabel = "双音节";
        console.log(`[ename-generator] 二字名，已筛选为双音节英文名候选：${candidates.length} 个`);
      } else {
        console.log(`[ename-generator] 二字名但双音节候选不足(${disyllabicNames.length}个)，保留全部候选`);
        syllableFilterLabel = "双音节(候选不足，回退全部)";
      }
    } else {
      console.log(`[ename-generator] 名字字符数=${givenNameCharCount}，不进行音节预筛选`);
    }

    // ===== 1. 姓氏发音匹配优先 =====
    // 获取姓氏的英文表达，尝试在数据库中优先匹配
    const surnameExpressions = getSurnameEnglishExpressions(surname);
    let surnameMatchedNames: Array<{ name: string; score: number; expr: string }> = [];

    if (surnameExpressions.length > 0) {
      for (const record of candidates) {
        const enameLower = record.name.toLowerCase();
        for (const expr of surnameExpressions) {
          const exprLower = expr.toLowerCase();
          // 完全匹配
          if (enameLower === exprLower) {
            surnameMatchedNames.push({ name: record.name, score: 100, expr });
            break;
          }
          // 前缀匹配（单词级别）
          if (enameLower.startsWith(exprLower + " ") || enameLower.startsWith(exprLower + "-")) {
            surnameMatchedNames.push({ name: record.name, score: 85, expr });
            break;
          }
        }
      }
    }

    // ===== 2. 名字发音匹配 =====
    let phoneticMatchedNames: Array<{ name: string; meaning?: string; gender?: string; phoneticScore: number; phoneticDetail: string }> = [];
    
    if (pinyinInfo.givenName) {
      try {
        const namesForMatch = candidates.map(r => ({ 
          name: r.name, 
          meaning: r.meaning, 
          gender: r.gender 
        }));
        
        // ★★★ 此时 candidates 已经过音节预筛选（单字名→单音节，二字名→双音节）★★★
        // searchByPhoneticMatch 内部使用 universalMatch 进行拼音发音匹配
        phoneticMatchedNames = searchByPhoneticMatch(
          searchPinyin, 
          namesForMatch, 
          100  // 拉取足够多的候选
        );
      } catch (error) {
        console.error("[ename-generator] 拼音发音匹配失败:", error);
      }
    }

    // 创建拼音匹配得分查找表
    const phoneticMatchMap = new Map<string, number>();
    for (const pm of phoneticMatchedNames) {
      phoneticMatchMap.set(pm.name.toLowerCase(), pm.phoneticScore);
    }

    // 创建姓氏匹配得分查找表
    const surnameMatchMap = new Map<string, number>();
    for (const sm of surnameMatchedNames) {
      surnameMatchMap.set(sm.name.toLowerCase(), sm.score);
    }

    // ===== ★★★ V4.2 姓氏英文表达优化 ★★★ =====
    // 优先使用 SURNAME_ENGLISH_MAP 中的海外表达（如"张→Cheung"而非"Zhang"）
    const surnameEnglish = getSurnameEnglish(surname);
    
    // 姓氏大陆/海外拼写（overseas 优先使用 SURNAME_ENGLISH_MAP）
    const { china: surnameChina, overseas: surnameOverseas } = getEnhancedSurnameChinaOverseas(surname);

    // ===== 3. 数据库候选名综合评分 =====
    let scoredDbResults: EnameScoredResult[] = [];

    for (const record of candidates) {
      // 硬黑名单拦截
      if (isHardBlocked(record.name)) {
        continue;
      }

      // 发音评分（使用拼音匹配引擎）
      const phoneticResult = calcPhoneticScore(record.name, pinyinInfo.givenName);
      
      // 只保留有发音匹配的
      if (phoneticResult.score === 0) {
        continue;
      }

      // 发音硬性门槛：低于40分直接排除
      if (phoneticResult.score < 40) {
        continue;
      }

      // 姓氏发音匹配得分
      const surnameMatchResult = calcSurnameMatchScore(record.name, surname);
      const surnameScore = surnameMatchResult.score;

      // 流行度 + 长度评分
      const popularityScore = calcPopularityScore(record.popularity);
      const lengthScore = calcLengthScore(record.name, lengthPreference);

      // ★★★ V4.0 新评分公式 ★★★
      // 核心需求80%权重：每个选中的需求均匀分配(80/needs.length)%
      // 长度偏好 = 20%
      
      // 逐项需求评分（0-100）
      const needScores = needs.length > 0
        ? needs.map(n => calcSingleNeedScore(record, n, phoneticResult.score, surnameScore, popularityScore))
        : [calcDefaultNeedScore(phoneticResult.score, surnameScore)];
      
      // 需求平均分(0-100)：每个需求等权
      const avgNeedScore = needScores.reduce((a, b) => a + b, 0) / needScores.length;
      
      // 避坑规则检查（每个避坑项-10，最多-40）
      const avoidCheck = checkAvoidRules(record.name, record.popularity, avoidFlags);
      const avoidPenalty = Math.min(avoidCheck.reasons.length * 10, 40);
      let finalCoreScore = Math.max(0, Math.min(100, Math.round(avgNeedScore) - avoidPenalty));

      // 黑名单软惩罚
      const { penalty: blacklistPenalty, reason: blacklistReason } = getBlacklistPenalty(record.name);
      finalCoreScore = Math.max(0, finalCoreScore - Math.round(blacklistPenalty * 0.3));

      // ★★★ V4.2 姓氏海外表达加分：若推荐全名使用了海外表达（如"Cheung"而非"Zhang"） ★★★
      // surnameOverseas 优先使用 SURNAME_ENGLISH_MAP（已由getEnhancedSurnameChinaOverseas保证）
      // 如果 surnameOverseas !== surnameChina，说明推荐全名用了海外表达，+10分
      const surnameBonus = (surnameOverseas !== surnameChina) ? 10 : 0;

      // ★★★ 综合评分：核心需求80% + 长度偏好20% + 姓氏海外表达加分 ★★★
      const finalScore = Math.round(
        finalCoreScore * 0.80 + 
        lengthScore * 0.20 +
        surnameBonus
      );

      const tags: string[] = [];
      tags.push(...phoneticResult.tags);
      if (surnameScore >= 60) {
        tags.push(`姓氏「${surname}」发音匹配`);
      }
      if (syllableFilterLabel) {
        tags.push(`音节匹配「${syllableFilterLabel}」`);
      }
      if (lengthScore >= 80) {
        const lenDesc = lengthPreference === "short" ? "短名" : lengthPreference === "long" ? "长名" : "适名";
        tags.push(`长度偏好「${lenDesc}」`);
      }
      if (popularityScore >= 70) tags.push("较流行");
      else if (popularityScore <= 30) tags.push("小众");
      if (avoidCheck.reasons.length > 0) tags.push(...avoidCheck.reasons.map((r) => `⚠️${r}`));
      if (blacklistReason) tags.push(`⚠️${blacklistReason}`);
      tags.push("📚 英文名库");

      // 生成推荐全名 ★★★ V4.2 使用海外表达（如"Cheung"）★★★
      const recommendedFullName = `${record.name} ${surnameEnglish}`;
      let adaptationNote = `你的${gender === "male" ? "姓氏" : "姓名"}「${surname}」`;
      if (givenName) adaptationNote += `${givenName}`;
      adaptationNote += `，推荐「${record.name}」`;
      if (phoneticResult.score >= 60) adaptationNote += `，发音与中文名相近`;
      if (surnameMatchResult.score >= 60) adaptationNote += `，且与姓氏英文表达「${surnameMatchResult.matchedExpression}」发音匹配`;
      adaptationNote += `。姓氏「${surname}」推荐英文变体「${surnameEnglish}」`;

      scoredDbResults.push({
        name: record.name,
        gender: record.gender,
        phonetic: record.phonetic,
        chinese: record.chinese,
        origin: record.origin,
        popularity: record.popularity,
        meaning: record.meaning,
        firstLetter: record.firstLetter,
        score: finalScore,
        phoneticScore: phoneticResult.score,
        meaningScore: 0,
        styleScore: 0,
        popularityScore,
        lengthScore,
        tags: Array.from(new Set(tags)),
        adaptationNote,
        recommendedFullName,
        surnameEnglish,
        surnameChina,
        surnameOverseas,
        source: "db",
      });
    }

    // 排序：综合分优先，同分时拼音匹配度高的排前面
    scoredDbResults.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.phoneticScore - a.phoneticScore;
    });

    // ★★★ DB候选最多取前10个，与AI的10个合计不超过20 ★★★
    const DB_MAX = 10;
    scoredDbResults = scoredDbResults.slice(0, DB_MAX);
    console.log(`[ename-generator] DB候选: ${scoredDbResults.length} 个 (限${DB_MAX})`);

    // ===== 4. DeepSeek AI 生成 =====
    // 无论数据库结果数量多少，都调用AI生成并与之合并
    let aiGeneratedResults: EnameScoredResult[] = [];
    const fullNameStr = fullName || `${surname}${pinyinInfo.givenName || ""}`;
    
    try {
      console.log(`[ename-generator] 调用 DeepSeek AI 生成英文名候选`);
      
      // 构建结构化提示词并调用DeepSeek
      const aiPrompt = buildAIPrompt(
        fullNameStr,
        gender,
        surname,
        needs,
        avoidFlags,
        lengthPreference
      );
      const aiNames = await generateEnglishNamesByPrompt(
        aiPrompt,
        10  // 要求AI返回10个候选
      );
      
      // 对AI结果评分
      aiGeneratedResults = aiNames.map((item) => {
        // AI结果先做发音匹配评分
        const phonResult = calcPhoneticScore(item.name, pinyinInfo.givenName);
        
        // 姓氏匹配评分
        const surResult = calcSurnameMatchScore(item.name, surname);
        
        // 避坑检查
        const avoidCheckAI = checkAvoidRules(item.name, "★★", avoidFlags);
        const avoidPenaltyAI = avoidCheckAI.reasons.length * 10;
        
        // 黑名单检查
        const { penalty: bp, reason: br } = getBlacklistPenalty(item.name);
        
        // 长度评分
        const lenScore = calcLengthScore(item.name, lengthPreference);
        
        // AI结果也使用需求细分评分（与DB评分体系一致）
        const aiNeedScores = needs.length > 0
          ? needs.map(n => calcSingleNeedScore(
              item as any, 
              n,
              phonResult.score > 0 ? phonResult.score : 70,
              surResult.score > 0 ? surResult.score : 30,
              50  // AI默认流行度
            ))
          : [Math.round(
              (phonResult.score > 0 ? phonResult.score : 70) * 0.70 +
              (surResult.score > 0 ? surResult.score : 30) * 0.30
            )];
        const aiAvgNeedScore = aiNeedScores.reduce((a, b) => a + b, 0) / aiNeedScores.length;
        let coreScoreAI = Math.round(aiAvgNeedScore);
        coreScoreAI = Math.max(0, coreScoreAI - avoidPenaltyAI);
        coreScoreAI = Math.max(0, coreScoreAI - Math.round(bp * 0.3));
        
        // ★★★ V4.2 姓氏海外表达加分 ★★★
        const surnameBonusAI = (surnameOverseas !== surnameChina) ? 10 : 0;

        // 综合评分：核心需求80% + 长度偏好20% + 姓氏海外表达加分
        const finalScoreAI = Math.round(
          coreScoreAI * 0.80 + 
          lenScore * 0.20 +
          surnameBonusAI
        );
        
        const tags: string[] = ["🤖 AI 智能推荐"];
        tags.push(...phonResult.tags);
        if (surResult.score >= 60) {
          tags.push(`姓氏「${surname}」发音匹配`);
        }
        if (avoidCheckAI.reasons.length > 0) tags.push(...avoidCheckAI.reasons.map((r) => `⚠️${r}`));
        if (br) tags.push(`⚠️${br}`);

        return {
          name: item.name,
          gender: gender === "male" ? "男性" : "女性",
          phonetic: "",
          chinese: item.name,
          origin: "AI生成",
          popularity: "无",
          meaning: item.meaning || `发音接近中文名「${fullNameStr}」`,
          firstLetter: item.name[0]?.toUpperCase() || "",
          score: finalScoreAI,
          phoneticScore: phonResult.score || 70,
          meaningScore: 0,
          styleScore: 0,
          popularityScore: 50,
          lengthScore: lenScore,
          tags,
          adaptationNote: `中文名「${fullNameStr}」，AI 推荐「${item.name}」`,
          recommendedFullName: `${item.name} ${surnameEnglish}`,
          surnameEnglish,
          surnameChina,
          surnameOverseas,
          source: "ai",
        };
      });
      
      console.log(`[ename-generator] DeepSeek AI 生成了 ${aiGeneratedResults.length} 个候选`);
    } catch (error) {
      console.error("[ename-generator] DeepSeek AI 生成失败:", error);
    }

    // ===== 5. 合并结果：去重打分排序 =====
    const seenNames = new Set<string>();
    const mergedResults: EnameScoredResult[] = [];

    // DB结果优先加入
    for (const item of scoredDbResults) {
      const key = item.name.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        mergedResults.push(item);
      }
    }

    // AI结果补充（去重）
    for (const item of aiGeneratedResults) {
      const key = item.name.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        mergedResults.push(item);
      }
    }

    // 最终排序：综合分降序
    mergedResults.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // 同分时DB优先
      if (a.source !== b.source) return a.source === "db" ? -1 : 1;
      return b.phoneticScore - a.phoneticScore;
    });

    // ★★★ 始终取前6个返回给前端 ★★★
    const FINAL_COUNT = 6;
    const topResults = mergedResults.slice(0, FINAL_COUNT);

    return { 
      success: true, 
      data: topResults, 
      totalCandidates: mergedResults.length 
    };
  } catch (error) {
    console.error("[ename-generator] 生成英文名失败:", error);
    return { 
      success: false, 
      data: [], 
      totalCandidates: 0, 
      message: `生成失败: ${error instanceof Error ? error.message : "未知错误"}` 
    };
  }
}

/**
 * 计算单项需求评分（核心需求细分到每个选项）
 * 
 * 需求列表中的每个选项单独评分（0-100）：
 * - "谐音贴近中文名" → 由发音匹配分数决定
 * - "含义美好" → 由含义描述决定
 * - "商务正式" → 由名字正式感决定
 * - "简约好记" → 由长度+字母数决定
 * - "文艺小众" → 由流行度决定
 * - "可爱灵动" → 由长度+含义决定
 */
function calcSingleNeedScore(
  record: { name: string; meaning: string; popularity: string; origin: string },
  need: string,
  phoneticScore: number,
  surnameScore: number,
  popularityScore: number
): number {
  const name = record.name;
  const meaning = record.meaning?.toLowerCase() || "";
  const len = name.length;

  switch (need) {
    case "谐音贴近中文名":
      // 发音匹配80% + 姓氏匹配20%
      return Math.round(phoneticScore * 0.80 + surnameScore * 0.20);

    case "含义美好":
      // 有含义的+分，含义中包含正面词加分
      let goodScore = 50;
      if (record.meaning && record.meaning.length > 0) {
        goodScore += 20;
        const goodWords = ["light", "hope", "kind", " wise", "bright", "joy", "peace", "grace",
          "love", "faith", "noble", "pure", "gentle", "brave", "free", "true"];
        for (const w of goodWords) {
          if (meaning.includes(w)) {
            goodScore += 10;
            break;
          }
        }
      }
      return Math.min(100, goodScore);

    case "商务正式":
      // 正式名（长名多正式）: 5-8字母最佳，避免儿化昵称形式
      if (len >= 5 && len <= 8) return 90;
      if (len >= 4 && len <= 9) return 70;
      if (len <= 3) return 30; // 短名不够正式
      return 50;

    case "简约好记":
      // 3-5字母最佳
      if (len <= 4) return 90;
      if (len <= 5) return 80;
      if (len <= 6) return 50;
      return 20;

    case "文艺小众":
      // 流行度低的+分
      return Math.min(100, 100 - popularityScore + 20);

    case "可爱灵动":
      // 短名(3-4字母) + 含义中有可爱词
      let cuteScore = len <= 4 ? 80 : len <= 5 ? 60 : 30;
      const cuteWords = ["flower", "star", "spring", "sweet", "song", "dawn",
        "fairy", "bloom", "sunny", "merry"];
      for (const w of cuteWords) {
        if (meaning.includes(w)) {
          cuteScore += 20;
          break;
        }
      }
      return Math.min(100, cuteScore);

    default:
      // 未识别的需求：由发音匹配70% + 姓氏匹配30%
      return Math.round(phoneticScore * 0.70 + surnameScore * 0.30);
  }
}

/**
 * 无需求选择时的默认核心需求评分
 * 发音匹配70% + 姓氏匹配30%
 */
function calcDefaultNeedScore(phoneticScore: number, surnameScore: number): number {
  if (phoneticScore === 0 && surnameScore === 0) return 50;
  return Math.round(phoneticScore * 0.70 + surnameScore * 0.30);
}

/**
 * 避坑规则检查
 */
function checkAvoidRules(name: string, popularity: string, avoidFlags?: string[]): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!avoidFlags || avoidFlags.length === 0) return { passed: true, reasons };

  for (const flag of avoidFlags) {
    switch (flag) {
      case "不要太常见的爆款名":
        if (popularity === "★★★") reasons.push("此名流行度高，属于常见爆款名");
        break;
      case "不要生僻难读的":
        if (name.length > 8) reasons.push("名字过长（超过8字母），可能难读");
        break;
    }
  }

  return { passed: reasons.length === 0, reasons };
}