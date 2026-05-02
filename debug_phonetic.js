/**
 * 调试脚本：分析"mao yong"与各英文名的匹配得分
 */
const { universalMatch } = require('./src/lib/ename-phonetic.ts');

// 李茂勇 = 李(Li) + 茂(mao) + 勇(yong)
const givenNamePinyin = 'mao yong';

// 用户页面上显示的推荐结果
const testCases = [
  'Early', 'Johnson', 'Eaton', 'Joel', 'Morton', 'Mason', 'Moyer',
  // 期望能匹配到的名字（发音相近）
  'Morton',  // maoyong → mor-ton → m+ao+y+ong ≈ m+or+t+on
  'Moyer',   // maoyong → moy-er
  'Morris',  // maoyong → mor-ris
  'Milton',  // maoyong → mil-ton (不够接近但试试)
  'Martin',  // ma-yong → mar-tin
];

console.log('=== 测试 "mao yong" 发音匹配 ===\n');

for (const name of testCases) {
  const result = universalMatch(givenNamePinyin, name);
  console.log(`${name.padEnd(12)} 得分:${String(result.score).padStart(3)} 详情:${result.detail}`);
}

console.log('\n=== 详细音节分解与匹配 ===\n');

// 手动分析每个音节的匹配
const { parsePinyin, parseEnglishSyllable, areInitialsSimilar, areFinalsSimilar } = require('./src/lib/ename-phonetic.ts');

const chSyl1 = 'mao';
const chSyl2 = 'yong';

console.log('中文拼音分解:');
console.log(`   ${chSyl1} → initial=${parsePinyin(chSyl1).initial}, final=${parsePinyin(chSyl1).final}`);
console.log(`   ${chSyl2} → initial=${parsePinyin(chSyl2).initial}, final=${parsePinyin(chSyl2).final}`);

const enNames = ['Ear', 'ly', 'John', 'son', 'Ea', 'ton', 'Jo', 'el', 'Mor', 'ton', 'Ma', 'son', 'Moy', 'er', 'Mor', 'ris', 'Mil', 'ton', 'Mar', 'tin'];
console.log('\n单音节交叉匹配:');
for (const chSyl of [chSyl1, chSyl2]) {
  for (const enSyl of enNames) {
    const { scoreSingleSyllable } = require('./src/lib/ename-phonetic.ts');
    const s = scoreSingleSyllable(chSyl, enSyl);
    if (s > 0) {
      console.log(`   ${chSyl} vs ${enSyl.padEnd(6)} → 得分=${s}`);
    }
  }
}