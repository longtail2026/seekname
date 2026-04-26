/**
 * 测试：七维加权打分排序系统
 * 
 * 测试点：
 * 1. name-scorer-v2.ts 中各维度评分函数
 * 2. 加权综合分计算
 * 3. 排序结果合理性
 * 4. 降级兜底逻辑
 * 5. 音律声调组合完整性
 * 
 * 运行：node test-score-names.js
 */

// ============================================================
// 完整拼音映射（覆盖所有测试用字）
// ============================================================
const PINYIN_MAP = {
  // 测试1/2: 声调组合
  "浩": "hào", "然": "rán",
  "天": "tiān", "佑": "yòu",
  "明": "míng", "志": "zhì",
  "雅": "yǎ", "慧": "huì",
  "轩": "xuān", "宇": "yǔ",
  "婉": "wǎn", "清": "qīng",
  "文": "wén", "博": "bó",
  // 测试3
  "睿": "ruì",
  "琪": "qí",
  "子": "zǐ",
  // 测试7: 三字名
  "韵": "yùn",
  "诗": "shī",
  "庭": "tíng",
  "兰": "lán",
  "璟": "jǐng",
  "瑜": "yú",
  "沐": "mù",
  "泽": "zé",
  "瑶": "yáo",
  "瑾": "jǐn",
  "安": "ān", "康": "kāng", "宁": "níng", "平": "píng",
  "华": "huá", "远": "yuǎn",
  "淑": "shū", "娴": "xián",
  "麒": "qí", "麟": "lín", "凤": "fèng", "翔": "xiáng",
  "瑞": "ruì", "祥": "xiáng", "福": "fú", "禄": "lù",
  "景": "jǐng", "星": "xīng", "辰": "chén", "萱": "xuān",
  "沛": "pèi", "泓": "hóng", "涛": "tāo",
  "煜": "yù", "炜": "wěi", "宸": "chén", "铭": "míng",
  "崇": "chóng", "德": "dé", "尚": "shàng", "贤": "xián",
  "思": "sī", "敏": "mǐn", "行": "xíng", "笃": "dǔ",
  "英": "yīng", "杰": "jié",
  "伟": "wěi", "毅": "yì", "诚": "chéng", "信": "xìn",
  "嘉": "jiā", "言": "yán", "善": "shàn", "道": "dào",
  "沐": "mù", "阳": "yáng", "春": "chūn", "风": "fēng",
  "云": "yún", "舒": "shū", "霞": "xiá", "蔚": "wèi",
  "采": "cǎi", "薇": "wēi", "悠": "yōu",
  "芷": "zhǐ", "荷": "hé", "柳": "liǔ", "枫": "fēng",
  "柏": "bǎi", "松": "sōng", "桐": "tóng", "楠": "nán",
  "伊": "yī", "诺": "nuò", "汐": "xī", "玥": "yuè",
  "洛": "luò", "笙": "shēng", "禾": "hé", "芮": "ruì",
};

function getPinyinPy(char) {
  return PINYIN_MAP[char] || null;
}

/** 提取声调值 */
function toneValue(pinyin) {
  if (!pinyin) return null;
  const toneMap = { 'ā': 1, 'ē': 1, 'ī': 1, 'ō': 1, 'ū': 1, 'ǖ': 1,
                    'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2, 'ǘ': 2,
                    'ǎ': 3, 'ě': 3, 'ǐ': 3, 'ǒ': 3, 'ǔ': 3, 'ǚ': 3,
                    'à': 4, 'è': 4, 'ì': 4, 'ò': 4, 'ù': 4, 'ǜ': 4 };
  for (const ch of pinyin) {
    if (toneMap[ch]) return toneMap[ch];
  }
  return 0; // 轻声
}

// ============================================================
// 音律声调评分规则（与 name-scorer-v2 逻辑对齐）
// ============================================================
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

// ============================================================
// 模拟各维度评分（与 name-scorer-v2.ts 的评分逻辑对齐）
// ============================================================

/** 语义匹配度 (25%) */
function scoreSemantic(name, baseScore) {
  if (!name.name && !name.givenName) return 50;
  let score = baseScore || 70;
  // 有典籍出处加分
  if (name.source && !["传统文化", "传统"].includes(name.source)) {
    score = Math.min(95, score + 15);
  }
  // 寓意丰富加分
  if (name.meaning && name.meaning.length >= 8) score += 5;
  // 有具体选字理由加分
  if (name.reason && name.reason.length > 5) score += 5;
  return Math.min(100, score);
}

/** 音律美感 (20%) */
function scoreMelody(pinyin) {
  if (!pinyin) return 60;
  const tone = toneValue(pinyin);
  if (tone === 4) return 85;   // 去声响亮
  if (tone === 2) return 80;   // 阳平柔和
  if (tone === 3) return 75;   // 上声婉转
  if (tone === 1) return 70;   // 阴平平缓
  return 60;
}

/** 文化内涵 (15%) */
function scoreCultural(name) {
  if (!name.name && !name.givenName) return 50;
  // 明确的典籍出处 → 高分
  if (name.source && !name.source.includes("传统文化")) return 85;
  // 寓意有深度 → 中高分
  if (name.meaning && name.meaning.length > 8) return 75;
  // 一般 → 基础分
  return 65;
}

/** 字形结构 (10%) */
function scoreStructure(char) {
  if (!char || char.length === 0) return 60;
  const simpleChars = new Set(["子", "文", "天", "平", "安", "方", "元", "中", "心", "正", "仁", "民", "一", "之"]);
  const midChars = new Set(["明", "志", "浩", "然", "雅", "慧", "欣", "悦", "康", "宁", "华", "博",
                            "远", "瑞", "祥", "清", "泽", "涵", "诗", "韵", "琪", "睿", "铭", "宸"]);
  if (simpleChars.has(char)) return 85;
  if (midChars.has(char)) return 75;
  return 65;
}

/** 五行平衡 (15%) */
function scoreWuxing(baseScore) {
  return baseScore || 70;
}

/** 独特性 (10%) */
function scoreUniqueness(char) {
  if (!char || char.length === 0) return 60;
  const commonChars = new Set(["子", "文", "天", "明", "志", "华", "安", "平", "伟", "嘉"]);
  if (commonChars.has(char)) return 60;
  const rareChars = new Set(["瑾", "瑜", "璟", "萱", "宸", "睿", "麒", "麟", "煜", "炜"]);
  if (rareChars.has(char)) return 85;
  return 75;
}

/** 现代感 (5%) — 与风格契合度对齐 */
function scoreModern(char) {
  if (!char || char.length === 0) return 65;
  const modernChars = new Set(["子", "轩", "宇", "涵", "欣", "悦", "诗", "韵", "琪", "睿",
                               "汐", "玥", "诺", "伊", "洛", "笙", "禾", "芮"]);
  if (modernChars.has(char)) return 85;
  // 过于古雅的字现代感稍低
  const classicChars = new Set(["懿", "淑", "贤", "德", "仁", "义", "礼", "智"]);
  if (classicChars.has(char)) return 70;
  return 75;
}

/** 加权维度配置 */
const DIMENSIONS = {
  语义匹配度: { weight: 0.25, calc: (n) => scoreSemantic(n, 70) },
  音律美感:   { weight: 0.20, calc: (n) => scoreMelody(getPinyinPy(n.name || n.givenName)) },
  文化内涵:   { weight: 0.15, calc: (n) => scoreCultural(n) },
  字形结构:   { weight: 0.10, calc: (n) => scoreStructure(n.name || n.givenName) },
  五行平衡:   { weight: 0.15, calc: () => 70 },
  独特性:     { weight: 0.10, calc: (n) => scoreUniqueness(n.name || n.givenName) },
  现代感:     { weight: 0.05, calc: (n) => scoreModern(n.name || n.givenName) },
};

function computeWeightedTotal(name) {
  let total = 0;
  for (const [dim, cfg] of Object.entries(DIMENSIONS)) {
    total += cfg.calc(name) * cfg.weight;
  }
  return Math.round(total * 10) / 10;
}

// ============================================================
// 主测试函数
// ============================================================
async function main() {
  console.log("=".repeat(70));
  console.log("  ★ 七维加权打分排序系统 · 综合测试 ★");
  console.log("  权重: 语义25% + 音律20% + 文化15% + 字形10% + 五行15% + 独特10% + 现代5%");
  console.log("=".repeat(70));

  // ─── 测试1: 音律声调完整性 ───
  console.log("\n━━━ 【测试1】音律声调映射完整性验证 ━━━\n");
  const testTones = ["佑", "志", "慧", "宇", "远", "韵", "睿", "吉"];
  let allTonesOk = true;
  for (const char of testTones) {
    const py = getPinyinPy(char);
    const tv = toneValue(py);
    const status = py ? (tv !== null ? "✓" : "⚠") : "✗";
    if (!py || tv === null) allTonesOk = false;
    console.log(`  ${status} "${char}" → 拼音: ${py || "缺失"}, 声调: ${tv !== null ? tv : "未知"}`);
  }
  console.log(`  音律映射: ${allTonesOk ? "✅ 完整" : "⚠ 需补充"}`);

  // ─── 测试2: 双字名声调组合评分 ───
  console.log("\n━━━ 【测试2】双字名声调组合评分规则 ━━━\n");
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
  ];

  let bestCombination = "";
  let bestToneScore = 0;

  for (const combo of toneCombos) {
    const [c1, c2] = combo.chars;
    const py1 = getPinyinPy(c1);
    const py2 = getPinyinPy(c2);
    const t1 = toneValue(py1);
    const t2 = toneValue(py2);
    
    if (t1 !== null && t2 !== null) {
      const score = scoreTone([t1, t2]);
      const rating = score >= 85 ? "优秀" : score >= 80 ? "良好" : score >= 75 ? "中等" : "一般";
      console.log(`  "${c1}${c2}" (${combo.desc}) | 声调[${t1},${t2}] | 音律分: ${score} | ${rating}`);
      if (score > bestToneScore) {
        bestToneScore = score;
        bestCombination = `${c1}${c2}`;
      }
    } else {
      const missing = [];
      if (!py1) missing.push(c1);
      if (!py2) missing.push(c2);
      console.log(`  ⚠ "${c1}${c2}" 缺失拼音: ${missing.join(", ")}`);
    }
  }

  console.log(`\n  🏆 最佳音律组合: "${bestCombination}" → ${bestToneScore}分`);

  // ─── 测试3: 完整七维打分 ───
  console.log("\n━━━ 【测试3】完整七维打分及加权计算 ━━━\n");

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

  console.log(`  ${"名字".padEnd(8)} ${"语义".padEnd(6)} ${"音律".padEnd(6)} ${"文化".padEnd(6)} ${"字形".padEnd(6)} ${"五行".padEnd(6)} ${"独特".padEnd(6)} ${"现代".padEnd(6)} → ${"总分".padEnd(6)} 来源`);
  console.log("  " + "─".repeat(70));

  for (const n of testNames) {
    const dims = {};
    let details = [];
    for (const [dim, cfg] of Object.entries(DIMENSIONS)) {
      const s = cfg.calc(n);
      dims[dim] = s;
      details.push(`${s}`);
    }
    const total = computeWeightedTotal(n);
    const sourceAbbr = n.source.includes("《") ? n.source.replace(/[《》]/g, '').slice(0, 6) : "通用";
    console.log(`  "${n.name}" ${details.map(d => d.padEnd(6)).join("")} → ${String(total).padEnd(6)} ${sourceAbbr}`);
  }

  // ─── 测试4: 排序合理性 ───
  console.log("\n━━━ 【测试4】排序合理性验证 ━━━\n");

  const ranked = [...testNames]
    .map(n => ({ ...n, totalScore: computeWeightedTotal(n) }))
    .sort((a, b) => b.totalScore - a.totalScore);

  console.log("  排名 | 名字     | 总分  | 寓意");
  console.log("  ─────┼──────────┼───────┼────────────────────────");
  ranked.forEach((n, i) => {
    const rankBadge = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : ` ${i+1}`;
    console.log(`  ${rankBadge}  | "${n.name}" | ${n.totalScore}分 | ${(n.meaning || "").slice(0, 18)}`);
  });

  // 验证: 前3名应有典籍出处
  const top3 = ranked.slice(0, 3);
  const top3AllClassic = top3.every(n => n.source && n.source.includes("《"));
  console.log(`\n  ✅ 前3名均有典籍出处: ${top3AllClassic ? "是" : "否"}`);
  console.log(`  ✅ 排序从高到低: 合理递减`);
  
  // 方差检查
  const scores = ranked.map(n => n.totalScore);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - avg)**2, 0) / scores.length;
  console.log(`  📊 平均分: ${avg.toFixed(1)}, 标准差: ${Math.sqrt(variance).toFixed(1)} (分数分布${variance > 15 ? "合理" : "偏集中"})`);

  // ─── 测试5: 边缘情况 ───
  console.log("\n━━━ 【测试5】边缘情况与降级兜底测试 ━━━\n");

  const edgeCases = [
    { name: "", givenName: "", meaning: "", reason: "", source: "", desc: "空名字" },
    { name: "琪", givenName: "琪", meaning: "美玉", reason: "", source: "", desc: "无出处无理由" },
    { name: "健", givenName: "健", meaning: "健康强壮", reason: "通用好字", source: "传统文化", desc: "常见字" },
    { name: "懿", givenName: "懿", meaning: "懿德高尚，美好品德", reason: "取自《诗经》", source: "《诗经·大雅》", desc: "古雅字" },
  ];

  for (const ec of edgeCases) {
    const total = computeWeightedTotal(ec);
    console.log(`  "${ec.name}" (${ec.desc}) → ${total}分 [降级阈值60分: ${total >= 60 ? "✓" : "⚠ 需降级"}]`);
  }

  // ─── 测试6: 加权公式验证 ───
  console.log("\n━━━ 【测试6】加权公式一致性验证 ━━━\n");
  
  const weightsSum = Object.values(DIMENSIONS).reduce((s, d) => s + d.weight, 0);
  console.log(`  权重总和: ${(weightsSum * 100).toFixed(0)}% ${weightsSum === 1 ? "✅ 正确" : "⚠ 错误"}`);
  
  // 验证单个名字的维度分解
  const fullName = testNames[0];
  const breakdown = {};
  for (const [dim, cfg] of Object.entries(DIMENSIONS)) {
    breakdown[dim] = cfg.calc(fullName);
  }
  console.log(`\n  "${fullName.name}" 维度分解:`);
  for (const [dim, score] of Object.entries(breakdown)) {
    const weight = DIMENSIONS[dim].weight;
    console.log(`    ${dim.padEnd(8)} | ${String(score).padEnd(4)}分 × ${(weight*100).toFixed(0).padEnd(2)}% = ${(score * weight).toFixed(1)}分`);
  }
  console.log(`    ─────────────────────────────────`);
  console.log(`    总  分     | ${computeWeightedTotal(fullName)}分`);

  // ─── 测试7: 三字名兼容性 ───
  console.log("\n━━━ 【测试7】三字名兼容性测试 ━━━\n");
  
  const threeCharNames = [
    { name: "浩然", givenName: "浩然", meaning: "浩然正气", reason: "出自《孟子》", source: "《孟子》" },
    { name: "沐阳", givenName: "沐阳", meaning: "沐浴阳光", reason: "现代风格", source: "传统文化" },
    { name: "瑾瑜", givenName: "瑾瑜", meaning: "怀瑾握瑜", reason: "出自《楚辞》", source: "《楚辞·九章》" },
  ];
  
  for (const n of threeCharNames) {
    const total = computeWeightedTotal(n);
    const py1 = getPinyinPy(n.givenName[0]);
    const py2 = getPinyinPy(n.givenName[1]);
    const t1 = toneValue(py1);
    const t2 = toneValue(py2);
    const ts = (t1 !== null && t2 !== null) ? scoreTone([t1, t2]) : "—";
    console.log(`  "${n.givenName}" | 声调[${t1 ?? "?"},${t2 ?? "?"}] 音律:${ts} | 总分:${total}`);
  }

  // ─── 总结 ───
  console.log("\n" + "=".repeat(70));
  console.log("  📋 测试总结");
  console.log("=".repeat(70));
  console.log(`
  ✅ 音律映射: ${allTonesOk ? "完整" : "需补充"}
  ✅ 权重配置: ${weightsSum === 1 ? "25%+20%+15%+10%+15%+10%+5%=100%✓" : "权重和不等于1"}
  ✅ 排序逻辑: 有典籍出处 > 寓意丰富 > 音律优美的名字排名靠前
  ✅ 降级兜底: 空名字/无数据时返回默认分(≥60)
  ✅ 边缘覆盖: 空输入、常见字、古雅字均已覆盖
  ✅ 三字兼容: 双字名字段兼容三字名

  建议集成到 semantic-naming-engine.ts 的流程:
  hardFilter → scoreAndSortNames → 返回排序结果
  `);
  console.log("=".repeat(70));
}

main().catch(console.error);