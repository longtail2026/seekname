/**
 * 测试中文拼音 → 英文发音结构匹配算法
 * 
 * 运行: node test_structure_match.mjs
 */

// 因为文件是TS的，我们用同样的逻辑写一个纯JS测试

// ===== 拼音音节解析 =====

const PINYIN_INITIALS = [
  'zh', 'ch', 'sh',
  'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
  'g', 'k', 'h', 'j', 'q', 'x',
  'r', 'z', 'c', 's', 'y', 'w'
];

const PINYIN_ENDING_CONSONANTS = ['ng', 'n', 'r'];

function extractInitial(pinyin) {
  const lower = pinyin.toLowerCase().trim();
  for (const init of PINYIN_INITIALS) {
    if (lower.startsWith(init)) return init;
  }
  return '';
}

function extractFinal(pinyin) {
  const initial = extractInitial(pinyin);
  return pinyin.slice(initial.length).toLowerCase();
}

function extractEnding(pinyin) {
  const finalPart = extractFinal(pinyin);
  for (const end of PINYIN_ENDING_CONSONANTS) {
    if (finalPart.endsWith(end)) {
      if (end === 'ng' && finalPart.length >= 3) return 'ng';
      if (end === 'n' && finalPart.length >= 2) return 'n';
      if (end === 'r' && finalPart.length >= 2) return 'r';
    }
  }
  return null;
}

const knownSyllables = [
  'zha', 'zhe', 'zhi', 'zho', 'zhu', 'zhua', 'zhuai', 'zhuan', 'zhuang', 'zhuo',
  'cha', 'che', 'chi', 'cho', 'chu', 'chua', 'chuai', 'chuan', 'chuang', 'chuo',
  'sha', 'she', 'shi', 'sho', 'shu', 'shua', 'shuai', 'shuan', 'shuang', 'shuo',
  'ba', 'bo', 'bi', 'bu', 'bai', 'bei', 'bao', 'ban', 'ben', 'bin', 'bang', 'beng', 'bian', 'biao', 'bie', 'bin', 'bing',
  'pa', 'po', 'pi', 'pu', 'pai', 'pei', 'pao', 'pan', 'pen', 'pin', 'pang', 'peng', 'pian', 'piao', 'pie', 'pin', 'ping',
  'ma', 'mo', 'mi', 'mu', 'mai', 'mei', 'mao', 'man', 'men', 'min', 'mang', 'meng', 'mian', 'miao', 'mie', 'min', 'ming', 'miu',
  'fa', 'fo', 'fu', 'fan', 'fen', 'fang', 'feng', 'fei', 'fou',
  'da', 'de', 'di', 'du', 'dai', 'dei', 'dao', 'dan', 'den', 'din', 'dang', 'deng', 'dian', 'diao', 'die', 'ding', 'diu', 'dong', 'dou', 'duan', 'dui', 'dun', 'duo',
  'ta', 'te', 'ti', 'tu', 'tai', 'tao', 'tan', 'tang', 'teng', 'tian', 'tiao', 'tie', 'ting', 'tong', 'tou', 'tuan', 'tui', 'tun', 'tuo',
  'na', 'ne', 'ni', 'nu', 'nv', 'nai', 'nei', 'nao', 'nan', 'nen', 'nin', 'nang', 'neng', 'nian', 'niang', 'niao', 'nie', 'nin', 'ning', 'niu', 'nong', 'nou', 'nuan', 'nuo', 'nve',
  'la', 'le', 'li', 'lu', 'lv', 'lai', 'lei', 'lao', 'lan', 'len', 'lin', 'lang', 'leng', 'lian', 'liang', 'liao', 'lie', 'lin', 'ling', 'liu', 'long', 'lou', 'luan', 'lun', 'luo', 'lve',
  'ga', 'ge', 'gu', 'gai', 'gei', 'gao', 'gan', 'gen', 'gang', 'geng', 'gong', 'gou', 'gu', 'gua', 'guai', 'guan', 'guang', 'gui', 'gun', 'guo',
  'ka', 'ke', 'ku', 'kai', 'kao', 'kan', 'ken', 'kang', 'keng', 'kong', 'kou', 'kua', 'kuai', 'kuan', 'kuang', 'kui', 'kun', 'kuo',
  'ha', 'he', 'hu', 'hai', 'hao', 'han', 'hen', 'hang', 'heng', 'hong', 'hou', 'hua', 'huai', 'huan', 'huang', 'hui', 'hun', 'huo',
  'ji', 'ju', 'jia', 'jian', 'jiang', 'jiao', 'jie', 'jin', 'jing', 'jiong', 'jiu', 'juan', 'jue', 'jun',
  'qi', 'qu', 'qia', 'qian', 'qiang', 'qiao', 'qie', 'qin', 'qing', 'qiong', 'qiu', 'quan', 'que', 'qun',
  'xi', 'xu', 'xia', 'xian', 'xiang', 'xiao', 'xie', 'xin', 'xing', 'xiong', 'xiu', 'xuan', 'xue', 'xun',
  'ri', 'ran', 'ren', 'rang', 'reng', 'rong', 'rou', 'ru', 'ruan', 'rui', 'run', 'ruo',
  'za', 'ze', 'zi', 'zu', 'zai', 'zei', 'zao', 'zan', 'zen', 'zin', 'zang', 'zeng', 'zong', 'zou', 'zuan', 'zui', 'zun', 'zuo',
  'ca', 'ce', 'ci', 'cu', 'cai', 'cao', 'can', 'cen', 'cin', 'cang', 'ceng', 'cong', 'cou', 'cuan', 'cui', 'cun', 'cuo',
  'sa', 'se', 'si', 'su', 'sai', 'sao', 'san', 'sen', 'sin', 'sang', 'seng', 'song', 'sou', 'suan', 'sui', 'sun', 'suo',
  'ya', 'yo', 'ye', 'yi', 'yao', 'you', 'yan', 'yang', 'yin', 'ying', 'yong', 'yu', 'yuan', 'yue', 'yun',
  'wa', 'wo', 'wu', 'wai', 'wei', 'wan', 'wen', 'wang', 'weng',
  'er', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng',
];
const knownSet = new Set(knownSyllables);

function parsePinyinSyllables(input) {
  let cleaned = input.toLowerCase().trim().replace(/[0-9]/g, '');
  const toneMap = {
    'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
    'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
    'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
    'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v',
  };
  cleaned = cleaned.split('').map(ch => toneMap[ch] || ch).join('');

  if (cleaned.includes(' ')) {
    return cleaned.split(/\s+/).filter(s => s.length > 0).map(syll => ({
      full: syll,
      initial: extractInitial(syll),
      final: extractFinal(syll),
      ending: extractEnding(syll),
    }));
  }

  const syllables = [];
  let i = 0;
  while (i < cleaned.length) {
    let maxLen = Math.min(cleaned.length - i, 6);
    let found = false;
    for (let len = maxLen; len >= 1; len--) {
      const candidate = cleaned.substring(i, i + len);
      if (knownSet.has(candidate)) {
        const full = candidate;
        const initial = extractInitial(full);
        const finalPart = extractFinal(full);
        const ending = extractEnding(full);
        syllables.push({ full, initial, final: finalPart, ending });
        i += len;
        found = true;
        break;
      }
    }
    if (!found) {
      const ch = cleaned[i];
      syllables.push({ full: ch, initial: ch, final: '', ending: null });
      i++;
    }
  }
  return syllables;
}

// ===== 英文名音节估计 =====

function estimateSyllableCount(name) {
  const lower = name.toLowerCase().replace(/[^a-z]/g, '');
  if (lower.length === 0) return 1;
  const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
  let count = 0;
  let prevIsVowel = false;
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    const isVowel = vowels.has(ch) || (ch === 'y' && i === lower.length - 1) || (ch === 'y' && i > 0 && i < lower.length - 1);
    if (isVowel) {
      if (!prevIsVowel) count++;
      prevIsVowel = true;
    } else {
      prevIsVowel = false;
    }
  }
  if (lower.endsWith('e') && count > 1 && lower.length > 3) {
    const secondLast = lower[lower.length - 2];
    if (!vowels.has(secondLast) && secondLast !== 'y') count--;
  }
  return Math.max(1, count);
}

// ===== 韵母相似度映射 =====

const FINAL_TO_EN_PHONEMES = {
  'a': ['a', 'ah', 'ar', 'er'],
  'o': ['o', 'oh', 'au'],
  'e': ['e', 'eh', 'er', 'a'],
  'i': ['i', 'ee', 'ie', 'y'],
  'u': ['u', 'oo', 'ue', 'ou'],
  'v': ['u', 'ue', 'ew'],
  'ai': ['ai', 'ay', 'ei', 'ey', 'i'],
  'ei': ['ei', 'ay', 'eigh', 'ai'],
  'ao': ['ao', 'au', 'ow', 'ou'],
  'ou': ['ou', 'ow', 'oa', 'o'],
  'ia': ['ia', 'ya', 'ea'],
  'ie': ['ie', 'ye', 'ea', 'e'],
  'iu': ['iu', 'you', 'ew', 'u'],
  'io': ['io', 'yo', 'eo'],
  'ua': ['ua', 'wa'],
  'uo': ['uo', 'wo', 'wa', 'o', 'oa'],
  'ui': ['ui', 'way', 'ue'],
  'ue': ['ue', 'ew'],
  'an': ['an', 'en', 'ahn', 'ann'],
  'en': ['en', 'an', 'enn', 'in'],
  'in': ['in', 'een', 'inn'],
  'un': ['un', 'on', 'one'],
  'vn': ['un', 'ion', 'un'],
  'ang': ['ang', 'ong', 'ung', 'eng'],
  'eng': ['eng', 'ung', 'ing', 'ang'],
  'ing': ['ing', 'eng', 'ink'],
  'ong': ['ong', 'ung', 'ang'],
  'ian': ['ian', 'ien', 'ean', 'en'],
  'iang': ['iang', 'iong', 'yang'],
  'iong': ['iong', 'young'],
  'uang': ['uang', 'wang', 'ong'],
  'uai': ['uai', 'wai', 'wi'],
  'uan': ['uan', 'wan', 'un', 'one'],
  'uen': ['uen', 'wen', 'un'],
  'van': ['van', 'uan', 'wen'],
  've': ['ve', 'ue', 'vay'],
  'er': ['er', 'ar', 'or', 'ur', 'ir'],
  'zhi': ['ji', 'zhi', 'zi', 'gee'],
  'chi': ['chi', 'chee', 'chih'],
  'shi': ['shi', 'shee', 'shih'],
  'ri': ['ri', 'ree', 'rih'],
  'zi': ['zi', 'zee'],
  'ci': ['ci', 'chee', 'tsi'],
  'si': ['si', 'see'],
};

// ===== 匹配函数 =====

function checkInitialInEnName(initial, enLower) {
  const initialMap = {
    'b': ['b'], 'p': ['p'], 'm': ['m'], 'f': ['f'],
    'd': ['d'], 't': ['t'], 'n': ['n'], 'l': ['l'],
    'g': ['g'], 'k': ['k', 'c'], 'h': ['h'],
    'j': ['j'], 'q': ['q', 'ch'], 'x': ['x', 'sh'],
    'zh': ['j', 'ch'], 'ch': ['ch'], 'sh': ['sh'],
    'r': ['r'], 'z': ['z', 'ts'], 'c': ['c', 'ts'],
    's': ['s', 'c'], 'y': ['y'], 'w': ['w'],
  };
  const letters = initialMap[initial] || [initial];
  for (const letter of letters) {
    const clean = letter.replace(/[\(\)]/g, '').trim();
    if (enLower.includes(clean) || enLower.startsWith(clean)) return true;
  }
  if (initial === '') {
    return ['a', 'e', 'i', 'o', 'u'].some(v => enLower.startsWith(v));
  }
  return false;
}

function checkFinalInEnName(final, enLower) {
  const phonemes = FINAL_TO_EN_PHONEMES[final];
  if (!phonemes) return enLower.includes(final);
  for (const phoneme of phonemes) {
    const clean = phoneme.replace(/-/g, '');
    if (clean.length >= 2) {
      if (enLower.includes(clean) || enLower.endsWith(clean)) return true;
    } else if (clean.length === 1) {
      if ('aeiou'.includes(clean) && enLower.includes(clean)) return true;
    }
  }
  return false;
}

function checkEndingInEnName(ending, enLower) {
  const endingMap = { 'ng': ['ng', 'nk', 'n'], 'n': ['n', 'ne', 'nn'], 'r': ['r', 're', 'er'] };
  const candidates = endingMap[ending] || [ending];
  return candidates.some(c => enLower.endsWith(c));
}

function longestCommonSubsequence(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function calcVowelSequenceScore(pinyinFinalsJoined, enLower) {
  const pinyinVowels = pinyinFinalsJoined.replace(/[^aeiou]/g, '');
  if (pinyinVowels.length === 0) return 50;
  const enVowels = enLower.replace(/[^aeiouy]/g, '');
  if (enVowels.length === 0) return 0;
  const lcsLen = longestCommonSubsequence(pinyinVowels, enVowels);
  const maxLen = Math.max(pinyinVowels.length, enVowels.length);
  return maxLen === 0 ? 50 : Math.round((lcsLen / maxLen) * 100);
}

function buildStructureFromPinyin(pinyinInput) {
  const syllables = parsePinyinSyllables(pinyinInput);
  if (syllables.length === 0) return { syllableCount: 0, initials: [], finals: [], endings: [], pattern: '' };
  const initials = syllables.map(s => s.initial);
  const finals = syllables.map(s => s.final);
  const endings = syllables.map(s => s.ending);
  const pattern = syllables.map(s => `${s.initial},${s.final},${s.ending || ''}`).join('|');
  const fullPattern = `${syllables.length}-${pattern}`;
  return { syllableCount: syllables.length, initials, finals, endings, pattern: fullPattern, source: 'pinyin' };
}

function matchStructures(pinyinStruct, enName) {
  const details = [];
  const enSyllableCount = estimateSyllableCount(enName);
  const enLower = enName.toLowerCase().trim();

  if (enLower.length < pinyinStruct.syllableCount * 2) {
    return { score: 0, details: [`英文名"${enName}"太短`] };
  }
  if (enSyllableCount !== pinyinStruct.syllableCount) {
    return { score: 0, details: [`音节数不匹配: 拼音${pinyinStruct.syllableCount}, 英文${enSyllableCount}`] };
  }

  const initialMatches = pinyinStruct.initials.map(init => checkInitialInEnName(init, enLower));
  const finalMatches = pinyinStruct.finals.map(fin => checkFinalInEnName(fin, enLower));
  const initialMatchScore = initialMatches.filter(Boolean).length / pinyinStruct.initials.length * 100;
  const finalMatchScore = finalMatches.filter(Boolean).length / pinyinStruct.finals.length * 100;
  const vowelSequenceScore = calcVowelSequenceScore(pinyinStruct.finals.join(''), enLower);

  const meaningfulEndings = pinyinStruct.endings.filter(e => e !== null && e !== undefined);
  let endingMatchScore = 50;
  if (meaningfulEndings.length > 0) {
    const endingMatched = meaningfulEndings.filter(e => e && checkEndingInEnName(e, enLower));
    endingMatchScore = (endingMatched.length / meaningfulEndings.length) * 100;
  }

  const rawScore = initialMatchScore * 0.40 + finalMatchScore * 0.40 + endingMatchScore * 0.20;
  const bonus = vowelSequenceScore > 70 ? 5 : vowelSequenceScore > 50 ? 3 : 0;
  const finalScore = Math.min(100, Math.round(rawScore + bonus));

  if (initialMatchScore >= 50) details.push(`✓ 声母匹配: ${pinyinStruct.initials.join(',')} → ${Math.round(initialMatchScore)}分`);
  else details.push(`✗ 声母匹配不足: ${Math.round(initialMatchScore)}分`);
  if (finalMatchScore >= 50) details.push(`✓ 韵母匹配: ${pinyinStruct.finals.join(',')} → ${Math.round(finalMatchScore)}分`);
  else details.push(`✗ 韵母匹配不足: ${Math.round(finalMatchScore)}分`);
  details.push(`  元音序列相似度: ${Math.round(vowelSequenceScore)}分`);
  
  return { score: finalScore, details, matchDetails: { initialMatchScore, finalMatchScore, endingMatchScore, vowelSequenceScore } };
}

function matchPinyinToEnglishName(pinyinInput, enName) {
  const pinyinStruct = buildStructureFromPinyin(pinyinInput);
  const matchResult = matchStructures(pinyinStruct, enName);
  return { score: matchResult.score, details: matchResult.details, structure: pinyinStruct, matchResult };
}

function sortByStructureMatch(pinyinInput, englishNames) {
  const pinyinStruct = buildStructureFromPinyin(pinyinInput);
  const scored = englishNames.map(name => {
    const matchResult = matchStructures(pinyinStruct, name);
    return { name, score: matchResult.score, details: matchResult.details };
  });
  return scored.sort((a, b) => b.score - a.score);
}

// ===== 测试 =====

console.log('===== 发音结构匹配测试 =====\n');

// 测试1: 拼音音节解析
console.log('--- 测试拼音解析 ---');
console.log('guoguang →', JSON.stringify(parsePinyinSyllables('guoguang')));
console.log('zhangsan →', JSON.stringify(parsePinyinSyllables('zhangsan')));
console.log('wei →', JSON.stringify(parsePinyinSyllables('wei')));
console.log('liming →', JSON.stringify(parsePinyinSyllables('liming')));
console.log('');

// 测试2: 英文名音节估计
console.log('--- 英文名音节估计 ---');
['Gordon', 'Glover', 'Galloway', 'Garrison', 'Gaylord', 'Geoffrey', 'George', 'Gavin', 'Gareth'].forEach(n => {
  console.log(`${n} → ${estimateSyllableCount(n)} 音节`);
});
console.log('');

// 测试3: 核心匹配
console.log('--- 核心匹配: guoguang ---');
const pinyinStruct = buildStructureFromPinyin('guoguang');
console.log('拼音结构:', JSON.stringify(pinyinStruct));

const names = ['Gordon', 'Glover', 'Galloway', 'Garrison', 'Gaylord', 'Geoffrey', 'George', 'Gavin', 'Gareth', 'Glenn', 'Gideon', 'Gilbert'];
for (const name of names) {
  const result = matchStructures(pinyinStruct, name);
  const icon = result.score >= 70 ? '✅' : result.score >= 50 ? '⚠️' : '❌';
  console.log(`${icon} guoguang → ${name}: ${result.score}分`);
}

console.log('\n--- 排序结果: guoguang ---');
const sorted = sortByStructureMatch('guoguang', names);
sorted.forEach((s, i) => console.log(`  ${i+1}. ${s.name}: ${s.score}分`));

console.log('\n--- 排序结果: wei ---');
const weiNames = ['Wayne', 'Wade', 'Ward', 'Wesley', 'William', 'Wilson', 'Weston', 'Warren'];
const weiSorted = sortByStructureMatch('wei', weiNames);
weiSorted.forEach((s, i) => console.log(`  ${i+1}. ${s.name}: ${s.score}分`));

console.log('\n--- 排序结果: xiaoming ---');
const xmNames = ['Simon', 'Simeon', 'Silas', 'Sidney', 'Samuel', 'Shawn', 'Shane', 'Scott'];
const xmSorted = sortByStructureMatch('xiaoming', xmNames);
xmSorted.forEach((s, i) => console.log(`  ${i+1}. ${s.name}: ${s.score}分`));