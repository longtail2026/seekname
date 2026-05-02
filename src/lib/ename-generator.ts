/**
 * 英文起名引擎 v2.0
 * 
 * 全新算法架构：
 * 1. 按【中文名拼音发音】匹配英文名（ename-phonetic）
 * 2. 按【姓氏】匹配英文姓氏变体（ename-surname-map）
 * 3. 组合输出：英文名（发音匹配）+ 英文姓氏变体 + 中文名
 * 4. 黑名单过滤 + 多维度评分排序
 */

import { getAllRecords, searchNames, type EnameRecord } from "./ename-dict";
import { semanticSearchEname, type EnameSemanticMatch } from "./semantic-ename-search";
import { 
  getChineseNamePinyin, 
  searchByPhoneticMatch, 
  matchPronunciation,
  universalMatch,
  quickInitialMatch,
  getSuggestedNamesByInitial,
  type PhoneticMatchResult 
} from "./ename-phonetic";
import { getRecommendedSurnameSpellings, getSurnamePinyin, getSurnameChinaOverseas } from "./ename-surname-map";
import { isHardBlocked, getBlacklistPenalty } from "./ename-blacklist";

// ===== 类型定义 =====

export interface EnameGenerateRequest {
  /** 必填：性别 male / female */
  gender: "male" | "female";
  /** 必填：中文姓氏 */
  surname: string;
  /** 可选：中文全名 */
  fullName?: string;
  /** 可选：核心起名需求 */
  needs?: string[];
  /** 可选：风格偏好 */
  style?: string;
  /** 可选：避坑要求 */
  avoidFlags?: string[];
  /** 可选：名字长度偏好 */
  lengthPreference?: "short" | "medium" | "long";
  /** 可选：返回数量 */
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
  /** 综合评分（0-100） */
  score: number;
  /** 发音匹配分数（0-100） */
  phoneticScore: number;
  /** 含义匹配分数（0-100） */
  meaningScore: number;
  /** 风格匹配分数（0-100） */
  styleScore: number;
  /** 流行度分数（0-100） */
  popularityScore: number;
  /** 长度分数（0-100） */
  lengthScore: number;
  /** 标签 */
  tags: string[];
  /** 个性化推荐说明 */
  adaptationNote: string;
  /** 推荐全名（英文名 + 英文姓氏变体） */
  recommendedFullName?: string;
  /** 姓氏英文变体 */
  surnameEnglish?: string;
  /** 中国大陆证件姓氏拼写（标准拼音，如 Zhang, Li, Wang） */
  surnameChina?: string;
  /** 海外交流姓氏拼写（粤拼/通用拼写，如 Chang, Lee, Wong） */
  surnameOverseas?: string;
}

// ===== 评分器 =====

/**
 * ★★★ V5.0 双轨发音评分：万能匹配法 + 原有逻辑 ★★★
 * 
 * 使用 universalMatch（首字声母优先的万能匹配法）评分，
 * 同时保留原有 matchPronunciation 作为备用。
 * 
 * 评分映射：
 *   universalMatch >= 0.9 → 95分（首字声母+韵母完美匹配）
 *   universalMatch >= 0.7 → 80分（首字声母匹配，韵母部分匹配）
 *   universalMatch >= 0.5 → 60分（首字声母匹配，韵母弱匹配）
 *   universalMatch >= 0.3 → 40分（仅有声母开头匹配）
 *   < 0.3 → 降级为原 matchPronunciation 评分
 */
function calcPhoneticScore(
  name: string,
  givenNamePinyin: string
): { score: number; detail: string; tags: string[] } {
  const tags: string[] = [];
  
  if (!givenNamePinyin) {
    return { score: 20, detail: "无法计算发音匹配", tags: [] };
  }
  
  // ★★★ V5.0 使用万能匹配法（首字声母优先）★★★
  const result = universalMatch(givenNamePinyin, name);
  
  // 快速首字声母匹配（用于标记用途）
  const quickResult = quickInitialMatch(givenNamePinyin, name);
  
  // V5.0 评分映射 — 首字声母匹配有更高的基础分
  if (result.score >= 0.9) {
    tags.push("发音完美贴合中文名");
    return { score: 95, detail: result.detail, tags };
  } else if (result.score >= 0.7) {
    if (quickResult.matchedInitial) {
      tags.push("首字声母匹配，发音近似中文名");
    } else {
      tags.push("发音近似中文名");
    }
    return { score: 80, detail: result.detail, tags };
  } else if (result.score >= 0.5) {
    tags.push("发音部分匹配中文名");
    return { score: 60, detail: result.detail, tags };
  } else if (result.score >= 0.3) {
    if (quickResult.matchedInitial) {
      tags.push("首字声母弱相关");
      return { score: 45, detail: result.detail, tags };
    }
    tags.push("发音弱相关");
    return { score: 30, detail: result.detail, tags };
  }
  
  // ★★★ V5.0 回退方案：如果万能匹配也没结果，使用建议名列表 ★★★
  const suggested = getSuggestedNamesByInitial(givenNamePinyin);
  if (suggested.length > 0 && suggested.some(s => s.toLowerCase() === name.toLowerCase())) {
    tags.push("来自声母推荐列表");
    return { score: 65, detail: `英文名"${name}"在声母推荐列表中`, tags };
  }
  
  return { score: 0, detail: result.detail, tags };
}

/**
 * 含义评分 - 匹配用户需求
 */
function calcMeaningScore(meaning: string, needs: string[], name?: string): { score: number; tags: string[] } {
  const tags: string[] = [];
  if (!needs || needs.length === 0 || !meaning) {
    return { score: 50, tags: ["含义信息不足，中评"] };
  }

  const meaningLower = meaning.toLowerCase();
  let matchCount = 0;
  const matchedNeeds: string[] = [];
  const nameStr = name || "";

  for (const need of needs) {
    let matched = false;
    switch (need) {
      case "谐音贴近中文名":
        matched = ["name", "sound", "phonetic", "derived from", "源自"].some(k => meaningLower.includes(k));
        break;
      case "含义美好":
        matched = ["blessing", "hope", "light", "peace", "health", "wise", "strength", "fortunate",
          "幸福", "平安", "健康", "美好", "希望", "光明", "智慧"].some(k => meaningLower.includes(k));
        break;
      case "平安":
        matched = ["peace", "safe", "calm", "serene", "tranquil", "平安", "安宁"].some(k => meaningLower.includes(k));
        break;
      case "健康":
        matched = ["health", "strong", "vigor", "vital", "well", "健康", "强壮"].some(k => meaningLower.includes(k));
        break;
      case "聪明":
        matched = ["wise", "wisdom", "intelligent", "bright", "clever", "smart", "聪明", "智慧"].some(k => meaningLower.includes(k));
        break;
      case "富贵":
        matched = ["wealth", "rich", "fortune", "prosper", "noble", "富贵", "财富"].some(k => meaningLower.includes(k));
        break;
      case "商务正式":
        matched = ["noble", "leader", "ruler", "king", "power", "strong", "dignity", "商务", "正式"].some(k => meaningLower.includes(k));
        break;
      case "简约好记":
        matched = nameStr.length >= 3 && nameStr.length <= 5;
        break;
      case "文艺小众":
        matched = ["poet", "muse", "lyric", "grace", "elegant", "art", "文艺", "优雅", "诗意"].some(k => meaningLower.includes(k));
        break;
      case "可爱灵动":
        matched = ["sweet", "joy", "happy", "love", "play", "bright", "merry", "可爱", "快乐", "甜蜜"].some(k => meaningLower.includes(k));
        break;
      default:
        matched = meaningLower.includes(need.toLowerCase());
    }

    if (matched) {
      matchCount++;
      matchedNeeds.push(need);
    }
  }

  if (matchCount === 0) {
    return { score: 30, tags: ["含义匹配度较低"] };
  }

  const score = Math.min(100, 30 + matchCount * 25);
  const uniqueNeeds = Array.from(new Set(matchedNeeds));
  tags.push(`含义匹配「${uniqueNeeds.join("、")}」`);

  return { score, tags };
}

/**
 * 风格评分
 */
function calcStyleScore(meaning: string, name: string, style?: string): { score: number; tags: string[] } {
  const tags: string[] = [];
  const meaningLower = (meaning || "").toLowerCase();

  if (!style) return { score: 50, tags: [] };

  let keywordCheck: (m: string, n: string) => boolean;

  switch (style) {
    case "现代简约":
      keywordCheck = (m, n) => n.length <= 5 && !m.includes("古") &&
        (["modern", "simple", "clean", "clear", "bright"].some(k => m.includes(k)));
      break;
    case "古典文艺":
      keywordCheck = (m, _n) =>
        ["classic", "ancient", "poet", "muse", "grace", "elegant", "classical", "old", "traditional", "希腊", "罗马", "圣经", "拉丁"].some(k => m.includes(k));
      break;
    case "商务精英":
      keywordCheck = (m, _n) =>
        ["ruler", "king", "leader", "power", "dignity", "noble", "strong", "authority", "executive", "enterprise"].some(k => m.includes(k));
      break;
    case "校园清新":
      keywordCheck = (m, _n) =>
        ["youth", "fresh", "pure", "gentle", "sweet", "spring", "flower", "nature", "natural", "garden", "meadow"].some(k => m.includes(k));
      break;
    case "可爱软萌":
      keywordCheck = (m, _n) =>
        ["sweet", "love", "joy", "cute", "little", "happy", "delight", "dear", "baby", "tender", "soft", "warm"].some(k => m.includes(k));
      break;
    case "小众独特":
      keywordCheck = (m, _n) =>
        ["unique", "rare", "uncommon", "unusual", "distinctive", "rarely", "seldom", "ancient", "mythical"].some(k => m.includes(k));
      break;
    default:
      keywordCheck = () => false;
  }

  const matched = keywordCheck(meaningLower, name.toLowerCase());
  const score = matched ? 80 : 40;
  if (matched) tags.push(`风格匹配「${style}」`);

  return { score, tags };
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

/**
 * 避坑规则检查
 */
function checkAvoidRules(name: string, meaning: string, popularity: string, avoidFlags?: string[]): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!avoidFlags || avoidFlags.length === 0) return { passed: true, reasons };

  const meaningLower = (meaning || "").toLowerCase();

  // 黑名单检查
  const blacklistCheck = getBlacklistPenalty(name);
  if (blacklistCheck.reason) {
    reasons.push(`黑名单：${blacklistCheck.reason}`);
  }

  for (const flag of avoidFlags) {
    switch (flag) {
      case "不要太常见的爆款名":
        if (popularity === "★★★") reasons.push("此名流行度高，属于常见爆款名");
        break;
      case "不要生僻难读的":
        if (name.length > 8) reasons.push("名字过长（超过8字母），可能难读");
        break;
      case "不要有负面谐音/含义":
        const negativeWords = ["death", "evil", "dark", "demon", "devil", "sorrow", "pain", "fear", "danger", "poison", "war", "blood", "凶", "死"];
        for (const word of negativeWords) {
          if (meaningLower.includes(word)) { reasons.push(`含义包含负面词汇「${word}」`); break; }
        }
        break;
    }
  }

  return { passed: reasons.length === 0, reasons };
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
    
    // ★★★ V4增强：当用户勾选"谐音贴近中文名"时，同时使用全名拼音（姓氏+名字）进行匹配 ★★★
    // 因为英文名通常以姓氏+名字形式展示，全名发音匹配更准确
    const hasPhoneticNeed = needs.includes("谐音贴近中文名");
    
    // 如果提供了全名且勾选了谐音选项，同时用全名拼音和名字拼音做匹配
    let fullNamePinyinInfo = pinyinInfo;
    if (fullName && hasPhoneticNeed) {
      fullNamePinyinInfo = getChineseNamePinyin(fullName);
    }
    
    // 语义搜索（包含中文名拼音发音信息）
    let semanticMatches: EnameSemanticMatch[] = [];
    try {
      // 语义搜索 query 必须包含中文名的拼音发音信息
      let semanticQuery = `适合${genderCn}的英文名字`;
      if (pinyinInfo.givenName) {
        semanticQuery += `，发音近似"${pinyinInfo.givenName}"，拼音为"${pinyinInfo.givenName}"`;
      }
      if (needs.length > 0) semanticQuery += `，含义${needs.join("、")}`;
      if (style) semanticQuery += `，${style}风格`;
      
      semanticMatches = await semanticSearchEname(semanticQuery, { 
        limit: 60, 
        threshold: 0.40,
        gender 
      });
    } catch (error) {
      console.error("[ename-generator] 语义搜索失败（不影响主流程）:", error);
    }

    // ===== 发音匹配搜索 =====
    // 使用拼音引擎搜索发音匹配的英文名
    let phoneticMatchedNames: Array<{ name: string; meaning?: string; gender?: string; phoneticScore: number; phoneticDetail: string }> = [];
    if (pinyinInfo.givenName) {
      try {
        const namesForMatch = candidates.map(r => ({ 
          name: r.name, 
          meaning: r.meaning, 
          gender: r.gender 
        }));
        
        // ★★★ V4增强：使用全名拼音（姓氏+名字）进行匹配搜索 ★★★
        // 对于"张国光"→"zhang guo guang"，全名匹配可以找到 Gordon (gor≈guo, don≈guang)
        const searchPinyin = hasPhoneticNeed && fullNamePinyinInfo.fullPinyin 
          ? fullNamePinyinInfo.fullPinyin 
          : pinyinInfo.givenName;
          
        phoneticMatchedNames = searchByPhoneticMatch(
          searchPinyin, 
          namesForMatch, 
          100
        );
      } catch (error) {
        console.error("[ename-generator] 拼音发音匹配失败（不影响主流程）:", error);
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

    // 候选池：优先从语义匹配和拼音匹配中取，不足时补充热门名
    let namePool: EnameRecord[];
    const semanticNameSet = new Set(semanticMatches.map((m) => m.name));
    const phoneticNameSet = new Set(phoneticMatchedNames.map((m) => m.name));
    
    // 同时出现在语义和拼音匹配中的优先
    const priorityNames = new Set<string>();
    for (const n of semanticNameSet) {
      if (phoneticNameSet.has(n)) priorityNames.add(n);
    }

    const priorityRecords = candidates.filter(r => priorityNames.has(r.name));
    const semanticOnly = candidates.filter(r => semanticNameSet.has(r.name) && !priorityNames.has(r.name));
    const phoneticOnly = candidates.filter(r => phoneticNameSet.has(r.name) && !priorityNames.has(r.name) && !semanticNameSet.has(r.name));
    
    // 补充最流行的候选名
    const usedNames = new Set([...priorityNames, ...semanticNameSet, ...phoneticNameSet]);
    const remaining = candidates.filter(r => !usedNames.has(r.name));
    const supplementCount = Math.max(0, 200 - (priorityRecords.length + semanticOnly.length + phoneticOnly.length));
    const supplemented = remaining
      .sort((a, b) => (b.popularity?.length || 0) - (a.popularity?.length || 0))
      .slice(0, supplementCount);

    namePool = [...priorityRecords, ...semanticOnly, ...phoneticOnly, ...supplemented];

    // 分割全名
    let givenName = "";
    if (fullName && fullName.length > 0) {
      givenName = fullName.startsWith(surname) ? fullName.slice(surname.length) : fullName;
    }

    const scoredResults: EnameScoredResult[] = [];

    for (const record of namePool) {
      // 硬黑名单拦截
      if (isHardBlocked(record.name)) {
        continue;
      }

      // 发音评分（使用拼音匹配引擎）
      const phoneticResult = calcPhoneticScore(record.name, pinyinInfo.givenName);
      
      // 含义匹配评分
      const { score: meaningScore, tags: meaningTags } = calcMeaningScore(record.meaning, needs, record.name);
      
      // 风格评分
      const { score: styleScore, tags: styleTags } = calcStyleScore(record.meaning, record.name, style);
      
      // 流行度 + 长度评分
      const popularityScore = calcPopularityScore(record.popularity);
      const lengthScore = calcLengthScore(record.name, lengthPreference);
      
      // 避坑规则
      const avoidCheck = checkAvoidRules(record.name, record.meaning, record.popularity, avoidFlags);

      // 语义搜索加分（仅作为小幅加成，不再超过发音权重）
      let semanticBonus = 0;
      if (semanticMatches.length > 0) {
        const sm = semanticMatches.find((m) => m.name.toLowerCase() === record.name.toLowerCase());
        if (sm) semanticBonus = Math.round(sm.similarity * 15);  // 减小到最高+15
      }
      
      // ★★★ 核心修复：发音匹配作为最重权重 ★★★
      // phoneticResult.score 直接来自 matchPronunciation 引擎（0-100），
      // 它比 semanticBonus 更可靠地反映"和中文名读音相似度"
      const effectivePhoneticScore = phoneticResult.score;

      // ★★★ V4.2 核心优化：当用户选择"谐音贴近中文名"时，发音匹配结果必须过硬 ★★★
      // 硬性过滤：如果勾选了"谐音贴近中文名"，phoneticScore < 60 的名字直接砍掉
      // V4.1 之前是60（太松，但那时评分映射太松，Diana/71分能通过）
      // V4.2 评分映射收紧后，60分及以上的结果是真正的合理匹配
      const hasPhoneticNeed = needs.includes("谐音贴近中文名");
      const isPhoneticPass = !hasPhoneticNeed || effectivePhoneticScore >= 60;
      
      // ★★★ 综合评分公式优化：以发音匹配为主导 ★★★
      // 权重分配：发音40% + 含义20% + 风格15% + 流行度10% + 长度10% + 语义加分5%
      // 这样发音匹配好的名字（如 li↔Elia/Eli）必定排在前面，
      // 不会出现"无发音匹配但语义"超高的名字排在前面的情况
      let totalScore = Math.round(
        effectivePhoneticScore * 0.40 + 
        meaningScore * 0.20 + 
        styleScore * 0.15 +
        popularityScore * 0.10 + 
        lengthScore * 0.10 + 
        semanticBonus
      );
      
      // 发音硬性过滤：不符合发音标准的名字直接打零分
      if (!isPhoneticPass) {
        totalScore = 0;
      }
      
      const avoidPenalty = avoidCheck.reasons.length * 10;
      let finalScore = Math.max(0, Math.min(100, totalScore - avoidPenalty));

      // 黑名单软惩罚
      const { penalty: blacklistPenalty, reason: blacklistReason } = getBlacklistPenalty(record.name);
      finalScore = Math.max(0, finalScore - Math.round(blacklistPenalty * 0.3));  // 软惩罚降权30%

      const tags: string[] = [];
      tags.push(...phoneticResult.tags.filter((t) => !t.includes("信息不足")));
      tags.push(...meaningTags);
      tags.push(...styleTags);
      if (lengthScore >= 80) {
        const lenDesc = lengthPreference === "short" ? "短名" : lengthPreference === "long" ? "长名" : "适名";
        tags.push(`长度偏好「${lenDesc}」`);
      }
      if (popularityScore >= 70) tags.push("较流行");
      else if (popularityScore <= 30) tags.push("小众");
      if (avoidCheck.reasons.length > 0) tags.push(...avoidCheck.reasons.map((r) => `⚠️${r}`));
      if (blacklistReason) tags.push(`⚠️${blacklistReason}`);

      // 姓氏中外拼写
      const { china: surnameChina, overseas: surnameOverseas } = getSurnameChinaOverseas(surname);

      // 生成推荐全名
      const recommendedFullName = `${record.name} ${surnameEnglish}`;
      let adaptationNote = `你的${gender === "male" ? "姓氏" : "姓名"}「${surname}」`;
      if (givenName) adaptationNote += `${givenName}`;
      adaptationNote += `，推荐「${record.name}」`;
      if (effectivePhoneticScore >= 60) adaptationNote += `，发音与中文名相近`;
      else if (phoneticResult.detail !== '无匹配') adaptationNote += `，${phoneticResult.detail}`;
      if (meaningScore >= 60 && needs.length > 0) adaptationNote += `，含义契合「${needs.slice(0, 2).join("、")}」`;
      adaptationNote += `。综合评分${finalScore}分。`;
      if (surnameSpellings.length > 0) {
        adaptationNote += ` 姓氏「${surname}」推荐英文变体「${surnameEnglish}」`;
      }

      scoredResults.push({
        name: record.name,
        gender: record.gender,
        phonetic: record.phonetic,
        chinese: record.chinese,
        origin: record.origin,
        popularity: record.popularity,
        meaning: record.meaning,
        firstLetter: record.firstLetter,
        score: finalScore,
        phoneticScore: effectivePhoneticScore,
        meaningScore,
        styleScore,
        popularityScore,
        lengthScore,
        tags: Array.from(new Set(tags)),
        adaptationNote,
        recommendedFullName,
        surnameEnglish,
        surnameChina,
        surnameOverseas,
      });
    }

    // ★★★ V4.2 新增：过滤零分结果 ★★★
    // 原因：发音匹配为0的名字不应该出现在结果集中
    // 例如"xiao yan"匹配"Diana"→得分0（因为xiao为零分音节，totalScore被设为0）
    // 这些名字根本不发音接近，展示出来只会让用户困惑
    const meaningfulResults = scoredResults.filter(r => r.score > 0);
    
    // 如果过滤后结果太少，最多允许保留一些 phoneticscore>0 但综合分不高的
    const filteredResults = meaningfulResults.length >= count 
      ? meaningfulResults 
      : meaningfulResults.length > 0 
        ? meaningfulResults 
        : scoredResults.filter(r => r.phoneticScore > 0);
    
    // 排序：综合分数 + 拼音匹配度加权
    filteredResults.sort((a, b) => {
      // 综合分优先
      if (b.score !== a.score) return b.score - a.score;
      // 同分时拼音匹配度高的排前面
      return b.phoneticScore - a.phoneticScore;
    });
    
    const topResults = filteredResults.slice(0, Math.max(count, 20));

    return { 
      success: true, 
      data: topResults, 
      totalCandidates: candidates.length 
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