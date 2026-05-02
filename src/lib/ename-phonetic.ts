/**
 * 英文名拼音发音匹配引擎 v5.5 — 万能匹配法优化版
 * 
 * 核心思路：只抓"声母 + 核心韵母"，不纠结完整拼音，用英文音标去贴中文发音
 * 
 * 黄金规则：
 *   1. 只匹配"首字"：中文名一般只需要第一个字发音接近即可
 *   2. 抓"声母"优先：英文最看重开头辅音，和中文拼音声母一致就已经很像
 *   3. 弱化声调、忽略平翘舌/前后鼻音
 * 
 * 3步实操法：
 *   第1步：提取首字拼音
 *   第2步：用声母锁定候选英文名
 *   第3步：用韵母精准贴近
 * 
 * V6.3 新增：
 *   - 姓氏英文发音独立匹配（calcSurnameEnglishMatchScore）
 */

import { getSurnameEnglishExpressions } from './ename-surname-map';

/** ===== V5.5 核心变更：
 *   - 万能匹配法作为主要评分路径（取代复杂的多音节匹配）
 *   - 首字声母匹配优先级提升
 *   - 扩展声母→推荐名列表（涵盖用户指南所有示例）
 *   - 韵母精筛增强（匹配更多韵母→英文音素模式）
 */

// ========== 拼音→英文常见拼写映射表 ==========
// 每个拼音音节映射到它在英文名中可能出现的子串
// 注意：这些子串用于在英文名中进行子串匹配（case-insensitive）
const PINYIN_TO_EN_SUBSTRINGS: Record<string, string[]> = {
  // === B系列 ===
  'ba': ['ba', 'bah', 'bar'],
  'bai': ['bai', 'by', 'bye', 'bai'],
  'ban': ['ban', 'bahn', 'bon', 'bann'],
  'bang': ['bang', 'bong'],
  'bao': ['bao', 'bao', 'bow', 'bau'],
  'bei': ['bei', 'bay', 'bey'],
  'ben': ['ben', 'benn', 'ben'],
  'beng': ['beng', 'bung'],
  'bi': ['bi', 'bee', 'be', 'bi'],
  'bian': ['bian', 'been', 'bien', 'bian'],
  'biao': ['biao', 'byo', 'beo', 'bio'],
  'bie': ['bie', 'byeh'],
  'bin': ['bin', 'been', 'binn', 'bin'],
  'bing': ['bing', 'bing'],
  'bo': ['bo', 'bo', 'boe', 'bor'],
  'bu': ['bu', 'boo', 'bu'],

  // === P系列 ===
  'pa': ['pa', 'pah', 'par'],
  'pai': ['pai', 'pie', 'pai'],
  'pan': ['pan', 'pahn', 'pon', 'pann'],
  'pang': ['pang', 'pong'],
  'pao': ['pao', 'pau', 'pow'],
  'pei': ['pei', 'pay'],
  'pen': ['pen', 'penn', 'pen'],
  'peng': ['peng', 'pung'],
  'pi': ['pi', 'pee', 'pi'],
  'pian': ['pian', 'pien', 'pian'],
  'piao': ['piao', 'pyo', 'peo'],
  'pie': ['pie', 'pyeh'],
  'pin': ['pin', 'pinn', 'pin'],
  'ping': ['ping', 'ping'],
  'po': ['po', 'po', 'por'],
  'pou': ['pou', 'po'],
  'pu': ['pu', 'poo', 'pu'],

  // === M系列 ===
  'ma': ['ma', 'mah', 'mar'],
  'mai': ['mai', 'my', 'mai', 'may'],
  'man': ['man', 'mann', 'mon', 'man'],
  'mang': ['mang', 'mong'],
  'mao': ['mao', 'mau', 'mow'],
  'me': ['me', 'meh'],
  'mei': ['mei', 'may', 'mey'],
  'men': ['men', 'menn', 'men'],
  'meng': ['meng', 'mung'],
  'mi': ['mi', 'me', 'mee', 'mi'],
  'mian': ['mian', 'meen', 'mian'],
  'miao': ['miao', 'myo', 'meo', 'mia'],
  'mie': ['mie', 'myeh'],
  'min': ['min', 'meen', 'minn'],
  'ming': ['ming', 'ming'],
  'miu': ['miu', 'myu', 'meu'],
  'mo': ['mo', 'moe', 'mor'],
  'mou': ['mou', 'mo'],
  'mu': ['mu', 'moo', 'mu'],

  // === F系列 ===
  'fa': ['fa', 'fah', 'far'],
  'fan': ['fan', 'fahn', 'fon', 'fann'],
  'fang': ['fang', 'fong'],
  'fei': ['fei', 'fay', 'fey'],
  'fen': ['fen', 'fenn', 'fen'],
  'feng': ['feng', 'fung', 'fong'],
  'fo': ['fo', 'fo'],
  'fou': ['fou', 'fo'],
  'fu': ['fu', 'foo', 'fu'],

  // === D系列 ===
  'da': ['da', 'dah', 'dar'],
  'dai': ['dai', 'dye', 'die', 'di'],
  'dan': ['dan', 'dahn', 'don', 'dann'],
  'dang': ['dang', 'dong'],
  'dao': ['dao', 'dow', 'dau'],
  'de': ['de', 'deh'],
  'dei': ['dei', 'day'],
  'deng': ['deng', 'dung'],
  'di': ['di', 'dee', 'di'],
  'dian': ['dian', 'deen', 'dien', 'dian'],
  'diao': ['diao', 'deo', 'dyo', 'dio'],
  'die': ['die', 'dyeh'],
  'ding': ['ding', 'ding'],
  'diu': ['diu', 'dyu'],
  'dong': ['dong', 'dong'],
  'dou': ['dou', 'do'],
  'du': ['du', 'doo', 'du'],
  'duan': ['duan', 'doo-an', 'dwan', 'doan'],
  'dui': ['dui', 'doo-ee', 'dwee', 'dway'],
  'dun': ['dun', 'doon', 'dunn'],
  'duo': ['duo', 'do', 'doe', 'do'],

  // === T系列 ===
  'ta': ['ta', 'tah', 'tar', 'ta'],
  'tai': ['tai', 'tie', 'ti', 'tai'],
  'tan': ['tan', 'tahn', 'ton', 'tann'],
  'tang': ['tang', 'tong'],
  'tao': ['tao', 'tow', 'tau'],
  'te': ['te', 'teh'],
  'teng': ['teng', 'tung'],
  'ti': ['ti', 'tee', 'ti'],
  'tian': ['tian', 'teen', 'tien', 'tian'],
  'tiao': ['tiao', 'tyo', 'teo', 'tio'],
  'tie': ['tie', 'tyeh'],
  'ting': ['ting', 'ting'],
  'tong': ['tong', 'tong'],
  'tou': ['tou', 'to'],
  'tu': ['tu', 'too', 'tu'],
  'tuan': ['tuan', 'too-an', 'twan'],
  'tui': ['tui', 'too-ee', 'twee', 'tway'],
  'tun': ['tun', 'toon', 'tunn'],
  'tuo': ['tuo', 'to', 'toe', 'to'],

  // === N系列 ===
  'na': ['na', 'nah', 'nar', 'na'],
  'nai': ['nai', 'nye', 'ni'],
  'nan': ['nan', 'nahn', 'non', 'nann'],
  'nang': ['nang', 'nong'],
  'nao': ['nao', 'nau', 'now'],
  'ne': ['ne', 'neh'],
  'nei': ['nei', 'nay'],
  'nen': ['nen', 'nenn'],
  'neng': ['neng', 'nung'],
  'ni': ['ni', 'nee', 'ni', 'nie'],
  'nian': ['nian', 'neen', 'nian'],
  'niang': ['niang', 'nyang'],
  'niao': ['niao', 'nyo'],
  'nie': ['nie', 'nyeh'],
  'nin': ['nin', 'neen'],
  'ning': ['ning', 'ning'],
  'niu': ['niu', 'nyu', 'new', 'niu'],
  'nong': ['nong', 'nong'],
  'nou': ['nou', 'no'],
  'nu': ['nu', 'noo', 'nu'],
  'nuan': ['nuan', 'noo-an'],
  'nun': ['nun', 'noon'],
  'nuo': ['nuo', 'no', 'noe', 'no'],

  // === L系列 ===
  'la': ['la', 'lah', 'lar'],
  'lai': ['lai', 'lie', 'li', 'lay'],
  'lan': ['lan', 'lann', 'lon', 'lan'],
  'lang': ['lang', 'long'],
  'lao': ['lao', 'lao', 'low', 'lau'],
  'le': ['le', 'leh', 'le'],
  'lei': ['lei', 'lay', 'ley'],
  'leng': ['leng', 'lung'],
  'li': ['li', 'lee', 'lie', 'li', 'leigh'],
  'lia': ['lia', 'lee-a'],
  'lian': ['lian', 'leen', 'lien', 'lian', 'lee-an'],
  'liang': ['liang', 'lee-ang', 'liang'],
  'liao': ['liao', 'lee-ow', 'leo', 'lio'],
  'lie': ['lie', 'lee-eh'],
  'lin': ['lin', 'linn', 'lin', 'leen'],
  'ling': ['ling', 'ling'],
  'liu': ['liu', 'lee-oo', 'liu', 'lew'],
  'long': ['long', 'long'],
  'lou': ['lou', 'low'],
  'lu': ['lu', 'loo'],
  'luan': ['luan', 'loo-an', 'luan'],
  'lun': ['lun', 'loon', 'lunn'],
  'luo': ['luo', 'lo', 'lo'],
  'lv': ['lyu', 'liu', 'lu'],

  // === G系列 ===
  'ga': ['ga', 'gah', 'gar'],
  'gai': ['gai', 'guy', 'gy'],
  'gan': ['gan', 'gahn', 'gon', 'gann'],
  'gang': ['gang', 'gong'],
  'gao': ['gao', 'gao', 'gow'],
  'ge': ['ge', 'geh', 'ghe'],
  'gei': ['gei', 'gay'],
  'gen': ['gen', 'gunn', 'genn'],
  'geng': ['geng', 'gung'],
  'gong': ['gong', 'gong'],
  'gou': ['gou', 'go'],
  'gu': ['gu', 'goo', 'gu'],
  'gua': ['gua', 'gwa', 'gu-a'],
  'guai': ['guai', 'guy', 'gwi'],
  'guan': ['guan', 'gwan', 'gon'],
  'guang': ['guang', 'gwang', 'gong', 'gord'],
  'gui': ['gui', 'gwee', 'gway'],
  'gun': ['gun', 'goon'],
  'guo': ['guo', 'go', 'gwo', 'gor', 'gord'],

  // === K系列 ===
  'ka': ['ka', 'kah', 'kar'],
  'kai': ['kai', 'kai', 'ky', 'ki'],
  'kan': ['kan', 'kahn', 'kon', 'kann'],
  'kang': ['kang', 'kong'],
  'kao': ['kao', 'kow'],
  'ke': ['ke', 'keh', 'ker'],
  'ken': ['ken', 'kenn', 'kunn'],
  'keng': ['keng', 'kung'],
  'kong': ['kong', 'kong'],
  'kou': ['kou', 'koe'],
  'ku': ['ku', 'koo'],
  'kua': ['kua', 'kwa'],
  'kuai': ['kuai', 'kwai', 'ki'],
  'kuan': ['kuan', 'kwan', 'konn'],
  'kuang': ['kuang', 'kwang', 'kong'],
  'kui': ['kui', 'kwee', 'kwai'],
  'kun': ['kun', 'koon', 'kunn'],
  'kuo': ['kuo', 'ko', 'kwo'],

  // === H系列 ===
  'ha': ['ha', 'hah', 'har'],
  'hai': ['hai', 'hi', 'hy', 'high'],
  'han': ['han', 'hahn', 'hon', 'hann', 'hand'],
  'hang': ['hang', 'hong'],
  'hao': ['hao', 'hao', 'how'],
  'he': ['he', 'heh', 'he'],
  'hei': ['hei', 'hay'],
  'hen': ['hen', 'henn'],
  'heng': ['heng', 'hung'],
  'hong': ['hong', 'hong'],
  'hou': ['hou', 'ho'],
  'hu': ['hu', 'hoo'],
  'hua': ['hua', 'hwa', 'hue'],
  'huai': ['huai', 'hwy', 'why'],
  'huan': ['huan', 'hwan', 'hon'],
  'huang': ['huang', 'hwang', 'hong'],
  'hui': ['hui', 'hwee', 'way', 'huey'],
  'hun': ['hun', 'hoon'],
  'huo': ['huo', 'ho', 'hwo'],

  // === J系列 (j -> j, zh, ch sounds) ===
  'ji': ['ji', 'jee', 'gi', 'chi', 'zi'],
  'jia': ['jia', 'ja', 'jah'],
  'jian': ['jian', 'jien', 'jean', 'jen', 'gen'],
  'jiang': ['jiang', 'jang', 'jong'],
  'jiao': ['jiao', 'jow', 'jao', 'geo'],
  'jie': ['jie', 'je', 'jeh'],
  'jin': ['jin', 'jin', 'jinn'],
  'jing': ['jing', 'jing'],
  'jiong': ['jiong', 'jong'],
  'jiu': ['jiu', 'jew', 'ju'],
  'ju': ['ju', 'joo', 'ju'],
  'juan': ['juan', 'jwahn', 'jen'],
  'jue': ['jue', 'joo-e'],
  'jun': ['jun', 'joon', 'june'],

  // === Q系列 (q -> ch sound) ===
  'qi': ['qi', 'chee', 'chi', 'ki'],
  'qia': ['qia', 'cha'],
  'qian': ['qian', 'chien', 'chen', 'chien'],
  'qiang': ['qiang', 'chang', 'chong'],
  'qiao': ['qiao', 'chow', 'chao'],
  'qie': ['qie', 'che'],
  'qin': ['qin', 'chin', 'keen'],
  'qing': ['qing', 'ching', 'king'],
  'qiong': ['qiong', 'chong'],
  'qiu': ['qiu', 'chu', 'choo', 'chew', 'q'],
  'qu': ['qu', 'choo', 'chu'],
  'quan': ['quan', 'chwen', 'chwan'],
  'que': ['que', 'chwe'],
  'qun': ['qun', 'chun'],

  // === X系列 (x -> sh、s、h sound，关键) ===
  'xi': ['xi', 'she', 'shi', 'see', 'si', 'xi'],
  'xia': ['xia', 'sha', 'shia', 'zia'],
  'xian': ['xian', 'shian', 'shen', 'shan', 'sian', 'xian', 'zien'],
  'xiang': ['xiang', 'shang', 'shiang', 'siang'],
  'xiao': ['xiao', 'shao', 'shaw', 'shau', 'sho', 'siao', 'shia'],
  'xie': ['xie', 'she', 'shay', 'sie', 'xie'],
  'xin': ['xin', 'shin', 'sin', 'xin', 'seen'],
  'xing': ['xing', 'shing', 'sing', 'xing'],
  'xiong': ['xiong', 'shong', 'xong'],
  'xiu': ['xiu', 'shu', 'shoe', 'sue', 'siu'],
  'xu': ['xu', 'shu', 'shoo', 'su', 'sue', 'xue', 'shue'],
  'xuan': ['xuan', 'shwen', 'swen', 'xue', 'shuan'],
  'xue': ['xue', 'shway', 'shwe', 'sue'],
  'xun': ['xun', 'shun', 'syun', 'soon'],

  // === ZH系列 (zh -> j, z) ===
  'zha': ['zha', 'ja', 'za'],
  'zhai': ['zhai', 'jai', 'zye', 'zi'],
  'zhan': ['zhan', 'jan', 'zan', 'zhen'],
  'zhang': ['zhang', 'jang', 'zang'],
  'zhao': ['zhao', 'jow', 'zhao'],
  'zhe': ['zhe', 'je', 'ze'],
  'zhei': ['zhei', 'jay'],
  'zhen': ['zhen', 'jen', 'zen'],
  'zheng': ['zheng', 'jeng', 'zeng'],
  'zhi': ['zhi', 'jr', 'zher', 'zi'],
  'zhong': ['zhong', 'jong', 'zong'],
  'zhou': ['zhou', 'jo', 'zo'],
  'zhu': ['zhu', 'joo', 'zu'],
  'zhua': ['zhua', 'jwa'],
  'zhuai': ['zhuai', 'jwie'],
  'zhuan': ['zhuan', 'jwan', 'zwan'],
  'zhuang': ['zhuang', 'jwang', 'zwang'],
  'zhui': ['zhui', 'jwee', 'zwee'],
  'zhun': ['zhun', 'junn', 'zunn'],
  'zhuo': ['zhuo', 'jo', 'zo'],

  // === CH系列 (ch -> q, zh) ===
  'cha': ['cha', 'cha', 'char'],
  'chai': ['chai', 'chi', 'chai'],
  'chan': ['chan', 'chan', 'chon'],
  'chang': ['chang', 'chang', 'chong'],
  'chao': ['chao', 'chao', 'chow'],
  'che': ['che', 'che'],
  'chen': ['chen', 'chen', 'chenn'],
  'cheng': ['cheng', 'cheng', 'chung'],
  'chi': ['chi', 'chee', 'chi'],
  'chong': ['chong', 'chong'],
  'chou': ['chou', 'cho'],
  'chu': ['chu', 'choo', 'chu'],
  'chua': ['chua', 'chwa'],
  'chuai': ['chuai', 'chwie'],
  'chuan': ['chuan', 'chwan'],
  'chuang': ['chuang', 'chwang'],
  'chui': ['chui', 'chwee', 'chewy'],
  'chun': ['chun', 'chun'],
  'chuo': ['chuo', 'cho'],

  // === SH系列 (sh -> s, x) ===
  'sha': ['sha', 'sha', 'shar'],
  'shai': ['shai', 'shi', 'shy', 'shai'],
  'shan': ['shan', 'shan', 'shon', 'shann'],
  'shang': ['shang', 'shang', 'shong'],
  'shao': ['shao', 'shao', 'show'],
  'she': ['she', 'she', 'shay'],
  'shei': ['shei', 'shay'],
  'shen': ['shen', 'shen'],
  'sheng': ['sheng', 'sheng', 'shung'],
  'shi': ['shi', 'she', 'shi', 'shir'],
  'shou': ['shou', 'sho'],
  'shu': ['shu', 'shoo', 'shu'],
  'shua': ['shua', 'shwa'],
  'shuai': ['shuai', 'shwie', 'shwy'],
  'shuan': ['shuan', 'shwan'],
  'shuang': ['shuang', 'shwang', 'shong'],
  'shui': ['shui', 'shwee', 'shway'],
  'shun': ['shun', 'shun'],
  'shuo': ['shuo', 'sho'],

  // === R系列 ===
  'ran': ['ran', 'ran'],
  'rang': ['rang', 'rong'],
  'rao': ['rao', 'row'],
  're': ['re', 're'],
  'ren': ['ren', 'ren'],
  'reng': ['reng'],
  'ri': ['ri', 'ri'],
  'rong': ['rong', 'rong'],
  'rou': ['rou', 'ro'],
  'ru': ['ru', 'roo'],
  'ruan': ['ruan', 'roo-en'],
  'rui': ['rui', 'roo-ee'],
  'run': ['run', 'roon'],
  'ruo': ['ruo', 'ro'],

  // === Z系列 ===
  'za': ['za', 'za'],
  'zai': ['zai', 'zi', 'zai'],
  'zan': ['zan', 'zan', 'zon'],
  'zang': ['zang', 'zong'],
  'zao': ['zao', 'zow'],
  'ze': ['ze', 'ze'],
  'zei': ['zei', 'zay'],
  'zen': ['zen', 'zen'],
  'zeng': ['zeng', 'zung'],
  'zi': ['zi', 'zi'],
  'zong': ['zong', 'zong'],
  'zou': ['zou', 'zo'],
  'zu': ['zu', 'zoo'],
  'zuan': ['zuan', 'zoo-en'],
  'zui': ['zui', 'zoo-ee'],
  'zun': ['zun', 'zoon'],
  'zuo': ['zuo', 'zo'],

  // === C系列 ===
  'ca': ['ca', 'tsa'],
  'cai': ['cai', 'tsi', 'cai'],
  'can': ['can', 'tsan', 'tson'],
  'cang': ['cang', 'tsong'],
  'cao': ['cao', 'tsow'],
  'ce': ['ce', 'tse'],
  'cen': ['cen', 'tsen'],
  'ceng': ['ceng', 'tseng'],
  'ci': ['ci', 'tsi', 'chi'],
  'cong': ['cong', 'tsong'],
  'cou': ['cou', 'tso'],
  'cu': ['cu', 'tsoo'],
  'cuan': ['cuan', 'tsoo-en'],
  'cui': ['cui', 'tsoo-ee', 'tsway'],
  'cun': ['cun', 'tsoon'],
  'cuo': ['cuo', 'tso'],

  // === S系列 ===
  'sa': ['sa', 'sa'],
  'sai': ['sai', 'si', 'sigh'],
  'san': ['san', 'san', 'son', 'sann'],
  'sang': ['sang', 'song'],
  'sao': ['sao', 'sow', 'sau'],
  'se': ['se', 'se'],
  'sen': ['sen', 'sen'],
  'seng': ['seng', 'sung'],
  'si': ['si', 'si', 'se'],
  'song': ['song', 'song'],
  'sou': ['sou', 'so'],
  'su': ['su', 'soo', 'sue'],
  'suan': ['suan', 'swan', 'soon'],
  'sui': ['sui', 'soo-ee', 'swee', 'sway'],
  'sun': ['sun', 'soon', 'sun'],
  'suo': ['suo', 'so', 'swo'],

  // === 零声母(Y/W开头) ===
  'ya': ['ya', 'ya', 'yah', 'yar'],
  'yan': ['yan', 'ian', 'yen', 'jan', 'yanne', 'yann', 'iana'],
  'yang': ['yang', 'yang', 'young', 'yong'],
  'yao': ['yao', 'yow', 'yau', 'yo'],
  'ye': ['ye', 'ye', 'yeh', 'yay'],
  'yi': ['yi', 'yi', 'yee', 'ie', 'e'],
  'yin': ['yin', 'yin', 'in', 'ynn'],
  'ying': ['ying', 'ying', 'ing'],
  'yo': ['yo', 'yo'],
  'yong': ['yong', 'yong'],
  'you': ['you', 'yo', 'yu'],
  'yu': ['yu', 'yu', 'you', 'yoo', 'ue'],
  'yuan': ['yuan', 'ywan', 'yuen', 'yoon'],
  'yue': ['yue', 'yooe', 'yoo-e', 'yue'],
  'yun': ['yun', 'yoon', 'un'],
  'wa': ['wa', 'wa'],
  'wai': ['wai', 'why', 'wi'],
  'wan': ['wan', 'wan', 'won', 'wann'],
  'wang': ['wang', 'wang', 'wong'],
  'wei': ['wei', 'way', 'wee', 'wi', 'wey'],
  'wen': ['wen', 'wen', 'wenn', 'win'],
  'weng': ['weng', 'wung'],
  'wo': ['wo', 'wo'],
  'wu': ['wu', 'wu', 'woo', 'oo'],
};

// ========== 拼音音素分解 ==========

interface PinyinSyllable {
  initial: string;
  final: string;
  full: string;
}

function splitPinyinSyllable(pinyin: string): PinyinSyllable {
  const trimmed = pinyin.toLowerCase().trim();
  const doubleInitials = ['zh', 'ch', 'sh'];
  for (const init of doubleInitials) {
    if (trimmed.startsWith(init)) {
      return { initial: init, final: trimmed.slice(init.length), full: trimmed };
    }
  }
  const singleInitial = trimmed[0] || '';
  const initials = ['b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];
  if (initials.includes(singleInitial)) {
    return { initial: singleInitial, final: trimmed.slice(1), full: trimmed };
  }
  return { initial: '', final: trimmed, full: trimmed };
}

// 近似声母映射
const SIMILAR_INITIALS: Record<string, string[]> = {
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

// ========== 核心匹配函数 ==========

/**
 * 获取某个拼音音节的英文常见拼写形式（用于子串匹配）
 */
function getEnglishSubstrings(pinyinSyllable: string): string[] {
  const key = pinyinSyllable.toLowerCase().trim();
  if (PINYIN_TO_EN_SUBSTRINGS[key]) return PINYIN_TO_EN_SUBSTRINGS[key];
  
  // 如果不在映射表中，生成一些合理的变体
  const s = splitPinyinSyllable(key);
  const variants: string[] = [key];
  
  // 韵母部分作为额外变体（仅当>=3字符）
  if (s.final && s.final.length >= 3) variants.push(s.final);
  // 声母+韵母首字母
  if (s.initial) variants.push(s.initial + s.final[0]);
  // 完整拼音
  variants.push(key);
  
  return Array.from(new Set(variants));
}

export interface PhoneticMatchResult {
  score: number;
  matchedLevel: number;
  detail: string;
}

/**
 * V4.1 核心匹配函数 - 严格多音节覆盖检查
 * 
 * ★★★ V4.1 关键修复 ★★★
 * 
 * 问题：对"xiao yan"这样的多音节名，Diana/Diane通过韵母"ia"(2字符子串)获得虚假匹配，得高分。
 * 
 * 修复：
 * 1. 移除2字符韵母子串匹配（"ia"在英文名中太常见，导致大量假匹配）
 * 2. 韵母匹配要求至少3字符
 * 3. 针对多音节名：每个音节都必须达到至少0.3的匹配分数
 * 4. 强制覆盖检查：若某个音节为0分，总分上限再降低
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
  const enClean = en.replace(/[^a-z]/g, '');
  
  if (pinyinSyllables.length === 0 || enClean.length === 0) {
    return { score: 0, matchedLevel: 0, detail: '无有效输入' };
  }
  
  // ===== 辅助函数：计算单个音节的匹配得分 =====
  function scoreSingleSyllable(syl: string): { score: number; matchedLevel: number; detail: string } {
    // A1: 完整拼音音节出现在英文名中
    if (syl.length >= 2 && enClean.includes(syl)) {
      return { score: 1.0, matchedLevel: 1, detail: `完整拼音"${syl}"在英文名中` };
    }
    
    // B: 拼音→英文映射子串匹配
    const enSubstrings = getEnglishSubstrings(syl);
    for (const sub of enSubstrings) {
      if (sub.length >= 3 && enClean.includes(sub)) {
        const score = Math.min(0.85, 0.7 + (sub.length / Math.max(syl.length, sub.length)) * 0.15);
        return { score, matchedLevel: 2, detail: `拼音"${syl}"→映射"${sub}"在英文名中` };
      }
    }
    // 2字符映射子串匹配（只对不少于3字符的拼音做）
    if (syl.length >= 3) {
      for (const sub of enSubstrings) {
        if (sub.length >= 2 && enClean.includes(sub)) {
          // 2字符匹配给中低分
          return { score: 0.5, matchedLevel: 2, detail: `拼音"${syl}"→映射"${sub}"在英文名中` };
        }
      }
    }
    // 映射子串开头匹配（至少3字符）
    for (const sub of enSubstrings) {
      if (sub.length >= 3 && enClean.startsWith(sub.substring(0, 3))) {
        return { score: 0.6, matchedLevel: 2, detail: `拼音"${syl}"→映射"${sub}"匹配英文名开头` };
      }
    }
    
    // ★★★ V4.1 移除韵母2字符子串匹配 ★★★
    // 原逻辑：s.final.substring(0,2) 匹配 → 得0.4分
    // 问题："ia"(xiao的韵母前2字符)在Diana中匹配 → 虚假高分
    // 修复：韵母匹配要求至少3字符
    
    // D: 韵母完整匹配（至少3字符）
    const s = splitPinyinSyllable(syl);
    if (s.final && s.final.length >= 3 && enClean.includes(s.final)) {
      return { score: 0.5, matchedLevel: 3, detail: `韵母"${s.final}"在英文名中（拼音"${syl}"）` };
    }
    // 韵母前3字符匹配
    if (s.final && s.final.length >= 4) {
      const subFinal = s.final.substring(0, 3);
      if (enClean.includes(subFinal)) {
        return { score: 0.4, matchedLevel: 3, detail: `韵母部分"${subFinal}"在英文名中（拼音"${syl}"）` };
      }
    }
    
    // E: 声母开头匹配
    const initials = [s.initial, ...(SIMILAR_INITIALS[s.initial] || [])].filter(Boolean);
    for (const init of initials) {
      if (init && enClean.startsWith(init)) {
        return { score: 0.35, matchedLevel: 4, detail: `声母"${init}"匹配英文名开头（拼音"${syl}"）` };
      }
    }
    for (const init of initials) {
      if (init && init.length >= 2 && enClean.includes(init)) {
        return { score: 0.3, matchedLevel: 4, detail: `声母"${init}"在英文名中（拼音"${syl}"）` };
      }
    }
    
    // F: 首字母匹配
    if (syl.length > 0 && enClean.startsWith(syl[0])) {
      return { score: 0.2, matchedLevel: 4, detail: `首字母"${syl[0]}"匹配（拼音"${syl}"）` };
    }
    
    return { score: 0, matchedLevel: 0, detail: `${syl}无匹配` };
  }
  
  // ===== 主匹配流程 =====
  // 对每个音节计算匹配得分
  const syllableScores = pinyinSyllables.map(syl => scoreSingleSyllable(syl));
  
  // 计算统计指标
  const syllableCount = pinyinSyllables.length;
  const avgScore = syllableScores.reduce((sum, s) => sum + s.score, 0) / syllableCount;
  const minScore = Math.min(...syllableScores.map(s => s.score));
  const goodMatches = syllableScores.filter(s => s.score >= 0.5).length;
  const fairMatches = syllableScores.filter(s => s.score >= 0.3).length;
  const anyMatch = syllableScores.filter(s => s.score >= 0.2).length;
  const zeroMatches = syllableScores.filter(s => s.score === 0).length;
  
  // 构建详情
  const details = syllableScores.map((s, i) => 
    `音节${i+1}"${pinyinSyllables[i]}"：${s.detail}（得分${(s.score * 100).toFixed(0)}）`
  ).join('；');
  
  // ★★★ V4.1 核心评分逻辑 ★★★
  let finalScore: number;
  
  if (syllableCount === 1) {
    // 单音节：直接使用音节得分
    finalScore = syllableScores[0].score;
    
  } else {
    // 多音节：强制覆盖检查
    // ★★★ V4.1 新增：有零分音节直接大幅降级 ★★★
    // 例如"xiao yan"匹配"Diana"：xiao得分0(没有子串≥3匹配), yan得分0.5
    // 分数不是0.5/2=0.25，而是0.25*0.5=0.125，因为缺少了xiao音节的覆盖
    
    // 情况1: 所有音节都有良好匹配（score >= 0.5）
    if (goodMatches === syllableCount) {
      finalScore = Math.min(0.95, avgScore + 0.1);
    }
    // 情况2: 过半音节良好匹配，其余至少fair
    else if (goodMatches >= Math.ceil(syllableCount / 2) && fairMatches === syllableCount) {
      finalScore = Math.min(0.8, avgScore * 0.9 + 0.15);
    }
    // 情况3: 所有音节至少fair匹配(>=0.3)
    else if (fairMatches === syllableCount) {
      finalScore = Math.min(0.65, avgScore * 0.8 + 0.05);
    }
    // ★★★ V4.1 加强：零分音节的严厉惩罚 ★★★
    // 情况4: 有零分音节 → 严重的覆盖惩罚
    else if (zeroMatches >= 1) {
      // ★★★ V4.2 加强零分惩罚：零分音节乘以0.1（比V4.1的0.3更严厉）★★★
      // 原因：一个音节完全不匹配意味着英文名和中文名发音差异巨大
      // 例如"xiao yan"匹配"Diana"时，xiao完全不匹配，应该严重惩罚
      const zeroPenalty = Math.pow(0.1, zeroMatches);
      // 只用非零音节的均分
      const nonZeroScores = syllableScores.filter(s => s.score > 0);
      const nonZeroAvg = nonZeroScores.length > 0 
        ? nonZeroScores.reduce((sum, s) => sum + s.score, 0) / nonZeroScores.length 
        : 0;
      finalScore = nonZeroAvg * zeroPenalty * 0.8;
    }
    // 情况5: 没有任何良好匹配但至少fair
    else if (fairMatches >= 1) {
      const coveragePenalty = fairMatches / syllableCount;
      finalScore = avgScore * coveragePenalty * 0.5;
    }
    // 情况6: 全部很差
    else {
      finalScore = avgScore * 0.3;
    }
  }
  
  // 确保分数在 [0, 1] 范围
  finalScore = Math.max(0, Math.min(1, Math.round(finalScore * 100) / 100));
  
  // 确定匹配级别（取最佳音节的级别）
  const bestLevel = Math.min(...syllableScores.filter(s => s.score > 0).map(s => s.matchedLevel));
  const level = bestLevel === Infinity ? 0 : bestLevel;
  
  if (finalScore === 0) {
    return { score: 0, matchedLevel: 0, detail: '无匹配' };
  }
  
  // 生成简洁详情
  const syllableMatchStr = pinyinSyllables.map((syl, i) => {
    const s = syllableScores[i];
    if (s.score >= 0.5) return `✅${syl}`;
    if (s.score >= 0.3) return `🔸${syl}`;
    if (s.score > 0) return `🔹${syl}`;
    return `❌${syl}`;
  }).join(' ');
  
  const shortDetail = `[${syllableMatchStr}] ${details.slice(0, 120)}`;
  
  return { score: finalScore, matchedLevel: level, detail: shortDetail };
}

// ========== 汉字拼音映射（简单版） ==========

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
  // 名字常用字
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

export function getCharPinyin(char: string): string {
  return COMMON_CHAR_PINYIN[char] || '';
}

export function getChineseNamePinyin(chineseName: string): { givenName: string; fullPinyin: string } {
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

// ===================================================================
// ★★★ 万能匹配法 V5.5 — 首字声母优先 + 3步实操法 ★★★
// 核心思路：只抓"声母 + 核心韵母"，不纠结完整拼音
// 规则：
//   1. 只匹配首字拼音
//   2. 抓声母优先（英文最看重开头辅音）
//   3. 弱化声调、忽略平翘舌/前后鼻音
// ===================================================================

/** 声母→英文首字母近似映射（平翘舌简化） */
const INITIAL_TO_EN_LETTERS: Record<string, string[]> = {
  'b': ['B'],
  'p': ['P'],
  'm': ['M'],
  'f': ['F'],
  'd': ['D', 'T'],
  't': ['T', 'D'],
  'n': ['N'],
  'l': ['L', 'R'],
  'g': ['G', 'K'],
  'k': ['K', 'C', 'G'],
  'h': ['H', 'F'],
  'j': ['J', 'G', 'Z'],
  'q': ['Q', 'K', 'C', 'Ch'],
  'x': ['X', 'S', 'Sh', 'C'],
  'zh': ['J', 'Z', 'G'],   // 简化为 J
  'ch': ['Ch', 'C', 'Q', 'K'], // 简化为 Q/C
  'sh': ['S', 'X', 'Sh'],  // 简化为 S/X
  'r': ['R'],
  'z': ['Z', 'C'],
  'c': ['C', 'K'],
  's': ['S', 'C'],
  'y': ['Y', 'J', 'E'],
  'w': ['W', 'V', 'U'],
  '': ['A', 'E', 'I', 'O', 'U'], // 零声母
};

/**
 * ★★★ V5.5 声母→推荐英文名（全面覆盖用户指南所有示例）★★★
 * 
 * 严格按照用户提供的"常见声母匹配"表 + 示例扩展
 */
const INITIAL_SUGGESTED_NAMES: Record<string, string[]> = {
  // B系列（用户手册：Ben, Bob, Brian, Bella, Bonnie）
  'b': ['Ben', 'Bob', 'Brian', 'Bella', 'Bonnie', 'Bianca', 'Brandon', 'Brooke', 'Benjamin', 'Blake'],
  // C/K 统一处理（用户手册：Kevin, Kelly, Kate, Ken, Clara）
  'c': ['Kevin', 'Kelly', 'Kate', 'Ken', 'Clara', 'Cindy', 'Catherine', 'Carl', 'Chris', 'Crystal'],
  'k': ['Kevin', 'Kelly', 'Kate', 'Ken', 'Clara', 'Kyle', 'Katherine', 'Kristen', 'Kai', 'Keith'],
  // CH系列（用户手册：Charles, Chloe, Charlotte, Cherry）
  'ch': ['Charles', 'Chloe', 'Charlotte', 'Cherry', 'Chad', 'Charlie', 'Chelsea', 'Chris', 'Christina', 'Crystal'],
  // D系列（用户手册：David, Daniel, Diana, Dora, Daisy）
  'd': ['David', 'Daniel', 'Diana', 'Dora', 'Daisy', 'Diane', 'Dylan', 'Derek', 'Doris', 'Donna'],
  // F系列（用户手册：Frank, Fiona, Flora, Fanny, Felix）
  'f': ['Frank', 'Fiona', 'Flora', 'Fanny', 'Felix', 'Fred', 'Faye', 'Faith', 'Foster', 'Fern'],
  // G系列（用户手册：Gary, Grace, Gloria, Gabriel, George）
  'g': ['Gary', 'Grace', 'Gloria', 'Gabriel', 'George', 'Gina', 'Gwen', 'Gavin', 'Gemma', 'Greg'],
  // H系列（用户手册：Henry, Helen, Hannah, Harry, Hugo）
  'h': ['Henry', 'Helen', 'Hannah', 'Harry', 'Hugo', 'Hank', 'Holly', 'Harvey', 'Heidi', 'Hope'],
  // J系列（用户手册：Jason, Jack, Jessica, Julia, James, Jerry, Jay, Jane, Jenny）
  'j': ['Jason', 'Jack', 'Jessica', 'Julia', 'James', 'Jerry', 'Jay', 'Jane', 'Jenny', 'John', 'Jill', 'Jean', 'Jade', 'Jasmine', 'Jake'],
  // L系列（用户手册：Leo, Linda, Lucy, Larry, Lily, Lisa, Leon, Lynn, Louis）
  'l': ['Leo', 'Linda', 'Lucy', 'Larry', 'Lily', 'Lisa', 'Leon', 'Lynn', 'Louis', 'Liam', 'Luke', 'Laura', 'Lydia', 'Logan', 'Luna'],
  // M系列（用户手册：Mike, Mary, Megan, Max, Martin, Mina, Mindy, Minnie）
  'm': ['Mike', 'Mary', 'Megan', 'Max', 'Martin', 'Mina', 'Mindy', 'Minnie', 'Matt', 'Mia', 'Maya', 'Mason', 'Molly', 'Madison'],
  // N系列（用户手册：Nick, Nancy, Nina, Nora, Anna, Neil, Nicole）
  'n': ['Nick', 'Nancy', 'Nina', 'Nora', 'Anna', 'Neil', 'Nicole', 'Nate', 'Nadia', 'Nina', 'Nelson', 'Natalie', 'Noah'],
  // P系列（用户手册：Paul, Peter, Peggy, Penny, Philip）
  'p': ['Paul', 'Peter', 'Peggy', 'Penny', 'Philip', 'Parker', 'Patricia', 'Pamela', 'Perry', 'Phoebe'],
  // Q系列（用户手册：John, Jon, Johnny, Queen, Quinn, Ken）
  'q': ['John', 'Jon', 'Johnny', 'Queen', 'Quinn', 'Ken', 'Quincy', 'Quentin', 'Quinn', 'Joni'],
  // R系列（用户手册：Ryan, Ray, Rita, Rose, Roy, Rex, Rachel, Robert）
  'r': ['Ryan', 'Ray', 'Rita', 'Rose', 'Roy', 'Rex', 'Rachel', 'Robert', 'Richard', 'Rebecca', 'Ruby', 'Riley', 'Roger', 'Ron'],
  // S系列（用户手册：Sam, Sarah, Sophia, Susan, Simon, Sally）
  's': ['Sam', 'Sarah', 'Sophia', 'Susan', 'Simon', 'Sally', 'Steven', 'Sandra', 'Samantha', 'Sean', 'Seth', 'Scarlett', 'Stella'],
  // SH系列（用户手册：Sharon, Sherry, Sarah, Shawn, Shane, Shelly）
  'sh': ['Sharon', 'Sherry', 'Sarah', 'Shawn', 'Shane', 'Shelly', 'Shirley', 'Sheila', 'Shannon', 'Shiloh'],
  // T系列（用户手册：Tom, Tony, Tina, Terry, Tiffany, Teresa, Tim）
  't': ['Tom', 'Tony', 'Tina', 'Terry', 'Tiffany', 'Teresa', 'Tim', 'Taylor', 'Tracy', 'Tyler', 'Tammy', 'Ted', 'Tara'],
  // W系列（用户手册：William, Wendy, Wanda, Wayne, Will, Walter）
  'w': ['William', 'Wendy', 'Wanda', 'Wayne', 'Will', 'Walter', 'Whitney', 'Wesley', 'Winona', 'Warren'],
  // X系列（用户手册：Sam, Sarah, Sophia, Simon, Sally, Xavier, Xena）
  'x': ['Sam', 'Sarah', 'Sophia', 'Simon', 'Sally', 'Xavier', 'Xena', 'Sharon', 'Sherry', 'Xander'],
  // Y系列（用户手册：Yoyo, Yvonne, York, Yale, Yvette）
  'y': ['Yoyo', 'Yvonne', 'York', 'Yale', 'Yvette', 'Yves', 'Yuki', 'Yara', 'Yosef', 'Yasmin'],
  // Z系列（用户手册：Zach, Zoe, Zara, Zion, Zelda）
  'z': ['Zach', 'Zoe', 'Zara', 'Zion', 'Zelda', 'Zack', 'Zane', 'Zola', 'Zuri', 'Zander'],
  // ZH系列（用户手册：Jason, Jack, James, Jerry, Jay, Jane, Jenny, Jessica）
  'zh': ['Jason', 'Jack', 'James', 'Jerry', 'Jay', 'Jane', 'Jenny', 'Jessica', 'Julia', 'Jade', 'Jasmine', 'John'],
};

/**
 * ★★★ V5.5 韵母→英文名中常见音素映射（全面覆盖用户指南）★★★
 * 
 * 用户指南韵母匹配表：
 * -ang/eng：Angus, Anne, Andrew
 * -an/en：Ann, Ben, Ivan
 * -ao：Leo, Owen, Joel
 * -ai：Ivy, Amy, Ryan
 * -i/y：Kitty, Cindy, Jerry
 * -o：Leo, Zoe, Bob
 * -u/ü：Lucy, Judy, Hugo
 */
const FINAL_TO_EN_SUBSTRINGS: Record<string, string[]> = {
  'ang': ['an', 'ang', 'ong', 'on', 'anne', 'ann'],
  'eng': ['en', 'eng', 'on', 'an', 'anne'],
  'an': ['an', 'en', 'ann', 'anne', 'an', 'on'],
  'en': ['en', 'an', 'enn', 'en', 'ine'],
  'ao': ['o', 'ou', 'ow', 'ao', 'el', 'en'],   // Leo → "eo", Owen → "ow", Joel → "el"
  'ai': ['i', 'y', 'ai', 'ay', 'ei', 'ie', 'ye'], // Ivy → "ivy", Amy → "amy", Ryan → "yan"
  'i': ['i', 'y', 'ie', 'ee', 'ey', 'e', 'it'],   // Kitty → "itty", Cindy → "indy", Jerry → "erry"
  'y': ['i', 'y', 'ie', 'ee', 'ey', 'e'],
  'o': ['o', 'ou', 'ow', 'oe', 'a', 'ob'],     // Leo → "eo/le-o", Zoe → "oe/zo-e", Bob → "ob"
  'u': ['u', 'oo', 'ou', 'ew', 'ue', 'udy', 'go'], // Lucy → "ucy", Judy → "udy", Hugo → "ugo"
  'ü': ['u', 'oo', 'ew', 'u', 'y'],
  'in': ['in', 'en', 'inn', 'ine', 'een', 'ing'],
  'ing': ['in', 'ing', 'en', 'eng', 'ine'],
  'ia': ['ia', 'ya', 'a', 'sha'],
  'ie': ['ie', 'ye', 'i', 'e'],
  'iu': ['ew', 'u', 'io', 'iu'],
  'ian': ['ian', 'yan', 'an', 'en', 'ien'],
  'iang': ['iang', 'yang', 'ang', 'ong'],
  'ong': ['ong', 'ong', 'on', 'ang', 'ung'],
  'un': ['un', 'on', 'an', 'en', 'oon'],
  'ui': ['ui', 'we', 'way', 'i', 'wee'],
  'ou': ['o', 'ou', 'ow', 'oo'],
  'ei': ['ay', 'ei', 'ey', 'a'],
  'ua': ['ua', 'wa', 'a'],
  'uo': ['o', 'uo', 'oa'],
};

/**
 * 从拼音中提取声母
 * 中文拼音声母：
 *   zh, ch, sh（双字母）
 *   b,p,m,f,d,t,n,l,g,k,h,j,q,x,r,z,c,s,y,w（单字母）
 *   无则为零声母 ''
 */
export function extractInitial(pinyin: string): string {
  const s = pinyin.toLowerCase().trim();
  if (s.startsWith('zh')) return 'zh';
  if (s.startsWith('ch')) return 'ch';
  if (s.startsWith('sh')) return 'sh';
  // 单字母声母
  const singleInitials = ['b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];
  for (const init of singleInitials) {
    if (s.startsWith(init)) return init;
  }
  return ''; // 零声母
}

/**
 * 从拼音中提取韵母（声母之后的部分）
 */
export function extractFinal(pinyin: string): string {
  const initial = extractInitial(pinyin);
  return pinyin.toLowerCase().trim().slice(initial.length);
}

/**
 * ★★★ V5.5 万能匹配法核心 — 首字声母优先匹配 ★★★
 * 
 * 输入：中文名字的拼音（如 "zhang wei"）
 * 输出：对每个英文名的首字声母匹配得分
 * 
 * 3步实操法：
 *   第1步：提取首字拼音
 *   第2步：用声母锁定候选英文名
 *   第3步：用韵母精准贴近
 * 
 * 匹配逻辑：
 *   1. 只取首字拼音
 *   2. 提取声母，映射到英文首字母候选
 *   3. 如果英文名首字母在候选集中 → 声母匹配得分 0.7+
 *   4. 额外用韵母部分精筛
 *   5. 提供一组推荐的英文名
 */
export function quickInitialMatch(
  chineseNamePinyin: string,
  englishName: string
): { score: number; initial: string; matchedInitial: boolean; detail: string } {
  // 1. 取首字拼音（空格分隔的第一个）
  const firstSyllable = chineseNamePinyin.trim().split(/\s+/)[0];
  if (!firstSyllable) {
    return { score: 0, initial: '', matchedInitial: false, detail: '无拼音输入' };
  }
  
  // 2. 提取声母
  const initial = extractInitial(firstSyllable);
  const final = extractFinal(firstSyllable);
  const enName = englishName.trim().toLowerCase();
  const enFirstLetter = enName[0]?.toUpperCase() || '';
  
  // 3. 声母→英文首字母映射
  const candidateLetters = INITIAL_TO_EN_LETTERS[initial] || [];
  
  // 4. 检查英文名首字母是否匹配声母
  const letterMatched = candidateLetters.includes(enFirstLetter);
  
  if (!letterMatched) {
    // 零声母特殊处理：英文名以元音开头即可
    if (initial === '' && ['A','E','I','O','U'].includes(enFirstLetter)) {
      // 进一步检查元音是否匹配
      const detail = `零声母，英文名以元音${enFirstLetter}开头，拼音"${firstSyllable}"`;
      return { score: 0.55, initial, matchedInitial: true, detail };
    }
    // ★★★ V5.5 新增：检查英文名前两字母是否近似声母映射的某个候选 ★★★
    // 例如声母k的映射包含"C"、"K"，如果en首字母是"C"但不在映射中，
    // 检查前两个字母如"Ch"是否匹配ch的映射
    // 但ch是独立的声母，这里不做扩展，避免误匹配
    
    return { score: 0, initial, matchedInitial: false, detail: `首字母${enFirstLetter}不匹配声母${initial}的候选[${candidateLetters.join(',')}]` };
  }
  
  // 5. 声母匹配成功，计算韵母加分
  let bonus = 0;
  let finalDetail = '';
  
  if (final) {
    const finalSubs = FINAL_TO_EN_SUBSTRINGS[final] || [];
    // 检查英文名中是否包含韵母的近似音素
    for (const sub of finalSubs) {
      if (enName.includes(sub.toLowerCase())) {
        bonus = 0.25;
        finalDetail = `，韵母"${final}"音素"${sub}"在名中`;
        break;
      }
    }
    // 额外的：检查英文名是否包含韵母的完整拼音
    if (bonus === 0 && final.length >= 2 && enName.includes(final)) {
      bonus = 0.2;
      finalDetail = `，韵母"${final}"在名中`;
    }
    // 额外：检查英文名前两个字母与拼音首两个字母
    if (bonus === 0 && firstSyllable.length >= 2) {
      const p2 = firstSyllable.substring(0, 2);
      if (enName.startsWith(p2)) {
        bonus = 0.15;
        finalDetail = `，前两字母"${p2}"匹配`;
      }
    }
    
    // ★★★ V5.5 新增：韵母结尾匹配检查（英文名结尾是否包含韵母音素）★★★
    if (bonus === 0 && final.length >= 2) {
      // 检查英文名结尾与韵母音素
      for (const sub of finalSubs) {
        const subLower = sub.toLowerCase();
        if (subLower.length >= 2 && enName.endsWith(subLower)) {
          bonus = 0.15;
          finalDetail = `，韵母"${final}"音素"${sub}"在名尾`;
          break;
        }
      }
    }
  }
  
  // 基础分：声母匹配 = 0.7
  const baseScore = 0.7;
  const finalScore = Math.min(1.0, baseScore + bonus);
  
  const detail = `首字"${firstSyllable}"声母${initial}匹配英文首字母${enFirstLetter}${finalDetail}（得分${Math.round(finalScore * 100)}）`;
  
  return { score: finalScore, initial, matchedInitial: true, detail };
}

/**
 * ★★★ V5.5 根据声母推荐英文名列表（快速候选）★★★
 * 
 * 严格按照用户指南的3步法：
 *   第1步：提取首字拼音
 *   第2步：用声母锁定候选
 *   第3步：用韵母精准贴近（排序）
 */
export function getSuggestedNamesByInitial(chineseNamePinyin: string): string[] {
  const firstSyllable = chineseNamePinyin.trim().split(/\s+/)[0];
  if (!firstSyllable) return [];
  
  const initial = extractInitial(firstSyllable);
  const final = extractFinal(firstSyllable);
  
  const candidates = INITIAL_SUGGESTED_NAMES[initial] || [];
  
  // 如果韵母信息可用，精排：韵母匹配的排前面
  if (final && candidates.length > 0) {
    const finalSubs = FINAL_TO_EN_SUBSTRINGS[final] || [];
    const sorted = [...candidates].sort((a, b) => {
      const aMatch = finalSubs.some(sub => a.toLowerCase().includes(sub.toLowerCase())) ? 1 : 0;
      const bMatch = finalSubs.some(sub => b.toLowerCase().includes(sub.toLowerCase())) ? 1 : 0;
      return bMatch - aMatch;
    });
    return sorted;
  }
  
  return candidates;
}

/**
 * ★★★ 避坑：谐音雷黑名单 ★★★
 * 
 * 用户指南避坑提醒：
 * - "诗 Shi" 不要叫 She
 * - "达 Da" 不要叫 Dumb
 * - 等特定拼音→英文组合
 * 
 * key = 中文拼音（小写），value = 不应匹配的英文名列表
 */
const PHONETIC_PITFALLS: Record<string, string[]> = {
  'shi': ['She', 'Shit', 'Sheet', 'Sheep'],
  'shih': ['She', 'Shit', 'Sheet', 'Sheep'],
  'da': ['Dumb', 'Dump', 'Dick', 'Dunce'],
  'si': ['Sick', 'Sith', 'Sissy'],
  'cao': ['Cow', 'Cough'],
  'bi': ['Bee', 'Beep', 'Bitch'],
  'pi': ['Pee', 'Piss', 'Pig'],
  'su': ['Sue', 'Suede', 'Suck'],
  'ma': ['Mad', 'Mud', 'Mom'],
  'ba': ['Bad', 'Bomb', 'Bum'],
  'pa': ['Papa', 'Papa'],
  'fan': ['Fawn', 'Fang', 'Fanny'],
  'wan': ['Wan', 'Wonky', 'Wanker'],
};

/**
 * 检查是否踩中谐音雷
 */
function checkPhoneticPitfall(pinyin: string, englishName: string): boolean {
  const firstSyllable = pinyin.trim().split(/\s+/)[0].toLowerCase();
  const enName = englishName.trim().toLowerCase();
  const blockedNames = PHONETIC_PITFALLS[firstSyllable];
  if (!blockedNames) return false;
  return blockedNames.some(name => name.toLowerCase() === enName);
}

/**
 * ★★★ V5.5 万能匹配法 — 核心评分路径 ★★★
 * 
 * 与 V5.0 相比，V5.5 的核心变更：
 *   1. 首字声母匹配作为主路径（不再与原有逻辑取max，而是优先使用）
 *   2. 只有当首字声母完全无匹配时才回退到原有逻辑
 *   3. 首字声母有匹配但低分时，给予合理的基础分
 *   4. 推荐的英文名列表优先展示（声母推荐列表 + 韵母精排）
 *   5. 对全名（多音节）尝试所有音节声母匹配，取最高分
 *   6. 添加谐音雷黑名单检查（如"诗 Shi"不匹配"She"）
 */
export function universalMatch(
  chineseNamePinyin: string, 
  englishName: string
): PhoneticMatchResult {
  // ★★★ 避坑检查：谐音雷 ★★★
  if (checkPhoneticPitfall(chineseNamePinyin, englishName)) {
    return { 
      score: 0, 
      matchedLevel: 0, 
      detail: `[避坑] 拼音"${chineseNamePinyin.split(/\s+/)[0]}"与英文名"${englishName}"存在谐音雷，已排除` 
    };
  }
  
  // ★★★ 对全名尝试所有音节声母匹配，取最高分 ★★★
  const syllables = chineseNamePinyin.trim().split(/\s+/);
  let bestScore = 0;
  let bestDetail = '无匹配';
  let bestLevel = 0;
  let anyMatchFromSyllables = false;
  
  for (const syllable of syllables) {
    if (!syllable) continue;
    const syllableResult = canSyllableMatch(syllable, englishName);
    if (syllableResult.score > bestScore) {
      bestScore = syllableResult.score;
      bestDetail = syllableResult.detail;
      bestLevel = syllableResult.level;
      anyMatchFromSyllables = true;
    }
  }
  
  if (anyMatchFromSyllables && bestScore >= 0.5) {
    return {
      score: Math.round(bestScore * 100) / 100,
      matchedLevel: bestLevel,
      detail: `[万能匹配] ${bestDetail}`,
    };
  }
  
  // 如果所有音节都没有声母匹配，检查声母推荐列表
  const suggested = getSuggestedNamesByInitial(chineseNamePinyin);
  if (suggested.length > 0 && suggested.some(s => s.toLowerCase() === englishName.toLowerCase())) {
    return {
      score: 0.65,
      matchedLevel: 2,
      detail: `[万能匹配] 英文名在声母推荐列表中`,
    };
  }
  
  // 回退到原有的 matchPronunciation 逻辑
  const original = matchPronunciation(chineseNamePinyin, englishName);
  if (original.score >= 0.3) {
    return original;
  }
  
  // 完全无匹配
  return { score: 0, matchedLevel: 0, detail: '无匹配' };
}

/**
 * 检查单个拼音音节是否能匹配英文名（首字声母匹配核心逻辑）
 * 用于全名匹配时逐音节尝试
 */
function canSyllableMatch(
  syllable: string, 
  englishName: string
): { score: number; detail: string; level: number } {
  const initial = extractInitial(syllable);
  const final = extractFinal(syllable);
  const enName = englishName.trim().toLowerCase();
  const enFirstLetter = enName[0]?.toUpperCase() || '';
  
  const candidateLetters = INITIAL_TO_EN_LETTERS[initial] || [];
  const letterMatched = candidateLetters.includes(enFirstLetter);
  
  if (!letterMatched) {
    return { score: 0, detail: `声母${initial}不匹配${enFirstLetter}`, level: 0 };
  }
  
  // 声母匹配成功，计算韵母加分
  let bonus = 0;
  let finalDetail = '';
  
  if (final) {
    const finalSubs = FINAL_TO_EN_SUBSTRINGS[final] || [];
    // 检查英文名中是否包含韵母的近似音素
    for (const sub of finalSubs) {
      if (enName.includes(sub.toLowerCase())) {
        bonus = 0.25;
        finalDetail = `，韵母"${final}"音素"${sub}"在名中`;
        break;
      }
    }
    // 额外的完整拼音检查
    if (bonus === 0 && final.length >= 2 && enName.includes(final)) {
      bonus = 0.2;
      finalDetail = `，韵母"${final}"在名中`;
    }
    // 检查前两个字母
    if (bonus === 0 && syllable.length >= 2) {
      const p2 = syllable.substring(0, 2);
      if (enName.startsWith(p2)) {
        bonus = 0.15;
        finalDetail = `，前两字母"${p2}"匹配`;
      }
    }
  }
  
  const baseScore = 0.7;
  const finalScore = Math.min(1.0, baseScore + bonus);
  const level = bonus >= 0.25 ? 1 : 2;
  
  const detail = `首字"${syllable}"声母${initial}匹配英文首字母${enFirstLetter}${finalDetail}（得分${Math.round(finalScore * 100)}）`;
  
  return { score: finalScore, detail, level };
}

/**
 * 排序函数 - 按发音匹配度排序英文名列表（使用万能匹配）
 */
export function sortByPronunciation(
  chineseNamePinyin: string,
  englishNames: { name: string }[]
): Array<{ name: string; score: number; detail: string }> {
  return englishNames
    .map(item => {
      const result = universalMatch(chineseNamePinyin, item.name);
      return { name: item.name, score: result.score, detail: result.detail };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * 格式全名
 */
export function formatFullName(
  englishGivenName: string,
  englishSurname: string,
  style: 'western' | 'eastern' = 'western'
): string {
  return style === 'western' ? `${englishGivenName} ${englishSurname}` : `${englishSurname} ${englishGivenName}`;
}

/**
 * 搜索英文名，按发音匹配度排序（只保留有匹配的）
 */
export function searchByPhoneticMatch(
  chineseNamePinyin: string,
  englishNames: Array<{ name: string; meaning?: string; gender?: string; score?: number }>,
  topK: number = 20
): Array<{ name: string; meaning?: string; gender?: string; phoneticScore: number; phoneticDetail: string }> {
  const results = englishNames
    .map(item => {
      const matchResult = universalMatch(chineseNamePinyin, item.name);
      return {
        name: item.name,
        meaning: item.meaning,
        gender: item.gender,
        phoneticScore: Math.round(matchResult.score * 100),
        phoneticDetail: matchResult.detail,
      };
    })
    .filter(r => r.phoneticScore > 0);
  
  return results.sort((a, b) => b.phoneticScore - a.phoneticScore).slice(0, topK);
}

/**
 * ★★★ V6.3 姓氏英文发音独立匹配评分 ★★★
 * 
 * 功能：将英文名与姓氏的最常见英文表达（如张→Cheung）进行独立匹配。
 * 在 calcPhoneticScore（名字发音匹配）之外增加一轮姓氏英文表达单独评分。
 * 例如中文姓"张"→英文表达"Cheung"，候选名"Cheung"或"Leo Cheung"都应加分。
 * 如果匹配不到，则回退到原有逻辑（不额外加分）。
 * 
 * 增强场景：
 *   场景1：英文名是姓氏英文表达本身（如 surname=张, ename=Cheung）→ 满分
 *   场景2：英文名很短（≤4字母），与姓氏英文表达中任一个完全匹配 → 满分
 *   场景3：英文名包含姓氏英文表达（如 surname=张, ename=Cheung Kei, ename=Leo Cheung）→ 高分
 *   场景4：复合姓氏（如欧阳→Au-Yeung），检查各组成部分（Au、Yeung）→ 中高分
 *   场景5：匹配不到→回退检查姓氏拼音与英文名的发音相似度（如surname=张三, 拼音zhang→与英文名开头的"Jan"比较）
 * 
 * @param ename      候选英文名
 * @param surname    中文姓氏
 * @returns score, matchedExpression, detail
 */
export function calcSurnameEnglishMatchScore(
  ename: string,
  surname: string
): { score: number; matchedExpression: string; detail: string } {
  if (!surname || !ename) {
    return { score: 0, matchedExpression: "", detail: "缺少姓氏或英文名" };
  }

  const enameLower = ename.toLowerCase().trim();
  const enameWords = enameLower.split(/\s+/);

  // 获取姓氏的最常见英文表达列表
  const expressions = getSurnameEnglishExpressions(surname);

  // ===== 场景A：姓氏在映射表中 =====
  if (expressions.length > 0) {
    // 对每个英文表达展开：如果是复合姓氏（含连字符 "Au-Yeung"），拆分为各部分
    const allParts: { part: string; full: string }[] = [];
    for (const expr of expressions) {
      const exprLower = expr.toLowerCase();
      allParts.push({ part: exprLower, full: expr });
      // 连字符拆分：如 "Au-Yeung" → ["au", "yeung"]
      if (exprLower.includes('-')) {
        for (const sub of exprLower.split('-')) {
          if (sub.length >= 2) {
            allParts.push({ part: sub, full: expr });
          }
        }
      }
    }

    // 1. 完全匹配：英文名整体与某个姓氏英文表达完全相同
    //    场景1：surname=张, ename=Cheung
    for (const { part, full } of allParts) {
      // 检查整个英文名（单个词）是否完全匹配
      if (enameLower === part) {
        return {
          score: 100,
          matchedExpression: full,
          detail: `英文名"${ename}"与姓氏"${surname}"的英文表达"${full}"完全匹配`
        };
      }
      // 检查英文名的每个词是否有完全匹配（场景2：ename较短≤4且完全匹配）
      for (const word of enameWords) {
        if (word === part && word.length <= 4) {
          return {
            score: 100,
            matchedExpression: full,
            detail: `英文名"${ename}"中的词"${word}"与姓氏"${surname}"英文表达"${full}"完全匹配`
          };
        }
      }
    }

    // 2. 开头匹配：英文名以姓氏英文表达开头
    //    场景3a：surname=张, ename=Cheung Kei（Cheung开头+空格）
    for (const { part, full } of allParts) {
      if (enameLower.startsWith(part)) {
        // 确保是完整单词匹配（后面跟空格或结束）
        if (part.length === enameLower.length || enameLower[part.length] === ' ') {
          return {
            score: 85,
            matchedExpression: full,
            detail: `英文名"${ename}"以姓氏"${surname}"的英文表达"${full}"开头`
          };
        }
        // 部分开头匹配
        const matchRatio = part.length / enameLower.length;
        if (matchRatio >= 0.4) {
          return {
            score: 75,
            matchedExpression: full,
            detail: `英文名"${ename}"以姓氏"${surname}"的英文表达"${full}"开头（匹配度${Math.round(matchRatio * 100)}%）`
          };
        }
      }
    }

    // 3. 包含匹配：英文名中包含姓氏英文表达
    //    场景3b：surname=张, ename=Leo Cheung（后面出现Cheung）
    //    场景4：复合姓氏欧阳→Au-Yeung，ename含"Au"或"Yeung"
    for (const { part, full } of allParts) {
      if (part.length >= 3 && enameLower.includes(part)) {
        // 检查是否是完整词匹配
        const isWordMatch = enameWords.includes(part) ||
          enameWords.some(w => w.startsWith(part) && w.length <= part.length + 2);
        if (isWordMatch) {
          return {
            score: 70,
            matchedExpression: full,
            detail: `英文名"${ename}"包含姓氏"${surname}"的英文表达"${full}"（部分"${part}"）`
          };
        }
        // 子串包含（非完整词）
        return {
          score: 55,
          matchedExpression: full,
          detail: `英文名"${ename}"包含姓氏"${surname}"的英文表达"${full}"中的"${part}"`
        };
      }
    }

    // 4. 结尾匹配：英文名以姓氏英文表达结尾
    for (const { part, full } of allParts) {
      if (part.length >= 3 && enameLower.endsWith(part)) {
        return {
          score: 65,
          matchedExpression: full,
          detail: `英文名"${ename}"以姓氏"${surname}"的英文表达"${full}"中的"${part}"结尾`
        };
      }
    }

    // 5. 首字母相同
    const enameFirstChar = ename.charAt(0).toLowerCase();
    for (const { full } of allParts) {
      const fullFirstChar = full.charAt(0).toLowerCase();
      if (fullFirstChar === enameFirstChar) {
        return {
          score: 30,
          matchedExpression: full,
          detail: `英文名首字母"${enameFirstChar.toUpperCase()}"与姓氏"${surname}"英文表达"${full}"首字母一致`
        };
      }
    }
  }

  // ===== 场景B：映射表中无匹配 → 回退到姓氏拼音匹配 =====
  // 用 surnames 的拼音（如 "zhang"）与英文名进行声母匹配
  // 使用 universalMatch 或基础的拼音发音匹配逻辑
  const surnamePinyin = surname.toLowerCase();
  // 如果姓氏本身就是拼音（如 "Li", "Zhang"），尝试做简单拼音发音匹配
  const pinyinScore = calcSurnamePinyinMatchFallback(surnamePinyin, enameLower);
  if (pinyinScore.score >= 50) {
    return {
      score: pinyinScore.score,
      matchedExpression: pinyinScore.matchedExpr,
      detail: `姓氏"${surname}"拼音发音与英文名部分匹配：${pinyinScore.detail}`
    };
  }

  if (expressions.length === 0) {
    return { score: 0, matchedExpression: "", detail: `姓氏"${surname}"不在姓氏英文映射表中，且拼音发音也未匹配` };
  }

  return { score: 0, matchedExpression: "", detail: `未匹配到姓氏"${surname}"的英文表达或拼音发音` };
}

/**
 * 姓氏拼音回退匹配
 * 当姓氏不在映射表中时，尝试将姓氏拼音与英文名进行声母/韵母近似匹配
 * 例如：surname拼音 = "zhang" → 英文名 "Jan" 的 J 与 zh 声母有近似关系
 */
function calcSurnamePinyinMatchFallback(
  surnamePinyin: string,
  enameLower: string
): { score: number; matchedExpr: string; detail: string } {
  const firstSyllable = surnamePinyin.trim();
  if (!firstSyllable) return { score: 0, matchedExpr: "", detail: "" };

  const initial = extractInitial(firstSyllable);
  const final_part = extractFinal(firstSyllable);
  const candidateLetters = INITIAL_TO_EN_LETTERS[initial] || [];
  const enFirstLetter = enameLower.charAt(0).toUpperCase();

  // 声母匹配
  if (candidateLetters.includes(enFirstLetter)) {
    // 基础分50 + 韵母匹配加分
    let bonus = 0;
    if (final_part) {
      const finalSubs = FINAL_TO_EN_SUBSTRINGS[final_part] || [];
      for (const sub of finalSubs) {
        if (sub.length >= 2 && enameLower.includes(sub.toLowerCase())) {
          bonus = 30;
          break;
        }
      }
      if (bonus === 0 && final_part.length >= 2 && enameLower.includes(final_part)) {
        bonus = 20;
      }
    }
    return {
      score: 50 + bonus,
      matchedExpr: surnamePinyin,
      detail: `拼音"${surnamePinyin}"声母${initial}匹配英文首字母${enFirstLetter}`
    };
  }

  // 首首字母匹配（最弱匹配）
  if (surnamePinyin.charAt(0) === enameLower.charAt(0)) {
    return {
      score: 20,
      matchedExpr: surnamePinyin,
      detail: `拼音"${surnamePinyin}"首字母与英文名首字母相同`
    };
  }

  return { score: 0, matchedExpr: "", detail: "" };
}
