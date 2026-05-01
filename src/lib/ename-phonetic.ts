/**
 * 中文拼音 ↔ 英文名音标发音匹配引擎 v2
 * 
 * 核心改进：使用 IPA 音标（国际音标）进行发音匹配，而非文本字符串匹配。
 * 
 * 匹配逻辑：
 * 1. 中文名字 → 按字拆分 → 每个字转为拼音音节
 * 2. 拼音音节 → IPA 近似音素序列（如 "guo" → /ɡ/ + /w/ + /ɔ/）
 * 3. 英文名 → 使用词典中已有的 IPA 音标字段（如 Gordon → /ɡɔːrdən/）
 * 4. 音素序列之间计算相似度：辅音匹配 + 元音匹配 + 音节数匹配
 */
import { getAllRecords, type EnameRecord } from "./ename-dict";

// ========== 汉字 → 拼音映射表 ==========

const CHAR_PINYIN_MAP: Record<string, string> = {
  // 姓氏
  '李': 'li', '王': 'wang', '张': 'zhang', '刘': 'liu', '陈': 'chen',
  '杨': 'yang', '赵': 'zhao', '黄': 'huang', '周': 'zhou', '吴': 'wu',
  '徐': 'xu', '孙': 'sun', '马': 'ma', '胡': 'hu', '朱': 'zhu',
  '郭': 'guo', '何': 'he', '罗': 'luo', '高': 'gao', '林': 'lin',
  '梁': 'liang', '郑': 'zheng', '谢': 'xie', '宋': 'song', '唐': 'tang',
  '许': 'xu', '韩': 'han', '冯': 'feng', '邓': 'deng', '曹': 'cao',
  '彭': 'peng', '曾': 'zeng', '萧': 'xiao', '田': 'tian', '董': 'dong',
  '潘': 'pan', '袁': 'yuan', '蔡': 'cai', '蒋': 'jiang', '余': 'yu',
  '叶': 'ye', '程': 'cheng', '苏': 'su', '吕': 'lv', '魏': 'wei',
  '丁': 'ding', '沈': 'shen', '任': 'ren', '姚': 'yao', '卢': 'lu',
  '傅': 'fu', '钟': 'zhong', '崔': 'cui', '汪': 'wang', '范': 'fan',
  '陆': 'lu', '廖': 'liao', '杜': 'du', '方': 'fang', '石': 'shi',
  '熊': 'xiong', '金': 'jin', '邱': 'qiu', '侯': 'hou', '白': 'bai',
  '江': 'jiang', '史': 'shi', '龙': 'long', '万': 'wan', '段': 'duan',
  '雷': 'lei', '钱': 'qian', '汤': 'tang', '尹': 'yin', '易': 'yi',
  '常': 'chang', '武': 'wu', '乔': 'qiao', '贺': 'he', '赖': 'lai',
  '龚': 'gong', '文': 'wen', '欧': 'ou',
  // 名用字
  '爱': 'ai', '安': 'an', '奥': 'ao',
  '柏': 'bai', '宝': 'bao', '博': 'bo', '斌': 'bin', '波': 'bo',
  '才': 'cai', '彩': 'cai', '灿': 'can', '晨': 'chen', '成': 'cheng', '超': 'chao', '春': 'chun', '崇': 'chong',
  '达': 'da', '丹': 'dan', '德': 'de', '东': 'dong', '栋': 'dong', '冬': 'dong',
  '恩': 'en', '尔': 'er',
  '发': 'fa', '芳': 'fang', '菲': 'fei', '芬': 'fen', '丰': 'feng', '福': 'fu', '芙': 'fu', '飞': 'fei', '峰': 'feng',
  '光': 'guang', '国': 'guo', '刚': 'gang', '冠': 'guan', '广': 'guang',
  '海': 'hai', '涵': 'han', '晗': 'han', '浩': 'hao', '皓': 'hao', '华': 'hua', '辉': 'hui', '慧': 'hui', '红': 'hong', '鸿': 'hong', '欢': 'huan',
  '佳': 'jia', '嘉': 'jia', '杰': 'jie', '洁': 'jie', '景': 'jing', '静': 'jing', '君': 'jun', '俊': 'jun', '吉': 'ji', '建': 'jian', '健': 'jian', '晶': 'jing',
  '凯': 'kai', '可': 'ke', '坤': 'kun', '康': 'kang', '珂': 'ke',
  '兰': 'lan', '朗': 'lang', '乐': 'le', '磊': 'lei', '丽': 'li', '莉': 'li', '琳': 'lin', '玲': 'ling', '露': 'lu',
  '洛': 'luo', '亮': 'liang', '莲': 'lian', '路': 'lu', '立': 'li',
  '曼': 'man', '梅': 'mei', '美': 'mei', '梦': 'meng', '敏': 'min', '明': 'ming', '铭': 'ming', '萌': 'meng', '木': 'mu', '慕': 'mu',
  '楠': 'nan', '宁': 'ning', '诺': 'nuo', '娜': 'na', '妮': 'ni',
  '佩': 'pei', '鹏': 'peng', '萍': 'ping', '璞': 'pu', '平': 'ping',
  '琪': 'qi', '琦': 'qi', '启': 'qi', '倩': 'qian', '晴': 'qing', '秋': 'qiu', '群': 'qun', '强': 'qiang', '勤': 'qin', '泉': 'quan',
  '然': 'ran', '仁': 'ren', '荣': 'rong', '蓉': 'rong', '瑞': 'rui', '润': 'run', '若': 'ruo', '茹': 'ru',
  '珊': 'shan', '诗': 'shi', '姝': 'shu', '淑': 'shu', '思': 'si', '松': 'song', '山': 'shan', '深': 'shen', '胜': 'sheng', '盛': 'sheng', '双': 'shuang', '顺': 'shun',
  '涛': 'tao', '天': 'tian', '恬': 'tian', '彤': 'tong', '庭': 'ting',
  '婉': 'wan', '威': 'wei', '薇': 'wei', '维': 'wei', '伟': 'wei', '雯': 'wen', '望': 'wang', '为': 'wei', '卫': 'wei',
  '西': 'xi', '希': 'xi', '溪': 'xi', '熙': 'xi', '曦': 'xi', '潇': 'xiao', '晓': 'xiao', '欣': 'xin', '星': 'xing',
  '轩': 'xuan', '萱': 'xuan', '璇': 'xuan', '雪': 'xue', '霞': 'xia', '祥': 'xiang', '翔': 'xiang', '向': 'xiang',
  '新': 'xin', '信': 'xin', '兴': 'xing', '雄': 'xiong', '秀': 'xiu',
  '雅': 'ya', '阳': 'yang', '瑶': 'yao', '伊': 'yi', '依': 'yi', '怡': 'yi', '艺': 'yi', '英': 'ying', '莹': 'ying',
  '宇': 'yu', '雨': 'yu', '玉': 'yu', '元': 'yuan', '悦': 'yue', '云': 'yun', '燕': 'yan', '艳': 'yan', '耀': 'yao',
  '业': 'ye', '义': 'yi', '益': 'yi', '毅': 'yi', '勇': 'yong', '友': 'you', '语': 'yu', '育': 'yu', '岳': 'yue', '韵': 'yun',
  '泽': 'ze', '哲': 'zhe', '珍': 'zhen', '振': 'zhen', '正': 'zheng', '志': 'zhi', '智': 'zhi', '中': 'zhong',
  '子': 'zi', '紫': 'zi', '卓': 'zhuo', '宗': 'zong', '祖': 'zu', '真': 'zhen', '镇': 'zhen', '铮': 'zheng',
  '忠': 'zhong', '众': 'zhong', '壮': 'zhuang',
};

// ========== 拼音音节 → IPA 音素序列转换 ==========

/**
 * 将汉语拼音音节转为近似 IPA 音素序列
 * 
 * 例：
 *   "guo"  → ["ɡ", "w", "ɔ"]    (guo → g + uo → g + w + ɔ)
 *   "guang" → ["ɡ", "w", "ɑ", "ŋ"]  (guang → g + u + ang → g + w + ɑ + ŋ)
 *   "zhang" → ["dʒ", "ɑ", "ŋ"]    (zhang → zh + ang → dʒ + ɑ + ŋ)
 *   "li"   → ["l", "i"]
 *   "xiao" → ["ɕ", "j", "ɑ", "ʊ"] 
 */
function pinyinToIpaPhonemes(pinyin: string): string[] {
  if (!pinyin) return [];
  const lower = pinyin.toLowerCase().trim();

  // 声母（initial consonant）列表（按长度降序排列，优先匹配多字母声母）
  const initials = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];

  let initial = '';
  let rest = lower;
  for (const ic of initials) {
    if (lower.startsWith(ic)) {
      initial = ic;
      rest = lower.slice(ic.length);
      break;
    }
  }

  // 声母 → IPA 辅音映射
  const initialIpaMap: Record<string, string[]> = {
    'b': ['p'],        // 不送气清双唇塞音
    'p': ['pʰ'],       // 送气清双唇塞音
    'm': ['m'],
    'f': ['f'],
    'd': ['t'],        // 不送气清齿龈塞音
    't': ['tʰ'],       // 送气清齿龈塞音
    'n': ['n'],
    'l': ['l'],
    'g': ['ɡ'],        // 不送气清软腭塞音
    'k': ['kʰ'],       // 送气清软腭塞音
    'h': ['x', 'h'],
    'j': ['tɕ'],       // 不送气清龈腭塞擦音
    'q': ['tɕʰ'],      // 送气清龈腭塞擦音
    'x': ['ɕ'],
    'zh': ['tʂ', 'dʒ'], // 不送气卷舌塞擦音 / 英语 j 近似
    'ch': ['tʂʰ', 'tʃ'], // 送气卷舌塞擦音 / 英语 ch 近似
    'sh': ['ʂ', 'ʃ'],
    'r': ['ɻ', 'r'],
    'z': ['ts'],
    'c': ['tsʰ'],
    's': ['s'],
    'y': ['j'],
    'w': ['w'],
  };

  const initialPhonemes = initialIpaMap[initial] || [];

  // 韵母 → IPA 元音/辅音序列映射
  const finalIpaMap: Record<string, string[]> = {
    'a': ['ɑ'],
    'o': ['ɔ'],
    'e': ['ɤ', 'ə'],
    'i': ['i'],
    'u': ['u'],
    'v': ['y'],
    'ai': ['a', 'i'],
    'ei': ['e', 'i'],
    'ui': ['u', 'e', 'i'],
    'ao': ['ɑ', 'ʊ'],
    'ou': ['o', 'ʊ'],
    'iu': ['i', 'o', 'ʊ'],
    'ie': ['i', 'e'],
    've': ['y', 'e'],
    'er': ['ɚ'],
    'an': ['a', 'n'],
    'en': ['ə', 'n'],
    'in': ['i', 'n'],
    'un': ['u', 'ə', 'n'],
    'vn': ['y', 'n'],
    'ang': ['ɑ', 'ŋ'],
    'eng': ['ɤ', 'ŋ'],
    'ing': ['i', 'ŋ'],
    'ong': ['ʊ', 'ŋ'],
    'ian': ['i', 'ɛ', 'n'],
    'iang': ['i', 'ɑ', 'ŋ'],
    'iong': ['i', 'ʊ', 'ŋ'],
    'uan': ['u', 'a', 'n'],
    'uang': ['u', 'ɑ', 'ŋ'],
    'uo': ['u', 'ɔ', 'w', 'ɔ'],
    'ue': ['y', 'e'],
    'ia': ['i', 'a'],
    'iao': ['i', 'ɑ', 'ʊ'],
    'ua': ['u', 'a'],
    'uai': ['u', 'a', 'i'],
  };

  const finalPhonemes = finalIpaMap[rest] || (rest ? [rest] : []);

  // 合并结果为音素序列
  let combined: string[];
  if (initial === 'y' && finalPhonemes.length > 0 && finalPhonemes[0] === 'i') {
    combined = [...finalPhonemes];
  } else if (initial === 'w' && finalPhonemes.length > 0 && finalPhonemes[0] === 'u') {
    combined = [...finalPhonemes];
  } else {
    combined = [...initialPhonemes, ...finalPhonemes];
  }

  return combined.length > 0 ? combined : [lower];
}

/**
 * 将中文名字拆分为拼音音节，再转为 IPA 音素数组
 * 例："张国光" → [["dʒ","ɑ","ŋ"], ["ɡ","w","ɔ"], ["ɡ","w","ɑ","ŋ"]]
 */
function chineseNameToPhonemes(chineseName: string): string[][] {
  const chars = chineseName.replace(/\s/g, '').split('');
  const syllablePhonemes: string[][] = [];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const py = CHAR_PINYIN_MAP[char];
    if (py) {
      syllablePhonemes.push(pinyinToIpaPhonemes(py));
    } else {
      syllablePhonemes.push([char]);
    }
  }
  return syllablePhonemes;
}

// ========== 英文名音标解析 ==========

/**
 * 清理并标准化 IPA 音标字符串
 * 如 "/geilən/" → "geilən"
 */
function cleanIpaPhonetic(phonetic: string): string {
  if (!phonetic) return '';
  let result = phonetic.trim();
  result = result.replace(/^\/+|\/+$/g, '');
  result = result.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰ˈˌ]/g, '');
  return result.trim();
}

/**
 * 将 IPA 音标字符串切分为独立音素
 * 例："gɔːrdən" → ["ɡ", "ɔː", "r", "d", "ə", "n"]
 */
function ipaStringToPhonemes(ipaStr: string): string[] {
  if (!ipaStr) return [];
  const result: string[] = [];
  const chars = Array.from(ipaStr);
  let i = 0;
  while (i < chars.length) {
    const twoChars = i + 1 < chars.length ? chars[i] + chars[i + 1] : '';
    const threeChars = i + 2 < chars.length ? chars[i] + chars[i + 1] + chars[i + 2] : '';
    const multiCharIpa = ['tɕ', 'tʂ', 'tʃ', 'dʒ', 'tɕʰ', 'tʂʰ', 'a:', 'e:', 'i:', 'o:', 'u:', 'ə:', 'ɔ:', 'ɑ:', 'ɜ:', 'ɛ:', 'æ:', 'ɚ'];
    if (threeChars && multiCharIpa.includes(threeChars)) {
      result.push(threeChars);
      i += 3;
      continue;
    }
    if (twoChars && multiCharIpa.includes(twoChars)) {
      result.push(twoChars);
      i += 2;
      continue;
    }
    result.push(chars[i]);
    i++;
  }
  return result;
}

/**
 * 从 EnameRecord 中提取音素序列
 */
function getEnglishPhonemes(record: EnameRecord): string[] {
  if (record.phonetic) {
    const cleaned = cleanIpaPhonetic(record.phonetic);
    if (cleaned) {
      const phonemes = ipaStringToPhonemes(cleaned);
      if (phonemes.length > 0) return phonemes;
    }
  }
  return record.name.toLowerCase().split('');
}

// ========== 音素相似度计算 ==========

/**
 * 辅音相似度矩阵（按发音部位分组）
 */
const CONSONANT_GROUPS: Record<string, string[]> = {
  'bilabial': ['p', 'b', 'm', 'pʰ', 'bʰ'],
  'labiodental': ['f', 'v'],
  'dental': ['θ', 'ð'],
  'alveolar': ['t', 'd', 'n', 's', 'z', 'l', 'r', 'tʰ', 'dʰ', 'ts', 'dz', 'tsʰ'],
  'retroflex': ['tʂ', 'tʂʰ', 'ʂ', 'ʐ', 'ɻ'],
  'palatal': ['tɕ', 'tɕʰ', 'ɕ', 'j', 'ʝ'],
  'palato-alveolar': ['tʃ', 'dʒ', 'ʃ', 'ʒ'],
  'velar': ['k', 'ɡ', 'x', 'kʰ', 'ŋ', 'g', 'ɣ'],
  'glottal': ['h', 'ʔ', 'ɦ'],
  'approximant': ['w', 'j', 'ɻ', 'l', 'r'],
};

function getConsonantGroupIndex(phone: string): number {
  const groups = Object.values(CONSONANT_GROUPS);
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].includes(phone)) return i;
  }
  return -1;
}

const VOWEL_GROUPS: Record<string, string[]> = {
  'close_front': ['i', 'y', 'i:', 'y:'],
  'close_central': ['ɨ', 'ʉ', 'ɨ:', 'ʉ:'],
  'close_back': ['u', 'u:', 'ʊ'],
  'close_mid_front': ['e', 'ø', 'e:', 'ø:', 'ɪ'],
  'close_mid_central': ['ɘ', 'ɵ', 'ɘ:', 'ɵ:', 'ə'],
  'close_mid_back': ['o', 'ɤ', 'o:', 'ɤ:'],
  'open_mid_front': ['ɛ', 'œ', 'ɛ:', 'œ:'],
  'open_mid_central': ['ɜ', 'ɞ', 'ɜ:', 'ɞ:', 'ʌ'],
  'open_mid_back': ['ɔ', 'ɔ:'],
  'open_front': ['a', 'æ', 'a:', 'æ:'],
  'open_central': ['ä', 'ɐ', 'ä:', 'ɐ:'],
  'open_back': ['ɑ', 'ɒ', 'ɑ:', 'ɒ:'],
  'rhotic': ['ɚ', 'ɝ', 'ɚ:', 'ɝ:'],
};

function isVowel(phone: string): boolean {
  const base = phone.replace(/[ː:ʰʱ]/g, '');
  return /[aeiouæɑɒɔəɛɜɝɞɐɶɪʊʉɨʏøœɤɯʌɚ]/.test(base);
}

function isConsonant(phone: string): boolean {
  const base = phone.replace(/[ː:ʰʱʲʷ]/g, '');
  return /[bcdfghjklmnpqrstvwxzθðʃʒŋɲɳɴʀʁħʔɦɬɮʋβɣχⱱɾɽɸ]/.test(base) ||
         /[ʈɖɟɠɢʡʐʑɕʝɻ]/.test(base) ||
         /^[tɕtʂdʒtʃtsdz]/.test(base) || /[ɡ]/.test(base);
}

/**
 * 计算两个音素之间的相似度（0~1）
 */
function phonemeSimilarity(a: string, b: string): number {
  const aBase = a.replace(/[ː:ʰʱ]/g, '');
  const bBase = b.replace(/[ː:ʰʱ]/g, '');

  if (aBase === bBase) return 1.0;

  const aIsVowel = isVowel(aBase);
  const bIsVowel = isVowel(bBase);

  // 元音 vs 元音
  if (aIsVowel && bIsVowel) {
    for (const group of Object.values(VOWEL_GROUPS)) {
      if (group.includes(aBase) && group.includes(bBase)) return 0.8;
    }
    const vowelGroupKeys = Object.keys(VOWEL_GROUPS);
    for (let i = 0; i < vowelGroupKeys.length; i++) {
      const group = VOWEL_GROUPS[vowelGroupKeys[i]];
      const inA = group.includes(aBase);
      const inB = group.includes(bBase);
      if (inA && inB) return 0.8;
      if (inA || inB) {
        if (i > 0 && VOWEL_GROUPS[vowelGroupKeys[i - 1]].includes(bBase)) return 0.5;
        if (i < vowelGroupKeys.length - 1 && VOWEL_GROUPS[vowelGroupKeys[i + 1]].includes(bBase)) return 0.5;
        return 0.2;
      }
    }
    return 0.3;
  }

  // 辅音 vs 辅音
  const aCons = isConsonant(aBase);
  const bCons = isConsonant(bBase);
  if (aCons && bCons) {
    const groupAIdx = getConsonantGroupIndex(aBase);
    const groupBIdx = getConsonantGroupIndex(bBase);
    if (groupAIdx >= 0 && groupBIdx >= 0) {
      if (groupAIdx === groupBIdx) return 0.7;
      if (Math.abs(groupAIdx - groupBIdx) === 1) return 0.4;
    }
    if (['m', 'n', 'ŋ'].includes(aBase) && ['m', 'n', 'ŋ'].includes(bBase)) return 0.6;
    if (['l', 'r', 'ɻ'].includes(aBase) && ['l', 'r', 'ɻ'].includes(bBase)) return 0.6;
    if (['s', 'ʂ', 'ʃ', 'ɕ'].includes(aBase) && ['s', 'ʂ', 'ʃ', 'ɕ'].includes(bBase)) return 0.5;
    return 0.1;
  }

  // 半元音 w/j 与元音近似
  if ((a === 'w' && (b === 'u' || b === 'o' || b === 'ɔ')) ||
      (b === 'w' && (a === 'u' || a === 'o' || a === 'ɔ'))) {
    return 0.7;
  }
  if ((a === 'j' && (b === 'i' || b === 'e' || b === 'y')) ||
      (b === 'j' && (a === 'i' || a === 'e' || a === 'y'))) {
    return 0.7;
  }

  return 0;
}

// ========== 发音匹配评分（核心算法）==========

export interface PhoneticMatchResult {
  name: string;
  phoneticScore: number;
  phonemeMatchScore: number;
  syllableMatchScore: number;
  translationBonus: number;
  combinedScore: number;
}

/**
 * 计算中文名拼音音素序列与英文名 IPA 音素序列的匹配度
 */
function calcPhonemeSequenceMatch(
  chinesePhonemeSyllables: string[][],
  englishPhonemes: string[]
): number {
  if (chinesePhonemeSyllables.length === 0 || englishPhonemes.length === 0) return 0;

  const chineseFlat: string[] = chinesePhonemeSyllables.flat();
  const minLen = Math.min(chineseFlat.length, englishPhonemes.length);
  
  let bestMatchScore = 0;
  const windowSize = minLen;
  
  for (let offset = 0; offset <= Math.max(0, englishPhonemes.length - windowSize); offset++) {
    let matchSum = 0;
    for (let i = 0; i < windowSize; i++) {
      const ci = i < chineseFlat.length ? chineseFlat[i] : chineseFlat[chineseFlat.length - 1];
      const ei = (offset + i) < englishPhonemes.length ? englishPhonemes[offset + i] : englishPhonemes[englishPhonemes.length - 1];
      matchSum += phonemeSimilarity(ci, ei);
    }
    const avgMatch = matchSum / windowSize;
    if (avgMatch > bestMatchScore) {
      bestMatchScore = avgMatch;
    }
  }

  // 音节数匹配
  const chineseSyllableCount = chinesePhonemeSyllables.length;
  const englishSyllableCount = Math.max(1, Math.round(englishPhonemes.filter(p => isVowel(p)).length));
  const syllableDiff = Math.abs(chineseSyllableCount - englishSyllableCount);
  let syllableScore: number;
  if (syllableDiff === 0) syllableScore = 1.0;
  else if (syllableDiff === 1) syllableScore = 0.7;
  else if (syllableDiff === 2) syllableScore = 0.4;
  else syllableScore = 0.1;

  // 首音匹配
  let onsetScore = 0;
  if (chineseFlat.length > 0 && englishPhonemes.length > 0) {
    onsetScore = phonemeSimilarity(chineseFlat[0], englishPhonemes[0]);
  }

  // 尾音匹配
  let codaScore = 0;
  if (chineseFlat.length > 0 && englishPhonemes.length > 0) {
    codaScore = phonemeSimilarity(chineseFlat[chineseFlat.length - 1], englishPhonemes[englishPhonemes.length - 1]);
  }

  const combinedScore = bestMatchScore * 0.40 + syllableScore * 0.20 + onsetScore * 0.25 + codaScore * 0.15;
  return Math.round(combinedScore * 100);
}

/**
 * 中文译名字面重叠加分
 */
function calcTranslationBonus(chineseName: string, chineseTranslation: string): number {
  if (!chineseTranslation) return 0;
  let overlap = 0;
  for (const char of chineseName) {
    if (chineseTranslation.includes(char)) overlap++;
  }
  return Math.min(overlap * 8, 30);
}

/**
 * 根据中文名字的拼音发音，在英文名词典中搜索发音最贴近的英文名
 */
export function searchByPhoneticMatch(
  chineseName: string,
  gender?: string,
  limit: number = 20
): PhoneticMatchResult[] {
  if (!chineseName || chineseName.length === 0) return [];
  
  const allRecords = getAllRecords();
  const genderCn = gender === 'male' ? '男性' : gender === 'female' ? '女性' : null;

  let candidates = allRecords;
  if (genderCn) {
    candidates = candidates.filter(r => r.gender === genderCn || r.gender === '中性');
  }

  const chinesePhonemeSyllables = chineseNameToPhonemes(chineseName);
  if (chinesePhonemeSyllables.length === 0) return [];

  const results: PhoneticMatchResult[] = [];

  for (const record of candidates) {
    const englishPhonemes = getEnglishPhonemes(record);
    if (englishPhonemes.length === 0) continue;

    const phonemeMatchScore = calcPhonemeSequenceMatch(chinesePhonemeSyllables, englishPhonemes);
    const translationBonus = calcTranslationBonus(chineseName, record.chinese || '');
    const combinedScore = Math.min(100, phonemeMatchScore + translationBonus);

    if (combinedScore > 0) {
      const chineseSyllableCount = chinesePhonemeSyllables.length;
      const englishSyllableCount = Math.max(1, Math.round(englishPhonemes.filter(p => isVowel(p)).length));
      const syllableDiff = Math.abs(chineseSyllableCount - englishSyllableCount);
      let syllableMatchScore: number;
      if (syllableDiff === 0) syllableMatchScore = 100;
      else if (syllableDiff === 1) syllableMatchScore = 70;
      else if (syllableDiff === 2) syllableMatchScore = 40;
      else syllableMatchScore = 10;

      results.push({
        name: record.name,
        phoneticScore: phonemeMatchScore,
        phonemeMatchScore,
        syllableMatchScore,
        translationBonus,
        combinedScore,
      });
    }
  }

  results.sort((a, b) => b.combinedScore - a.combinedScore);
  return results.slice(0, limit);
}

export { CHAR_PINYIN_MAP, pinyinToIpaPhonemes, chineseNameToPhonemes, ipaStringToPhonemes };