/**
 * 八字分析服务 (BaZi Service)
 *
 * 基于 lunisolar 库进行八字排盘和五行分析。
 * 五行数据直接查询 kangxi_dict 表（包含 12,000+ 带五行标签的汉字）。
 *
 * 主要功能：
 * 1. calculateBaZi    — 八字排盘，返回四柱+五行统计
 * 2. analyzeWuxingPreference — 推算五行喜忌（喜用神/忌神）
 * 3. queryCharWuxing  — 查询单个汉字的五行属性（从 kangxi_dict）
 * 4. analyzeNameWuxing — 评估名字的五行补益效果
 *
 * 用法示例：
 *   const bazi = await calculateBaZi("2024-03-15", "08:30");
 *   const pref = await analyzeWuxingPreference(bazi);
 *   const nameEval = await analyzeNameWuxing("明", pref);
 */

import "server-only";
import { queryRaw } from "@/lib/prisma";

// 动态导入 lunisolar（CommonJS 兼容）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const lunisolar = require("lunisolar");

// ==================== 常量定义 ====================

/** 天干 */
export const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
/** 地支 */
export const DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
/** 五行 */
export const WU_XING = ["木", "火", "土", "金", "水"] as const;

// 天干五行索引: 甲0乙0丙1丁1戊2己2庚3辛3壬4癸4
const STEM_WUXING = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
// 地支五行索引: 子4丑2寅0卯0辰2巳1午1未2申3酉3戌2亥4
const BRANCH_WUXING = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
// 五行相生: 木→火→土→金→水→木
const GENERATE_NEXT = [1, 2, 3, 4, 0]; // idx 生 (idx+1)%5
// 五行相克: 木→土, 火→金, 土→水, 金→木, 水→火
const CONTROL_NEXT = [2, 3, 4, 0, 1];

// ==================== 类型定义 ====================

/** 四柱中的一柱 */
export interface PillarInfo {
  label: string;       // "年柱" / "月柱" / "日柱" / "时柱"
  stemChar: string;    // 天干字符，如 "甲"
  branchChar: string;  // 地支字符，如 "辰"
  stemWuxing: string;  // 天干五行，如 "木"
  branchWuxing: string;// 地支五行，如 "土"
}

/** 八字排盘结果 */
export interface BaZiResult {
  /** 出生日期（原始输入） */
  birthDate: string;
  /** 出生时间（原始输入，可能为空） */
  birthTime?: string;
  /** 四柱 */
  pillars: PillarInfo[];
  /** 完整八字字符串（如 "甲辰 丁卯 戊寅 丙辰"） */
  fullBaZi: string;
  /** 日主（日干字符） */
  dayMaster: string;
  /** 日主五行 */
  dayMasterWuxing: string;
  /** 五行出现次数统计（天干+地支共8字） */
  wuxingCount: Record<string, number>;
  /** 五行统计文本描述 */
  wuxingSummary: string;
}

/** 五行喜忌分析结果 */
export interface WuxingPreference {
  /** 日主（日干） */
  dayStem: string;
  /** 日主五行 */
  dayStemWuxing: string;
  /** 日主是否过旺（出现≥3次） */
  isExcessive: boolean;
  /** 日主是否过弱（出现0-1次） */
  isWeak: boolean;
  /** 日主是否中和 */
  isBalanced: boolean;
  /** 喜用五行列表（需要补益的） */
  favorableElements: string[];
  /** 忌讳五行列表（过多的） */
  unfavorableElements: string[];
  /** 缺失五行列表（出现0次） */
  missingElements: string[];
  /** 分析文字描述 */
  description: string;
}

/** 单个汉字的五行信息（来自 kangxi_dict） */
export interface CharWuxing {
  character: string;
  wuxing: string | null;
  pinyin: string | null;
  radical: string | null;
  strokeCount: number | null;
  meaning: string | null;
}

/** 名字五行分析结果 */
export interface NameWuxingAnalysis {
  /** 名字中的各汉字五行 */
  characters: Array<{
    char: string;
    wuxing: string | null;
    pinyin: string | null;
  }>;
  /** 名字中出现的五行及次数 */
  wuxingCount: Record<string, number>;
  /** 名字是否匹配五行喜用 */
  isFavorable: boolean;
  /** 名字补益了哪些喜用五行 */
  complementedElements: string[];
  /** 名字中包含了哪些忌讳五行 */
  conflictingElements: string[];
  /** 整体评分（0-100） */
  score: number;
  /** 分析说明 */
  description: string;
  /** 五行缺失补益建议 */
  suggestion?: string;
}

// ==================== 核心排盘函数 ====================

/**
 * 计算八字（四柱排盘）
 *
 * @param birthDate - 出生日期，格式 "YYYY-MM-DD" 或 Date 支持的格式
 * @param birthTime - （可选）出生时间，格式 "HH:mm" 或 "HH:mm:ss"，默认 "12:00"
 * @returns BaZiResult 八字排盘结果
 */
export function calculateBaZi(birthDate: string, birthTime?: string): BaZiResult {
  // 1. 构造完整日期字符串给 lunisolar
  const timeStr = birthTime || "12:00:00";
  const dateTimeStr = `${birthDate} ${timeStr}`;

  // 2. 调用 lunisolar 排盘
  const ls = lunisolar(dateTimeStr);
  const char8 = ls.char8;
  const list = char8._list || [];

  // 3. 解析四柱
  const labels = ["年柱", "月柱", "日柱", "时柱"];
  const pillars: PillarInfo[] = list.map((pillar: any, i: number) => {
    const stemIdx = pillar.stem.value;  // 0~9
    const branchIdx = pillar.branch.value; // 0~11
    return {
      label: labels[i],
      stemChar: TIAN_GAN[stemIdx],
      branchChar: DI_ZHI[branchIdx],
      stemWuxing: WU_XING[STEM_WUXING[stemIdx]],
      branchWuxing: WU_XING[BRANCH_WUXING[branchIdx]],
    };
  });

  // 4. 日主（日干）
  const dayPillar = pillars[2];
  const dayMaster = dayPillar.stemChar;
  const dayMasterWuxing = dayPillar.stemWuxing;

  // 5. 五行统计（天干+地支共8字）
  const wuxingCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach((p) => {
    const sIdx = TIAN_GAN.indexOf(p.stemChar as typeof TIAN_GAN[number]);
    const bIdx = DI_ZHI.indexOf(p.branchChar as typeof DI_ZHI[number]);
    if (sIdx >= 0) wuxingCount[WU_XING[STEM_WUXING[sIdx]]]++;
    if (bIdx >= 0) wuxingCount[WU_XING[BRANCH_WUXING[bIdx]]]++;
  });

  // 6. 构建描述
  const fullBaZi = pillars.map((p) => p.stemChar + p.branchChar).join(" ");
  const wxSummary = Object.entries(wuxingCount)
    .map(([wx, count]) => `${wx}:${count}`)
    .join(" ");

  return {
    birthDate,
    birthTime,
    pillars,
    fullBaZi,
    dayMaster,
    dayMasterWuxing,
    wuxingCount,
    wuxingSummary: wxSummary,
  };
}

// ==================== 五行喜忌推算 ====================

/**
 * 根据八字排盘结果推算五行喜忌（喜用神/忌神）
 *
 * 推算逻辑：
 * 1. 统计四柱八字中每种五行出现次数（天干+地支）
 * 2. 以日主（日干）五行为中心：
 *   - 过旺（≥3次）：喜用克泄耗（克日主、日主生、耗日主）
 *   - 过弱（≤1次）：喜用生扶（生日主、同日主）
 *   - 中和（2次）：优先补充缺失的五行
 * 3. 同时参考季节旺相（月令）因素微调
 *
 * @param bazi - 八字排盘结果
 * @returns WuxingPreference 五行喜忌分析
 */
export function analyzeWuxingPreference(bazi: BaZiResult): WuxingPreference {
  const dmWxIdx = WU_XING.indexOf(bazi.dayMasterWuxing as typeof WU_XING[number]); // 日主五行索引 0~4
  const dmCount = bazi.wuxingCount[bazi.dayMasterWuxing]; // 日主出现次数

  // 判断旺弱
  const isExcessive = dmCount >= 3;
  const isWeak = dmCount <= 1;
  const isBalanced = dmCount === 2;

  // 找出缺失的五行
  const missingElements = Object.entries(bazi.wuxingCount)
    .filter(([_, count]) => count === 0)
    .map(([wx]) => wx);

  // 找出出现最多的（除日主外）
  const sortedByCount = Object.entries(bazi.wuxingCount)
    .filter(([wx]) => wx !== bazi.dayMasterWuxing)
    .sort((a, b) => b[1] - a[1]);
  const mostExcessive = sortedByCount
    .filter(([_, count]) => count >= 3)
    .map(([wx]) => wx);

  let favorableElements: string[] = [];
  let unfavorableElements: string[] = [];
  let description = "";

  if (isExcessive) {
    // 日主过旺：喜用克泄耗
    // 克日主者：controlNext[dmWxIdx]
    const controlling = WU_XING[CONTROL_NEXT[dmWxIdx]]; // 克日主
    // 日主生者：generateNext[dmWxIdx] — 日主生的五行
    const generating = WU_XING[GENERATE_NEXT[dmWxIdx]]; // 日主生
    // 耗日主者：被日主克 — 日主克的五行
    const controlled = WU_XING[CONTROL_NEXT.indexOf(dmWxIdx)]; // 日主克

    favorableElements = [controlling, generating, controlled].filter(
      (wx) => wx !== bazi.dayMasterWuxing
    );
    // 去重
    favorableElements = [...new Set(favorableElements)];
    // 同时缺失的优先
    favorableElements.sort((a) => (missingElements.includes(a) ? -1 : 1));

    unfavorableElements = mostExcessive.length > 0 ? mostExcessive : [bazi.dayMasterWuxing];

    description = `日主${bazi.dayMasterWuxing}偏旺（${dmCount}次），宜用${favorableElements.join(
      "、"
    )}来克泄耗，忌补${bazi.dayMasterWuxing}。`;
  } else if (isWeak) {
    // 日主过弱：喜用生扶
    // 生日主者：谁克日主？不是... 生是 GENERATE_NEXT[?]=dmWxIdx
    // 从 GENERATE_NEXT 中找到哪个索引生成 dmWxIdx: generateNext[x] === dmWxIdx
    const generating = WU_XING[GENERATE_NEXT.indexOf(dmWxIdx)]; // 生日主
    const sameElement = bazi.dayMasterWuxing; // 同日主（比肩）

    favorableElements = [generating, sameElement];
    unfavorableElements = Object.keys(bazi.wuxingCount).filter(
      (wx) => wx !== bazi.dayMasterWuxing && bazi.wuxingCount[wx] >= 2
    );

    description = `日主${bazi.dayMasterWuxing}偏弱（${dmCount}次），宜用${favorableElements.join(
      "、"
    )}来生扶，忌克泄耗过重。`;
  } else {
    // 中和：补缺
    if (missingElements.length > 0) {
      favorableElements = missingElements;
      description = `日主${bazi.dayMasterWuxing}中和（${dmCount}次），八字缺${missingElements.join(
        "、"
      )}，宜适当补益。`;
    } else {
      // 五行齐全且中和
      favorableElements = [bazi.dayMasterWuxing];
      description = `日主${bazi.dayMasterWuxing}中和，五行俱全，宜保持平衡。`;
    }
    unfavorableElements = mostExcessive;
  }

  // 确保不出现 undefined
  favorableElements = favorableElements.filter(Boolean);
  unfavorableElements = unfavorableElements.filter(Boolean);

  return {
    dayStem: bazi.dayMaster,
    dayStemWuxing: bazi.dayMasterWuxing,
    isExcessive,
    isWeak,
    isBalanced,
    favorableElements,
    unfavorableElements,
    missingElements,
    description,
  };
}

// ==================== 汉字五行查询 ====================

/**
 * 从 kangxi_dict 表查询单个汉字的五行属性
 *
 * @param char - 要查询的汉字
 * @returns CharWuxing | null 五行信息
 */
export async function queryCharWuxing(char: string): Promise<CharWuxing | null> {
  if (!char || char.length === 0) return null;

  try {
    const rows = await queryRaw<any>(
      `SELECT character, wuxing, pinyin, radical, stroke_count, meaning
       FROM kangxi_dict
       WHERE character = $1
       LIMIT 1`,
      [char]
    );

    if (!rows || rows.length === 0) return null;

    return {
      character: rows[0].character,
      wuxing: rows[0].wuxing || null,
      pinyin: rows[0].pinyin || null,
      radical: rows[0].radical || null,
      strokeCount: rows[0].stroke_count || null,
      meaning: rows[0].meaning || null,
    };
  } catch (error) {
    console.error(`[BaZi] queryCharWuxing error for "${char}":`, error);
    return null;
  }
}

/**
 * 批量查询多个汉字的五行属性
 *
 * @param chars - 汉字字符串或数组
 * @returns CharWuxing[] 五行信息列表
 */
export async function queryCharsWuxing(chars: string | string[]): Promise<CharWuxing[]> {
  const charList = typeof chars === "string" ? chars.split("") : chars;
  if (charList.length === 0) return [];

  // 去重
  const uniqueChars = [...new Set(charList)];

  try {
    // 用 SQL IN 一次查询全部
    const placeholders = uniqueChars.map((_, i) => `$${i + 1}`).join(",");
    const rows = await queryRaw<any>(
      `SELECT DISTINCT ON (character) character, wuxing, pinyin, radical, stroke_count, meaning
       FROM kangxi_dict
       WHERE character IN (${placeholders})`,
      uniqueChars
    );

    const resultMap = new Map<string, CharWuxing>();
    if (rows) {
      rows.forEach((r: any) => {
        resultMap.set(r.character, {
          character: r.character,
          wuxing: r.wuxing || null,
          pinyin: r.pinyin || null,
          radical: r.radical || null,
          strokeCount: r.stroke_count || null,
          meaning: r.meaning || null,
        });
      });
    }

    // 按原顺序返回（查不到的用 null）
    return charList.map((ch) => {
      const found = resultMap.get(ch);
      return (
        found || {
          character: ch,
          wuxing: null,
          pinyin: null,
          radical: null,
          strokeCount: null,
          meaning: null,
        }
      );
    });
  } catch (error) {
    console.error(`[BaZi] queryCharsWuxing error:`, error);
    return charList.map((ch) => ({
      character: ch,
      wuxing: null,
      pinyin: null,
      radical: null,
      strokeCount: null,
      meaning: null,
    }));
  }
}

/**
 * 按五行分类查询推荐汉字列表（用于名字生成时的参考）
 *
 * @param wuxing - 五行名称："木"|"火"|"土"|"金"|"水"
 * @param limit - 返回数量上限（默认 100）
 * @returns CharWuxing[] 该五行所属的汉字列表
 */
export async function queryCharsByWuxing(
  wuxing: string,
  limit: number = 100
): Promise<CharWuxing[]> {
  if (!WU_XING.includes(wuxing as any)) return [];

  try {
    const rows = await queryRaw<any>(
      `SELECT character, wuxing, pinyin, radical, stroke_count, meaning
       FROM kangxi_dict
       WHERE wuxing = $1
       LIMIT $2`,
      [wuxing, limit]
    );

    return (rows || []).map((r: any) => ({
      character: r.character,
      wuxing: r.wuxing || null,
      pinyin: r.pinyin || null,
      radical: r.radical || null,
      strokeCount: r.stroke_count || null,
      meaning: r.meaning || null,
    }));
  } catch (error) {
    console.error(`[BaZi] queryCharsByWuxing error for "${wuxing}":`, error);
    return [];
  }
}

// ==================== 名字五行评估 ====================

/**
 * 分析名字中各个汉字与八字喜用五行的匹配度
 *
 * @param givenName - 名字（名，不含姓）
 * @param preference - 五行喜忌分析结果
 * @returns NameWuxingAnalysis 名字五行分析
 */
export async function analyzeNameWuxing(
  givenName: string,
  preference: WuxingPreference
): Promise<NameWuxingAnalysis> {
  if (!givenName) {
    return {
      characters: [],
      wuxingCount: {},
      isFavorable: false,
      complementedElements: [],
      conflictingElements: [],
      score: 0,
      description: "名字为空",
    };
  }

  // 1. 查询每个字的五行
  const charsData = await queryCharsWuxing(givenName.split(""));

  // 2. 统计名字中各五行出现次数
  const wuxingCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  charsData.forEach((cd) => {
    if (cd.wuxing && wuxingCount[cd.wuxing] !== undefined) {
      wuxingCount[cd.wuxing]++;
    }
  });

  // 3. 计算匹配情况
  const complementedElements = preference.favorableElements.filter(
    (wx) => wuxingCount[wx] && wuxingCount[wx] > 0
  );
  const conflictingElements = preference.unfavorableElements.filter(
    (wx) => wuxingCount[wx] && wuxingCount[wx] > 0
  );

  // 4. 评分
  let score = 50; // 基础分
  // 每个补益的喜用五行 +15 分
  score += complementedElements.length * 15;
  // 包含忌讳五行每个 -15 分
  score -= conflictingElements.length * 15;
  // 如果名字中完全不含喜用以外五行的，+10 分
  const allNameWuxing = Object.entries(wuxingCount)
    .filter(([_, c]) => c > 0)
    .map(([wx]) => wx);
  const hasOnlyFavorable = allNameWuxing.every(
    (wx) => preference.favorableElements.includes(wx) || !preference.unfavorableElements.includes(wx)
  );
  if (hasOnlyFavorable && allNameWuxing.length > 0) score += 10;
  // 如果有缺失五行被补上了，+10 分
  const complementedMissing = preference.missingElements.filter(
    (wx) => wuxingCount[wx] && wuxingCount[wx] > 0
  );
  score += complementedMissing.length * 10;

  score = Math.max(0, Math.min(100, score));

  // 5. 构建描述
  const isFavorable = complementedElements.length > 0 && conflictingElements.length === 0;
  let description = "";
  if (isFavorable) {
    description = `名字「${givenName}」的五行：${Object.entries(wuxingCount)
      .filter(([_, c]) => c > 0)
      .map(([wx, c]) => `${wx}${c}`)
      .join("、")}。匹配喜用五行${complementedElements.join("、")}，为佳名。`;
  } else if (conflictingElements.length > 0) {
    description = `名字「${givenName}」包含忌讳五行${conflictingElements.join(
      "、"
    )}，建议调整。`;
  } else {
    description = `名字「${givenName}」五行缺${Object.entries(wuxingCount)
      .filter(([_, c]) => c === 0)
      .map(([wx]) => wx)
      .join("、")}，建议补充喜用五行。`;
  }

  // 6. 补益建议
  let suggestion: string | undefined;
  if (conflictingElements.length > 0) {
    suggestion = `建议选用含${preference.favorableElements.join("、")}部首的字，避免${conflictingElements.join("、")}。`;
  } else if (preference.missingElements.length > 0 && complementedMissing.length === 0) {
    const missingFavorable = preference.missingElements.filter((wx) =>
      preference.favorableElements.includes(wx)
    );
    if (missingFavorable.length > 0) {
      suggestion = `八字缺${missingFavorable.join("、")}，建议选用含${missingFavorable.join("、")}部首或五行属${missingFavorable.join("、")}的字。`;
    }
  }

  return {
    characters: charsData.map((cd) => ({
      char: cd.character,
      wuxing: cd.wuxing,
      pinyin: cd.pinyin,
    })),
    wuxingCount,
    isFavorable,
    complementedElements,
    conflictingElements,
    score,
    description,
    suggestion,
  };
}

/**
 * 完整分析：八字排盘 → 五行喜忌
 *
 * @param birthDate - 出生日期
 * @param birthTime - （可选）出生时间
 * @returns { bazi, preference } 八字+喜忌
 */
export function fullBaZiAnalysis(birthDate: string, birthTime?: string): {
  bazi: BaZiResult;
  preference: WuxingPreference;
} {
  const bazi = calculateBaZi(birthDate, birthTime);
  const preference = analyzeWuxingPreference(bazi);
  return { bazi, preference };
}