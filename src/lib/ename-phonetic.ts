/**
 * 英文名拼音发音匹配引擎 v2.0
 * 
 * 核心算法：将中文名字拆分为【姓】和【名】两部分，
 * 分别匹配不同的英文音素体系。
 * 
 * 匹配层次（从最优到可接受）：
 * Level 1 (1.0): 完整拼音音节匹配（如 "li" ↔ "Lee", "Ely"）
 * Level 2 (0.8): 声母+韵母部分匹配（如 "xiao" ↔ "Shao"）
 * Level 3 (0.5): 声母匹配（首字母一致，如 "zhang" ↔ "George"）
 * Level 4 (0.3): 模糊匹配（元音相似性）
 */

// ========== 拼音音素分解 ==========

// 声母 (Initial consonants)
const PINYIN_INITIALS: Record<string, string> = {
  'b': 'b', 'p': 'p', 'm': 'm', 'f': 'f',
  'd': 'd', 't': 't', 'n': 'n', 'l': 'l',
  'g': 'g', 'k': 'k', 'h': 'h',
  'j': 'j', 'q': 'ch', 'x': 'sh',
  'zh': 'j', 'ch': 'ch', 'sh': 'sh', 'r': 'r',
  'z': 'z', 'c': 'ts', 's': 's',
  'y': 'y', 'w': 'w',
  '': ''
};

// 韵母 -> 英文近似发音映射
const PINYIN_FINALS_MAP: Record<string, string[]> = {
  'a': ['a', 'ah', 'ar'],
  'o': ['o', 'oh', 'aw'],
  'e': ['e', 'eh', 'er'],
  'i': ['ee', 'i', 'ie'],
  'u': ['oo', 'u', 'ew'],
  'v': ['yoo', 'u'],
  'ai': ['ai', 'i', 'eye', 'y'],
  'ei': ['ay', 'ei', 'a'],
  'ui': ['way', 'ui', 'ooee'],
  'ao': ['ao', 'ow', 'au'],
  'ou': ['oh', 'ou', 'ow'],
  'iu': ['yoo', 'ew'],
  'ie': ['yeh', 'ie', 'ee-eh'],
  've': ['yoo-eh', 've'],
  'er': ['er', 'ur', 'ar'],
  'an': ['an', 'ahn', 'en'],
  'en': ['en', 'un', 'an'],
  'in': ['in', 'een', 'en'],
  'un': ['oon', 'un', 'uen'],
  'vn': ['yoo-en', 'yun'],
  'ang': ['ahng', 'ong', 'ang'],
  'eng': ['ung', 'eng', 'ong'],
  'ing': ['ing', 'eeng', 'ing'],
  'ong': ['ong', 'awng', 'ung'],
  'ia': ['ya', 'ia', 'ee-ah'],
  'iao': ['yao', 'yow', 'ee-ao'],
  'ian': ['yen', 'ian', 'ee-en'],
  'iang': ['yahng', 'ee-ang'],
  'iong': ['yong', 'ee-ong'],
  'ua': ['wa', 'ua'],
  'uo': ['wo', 'uo', 'oo-oh'],
  'uai': ['wai', 'wye', 'oo-eye'],
  'uan': ['wan', 'oo-en'],
  'uang': ['wahng', 'oo-ang'],
  'uei': ['way', 'oo-ay'],
};

// ========== 核心匹配函数 ==========

/** 获取拼音的音节组（声母+韵母） */
function splitPinyinSyllable(pinyin: string): { initial: string; final: string } {
  const trimmed = pinyin.toLowerCase().trim();
  // 双字母声母
  const doubleInitials = ['zh', 'ch', 'sh'];
  for (const init of doubleInitials) {
    if (trimmed.startsWith(init)) {
      return { initial: init, final: trimmed.slice(init.length) };
    }
  }
  // 单字母声母
  const singleInitial = trimmed[0] || '';
  if (PINYIN_INITIALS[singleInitial]) {
    return { initial: singleInitial, final: trimmed.slice(1) };
  }
  // 无声母（零声母）
  return { initial: '', final: trimmed };
}

/** 判断两个字拼音的声母是否一致（近似） */
function initialsMatch(pinyin1: string, pinyin2: string): boolean {
  if (!pinyin1 || !pinyin2) return false;
  const s1 = splitPinyinSyllable(pinyin1);
  const s2 = splitPinyinSyllable(pinyin2);
  const i1 = s1.initial;
  const i2 = s2.initial;
  if (i1 === i2) return true;
  // 近似声母映射
  const similarInitials: Record<string, string[]> = {
    'zh': ['z', 'j', 'ch'],
    'ch': ['c', 'q', 'zh'],
    'sh': ['s', 'x', 'zh'],
    'z': ['zh', 'c'],
    'c': ['ch', 'z'],
    's': ['sh', 'x'],
    'j': ['zh', 'q', 'z'],
    'q': ['ch', 'c', 'x'],
    'x': ['sh', 's', 'h'],
    'h': ['x', 'f'],
    'r': ['l', 'n'],
    'l': ['r', 'n'],
    'n': ['l', 'r'],
    'b': ['p'],
    'p': ['b'],
    'd': ['t'],
    't': ['d'],
    'g': ['k'],
    'k': ['g'],
  };
  return similarInitials[i1]?.includes(i2) || similarInitials[i2]?.includes(i1) || false;
}

/** 判断韵母是否相似 */
function finalsMatch(pinyin1: string, pinyin2: string): boolean {
  if (!pinyin1 || !pinyin2) return false;
  const s1 = splitPinyinSyllable(pinyin1);
  const s2 = splitPinyinSyllable(pinyin2);
  const f1 = s1.final;
  const f2 = s2.final;
  if (f1 === f2) return true;
  // 韵母映射到近似音素集
  const getFinalSounds = (f: string): string[] => {
    if (PINYIN_FINALS_MAP[f]) return PINYIN_FINALS_MAP[f];
    // 尝试部分匹配
    for (const [key, sounds] of Object.entries(PINYIN_FINALS_MAP)) {
      if (f.startsWith(key) || key.startsWith(f)) return sounds;
    }
    // 按结尾匹配
    const lastVowel = f.replace(/[^aeiou]/g, '');
    if (lastVowel) return [lastVowel];
    return [f];
  };
  const sounds1 = getFinalSounds(f1);
  const sounds2 = getFinalSounds(f2);
  return sounds1.some(s1 => sounds2.some(s2 => s1 === s2));
}

/** 获取名字的首字母（英文） */
function getFirstLetter(name: string): string {
  return name.charAt(0).toLowerCase();
}

// ========== 对外匹配分数函数 ==========

export interface PhoneticMatchResult {
  score: number;         // 0-1 匹配度
  matchedLevel: number;  // 1-4 匹配层次
  detail: string;        // 匹配说明
}

/**
 * 核心匹配函数 - 判断英文名和中文拼音的发音匹配度
 * 
 * @param chinesePinyin - 中文名的拼音
 * @param englishName - 候选英文名
 * @returns 匹配结果（分数、层次、说明）
 */
export function matchPronunciation(
  chinesePinyin: string,
  englishName: string
): PhoneticMatchResult {
  if (!chinesePinyin || !englishName) {
    return { score: 0, matchedLevel: 0, detail: '输入为空' };
  }
  
  const pinyin = chinesePinyin.toLowerCase().trim();
  const en = englishName.toLowerCase().trim();
  const pinyinSyllables = pinyin.split(/\s+/).filter(Boolean);
  const enSyllables = en.split(/[^a-z]/).filter(Boolean);
  
  // 单音节情况
  if (pinyinSyllables.length === 1 && enSyllables.length >= 1) {
    const result = matchSingleSyllable(pinyin, en);
    if (result.score > 0) return result;
  }
  
  // 双音节匹配：第一个英文音节 vs 第一个拼音音节
  if (pinyinSyllables.length >= 1 && enSyllables.length >= 1) {
    const firstResult = matchSingleSyllable(pinyinSyllables[0], enSyllables[0]);
    if (firstResult.score > 0) {
      // 如果英文名还有第二个音节，看看是否匹配第二个拼音音节
      if (pinyinSyllables.length >= 2 && enSyllables.length >= 2) {
        const secondResult = matchSingleSyllable(pinyinSyllables[1], enSyllables[1]);
        if (secondResult.score > 0) {
          return {
            score: Math.min(1.0, firstResult.score + secondResult.score * 0.3),
            matchedLevel: 1,
            detail: `双音节匹配: ${pinyinSyllables[0]}:${enSyllables[0]}, ${pinyinSyllables[1]}:${enSyllables[1]}`
          };
        }
      }
      return firstResult;
    }
  }
  
  // 完整英文名匹配（如 "Elijah" 和 "li" 有部分匹配）
  const fullMatch = matchSingleSyllable(pinyin, en);
  if (fullMatch.score > 0) return fullMatch;
  
  // 英文名开头匹配拼音
  const startOfEn = en.substring(0, Math.min(3, en.length));
  if (pinyin.includes(startOfEn) || startOfEn.includes(pinyin)) {
    return {
      score: 0.4,
      matchedLevel: 3,
      detail: `声母级模糊匹配: ${pinyin} ↔ ${startOfEn}`
    };
  }
  
  // 首字母匹配作为兜底
  if (getFirstLetter(pinyin) === getFirstLetter(en)) {
    return {
      score: 0.3,
      matchedLevel: 4,
      detail: `首字母匹配: ${pinyin.charAt(0)}`
    };
  }
  
  return { score: 0, matchedLevel: 0, detail: '无匹配' };
}

/**
 * 单音节匹配 - 核心算法
 */
function matchSingleSyllable(pinyinSyllable: string, enSyllable: string): PhoneticMatchResult {
  const py = pinyinSyllable.toLowerCase();
  const en = enSyllable.toLowerCase();
  
  // Level 1: 完整音节匹配（全拼匹配或英文名包含完整拼音）
  if (py === en) {
    return { score: 1.0, matchedLevel: 1, detail: `完整匹配: ${py}` };
  }
  
  // 英文名包含完整拼音（如 "Ely" 包含 "li"）
  if (en.includes(py) && py.length >= 2) {
    return { score: 0.9, matchedLevel: 1, detail: `包含匹配: ${py} in ${en}` };
  }
  
  // Level 2: 韵母匹配（声母不同但韵母相似）
  const { final: pyFinal } = splitPinyinSyllable(py);
  // 尝试从英文名中提取音素
  const enClean = en.replace(/[^a-z]/g, '');
  
  // 如果英文名结尾与韵母相似（如 "ling" ↔ "Lin"）
  const enEnding = enClean.slice(Math.max(0, enClean.length - pyFinal.length));
  if (enEnding === pyFinal && pyFinal.length >= 2) {
    return { score: 0.8, matchedLevel: 2, detail: `韵母尾部匹配: ${pyFinal}` };
  }
  
  // 韵母核匹配
  if (finalsMatch(py, enClean) && pyFinal.length >= 1) {
    return { score: 0.7, matchedLevel: 2, detail: `韵母近似: ${pyFinal}` };
  }
  
  // Level 3: 声母匹配
  if (initialsMatch(py, enClean)) {
    // 声母 + 至少一个字符匹配
    if (py.charAt(0) === enClean.charAt(0)) {
      const { initial: pyInit } = splitPinyinSyllable(py);
      return { score: 0.6, matchedLevel: 3, detail: `声母相同: ${pyInit}` };
    }
    return { score: 0.5, matchedLevel: 3, detail: `声母近似` };
  }
  
  // 首字母匹配
  if (py.charAt(0) === enClean.charAt(0)) {
    return { score: 0.4, matchedLevel: 3, detail: `首字母: ${py.charAt(0)}` };
  }
  
  return { score: 0, matchedLevel: 0, detail: '无匹配' };
}

/**
 * 获取名字的拼音（使用 pinyin 包或手写简单映射）
 * 为了兼容性，提供一个简单的汉字->拼音映射
 */
const COMMON_CHAR_PINYIN: Record<string, string> = {
  // 常见姓氏
  '张': 'zhang', '李': 'li', '王': 'wang', '刘': 'liu', '陈': 'chen',
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
  // 名字常用字（无重复）
  '明': 'ming', '华': 'hua', '强': 'qiang', '伟': 'wei', '芳': 'fang',
  '娜': 'na', '敏': 'min', '静': 'jing', '丽': 'li', '艳': 'yan',
  '杰': 'jie', '浩': 'hao', '雪': 'xue', '婷': 'ting', '鑫': 'xin',
  '佳': 'jia', '瑶': 'yao', '欣': 'xin', '雯': 'wen', '萱': 'xuan',
  '子': 'zi', '涵': 'han', '睿': 'rui', '若': 'ruo',
  '怡': 'yi', '琳': 'lin', '琪': 'qi', '菲': 'fei', '诗': 'shi',
  '凡': 'fan', '航': 'hang', '宇': 'yu', '轩': 'xuan', '泽': 'ze',
  '辰': 'chen', '曦': 'xi', '霖': 'lin',
  '铭': 'ming', '然': 'ran', '晨': 'chen', '辉': 'hui',
  '勇': 'yong', '超': 'chao',
  '俊': 'jun', '逸': 'yi', '安': 'an', '宁': 'ning', '悦': 'yue',
  '晴': 'qing', '淑': 'shu', '芬': 'fen', '燕': 'yan', '美': 'mei',
  '红': 'hong', '彩': 'cai', '霞': 'xia', '秀': 'xiu', '云': 'yun',
  '翠': 'cui', '玉': 'yu', '兰': 'lan', '凤': 'feng', '莲': 'lian',
  '英': 'ying', '香': 'xiang', '梅': 'mei', '菊': 'ju', '珠': 'zhu',
  '玲': 'ling', '琼': 'qiong', '萍': 'ping', '琴': 'qin', '珍': 'zhen',
  '莉': 'li',
  '春': 'chun', '夏': 'xia', '秋': 'qiu',
  '冬': 'dong', '梦': 'meng', '思': 'si', '雨': 'yu',
  '海': 'hai', '山': 'shan', '峰': 'feng', '毅': 'yi',
  '博': 'bo', '志': 'zhi', '德': 'de', '仁': 'ren',
  '义': 'yi', '礼': 'li', '智': 'zhi', '信': 'xin', '诚': 'cheng',
  '娇': 'jiao', '婉': 'wan', '媚': 'mei', '婵': 'chan',
  '娟': 'juan', '虹': 'hong', '莎': 'sha',
  '丹': 'dan', '冰': 'bing', '爽': 'shuang', '乐': 'le', '飞': 'fei',
  '天': 'tian', '宝': 'bao', '家': 'jia', '国': 'guo', '祥': 'xiang',
  '瑞': 'rui', '广': 'guang', '庆': 'qing', '兆': 'zhao',
  '平': 'ping', '帆': 'fan', '均': 'jun', '衡': 'heng', '雄': 'xiong',
  '柳': 'liu', '桃': 'tao', '松': 'song', '柏': 'bai',
  '大': 'da', '中': 'zhong', '小': 'xiao', '上': 'shang', '下': 'xia',
};

/**
 * 获取汉字拼音（支持多音字简单处理）
 */
export function getCharPinyin(char: string): string {
  return COMMON_CHAR_PINYIN[char] || '';
}

/**
 * 获取整个中文名字的完整拼音
 */
export function getChineseNamePinyin(chineseName: string): { givenName: string; fullPinyin: string } {
  // 简单按长度分：姓一般是第一个字，名字是后面的
  const chars = chineseName.split('');
  if (chars.length <= 1) return { givenName: chineseName, fullPinyin: getCharPinyin(chars[0] || '') || chineseName };
  
  const surname = chars[0];
  const givenChars = chars.slice(1);
  
  const surnamePinyin = getCharPinyin(surname);
  const givenPinyin = givenChars.map(c => getCharPinyin(c)).filter(Boolean).join(' ');
  
  return {
    givenName: givenPinyin,
    fullPinyin: [surnamePinyin, givenPinyin].filter(Boolean).join(' ')
  };
}

/**
 * 批量匹配 - 返回按发音匹配度排序后的英文名列表
 */
export function sortByPronunciation(
  chineseNamePinyin: string,
  englishNames: { name: string }[]
): Array<{ name: string; score: number; detail: string }> {
  return englishNames
    .map(item => {
      const result = matchPronunciation(chineseNamePinyin, item.name);
      return {
        name: item.name,
        score: result.score,
        detail: result.detail,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * 将英文名与姓氏组合成全名
 * Returns: "GivenName Surname" (西方顺序)
 */
export function formatFullName(
  englishGivenName: string,
  englishSurname: string,
  style: 'western' | 'eastern' = 'western'
): string {
  if (style === 'western') {
    return `${englishGivenName} ${englishSurname}`;
  }
  return `${englishSurname} ${englishGivenName}`;
}

/**
 * 搜索英文名，按发音匹配度排序
 */
export function searchByPhoneticMatch(
  chineseNamePinyin: string,
  englishNames: Array<{ name: string; meaning?: string; gender?: string; score?: number }>,
  topK: number = 20
): Array<{ name: string; meaning?: string; gender?: string; phoneticScore: number; phoneticDetail: string }> {
  const results = englishNames
    .map(item => {
      const matchResult = matchPronunciation(chineseNamePinyin, item.name);
      return {
        name: item.name,
        meaning: item.meaning,
        gender: item.gender,
        phoneticScore: matchResult.score,
        phoneticDetail: matchResult.detail,
      };
    })
    .filter(r => r.phoneticScore > 0);  // 只保留有匹配的
  
  return results
    .sort((a, b) => b.phoneticScore - a.phoneticScore)
    .slice(0, topK);
}