/**
 * 英文起名引擎 v3.0
 * 
 * === 架构变更说明 ===
 * ★ 移除语义向量搜索（OVHCloud BGE-M3 + pgvector）
 *   原因：中文名和英文名无法做含义上的语义匹配，向量搜索无实际意义
 * ★ 纯发音匹配架构：
 *   1. 姓氏发音匹配 → 150个中英文姓氏映射表（ename-surname-map）
 *   2. 名字发音匹配 → 2200+英文名库（ename-phonetic）+ ename-dict
 *      - 单字名：单音节拼音匹配单音节英文名
 *      - 二字名：整体双音节匹配双音节英文名
 * ★ DeepSeek AI 降级：
 *   当搜索不到发音接近的英文名时，调用 DeepSeek 生成
 *   提示词模板："请为男生/女生,姓名XXX，起一个发音接近的英文名"
 */

import { getAllRecords, type EnameRecord } from "./ename-dict";
import { 
  getChineseNamePinyin, 
  searchByPhoneticMatch,
  calcSurnameEnglishMatchScore,
} from "./ename-phonetic";
import { getRecommendedSurnameSpellings, getSurnameChinaOverseas } from "./ename-surname-map";
import { isHardBlocked, getBlacklistPenalty } from "./ename-blacklist";
import { generateEnglishNameBatchByDeepSeek } from "./deepseek-client";

// ===== 类型定义 =====

export interface EnameGenerateRequest {
  gender: "male" | "female";
  surname: string;
  fullName?: string;
  needs?: string[];
  style?: string;
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

// ===== 评分器 =====

/**
 * 纯发音匹配评分
 * 核心：只根据中文名拼音和英文名的发音匹配度评分
 * 不再使用语义/含义搜索
 */
function calcPhoneticScore(
  name: string,
  givenNamePinyin: string
): { score: number; detail: string; tags: string[] } {
  const tags: string[] = [];
  
  if (!givenNamePinyin) {
    return { score: 20, detail: "无法计算发音匹配", tags: [] };
  }
  
  // 使用拼音引擎搜索发音匹配的英文名
  // 模拟搜索：对单个名字做发音匹配评估
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
 * 长度评分
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

// ===== 综合起名引擎 =====

export async function generateEnglishNames(
  request: EnameGenerateRequest
): Promise<{ success: boolean; data: EnameScoredResult[]; totalCandidates: number; message?: string }> {
  const { gender, surname, fullName, needs = [], style, avoidFlags = [], lengthPreference, count = 10 } = request;

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
    
    // ★★★ V3.0 核心：只使用名字拼音进行发音搜索，排除姓氏 ★★★
    const searchPinyin = pinyinInfo.givenName || pinyinInfo.fullPinyin;

    // ===== 发音匹配搜索（唯一匹配方式） =====
    let phoneticMatchedNames: Array<{ name: string; meaning?: string; gender?: string; phoneticScore: number; phoneticDetail: string }> = [];
    
    if (pinyinInfo.givenName) {
      try {
        const namesForMatch = candidates.map(r => ({ 
          name: r.name, 
          meaning: r.meaning, 
          gender: r.gender 
        }));
        
        // ★★★ V3.0 纯发音匹配 ★★★
        // 单字名：作为单音节匹配
        // 二字名：作为整体双音节匹配
        // searchByPhoneticMatch 内部已处理好单/双音节逻辑
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

    // ===== 姓氏英文变体 =====
    const surnameSpellings = getRecommendedSurnameSpellings(surname);
    const surnameEnglish = surnameSpellings.length > 0 ? 
      surnameSpellings[0] : 
      surname.charAt(0).toUpperCase();

    // 分割全名
    let givenName = "";
    if (fullName && fullName.length > 0) {
      givenName = fullName.startsWith(surname) ? fullName.slice(surname.length) : fullName;
    }

    // ===== 数据库候选名评分 =====
    const scoredDbResults: EnameScoredResult[] = [];

    for (const record of candidates) {
      // 硬黑名单拦截
      if (isHardBlocked(record.name)) {
        continue;
      }

      // 发音评分（使用拼音匹配引擎）
      const phoneticResult = calcPhoneticScore(record.name, pinyinInfo.givenName);
      
      // 只保留有发音匹配的（phoneticScore > 0）
      if (phoneticResult.score === 0) {
        continue;
      }

      // 流行度 + 长度评分
      const popularityScore = calcPopularityScore(record.popularity);
      const lengthScore = calcLengthScore(record.name, lengthPreference);
      
      // 姓氏英文发音匹配加分
      const surnameEngMatch = calcSurnameEnglishMatchScore(record.name, surname);
      const surnameBonus = Math.round(surnameEngMatch.score * 0.10);

      // ★★★ V3.0 纯发音匹配综合评分公式 ★★★
      // 权重分配：发音80% + 姓氏发音匹配10% + 流行度5% + 长度5%
      // 去掉了含义(meaningScore)、风格(styleScore)、语义加分(semanticBonus)
      // 因为对于英文起名，发音匹配是唯一有意义的标准
      let totalScore = Math.round(
        phoneticResult.score * 0.80 + 
        popularityScore * 0.05 + 
        lengthScore * 0.05 + 
        surnameBonus * 10  // surnameBonus已经是0-10范围
      );

      // 发音硬性门槛：低于40分直接排除
      if (phoneticResult.score < 40) {
        continue;
      }

      // 避坑规则检查
      const avoidCheck = checkAvoidRules(record.name, record.popularity, avoidFlags);
      const avoidPenalty = avoidCheck.reasons.length * 10;
      let finalScore = Math.max(0, Math.min(100, totalScore - avoidPenalty));

      // 黑名单软惩罚
      const { penalty: blacklistPenalty, reason: blacklistReason } = getBlacklistPenalty(record.name);
      finalScore = Math.max(0, finalScore - Math.round(blacklistPenalty * 0.3));

      const tags: string[] = [];
      tags.push(...phoneticResult.tags);
      if (lengthScore >= 80) {
        const lenDesc = lengthPreference === "short" ? "短名" : lengthPreference === "long" ? "长名" : "适名";
        tags.push(`长度偏好「${lenDesc}」`);
      }
      if (popularityScore >= 70) tags.push("较流行");
      else if (popularityScore <= 30) tags.push("小众");
      if (avoidCheck.reasons.length > 0) tags.push(...avoidCheck.reasons.map((r) => `⚠️${r}`));
      if (blacklistReason) tags.push(`⚠️${blacklistReason}`);
      tags.push("📚 英文名库");  // 标记来源

      // 姓氏中外拼写
      const { china: surnameChina, overseas: surnameOverseas } = getSurnameChinaOverseas(surname);

      // 生成推荐全名
      const recommendedFullName = `${record.name} ${surnameEnglish}`;
      let adaptationNote = `你的${gender === "male" ? "姓氏" : "姓名"}「${surname}」`;
      if (givenName) adaptationNote += `${givenName}`;
      adaptationNote += `，推荐「${record.name}」`;
      if (phoneticResult.score >= 60) adaptationNote += `，发音与中文名相近`;
      if (surnameSpellings.length > 0) {
        adaptationNote += `。姓氏「${surname}」推荐英文变体「${surnameEnglish}」`;
      }

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

    // ===== DeepSeek AI 降级机制 =====
    // 当数据库发音匹配结果不足 count 个时，调用 DeepSeek 补充
    let aiGeneratedResults: EnameScoredResult[] = [];
    const dbResultCount = scoredDbResults.length;
    
    if (dbResultCount < count && pinyinInfo.givenName) {
      const aiNeeded = Math.max(count - dbResultCount, 3);  // 至少取3个
      const fullNameStr = fullName || `${surname}${pinyinInfo.givenName || ""}`;
      
      console.log(`[ename-generator] 数据库发音匹配不足(${dbResultCount}), 调用 DeepSeek AI 生成 ${aiNeeded} 个`);
      
      try {
        const aiNames = await generateEnglishNameBatchByDeepSeek(
          gender,
          pinyinInfo.givenName,
          fullNameStr,
          aiNeeded
        );
        
        aiGeneratedResults = aiNames.map((item, index) => {
          const score = Math.max(80 - index * 5, 70);  // AI 生成的名字给 70-80 分基础分
          
          return {
            name: item.name,
            gender: gender === "male" ? "男性" : "女性",
            phonetic: "",
            chinese: item.name,
            origin: "AI生成",
            popularity: "无",
            meaning: item.meaning || `发音接近中文名「${fullNameStr}」`,
            firstLetter: item.name[0]?.toUpperCase() || "",
            score,
            phoneticScore: 80 - index * 5,  // AI 生成名字假设高发音匹配
            meaningScore: 0,
            styleScore: 0,
            popularityScore: 50,
            lengthScore: 50,
            tags: ["🤖 AI 智能推荐", `发音接近「${pinyinInfo.givenName}」`],
            adaptationNote: `中文名「${fullNameStr}」，AI 推荐「${item.name}」`,
            recommendedFullName: `${item.name} ${surnameEnglish}`,
            surnameEnglish,
            surnameChina: getSurnameChinaOverseas(surname).china,
            surnameOverseas: getSurnameChinaOverseas(surname).overseas,
            source: "ai",
          };
        });
        
        console.log(`[ename-generator] DeepSeek AI 生成了 ${aiGeneratedResults.length} 个额外候选`);
      } catch (error) {
        console.error("[ename-generator] DeepSeek AI 生成失败:", error);
      }
    }

    // ===== 合并结果：数据库结果优先 + AI 结果补充 =====
    const mergedResults = [...scoredDbResults, ...aiGeneratedResults];
    
    // 最终排序
    mergedResults.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // 同分时数据库结果优先
      if (a.source !== b.source) return a.source === "db" ? -1 : 1;
      return b.phoneticScore - a.phoneticScore;
    });

    const topResults = mergedResults.slice(0, Math.max(count, 20));

    return { 
      success: true, 
      data: topResults, 
      totalCandidates: scoredDbResults.length + aiGeneratedResults.length 
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