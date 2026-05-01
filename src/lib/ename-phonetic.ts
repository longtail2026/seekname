/**
 * 英文名拼音发音匹配引擎 v4.1
 * 
 * 核心策略：对多音节中文名，每个音节必须都有良好匹配，不允许"一个音节完美匹配另一个音节完全消失"的情况。
 * 
 * V4.1 关键修复：
 * - 移除 ≤2字符的韵母子串匹配（如"ia"→Diana的假匹配）
 * - 韵母匹配要求最小3字符
 * - 针对多音节名，每个音节都必须有>=0.3的匹配得分
 * - 单音节名加强首字母匹配的惩罚
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
  
  return [...new Set(variants)];
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

/**
 * 排序函数 - 按发音匹配度排序英文名列表
 */
export function sortByPronunciation(
  chineseNamePinyin: string,
  englishNames: { name: string }[]
): Array<{ name: string; score: number; detail: string }> {
  return englishNames
    .map(item => {
      const result = matchPronunciation(chineseNamePinyin, item.name);
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
      const matchResult = matchPronunciation(chineseNamePinyin, item.name);
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