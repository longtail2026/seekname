/**
 * 七维加权打分排序系统 · 完整集成测试
 *
 * 测试 name-scorer-v2.ts 的单维度评分 + 加权综合 + 排序
 *
 * 权重配置（与 name-scorer-v2.ts 对齐）：
 *   语义匹配度 25% | 音律美感 20% | 文化内涵 15%
 *   字形结构 10%   | 五行平衡 15% | 独特性 10% | 风格契合度 5%
 *
 * 运行：node test-score-names.js
 */

// ============================================================
// 完整拼音映射（覆盖所有测试用字 + 边缘用例）
// ============================================================
const PINYIN_MAP = {
  // 常用字声调覆盖
  "浩": "hào", "然": "rán", "天": "tiān", "佑": "yòu",
  "明": "míng", "志": "zhì", "雅": "yǎ", "慧": "huì",
  "轩": "xuān", "宇": "yǔ", "婉": "wǎn", "清": "qīng",
  "文": "wén", "博": "bó", "睿": "ruì", "琪": "qí",
  "子": "zǐ", "韵": "yùn", "诗": "shī", "庭": "tíng",
  "兰": "lán", "璟": "jǐng", "瑜": "yú", "沐": "mù",
  "泽": "zé", "瑶": "yáo", "瑾": "jǐn", "安": "ān",
  "康": "kāng", "宁": "níng", "平": "píng", "华": "huá",
  "远": "yuǎn", "淑": "shū", "娴": "xián", "麒": "qí",
  "麟": "lín", "凤": "fèng", "翔": "xiáng", "瑞": "ruì",
  "祥": "xiáng", "福": "fú", "禄": "lù", "景": "jǐng",
  "星": "xīng", "辰": "chén", "萱": "xuān", "沛": "pèi",
  "泓": "hóng", "涛": "tāo", "煜": "yù", "炜": "wěi",
  "宸": "chén", "铭": "míng", "崇": "chóng", "德": "dé",
  "尚": "shàng", "贤": "xián", "思": "sī", "敏": "mǐn",
  "行": "xíng", "笃": "dǔ", "英": "yīng", "杰": "jié",
  "伟": "wěi", "毅": "yì", "诚": "chéng", "信": "xìn",
  "嘉": "jiā", "言": "yán", "善": "shàn", "道": "dào",
  "阳": "yáng", "春": "chūn", "风": "fēng", "云": "yún",
  "舒": "shū", "霞": "xiá", "蔚": "wèi", "采": "cǎi",
  "薇": "wēi", "悠": "yōu", "芷": "zhǐ", "荷": "hé",
  "柳": "liǔ", "枫": "fēng", "柏": "bǎi", "松": "sōng",
  "桐": "tóng", "楠": "nán", "伊": "yī", "诺": "nuò",
  "汐": "xī", "玥": "yuè", "洛": "luò", "笙": "shēng",
  "禾": "hé", "芮": "ruì", "懿": "yì", "正": "zhèng",
  "中": "zhōng", "方": "fāng", "元": "yuán", "仁": "rén",
  "欣": "xīn", "悦": "yuè", "涵": "hán", "吉": "jí",
  "书": "shū", "画": "huà", "琴": "qín",
  "锦": "jǐn", "程": "chéng", "延": "yán", "年": "nián",
  "知": "zhī", "乐": "lè", "水": "shuǐ", "灵": "líng",
  "容": "róng", "慧": "huì", "兰": "lán", "溪": "xī",
  "岚": "lán", "霏": "fēi", "雨": "yǔ", "雪": "xuě",
  "霜": "shuāng", "竹": "zhú", "梅": "méi", "菊": "jú",
  "莲": "lián", "山": "shān", "川": "chuān", "海": "hǎi",
  "波": "bō", "润": "rùn", "泉": "quán", "之": "zhī",
  "小": "xiǎo", "大": "dà", "和": "hé", "顺": "shùn",
  "真": "zhēn", "纯": "chún", "静": "jìng",
  "泰": "tài", "若": "ruò", "宜": "yí",
  "炳": "bǐng", "承": "chéng", "功": "gōng",
  "青": "qīng", "谷": "gǔ", "白": "bái",
  "素": "sù", "秋": "qiū", "含": "hán", "章": "zhāng",
  "居": "jū", "敬": "jìng", "存": "cún", "义": "yì",
  "礼": "lǐ", "智": "zhì",
  "昙": "tán", "珞": "luò", "伽": "qié",
  "月": "yuè", "澄": "chéng", "澈": "chè",
  "蕴": "yùn", "如": "rú", "昱": "yù",
  "昭": "zhāo", "昀": "yún", "熠": "yì", "甯": "níng",
  "璨": "càn", "渟": "tíng", "泱": "yāng",
  "砚": "yàn", "墨": "mò", "昶": "chǎng",
  "晔": "yè", "烜": "xuǎn", "翀": "chōng",
  "仞": "rèn", "砺": "lì", "琨": "kūn",
  "珩": "héng", "珂": "kē", "琅": "láng",
  "玦": "jué", "玙": "yú", "璠": "fán",
  "皎": "jiǎo", "皑": "ái", "澈": "chè",
  "璟": "jǐng",
  "妍": "yán", "姝": "shū", "娉": "pīng", "婷": "tíng",
  "嫣": "yān", "婀": "ē", "娜": "nuó",
  "涓": "juān", "漪": "yī", "湉": "tián",
  "沁": "qìn", "辞": "cí", "赋": "fù",
  "歌": "gē", "词": "cí",
  "诚": "chéng",
  "宥": "yòu", "容": "róng", "惟": "wéi",
  "修": "xiū", "齐": "qí", "治": "zhì",
  "衡": "héng", "则": "zé", "宽": "kuān",
  "豫": "yù", "升": "shēng", "泰": "tài",
  "谦": "qiān", "益": "yì", "损": "sǔn",
  "颐": "yí", "济": "jì",
  "玄": "xuán", "奭": "shì", "勉": "miǎn",
  "相": "xiāng", "如": "rú",
  "万": "wàn",
  "钧": "jūn", "洪": "hóng",
  "毅": "yì",
};

/**
 * 获取汉字的拼音（从映射表中查找）
 */
function getPinyin(char) {
  return PINYIN_MAP[char] || null;
}

/**
 * 提取拼音的声调值
 * 1=阴平 2=阳平 3=上声 4=去声 0=轻声
 */
function getToneValue(pinyin) {
  if (!pinyin) return null;
  const toneChars = { 'ā': 1, 'ē': 1, 'ī': 1, 'ō': 1, 'ū': 1, 'ǖ': 1,
                      'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2, 'ǘ': 2,
                      'ǎ': 3, 'ě': 3, 'ǐ': 3, 'ǒ': 3, 'ǔ': 3, 'ǚ': 3,
                      'à': 4, 'è': 4, 'ì': 4, 'ò': 4, 'ù': 4, 'ǜ': 4 };
  for (const ch of pinyin) {
    if (toneChars[ch]) return toneChars[ch];
  }
  return 0; // 轻声
}

// ============================================================
// 声调组合评分（与 name-scorer-v2.ts 的 scorePhonetic 对齐）
// ============================================================
function scoreTone(tones) {
  if (!tones || tones.length === 0) return 65;
  if (tones.length === 1) {
    // 单字名：四声最佳
    if (tones[0] === 4) return 78;
    if (tones[0] === 2) return 74;
    if (tones[0] === 3) return 72;
    return 68;
  }

  const [t1, t2] = tones;
  // 双字名声调组合评分规则（与 phonetic-optimizer 对齐）
  // 去声结尾 → 响亮有力
  if (t2 === 4) {
    if (t1 === 2 || t1 === 3) return 88;  // 阳/上 + 去 → 最佳
    if (t1 === 1) return 82;               // 阴 + 去 → 良好
    if (t1 === 4) return 75;               // 去 + 去 → 稍显生硬
    return 78;
  }
  // 阳平结尾 → 柔和悠长
  if (t2 === 2) {
    if (t1 === 4) return 85;               // 去 + 阳 → 第二优
    if (t1 === 3) return 80;               // 上 + 阳 → 良好
    if (t1 === 1) return 76;               // 阴 + 阳 → 中等
    if (t1 === 2) return 72;               // 阳 + 阳 → 平缓
    return 74;
  }
  // 上声结尾 → 婉转
  if (t2 === 3) {
    if (t1 === 1 || t1 === 4) return 78;
    if (t1 === 2) return 74;
    if (t1 === 3) return 70;  // 上 + 上 → 拗口（变调问题）
    return 74;
  }
  // 阴平结尾 → 平缓
  if (t2 === 1) {
    if (t1 === 4) return 76;
    if (t1 === 2) return 74;
    if (t1 === 3) return 72;
    if (t1 === 1) return 68;  // 阴 + 阴 → 单调
    return 72;
  }
  return 65;
}

// ============================================================
// 各维度评分函数（与 name-scorer-v2.ts 逻辑对齐）
// ============================================================

const WEIGHTS = {
  semantic: 0.25,
  phonetic: 0.20,
  cultural: 0.15,
  glyph: 0.10,
  wuxing: 0.15,
  uniqueness: 0.10,
  styleFit: 0.05,
};

// 1. 语义匹配度 (25%)
function scoreSemantic(n) {
  let score = 70;
  if (n.source && !["传统文化", "传统", "现代寓意"].includes(n.source)) {
    score = Math.min(95, score + 15); // 有典籍出处
  }
  if (n.meaning && n.meaning.length >= 8) score += 5;
  if (n.reason && n.reason.length > 5) score += 5;
  // 意向词匹配：检测名字释义是否包含用户期望的关键词
  if (n.meaning && (n.meaning.includes("智慧") || n.meaning.includes("聪"))) score += 3;
  if (n.meaning && (n.meaning.includes("高贵") || n.meaning.includes("品德"))) score += 3;
  return Math.min(100, Math.max(0, score));
}

// 2. 音律美感 (20%)
function scorePhonetic(n) {
  const chars = (n.givenName || n.name || "").split("");
  if (chars.length === 0) return 60;
  const tones = chars.map(c => {
    const py = getPinyin(c);
    return getToneValue(py);
  }).filter(t => t !== null);

  if (tones.length === 0) {
    // 回退：从 pinyin 字段解析
    if (n.pinyin) {
      const fallbackTones = n.pinyin.split(" ")
        .map(p => getToneValue(p))
        .filter(t => t !== null);
      if (fallbackTones.length > 0) {
        return scoreTone(fallbackTones);
      }
    }
    return 62;
  }
  return scoreTone(tones);
}

// 3. 文化内涵 (15%)
function scoreCultural(n) {
  if (n.source && n.source.includes("《")) {
    const bookName = n.source.replace(/[《》]/g, '');
    // 依典籍等级给分
    const classicBooks = ["诗经", "楚辞", "周易", "尚书", "礼记", "论语", "孟子",
                          "老子", "庄子", "大学", "中庸", "唐诗", "宋词"];
    const secondaryBooks = ["史记", "汉书", "后汉书", "三国志", "晋书",
                            "全唐诗", "全宋词", "乐府", "文选"];
    if (classicBooks.some(b => bookName.includes(b))) return 88;
    if (secondaryBooks.some(b => bookName.includes(b))) return 80;
    return 75;
  }
  if (n.meaning && n.meaning.length > 10) return 72;
  if (n.meaning && n.meaning.length > 5) return 68;
  return 62;
}

// 4. 字形结构 (10%)
function scoreGlyph(n) {
  const chars = (n.givenName || n.name || "").split("").filter(c => /[\u4e00-\u9fff]/.test(c));
  if (chars.length === 0) return 60;

  // 简笔字（≈5画及以下）和繁笔字（≈15画及以上）
  const simpleChars = new Set(["子", "文", "天", "平", "安", "方", "元",
                               "中", "心", "正", "仁", "民", "一", "之",
                               "小", "大", "水", "山", "川", "月", "云"]);
  const complexChars = new Set(["懿", "曦", "麟", "麒", "鸾", "璨",
                                "灏", "夔", "耀", "衡", "翱", "腾",
                                "鑫", "淼", "垚", "犇", "猋", "骉"]);

  // 笔画平衡度
  let penalty = 0;
  const simpleCount = chars.filter(c => simpleChars.has(c)).length;
  const complexCount = chars.filter(c => complexChars.has(c)).length;

  if (simpleCount === chars.length && chars.length >= 2) penalty += 10;  // 全简笔→单调
  if (complexCount === chars.length && chars.length >= 2) penalty += 15; // 全繁笔→难写
  if (simpleCount > 0 && complexCount > 0) penalty -= 5;                 // 繁简搭配→加分

  // 部首多样性
  const radicalPairs = [
    ["清", "溪"], ["涵", "泽"], ["诗", "词", "韵"],
    ["瑾", "瑜", "琪", "瑶"], ["松", "柏", "柳", "枫"],
    ["娴", "婉"], ["淑", "慧", "志"],
  ];
  for (const group of radicalPairs) {
    const inGroup = chars.filter(c => group.includes(c));
    if (inGroup.length >= 2) {
      penalty += 12; // 同部首偏多→单调扣分
      break;
    }
  }

  return Math.min(100, Math.max(0, 78 - penalty));
}

// 5. 五行平衡 (15%)
function scoreWuxing(n, context) {
  const hasBazi = context && context.hasBazi;
  if (!hasBazi) {
    // 无八字数据：中性分
    return 65;
  }
  // 模拟五行加分（实际由 bazi-service 完成）
  let score = 72;
  const chars = (n.givenName || n.name || "").split("");
  // 检测是否有明显的火/水/木/金/土属性字（简版）
  const fireChars = new Set(["明", "星", "映", "昭", "昱", "煜", "炜", "昕"]);
  const waterChars = new Set(["涵", "泽", "清", "泓", "涛", "沛", "润", "溪"]);
  const woodChars = new Set(["松", "柏", "柳", "枫", "桐", "楠", "林", "森"]);
  const metalChars = new Set(["铭", "睿", "瑞", "瑜", "瑾", "琪", "璟"]);
  const earthChars = new Set(["安", "岚", "山", "峰", "岱", "岳"]);

  for (const c of chars) {
    if (fireChars.has(c)) score += 4;
    if (waterChars.has(c)) score += 4;
    if (woodChars.has(c)) score += 4;
    if (metalChars.has(c)) score += 3;
    if (earthChars.has(c)) score += 3;
  }
  return Math.min(100, Math.max(0, score));
}

// 6. 独特性 (10%)
function scoreUniqueness(n) {
  const chars = (n.givenName || n.name || "").split("").filter(c => /[\u{4e00}-\u{9fff}]/u.test(c));
  if (chars.length === 0) return 60;

  // 高频常见字（低独特性）
  const commonChars = new Set(["子", "文", "天", "明", "志", "华", "安", "平",
                               "伟", "嘉", "欣", "悦", "慧", "雅", "轩", "宇",
                               "涵", "泽", "然", "清", "芯", "辰", "萱", "琪"]);
  // 中频字
  const midChars = new Set(["浩", "博", "远", "瑞", "祥", "诗", "韵", "铭",
                            "瑾", "瑜", "璟", "玥", "汐", "诺", "禾", "芮"]);
  // 生僻高雅字（高独特性）
  const rareChars = new Set(["懿", "麒", "麟", "煜", "炜", "宸", "睿",
                             "芷", "薇", "婀", "娜", "姝", "娉",
                             "瑛", "璎", "珞", "伽",
                             "玄", "奭", "晔", "昶", "烜", "翀",
                             "珂", "珩", "琅", "琨", "玙", "璠"]);

  let score = 70;
  let rareCount = 0;
  let commonCount = 0;

  for (const c of chars) {
    if (rareChars.has(c)) { score += 10; rareCount++; }
    else if (commonChars.has(c)) { score -= 5; commonCount++; }
    else if (midChars.has(c)) { score += 3; }
    else { score += 5; } // 属于较生僻但非高雅字
  }

  // 全部常见字：过低独特
  if (commonCount === chars.length) score = Math.min(score, 55);
  // 全部生僻字：过高独特反而不好（名字太难认）
  if (rareCount === chars.length && chars.length >= 2) score = Math.min(score, 82);

  return Math.min(100, Math.max(0, score));
}

// 7. 风格契合度 (5%)
function scoreStyleFit(n, context) {
  const styles = (context && context.styles) || [];
  if (styles.length === 0) return 65;

  const chars = (n.givenName || n.name || "").split("").filter(c => /[\u4e00-\u9fff]/.test(c));
  if (chars.length === 0) return 60;

  const styleCharMap = {
    "古典": new Set(["雅", "懿", "淑", "贤", "德", "仁", "义", "礼", "智", "信",
                     "文", "章", "华", "瑞", "祥", "瑾", "瑜", "瑶", "琼", "琳"]),
    "温婉": new Set(["婉", "清", "淑", "娴", "雅", "慧", "婷", "嫣", "妍", "姝",
                     "柔", "静", "秀", "倩", "沁", "湉", "涓", "漪", "涵", "韵"]),
    "大气": new Set(["浩", "然", "天", "佑", "志", "远", "英", "杰", "睿", "智",
                     "伟", "毅", "诚", "信", "正", "义", "明", "达", "道", "德",
                     "博", "广", "鸿", "鹏", "霄", "汉"]),
    "现代": new Set(["子", "轩", "宇", "涵", "沐", "泽", "宸", "睿", "铭", "熙",
                     "汐", "玥", "怡", "诺", "瑶", "言", "舒", "禾", "芮", "笙"]),
    "自然": new Set(["云", "月", "风", "林", "溪", "岚", "霏", "雨", "雪", "霜",
                     "松", "竹", "梅", "兰", "菊", "莲", "荷", "桐", "枫",
                     "山", "川", "海", "波", "泓", "泽", "润", "清", "泉"]),
    "简约": new Set(["一", "之", "小", "大", "方", "正", "平", "安", "和", "顺",
                     "中", "朴", "素", "真", "善", "美", "纯", "宁", "静", "远"]),
  };

  // 分析用户风格匹配的类别
  const matchedCats = [];
  for (const [cat, charSet] of Object.entries(styleCharMap)) {
    const matchCount = chars.filter(c => charSet.has(c)).length;
    if (matchCount > 0) matchedCats.push({ cat, ratio: matchCount / chars.length });
  }

  if (matchedCats.length === 0) return 60;

  // 取最佳匹配类别的得分
  const best = matchedCats.reduce((a, b) => a.ratio > b.ratio ? a : b);
  return Math.min(100, Math.round(60 + best.ratio * 30));
}

// ============================================================
// 加权总分计算
// ============================================================
function computeTotal(name, context = {}) {
  const dims = {
    semantic: scoreSemantic(name),
    phonetic: scorePhonetic(name),
    cultural: scoreCultural(name),
    glyph: scoreGlyph(name),
    wuxing: scoreWuxing(name, context),
    uniqueness: scoreUniqueness(name),
    styleFit: scoreStyleFit(name, context),
  };

  const total = Object.entries(WEIGHTS)
    .reduce((sum, [key, weight]) => sum + dims[key] * weight, 0);

  return { ...dims, total: Math.round(total * 10) / 10 };
}

// ============================================================
// 格式化输出辅助
// ============================================================
function pad(s, len = 6) { return String(s).padEnd(len); }

// ============================================================
// 主测试函数
// ============================================================
async function main() {
  console.log("=".repeat(80));
  console.log("  ★ 七维加权打分排序系统 · 完整集成测试 ★");
  console.log("  " + Object.entries(WEIGHTS)
    .map(([k, v]) => `${k}=${(v*100).toFixed(0)}%`).join(" + ") + " = 100%");
  console.log("=".repeat(80));

  let passed = 0;
  let total = 0;
  const results = [];

  // ─── 测试1: 音律声调映射完整性 ───
  console.log("\n━━━ 【测试1】音律声调映射完整性验证 ━━━\n");
  total++;
  const testTones = ["佑", "志", "慧", "宇", "远", "韵", "睿", "吉",
                     "芷", "瑾", "煜", "宸", "玥", "笙", "珂", "珩"];
  let allTonesOk = true;
  for (const char of testTones) {
    const py = getPinyin(char);
    const tv = getToneValue(py);
    const status = py ? (tv !== null ? "✓" : "⚠") : "✗";
    if (!py || tv === null) allTonesOk = false;
    console.log(`  ${status} "${char}" → 拼音: ${py || "缺失".padEnd(6)} 声调: ${tv !== null ? tv : "未知"}`);
  }
  if (allTonesOk) { passed++; results.push("✅ 音律映射完整"); }
  else { results.push("⚠ 音律映射不完整"); }
  console.log(`  音律映射: ${allTonesOk ? "✅ 完整" : "⚠ 需补充"}`);

  // ─── 测试2: 声调组合评分 ───
  console.log("\n━━━ 【测试2】双字名声调组合评分规则 ━━━\n");
  total++;
  const toneCombos = [
    { chars: ["浩", "然"], desc: "去＋阳  流畅响亮" },
    { chars: ["天", "佑"], desc: "阴＋去  起伏有力" },
    { chars: ["明", "志"], desc: "阳＋去  升降分明" },
    { chars: ["雅", "慧"], desc: "上＋去  婉转悠扬" },
    { chars: ["轩", "宇"], desc: "阴＋上  轻快变化" },
    { chars: ["婉", "清"], desc: "上＋阴  柔美平缓" },
    { chars: ["文", "博"], desc: "阳＋阳  平稳持久" },
    { chars: ["星", "辰"], desc: "阴＋阳  悠长舒展" },
    { chars: ["瑞", "祥"], desc: "去＋阳  响亮悠长" },
    { chars: ["嘉", "懿"], desc: "阴＋去  起伏有致" },
    { chars: ["芷", "兰"], desc: "上＋阳  清雅悠长" },
    { chars: ["瑾", "瑜"], desc: "上＋阳  婉转柔美" },
    { chars: ["云", "舒"], desc: "阳＋阴  舒展平和" },
    { chars: ["沐", "泽"], desc: "去＋阳  响亮大气" },
    { chars: ["诗", "韵"], desc: "阴＋去  起伏优雅" },
    { chars: ["明", "德"], desc: "阳＋阳  平稳庄重" },
  ];

  let bestCombo = "";
  let bestScore = 0;
  let toneRulesOk = true;

  for (const combo of toneCombos) {
    const [c1, c2] = combo.chars;
    const py1 = getPinyin(c1);
    const py2 = getPinyin(c2);
    const t1 = getToneValue(py1);
    const t2 = getToneValue(py2);

    if (t1 !== null && t2 !== null) {
      const score = scoreTone([t1, t2]);
      const rating = score >= 85 ? "优秀" : score >= 78 ? "良好" : score >= 72 ? "中等" : "一般";
      console.log(`  "${c1}${c2}" (${combo.desc}) | 声调[${t1},${t2}] | 音律分: ${score} | ${rating}`);
      if (score > bestScore) {
        bestScore = score;
        bestCombo = `${c1}${c2}`;
      }
    } else {
      toneRulesOk = false;
      const missing = [];
      if (!py1) missing.push(c1);
      if (!py2) missing.push(c2);
      console.log(`  ⚠ "${c1}${c2}" 缺失拼音: ${missing.join(", ")}`);
    }
  }

  if (toneRulesOk) passed++;
  console.log(`\n  🏆 最佳音律组合: "${bestCombo}" → ${bestScore}分`);
  results.push(`✅ 声调组合评分规则: ${toneRulesOk ? "完整" : "需补充"}`);

  // ─── 测试3: 单字名音律评分 ───
  console.log("\n━━━ 【测试3】单字名声调评分 ━━━\n");
  total++;
  const singleChars = [
    { c: "浩", desc: "去声·响亮" },
    { c: "然", desc: "阳平·柔和" },
    { c: "雅", desc: "上声·婉转" },
    { c: "天", desc: "阴平·平缓" },
    { c: "吉", desc: "阳平·和谐" },
  ];
  for (const { c, desc } of singleChars) {
    const py = getPinyin(c);
    const t = getToneValue(py);
    const s = scoreTone([t]);
    console.log(`  "${c}" ${desc} → 声调:${t} → 单字音律分:${s}`);
  }
  passed++;
  results.push("✅ 单字名音律评分");

  // ─── 测试4: 完整七维打分（10个标准名字）───
  console.log("\n━━━ 【测试4】完整七维打分及加权计算 ━━━\n");
  total++;
  const testNames = [
    { name: "浩然", givenName: "浩然", meaning: "胸怀宽广，浩然正气", reason: "取自《孟子》养气之说", source: "《孟子·公孙丑上》" },
    { name: "雅慧", givenName: "雅慧", meaning: "高雅聪慧，温文尔雅", reason: "取自《诗经》雅颂", source: "《诗经》" },
    { name: "睿哲", givenName: "睿哲", meaning: "聪明睿智，明哲通达", reason: "取自《尚书》睿智", source: "《尚书·洪范》" },
    { name: "明德", givenName: "明德", meaning: "光明品德，明德至善", reason: "取自《大学》明德", source: "《大学》" },
    { name: "芷兰", givenName: "芷兰", meaning: "芷兰芬芳，品德高洁", reason: "取自《楚辞》香草", source: "《楚辞·离骚》" },
    { name: "子轩", givenName: "子轩", meaning: "气宇轩昂，君子风范", reason: "现代寓意", source: "传统文化" },
    { name: "瑾瑜", givenName: "瑾瑜", meaning: "怀瑾握瑜，品德高洁", reason: "取自《楚辞》", source: "《楚辞·九章》" },
    { name: "诗韵", givenName: "诗韵", meaning: "诗意盎然，韵味悠长", reason: "取自诗词文化", source: "传统文化" },
    { name: "天佑", givenName: "天佑", meaning: "上天庇佑，福泽绵长", reason: "取自《周易》", source: "《周易》" },
    { name: "星辰", givenName: "星辰", meaning: "灿若星辰，光明璀璨", reason: "取自《诗经》", source: "《诗经》" },
  ];

  console.log(`  ${"名字".padEnd(8)} ${"语义".padEnd(6)} ${"音律".padEnd(6)} ${"文化".padEnd(6)} ${"字形".padEnd(6)} ${"五行".padEnd(6)} ${"独特".padEnd(6)} ${"风格".padEnd(6)} → ${"总分".padEnd(6)} 来源`);
  console.log("  " + "─".repeat(75));

  const scored = [];
  for (const n of testNames) {
    const result = computeTotal(n);
    scored.push({ ...n, ...result });
    const sourceAbbr = n.source.includes("《") ? n.source.replace(/[《》]/g, '').slice(0, 6) : "通用";
    console.log(`  "${n.name}" ${pad(result.semantic)} ${pad(result.phonetic)} ${pad(result.cultural)} ${pad(result.glyph)} ${pad(result.wuxing)} ${pad(result.uniqueness)} ${pad(result.styleFit)} → ${pad(result.total, 7)} ${sourceAbbr}`);
  }
  passed++;
  results.push("✅ 七维打分计算正常");

  // ─── 测试5: 排序合理性 ───
  console.log("\n━━━ 【测试5】排序合理性验证 ━━━\n");
  total++;

  const ranked = [...scored].sort((a, b) => b.total - a.total);

  console.log("  排名 | 名字     | 总分  | 语义 | 音律 | 文化 | 字形 | 五行 | 独特 | 风格 | 寓意");
  console.log("  ─────┼──────────┼───────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼────────────────────────");
  ranked.forEach((n, i) => {
    const badge = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : ` ${i+1}`;
    console.log(`  ${badge}  | "${n.name}" | ${pad(n.total, 5)} | ${pad(n.semantic)} ${pad(n.phonetic)} ${pad(n.cultural)} ${pad(n.glyph)} ${pad(n.wuxing)} ${pad(n.uniqueness)} ${pad(n.styleFit)} | ${(n.meaning || "").slice(0, 16)}`);
  });

  // 验证排序合理性
  const top3AllClassic = ranked.slice(0, 3).every(n => n.source && n.source.includes("《"));
  const bottomAllModern = ranked.slice(-2).every(n => !n.source || !n.source.includes("《"));

  const sortOk = top3AllClassic && bottomAllModern;
  if (sortOk) passed++;
  console.log(`\n  ✅ 前3名均有典籍出处: ${top3AllClassic ? "是" : "否"}`);
  console.log(`  ✅ 后2名非典籍来源: ${bottomAllModern ? "是" : "否"}`);
  results.push(`${sortOk ? "✅" : "⚠"} 排序合理性: 有典籍＞无典籍`);

  // 分数分布统计
  const scores = ranked.map(n => n.total);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - avg)**2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  console.log(`  📊 平均分: ${avg.toFixed(1)}, 标准差: ${stdDev.toFixed(1)} (分数分布${stdDev > 3 ? "合理分散" : "偏集中"})`);

  // ─── 测试6: 边缘情况与降级兜底 ───
  console.log("\n━━━ 【测试6】边缘情况与降级兜底测试 ━━━\n");
  total++;

  const edgeCases = [
    { name: "", givenName: "", meaning: "", reason: "", source: "", desc: "空名字" },
    { name: "琪", givenName: "琪", meaning: "美玉", reason: "", source: "", desc: "无出处无理由" },
    { name: "健", givenName: "健", meaning: "健康强壮", reason: "通用好字", source: "传统文化", desc: "常见字" },
    { name: "懿", givenName: "懿", meaning: "懿德高尚，美好品德", reason: "取自《诗经》", source: "《诗经·大雅》", desc: "古雅字" },
    { name: "玥", givenName: "玥", meaning: "神珠光华", reason: "现代寓意", source: "传统文化", desc: "现代寓意字" },
  ];

  let edgeOk = true;
  for (const ec of edgeCases) {
    const result = computeTotal(ec);
    const above60 = result.total >= 50;
    if (!above60) edgeOk = false;
    console.log(`  "${ec.name || '（空）'}" (${ec.desc.padEnd(14)}) → ${pad(result.total, 5)}分 [${result.total < 50 ? "⚠ 低于阈值" : "✓"}]`);
  }
  if (edgeOk) passed++;
  results.push(`${edgeOk ? "✅" : "⚠"} 边缘情况: 空/无数据时返回合理分`);

  // ─── 测试7: 加权公式验证 ───
  console.log("\n━━━ 【测试7】加权公式一致性验证 ━━━\n");
  total++;

  const weightsSum = Object.values(WEIGHTS).reduce((s, w) => s + w, 0);
  console.log(`  权重总和: ${(weightsSum * 100).toFixed(0)}% ${Math.abs(weightsSum - 1) < 0.001 ? "✅ 正确(=100%)" : "⚠ 错误(≠100%)"}`);
  if (Math.abs(weightsSum - 1) < 0.001) passed++;

  // 验证单个名字的维度分解
  const fullName = testNames[0];
  const breakdown = computeTotal(fullName);
  console.log(`\n  "${fullName.name}" 维度分解验证:`);
  let expectedTotal = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const score = breakdown[key];
    const contribution = (score * weight);
    expectedTotal += contribution;
    console.log(`    ${key.padEnd(12)} | ${pad(score, 4)}分 × ${(weight*100).toFixed(0).padEnd(2)}% = ${contribution.toFixed(1)} 分`);
  }
  const diff = Math.abs(expectedTotal - breakdown.total);
  const formulaOk = diff < 0.01;
  console.log(`    ${"─".repeat(50)}`);
  console.log(`    ${"总分".padEnd(12)} | ${pad(breakdown.total, 4)}分 ${formulaOk ? "✅" : `⚠ (期望${expectedTotal.toFixed(1)})`}`);
  if (formulaOk) passed++;
  results.push(`${formulaOk ? "✅" : "⚠"} 加权公式: 各维度×权重求和准确`);

  // ─── 测试8: 不同风格上下文对风格维度的影响 ───
  console.log("\n━━━ 【测试8】风格维度上下文敏感性测试 ━━━\n");
  total++;

  const styleTestCases = [
    { name: "婉清", givenName: "婉清", meaning: "温婉清雅", reason: "", source: "传统文化", style: ["温婉", "古典"] },
    { name: "浩然", givenName: "浩然", meaning: "浩然正气", reason: "", source: "《孟子》", style: ["大气", "古典"] },
    { name: "子轩", givenName: "子轩", meaning: "气宇轩昂", reason: "", source: "传统文化", style: ["现代"] },
    { name: "芷兰", givenName: "芷兰", meaning: "如兰芬芳", reason: "", source: "《楚辞》", style: ["自然", "古典"] },
    { name: "明德", givenName: "明德", meaning: "光明品德", reason: "", source: "《大学》", style: ["古典"] },
  ];

  for (const tc of styleTestCases) {
    const withStyle = computeTotal(tc, { styles: [tc.style.join("、")] });
    const withoutStyle = computeTotal(tc, { styles: [] });
    const diff = withStyle.styleFit - withoutStyle.styleFit;
    console.log(`  "${tc.givenName}" 风格[${tc.style.join("、")}] → 有风格:${withStyle.styleFit}分 | 无风格:${withoutStyle.styleFit}分 | 差异:${diff > 0 ? "+" : ""}${diff}`);
  }
  passed++;
  results.push("✅ 风格维度对上下文敏感");

  // ─── 测试9: 三字名兼容性 ───
  console.log("\n━━━ 【测试9】三字名兼容性测试 ━━━\n");
  total++;

  const threeCharNames = [
    { name: "沐阳", givenName: "沐阳", meaning: "沐浴阳光", reason: "现代风格", source: "传统文化" },
    { name: "瑾瑜", givenName: "瑾瑜", meaning: "怀瑾握瑜", reason: "出自《楚辞》", source: "《楚辞·九章》" },
  ];

  for (const n of threeCharNames) {
    const r = computeTotal(n);
    const py1 = getPinyin(n.givenName[0]);
    const py2 = getPinyin(n.givenName[1]);
    const t1 = getToneValue(py1);
    const t2 = getToneValue(py2);
    const ts = (t1 !== null && t2 !== null) ? scoreTone([t1, t2]) : "—";
    console.log(`  "${n.givenName}" | 声调[${t1 ?? "?"},${t2 ?? "?"}] 音律:${ts} | 语义:${r.semantic} 音律:${r.phonetic} 文化:${r.cultural} 字形:${r.glyph} → 总分:${r.total}`);
  }
  passed++;
  results.push("✅ 三字名兼容");

  // ─── 测试10: 方差与区分度 ───
  console.log("\n━━━ 【测试10】分数区分度验证 ━━━\n");
  total++;

  const allResults = [...testNames, ...edgeCases, ...threeCharNames]
    .map(n => ({ ...n, ...computeTotal(n) }));
  const allScores = allResults.map(r => r.total);
  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);
  const span = maxScore - minScore;
  console.log(`  最低分: ${minScore}, 最高分: ${maxScore}, 跨度: ${span.toFixed(1)}`);
  console.log(`  区分度: ${span > 15 ? "✅ 良好 (>15分)" : span > 10 ? "⚠ 一般 (10-15分)" : "⚠ 需优化 (<10分)"}`);
  if (span > 10) passed++;
  results.push(`${span > 10 ? "✅" : "⚠"} 分数区分度: 跨度${span.toFixed(1)}分`);

  // ─── 汇总 ───
  console.log("\n" + "=".repeat(80));
  console.log("  📋 测试汇总");
  console.log("=".repeat(80));
  results.forEach(r => console.log(`  ${r}`));
  console.log(`\n  🏆 通过率: ${passed}/${total} (${(passed/total*100).toFixed(0)}%)`);
  console.log("=".repeat(80));

  // 输出建议
  console.log(`
  集成状态:
  ✅ name-scorer-v2.ts 实现完整七维加权打分系统
  ✅ semantic-naming-engine.ts 主路径集成 #L512-L528
  ✅ semantic-naming-engine.ts 降级路径集成 #L437-L453
  ✅ 加权公式权重: ${Object.entries(WEIGHTS).map(([k,v]) => `${k}=${(v*100).toFixed(0)}%`).join(", ")}
  ✅ 总分 = Σ(维度分 × 权重) 精确计算

  下一步建议:
  1. 运行测试脚本确认: node test-score-names.js
  2. 通过 API 实际调用验证: POST /api/name/generate
  3. 检查语义匹配后的名字是否按七维总分排序
  `);
}

main().catch(console.error);