/**
 * 万能匹配法 V5.5 测试脚本
 * 
 * 测试用例覆盖用户指南中所有示例：
 *   男生：涛、明、杰、凯、林、强、伟、磊
 *   女生：芳、丽、敏、佳、婷、雪、静、娜
 *   姓氏组合：张伟、李芳、王敏
 */
const { 
  universalMatch, 
  quickInitialMatch, 
  getSuggestedNamesByInitial,
  INITIAL_SUGGESTED_NAMES,
  FINAL_TO_EN_SUBSTRINGS,
  INITIAL_TO_EN_LETTERS,
  extractInitial,
  extractFinal
} = require('./src/lib/ename-phonetic.ts');

// ===== 测试用例 =====
const testCases = [
  // 男生
  { chinese: 'tao', en: 'Tom', expected: true, desc: '涛→Tom' },
  { chinese: 'tao', en: 'Tony', expected: true, desc: '涛→Tony' },
  { chinese: 'tao', en: 'Todd', expected: true, desc: '涛→Todd' },
  { chinese: 'ming', en: 'Max', expected: true, desc: '明→Max' },
  { chinese: 'ming', en: 'Mike', expected: true, desc: '明→Mike' },
  { chinese: 'ming', en: 'Martin', expected: true, desc: '明→Martin' },
  { chinese: 'jie', en: 'Jay', expected: true, desc: '杰→Jay' },
  { chinese: 'jie', en: 'Jack', expected: true, desc: '杰→Jack' },
  { chinese: 'jie', en: 'Jason', expected: true, desc: '杰→Jason' },
  { chinese: 'kai', en: 'Ken', expected: true, desc: '凯→Ken' },
  { chinese: 'kai', en: 'Kevin', expected: true, desc: '凯→Kevin' },
  { chinese: 'kai', en: 'Kyle', expected: true, desc: '凯→Kyle' },
  { chinese: 'lin', en: 'Leon', expected: true, desc: '林→Leon' },
  { chinese: 'lin', en: 'Leo', expected: true, desc: '林→Leo' },
  { chinese: 'lin', en: 'Lynn', expected: true, desc: '林→Lynn' },
  { chinese: 'qiang', en: 'John', expected: true, desc: '强→John' },
  { chinese: 'qiang', en: 'Jon', expected: true, desc: '强→Jon' },
  { chinese: 'qiang', en: 'Johnny', expected: true, desc: '强→Johnny' },
  { chinese: 'wei', en: 'William', expected: true, desc: '伟→William' },
  { chinese: 'wei', en: 'Will', expected: true, desc: '伟→Will' },
  { chinese: 'wei', en: 'Wayne', expected: true, desc: '伟→Wayne' },
  { chinese: 'lei', en: 'Ray', expected: true, desc: '磊→Ray' },
  { chinese: 'lei', en: 'Roy', expected: true, desc: '磊→Roy' },
  { chinese: 'lei', en: 'Rex', expected: true, desc: '磊→Rex' },
  // 女生
  { chinese: 'fang', en: 'Flora', expected: true, desc: '芳→Flora' },
  { chinese: 'fang', en: 'Fiona', expected: true, desc: '芳→Fiona' },
  { chinese: 'fang', en: 'Fanny', expected: true, desc: '芳→Fanny' },
  { chinese: 'li', en: 'Lily', expected: true, desc: '丽→Lily' },
  { chinese: 'li', en: 'Lisa', expected: true, desc: '丽→Lisa' },
  { chinese: 'li', en: 'Linda', expected: true, desc: '丽→Linda' },
  { chinese: 'min', en: 'Mina', expected: true, desc: '敏→Mina' },
  { chinese: 'min', en: 'Mindy', expected: true, desc: '敏→Mindy' },
  { chinese: 'min', en: 'Minnie', expected: true, desc: '敏→Minnie' },
  { chinese: 'jia', en: 'Jane', expected: true, desc: '佳→Jane' },
  { chinese: 'jia', en: 'Jenny', expected: true, desc: '佳→Jenny' },
  { chinese: 'jia', en: 'Jessica', expected: true, desc: '佳→Jessica' },
  { chinese: 'ting', en: 'Tina', expected: true, desc: '婷→Tina' },
  { chinese: 'ting', en: 'Tiffany', expected: true, desc: '婷→Tiffany' },
  { chinese: 'ting', en: 'Teresa', expected: true, desc: '婷→Teresa' },
  { chinese: 'xue', en: 'Sharon', expected: true, desc: '雪→Sharon' },
  { chinese: 'xue', en: 'Sherry', expected: true, desc: '雪→Sherry' },
  { chinese: 'xue', en: 'Sarah', expected: true, desc: '雪→Sarah' },
  { chinese: 'jing', en: 'Jean', expected: true, desc: '静→Jean' },
  { chinese: 'jing', en: 'Jane', expected: true, desc: '静→Jane' },
  { chinese: 'jing', en: 'Jenny', expected: true, desc: '静→Jenny' },
  { chinese: 'na', en: 'Nina', expected: true, desc: '娜→Nina' },
  { chinese: 'na', en: 'Nora', expected: true, desc: '娜→Nora' },
  { chinese: 'na', en: 'Anna', expected: true, desc: '娜→Anna' },
  // 全名测试
  { chinese: 'zhang wei', en: 'Jason', expected: true, desc: '张伟→Jason' },
  { chinese: 'li fang', en: 'Fiona', expected: true, desc: '李芳→Fiona' },
  { chinese: 'wang min', en: 'Mina', expected: true, desc: '王敏→Mina' },
  // 不匹配测试
  { chinese: 'zhang wei', en: 'Alice', expected: false, desc: '张伟→Alice(不应匹配)' },
  { chinese: 'li fang', en: 'Bob', expected: false, desc: '李芳→Bob(不应匹配)' },
  { chinese: 'shih', en: 'She', expected: false, desc: '诗→She(避开谐音雷)' },
];

// ===== 声母推荐测试 =====
const initialTestCases = [
  // 用户指南声母匹配表
  { initial: 'b', expectedStartsWith: ['Ben', 'Bob', 'Brian', 'Bella', 'Bonnie'], desc: 'B声母' },
  { initial: 'c/k', expectedStartsWith: ['Kevin', 'Kelly', 'Kate', 'Ken'], desc: 'C/K声母' },
  { initial: 'ch', expectedStartsWith: ['Charles', 'Chloe', 'Charlotte'], desc: 'CH声母' },
  { initial: 'd', expectedStartsWith: ['David', 'Daniel', 'Diana'], desc: 'D声母' },
  { initial: 'f', expectedStartsWith: ['Frank', 'Fiona', 'Flora'], desc: 'F声母' },
  { initial: 'g', expectedStartsWith: ['Gary', 'Grace', 'Gloria'], desc: 'G声母' },
  { initial: 'h', expectedStartsWith: ['Henry', 'Helen', 'Hannah'], desc: 'H声母' },
  { initial: 'j', expectedStartsWith: ['Jason', 'Jack', 'Jessica'], desc: 'J声母' },
  { initial: 'zh', expectedStartsWith: ['Jason', 'Jack', 'James'], desc: 'ZH→J声母' },
  { initial: 'l', expectedStartsWith: ['Leo', 'Linda', 'Lucy'], desc: 'L声母' },
  { initial: 'm', expectedStartsWith: ['Mike', 'Mary', 'Megan'], desc: 'M声母' },
  { initial: 'n', expectedStartsWith: ['Nick', 'Nancy', 'Nina'], desc: 'N声母' },
  { initial: 'p', expectedStartsWith: ['Paul', 'Peter', 'Peggy'], desc: 'P声母' },
  { initial: 'q', expectedStartsWith: ['John', 'Jon', 'Johnny'], desc: 'Q→J声母' },
  { initial: 'r', expectedStartsWith: ['Ryan', 'Ray', 'Rita'], desc: 'R声母' },
  { initial: 's', expectedStartsWith: ['Sam', 'Sarah', 'Sophia'], desc: 'S声母' },
  { initial: 't', expectedStartsWith: ['Tom', 'Tony', 'Tina'], desc: 'T声母' },
  { initial: 'w', expectedStartsWith: ['William', 'Wendy', 'Wanda'], desc: 'W声母' },
  { initial: 'x', expectedStartsWith: ['Sam', 'Sarah', 'Sophia'], desc: 'X→S声母' },
  { initial: 'y', expectedStartsWith: ['Yoyo', 'Yvonne', 'York'], desc: 'Y声母' },
  { initial: 'z', expectedStartsWith: ['Zach', 'Zoe', 'Zara'], desc: 'Z声母' },
];

// ===== 韵母映射测试 =====
const finalTestCases = [
  { pinyin: 'zhang', initial: 'zh', final: 'ang', desc: '张' },
  { pinyin: 'wei', initial: 'w', final: 'ei', desc: '伟' },
  { pinyin: 'qing', initial: 'q', final: 'ing', desc: '清/情' },
  { pinyin: 'qiang', initial: 'q', final: 'iang', desc: '强' },
  { pinyin: 'xue', initial: 'x', final: 'ue', desc: '雪' },
  { pinyin: 'jing', initial: 'j', final: 'ing', desc: '静' },
  { pinyin: 'an', initial: '', final: 'an', desc: '安(零声母)' },
  { pinyin: 'en', initial: '', final: 'en', desc: '恩(零声母)' },
];

// ===== 函数定义检测 =====
console.log('=== 函数导出检测 ===');
const definedFunctions = {
  universalMatch: typeof universalMatch === 'function',
  quickInitialMatch: typeof quickInitialMatch === 'function',
  getSuggestedNamesByInitial: typeof getSuggestedNamesByInitial === 'function',
  extractInitial: typeof extractInitial === 'function',
  extractFinal: typeof extractFinal === 'function',
};
console.log(JSON.stringify(definedFunctions, null, 2));

const allDefined = Object.values(definedFunctions).every(v => v);
if (!allDefined) {
  console.error('❌ 部分函数未导出');
  process.exit(1);
}
console.log('✅ 所有函数已定义\n');

// ===== 测试快速声母提取 =====
console.log('=== 声母/韵母提取测试 ===');
finalTestCases.forEach(tc => {
  const initial = extractInitial(tc.pinyin);
  const final = extractFinal(tc.pinyin);
  const ok = initial === tc.initial && final === tc.final;
  console.log(`${ok ? '✅' : '❌'} ${tc.desc}(${tc.pinyin}) → 声母:${initial} 韵母:${final} (期望:${tc.initial}+${tc.final})`);
});

// ===== 测试万能匹配 (universalMatch) =====
console.log('\n=== 万能匹配法核心测试 ===');
let passed = 0;
let failed = 0;

testCases.forEach(tc => {
  const result = universalMatch(tc.chinese, tc.en);
  const isMatch = result.score >= 0.3;
  const status = (isMatch === tc.expected) ? '✅' : '❌';
  
  if (isMatch === tc.expected) passed++;
  else failed++;
  
  const scoreStr = (result.score * 100).toFixed(0);
  console.log(`${status} ${tc.desc} → ${tc.en}(得分:${scoreStr}) ${result.detail}`);
});

console.log(`\n结果：${passed} 通过，${failed} 失败`);

// ===== 测试声母推荐列表 =====
console.log('\n=== 声母推荐列表测试 ===');
let initPassed = 0;
initialTestCases.forEach(tc => {
  // 根据声母获取拼音
  const pinyinMap = {
    'b': 'bo', 'c/k': 'ke', 'ch': 'chen', 'd': 'da', 'f': 'fang',
    'g': 'gao', 'h': 'hao', 'j': 'jie', 'zh': 'zhang', 'l': 'lin',
    'm': 'ming', 'n': 'na', 'p': 'peng', 'q': 'qiang', 'r': 'ran',
    's': 'san', 't': 'ting', 'w': 'wei', 'x': 'xue', 'y': 'yang',
    'z': 'zang'
  };
  const pinyin = pinyinMap[tc.initial];
  if (!pinyin) return;
  
  const suggested = getSuggestedNamesByInitial(pinyin);
  const hasExpected = tc.expectedStartsWith.some(name => 
    suggested.some(s => s.toLowerCase() === name.toLowerCase())
  );
  
  if (hasExpected) {
    console.log(`✅ ${tc.desc}: 推荐列表包含示例名`);
    initPassed++;
  } else {
    console.log(`❌ ${tc.desc}: 推荐列表 ${suggested.slice(0,5).join(',')} 不包含预期名 ${tc.expectedStartsWith.join(',')}`);
  }
});

// ===== 总结 =====
console.log(`\n=== 最终结果 ===`);
console.log(`万能匹配测试：${passed}/${testCases.length} 通过`);
console.log(`推荐列表测试：${initPassed}/${initialTestCases.length} 通过`);

// 显示一些实际推荐
console.log('\n=== 示例推荐 ===');
const demoCases = ['zhang wei', 'li fang', 'wang min', 'tao', 'jing'];
demoCases.forEach(name => {
  const suggested = getSuggestedNamesByInitial(name);
  console.log(`\n${name} 推荐英文名(前5):`);
  suggested.slice(0, 5).forEach((n, i) => {
    const result = universalMatch(name, n);
    console.log(`  ${i+1}. ${n} (得分:${(result.score*100).toFixed(0)})`);
  });
});