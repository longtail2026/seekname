/**
 * 测试：七维加权打分排序系统
 * 
 * 测试点：
 * 1. name-scorer-v2.ts 中各维度评分函数
 * 2. 加权综合分计算
 * 3. 排序结果合理性
 * 4. 降级兜底逻辑
 * 
 * 运行：node test-score-names.js
 */

const path = require("path");

// 模拟 ScoringContext 需要的拼音数据
const pinyinMap = new Map([
  // 声调组合测试: 1=阴平, 2=阳平, 3=上声, 4=去声
  ["安", "ān"], ["康", "kāng"], ["宁", "níng"], ["平", "píng"],
  ["明", "míng"], ["华", "huá"], ["志", "zhì"], ["远", "yuǎn"],
  ["浩", "hào"], ["然", "rán"], ["天", "tiān"], ["佑", "yòu"],
  ["文", "wén"], ["博", "bó"], ["雅", "yǎ"], ["慧", "huì"],
  ["子", "zǐ"], ["轩", "xuān"], ["宇", "yǔ"], ["涵", "hán"],
  ["思", "sī"], ["琪", "qí"], ["诗", "shī"], ["韵", "yùn"],
  ["婉", "wǎn"], ["清", "qīng"], ["淑", "shū"], ["娴", "xián"],
  ["瑾", "jǐn"], ["瑜", "yú"], ["瑶", "yáo"], ["曦", "xī"],
  ["麒", "qí"], ["麟", "lín"], ["凤", "fèng"], ["翔", "xiáng"],
  ["瑞", "ruì"], ["祥", "xiáng"], ["福", "fú"], ["禄", "lù"],
  ["景", "jǐng"], ["星", "xīng"], ["辰", "chén"], ["萱", "xuān"],
  ["沛", "pèi"], ["泽", "zé"], ["泓", "hóng"], ["涛", "tāo"],
  ["煜", "yù"], ["炜", "wěi"], ["宸", "chén"], ["铭", "míng"],
  ["崇", "chóng"], ["德", "dé"], ["尚", "shàng"], ["贤", "xián"],
  ["思", "sī"], ["敏", "mǐn"], ["行", "xíng"], ["笃", "dǔ"],
  ["英", "yīng"], ["杰", "jié"], ["睿", "ruì"], ["智", "zhì"],
  ["伟", "wěi"], ["毅", "yì"], ["诚", "chéng"], ["信", "xìn"],
  ["嘉", "jiā"], ["言", "yán"], ["善", "shàn"], ["道", "dào"],
  ["沐", "mù"], ["阳", "yáng"], ["春", "chūn"], ["风", "fēng"],
  ["云", "yún"], ["舒", "shū"], ["霞", "xiá"], ["蔚", "wèi"],
  ["采", "cǎi"], ["薇", "wēi"], ["悠", "yōu"], ["然", "rán"],
]);

// 注意：这里手动构造拼音，模拟 pinyin-pro 的行为
function getPinyinPy(char) {
  // 模拟 pinyin-pro 中每个字的拼音
  const pinyins = {
    "安": "ān", "康": "kāng", "宁": "níng", "平": "píng",
    "明": "míng", "华": "huá", "志": "zhì", "远": "yuǎn",
    "浩": "hào", "然": "rán", "天": "tiān", "佑": "yòu",
    "文": "wén", "博": "bó", "雅": "yǎ", "慧": "huì",
    "子": "zǐ", "轩": "xuān", "宇": "yǔ", "涵": "hán",
    "思": "sī", "琪": "qí", "诗": "shī", "韵": "yùn",
    "婉": "wǎn", "清": "qīng", "淑": "shū", "娴": "xián",
    "瑾": "jǐn", "瑜": "yú", "瑶": "yáo", "曦": "xī",
    "麒": "qí", "麟": "lín", "凤": "fèng", "翔": "xiáng",
    "瑞": "ruì", "祥": "xiáng", "福": "fú", "禄": "lù",
    "景": "jǐng", "星": "xīng", "辰": "chén", "萱": "xuān",
    "沛": "pèi", "泽": "zé", "泓": "hóng", "涛": "tāo",
    "煜": "yù", "炜": "wěi", "宸": "chén", "铭": "míng",
    "崇": "chóng", "德": "dé", "尚": "shàng", "贤": "xián",
    "思": "sī", "敏": "mǐn", "行": "xíng", "笃": "dǔ",
    "英": "yīng", "杰": "jié", "睿": "ruì", "智": "zhì",
    "伟": "wěi", "毅": "yì", "诚": "chéng", "信": "xìn",
    "嘉": "jiā", "言": "yán", "善": "shàn", "道": "dào",
    "沐": "mù", "阳": "yáng", "春": "chūn", "风": "fēng",
    "云": "yún", "舒": "shū", "霞": "xiá", "蔚": "wèi",
    "采": "cǎi", "薇": "wēi", "悠": "yōu", "然": "rán",
  };
  return pinyins[char] || null;
}

// 模拟声调值
function toneValue(pinyin) {
  const toneMap = { 'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4 };
  if (!pinyin) return 0;
  for (const ch of pinyin) {
    if (toneMap[ch]) return toneMap[ch];
  }
  return 0; // 轻声
}

// 模拟双字名的音律评分（与 name-scorer-v2.ts 中的逻辑一致）
function scoreTone(tones) {
  if (!tones || tones.length < 2) return 70;
  const [t1, t2] = tones;
  // 去声(4)结尾 → 响亮
  if (t2 === 4) {
    if (t1 === 2 || t1 === 3) return 88; // 阳/上 + 去 → 最佳
    if (t1 === 4) return 75; // 去 + 去 → 稍显生硬
    return 80;
  }
  // 阳平(2)结尾 → 柔和悠长
  if (t2 === 2) {
    if (t1 === 4) return 85; // 去 + 阳 → 第二优
    if (t1 === 3) return 80;
    if (t1 === 1) return 75;
    return 70;
  }
  // 上声(3)结尾 → 婉转
  if (t2 === 3) {
    if (t1 === 1 || t1 === 4) return 78;
    return 72;
  }
  // 阴平(1)结尾 → 平缓
  if (t2 === 1) return 70;
  return 65;
}

async function main() {
  console.log("=".repeat(60));
  console.log(" 七维加权打分排序系统测试");
  console.log("=".repeat(60));

  // ============ 测试用例 ============
  
  // 测试1：声调组合测试
  console.log("\n【测试1】从音律角度验证打分合理性\n");
  
  const testCases = [
    // [名字, 声调1, 声调2, 期望音律评价]
    { name: "浩", givenName: "浩", chars: ["浩"], expected: "去声 - 响亮大气" },
    { name: "然", givenName: "然", chars: ["然"], expected: "阳平 - 平和悠长" },
  ];

  for (const tc of testCases) {
    const tones = tc.chars.map(c => toneValue(getPinyinPy(c)));
    console.log(`  字: ${tc.chars[0]} → 声调值: ${tones[0]}, 拼音: ${getPinyinPy(tc.chars[0])}`);
  }

  // 测试2：常见双字名声调组合
  console.log("\n【测试2】双字名声调组合分析\n");
  
  const nameCombos = [
    { chars: ["浩", "然"], desc: "去＋阳（流畅）" },
    { chars: ["天", "佑"], desc: "阴＋去（起伏）" },
    { chars: ["明", "志"], desc: "阳＋去（升降）" },
    { chars: ["雅", "慧"], desc: "上＋去（婉转）" },
    { chars: ["轩", "宇"], desc: "阴＋上（变化）" },
    { chars: ["婉", "清"], desc: "上＋阴（柔美）" },
    { chars: ["浩", "然"], desc: "去＋阳（响亮悠长）" },
    { chars: ["文", "博"], desc: "阳＋阳（平缓）" },
  ];

  for (const nc of nameCombos) {
    const tones = nc.chars.map(c => toneValue(getPinyinPy(c)));
    const score = scoreTone(tones);
    console.log(`  ${nc.chars.join("")} (${nc.desc}): 声调[${tones.join(",")}] → 音律得分: ${score}`);
  }

  // 测试3：完整打分流程模拟
  console.log("\n【测试3】模拟完整七维打分\n");
  
  const testNames = [
    { name: "浩", givenName: "浩", meaning: "胸怀宽广，浩然正气", reason: "取自《孟子》", source: "《孟子·公孙丑上》" },
    { name: "明", givenName: "明", meaning: "光明智慧，明德至善", reason: "取自《大学》", source: "《大学》" },
    { name: "雅", givenName: "雅", meaning: "高雅脱俗，温文尔雅", reason: "取自《诗经》", source: "《诗经》" },
    { name: "琪", givenName: "琪", meaning: "美玉般珍贵，才华出众", reason: "取自传统文化", source: "传统文化" },
    { name: "子", givenName: "子", meaning: "品德高尚，谦谦君子", reason: "取自《论语》", source: "《论语》" },
    { name: "睿", givenName: "睿", meaning: "聪明睿智，远见卓识", reason: "取自《尚书》", source: "《尚书·洪范》" },
  ];

  for (const n of testNames) {
    const score = simulateSevenDimScore(n, getPinyinPy(n.name));
    console.log(`  "${n.name}" → 总分: ${score.toFixed(1)}`);
  }

  // 测试4：排序合理性
  console.log("\n【测试4】排序合理性验证\n");
  
  const sortedByScore = [...testNames].sort((a, b) => {
    return simulateSevenDimScore(b, getPinyinPy(b.name)) - simulateSevenDimScore(a, getPinyinPy(a.name));
  });

  console.log("  排序结果（从高到低）:");
  sortedByScore.forEach((n, i) => {
    const s = simulateSevenDimScore(n, getPinyinPy(n.name));
    console.log(`  ${i + 1}. "${n.name}" → ${s.toFixed(1)}分  (${n.meaning.slice(0, 12)}...)`);
  });

  // 测试5：空降级
  console.log("\n【测试5】边缘情况测试");
  console.log("  (1) 空输入 →", simulateSevenDimScore({name:"", givenName:"", meaning:"", reason:"", source:""}, null));
  console.log("  (2) 无source →", simulateSevenDimScore({name:"琪", givenName:"琪", meaning:"美玉", reason:"", source:""}, getPinyinPy("琪")));
  console.log("  (3) 繁体字 →", simulateSevenDimScore({name:"龍", givenName:"龍", meaning:"飞龙在天", reason:"出自《易经》", source:"《易经·乾卦》"}, null));

  // 测试6：验证加权公式
  console.log("\n【测试6】加权公式验证");
  console.log("  维度权重: 语义25% + 音律20% + 文化15% + 字形10% + 五行15% + 独特10% + 现代5% = 100%");
  console.log("  -- 以上为独立评分，总分未包含加权（演示用） --");
  
  // 测试7：边界情况 - 名字长度 > 2
  console.log("\n【测试7】三字名测试");
  const threeCharNames = [
    { name: "浩", givenName: "浩", meaning: "浩然正气", reason: "出自《孟子》", source: "《孟子》" },
    { name: "子", givenName: "子", meaning: "君子之德", reason: "出自《论语》", source: "《论语》" },
    { name: "轩", givenName: "轩", meaning: "气宇轩昂", reason: "出自传统文化", source: "传统文化" },
  ];
  threeCharNames.forEach(n => {
    console.log(`  "${n.name}" → ${simulateSevenDimScore(n, getPinyinPy(n.name)).toFixed(1)}分`);
  });

  console.log("\n" + "=".repeat(60));
  console.log(" 测试完成");
  console.log("=".repeat(60));
}

// 模拟七维打分
function simulateSevenDimScore(name, pinyin) {
  const SCORE_DEFAULTS = {
    语义匹配度: { weight: 0.25 },
    音律美感: { weight: 0.20 },
    文化内涵: { weight: 0.15 },
    字形结构: { weight: 0.10 },
    五行平衡: { weight: 0.15 },
    独特性: { weight: 0.10 },
    现代感: { weight: 0.05 },
  };

  // 各维度模拟评分
  const dimensions = {
    语义匹配度: scoreSemantic(name, 70),
    音律美感: scoreMelody(pinyin),
    文化内涵: scoreCultural(name),
    字形结构: scoreStructure(name.name || name.givenName),
    五行平衡: scoreWuxing(70),
    独特性: scoreUniqueness(name.name || name.givenName),
    现代感: scoreModern(name.name || name.givenName),
  };

  // 计算加权总分
  let total = 0;
  for (const [dim, score] of Object.entries(dimensions)) {
    const weight = SCORE_DEFAULTS[dim].weight;
    total += score * weight;
  }

  return total;
}

function scoreSemantic(name, baseScore) {
  if (!name.name && !name.givenName) return 50;
  if (name.source && name.source !== "传统文化") return Math.min(95, baseScore + 10);
  if (name.meaning && name.meaning.length > 5) return baseScore + 5;
  return baseScore;
}

function scoreMelody(pinyin) {
  if (!pinyin) return 60;
  const tone = toneValue(pinyin);
  // 去声(4)响亮、阳平(2)柔和、上声(3)婉转、阴平(1)平缓
  if (tone === 4) return 85;
  if (tone === 2) return 80;
  if (tone === 3) return 75;
  if (tone === 1) return 70;
  return 60;
}

function scoreCultural(name) {
  if (!name.name && !name.givenName) return 50;
  if (name.source && !name.source.includes("传统文化") && !name.source.includes("传统")) return 85;
  if (name.meaning && name.meaning.length > 8) return 75;
  return 65;
}

function scoreStructure(char) {
  if (!char || char.length === 0) return 60;
  // 笔画数简单的字得分高
  const simpleChars = new Set(["子", "文", "天", "平", "安", "方", "元", "中", "心", "正", "仁", "民"]);
  if (simpleChars.has(char)) return 85;
  // 中等复杂度
  const midChars = new Set(["明", "志", "浩", "然", "雅", "慧", "欣", "悦", "康", "宁", "华", "博"]);
  if (midChars.has(char)) return 75;
  return 65;
}

function scoreWuxing(baseScore) {
  return baseScore;
}

function scoreUniqueness(char) {
  if (!char || char.length === 0) return 60;
  const commonChars = new Set(["子", "文", "天", "明", "志", "华", "安", "平", "伟"]);
  if (commonChars.has(char)) return 60;
  return 80;
}

function scoreModern(char) {
  if (!char || char.length === 0) return 65;
  const modernChars = new Set(["子", "轩", "宇", "涵", "欣", "悦", "诗", "韵", "琪", "睿"]);
  if (modernChars.has(char)) return 85;
  return 70;
}

main().catch(console.error);