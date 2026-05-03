/**
 * 发音结构匹配算法 v2.0 - 验证测试
 * 
 * 测试目标：
 * 1. guoguang → Gordon (高分≥80)
 * 2. zhang → Cheung (高分）
 * 3. xiaoming → Simon (高分)
 * 全名 "张国光" → "Gordon Cheung" 排名第一
 */
import {
  parsePinyinSyllables,
  splitEnglishIntoSyllables,
  buildStructureFromPinyin,
  matchPinyinToEnglishName,
  sortByStructureMatch,
  testStructureMatch,
} from './src/lib/ename-phonetic-structure';

console.log('='.repeat(60));
console.log('  发音结构匹配算法 v2.0 - 验证测试');
console.log('='.repeat(60));

// 1. 运行内置测试
console.log('\n【1】运行内置测试函数...');
// testStructureMatch('guoguang', 'Gordon');

// 2. 拼音解析详细测试
console.log('\n【2】拼音解析测试:');
const testPinyins = [
  'zhang', 'guoguang', 'zhangsan', 'xiaoming', 
  'li', 'wei', 'taoqiang', 'guoping',
  'zhangguoguang', 'lisi', 'wangwu', 'zhaoliang'
];
for (const p of testPinyins) {
  const s = buildStructureFromPinyin(p);
  console.log(`   ${p} → ${s.syllableCount}音节: initials=[${s.initials.join(',')}] finals=[${s.finals.join(',')}] endings=[${s.endings.join(',')}]`);
}

// 3. 英文名音节切分测试
console.log('\n【3】英文名音节切分测试:');
const testNames = [
  'Gordon', 'Gideon', 'Glover', 'George', 'Gavin', 
  'Galloway', 'Gaylord', 'Garrison', 'Gustav', 'Gonzalo',
  'Simon', 'Johnson', 'Cheung', 'Wayne', 'Lee', 'Liam',
  'Gabriel', 'Gilbert', 'Glenn', 'Gareth', 'Geoffrey'
];
for (const n of testNames) {
  const syls = splitEnglishIntoSyllables(n);
  console.log(`   ${n.padEnd(12)} → ${syls.length}音节: ${syls.map(s => s.full).join('-')} [${syls.map(s => `${s.onset}${s.nucleus}(${s.coda || ''})`).join(', ')}]`);
}

// 4. 核心测试: guoguang → Gordon
console.log('\n【4】核心匹配测试:');
const coreTests = [
  // 目标: guoguang 应该匹配 Gordon
  { pinyin: 'guoguang', targets: ['Gordon', 'Glover', 'Galloway', 'Garrison', 'Gaylord', 'Gideon', 'George'] },
  // 目标: zhang 应该匹配 Cheung
  { pinyin: 'zhang', targets: ['Cheung', 'Zhang', 'Chang', 'Chong', 'Chow', 'Cho', 'Johnson'] },
  // 目标: wei 应该匹配 Wayne
  { pinyin: 'wei', targets: ['Wayne', 'Wade', 'Wei', 'Wilson', 'William', 'Walter'] },
  // 目标: li 应该匹配 Lee
  { pinyin: 'li', targets: ['Lee', 'Liam', 'Leo', 'Leigh', 'Levi', 'Lewis'] },
  // 目标: xiaoming 应该匹配 Simon
  { pinyin: 'xiaoming', targets: ['Simon', 'Simeon', 'Samuel', 'Silas', 'Shawn', 'Shane', 'Seymour'] },
];

for (const test of coreTests) {
  console.log(`\n  === ${test.pinyin} 匹配排序 ===`);
  const sorted = sortByStructureMatch(test.pinyin, test.targets);
  sorted.forEach((s, i) => {
    const icon = s.score >= 70 ? '✅' : s.score >= 50 ? '⚠️' : '❌';
    console.log(`  ${i + 1}. ${icon} ${s.name.padEnd(12)} ${s.score}分`);
  });
}

// 5. 全名组合匹配: 张国光
console.log('\n【5】全名组合匹配: 张国光(zhang+guoguang)');
console.log('    计算逻辑: 总得分 = zhang姓氏匹配分×0.35 + guoguang名字匹配分×0.65');
console.log('');

const surnames = ['Cheung', 'Zhang', 'Chang', 'Chong', 'Chow', 'Cho'];
const givenNames = [
  'Gordon', 'Glover', 'Galloway', 'Garrison', 'Gaylord',
  'Gideon', 'George', 'Gavin', 'Gilbert', 'Glenn',
  'Gareth', 'Gabriel', 'Gustav', 'Gonzalo', 'Geoffrey'
];

interface NameCombo {
  full: string;
  surname: string;
  givenName: string;
  surnameScore: number;
  givenScore: number;
  totalScore: number;
}

const allCombos: NameCombo[] = [];
for (const sn of surnames) {
  for (const gn of givenNames) {
    const zhScore = matchPinyinToEnglishName('zhang', sn).score;
    const ggScore = matchPinyinToEnglishName('guoguang', gn).score;
    const total = zhScore * 0.35 + ggScore * 0.65;
    allCombos.push({
      full: `${gn} ${sn}`,
      surname: sn,
      givenName: gn,
      surnameScore: zhScore,
      givenScore: ggScore,
      totalScore: Math.round(total * 10) / 10,
    });
  }
}

allCombos.sort((a, b) => b.totalScore - a.totalScore);

console.log('  排名  姓名                  姓氏分   名字分   综合分');
console.log('  ' + '-'.repeat(55));
allCombos.slice(0, 12).forEach((c, i) => {
  const isTarget = c.surname === 'Cheung' && c.givenName === 'Gordon';
  const marker = isTarget ? '🎯' : '   ';
  console.log(`  ${String(i + 1).padStart(2)}. ${marker} ${c.full.padEnd(22)} ${String(c.surnameScore).padStart(4)}  ${String(c.givenScore).padStart(4)}  ${c.totalScore.toFixed(1)}`);
});

console.log('');
console.log('  → 目标结果: Gordon Cheung 应该排名第一!');
console.log('  → 如果 Cheung 不在前列，需要检查 ename-surname-map.ts');
console.log('  → 如果 Gordon 不在前列，说明算法还需调整');

// 6. 额外: 验证其他中文名
console.log('\n【6】更多中文名测试:');
const moreTests: Array<{ chinese: string; pinyin: string; expectedEn: string }> = [
  { chinese: '李小明', pinyin: 'lixiaoming', expectedEn: 'Simon Lee' },
  { chinese: '王伟', pinyin: 'wangwei', expectedEn: 'Wayne Wang' },
  { chinese: '张强', pinyin: 'zhangqiang', expectedEn: 'Johnson Chang' },
];

for (const test of moreTests) {
  console.log(`\n  ${test.chinese} (${test.pinyin}) → 预期: ${test.expectedEn}`);
  
  // 解析全名拼音
  const parsed = parsePinyinSyllables(test.pinyin);
  const sylCount = parsed.length;
  console.log(`  音节解析: ${parsed.map(s => `${s.initial}${s.final}`).join(' ')} → ${sylCount}音节`);
  
  // 测试匹配目标
  if (test.chinese === '李小明') {
    const res1 = matchPinyinToEnglishName('li', 'Lee');
    const res2 = matchPinyinToEnglishName('xiaoming', 'Simon');
    console.log(`  li → Lee: ${res1.score}分 (预期≥80)`);
    console.log(`  xiaoming → Simon: ${res2.score}分 (预期≥60)`);
    console.log(`  综合: ${Math.round(res1.score * 0.35 + res2.score * 0.65)}分`);
  }
}

console.log('\n========================================');
console.log('  测试完成!');
console.log('========================================');