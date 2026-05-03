/**
 * 发音结构匹配算法 v2.5 - 验证测试脚本
 * 
 * 测试重点：
 * 1. Gordon → Gor-don 切分正确
 * 2. Cheung → Cheung 单音节整体
 * 3. guoguang → Gordon 排名第一
 * 4. zhang → Cheung 排名靠前
 */
import {
  splitEnglishIntoSyllables,
  parsePinyinSyllables,
  buildStructureFromPinyin,
  matchStructures,
  matchPinyinToEnglishName,
  sortByStructureMatch,
  testStructureMatch,
} from './src/lib/ename-phonetic-structure';

function main() {
  console.log('============================================================');
  console.log('  发音结构匹配算法 v2.5 - 验证测试');
  console.log('============================================================\n');

  // 1. 英文音节切分测试（V2.5 核心改进）
  console.log('【1】英文音节切分测试（V2.5 核心改进）:\n');
  const enTestCases: Record<string, string[]> = {
    'Gordon':     ['Gor', 'don'],
    'Glover':     ['Glo', 'ver'],
    'Galloway':   ['Ga', 'llo', 'way'],
    'Garrison':   ['Ga', 'rri', 'son'],
    'Gaylord':    ['Gay', 'lord'],
    'Gideon':     ['Gid', 'e', 'on'],
    'George':     ['George'],
    'Gavin':      ['Ga', 'vin'],
    'Gareth':     ['Ga', 'reth'],
    'Glenn':      ['Glenn'],
    'Gilbert':    ['Gil', 'bert'],
    'Gustav':     ['Gus', 'tav'],
    'Gonzalo':    ['Gon', 'za', 'lo'],
    'Cheung':     ['Cheung'],
    'Zhang':      ['Zhang'],
    'Chang':      ['Chang'],
    'Chong':      ['Chong'],
    'Chow':       ['Chow'],
    'Cho':        ['Cho'],
    'Simon':      ['Si', 'mon'],
    'Simeon':     ['Sim', 'e', 'on'],
    'Shane':      ['Shane'],
    'Samuel':     ['Sam', 'u', 'el'],
    'Wayne':      ['Wayne'],
    'Lee':        ['Lee'],
    'Liam':       ['Li', 'am'],
    'Johnson':    ['John', 'son'],
    'Wade':       ['Wade'],
    'Geoffrey':   ['Geof', 'frey'],
    'Gabriel':    ['Ga', 'bri', 'el'],
  };

  let allPass = true;
  for (const [name, expected] of Object.entries(enTestCases)) {
    const syllables = splitEnglishIntoSyllables(name);
    const got = syllables.map(s => s.full);
    const passed = JSON.stringify(got) === JSON.stringify(expected);
    if (!passed) allPass = false;
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${name} → [${got.join(', ')}] ${passed ? '' : `(期望: [${expected.join(', ')}])`}`);
  }
  console.log(`\n  总体: ${allPass ? '✅ 全部通过' : '❌ 有失败'}\n`);

  // 2. 核心匹配测试
  console.log('【2】核心匹配测试:\n');
  
  // 关键测试：guoguang → Gordon 应该是最高分
  const keyCases = [
    ['guoguang', 'Gordon',   '应≥75（韵母: uo+or, ang+don → 高相似）'],
    ['guoguang', 'Glover',   '应<75（韵母: uo vs o, ang vs er → 中低）'],
    ['guoguang', 'Gustav',   '应<70（韵母: uo vs u, ang vs a → 偏低）'],
    ['guoguang', 'Gavin',    '应<60（韵母: uo vs a, ang vs i → 低）'],
    ['guoguang', 'Gareth',   '应<60'],
    ['zhang',    'Cheung',   '应≥60（粤语拼音→英文匹配）'],
    ['zhang',    'Zhang',    '应≥80（完全匹配）'],
    ['zhang',    'Chang',    '应≥70（zh→ch近似）'],
    ['zhang',    'Chong',    '应<60'],
    ['xiaoming', 'Simon',    '应≥60'],
    ['xiaoming', 'Shane',    '应<60（单音节名不匹配双音节）'],
    ['wei',      'Wayne',    '应≥60'],
    ['li',       'Lee',      '应≥60'],
    ['zhangsan', 'Johnson',  '应≥50'],
  ];

  for (const [pinyin, name, comment] of keyCases) {
    const result = matchPinyinToEnglishName(pinyin, name);
    console.log(`  ${pinyin} → ${name}: ${result.score}分 (${comment})`);
    result.details.slice(0, 2).forEach(d => console.log(`    ${d}`));
    console.log('');
  }

  // 3. 排序测试
  console.log('【3】排序测试:\n');

  console.log('  guoguang 匹配排序 (期望 Gordon 第1):');
  const candidates = [
    'Gordon', 'Glover', 'Galloway', 'Garrison', 'Gaylord',
    'Geoffrey', 'George', 'Gavin', 'Gareth', 'Gideon',
    'Gilbert', 'Glenn', 'Gabriel', 'Gustav', 'Gonzalo'
  ];
  const sorted = sortByStructureMatch('guoguang', candidates);
  sorted.forEach((s, i) => {
    const icon = s.name === 'Gordon' ? '⭐' : s.score >= 70 ? '✅' : s.score >= 50 ? '⚠️' : '❌';
    console.log(`  ${i + 1}. ${icon} ${s.name}: ${s.score}分`);
  });

  console.log('\n  zhang 匹配排序 (期望 Cheung 或 Zhang 第1):');
  const surnameCandidates = ['Cheung', 'Zhang', 'Chang', 'Chong', 'Chow', 'Cho', 'Johnson', 'Chung'];
  const surnameSorted = sortByStructureMatch('zhang', surnameCandidates);
  surnameSorted.forEach((s, i) => {
    const icon = (s.name === 'Cheung' || s.name === 'Zhang') && i < 2 ? '⭐' : s.score >= 70 ? '✅' : s.score >= 50 ? '⚠️' : '❌';
    console.log(`  ${i + 1}. ${icon} ${s.name}: ${s.score}分`);
  });

  console.log('\n  xiaoming 匹配排序 (期望 Simon 第1):');
  const mingCandidates = ['Simon', 'Simeon', 'Samuel', 'Silas', 'Shawn', 'Shane', 'Scott', 'Seymour'];
  const mingSorted = sortByStructureMatch('xiaoming', mingCandidates);
  mingSorted.forEach((s, i) => {
    const icon = s.name === 'Simon' && i === 0 ? '⭐' : s.score >= 50 ? '⚠️' : '❌';
    console.log(`  ${i + 1}. ${icon} ${s.name}: ${s.score}分`);
  });

  // 4. 全名组合测试
  console.log('\n【4】全名组合: 张国光(zhang + guoguang)');
  console.log('  使用姓氏: Cheung, Zhang, Chang (来自ename-surname-map)');
  console.log('  期望: Gordon Cheung / Gordon Zhang 排名最好\n');
  
  const surnames = ['Cheung', 'Zhang', 'Chang', 'Chong'];
  const givenCandidates = ['Gordon', 'Glover', 'Gustav', 'Gavin', 'Gareth', 'Gaylord', 'Gilbert', 'Garrison'];
  
  interface FullNameResult {
    full: string;
    surnameScore: number;
    givenScore: number;
    combined: number;
  }
  
  const results: FullNameResult[] = [];
  for (const s of surnames) {
    const sr = matchPinyinToEnglishName('zhang', s);
    for (const g of givenCandidates) {
      const gr = matchPinyinToEnglishName('guoguang', g);
      const combined = sr.score * 0.35 + gr.score * 0.65;
      results.push({
        full: `${g} ${s}`,
        surnameScore: sr.score,
        givenScore: gr.score,
        combined: Math.round(combined * 10) / 10,
      });
    }
  }
  
  results.sort((a, b) => b.combined - a.combined);
  console.log('  排名  姓名               姓氏分  名字分  综合分');
  console.log('  -------------------------------------------------------');
  results.slice(0, 15).forEach((r, i) => {
    const marker = r.full.includes('Gordon') ? '⭐' : '';
    console.log(`  ${(i + 1).toString().padStart(2)}. ${marker} ${r.full.padEnd(18)} ${r.surnameScore.toString().padStart(4)}  ${r.givenScore.toString().padStart(6)}  ${r.combined.toString().padStart(6)}`);
  });

  console.log('\n========================================');
  console.log('  测试完成!');
  console.log('========================================');
}
main();
