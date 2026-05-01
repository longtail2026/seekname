/**
 * V4.1 发音匹配引擎测试脚本
 * 
 * 测试用例：
 * 1. 原Bug用例：徐小燕 → Diana/Diane（应得分很低）
 * 2. 理想匹配：张国光 → Gordon（应得分较高）
 * 3. 其他典型测试
 */

const { matchPronunciation, getChineseNamePinyin } = require('./src/lib/ename-phonetic');

function testMatch(description, chinesePinyin, englishName) {
  const result = matchPronunciation(chinesePinyin, englishName);
  const status = result.score >= 0.25 ? '✅ PASS (高匹配)' : result.score >= 0.1 ? '⚠️ 弱匹配' : '❌ FAIL (低匹配)';
  console.log(`  ${status}: ${englishName} → 得分=${(result.score * 100).toFixed(1)} 级别=${result.matchedLevel}`);
  console.log(`    详情: ${result.detail.slice(0, 100)}`);
  return result;
}

function testSection(title) {
  console.log(`\n========================================`);
  console.log(`  ${title}`);
  console.log(`========================================`);
}

// ==========================================
// 测试 1: 原Bug - 徐小燕
// Diana/Diane/Jillian 应该得分很低（和xiao yan毫无关系）
// ==========================================
testSection('Bug用例：徐小燕 (xiao yan)');
console.log('[预期: Diana/Diane 等应与xiao yan无发音关联，得低分]');
testMatch('xiao yan vs Diana', 'xiao yan', 'Diana');
testMatch('xiao yan vs Diane', 'xiao yan', 'Diane');
testMatch('xiao yan vs Dione', 'xiao yan', 'Dione');
testMatch('xiao yan vs Fidelia', 'xiao yan', 'Fidelia');
testMatch('xiao yan vs Iris', 'xiao yan', 'Iris');
testMatch('xiao yan vs Jillian', 'xiao yan', 'Jillian');
testMatch('xiao yan vs White', 'xiao yan', 'White');

// 徐小燕应该匹配什么？xiao→Shaw/Show, yan→Ian/Yann
console.log('\n[预期: xiao yan 应该匹配 Shaw/Yann 等]');
testMatch('xiao yan vs Shaw', 'xiao yan', 'Shaw');
testMatch('xiao yan vs Yann', 'xiao yan', 'Yann');
testMatch('xiao yan vs Sharron', 'xiao yan', 'Sharron');
testMatch('xiao yan vs Shannon', 'xiao yan', 'Shannon');
testMatch('xiao yan vs Shawn', 'xiao yan', 'Shawn');
testMatch('xiao yan vs Sian', 'xiao yan', 'Sian');
testMatch('xiao yan vs Siena', 'xiao yan', 'Siena');

// ==========================================
// 测试 2: 张国光 (zhang guo guang / guo guang)
// Gordon 应该匹配，因为 gor≈guo, don≈guang
// ==========================================
testSection('理想用例：张国光 (guo guang)');
console.log('[预期: Gordon 应匹配 guo guang]');
testMatch('guo guang vs Gordon', 'guo guang', 'Gordon');
testMatch('guo guang vs Gordon', 'guo guang', 'Gordon');
testMatch('guo guang vs Geoffrey', 'guo guang', 'Geoffrey');
testMatch('guo guang vs Gustavo', 'guo guang', 'Gustavo');
testMatch('guo guang vs Gregory', 'guo guang', 'Gregory');
testMatch('guo guang vs Grover', 'guo guang', 'Grover');
testMatch('guo guang vs Gavin', 'guo guang', 'Gavin');

// ==========================================
// 测试 3: 单音节名
// ==========================================
testSection('单音节匹配测试');
console.log('[预期: 丽(li) 应该匹配 Lee/Leigh/Liam 等高]');
testMatch('li vs Lee', 'li', 'Lee');
testMatch('li vs Leigh', 'li', 'Leigh');
testMatch('li vs Lily', 'li', 'Lily');
testMatch('li vs Elijah', 'li', 'Elijah');

console.log('\n[预期: 静(ing/jing) 匹配相关]');
testMatch('jing vs Gene', 'jing', 'Gene');
testMatch('jing vs Ginger', 'jing', 'Ginger');
testMatch('jing vs Jing', 'jing', 'Jing');
testMatch('jing vs John', 'jing', 'John');
testMatch('jing vs King', 'jing', 'King');

console.log('\n[预期: 雪(xue) 匹配相关]');
testMatch('xue vs Sue', 'xue', 'Sue');
testMatch('xue vs Suki', 'xue', 'Suki');
testMatch('xue vs Susan', 'xue', 'Susan');

// ==========================================
// 测试 4: 多音节全名测试
// ==========================================
testSection('全名发音匹配测试');
console.log('[预期: 小燕(xiao yan) 好匹配应得分高，无关名应得分低]');
testMatch('xiao yan vs Sean', 'xiao yan', 'Sean');
testMatch('xiao yan vs Shawn', 'xiao yan', 'Shawn');
testMatch('xiao yan vs Janet', 'xiao yan', 'Janet');
testMatch('xiao yan vs Anna', 'xiao yan', 'Anna');
testMatch('xiao yan vs Daniel', 'xiao yan', 'Daniel');
testMatch('xiao yan vs Yannis', 'xiao yan', 'Yannis');

// ==========================================
// 测试 5: 原高得分但无意义的用例
// ==========================================
testSection('高假匹配用例（应得低分）');
console.log('[预期: 以下应与中文名无发音关联]');
testMatch('xiao yan vs Dickerson', 'xiao yan', 'Dickerson');
testMatch('xiao yan vs Dickson', 'xiao yan', 'Dickson');
testMatch('xiao yan vs Gibbs', 'xiao yan', 'Gibbs');
testMatch('xiao yan vs Giles', 'xiao yan', 'Giles');
testMatch('xiao yan vs Gillespie', 'xiao yan', 'Gillespie');
testMatch('xiao yan vs Childers', 'xiao yan', 'Childers');
testMatch('xiao yan vs Diamond', 'xiao yan', 'Diamond');
testMatch('xiao yan vs Dickens', 'xiao yan', 'Dickens');
testMatch('xiao yan vs Dickey', 'xiao yan', 'Dickey');
testMatch('xiao yan vs Dickinson', 'xiao yan', 'Dickinson');
testMatch('xiao yan vs Finney', 'xiao yan', 'Finney');
testMatch('xiao yan vs Friend', 'xiao yan', 'Friend');

// ==========================================
// 测试 6: 真实常见英文名 vs 中文名
// ==========================================
testSection('真实匹配场景');
// 玲(ling) → Lynn/Linda
console.log('\n[玲 (ling)]');
testMatch('ling vs Lynn', 'ling', 'Lynn');
testMatch('ling vs Linda', 'ling', 'Linda');
testMatch('ling vs Belinda', 'ling', 'Belinda');
testMatch('ling vs Ling', 'ling', 'Ling');

// 浩(hao) → Howard
console.log('\n[浩 (hao)]');
testMatch('hao vs Howard', 'hao', 'Howard');
testMatch('hao vs Hao', 'hao', 'Hao');
testMatch('hao vs Harlow', 'hao', 'Harlow');

// 芳(fang) → Fanny/Fangio
console.log('\n[芳 (fang)]');
testMatch('fang vs Fanny', 'fang', 'Fanny');
testMatch('fang vs Fang', 'fang', 'Fang');
testMatch('fang vs Stephanie', 'fang', 'Stephanie');

// 佳(jia) → Jia/Gia/Gianna
console.log('\n[佳 (jia)]');
testMatch('jia vs Jia', 'jia', 'Jia');
testMatch('jia vs Gia', 'jia', 'Gia');
testMatch('jia vs Gianna', 'jia', 'Gianna');
testMatch('jia vs Jasmine', 'jia', 'Jasmine');

// 雪婷(xue ting) → Sue Ting/Susanna
console.log('\n[雪婷 (xue ting)]');
testMatch('xue ting vs Tina', 'xue ting', 'Tina');
testMatch('xue ting vs Tinker', 'xue ting', 'Tinker');
testMatch('xue ting vs Justin', 'xue ting', 'Justin');

// ==========================================
// 测试 7: 边缘用例 - 检查否不会误判
// ==========================================
testSection('边缘用例（不应匹配的）');
// 错误匹配：yan ≠ Annie
console.log('\n[yan yan vs Annie - 不应高匹配]');
testMatch('yan yan vs Annie', 'yan yan', 'Annie');
testMatch('yan yan vs Anna', 'yan yan', 'Anna');
testMatch('yan yan vs Andie', 'yan yan', 'Andie');

// 错误匹配：ming ≠ Nina
console.log('\n[ming vs Nina - 不应高匹配]');
testMatch('ming vs Nina', 'ming', 'Nina');
testMatch('ming vs Mike', 'ming', 'Mike');

// ==========================================
// 概要
// ==========================================
console.log('\n========================================');
console.log('  V4.1 测试完成');
console.log('========================================');