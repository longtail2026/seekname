/**
 * 英文起名引擎
 * 
 * 结合 ename-dict 词典数据 + 语义搜索 + 多维度评分，
 * 根据用户输入（姓氏、性别、需求、风格等）生成匹配的英文名推荐。
 */

import { getAllRecords, searchNames, type EnameRecord } from "./ename-dict";
import { semanticSearchEname, type EnameSemanticMatch } from "./semantic-ename-search";

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
  score: number;
  phoneticScore: number;
  meaningScore: number;
  styleScore: number;
  popularityScore: number;
  lengthScore: number;
  tags: string[];
  adaptationNote: string;
}

// ===== 姓氏首字母映射 =====
const SURNAME_PHONETIC_MAP: Record<string, string[]> = {
  "李": ["L", "E", "I"], "王": ["W", "V", "U"], "张": ["Z", "J", "C"],
  "刘": ["L", "E", "I"], "陈": ["C", "S", "J"], "杨": ["Y", "E", "I"],
  "赵": ["Z", "J", "C"], "黄": ["H", "W", "U"], "周": ["Z", "J", "C"],
  "吴": ["W", "U", "V"], "徐": ["X", "S", "C"], "孙": ["S", "X", "C"],
  "马": ["M", "N"], "胡": ["H", "F", "U"], "朱": ["Z", "J", "G"],
  "郭": ["G", "K", "C"], "何": ["H", "E", "I"], "罗": ["L", "R", "N"],
  "高": ["G", "K", "C"], "林": ["L", "N"], "梁": ["L", "E", "N"],
  "郑": ["Z", "J", "C"], "谢": ["X", "S", "C"], "宋": ["S", "C", "X"],
  "唐": ["T", "D", "C"], "许": ["X", "S", "H"], "韩": ["H", "C", "K"],
  "冯": ["F", "P", "H"], "邓": ["D", "T", "G"], "曹": ["C", "K", "S"],
  "彭": ["P", "B", "F"], "曾": ["Z", "C", "S"], "萧": ["X", "S", "C"],
  "田": ["T", "D", "C"], "董": ["D", "T", "B"], "潘": ["P", "B", "F"],
  "袁": ["Y", "U"], "蔡": ["C", "S", "T"], "蒋": ["J", "C", "Z"],
  "余": ["Y", "E", "U"], "叶": ["Y", "E", "I"], "程": ["C", "S", "J"],
  "苏": ["S", "C", "Z"], "吕": ["L", "E", "I"], "魏": ["W", "U", "V"],
  "丁": ["D", "T", "C"], "沈": ["S", "C", "J"], "任": ["R", "L", "N"],
  "姚": ["Y", "E", "I"], "卢": ["L", "R", "N"], "傅": ["F", "P", "H"],
  "钟": ["Z", "C", "G"], "崔": ["C", "T", "S"], "汪": ["W", "V", "U"],
  "范": ["F", "V", "P"], "陆": ["L", "R", "N"], "廖": ["L", "E", "N"],
  "杜": ["D", "T", "G"], "方": ["F", "P", "H"], "石": ["S", "C", "Z"],
  "熊": ["X", "S", "C"], "金": ["J", "G", "C"], "邱": ["Q", "C", "K"],
  "侯": ["H", "C", "K"], "白": ["B", "P", "F"], "江": ["J", "G", "C"],
  "史": ["S", "C", "Z"], "龙": ["L", "N", "R"], "万": ["W", "V", "M"],
  "段": ["D", "T", "Z"], "雷": ["L", "R", "N"], "钱": ["Q", "C", "K"],
  "汤": ["T", "D", "C"], "尹": ["Y", "E", "I"], "易": ["Y", "E", "I"],
  "常": ["C", "S", "J"], "武": ["W", "V", "U"], "乔": ["Q", "C", "J"],
  "贺": ["H", "C", "K"], "赖": ["L", "R", "N"], "龚": ["G", "K", "C"],
  "文": ["W", "V", "U"], "欧": ["O", "A", "U"],
};

function getSurnameLetters(surname: string): string[] {
  const s = surname?.trim() || "";
  if (!s) return [];
  const found = SURNAME_PHONETIC_MAP[s];
  if (found) return found;
  const firstPinyin = s[0];
  const pinyinMap: Record<string, string[]> = {
    "b": ["B", "P", "F"], "p": ["P", "B", "F"], "m": ["M", "N"],
    "f": ["F", "P", "H"], "d": ["D", "T", "G"], "t": ["T", "D", "C"],
    "n": ["N", "L", "M"], "l": ["L", "N", "R"], "g": ["G", "K", "C"],
    "k": ["K", "C", "G"], "h": ["H", "F", "W"], "j": ["J", "Z", "G"],
    "q": ["Q", "C", "K"], "x": ["X", "S", "C"], "zh": ["Z", "J", "C"],
    "ch": ["C", "S", "J"], "sh": ["S", "C", "X"], "r": ["R", "L"],
    "z": ["Z", "J", "C"], "c": ["C", "S", "Z"], "s": ["S", "C", "X"],
    "y": ["Y", "E", "I"], "w": ["W", "V", "U"],
  };
  return pinyinMap[firstPinyin] || ["A", "E", "I", "O", "U", "Y"];
}

/** 简单映射：常用汉字 -> 拼音首字母 */
function getChineseFirstLetter(char: string): string {
  const pinyinMap: Record<string, string> = {
    "爱": "A", "安": "A", "奥": "A",
    "白": "B", "柏": "B", "宝": "B", "博": "B",
    "才": "C", "彩": "C", "灿": "C", "晨": "C", "成": "C", "程": "C", "超": "C",
    "达": "D", "丹": "D", "德": "D", "东": "D",
    "恩": "E", "尔": "E",
    "发": "F", "方": "F", "芳": "F", "菲": "F", "芬": "F", "丰": "F", "福": "F", "芙": "F",
    "高": "G", "光": "G", "国": "G",
    "海": "H", "涵": "H", "晗": "H", "浩": "H", "皓": "H", "华": "H", "辉": "H", "慧": "H",
    "佳": "J", "嘉": "J", "杰": "J", "洁": "J", "金": "J", "景": "J", "静": "J", "君": "J", "俊": "J",
    "凯": "K", "可": "K", "坤": "K",
    "兰": "L", "朗": "L", "乐": "L", "磊": "L", "丽": "L", "莉": "L", "琳": "L", "玲": "L", "龙": "L", "露": "L", "罗": "L", "洛": "L",
    "马": "M", "曼": "M", "梅": "M", "美": "M", "梦": "M", "敏": "M", "明": "M", "铭": "M",
    "楠": "N", "宁": "N", "诺": "N",
    "欧": "O",
    "佩": "P", "鹏": "P", "萍": "P", "璞": "P",
    "琪": "Q", "琦": "Q", "启": "Q", "倩": "Q", "晴": "Q", "秋": "Q", "群": "Q",
    "然": "R", "仁": "R", "荣": "R", "蓉": "R", "瑞": "R", "润": "R", "若": "R",
    "珊": "S", "诗": "S", "姝": "S", "淑": "S", "思": "S", "松": "S",
    "涛": "T", "天": "T", "恬": "T", "婷": "T", "彤": "T",
    "婉": "W", "万": "W", "威": "W", "薇": "W", "维": "W", "伟": "W", "文": "W", "雯": "W",
    "西": "X", "希": "X", "溪": "X", "熙": "X", "曦": "X", "潇": "X", "晓": "X", "欣": "X", "星": "X", "轩": "X", "萱": "X", "璇": "X", "雪": "X",
    "雅": "Y", "阳": "Y", "瑶": "Y", "伊": "Y", "依": "Y", "怡": "Y", "艺": "Y", "英": "Y", "莹": "Y", "宇": "Y", "雨": "Y", "玉": "Y", "元": "Y", "悦": "Y", "云": "Y",
    "泽": "Z", "哲": "Z", "珍": "Z", "振": "Z", "正": "Z", "志": "Z", "智": "Z", "中": "Z", "子": "Z", "紫": "Z",
  };
  return pinyinMap[char] || "";
}

// ===== 评分器 =====

function calcPhoneticScore(name: string, surname: string, givenName?: string): { score: number; tags: string[] } {
  const tags: string[] = [];
  const firstLetter = name[0]?.toUpperCase() || "";
  if (!firstLetter) return { score: 0, tags };

  const surnameLetters = getSurnameLetters(surname);
  let surnameScore = 0;
  if (surnameLetters.length > 0) {
    if (surnameLetters[0] === firstLetter) {
      surnameScore = 100;
      tags.push("姓氏谐音完美匹配");
    } else if (surnameLetters.includes(firstLetter)) {
      surnameScore = 70;
      tags.push("姓氏谐音较好匹配");
    } else {
      const nearMap: Record<string, string[]> = {
        "B": ["P", "F"], "P": ["B", "F"], "D": ["T"], "T": ["D"],
        "G": ["K"], "K": ["G"], "L": ["N", "R"], "N": ["L"],
        "M": ["N"], "S": ["C", "Z"], "C": ["S", "Z"], "Z": ["C", "S"],
        "H": ["F"], "F": ["H"], "J": ["Z", "G"], "Y": ["E", "I"], "W": ["V", "U"],
      };
      const nearLetters = nearMap[firstLetter] || [];
      if (surnameLetters.some((l) => nearLetters.includes(l))) {
        surnameScore = 40;
        tags.push("姓氏发音有一定关联");
      } else {
        surnameScore = 20;
      }
    }
  } else {
    surnameScore = 30;
  }

  let givenNameScore = 0;
  if (givenName && givenName.length > 0) {
    const givenLetter = getChineseFirstLetter(givenName[0]);
    if (givenLetter && givenLetter === firstLetter) {
      givenNameScore = 100;
      tags.push(`中文名「${givenName}」首字母完美匹配`);
    } else if (givenLetter) {
      const gSurnameLetters = getSurnameLetters(givenName[0]);
      if (gSurnameLetters.includes(firstLetter)) {
        givenNameScore = 60;
        tags.push(`中文名「${givenName}」发音相近`);
      } else {
        givenNameScore = 20;
      }
    }
  }

  const finalScore = givenName ? Math.round(surnameScore * 0.6 + givenNameScore * 0.4) : surnameScore;
  return { score: finalScore, tags };
}

function calcMeaningScore(meaning: string, needs: string[]): { score: number; tags: string[] } {
  const tags: string[] = [];
  if (!needs || needs.length === 0 || !meaning) {
    return { score: 50, tags: ["含义信息不足，中评"] };
  }

  const meaningLower = meaning.toLowerCase();
  let matchCount = 0;
  const matchedNeeds: string[] = [];

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
        matched = meaning.length >= 3 && meaning.length <= 5;
        break;
      case "文艺小众":
        matched = ["poet", "muse", "lyric", "grace", "elegant", "art", "文艺", "优雅", "诗意"].some(k => meaningLower.includes(k));
        break;
      case "可爱灵动":
        matched = ["sweet", "joy", "happy", "love", "play", "bright", "merry", "可爱", "快乐", "甜蜜"].some(k => meaningLower.includes(k));
        break;
      default:
        // 自定义需求：直接搜索关键词
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
  const uniqueNeeds = [...new Set(matchedNeeds)];
  tags.push(`含义匹配「${uniqueNeeds.join("、")}」`);

  return { score, tags };
}

function calcStyleScore(meaning: string, name: string, style?: string): { score: number; tags: string[] } {
  const tags: string[] = [];
  const meaningLower = (meaning || "").toLowerCase();
  const nameLower = name.toLowerCase();

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

  const matched = keywordCheck(meaningLower, nameLower);
  const score = matched ? 80 : 40;
  if (matched) tags.push(`风格匹配「${style}」`);

  return { score, tags };
}

function calcPopularityScore(popularity: string): number {
  switch (popularity) {
    case "★★★": return 90;
    case "★★": return 70;
    case "★": return 50;
    default: return 30;
  }
}

function calcLengthScore(name: string, preference?: "short" | "medium" | "long"): number {
  const len = name.length;
  if (!preference) return 50;
  switch (preference) {
    case "short": return len <= 4 ? 100 : len <= 5 ? 70 : len <= 6 ? 40 : 10;
    case "medium": return len === 5 || len === 6 ? 100 : len === 4 || len === 7 ? 70 : 30;
    case "long": return len >= 7 ? 100 : len >= 6 ? 70 : len >= 5 ? 40 : 10;
  }
}

function checkAvoidRules(name: string, meaning: string, popularity: string, avoidFlags?: string[]): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!avoidFlags || avoidFlags.length === 0) return { passed: true, reasons };

  const meaningLower = (meaning || "").toLowerCase();

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

    // 语义搜索（含中文名字发音匹配）
    let semanticMatches: EnameSemanticMatch[] = [];
    try {
      let semanticQuery = `适合${genderCn}的英文名字`;
      if (needs.length > 0) semanticQuery += `，含义${needs.join("、")}`;
      if (style) semanticQuery += `，${style}风格`;
      
      // 加入中文名字信息，使语义搜索能匹配到中文译名相近的英文名
      const nameForSearch = fullName || surname;
      if (nameForSearch && nameForSearch.length > 0) {
        // 提取每个汉字作为关键词，帮助向量搜索匹配中文译名
        const chars = nameForSearch.replace(/\s/g, "").split("");
        const uniqueChars = [...new Set(chars)];
        semanticQuery += `，中文名「${nameForSearch}」发音相近、中文译名包含「${uniqueChars.slice(0, 3).join("、")}」`;
      }
      
      semanticMatches = await semanticSearchEname(semanticQuery, { limit: 60, threshold: 0.45, gender });
    } catch (error) {
      console.error("[ename-generator] 语义搜索失败（不影响主流程）:", error);
    }

    // 候选池
    let namePool: EnameRecord[];
    if (semanticMatches.length > 0) {
      const semanticNameSet = new Set(semanticMatches.map((m) => m.name));
      const matchedRecords = candidates.filter((r) => semanticNameSet.has(r.name));
      const unmatched = candidates.filter((r) => !semanticNameSet.has(r.name));
      const supplementCount = Math.max(0, 100 - matchedRecords.length);
      const supplemented = unmatched.sort((a, b) => (b.popularity?.length || 0) - (a.popularity?.length || 0)).slice(0, supplementCount);
      namePool = [...matchedRecords, ...supplemented];
    } else {
      namePool = candidates.sort((a, b) => (b.popularity?.length || 0) - (a.popularity?.length || 0)).slice(0, 200);
    }

    // 分割全名
    let givenName = "";
    if (fullName && fullName.length > 0) {
      givenName = fullName.startsWith(surname) ? fullName.slice(surname.length) : fullName;
    }

    const scoredResults: EnameScoredResult[] = [];

    for (const record of namePool) {
      const { score: phoneticScore, tags: phoneticTags } = calcPhoneticScore(record.name, surname, givenName || undefined);
      const { score: meaningScore, tags: meaningTags } = calcMeaningScore(record.meaning, needs);
      const { score: styleScore, tags: styleTags } = calcStyleScore(record.meaning, record.name, style);
      const popularityScore = calcPopularityScore(record.popularity);
      const lengthScore = calcLengthScore(record.name, lengthPreference);
      const avoidCheck = checkAvoidRules(record.name, record.meaning, record.popularity, avoidFlags);

      let semanticBonus = 0;
      if (semanticMatches.length > 0) {
        const sm = semanticMatches.find((m) => m.name.toLowerCase() === record.name.toLowerCase());
        if (sm) semanticBonus = Math.round(sm.similarity * 30);
      }

      const totalScore = Math.round(
        phoneticScore * 0.25 + meaningScore * 0.20 + styleScore * 0.15 +
        popularityScore * 0.10 + lengthScore * 0.10 + semanticBonus
      );
      const avoidPenalty = avoidCheck.reasons.length * 10;
      const finalScore = Math.max(0, Math.min(100, totalScore - avoidPenalty));

      const tags: string[] = [];
      tags.push(...phoneticTags.filter((t) => !t.includes("信息不足")));
      tags.push(...meaningTags);
      tags.push(...styleTags);
      if (lengthScore >= 80) {
        const lenDesc = lengthPreference === "short" ? "短名" : lengthPreference === "long" ? "长名" : "适名";
        tags.push(`长度偏好「${lenDesc}」`);
      }
      if (popularityScore >= 70) tags.push("较流行");
      else if (popularityScore <= 30) tags.push("小众");
      if (avoidCheck.reasons.length > 0) tags.push(...avoidCheck.reasons.map((r) => `⚠️${r}`));

      let adaptationNote = `你的${gender === "male" ? "姓氏" : "姓名"}「${surname}」`;
      if (givenName) adaptationNote += `${givenName}`;
      adaptationNote += `，推荐「${record.name}」(${record.name[0].toUpperCase()}开头)`;
      if (phoneticScore >= 60) adaptationNote += `，发音与姓氏相近，`;
      if (meaningScore >= 60 && needs.length > 0) adaptationNote += `含义契合「${needs.slice(0, 2).join("、")}」`;
      adaptationNote += `。综合评分${finalScore}分。`;

      scoredResults.push({
        name: record.name, gender: record.gender, phonetic: record.phonetic, chinese: record.chinese,
        origin: record.origin, popularity: record.popularity, meaning: record.meaning,
        firstLetter: record.firstLetter, score: finalScore, phoneticScore, meaningScore,
        styleScore, popularityScore, lengthScore, tags: [...new Set(tags)], adaptationNote,
      });
    }

    scoredResults.sort((a, b) => b.score - a.score);
    const topResults = scoredResults.slice(0, Math.max(count, 20));

    return { success: true, data: topResults, totalCandidates: candidates.length };
  } catch (error) {
    console.error("[ename-generator] 生成英文名失败:", error);
    return { success: false, data: [], totalCandidates: 0, message: `生成失败: ${error instanceof Error ? error.message : "未知错误"}` };
  }
}