

// ===== 1. 拼音音节解析 =====

/**
 * 拆解普通话拼音字符串为独立的音节
 * 支持：guoguang → [guo, guang], zhang → [zhang], xiaoming → [xiao, ming]
 */
export function parsePinyinSyllables(pinyin: string): PinyinSyllable[] {
  const str = pinyin.toLowerCase().trim();
  if (!str) return [];

  const result: PinyinSyllable[] = [];

  // 声母列表（按长度倒序优先匹配）
  const initials = [
    'zh', 'ch', 'sh',
    'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
    'g', 'k', 'h', 'j', 'q', 'x',
    'r', 'z', 'c', 's', 'y', 'w',
  ];

  // 韵母列表（用于验证音节有效性）
  const finals = [
    'iang', 'uang', 'iong', 'uai', 'iong',
    'ang', 'eng', 'ing', 'ong', 'uan', 'ian', 'iao',
    'an', 'en', 'in', 'un', 'vn', 'ai', 'ei', 'ui',
    'ao', 'ou', 'iu', 'ie', 'ue', 've', 'er',
    'ia', 'ua', 'uo', 'iu', 'ou', 'ei',
    'a', 'o', 'e', 'i', 'u', 'v',
  ];

  let pos = 0;
  while (pos < str.length) {
    // 尝试匹配声母
    let init = '';
    for (const c of initials) {
      if (str.startsWith(c, pos) && pos + c.length < str.length) {
        init = c;
        pos += c.length;
        break;
      }
    }

    // 匹配韵母（从当前位置到下一个声母开始或结尾）
    let bestFinal = '';
    let bestLen = 0;
    for (const f of finals) {
      if (str.startsWith(f, pos) && f.length > bestLen) {
        // 韵母不能太长以至于吃掉下一个音节的声母
        const remaining = str.slice(pos + f.length);
        // 检查剩余部分是否还有效
        if (remaining.length === 0 || hasValidSyllableStart(remaining)) {
          bestFinal = f;
          bestLen = f.length;
        }
      }
    }

    if (bestFinal) {
      result.push({ initial: init, final: bestFinal });
      pos += bestFinal.length;
    } else {
      // 单个字符作为韵母
      if (pos < str.length) {
        result.push({ initial: init, final: str[pos] });
        pos += 1;
      } else {
        // 无法解析
        result.push({ initial: init, final: '' });
        break;
      }
    }
  }

  return result;
}

function hasValidSyllableStart(s: string): boolean {
  if (s.length === 0) return true;
  // 如果以声母开头，是有效的音节开始
  const initPattern = /^(zh|ch|sh|b|p|m|f|d|t|n|l|g|k|h|j|q|x|r|z|c|s|y|w)/;
  return initPattern.test(s);
}

export interface PinyinSyllable {
  initial: string;
  final: string;
}

// ===== 2. 拼音音节特征提取 =====

export function extractEnding(final: string): string | null {
  if (final.endsWith('ng')) return 'ng';
  if (final.endsWith('n') && !final.endsWith('in')) return 'n';
  if (final.endsWith('r')) return 'r';
  if (final.endsWith('m')) return 'm';
  return null;
}

/**
 * 拼音韵母特征（IPA 近似）
 * height: 1(高) → 3(低)
 * frontness: 1(前) → 3(后)
 * rounding: 0(不圆唇) → 1(圆唇)
 * 
 * ★ 关键改进 V2.6：鼻音韵母 (ang/eng/ing/ong/an/en/in/un) 
 *    使用与基础元音 DIFFERENT 的特征值，
 *    避免 "ang" 与 "a" 100% 匹配、 "eng" 与 "e" 100% 匹配
 */
const PINYIN_FINAL_FEATURES: Record<string, VowelFeatures> = {
  // 单韵母 - 基础值
  'a':  { height: 3,   frontness: 2,   rounding: 0 },
  'o':  { height: 2.5, frontness: 3,   rounding: 1 },
  'e':  { height: 2,   frontness: 1.5, rounding: 0 },
  'i':  { height: 1,   frontness: 1,   rounding: 0 },
  'u':  { height: 1.5, frontness: 3,   rounding: 1 },
  'v':  { height: 1,   frontness: 1,   rounding: 1 },
  'er': { height: 2,   frontness: 2,   rounding: 0 },

  // 复韵母 - ai/ei/ao/ou/ia/ie/ua/uo/ve
  'ai': { height: 2.8, frontness: 1.5, rounding: 0 },
  'ei': { height: 2.2, frontness: 1.5, rounding: 0 },
  'ao': { height: 2.8, frontness: 2.8, rounding: 0 },
  'ou': { height: 2.5, frontness: 3,   rounding: 1 },
  'ia': { height: 2,   frontness: 1.5, rounding: 0 },
  'ie': { height: 1.5, frontness: 1.2, rounding: 0 },
  'ua': { height: 2,   frontness: 2.5, rounding: 1 },
  'uo': { height: 2,   frontness: 3,   rounding: 1 },
  've': { height: 1.5, frontness: 1.5, rounding: 1 },
  'ue': { height: 2,   frontness: 2.5, rounding: 1 },

  // 鼻韵母 - ng 结尾（★ 与基础元音 DIFFERENT，反映鼻化效果）
  'ang':  { height: 2.8, frontness: 2.5, rounding: 0 },  // vs 'a': frontness 2→2.5
  'eng':  { height: 2.2, frontness: 2,   rounding: 0 },  // vs 'e': frontness 1.5→2
  'ing':  { height: 1.2, frontness: 1.5, rounding: 0 },  // vs 'i': frontness 1→1.5
  'ong':  { height: 2,   frontness: 3.5, rounding: 1 },  // vs 'o': frontness 3→3.5
  'iang': { height: 2,   frontness: 2,   rounding: 0 },
  'uang': { height: 2,   frontness: 3,   rounding: 1 },
  'iong': { height: 1.5, frontness: 2.5, rounding: 1 },

  // 鼻韵母 - n 结尾（★ 与基础元音略有不同）
  'an': { height: 2.8, frontness: 1.8, rounding: 0 },  // vs 'a': frontness 2→1.8
  'en': { height: 2.2, frontness: 1.5, rounding: 0 },  // vs 'e': same
  'in': { height: 1.5, frontness: 1.2, rounding: 0 },  // vs 'i': slight shift
  'un': { height: 1.8, frontness: 2.8, rounding: 1 },  // vs 'u': frontness 3→2.8
  'vn': { height: 1.2, frontness: 1.2, rounding: 1 },

  // 复合鼻韵母
  'ian': { height: 2.5, frontness: 1.5, rounding: 0 },
  'uan': { height: 2,   frontness: 2.5, rounding: 1 },
  'uai': { height: 2.5, frontness: 2.5, rounding: 1 },
  'ui':  { height: 2,   frontness: 2.5, rounding: 1 },
  'iu':  { height: 2,   frontness: 2.5, rounding: 1 },
  'iao': { height: 2.5, frontness: 2,   rounding: 0 },
};

// ===== 3. 英文音节切分（基于元音核心的切分）=====

interface EnSyllableSegment {
  onset: string;    // 声母（辅音群）
  nucleus: string;  // 韵母核心（元音部分）
  coda: string;     // 尾音
  full: string;     // 完整音节
}

export interface EnPhonemeSyllable extends EnSyllableSegment {}

// 英文辅音
const EN_CONSONANTS = new Set('bcdfghjklmnpqrstvwxyz');
const EN_VOWEL_CHARS = new Set('aeiouy');
const EN_VOWEL_CLUSTERS = [
  'sch', 'scr', 'shr', 'spl', 'spr', 'str',
  'ch', 'sh', 'th', 'ph', 'wh', 'qu',
  'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr',
  'gl', 'gr', 'kn', 'pl', 'pr', 'sc', 'sk', 'sl',
  'sm', 'sn', 'sp', 'sq', 'st', 'sw', 'tr', 'tw',
  'wr',
];

// 元音核心模式（用于音节切分）
const EN_VOWEL_PATTERNS = [
  'schwa', 'schwi',
  'aire', 'eare', 'oure', 'ieue',
  'iour', 'eour', 'iour',
  'tion', 'sion', 'cian', 'tial', 'cial',
  'ture', 'sure',
  'ough', 'augh', 'eigh', 'igh',
  'ear', 'air', 'oor', 'our', 'are', 'ere', 'ire', 'ore', 'ure',
  'eau', 'ieu', 'iou',
  'ee', 'oo', 'ea', 'oa', 'oi', 'oy', 'ou', 'ow',
  'au', 'aw', 'eu', 'ew', 'ay', 'ey', 'ai', 'ei',
  'ie', 'ue', 'ui', 'ae',
  'or', 'ar', 'er', 'ir', 'ur',
  'le', 're',
  'a', 'e', 'i', 'o', 'u',
  'y',
];

function isEnVowelChar(c: string): boolean {
  return EN_VOWEL_CHARS.has(c);
}

function findNextVowelCluster(s: string, startIdx: number): { vowel: string; length: number } {
  if (startIdx >= s.length) return { vowel: '', length: 0 };

  let bestVowel = '';
  let bestLen = 0;

  for (const pattern of EN_VOWEL_PATTERNS) {
    if (s.toLowerCase().startsWith(pattern, startIdx) && pattern.length > bestLen) {
      // 检查是否是独立元音（后面还有辅音或结尾）
      const afterIdx = startIdx + pattern.length;
      if (afterIdx >= s.length || !isEnVowelChar(s[afterIdx])) {
        bestVowel = pattern;
        bestLen = pattern.length;
      }
    }
  }

  if (!bestVowel && startIdx < s.length && isEnVowelChar(s[startIdx])) {
    return { vowel: s[startIdx], length: 1 };
  }

  return { vowel: bestVowel, length: bestLen };
}

/**
 * 使用 Maximal Onset + 元音核心检测 拆解英文名为音节
 * 
 * V2.5 核心改进：使用先验知识规则提升常见名字的切分准确率
 */
const KNOWN_NAME_SYLLABLES: Record<string, string[]> = {
  // 常见双音节名
  'gordon':  ['gor', 'don'],
  'glover':  ['glo', 'ver'],
  'garrison':['gar', 'ri', 'son'],
  'gaylord': ['gay', 'lord'],
  'gideon':  ['gid', 'e', 'on'],
  'gilbert': ['gil', 'bert'],
  'gustav':  ['gus', 'tav'],
  'gonzalo': ['gon', 'za', 'lo'],
  'gabriel': ['ga', 'bri', 'el'],
  'geoffrey':['geof', 'frey'],
  'gareth':  ['ga', 'reth'],
  'gavin':   ['ga', 'vin'],
  'galloway':['ga', 'llo', 'way'],
  'garrett': ['ga', 'rrett'],
  'gerald':  ['ge', 'rald'],
  'genevieve':['gen', 'e', 'vieve'],
  'georgina':['geor', 'gi', 'na'],
  'simon':   ['si', 'mon'],
  'simeon':  ['sim', 'e', 'on'],
  'samuel':  ['sam', 'u', 'el'],
  'samantha':['sa', 'man', 'tha'],
  'solomon': ['sol', 'o', 'mon'],
  'jonathan':['jo', 'na', 'than'],
  'johnson': ['john', 'son'],
  'joshua':  ['josh', 'u', 'a'],
  'benjamin':['ben', 'ja', 'min'],
  'nathaniel':['na', 'tha', 'niel'],
  'nicholas':['ni', 'cho', 'las'],
  'christopher':['chris', 'to', 'pher'],
  'elizabeth':['e', 'li', 'za', 'beth'],
  'katherine':['ka', 'the', 'rine'],
  'margaret': ['mar', 'ga', 'ret'],
  'matthew':  ['mat', 'thew'],
  'lucifer':  ['lu', 'ci', 'fer'],
  'peregrine':['pe', 're', 'grine'],
  'jacqueline':['jac', 'que', 'line'],
  'theodore': ['the', 'o', 'dore'],
  'timothy':  ['tim', 'o', 'thy'],
  'valentine':['val', 'en', 'tine'],
  'stephen':  ['ste', 'phen'],
  'vincent':  ['vin', 'cent'],
  'william':  ['wil', 'liam'],
  // 单音节
  'zhang':   ['zhang'],
  'cheung':  ['cheung'],
  'chang':   ['chang'],
  'chong':   ['chong'],
  'chow':    ['chow'],
  'cho':     ['cho'],
  'cheng':   ['cheng'],
  'shane':   ['shane'],
  'wayne':   ['wayne'],
  'lee':     ['lee'],
  'liam':    ['liam'],
  'wade':    ['wade'],
  'glenn':   ['glenn'],
  'james':   ['james'],
  'john':    ['john'],
  'grant':   ['grant'],
  'dylan':   ['dylan'],
  'brian':   ['brian'],
  'ryan':    ['ryan'],
  'sean':    ['sean'],
  'shawn':   ['shawn'],
  'kyle':    ['kyle'],
  'carl':    ['carl'],
  'neil':    ['neil'],
  'chung':   ['chung'],
  'hugh':    ['hugh'],
  // 双音节常见名
  'aaron':   ['aa', 'ron'],
  'abel':    ['a', 'bel'],
  'adam':    ['a', 'dam'],
  'alan':    ['a', 'lan'],
  'allen':   ['al', 'len'],
  'alex':    ['a', 'lex'],
  'andrew':  ['an', 'drew'],
  'anthony': ['an', 'tho', 'ny'],
  'arnold':  ['ar', 'nold'],
  'arthur':  ['ar', 'thur'],
  'bruce':   ['bruce'],
  'calvin':  ['cal', 'vin'],
  'carlton': ['carl', 'ton'],
  'clyde':   ['clyde'],
  'craig':   ['craig'],
  'david':   ['da', 'vid'],
  'dennis':  ['den', 'nis'],
  'dexter':  ['dex', 'ter'],
  'donald':  ['do', 'nald'],
  'earl':    ['earl'],
  'edward':  ['ed', 'ward'],
  'edwin':   ['ed', 'win'],
  'ethan':   ['e', 'than'],
  'evan':    ['e', 'van'],
  'felix':   ['fe', 'lix'],
  'floyd':   ['floyd'],
  'frank':   ['frank'],
  'fred':    ['fred'],
  'george':  ['george'],
  'harold':  ['ha', 'rold'],
  'harry':   ['ha', 'rry'],
  'harvey':  ['har', 'vey'],
  'henry':   ['hen', 'ry'],
  'howard':  ['how', 'ard'],
  'ian':     ['ian'],
  'ivan':    ['i', 'van'],
  'jack':    ['jack'],
  'jacob':   ['ja', 'cob'],
  'jason':   ['ja', 'son'],
  'jeremy':  ['je', 're', 'my'],
  'jerome':  ['je', 'rome'],
  'joel':    ['jo', 'el'],
  'joseph':  ['jo', 'seph'],
  'julian':  ['ju', 'li', 'an'],
  'justin':  ['jus', 'tin'],
  'keith':   ['keith'],
  'kenneth': ['ken', 'neth'],
  'kevin':   ['ke', 'vin'],
  'larry':   ['la', 'rry'],
  'lawrence':['law', 'rence'],
  'leonard': ['le', 'o', 'nard'],
  'lincoln': ['lin', 'coln'],
  'lloyd':   ['lloyd'],
  'louis':   ['lou', 'is'],
  'manuel':  ['ma', 'nuel'],
  'marvin':  ['mar', 'vin'],
  'melvin':  ['mel', 'vin'],
  'michael': ['mi', 'chael'],
  'milton':  ['mil', 'ton'],
  'morris':  ['mor', 'ris'],
  'nelson':  ['nel', 'son'],
  'norman':  ['nor', 'man'],
  'oliver':  ['ol', 'i', 'ver'],
  'oscar':   ['os', 'car'],
  'owen':    ['ow', 'en'],
  'patrick': ['pa', 'trick'],
  'paul':    ['paul'],
  'peter':   ['pe', 'ter'],
  'philip':  ['phi', 'lip'],
  'ralph':   ['ralph'],
  'randall': ['ran', 'dall'],
  'raymond': ['ray', 'mond'],
  'richard': ['ri', 'chard'],
  'robert':  ['ro', 'bert'],
  'roger':   ['ro', 'ger'],
  'ronald':  ['ro', 'nald'],
  'ruben':   ['ru', 'ben'],
  'russell': ['rus', 'sell'],
  'salvatore':['sal', 'va', 'to', 're'],
  'sam':     ['sam'],
  'scott':   ['scott'],
  'seymour': ['sey', 'mour'],
  'shelby':  ['shel', 'by'],
  'sidney':  ['sid', 'ney'],
  'silas':   ['si', 'las'],
  'stanley': ['stan', 'ley'],
  'steven':  ['ste', 'ven'],
  'stuart':  ['stu', 'art'],
  'terrence':['ter', 'rence'],
  'thomas':  ['tho', 'mas'],
  'todd':    ['todd'],
  'travis':  ['tra', 'vis'],
  'trevor':  ['tre', 'vor'],
  'tyler':   ['ty', 'ler'],
  'vernon':  ['ver', 'non'],
  'victor':  ['vic', 'tor'],
  // (duplicate removed - already defined above)
  'walter':  ['wal', 'ter'],
  'warren':  ['war', 'ren'],
  'waylon':  ['way', 'lon'],
  'wesley':  ['wes', 'ley'],
  'willis':  ['wil', 'lis'],
  'winston': ['win', 'ston'],
  'zachary': ['za', 'cha', 'ry'],
};

function splitKnownName(nameLower: string): string[] | null {
  return KNOWN_NAME_SYLLABLES[nameLower] || null;
}

export function splitEnglishIntoSyllables(name: string): EnPhonemeSyllable[] {
  const nameLower = name.toLowerCase().trim();
  if (!nameLower) return [];

  // 先检查已知名表
  const known = splitKnownName(nameLower);
  if (known) {
    return known.map(seg => {
      const result = extractOnsetNucleusCoda(seg);
      return { ...result, full: seg };
    });
  }

  // 通用切分逻辑
  return genericSplitIntoSyllables(nameLower);
}

function extractOnsetNucleusCoda(segment: string): { onset: string; nucleus: string; coda: string } {
  const s = segment.toLowerCase();
  if (!s) return { onset: '', nucleus: '', coda: '' };

  // 找元音核心（最长匹配）
  let vowelStart = -1;
  let vowelLen = 0;

  for (let i = 0; i < s.length; i++) {
    const v = findNextVowelCluster(s, i);
    if (v.length > 0) {
      vowelStart = i;
      vowelLen = v.length;
      break;
    }
  }

  if (vowelStart === -1) {
    // 没有元音 → 全部是辅音
    return { onset: s, nucleus: '', coda: '' };
  }

  const onset = s.slice(0, vowelStart);
  const nucleus = s.slice(vowelStart, vowelStart + vowelLen);
  const coda = s.slice(vowelStart + vowelLen);

  return { onset, nucleus, coda };
}

function genericSplitIntoSyllables(name: string): EnPhonemeSyllable[] {
  const s = name.toLowerCase();
  if (s.length <= 3) {
    const result = extractOnsetNucleusCoda(s);
    return [{ ...result, full: s }];
  }

  // 使用 V2.5 改进：元音模式检测切分
  const syllables: string[] = [];
  let pos = 0;

  while (pos < s.length) {
    // 查找元音核心
    const vowelInfo = findNextVowelCluster(s, pos);
    if (vowelInfo.length === 0) {
      // 没有找到元音（末尾残余辅音）
      // 如果有已切分的音节，合并到最后一个音节
      if (syllables.length > 0) {
        const lastSyl = syllables.pop() || '';
        syllables.push(lastSyl + s.slice(pos));
      } else {
        syllables.push(s.slice(pos));
      }
      break;
    }

    const vowelStart = vowelInfo.vowel; // 元音序列起始位置
    // 实际上 vowelStart 是元音字符串本身
    // 我们需要找到它在原字符串中的位置
    // 使用 indexOf 从 pos 开始找
    let actualVowelPos = pos;
    for (let i = pos; i < s.length; i++) {
      const v = findNextVowelCluster(s, i);
      if (v.length > 0) {
        actualVowelPos = i;
        break;
      }
    }

    const vowelCluster = vowelInfo.vowel;
    const vowelEndPos = actualVowelPos + vowelInfo.length;

    // 声母部分（元音之前的辅音）
    const onsetConsonants = s.slice(pos, actualVowelPos);

    // 这是一音节的元音核心部分
    // 检查后面是否还有元音（即需要切分）
    const remaining = s.slice(vowelEndPos);
    const nextVowel = findNextVowelCluster(remaining, 0);

    if (nextVowel.length === 0) {
      // 没有后续元音 → 剩余部分是一个音节
      const syllable = s.slice(pos);
      syllables.push(syllable);
      break;
    }

    // 有后续元音 → 需要决定怎么切分当前音节
    // V2.5 改进：使用 Maximial Onset 原则
    // 两个元音之间的辅音归属到后面的音节（如果可能）
    const nextVowelPosInRemaining = remaining.indexOf(nextVowel.vowel);

    // 在两个元音之间的辅音
    const betweenConsonants = nextVowelPosInRemaining > 0 ? remaining.slice(0, nextVowelPosInRemaining) : '';

    // 使用最大声母原则：辅音优先归入后一个音节
    // 但有例外（如 "mon" 中的 'n' 应归前一个音节）
    const splitPoint = applyMaximalOnset(betweenConsonants);

    const currentSyllable = onsetConsonants + vowelCluster + betweenConsonants.slice(0, splitPoint);
    syllables.push(currentSyllable);

    // 更新 pos 到下一个音节开始
    pos = vowelEndPos + (betweenConsonants.length - splitPoint);
  }

  // 如果切分失败或只有一个音节，返回完整字符串
  if (syllables.length === 0) {
    const result = extractOnsetNucleusCoda(s);
    return [{ ...result, full: s }];
  }

  // 修复空音节
  const nonEmpty = syllables.filter(syl => syl.length > 0);
  if (nonEmpty.length === 0) {
    const result = extractOnsetNucleusCoda(s);
    return [{ ...result, full: s }];
  }

  return nonEmpty.map(seg => {
    const result = extractOnsetNucleusCoda(seg);
    return { ...result, full: seg };
  });
}

function applyMaximalOnset(consonants: string): number {
  // 返回：辅音串中应该划给前一个音节的字符数
  if (consonants.length <= 1) return 0; // 单个辅音归后一个音节

  // 常见结尾辅音组合（应该留在前一个音节）
  const codaPatterns = ['ng', 'nk', 'nt', 'nd', 'mp', 'ct', 'ft', 'ld', 'lk', 'rm', 'rn', 'rp', 'rt', 'sk', 'sp', 'st', 'pt', 'lt', 'lf', 'lp'];

  for (const pattern of codaPatterns) {
    if (consonants.startsWith(pattern)) {
      // 检查 pattern 后的部分是否能作为合法的音节开头
      const afterCoda = consonants.slice(pattern.length);
      if (afterCoda.length === 0 || isLegalOnset(afterCoda)) {
        return pattern.length;
      }
    }
  }

  // 默认：返回一半（取整）
  return Math.floor(consonants.length / 2);
}

function isLegalOnset(cluster: string): boolean {
  if (cluster.length === 0) return false;
  return EN_VOWEL_CLUSTERS.includes(cluster) || cluster.length <= 2;
}

// ===== 4. 元音特征系统 =====

interface VowelFeatures {
  height: number;    // 1=高, 2=中, 3=低
  frontness: number; // 1=前, 2=央, 3=后
  rounding: number;   // 0=不圆唇, 1=圆唇
}

const EN_VOWEL_FEATURES: Record<string, VowelFeatures> = {
  'a':     { height: 3, frontness: 2, rounding: 0 },
  'e':     { height: 2, frontness: 1, rounding: 0 },
  'i':     { height: 1, frontness: 1, rounding: 0 },
  'o':     { height: 2.5, frontness: 3, rounding: 1 },
  'u':     { height: 1.5, frontness: 3, rounding: 1 },
  'y':     { height: 1, frontness: 1, rounding: 0 },
  'ee':    { height: 1, frontness: 1, rounding: 0 },
  'oo':    { height: 1.5, frontness: 3, rounding: 1 },
  'ea':    { height: 1.5, frontness: 1.5, rounding: 0 },
  'ai':    { height: 2.5, frontness: 2, rounding: 0 },
  'ay':    { height: 2.5, frontness: 2, rounding: 0 },
  'ei':    { height: 2.5, frontness: 1.5, rounding: 0 },
  'ey':    { height: 2.5, frontness: 1.5, rounding: 0 },
  'ie':    { height: 2, frontness: 1.5, rounding: 0 },
  'igh':   { height: 2.5, frontness: 2, rounding: 0 },
  'oa':    { height: 2.5, frontness: 3, rounding: 1 },
  'oe':    { height: 2.5, frontness: 3, rounding: 1 },
  'ue':    { height: 1.5, frontness: 3, rounding: 1 },
  'ui':    { height: 1.5, frontness: 3, rounding: 1 },
  'oi':    { height: 2.5, frontness: 2.5, rounding: 1 },
  'oy':    { height: 2.5, frontness: 2.5, rounding: 1 },
  'ou':    { height: 2.5, frontness: 2.5, rounding: 1 },
  'ow':    { height: 2.5, frontness: 2.5, rounding: 1 },
  'au':    { height: 2.5, frontness: 3, rounding: 1 },
  'aw':    { height: 2.5, frontness: 3, rounding: 1 },
  'eu':    { height: 2, frontness: 2, rounding: 1 },
  'ew':    { height: 2, frontness: 2, rounding: 1 },
  'or':    { height: 2.5, frontness: 3, rounding: 1 },
  'ar':    { height: 3, frontness: 2, rounding: 0 },
  'er':    { height: 2, frontness: 2, rounding: 0 },
  'ir':    { height: 2, frontness: 2, rounding: 0 },
  'ur':    { height: 2, frontness: 2, rounding: 0 },
  'ear':   { height: 2, frontness: 1.5, rounding: 0 },
  'air':   { height: 2.5, frontness: 1.5, rounding: 0 },
  'oor':   { height: 2.5, frontness: 3, rounding: 1 },
  'our':   { height: 2.5, frontness: 2.5, rounding: 1 },
  'are':   { height: 2.5, frontness: 1.5, rounding: 0 },
  'ere':   { height: 2, frontness: 1.5, rounding: 0 },
  'ire':   { height: 2.5, frontness: 2, rounding: 0 },
  'ore':   { height: 2.5, frontness: 3, rounding: 1 },
  'ure':   { height: 2, frontness: 2, rounding: 1 },
};

function getEnVowelFeatures(vowelText: string): VowelFeatures {
  const lower = vowelText.toLowerCase().trim();
  if (!lower) return { height: 2, frontness: 2, rounding: 0 };

  let bestMatch = '';
  let bestLen = 0;
  for (const key of Object.keys(EN_VOWEL_FEATURES)) {
    if (lower.includes(key) && key.length > bestLen) {
      bestMatch = key;
      bestLen = key.length;
    }
  }
  if (bestMatch) return EN_VOWEL_FEATURES[bestMatch];

  for (const ch of lower) {
    if (EN_VOWEL_CHARS.has(ch) && EN_VOWEL_FEATURES[ch]) {
      return EN_VOWEL_FEATURES[ch];
    }
  }

  return { height: 2, frontness: 2, rounding: 0 };
}

function vowelFeatureDistance(a: VowelFeatures, b: VowelFeatures): number {
  const hDiff = Math.abs(a.height - b.height) / 2;
  const fDiff = Math.abs(a.frontness - b.frontness) / 2;
  const rDiff = Math.abs(a.rounding - b.rounding);
  const distance = hDiff * 0.30 + fDiff * 0.40 + rDiff * 0.30;
  return Math.min(1, distance);
}

function getPinyinFinalFeatures(final: string): VowelFeatures {
  return PINYIN_FINAL_FEATURES[final] || { height: 2, frontness: 2, rounding: 0 };
}

function finalVowelSimilarity(pinyinFinal: string, enVowelCluster: string): number {
  const cnFeatures = getPinyinFinalFeatures(pinyinFinal);
  const enFeatures = getEnVowelFeatures(enVowelCluster);
  return 1 - vowelFeatureDistance(cnFeatures, enFeatures);
}

// ===== 5. 辅音相似度映射（V2.6 增强版）=====

/**
 * ★ V2.6 关键优化：
 * - zh→ch/ch→zh 从 0.6 提升到 0.8（粤语拼音中 zh→ch 非常常见）
 * - sh→s/s→sh 从 0.5 提升到 0.7
 * - x→sh/sh→x 从 0.4 提升到 0.5
 * - 增加清浊辅音配对（d→t, g→k, b→p）从 0.7 提升到 0.8
 */
function consonantSimilarity(cnInit: string, enOnset: string): number {
  if (!cnInit && !enOnset) return 0.7;
  if (!cnInit) return 0.3;
  if (!enOnset) return 0.1;

  const cn = cnInit.toLowerCase();
  const en = enOnset.toLowerCase();

  if (cn === en) return 1;
  if (cn[0] === en[0]) return 0.7;

  const similarPairs: [string, string[], number][] = [
    // 清浊辅音配对（V2.6 从0.7提升到0.8）
    ['b', ['p'], 0.8],
    ['p', ['b'], 0.8],
    ['d', ['t'], 0.8],
    ['t', ['d'], 0.8],
    ['g', ['k'], 0.8],
    ['k', ['g'], 0.8],
    // 塞擦音配对（V2.6 增强）
    ['zh', ['ch', 'j', 'z', 'dr'], 0.8],  // 0.6→0.8
    ['ch', ['zh', 'c', 'q', 'tr'], 0.8],  // 0.6→0.8
    ['sh', ['s', 'x', 'sch', 'sh'], 0.7], // 0.5→0.7
    ['z', ['c', 's', 'ds'], 0.7],
    ['c', ['z'], 0.6],
    // 擦音配对（V2.6 增强）
    ['x', ['sh', 's', 'z', 'x'], 0.5],    // 0.4→0.5
    ['f', ['v', 'ph', 'wh'], 0.5],
    ['v', ['f'], 0.5],
    ['s', ['c', 'z', 'sh', 'x', 'th'], 0.5],
    ['j', ['g', 'zh', 'd', 'dj'], 0.5],   // 0.4→0.5
    ['q', ['ch', 'k', 'c'], 0.4],
    // 半元音/近音
    ['y', ['j', 'i', 'y'], 0.5],           // 0.3→0.5
    ['w', ['v', 'u', 'o', 'w'], 0.5],     // 0.3→0.5
    ['r', ['l', 'r', 'rh'], 0.4],         // 0.3→0.4
    ['l', ['n', 'r'], 0.3],
    // 鼻音
    ['m', ['n'], 0.2],
    ['n', ['m', 'l'], 0.2],
    ['h', ['f', 'g', 'k'], 0.2],
    ['ng', ['n', 'ng', 'g'], 0.5],
  ];

  for (const [from, tos, sim] of similarPairs) {
    if (cn === from || cn.startsWith(from)) {
      for (const to of tos) {
        if (en.startsWith(to) || en === to) return sim;
      }
    }
  }

  if (cn[0] === en[0]) return 0.5;
  return 0;
}

/**
 * ★ V2.6 新增：检测英文声母是否为辅音丛（如 "gl", "gr", "st", "spr" 等）
 * 中文一个声母匹配英文辅音丛时，需要分数惩罚
 */
function isConsonantCluster(onset: string): boolean {
  if (onset.length <= 1) return false;
  const consonants = onset.replace(/[aeiouy]/g, '');
  return consonants.length >= 2;
}

/**
 * ★ V2.6 新增：辅音丛惩罚系数
 * 中文单声母匹配英文双辅音丛时降低分数
 * 例如：g → gl 得分为 consonantSimilarity("g", "gl") 的 70%
 */
function applyClusterPenalty(baseScore: number, cnInit: string, enOnset: string): number {
  if (baseScore <= 0) return 0;
  if (!cnInit) return baseScore * 0.5;

  // 提取英文声母的辅音部分
  const enConsonants = enOnset.replace(/[aeiouy]/g, '');
  const enClusterLen = enConsonants.length;
  const cnConsonants = cnInit.replace(/[aeiouy]/g, '').length;

  // 英文辅音丛 vs 中文单声母 → 惩罚
  if (enClusterLen >= 2 && cnConsonants <= 1) {
    // 如果英文首位辅音与中文声母相同，适度惩罚
    if (cnInit[0] === enConsonants[0]) {
      return baseScore * 0.75; // 75% 保留（V2.6 新值）
    }
    // 首位不同但近似，更重惩罚
    return baseScore * 0.6;
  }

  return baseScore;
}

// ===== 6. 尾音匹配 =====

function endingSimilarity(cnEnding: string | null, enCoda: string): number {
  if (!cnEnding && !enCoda) return 1;
  if (!cnEnding) return 0.3;
  if (!enCoda) return 0.1;

  const cn = cnEnding.toLowerCase();
  const en = enCoda.toLowerCase();

  if (cn === en) return 1;

  const endingSim: [string, string[], number][] = [
    ['ng', ['n', 'nk', 'nc', 'ng', 'g'], 0.6],
    ['n',  ['ng', 'ne', 'nn', 'nd', 'nt', 'n'], 0.6], // V2.6 加强: n→n 匹配
    ['r',  ['r', 're', 'er', 'rr'], 0.7],
    ['m',  ['n', 'm', 'mb', 'me', 'mn'], 0.4],
    ['t',  ['t', 'te', 'ed', 'tt', 'd'], 0.5],
    ['d',  ['d', 'de', 'ed', 't'], 0.5],
    ['l',  ['l', 'll', 'le', 'el', 'al'], 0.6],
    ['s',  ['s', 'ce', 'se', 'ss', 'z'], 0.5],
  ];

  for (const [from, tos, sim] of endingSim) {
    if (cn === from) {
      for (const to of tos) {
        if (en === to || en.endsWith(to)) return sim;
      }
    }
  }

  if (cn.length > 0 && en.length > 0) {
    const cnLast = cn[cn.length - 1];
    const enLast = en[en.length - 1];
    if (cnLast === enLast) return 0.5;
    if ((cnLast === 'n' && enLast === 'g') || (cnLast === 'g' && enLast === 'n')) return 0.4;
    if ((cnLast === 'n' && enLast === 'm') || (cnLast === 'm' && enLast === 'n')) return 0.4;
    if (en.includes(cn)) return 0.3;
  }

  return 0;
}

// ===== 7. 核心匹配算法 =====

export interface SoundStructure {
  syllableCount: number;
  initials: string[];
  finals: string[];
  endings: (string | null)[];
  pattern: string;
  source: string;
}

export function buildStructureFromPinyin(pinyinInput: string): SoundStructure {
  const syllables = parsePinyinSyllables(pinyinInput);
  if (syllables.length === 0) {
    return { syllableCount: 0, initials: [], finals: [], endings: [], pattern: '', source: 'pinyin' };
  }

  const initials = syllables.map(s => s.initial);
  const finals = syllables.map(s => s.final);
  const endings = syllables.map(s => extractEnding(s.final));
  const pattern = syllables.map(s => `${s.initial},${s.final},${extractEnding(s.final) || ''}`).join('|');
  const fullPattern = `${syllables.length}-${pattern}`;

  return {
    syllableCount: syllables.length,
    initials, finals, endings,
    pattern: fullPattern, source: 'pinyin',
  };
}

export interface SyllableMatchDetail {
  position: number;
  pinyinSyllable: string;
  enSyllable: string;
  initialScore: number;
  finalScore: number;
  endingScore: number;
  combinedScore: number;
}

export interface StructureMatchResult {
  score: number;
  details: string[];
  matchDetails: {
    syllableCountMatch: boolean;
    syllableSimilarity: number;
    initialMatchScore: number;
    finalMatchScore: number;
    endingMatchScore: number;
    overallVowelSequence: number;
  };
  perSyllableDetails: SyllableMatchDetail[];
}

/**
 * ★★★ V2.6 核心匹配算法 ★★★
 *
 * V2.6 关键改进：
 * 1. PINYIN_FINAL_FEATURES 增强：鼻音韵母(ang/eng/ing/ong等)使用不同特征值
 *    → 避免 "ang" 100% 匹配 "a", "eng" 100% 匹配 "e"
 * 2. 辅音丛惩罚：英文 "gl"/"gr"/"st" 等匹配中文单声母时降分
 *    → 避免 "guo" 匹配 "glo" 得高分
 * 3. 元音序列(LCS)直接加入最终分数
 *    → 提升整体元音匹配度高的名字
 * 4. 音节差异惩罚加强
 * 5. 辅音相似度表增强：zh→ch 0.8, sh→s 0.7
 *    → 提升 "zhang→Cheung" 匹配度
 */
export function matchStructures(
  pinyinStruct: SoundStructure,
  enName: string
): StructureMatchResult {
  const details: string[] = [];
  const enLower = enName.toLowerCase().trim();

  if (enLower.length < 1) {
    return {
      score: 0,
      details: ['英文名为空'],
      matchDetails: {
        syllableCountMatch: false, syllableSimilarity: 0,
        initialMatchScore: 0, finalMatchScore: 0, endingMatchScore: 0,
        overallVowelSequence: 0,
      },
      perSyllableDetails: [],
    };
  }

  // 1. 切分英文名为音节
  const enSyllables = splitEnglishIntoSyllables(enName);
  const enSyllableCount = enSyllables.length;
  const cnSyllableCount = pinyinStruct.syllableCount;

  // 2. 字母数过滤
  if (enLower.length < cnSyllableCount * 1.5 && enLower.length < 3) {
    return {
      score: 0,
      details: [`英文名"${enName}"太短(${enLower.length})`],
      matchDetails: {
        syllableCountMatch: false, syllableSimilarity: 0,
        initialMatchScore: 0, finalMatchScore: 0, endingMatchScore: 0,
        overallVowelSequence: 0,
      },
      perSyllableDetails: [],
    };
  }

  // 3. 构建中文拼音音节对象
  const cnSyllables = pinyinStruct.initials.map((init, i) => ({
    full: init + pinyinStruct.finals[i],
    initial: init,
    final: pinyinStruct.finals[i],
    ending: pinyinStruct.endings[i] || null,
  }));

  // 4. 尝试多种对齐策略，取最高分
  interface AlignResult {
    pairs: Array<{
      cnSyl: typeof cnSyllables[0];
      enSyl: EnPhonemeSyllable;
    }>;
    details: string[];
  }

  function scorePair(cnSyl: typeof cnSyllables[0], enSyl: EnPhonemeSyllable): {
    initScore: number; finalScore: number; endScore: number; combined: number;
  } {
    let initScore = consonantSimilarity(cnSyl.initial, enSyl.onset);

    // ★ V2.6 关键词改进：辅音丛惩罚
    initScore = applyClusterPenalty(initScore, cnSyl.initial, enSyl.onset);

    const firstLetter = enSyl.full[0] || '';
    let extraInit = 0;
    if (firstLetter && cnSyl.initial) {
      const flSim = consonantSimilarity(cnSyl.initial, firstLetter);
      extraInit = flSim > 0 ? Math.min(1, flSim + 0.1) : 0;
    }
    const effectiveInitScore = Math.max(initScore, extraInit * 0.6);

    // ★ V2.6 关键词改进：韵母评分更严格
    let finalScore = finalVowelSimilarity(cnSyl.final, enSyl.nucleus);

    // ★ V2.6 降低字母级元音序列增强的权重
    const cnVowels = cnSyl.final.replace(/[^aeiou]/g, '');
    const enVowels = enSyl.nucleus.replace(/[^aeiou]/g, '');
    if (cnVowels && enVowels && cnVowels !== enVowels) {
      let bestSubSim = 0;
      for (const cv of cnVowels) {
        for (const ev of enVowels) {
          const dist = vowelFeatureDistance(
            getPinyinFinalFeatures(cv),
            getEnVowelFeatures(ev)
          );
          bestSubSim = Math.max(bestSubSim, 1 - dist);
        }
      }
      // V2.6: 从 0.75 降低到 0.5，减少过度膨胀
      finalScore = Math.max(finalScore, bestSubSim * 0.5);
    }

    const endScore = endingSimilarity(cnSyl.ending, enSyl.coda);

    // ★ V2.6 权重调整：韵母降到0.45，声母提升到0.30，尾音提升到0.25
    const combined = effectiveInitScore * 0.30 + finalScore * 0.45 + endScore * 0.25;
    return { initScore: effectiveInitScore, finalScore, endScore, combined };
  }

  function tryAlign(mapping: number[]): AlignResult {
    const pairs: Array<{ cnSyl: typeof cnSyllables[0]; enSyl: EnPhonemeSyllable }> = [];
    const det: string[] = [];
    const enUsed = new Set<number>();

    for (let ci = 0; ci < cnSyllables.length; ci++) {
      const ei = mapping[ci];
      if (ei === -1 || ei >= enSyllables.length) continue;
      if (enUsed.has(ei)) continue;

      const cnSyl = cnSyllables[ci];
      const enSyl = enSyllables[ei];
      pairs.push({ cnSyl, enSyl });
      enUsed.add(ei);

      const s = scorePair(cnSyl, enSyl);
      det.push(
        `音节${ci + 1}: ${cnSyl.initial}${cnSyl.final}(${cnSyl.ending || '∅'}) vs ${enSyl.onset}${enSyl.nucleus}(${enSyl.coda || '∅'}) → ` +
        `声母${Math.round(s.initScore * 100)}分/韵母${Math.round(s.finalScore * 100)}分/尾音${Math.round(s.endScore * 100)}分`
      );
    }

    for (let ci = 0; ci < cnSyllables.length; ci++) {
      const ei = mapping[ci];
      if (ei !== -1 && ei < enSyllables.length && !enUsed.has(ei)) {
      } else if (ei === -1) {
        det.push(`  音节${ci + 1}(${cnSyllables[ci].full}): 无对应英文音节 → 低分`);
      }
    }

    return { pairs, details: det };
  }

  const alignments: Array<{ name: string; mapping: number[] }> = [];

  // A) 1:1 对齐
  if (cnSyllableCount <= enSyllableCount) {
    const mapping1to1: number[] = [];
    for (let i = 0; i < cnSyllableCount; i++) mapping1to1.push(i);
    alignments.push({ name: '1:1', mapping: mapping1to1 });
  }

  // D) 只匹配首音节
  if (enSyllableCount === 1 && cnSyllableCount > 1) {
    alignments.push({ name: 'multi:1', mapping: Array(cnSyllableCount).fill(0) });
  }

  // B) 中文多：合并
  if (cnSyllableCount > enSyllableCount) {
    const mappingMerged: number[] = [];
    for (let i = 0; i < enSyllableCount; i++) mappingMerged.push(i);
    for (let i = enSyllableCount; i < cnSyllableCount; i++) {
      mappingMerged.push(enSyllableCount - 1);
    }
    alignments.push({ name: 'merge2last', mapping: mappingMerged });
  }

  // D) 首音节优先
  if (enSyllableCount > cnSyllableCount) {
    const mappingFirst: number[] = [];
    for (let i = 0; i < cnSyllableCount; i++) mappingFirst.push(i);
    alignments.push({ name: 'firstMatch', mapping: mappingFirst });
  }

  // 评估所有对齐策略
  let bestResult: AlignResult | null = null;
  let bestAvg = 0;

  for (const align of alignments) {
    const result = tryAlign(align.mapping);
    if (result.pairs.length === 0) continue;

    let totalInit = 0, totalFinal = 0, totalEnd = 0;
    for (const p of result.pairs) {
      const s = scorePair(p.cnSyl, p.enSyl);
      totalInit += s.initScore;
      totalFinal += s.finalScore;
      totalEnd += s.endScore;
    }
    const n = result.pairs.length;
    const avg = totalInit / n * 0.30 + totalFinal / n * 0.45 + totalEnd / n * 0.25;

    if (avg > bestAvg) {
      bestAvg = avg;
      bestResult = result;
    }
  }

  if (!bestResult || bestResult.pairs.length === 0) {
    return {
      score: 0,
      details: ['无法创建有效对齐'],
      matchDetails: {
        syllableCountMatch: false, syllableSimilarity: 0,
        initialMatchScore: 0, finalMatchScore: 0, endingMatchScore: 0,
        overallVowelSequence: 0,
      },
      perSyllableDetails: [],
    };
  }

  // 5. 计算最终分数
  const perSyllableDetails: SyllableMatchDetail[] = [];
  let totalInitialScore = 0, totalFinalScore = 0, totalEndingScore = 0;
  let matchedPairs = 0;

  for (let i = 0; i < bestResult.pairs.length; i++) {
    const pair = bestResult.pairs[i];
    const s = scorePair(pair.cnSyl, pair.enSyl);

    const firstSyllableMultiplier = i === 0 ? 1.3 : 1.0;
    const weightCombined = Math.min(1, s.combined * firstSyllableMultiplier);

    perSyllableDetails.push({
      position: i + 1,
      pinyinSyllable: pair.cnSyl.full,
      enSyllable: pair.enSyl.full,
      initialScore: Math.round(s.initScore * 100),
      finalScore: Math.round(s.finalScore * 100),
      endingScore: Math.round(s.endScore * 100),
      combinedScore: Math.round(weightCombined * 100),
    });

    totalInitialScore += s.initScore;
    totalFinalScore += s.finalScore;
    totalEndingScore += s.endScore;
    matchedPairs++;
  }

  const avgInitial = matchedPairs > 0 ? totalInitialScore / matchedPairs : 0;
  const avgFinal = matchedPairs > 0 ? totalFinalScore / matchedPairs : 0;
  const avgEnding = matchedPairs > 0 ? totalEndingScore / matchedPairs : 0;

  // ★ V2.6 音节差异惩罚加强
  const syllDiff = Math.abs(cnSyllableCount - enSyllableCount);
  const syllableSimilarity = syllDiff === 0 ? 1.0 :
    syllDiff === 1 ? 0.6 :  // V2.6: 从 0.7 降到 0.6
    syllDiff === 2 ? 0.2 :  // V2.6: 从 0.3 降到 0.2
    0.05;

  // 元音序列相似度（LCS）
  const overallVowelSequence = calcVowelSequenceScore(
    pinyinStruct.finals.join(''),
    enSyllables.map(s => s.nucleus).join('')
  );

  // ★ V2.6 新增：匹配对覆盖率（匹配的音节对占英文音节总数的比例）
  const enSyllableCoverage = enSyllableCount > 0 ?
    bestResult.pairs.length / Math.max(cnSyllableCount, enSyllableCount) : 0;

  // ★ V2.6 核心：重构最终分数计算
  // 提高元音序列 LCS 权重，降低音节差异权重
  const totalScore =
    avgInitial * 0.20 +                        // 声母匹配
    avgFinal * 0.40 +                          // 韵母匹配
    avgEnding * 0.10 +                         // 尾音匹配
    syllableSimilarity * 0.10 +                // 音节数接近度
    (overallVowelSequence / 100) * 0.15 +      // ★ V2.6 新增：元音序列 LCS
    enSyllableCoverage * 0.05;                 // ★ V2.6 新增：覆盖率

  // 额外加分：首字母匹配
  let bonusScore = 0;
  if (cnSyllableCount >= 1 && pinyinStruct.initials[0] && enLower.length > 0) {
    const firstCharMatch = consonantSimilarity(pinyinStruct.initials[0], enLower[0]);
    if (firstCharMatch >= 0.7) {
      bonusScore = 5;
    }
  }

  // ★ V2.6 新增：对未匹配英文尾音节施加惩罚（当英文音节比中文多时）
  let unmatchedPenalty = 0;
  if (enSyllableCount > cnSyllableCount) {
    const usedEnIndices = new Set<number>();
    for (const p of bestResult.pairs) {
      usedEnIndices.add(enSyllables.indexOf(p.enSyl));
    }
    const unMatchedCount = enSyllableCount - usedEnIndices.size;
    if (unMatchedCount > 0) {
      unmatchedPenalty = unMatchedCount * 5;
    }
  }

  const finalScore = Math.max(0, Math.min(100,
    Math.round(totalScore * 100 + bonusScore - unmatchedPenalty)
  ));

  bestResult.details.forEach(d => details.push(d));
  details.push(
    `声母平均: ${Math.round(avgInitial * 100)}分, ` +
    `韵母平均: ${Math.round(avgFinal * 100)}分, ` +
    `尾音平均: ${Math.round(avgEnding * 100)}分, ` +
    `音节接近: ${Math.round(syllableSimilarity * 100)}分, ` +
    `元音序列: ${overallVowelSequence}分, ` +
    `覆盖率: ${Math.round(enSyllableCoverage * 100)}%, ` +
    `未匹配罚: -${unmatchedPenalty}分, ` +
    `首字母加: ${Math.round(bonusScore)}分 → 综合${finalScore}分`
  );

  return {
    score: finalScore,
    details,
    matchDetails: {
      syllableCountMatch: cnSyllableCount === enSyllableCount,
      syllableSimilarity: Math.round(syllableSimilarity * 100),
      initialMatchScore: Math.round(avgInitial * 100),
      finalMatchScore: Math.round(avgFinal * 100),
      endingMatchScore: Math.round(avgEnding * 100),
      overallVowelSequence: Math.round(overallVowelSequence),
    },
    perSyllableDetails,
  };
}

function calcVowelSequenceScore(pinyinFinalSeq: string, enNucleusSeq: string): number {
  const cnVs = pinyinFinalSeq.replace(/[^aeiou]/g, '');
  const enVs = enNucleusSeq.replace(/[^aeiou]/g, '');

  if (!cnVs && !enVs) return 50;
  if (!cnVs) return 30;
  if (!enVs) return 0;

  const lcsLen = longestCommonSubsequence(cnVs, enVs);
  const maxLen = Math.max(cnVs.length, enVs.length);
  return maxLen > 0 ? (lcsLen / maxLen) * 100 : 50;
}

function longestCommonSubsequence(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// ===== 8. 外部接口 =====

export interface PhoneticStructureResult {
  name: string;
  score: number;
  details: string[];
  perSyllableDetails: SyllableMatchDetail[];
}

/**
 * 匹配拼音到某个英文名
 */
export function matchPinyinToEnglishName(pinyin: string, enName: string): StructureMatchResult {
  const struct = buildStructureFromPinyin(pinyin);
  return matchStructures(struct, enName);
}

/**
 * 对候选英文名列表按匹配度排序
 */
export function sortByStructureMatch(pinyin: string, candidates: string[]): PhoneticStructureResult[] {
  const struct = buildStructureFromPinyin(pinyin);
  const results = candidates.map(name => {
    const result = matchStructures(struct, name);
    return {
      name,
      score: result.score,
      details: result.details,
      perSyllableDetails: result.perSyllableDetails,
    };
  });
  return results.sort((a, b) => b.score - a.score);
}

/**
 * 测试结构匹配并输出简短摘要
 */
export function testStructureMatch(pinyin: string, enName: string): { score: number; summary: string } {
  const result = matchPinyinToEnglishName(pinyin, enName);
  const summary = `${pinyin}→${enName}: ${result.score}分 | ` +
    result.perSyllableDetails.map(d =>
      `第${d.position}音节: ${d.pinyinSyllable}~${d.enSyllable}(${d.initialScore},${d.finalScore},${d.endingScore})`
    ).join('; ');
  return { score: result.score, summary };
}

// ===== 9. 姓氏增强匹配 =====

/**
 * ★ V2.6 新增：根据拼音姓氏自动扩展候选英文姓氏
 * 例如：zhang → [Cheung, Zhang, Chang, Chong, Chung]
 * 使用 ename-surname-map 中的映射
 */
export function expandSurnameCandidates(
  surnamePinyin: string,
  surnameMap: Record<string, string>
): string[] {
  const pinyin = surnamePinyin.toLowerCase().trim();

  // 直接从映射查找
  if (surnameMap[pinyin]) {
    return [surnameMap[pinyin], ...(surnameMapAlternative[pinyin] || [])];
  }

  // 通过拼音结构匹配查找最接近的映射
  const candidates: Array<{ name: string; score: number }> = [];
  for (const [key, value] of Object.entries(surnameMap)) {
    const sim = matchPinyinToEnglishName(pinyin, value);
    if (sim.score >= 50) {
      candidates.push({ name: value, score: sim.score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.map(c => c.name);
}

// 备用姓氏映射（允许多个候选）
const surnameMapAlternative: Record<string, string[]> = {
  'zhang': ['Cheung', 'Chang', 'Chong', 'Chung'],
  'chen': ['Chen', 'Chan', 'Chin', 'Tan'],
  'wang': ['Wang', 'Wong', 'Vong'],
  'li': ['Li', 'Lee', 'Lei'],
  'liu': ['Liu', 'Lau', 'Low'],
  'huang': ['Huang', 'Wong', 'Vong'],
  'wu': ['Wu', 'Ng', 'Woo'],
  'zhao': ['Zhao', 'Chiu', 'Chew'],
  'zhou': ['Zhou', 'Chow', 'Chou'],
  'sun': ['Sun', 'Suen', 'Soon'],
  'xu': ['Xu', 'Hsu', 'Tsui', 'Chu'],
  'zhu': ['Zhu', 'Chu', 'Chuk'],
};