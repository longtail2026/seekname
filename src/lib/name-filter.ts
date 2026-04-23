/**
 * 名字过滤模块
 * 改进的过滤逻辑，符合以下要求：
 * 1. 滤除发音困难的字词
 * 2. 滤除发音有歧义的字词
 * 3. 滤除笔画在25笔以上的多笔画字
 * 4. 滤除生僻字
 * 5. 滤除起名中常见的忌讳字
 * 6. 滤除有负面含义的字词
 * 
 * 注意：不使用原来的敏感词库，采用更合理的过滤规则
 */

import { PhoneticOptimizer } from "./phonetic-optimizer";

// 生成的候选名字接口
export interface GeneratedName {
  name: string; // 完整名字（含姓）
  givenName: string; // 名（不含姓）
  pinyin: string; // 拼音（带声调）
  meaning: string; // 寓意说明
  reason: string; // 符合客户需求的理由
  score?: number; // 评分
}

// 过滤结果接口
export interface FilterResult {
  passed: GeneratedName[];
  removed: Array<{
    name: string;
    reason: string;
  }>;
}

// 笔画数数据（简化版，实际应从数据库获取）
const STROKE_COUNT_MAP: Record<string, number> = {
  // 常用字的笔画数（示例）
  "一": 1, "二": 2, "三": 3, "四": 5, "五": 4, "六": 4, "七": 2, "八": 2, "九": 2, "十": 2,
  "智": 12, "慧": 15, "仁": 4, "义": 3, "德": 15, "善": 12, "勇": 9, "刚": 6, "强": 12, "成": 6,
  "功": 5, "健": 10, "康": 11, "安": 6, "宁": 5, "快": 7, "乐": 5, "欣": 8, "悦": 10, "雅": 12,
  "婉": 11, "淑": 11, "静": 14, "柔": 9, "美": 9, "丽": 7, "婷": 12, "芸": 7, "兰": 5, "芳": 7,
  "芷": 7, "馨": 20, "怡": 8, "媛": 12, "婕": 11, "娅": 9, "嫣": 14, "伟": 6, "雄": 12, "豪": 14,
  "杰": 8, "俊": 9, "博": 12, "文": 4, "韬": 14, "略": 11, "宇": 6, "轩": 7, "浩": 10, "泽": 8,
  "涛": 10, "峰": 10, "岩": 8, "磊": 15, "森": 12, "铭": 11, "锦": 13, "钧": 9, "铮": 11, "铄": 10,
  "钰": 10, "锐": 12, "锋": 12, "瑞": 13, "璋": 15, "珞": 10, "瑜": 13, "铎": 10, "锡": 13, "铠": 11,
  "林": 8, "桐": 10, "楠": 13, "梓": 11, "柏": 9, "松": 8, "桦": 10, "柳": 9, "梅": 11, "榆": 13,
  "槐": 13, "楷": 13, "桂": 10, "枫": 8, "涵": 11, "洋": 9, "清": 11, "源": 13, "沐": 7, "沛": 7,
  "润": 10, "澜": 15, "淳": 11, "溪": 13, "沁": 7, "瀚": 19, "炎": 8, "煜": 13, "炜": 8, "烨": 10,
  "熠": 15, "灿": 7, "炅": 8, "煦": 13, "燃": 16, "烽": 11, "焕": 11, "炫": 9, "耀": 20, "辉": 12,
  "灵": 7, "坤": 8, "培": 11, "基": 11, "城": 9, "垣": 9, "堂": 11, "均": 7, "圣": 5, "壤": 20,
  "坚": 7, "壁": 16, "堪": 12, "塘": 13, "增": 15, "墨": 15
};

// 常用字集合（用于判断生僻字）
const COMMON_CHARS = new Set([
  // 常用美好字（约300个）
  "智", "慧", "仁", "义", "德", "善", "勇", "刚", "强", "成", "功", 
  "健", "康", "安", "宁", "快", "乐", "欣", "悦", "雅", "婉", "淑", 
  "静", "柔", "美", "丽", "婷", "芸", "兰", "芳", "芷", "馨", "怡", 
  "媛", "婕", "娅", "嫣", "伟", "雄", "豪", "杰", "俊", "博", "文", 
  "韬", "略", "宇", "轩", "浩", "泽", "涛", "峰", "岩", "磊", "森",
  "铭", "锦", "钧", "铮", "铄", "钰", "锐", "锋", "瑞", "璋", "珞",
  "瑜", "铎", "锡", "铠", "林", "桐", "楠", "梓", "柏", "松", "桦",
  "柳", "梅", "榆", "槐", "楷", "桂", "枫", "涵", "泽", "洋", "涛",
  "浩", "清", "源", "沐", "沛", "润", "澜", "淳", "溪", "沁", "瀚",
  "炎", "煜", "炜", "烨", "熠", "灿", "炅", "煦", "燃", "烽", "焕",
  "炫", "耀", "辉", "灵", "坤", "培", "基", "城", "垣", "堂", "均",
  "圣", "壤", "坚", "壁", "堪", "塘", "增", "墨", "雨", "雪", "云",
  "风", "霜", "露", "霞", "虹", "霓", "星", "辰", "月", "日", "明",
  "阳", "光", "晨", "曦", "晓", "晚", "晴", "朗", "天", "地", "山",
  "川", "河", "海", "江", "湖", "泉", "溪", "流", "波", "浪", "涛",
  "石", "玉", "珠", "宝", "珍", "贵", "金", "银", "铜", "铁", "钢",
  "木", "林", "森", "树", "枝", "叶", "花", "草", "苗", "果", "实",
  "春", "夏", "秋", "冬", "年", "岁", "时", "节", "气", "候", "温",
  "暖", "凉", "冷", "热", "寒", "暑", "和", "平", "顺", "利", "吉",
  "祥", "福", "禄", "寿", "喜", "庆", "贺", "祝", "愿", "望", "期",
  "待", "梦", "想", "思", "念", "忆", "怀", "情", "感", "恩", "爱",
  "亲", "友", "朋", "谊", "信", "诚", "实", "真", "正", "直", "公",
  "平", "道", "理", "法", "律", "规", "矩", "方", "圆", "长", "短",
  "高", "低", "深", "浅", "远", "近", "大", "小", "多", "少", "轻",
  "重", "快", "慢", "早", "晚", "新", "旧", "老", "少", "男", "女",
  "父", "母", "子", "女", "兄", "弟", "姐", "妹", "夫", "妻", "君",
  "臣", "师", "生", "医", "士", "农", "工", "商", "学", "艺", "术"
]);

// 发音困难模式（声母/韵母连续相同）
const DIFFICULT_PRONUNCIATION_PATTERNS = [
  // 连续同声母
  /^[bpmf][bpmf]/,
  /^[dtnl][dtnl]/,
  /^[gkh][gkh]/,
  /^[jqx][jqx]/,
  /^[zhchsh][zhchsh]/,
  /^[zcs][zcs]/,
  // 连续同韵母
  /a{2,}/,
  /o{2,}/,
  /e{2,}/,
  /i{2,}/,
  /u{2,}/,
  /ü{2,}/
];

// 发音歧义模式（容易读错的拼音）
const AMBIGUOUS_PRONUNCIATION_PATTERNS = [
  // 容易混淆的拼音
  /^[jqx]u/, // ju, qu, xu 容易读错
  /^[zcs]i/, // zi, ci, si 容易读错
  /^[zhchsh]i/, // zhi, chi, shi 容易读错
  /^[nl]ü/, // nü, lü 容易读错
  /^[rl]/, // r, l 容易混淆
  /^[fh]/, // f, h 容易混淆
  /^[zcs][zhchsh]/, // 平翘舌混搭
  /^[nl][rl]/ // 鼻边音混搭
];

// 常见忌讳字（简化版，只包含明显负面含义）
const TABOO_CHARS = new Set([
  // 死亡疾病相关
  "死", "亡", "病", "痛", "伤", "残", "废", "疾", "瘟", "疫",
  // 负面情感
  "哀", "悲", "苦", "惨", "愁", "怨", "恨", "怒", "愤", "恼",
  // 邪恶负面
  "凶", "恶", "毒", "狠", "奸", "诈", "邪", "魔", "鬼", "妖",
  // 失败衰败
  "败", "衰", "弱", "贫", "穷", "困", "难", "祸", "灾", "厄",
  // 其他明显负面
  "杀", "伤", "害", "损", "毁", "灭", "绝", "断", "裂", "破"
]);

// 负面含义词语（名字中应避免的组合）
const NEGATIVE_MEANINGS = [
  "失败", "死亡", "疾病", "痛苦", "悲伤", "贫穷", "灾难", "祸害",
  "邪恶", "凶恶", "奸诈", "毁灭", "断绝", "破碎", "衰落", "衰弱"
];

/**
 * 获取字的笔画数
 */
function getStrokeCount(char: string): number {
  return STROKE_COUNT_MAP[char] || 10; // 默认10画
}

/**
 * 检查发音困难
 */
function checkPronunciationDifficulty(name: string, pinyin: string): {
  isDifficult: boolean;
  reason: string;
} {
  const givenName = name.slice(1);
  if (givenName.length < 2) {
    return { isDifficult: false, reason: "" };
  }
  
  const pinyinLower = pinyin.toLowerCase();
  
  // 检查发音困难模式
  for (const pattern of DIFFICULT_PRONUNCIATION_PATTERNS) {
    if (pattern.test(pinyinLower)) {
      return { 
        isDifficult: true, 
        reason: "发音困难：连续相同声母或韵母" 
      };
    }
  }
  
  // 检查发音歧义
  for (const pattern of AMBIGUOUS_PRONUNCIATION_PATTERNS) {
    if (pattern.test(pinyinLower)) {
      return { 
        isDifficult: true, 
        reason: "发音有歧义：容易读错的拼音组合" 
      };
    }
  }
  
  // 检查声调搭配
  const tones = pinyinLower.split(' ').map(syllable => {
    // 提取音调（简化版）
    if (syllable.includes('1')) return 1;
    if (syllable.includes('2')) return 2;
    if (syllable.includes('3')) return 3;
    if (syllable.includes('4')) return 4;
    return 0;
  });
  
  // 避免连续相同声调
  for (let i = 0; i < tones.length - 1; i++) {
    if (tones[i] > 0 && tones[i] === tones[i + 1]) {
      return { 
        isDifficult: true, 
        reason: "发音单调：连续相同声调" 
      };
    }
  }
  
  return { isDifficult: false, reason: "" };
}

/**
 * 检查负面含义
 */
function checkNegativeMeaning(name: string, meaning: string): {
  hasNegative: boolean;
  reason: string;
} {
  const givenName = name.slice(1);
  
  // 检查名字本身是否包含负面词语
  for (const negative of NEGATIVE_MEANINGS) {
    if (givenName.includes(negative)) {
      return { 
        hasNegative: true, 
        reason: `名字包含负面含义：${negative}` 
      };
    }
  }
  
  // 检查寓意说明是否包含负面词语
  const meaningLower = meaning.toLowerCase();
  const negativeKeywords = ["死", "亡", "病", "痛", "伤", "残", "败", "衰", "穷", "苦"];
  
  for (const keyword of negativeKeywords) {
    if (meaningLower.includes(keyword)) {
      return { 
        hasNegative: true, 
        reason: `寓意说明包含负面词语：${keyword}` 
      };
    }
  }
  
  return { hasNegative: false, reason: "" };
}

/**
 * 过滤名字
 */
export function filterNames(
  names: GeneratedName[],
  gender: "M" | "F" = "F"
): FilterResult {
  const passed: GeneratedName[] = [];
  const removed: Array<{name: string, reason: string}> = [];
  
  for (const name of names) {
    const givenName = name.name.slice(1); // 去掉姓氏
    let shouldRemove = false;
    let reason = "";
    
    // 1. 检查忌讳字
    for (const char of givenName) {
      if (TABOO_CHARS.has(char)) {
        shouldRemove = true;
        reason = `包含忌讳字: ${char}`;
        break;
      }
    }
    
    if (shouldRemove) {
      removed.push({ name: name.name, reason });
      continue;
    }
    
    // 2. 检查生僻字
    for (const char of givenName) {
      if (!COMMON_CHARS.has(char)) {
        shouldRemove = true;
        reason = `包含生僻字: ${char}`;
        break;
      }
    }
    
    if (shouldRemove) {
      removed.push({ name: name.name, reason });
      continue;
    }
    
    // 3. 检查笔画数（25画以上）
    for (const char of givenName) {
      const strokeCount = getStrokeCount(char);
      if (strokeCount > 25) {
        shouldRemove = true;
        reason = `包含多笔画字: ${char}（${strokeCount}画）`;
        break;
      }
    }
    
    if (shouldRemove) {
      removed.push({ name: name.name, reason });
      continue;
    }
    
    // 4. 检查发音困难
    const pronResult = checkPronunciationDifficulty(name.name, name.pinyin);
    if (pronResult.isDifficult) {
      removed.push({ name: name.name, reason: pronResult.reason });
      continue;
    }
    
    // 5. 检查负面含义
    const negativeResult = checkNegativeMeaning(name.name, name.meaning);
    if (negativeResult.hasNegative) {
      removed.push({ name: name.name, reason: negativeResult.reason });
      continue;
    }
    
    // 6. 检查发音歧义（已在checkPronunciationDifficulty中检查）
    
    // 所有检查通过
    passed.push(name);
  }
  
  return { passed, removed };
}

/**
 * 增强过滤：更严格的过滤逻辑
 */
export function enhancedFilterNames(
  names: GeneratedName[],
  gender: "M" | "F" = "F"
): FilterResult {
  const passed: GeneratedName[] = [];
  const removed: Array<{name: string, reason: string}> = [];
  
  for (const name of names) {
    const givenName = name.name.slice(1);
    let shouldRemove = false;
    let reason = "";
    
    // 1. 基本过滤
    const basicResult = filterNames([name], gender);
    if (basicResult.removed.length > 0) {
      removed.push(...basicResult.removed);
      continue;
    }
    
    // 2. 增强检查：避免谐音不吉利
    const pinyinLower = name.pinyin.toLowerCase();
    const badHomophones = [
      "si", "si4", // 死
      "wang", "wang4", // 亡
      "bai", "bai2", // 败
      "po", "po4", // 破
      "can", "can2", // 残
      "shuai", "shuai4", // 衰
      "qiong", "qiong2", // 穷
      "ku", "ku3" // 苦
    ];
    
    for (const homophone of badHomophones) {
      if (pinyinLower.includes(homophone)) {
        shouldRemove = true;
        reason = `谐音不吉利: ${homophone}`;
        break;
      }
    }
    
    if (shouldRemove) {
      removed.push({ name: name.name, reason });
      continue;
    }
    
    // 3. 增强检查：避免过于复杂的名字
    const totalStrokes = givenName.split('').reduce((sum, char) => sum + getStrokeCount(char), 0);
    if (totalStrokes > 40) {
      removed.push({ name: name.name, reason: `总笔画数过多: ${totalStrokes}画` });
      continue;
    }
    
    // 4. 增强检查：避免过于简单的名字（缺乏文化内涵）
    if (givenName.length === 1 && getStrokeCount(givenName) < 5) {
      removed.push({ name: name.name, reason: "名字过于简单，缺乏文化内涵" });
      continue;
    }
    
    // 所有检查通过
    passed.push(name);
  }
  
  return { passed, removed };
}

/**
 * 批量过滤名字
 */
export function batchFilterNames(
  names: GeneratedName[],
  useEnhanced: boolean = false,
  gender: "M" | "F" = "F"
): FilterResult {
  if (useEnhanced) {
    return enhancedFilterNames(names, gender);
  } else {
    return filterNames(names, gender);
  }
}

// 导出工具函数
export const NameFilter = {
  filterNames,
  enhancedFilterNames,
  batchFilterNames,
  checkPronunciationDifficulty,
  checkNegativeMeaning,
  getStrokeCount
};