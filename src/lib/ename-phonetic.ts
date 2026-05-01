/**
 * 中文拼音 → 英文名发音匹配引擎
 * 
 * 根据中文名字的拼音发音，找到发音最贴近的英文名。
 * 核心逻辑：
 * 1. 中文名字 → 拼音音节拆分
 * 2. 每个音节的声母 → 可能的英文对应起始字母模式
 * 3. 每个音节的韵母 → 可能的英文拼写模式
 * 4. 评估英文名与中文拼音的发音相似度
 */
import { getAllRecords, type EnameRecord } from "./ename-dict";

// ========== 汉字 → 拼音映射表 ==========

const CHAR_PINYIN_MAP: Record<string, string> = {
  // 姓氏+名用字去重合并
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

// ========== 拼音声母 → 英文发音起始字母映射 ==========

/** 各组声母对应的英文近似起始字母/字母组合 */
function generateEnglishPatterns(pinyinSyllable: string): string[] {
  const patterns: string[] = [];
  if (!pinyinSyllable) return patterns;

  const lower = pinyinSyllable.toLowerCase().trim();

  // 提取声母（initial consonant）
  const initialConsonants = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
  let initial = '';
  let rest = lower;
  for (const ic of initialConsonants) {
    if (lower.startsWith(ic)) {
      initial = ic;
      rest = lower.slice(ic.length);
      break;
    }
  }

  // 根据声母生成英文起始字母模式
  const initialToEnglish: Record<string, string[]> = {
    'zh': ['J', 'Z', 'G', 'ZH'],
    'ch': ['CH', 'C', 'SH', 'S'],
    'sh': ['SH', 'S', 'X'],
    'b': ['B', 'P'],
    'p': ['P', 'B', 'F'],
    'm': ['M', 'N'],
    'f': ['F', 'V', 'PH'],
    'd': ['D', 'T'],
    't': ['T', 'D'],
    'n': ['N', 'L', 'M'],
    'l': ['L', 'R', 'N'],
    'g': ['G', 'K', 'GW'],
    'k': ['K', 'C', 'G'],
    'h': ['H', 'W', 'F'],
    'j': ['J', 'G', 'Z', 'Y'],
    'q': ['Q', 'C', 'CH', 'K'],
    'x': ['X', 'SH', 'S', 'C'],
    'r': ['R', 'L'],
    'z': ['Z', 'S', 'C', 'J'],
    'c': ['C', 'S', 'TS'],
    's': ['S', 'C', 'X', 'SH'],
    'y': ['Y', 'E', 'I'],
    'w': ['W', 'V', 'U'],
    '': ['A', 'E', 'I', 'O', 'U'],
  };

  // 生成声母对应的英文起始字母
  const engInitials = initialToEnglish[initial] || [initial.toUpperCase() || lower[0]?.toUpperCase() || ''];

  // 根据韵母（rest）生成英文拼写近似模式
  const vowelToPatterns: Record<string, string[]> = {
    'ang': ['ang', 'ong', 'ung', 'an'],
    'eng': ['eng', 'ing', 'ung', 'en'],
    'ing': ['ing', 'eng', 'ink', 'in'],
    'ong': ['ong', 'ung', 'ong', 'on'],
    'an': ['an', 'en', 'on', 'un', 'and'],
    'en': ['en', 'an', 'in', 'on'],
    'in': ['in', 'en', 'an', 'ing'],
    'un': ['un', 'on', 'an', 'ung'],
    'ao': ['ao', 'ow', 'o', 'au'],
    'ou': ['ou', 'o', 'ow', 'oe'],
    'ai': ['ai', 'i', 'ie', 'y', 'igh'],
    'ei': ['ei', 'ay', 'ey', 'e'],
    'ui': ['ui', 'we', 'wee', 'ue'],
    'ia': ['ia', 'ya', 'a'],
    'ie': ['ie', 'ye', 'e'],
    'iu': ['iu', 'yo', 'you', 'yu'],
    'ian': ['ian', 'ien', 'in', 'en', 'ian'],
    'iang': ['iang', 'iang', 'yang'],
    'iong': ['iong', 'yong'],
    'uan': ['uan', 'wan', 'on', 'un'],
    'uang': ['uang', 'wan', 'ang', 'wang'],
    'uo': ['uo', 'or', 'o', 'wa', 'wo', 'oa'],
    'ue': ['ue', 'we', 'e'],
    'a': ['a', 'ah', 'ar'],
    'o': ['o', 'oh', 'or', 'oa'],
    'e': ['e', 'eh', 'er', 'a'],
    'i': ['i', 'ee', 'y', 'ie'],
    'u': ['u', 'oo', 'w', 'ew'],
    'v': ['v', 'u', 'oo'],
  };

  // 生成完整音节的近似英文拼写
  for (const ei of engInitials) {
    // 完整拼音作为整体模式
    patterns.push(ei + lower);
    // 声母+韵母模式
    const vowelPatterns = vowelToPatterns[rest] || [rest || ''];
    for (const vp of vowelPatterns) {
      patterns.push(ei + vp);
    }
    // 仅声母模式
    patterns.push(ei);
  }

  // 去重并限制数量
  return [...new Set(patterns)].slice(0, 15);
}

// ========== 核心发音匹配评分 ==========

/** 针对特定常用字的手工声母/韵首映射，加强匹配 */
const INITIAL_OVERRIDES: Record<string, string[]> = {
  'zhang': ['J', 'Z', 'G'],
  'guo': ['G', 'Gor', 'Gord'],
  'guang': ['G', 'Gor', 'Gwan'],
};

/**
 * 计算中文名字拼音与英文名之间的发音相似度
 * 
 * @param chineseName 中文名字（如"张国光"）
 * @param englishName 英文名（如"Gordon"）
 * @param chineseTranslation 英文名的中文译名（如"戈登"）
 * @returns 发音相似度分数 0~100
 */
function calcPinyinMatchScore(
  chineseName: string,
  englishName: string,
  chineseTranslation: string
): number {
  if (!chineseName || !englishName) return 0;

  const engLower = englishName.toLowerCase();

  // 1. 中文译名字符重叠检查
  let charOverlapScore = 0;
  if (chineseTranslation) {
    for (const char of chineseName) {
      if (chineseTranslation.includes(char)) {
        charOverlapScore += 15;
      }
    }
    // 拼音首字母重叠检查
    const chinesePinyinInitials = chineseName.split('').map(c => {
      const py = CHAR_PINYIN_MAP[c];
      return py ? py[0].toLowerCase() : '';
    }).filter(Boolean);
    const uniqueInitials = [...new Set(chinesePinyinInitials)];
    const engLetters = [...new Set(engLower.split('').filter(c => /[a-z]/.test(c)))];
    const overlapInitials = uniqueInitials.filter(i => engLetters.includes(i));
    charOverlapScore += overlapInitials.length * 5;
  }
  charOverlapScore = Math.min(charOverlapScore, 30);

  // 2. 逐音节发音匹配
  const chars = chineseName.replace(/\s/g, '').split('');
  const pinyins: string[] = [];
  for (const char of chars) {
    const py = CHAR_PINYIN_MAP[char];
    if (py) pinyins.push(py);
  }

  if (pinyins.length === 0) {
    const surnamePinyin = CHAR_PINYIN_MAP[chineseName[0]];
    if (surnamePinyin) pinyins.push(surnamePinyin);
  }

  if (pinyins.length === 0) return charOverlapScore;

  // 对每个拼音音节生成英文近似模式，检查英文名是否包含
  let syllableMatchCount = 0;

  for (const py of pinyins) {
    const patterns = generateEnglishPatterns(py);
    const overrides = INITIAL_OVERRIDES[py] || [];
    let allPatterns = patterns;
    if (overrides.length > 0) {
      allPatterns = [...new Set([...overrides, ...patterns])];
    }
    
    let matched = false;
    for (const pattern of allPatterns) {
      const patternLower = pattern.toLowerCase();
      if (engLower.includes(patternLower)) {
        matched = true;
        break;
      }
    }
    if (matched) {
      syllableMatchCount++;
    }
  }

  // 3. 英文名音节与中文拼音近似匹配
  const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
  const engSyllables: string[] = [];
  let currentSyllable = '';
  for (const ch of engLower) {
    if (vowels.has(ch) && currentSyllable.length > 0 && !vowels.has(currentSyllable[currentSyllable.length - 1])) {
      engSyllables.push(currentSyllable + ch);
      currentSyllable = '';
    } else {
      currentSyllable += ch;
    }
  }
  if (currentSyllable) engSyllables.push(currentSyllable);

  let engSyllableMatchCount = 0;
  for (const es of engSyllables) {
    for (const py of pinyins) {
      if (es.length >= 2) {
        const minLen = Math.min(es.length, py.length);
        let matchScore = 0;
        for (let i = 0; i < minLen; i++) {
          if (es[i] === py[i]) matchScore++;
        }
        const similarity = matchScore / Math.max(es.length, py.length);
        if (similarity >= 0.4) {
          engSyllableMatchCount++;
          break;
        }
      }
    }
  }

  // 综合评分
  const maxSyllables = Math.max(pinyins.length, 1);
  const syllableScore = (syllableMatchCount / maxSyllables) * 50;
  const engSyllableScore = Math.min(engSyllableMatchCount, maxSyllables) / maxSyllables * 20;

  const totalScore = Math.round(charOverlapScore + syllableScore + engSyllableScore);
  return Math.min(100, Math.max(0, totalScore));
}

// ========== 高级发音匹配 ==========

export interface PhoneticMatchResult {
  name: string;
  phoneticScore: number;
  pinyinScore: number;
  combinedScore: number;
}

/**
 * 根据中文名字的拼音发音，在英文名词典中搜索发音最贴近的英文名
 * 
 * @param chineseName 中文全名（如"张国光"）
 * @param gender 性别过滤
 * @param limit 返回数量
 * @returns 按发音匹配度排序的英文名列表
 */
export function searchByPhoneticMatch(
  chineseName: string,
  gender?: string,
  limit: number = 20
): PhoneticMatchResult[] {
  const allRecords = getAllRecords();
  const genderCn = gender === 'male' ? '男性' : gender === 'female' ? '女性' : null;

  let candidates = allRecords;
  if (genderCn) {
    candidates = candidates.filter(r => r.gender === genderCn || r.gender === '中性');
  }

  const results: PhoneticMatchResult[] = [];

  for (const record of candidates) {
    const pinyinScore = calcPinyinMatchScore(
      chineseName,
      record.name,
      record.chinese || ''
    );

    if (pinyinScore > 0) {
      results.push({
        name: record.name,
        phoneticScore: pinyinScore,
        pinyinScore,
        combinedScore: pinyinScore,
      });
    }
  }

  // 按拼音匹配评分排序
  results.sort((a, b) => b.combinedScore - a.combinedScore);
  return results.slice(0, limit);
}

// ========== 导出 ==========

export { generateEnglishPatterns, calcPinyinMatchScore, CHAR_PINYIN_MAP };
