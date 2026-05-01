/**
 * V4.2 发音匹配引擎测试脚本
 * 
 * 测试关键场景：
 * 1. "徐小燕"→ 不应该再返回 Diana/Diane 等不相关的名字
 * 2. "张国光"→ 应该能匹配 Gordon（guang≈gord, guo≈gord）
 * 3. 多音节零分惩罚验证
 */

const { matchPronunciation, getChineseNamePinyin, searchByPhoneticMatch } = require('./src/lib/ename-phonetic');
const { getAllRecords } = require('./src/lib/ename-dict');

// ===== 颜色输出辅助 =====
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${msg}`);
    passed++;
  } else {
    console.log(`  ${RED}✗${RESET} ${msg}`);
    failed++;
  }
}

function assertScore(pinyin, enName, expectedMin, expectedMax, msg) {
  const result = matchPronunciation(pinyin, enName);
  const pass = result.score >= expectedMin && result.score <= expectedMax;
  const status = pass ? GREEN : RED;
  console.log(`  ${status}${pass ? '✓' : '✗'}${RESET} "${pinyin}" vs "${enName}" => score=${(result.score * 100).toFixed(1)} [期望 ${(expectedMin*100).toFixed(0)}-${(expectedMax*100).toFixed(0)}] ${msg}`);
  if (pass) passed++; else failed++;
  // 打印详情帮助调试
  if (!pass) {
    console.log(`      详情: ${result.detail}`);
  }
}

// ===== 测试用例 =====

console.log(`\n${CYAN}══════════════════════════════════════════${RESET}`);
console.log(`${CYAN}  V4.2 发音匹配引擎测试                    ${RESET}`);
console.log(`${CYAN}══════════════════════════════════════════${RESET}`);

// ----- 1. 多音节零分惩罚 -----
console.log(`\n${YELLOW}[测试1] 多音节零分惩罚${RESET}`);
console.log(`  期望：有零分音节的应得极低分 (<0.3)`);

assertScore("xiao yan", "Diana", 0, 0.29,
  "xiao yan vs Diana: xiao无匹配，应严重惩罚");
assertScore("xiao yan", "Diane", 0, 0.29,
  "xiao yan vs Diane: 同上");
assertScore("xiao yan", "Dione", 0, 0.29,
  "xiao yan vs Dione: 同上");
assertScore("xiao yan", "Shaw", 0.3, 1.0,
  "xiao yan vs Shaw: shaw≈xiao 音近，应>=0.3");
assertScore("xiao yan", "Shane", 0.3, 1.0,
  "xiao yan vs Shane: shan≈yan, shaw≈xiao，应>=0.3");

// ----- 2. 韵母匹配要求 ≥3字符 -----
console.log(`\n${YELLOW}[测试2] 韵母匹配≥3字符要求${RESET}`);
console.log(`  期望：2字符韵母匹配不再有效`);

assertScore("dian", "Diana", 0.4, 1.0,
  "dian vs Diana: 'dia'在Diana中，韵母3字符匹配≥0.4");
assertScore("xian", "Diana", 0, 0.5,
  "xian vs Diana: 'ian'在Diana中，韵母3字符，但x拼合不自然，低分");
assertScore("yan", "Diana", 0.3, 1.0,
  "yan vs Diana: 'an'在Diana中，韵母2字符但完全匹配，应给分");
assertScore("xiao", "Diana", 0, 0.39,
  "xiao vs Diana: 'iao'只有2字符'ia'匹配（禁止2字符韵母匹配），应<0.4");

// ----- 3. 张国光 → Gordon -----
console.log(`\n${YELLOW}[测试3] 张国光 → Gordon${RESET}`);
console.log(`  期望：guang/guo→gord 映射有效`);

assertScore("guo guang", "Gordon", 0.5, 1.0,
  "guo guang vs Gordon: 两个音节都能映射到gord，应有高分");
assertScore("guo", "Gordon", 0.3, 1.0,
  "guo vs Gordon: 'gord'在Gordon中，映射匹配");
assertScore("guang", "Gordon", 0.3, 1.0,
  "guang vs Gordon: 'gord'在Gordon中，映射匹配");

// ----- 4. 单音节匹配 -----
console.log(`\n${YELLOW}[测试4] 单音节匹配${RESET}`);
console.log(`  期望：单音节匹配逻辑正确`);

assertScore("li", "Elia", 0.3, 1.0,
  "li vs Elia: 'li'在Elia中，完整拼音匹配");
assertScore("li", "Lily", 0.3, 1.0,
  "li vs Lily: 'li'在Lily中，完整拼音匹配");
assertScore("xu", "Sue", 0.3, 1.0,
  "xu vs Sue: xu→'su','sue'映射");
assertScore("xu", "Shu", 0.3, 1.0,
  "xu vs Shu: xu→'shu'映射");
assertScore("xu", "Xu", 1.0, 1.0,
  "xu vs Xu: 完整拼音匹配");

// ----- 5. 徐小燕 -----
console.log(`\n${YELLOW}[测试5] 徐小燕综合测试${RESET}`);
console.log(`  期望：Diana系列不得分，Shaw等应有分`);

// xiao yan 不应匹配 Diana/Diane/Dione
const pinyin = "xiao yan";
console.log(`  拼音: "${pinyin}"`);
const dianaScore = matchPronunciation(pinyin, "Diana").score;
const dianeScore = matchPronunciation(pinyin, "Diane").score;
const dioneScore = matchPronunciation(pinyin, "Dione").score;
const shawScore = matchPronunciation(pinyin, "Shaw").score;
const shaneScore = matchPronunciation(pinyin, "Shane").score;
const yanScore = matchPronunciation(pinyin, "Yan").score;

assert(dianaScore < 0.3, `Diana得分=${(dianaScore*100).toFixed(1)}，应<30`);
assert(dianeScore < 0.3, `Diane得分=${(dianeScore*100).toFixed(1)}，应<30`);
assert(dioneScore < 0.3, `Dione得分=${(dioneScore*100).toFixed(1)}，应<30`);
assert(shawScore >= 0.3, `Shaw得分=${(shawScore*100).toFixed(1)}，应>=30（xiao→shaw）`);
assert(yanScore >= 0.3, `Yan得分=${(yanScore*100).toFixed(1)}，应>=30（yan→yan）`);

// ----- 6. searchByPhoneticMatch 验证 -----
console.log(`\n${YELLOW}[测试6] searchByPhoneticMatch 完整流程${RESET}`);
console.log(`  对"xiao yan"搜索，Diana不应出现在高分段`);

const allRecords = getAllRecords();
const testNames = allRecords.map(r => ({ name: r.name, meaning: r.meaning, gender: r.gender }));

// 只取前500个快速测试
const results = searchByPhoneticMatch("xiao yan", testNames.slice(0, 500), 20);
const topNames = results.slice(0, 10).map(r => `${r.name}(${r.phoneticScore})`).join(', ');
console.log(`  前10名: ${topNames}`);

// 检查Diana是否出现在前20
const dianaInTop = results.slice(0, 20).some(r => r.name === "Diana");
const dianeInTop = results.slice(0, 20).some(r => r.name === "Diane");
const dioneInTop = results.slice(0, 20).some(r => r.name === "Dione");

assert(!dianaInTop, `Diana在前20名中？ ${dianaInTop ? '是(✗)' : '否(✓)'}`);
assert(!dianeInTop, `Diane在前20名中？ ${dianeInTop ? '是(✗)' : '否(✓)'}`);
assert(!dioneInTop, `Dione在前20名中？ ${dioneInTop ? '是(✗)' : '否(✓)'}`);

// ----- 7. 'guo guang' 在完整名称列表中的表现 -----
console.log(`\n${YELLOW}[测试7] "guo guang" (张国光) 完整搜索${RESET}`);
const ggResults = searchByPhoneticMatch("guo guang", testNames, 20);
const ggTop = ggResults.slice(0, 10).map(r => `${r.name}(${r.phoneticScore})`).join(', ');
console.log(`  前10名: ${ggTop}`);

// Gordon 应在列表中
const gordonFound = ggResults.some(r => r.name === "Gordon");
assert(gordonFound, `Gordon在结果中？ ${gordonFound ? '是(✓)' : '否(✗)'}`);

// ===== 总结 =====
console.log(`\n${CYAN}══════════════════════════════════════════${RESET}`);
const total = passed + failed;
const pct = total > 0 ? Math.round(passed / total * 100) : 0;
if (failed === 0) {
  console.log(`${GREEN} 全部通过!${RESET} ${passed}/${passed} 通过`);
} else {
  console.log(`  ${RED}${failed} 失败${RESET}, ${GREEN}${passed} 通过${RESET} (${pct}%)`);
}
console.log(`${CYAN}══════════════════════════════════════════${RESET}\n`);