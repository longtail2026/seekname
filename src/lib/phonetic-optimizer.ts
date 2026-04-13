/**
 * 音律优化算法模块
 * 
 * 功能：
 * 1. 平仄检查 - 检查名字的平仄搭配
 * 2. 声韵和谐 - 检查声母和韵母的搭配
 * 3. 音调流畅 - 检查音调变化的流畅性
 * 4. 方言谐音 - 检查常见方言的谐音问题
 * 5. 音律评分 - 为名字提供音律评分
 */

import { CharacterInfo } from "./naming-engine";

// 拼音到音调的映射
const PINYIN_TONE_MAP: Record<string, number> = {
  // 第一声（阴平）
  'ā': 1, 'ē': 1, 'ī': 1, 'ō': 1, 'ū': 1, 'ǖ': 1,
  // 第二声（阳平）
  'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2, 'ǘ': 2,
  // 第三声（上声）
  'ǎ': 3, 'ě': 3, 'ǐ': 3, 'ǒ': 3, 'ǔ': 3, 'ǚ': 3,
  // 第四声（去声）
  'à': 4, 'è': 4, 'ì': 4, 'ò': 4, 'ù': 4, 'ǜ': 4,
  // 轻声
  'a': 0, 'e': 0, 'i': 0, 'o': 0, 'u': 0, 'ü': 0,
};

// 声母分类
const INITIAL_CATEGORIES = {
  // 爆破音
  explosive: ['b', 'p', 'd', 't', 'g', 'k'],
  // 摩擦音
  fricative: ['f', 'h', 'x', 's', 'sh', 'r'],
  // 塞擦音
  affricate: ['z', 'c', 'zh', 'ch', 'j', 'q'],
  // 鼻音
  nasal: ['m', 'n'],
  // 边音
  lateral: ['l'],
  // 零声母
  zero: ['y', 'w', ''],
};

// 韵母分类
const FINAL_CATEGORIES = {
  // 开口呼
  open: ['a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'],
  // 齐齿呼
  even: ['i', 'ia', 'ie', 'iao', 'iou', 'ian', 'in', 'iang', 'ing', 'iong'],
  // 合口呼
  closed: ['u', 'ua', 'uo', 'uai', 'uei', 'uan', 'uen', 'uang', 'ueng'],
  // 撮口呼
  rounded: ['ü', 'üe', 'üan', 'ün'],
};

// 不和谐的声母组合
const DISHARMONIOUS_INITIAL_PAIRS = [
  // 相同或相似的声母
  ['b', 'p'], ['p', 'b'],
  ['d', 't'], ['t', 'd'],
  ['g', 'k'], ['k', 'g'],
  ['z', 'c'], ['c', 'z'],
  ['zh', 'ch'], ['ch', 'zh'],
  ['j', 'q'], ['q', 'j'],
  // 发音部位相近的声母
  ['s', 'sh'], ['sh', 's'],
  ['z', 'zh'], ['zh', 'z'],
  ['c', 'ch'], ['ch', 'c'],
];

// 不和谐的韵母组合
const DISHARMONIOUS_FINAL_PAIRS = [
  // 相同或相似的韵母
  ['an', 'ang'], ['ang', 'an'],
  ['en', 'eng'], ['eng', 'en'],
  ['in', 'ing'], ['ing', 'in'],
  ['ian', 'iang'], ['iang', 'ian'],
  ['uan', 'uang'], ['uang', 'uan'],
];

// 方言谐音检查（常见方言）
const DIALECT_HOMOPHONES = {
  // 粤语
  cantonese: {
    '诗': '屎', '思': '死', '福': '服', '发': '法',
    '辉': '灰', '豪': '号', '文': '蚊', '明': '命',
  },
  // 闽南语
  minnan: {
    '春': '存', '秋': '抽', '冬': '东', '夏': '下',
    '花': '发', '月': '越', '日': '一', '星': '生',
  },
  // 四川话
  sichuan: {
    '四': '十', '事': '是', '师': '司', '市': '时',
    '石': '食', '实': '湿', '世': '势', '示': '士',
  },
};

/**
 * 提取拼音的声母
 */
export function extractInitial(pinyin: string): string {
  if (!pinyin) return '';
  
  const pinyinLower = pinyin.toLowerCase().trim();
  
  // 常见的声母
  const initials = [
    'zh', 'ch', 'sh',
    'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
    'g', 'k', 'h', 'j', 'q', 'x',
    'z', 'c', 's', 'r', 'y', 'w'
  ];
  
  for (const init of initials) {
    if (pinyinLower.startsWith(init)) {
      return init;
    }
  }
  
  // 如果没有匹配的声母，可能是零声母
  return '';
}

/**
 * 提取拼音的韵母
 */
export function extractFinal(pinyin: string): string {
  if (!pinyin) return '';
  
  const pinyinLower = pinyin.toLowerCase().trim();
  const initial = extractInitial(pinyinLower);
  
  // 移除声母部分
  let final = pinyinLower;
  if (initial && pinyinLower.startsWith(initial)) {
    final = pinyinLower.slice(initial.length);
  }
  
  // 移除音调数字
  final = final.replace(/[1-5]/g, '');
  
  // 移除音调符号
  const toneSymbols = ['ā', 'á', 'ǎ', 'à', 'ē', 'é', 'ě', 'è', 'ī', 'í', 'ǐ', 'ì',
                      'ō', 'ó', 'ǒ', 'ò', 'ū', 'ú', 'ǔ', 'ù', 'ǖ', 'ǘ', 'ǚ', 'ǜ'];
  for (const symbol of toneSymbols) {
    const base = symbol.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    final = final.replace(new RegExp(symbol, 'g'), base);
  }
  
  return final;
}

/**
 * 提取拼音的音调
 */
export function extractTone(pinyin: string): number {
  if (!pinyin) return 0;
  
  // 检查音调符号
  for (const [symbol, tone] of Object.entries(PINYIN_TONE_MAP)) {
    if (pinyin.includes(symbol)) {
      return tone;
    }
  }
  
  // 检查音调数字（在末尾）
  const match = pinyin.match(/[1-4]$/);
  if (match) {
    return parseInt(match[0]);
  }
  
  // 默认轻声
  return 0;
}

/**
 * 检查平仄搭配
 * 规则：平声（第一、二声） vs 仄声（第三、四声）
 */
export function checkPingze(tone1: number, tone2: number): {
  isHarmonious: boolean;
  pattern: string;
  score: number;
} {
  const isPing1 = tone1 === 1 || tone1 === 2;
  const isPing2 = tone2 === 1 || tone2 === 2;
  const isZe1 = tone1 === 3 || tone1 === 4;
  const isZe2 = tone2 === 3 || tone2 === 4;
  
  // 平仄模式
  let pattern = '';
  if (isPing1 && isZe2) pattern = '平仄';
  else if (isZe1 && isPing2) pattern = '仄平';
  else if (isPing1 && isPing2) pattern = '平平';
  else if (isZe1 && isZe2) pattern = '仄仄';
  else pattern = '其他';
  
  // 评分：平仄或仄平最佳，平平次之，仄仄最差
  let score = 0;
  if (pattern === '平仄' || pattern === '仄平') {
    score = 100; // 最佳搭配
  } else if (pattern === '平平') {
    score = 70; // 中等
  } else if (pattern === '仄仄') {
    score = 40; // 较差
  } else {
    score = 50; // 中性
  }
  
  const isHarmonious = score >= 60;
  
  return { isHarmonious, pattern, score };
}

/**
 * 检查声母和谐度
 */
export function checkInitialHarmony(initial1: string, initial2: string): {
  isHarmonious: boolean;
  category1: string;
  category2: string;
  score: number;
} {
  // 查找声母类别
  let category1 = 'unknown';
  let category2 = 'unknown';
  
  for (const [category, initials] of Object.entries(INITIAL_CATEGORIES)) {
    if (initials.includes(initial1)) category1 = category;
    if (initials.includes(initial2)) category2 = category;
  }
  
  // 检查不和谐组合
  let isHarmonious = true;
  let score = 80; // 默认良好
  
  for (const [bad1, bad2] of DISHARMONIOUS_INITIAL_PAIRS) {
    if ((initial1 === bad1 && initial2 === bad2) || 
        (initial1 === bad2 && initial2 === bad1)) {
      isHarmonious = false;
      score = 30;
      break;
    }
  }
  
  // 相同声母（除了零声母）
  if (initial1 === initial2 && initial1 !== '' && initial1 !== 'y' && initial1 !== 'w') {
    isHarmonious = false;
    score = 20;
  }
  
  // 相同类别但不是零声母
  if (category1 === category2 && category1 !== 'zero' && category1 !== 'unknown') {
    score = Math.min(score, 60);
    if (score < 60) isHarmonious = false;
  }
  
  return { isHarmonious, category1, category2, score };
}

/**
 * 检查韵母和谐度
 */
export function checkFinalHarmony(final1: string, final2: string): {
  isHarmonious: boolean;
  category1: string;
  category2: string;
  score: number;
} {
  // 查找韵母类别
  let category1 = 'unknown';
  let category2 = 'unknown';
  
  for (const [category, finals] of Object.entries(FINAL_CATEGORIES)) {
    if (finals.includes(final1)) category1 = category;
    if (finals.includes(final2)) category2 = category;
  }
  
  // 检查不和谐组合
  let isHarmonious = true;
  let score = 80; // 默认良好
  
  for (const [bad1, bad2] of DISHARMONIOUS_FINAL_PAIRS) {
    if ((final1 === bad1 && final2 === bad2) || 
        (final1 === bad2 && final2 === bad1)) {
      isHarmonious = false;
      score = 40;
      break;
    }
  }
  
  // 相同韵母
  if (final1 === final2 && final1 !== '') {
    isHarmonious = false;
    score = 20;
  }
  
  // 相同类别
  if (category1 === category2 && category1 !== 'unknown') {
    score = Math.min(score, 70);
    if (score < 60) isHarmonious = false;
  }
  
  return { isHarmonious, category1, category2, score };
}

/**
 * 检查音调流畅性（三字名）
 */
export function checkToneFluency(tones: number[]): {
  isFluid: boolean;
  pattern: string;
  score: number;
  suggestions: string[];
} {
  if (tones.length < 2) {
    return { isFluid: true, pattern: '', score: 100, suggestions: [] };
  }
  
  const suggestions: string[] = [];
  let score = 100;
  
  // 检查是否有连续相同的音调
  for (let i = 0; i < tones.length - 1; i++) {
    if (tones[i] === tones[i + 1] && tones[i] !== 0) {
      score -= 20;
      suggestions.push(`第${i + 1}字和第${i + 2}字音调相同（${tones[i]}声），建议调整`);
    }
  }
  
  // 检查是否有连续三个仄声
  if (tones.length >= 3) {
    const zeCount = tones.filter(t => t === 3 || t === 4).length;
    if (zeCount >= 3) {
      score -= 15;
      suggestions.push('仄声字过多，读起来可能不够流畅');
    }
  }
  
  // 检查音调变化模式
  const pattern = tones.map(t => {
    if (t === 1 || t === 2) return '平';
    if (t === 3 || t === 4) return '仄';
    return '轻';
  }).join('');
  
  // 经典音调模式（高分）
  const classicPatterns = ['平仄平', '仄平仄', '平仄仄平', '仄平平仄'];
  if (classicPatterns.includes(pattern)) {
    score += 10;
  }
  
  const isFluid = score >= 70;
  
  return { isFluid, pattern, score, suggestions };
}

/**
 * 获取方言名称
 */
function getDialectName(dialectKey: string): string {
  const dialectNames: Record<string, string> = {
    'cantonese': '粤语',
    'minnan': '闽南语',
    'sichuan': '四川话',
  };
  return dialectNames[dialectKey] || dialectKey;
}

/**
 * 检查方言谐音
 */
export function checkDialectHomophones(
  characters: string[],
  pinyins: string[]
): {
  hasHomophone: boolean;
  warnings: string[];
  score: number;
} {
  const warnings: string[] = [];
  let score = 100;
  
  // 检查每个方言
  for (const [dialectKey, homophoneMap] of Object.entries(DIALECT_HOMOPHONES)) {
    const dialectName = getDialectName(dialectKey);
    const typedHomophoneMap = homophoneMap as Record<string, string>;
    
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      if (typedHomophoneMap[char]) {
        const warning = `在${dialectName}中，"${char}"可能谐音"${typedHomophoneMap[char]}"`;
        warnings.push(warning);
        score -= 15;
      }
    }
  }
  
  // 检查整个名字的谐音
  const fullPinyin = pinyins.join(' ');
  
  // 常见的不吉利谐音
  const badHomophones = [
    { pattern: 'si', meaning: '死' },
    { pattern: 'wang', meaning: '亡' },
    { pattern: 'bai', meaning: '败' },
    { pattern: 'po', meaning: '破' },
    { pattern: 'can', meaning: '残' },
    { pattern: 'yao', meaning: '妖' },
    { pattern: 'gui', meaning: '鬼' },
  ];
  
  for (const { pattern, meaning } of badHomophones) {
    if (fullPinyin.toLowerCase().includes(pattern)) {
      warnings.push(`名字拼音可能谐音"${meaning}"（${pattern}）`);
      score -= 20;
    }
  }
  
  const hasHomophone = warnings.length > 0;
  
  return { hasHomophone, warnings, score };
}

/**
 * 综合音律评估
 */
export function evaluatePhoneticQuality(
  characters: CharacterInfo[]
): {
  overallScore: number;
  breakdown: {
    pingze: number;
    initialHarmony: number;
    finalHarmony: number;
    toneFluency: number;
    dialectSafety: number;
  };
  isHarmonious: boolean;
  warnings: string[];
  suggestions: string[];
} {
  if (characters.length < 2) {
    return {
      overallScore: 100,
      breakdown: {
        pingze: 100,
        initialHarmony: 100,
        finalHarmony: 100,
        toneFluency: 100,
        dialectSafety: 100,
      },
      isHarmonious: true,
      warnings: [],
      suggestions: [],
    };
  }
  
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // 提取拼音信息
  const pinyins = characters.map(c => c.pinyin || '');
  const tones = pinyins.map(extractTone);
  const initials = pinyins.map(extractInitial);
  const finals = pinyins.map(extractFinal);
  const charStrings = characters.map(c => c.character);
  
  // 1. 平仄评估（两两检查）
  let pingzeScores: number[] = [];
  for (let i = 0; i < tones.length - 1; i++) {
    const pingzeResult = checkPingze(tones[i], tones[i + 1]);
    pingzeScores.push(pingzeResult.score);
    if (!pingzeResult.isHarmonious) {
      warnings.push(`第${i + 1}字和第${i + 2}字平仄搭配不够和谐（${pingzeResult.pattern}）`);
    }
  }
  const avgPingzeScore = pingzeScores.length > 0 
    ? Math.round(pingzeScores.reduce((a, b) => a + b, 0) / pingzeScores.length)
    : 100;
  
  // 2. 声母和谐度评估
  let initialScores: number[] = [];
  for (let i = 0; i < initials.length - 1; i++) {
    const initialResult = checkInitialHarmony(initials[i], initials[i + 1]);
    initialScores.push(initialResult.score);
    if (!initialResult.isHarmonious) {
      warnings.push(`第${i + 1}字和第${i + 2}字声母搭配不够和谐`);
    }
  }
  const avgInitialScore = initialScores.length > 0
    ? Math.round(initialScores.reduce((a, b) => a + b, 0) / initialScores.length)
    : 100;
  
  // 3. 韵母和谐度评估
  let finalScores: number[] = [];
  for (let i = 0; i < finals.length - 1; i++) {
    const finalResult = checkFinalHarmony(finals[i], finals[i + 1]);
    finalScores.push(finalResult.score);
    if (!finalResult.isHarmonious) {
      warnings.push(`第${i + 1}字和第${i + 2}字韵母搭配不够和谐`);
    }
  }
  const avgFinalScore = finalScores.length > 0
    ? Math.round(finalScores.reduce((a, b) => a + b, 0) / finalScores.length)
    : 100;
  
  // 4. 音调流畅性评估
  const toneFluencyResult = checkToneFluency(tones);
  const toneFluencyScore = toneFluencyResult.score;
  suggestions.push(...toneFluencyResult.suggestions);
  
  // 5. 方言谐音评估
  const dialectResult = checkDialectHomophones(charStrings, pinyins);
  const dialectSafetyScore = dialectResult.score;
  warnings.push(...dialectResult.warnings);
  
  // 计算综合分数（加权平均）
  const overallScore = Math.round(
    avgPingzeScore * 0.25 +
    avgInitialScore * 0.20 +
    avgFinalScore * 0.20 +
    toneFluencyScore * 0.20 +
    dialectSafetyScore * 0.15
  );
  
  const isHarmonious = overallScore >= 70;
  
  return {
    overallScore,
    breakdown: {
      pingze: avgPingzeScore,
      initialHarmony: avgInitialScore,
      finalHarmony: avgFinalScore,
      toneFluency: toneFluencyScore,
      dialectSafety: dialectSafetyScore,
    },
    isHarmonious,
    warnings,
    suggestions,
  };
}

/**
 * 优化名字音律 - 重新排列字符以获得更好的音律
 */
export function optimizePhoneticOrder(
  characters: CharacterInfo[]
): CharacterInfo[] {
  if (characters.length <= 2) {
    return characters; // 两个字不需要优化顺序
  }
  
  // 生成所有可能的排列
  const permutations: CharacterInfo[][] = [];
  
  // 对于三字名，生成所有排列
  if (characters.length === 3) {
    const [a, b, c] = characters;
    permutations.push([a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]);
  } else {
    // 对于更多字，只尝试有限排列
    permutations.push([...characters]);
    // 尝试交换相邻字符
    for (let i = 0; i < characters.length - 1; i++) {
      const swapped = [...characters];
      [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
      permutations.push(swapped);
    }
  }
  
  // 评估每个排列的音律质量
  let bestPermutation = characters;
  let bestScore = -1;
  
  for (const perm of permutations) {
    const evaluation = evaluatePhoneticQuality(perm);
    if (evaluation.overallScore > bestScore) {
      bestScore = evaluation.overallScore;
      bestPermutation = perm;
    }
  }
  
  return bestPermutation;
}

/**
 * 音律优化工具集
 */
export const PhoneticOptimizer = {
  extractInitial,
  extractFinal,
  extractTone,
  checkPingze,
  checkInitialHarmony,
  checkFinalHarmony,
  checkToneFluency,
  checkDialectHomophones,
  evaluatePhoneticQuality,
  optimizePhoneticOrder,
};
