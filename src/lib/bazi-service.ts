/**
 * 八字分析服务 (BaZi Service)
 *
 * 纯 JS 实现八字排盘，不依赖 lunisolar 等第三方库。
 * 八字推算算法参考《渊海子平》《三命通会》标准算法。
 * 五行数据直接查询 kangxi_dict 表（包含 12,000+ 带五行标签的汉字）。
 *
 * 主要功能：
 * 1. calculateBaZi    — 八字排盘，返回四柱+五行统计
 * 2. analyzeWuxingPreference — 推算五行喜忌（喜用神/忌神）
 * 3. queryCharWuxing  — 查询单个汉字的五行属性（从 kangxi_dict）
 * 4. analyzeNameWuxing — 评估名字的五行补益效果
 *
 * 用法示例：
 *   const bazi = calculateBaZi("2024-03-15", "08:30");
 *   const pref = analyzeWuxingPreference(bazi);
 *   const nameEval = await analyzeNameWuxing("明", pref);
 */

import "server-only";
import { queryRaw } from "@/lib/prisma";

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

/**
 * 节气近似日期偏移（距 2000-01-01 的天数）
 * 索引0=小寒,1=大寒,2=立春,3=雨水,4=惊蛰,5=春分,
 *     6=清明,7=谷雨,8=立夏,9=小满,10=芒种,11=夏至,
 *     12=小暑,13=大暑,14=立秋,15=处暑,16=白露,17=秋分,
 *     18=寒露,19=霜降,20=立冬,21=小雪,22=大雪,23=冬至
 * 我们只需要节，忽略气。节=双数索引（0,2,4,...,22）
 */
const TERM_OFFSETS_2000: Record<number, number> = {
  0: 5.59,   // 小寒
  2: 36.97,  // 立春
  4: 66.75,  // 惊蛰
  6: 97.31,  // 清明
  8: 127.72, // 立夏
  10: 158.09, // 芒种
  12: 188.42, // 小暑
  14: 218.71, // 立秋
  16: 249.16, // 白露
  18: 279.42, // 寒露
  20: 309.58, // 立冬
  22: 339.88, // 大雪
};

/** 一年平均天数 */
const TROPICAL_YEAR = 365.2422;

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

// ==================== 辅助函数 ====================

/**
 * 获取指定年份某个节气的近似日期
 * 节气索引：0=小寒, 2=立春, 4=惊蛰, 6=清明, 8=立夏, 10=芒种,
 *           12=小暑, 14=立秋, 16=白露, 18=寒露, 20=立冬, 22=大雪
 */
function getJieApproxDate(year: number, jieIdx: number): { month: number; day: number } {
  const daysSince2000 = (year - 2000) * TROPICAL_YEAR + TERM_OFFSETS_2000[jieIdx];
  const d = new Date(2000, 0, Math.round(daysSince2000));
  return { month: d.getMonth() + 1, day: d.getDate() };
}

/**
 * 计算年柱
 * 年柱以立春为界，立春前属上一年。
 */
function calcYearPillar(year: number): { stem: number; branch: number } {
  const idx = ((year - 4) % 60 + 60) % 60;
  return { stem: idx % 10, branch: idx % 12 };
}

/**
 * 计算日柱
 * 基准：1900-01-01 = 甲戌日（天干索引0，地支索引10，总体索引10）
 */
function calcDayPillar(year: number, month: number, day: number): { stem: number; branch: number; idx: number } {
  const d1900 = new Date(1900, 0, 1);
  const dt = new Date(year, month - 1, day);
  const diff = Math.round((dt.getTime() - d1900.getTime()) / 86400000);
  const idx = ((diff + 10) % 60 + 60) % 60;
  return { stem: idx % 10, branch: idx % 12, idx };
}

/**
 * 计算月柱
 * 月支以节气（节）为界。
 */
function calcMonthPillar(year: number, month: number, day: number): { stem: number; branch: number } {
  const monthDay = month * 100 + day;
  
  // 找当前日期落在哪个节区间
  let monthBranch = (month + 1) % 12; // 默认（如果无匹配，按近似）
  
  for (let j = 0; j < 12; j++) {
    const jieIdx = j * 2; // 0=小寒, 2=立春, ..., 22=大雪
    const jie = getJieApproxDate(year, jieIdx);
    const nextIdx = j < 11 ? (j + 1) * 2 : 0;
    const nextY = j < 11 ? year : year + 1;
    const nextJie = getJieApproxDate(nextY, nextIdx);
    
    const startMD = jie.month * 100 + jie.day;
    const endMD = nextJie.month * 100 + nextJie.day;
    
    if (j < 11) {
      if (monthDay >= startMD && monthDay < endMD) {
        // 节索引j对应地支: 小寒(0)→丑(1), 立春(2)→寅(2), 惊蛰(4)→卯(3), ...
        monthBranch = (j + 2) % 12;
        break;
      }
    } else {
      // 大雪跨年情况
      if (monthDay >= startMD || monthDay < endMD) {
        monthBranch = (j + 2) % 12;
        break;
      }
    }
  }
  
  // 月干: (年干 mod 5 * 2 + 月支) mod 10
  const yearStem = calcYearPillar(year).stem;
  const monthStem = (Math.floor(yearStem / 2) * 2 + monthBranch) % 10;
  
  return { stem: monthStem, branch: monthBranch };
}

/**
 * 计算时柱
 * 时支：23-01 = 子, 01-03 = 丑, ..., 时干由日干推算
 */
function calcHourPillar(dayStem: number, hour: number, minute?: number): { stem: number; branch: number } {
  // 调整：子时是23:00~1:00，h=0或23时为子
  let adjustedHour = hour;
  if (hour === 23) {
    adjustedHour = 0; // 夜子时
  }
  const hourBranch = Math.floor((adjustedHour + 1) / 2) % 12;
  // 时干: (日干 mod 5 * 2 + 时支) mod 10
  const hourStem = (Math.floor(dayStem / 2) * 2 + hourBranch) % 10;
  return { stem: hourStem, branch: hourBranch };
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
  // 1. 解析日期
  const dateParts = birthDate.split("-").map(Number);
  if (dateParts.length < 3 || isNaN(dateParts[0]) || isNaN(dateParts[1]) || isNaN(dateParts[2])) {
    throw new Error(`无效的日期格式: ${birthDate}，请使用 YYYY-MM-DD`);
  }
  
  const [year, month, day] = dateParts;
  
  // 2. 解析时间
  let hour = 12;
  let minute = 0;
  if (birthTime) {
    const timeParts = birthTime.split(":").map(Number);
    if (timeParts.length >= 2) {
      hour = timeParts[0];
      minute = timeParts[1];
    }
  }
  
  // 3. 年柱（先按立春调整）
  // 立春通常在2月4日左右，2月4日前属于上一年
  let effectiveYear = year;
  const chunJie = getJieApproxDate(year, 2); // 立春
  if (month < 2 || (month === chunJie.month && day < chunJie.day)) {
    effectiveYear = year - 1;
  }
  
  // 4. 排四柱
  const yearPillar = calcYearPillar(effectiveYear);
  const monthPillar = calcMonthPillar(effectiveYear, month, day);
  const dayPillar = calcDayPillar(year, month, day);
  const hourPillar = calcHourPillar(dayPillar.stem, hour, minute);
  
  // 5. 构建四柱信息
  const pillarConfigs = [
    { label: "年柱", pillar: yearPillar },
    { label: "月柱", pillar: monthPillar },
    { label: "日柱", pillar: dayPillar },
    { label: "时柱", pillar: hourPillar },
  ];
  
  const pillars: PillarInfo[] = pillarConfigs.map(({ label, pillar }) => ({
    label,
    stemChar: TIAN_GAN[pillar.stem],
    branchChar: DI_ZHI[pillar.branch],
    stemWuxing: WU_XING[STEM_WUXING[pillar.stem]],
    branchWuxing: WU_XING[BRANCH_WUXING[pillar.branch]],
  }));
  
  // 6. 日主
  const dayPillarInfo = pillars[2];
  const dayMaster = dayPillarInfo.stemChar;
  const dayMasterWuxing = dayPillarInfo.stemWuxing;
  
  // 7. 五行统计（天干+地支共8字）
  const wuxingCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach((p) => {
    const sIdx = TIAN_GAN.indexOf(p.stemChar as typeof TIAN_GAN[number]);
    const bIdx = DI_ZHI.indexOf(p.branchChar as typeof DI_ZHI[number]);
    if (sIdx >= 0) wuxingCount[WU_XING[STEM_WUXING[sIdx]]]++;
    if (bIdx >= 0) wuxingCount[WU_XING[BRANCH_WUXING[bIdx]]]++;
  });
  
  // 8. 构建描述
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
  const dmWxIdx = WU_XING.indexOf(bazi.dayMasterWuxing as typeof WU_XING[number]);
  const dmCount = bazi.wuxingCount[bazi.dayMasterWuxing];
  
  const isExcessive = dmCount >= 3;
  const isWeak = dmCount <= 1;
  const isBalanced = dmCount === 2;
  
  const missingElements = Object.entries(bazi.wuxingCount)
    .filter(([_, count]) => count === 0)
    .map(([wx]) => wx);
  
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
    const controlling = WU_XING[CONTROL_NEXT[dmWxIdx]];
    const generating = WU_XING[GENERATE_NEXT[dmWxIdx]];
    const controlled = WU_XING[CONTROL_NEXT.indexOf(dmWxIdx)];
    
    favorableElements = [controlling, generating, controlled].filter(
      (wx) => wx !== bazi.dayMasterWuxing
    );
    favorableElements = [...new Set(favorableElements)];
    favorableElements.sort((a) => (missingElements.includes(a) ? -1 : 1));
    
    unfavorableElements = mostExcessive.length > 0 ? mostExcessive : [bazi.dayMasterWuxing];
    
    description = `日主${bazi.dayMasterWuxing}偏旺（${dmCount}次），宜用${favorableElements.join(
      "、"
    )}来克泄耗，忌补${bazi.dayMasterWuxing}。`;
  } else if (isWeak) {
    const generating = WU_XING[GENERATE_NEXT.indexOf(dmWxIdx)];
    const sameElement = bazi.dayMasterWuxing;
    
    favorableElements = [generating, sameElement];
    unfavorableElements = Object.keys(bazi.wuxingCount).filter(
      (wx) => wx !== bazi.dayMasterWuxing && bazi.wuxingCount[wx] >= 2
    );
    
    description = `日主${bazi.dayMasterWuxing}偏弱（${dmCount}次），宜用${favorableElements.join(
      "、"
    )}来生扶，忌克泄耗过重。`;
  } else {
    if (missingElements.length > 0) {
      favorableElements = missingElements;
      description = `日主${bazi.dayMasterWuxing}中和（${dmCount}次），八字缺${missingElements.join(
        "、"
      )}，宜适当补益。`;
    } else {
      favorableElements = [bazi.dayMasterWuxing];
      description = `日主${bazi.dayMasterWuxing}中和，五行俱全，宜保持平衡。`;
    }
    unfavorableElements = mostExcessive;
  }
  
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
  
  const uniqueChars = [...new Set(charList)];
  
  try {
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
  
  const charsData = await queryCharsWuxing(givenName.split(""));
  
  const wuxingCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  charsData.forEach((cd) => {
    if (cd.wuxing && wuxingCount[cd.wuxing] !== undefined) {
      wuxingCount[cd.wuxing]++;
    }
  });
  
  const complementedElements = preference.favorableElements.filter(
    (wx) => wuxingCount[wx] && wuxingCount[wx] > 0
  );
  const conflictingElements = preference.unfavorableElements.filter(
    (wx) => wuxingCount[wx] && wuxingCount[wx] > 0
  );
  
  let score = 50;
  score += complementedElements.length * 15;
  score -= conflictingElements.length * 15;
  
  const allNameWuxing = Object.entries(wuxingCount)
    .filter(([_, c]) => c > 0)
    .map(([wx]) => wx);
  const hasOnlyFavorable = allNameWuxing.every(
    (wx) => preference.favorableElements.includes(wx) || !preference.unfavorableElements.includes(wx)
  );
  if (hasOnlyFavorable && allNameWuxing.length > 0) score += 10;
  
  const complementedMissing = preference.missingElements.filter(
    (wx) => wuxingCount[wx] && wuxingCount[wx] > 0
  );
  score += complementedMissing.length * 10;
  
  score = Math.max(0, Math.min(100, score));
  
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