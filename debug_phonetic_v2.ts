import { 
  universalMatch, 
  calcSurnameEnglishMatchScore 
} from './src/lib/ename-phonetic';

// 先看每个英文名的音节切分
const names = ['Early', 'Johnson', 'Eaton', 'Joel', 'Morton', 'Mason', 'Moyer', 'Michael', 'Maurice', 'Murray', 'Morris'];

// 音节拆分（直接用 universalMatch 内置的
console.log('\n=== universalMatch("mao yong", ...) 结果 ===');
for (const n of names) {
  const r = universalMatch('mao yong', n);
  console.log(n.padEnd(12), '分数='+r.score, 'detail:', r.detail);
}

// ★★★ V6.3 测试姓氏英文发音匹配 ★★★
console.log('\n\n========================================');
console.log('★★★ V6.3 姓氏英文发音匹配测试 ★★★');
console.log('========================================');

const testCases: Array<{ name: string; surname: string }> = [
  // 李→Lee
  { name: 'Lee', surname: '李' },
  { name: 'Lee', surname: 'Li' },
  { name: 'Leigh', surname: '李' },
  { name: 'Leigh', surname: 'Li' },
  { name: 'Liam', surname: '李' },
  // 张→Cheung
  { name: 'Cheung', surname: '张' },
  { name: 'Cheung', surname: 'Zhang' },
  { name: 'Chang', surname: '张' },
  { name: 'Charles', surname: '张' },
  // 陈→Chan
  { name: 'Chan', surname: '陈' },
  { name: 'Chan', surname: 'Chen' },
  { name: 'Chandler', surname: '陈' },
  // 王→Wong
  { name: 'Wong', surname: '王' },
  { name: 'Wong', surname: 'Wang' },
  { name: 'Walter', surname: '王' },
  // 林→Lam
  { name: 'Lam', surname: '林' },
  { name: 'Lam', surname: 'Lin' },
  { name: 'Lamb', surname: '林' },
  // 黄→Wong
  { name: 'Wong', surname: '黄' },
  { name: 'Huang', surname: '黄' },
  // 欧阳→Au-Yeung
  { name: 'Au-Yeung', surname: '欧阳' },
  { name: 'Yeung', surname: '欧阳' },
  // 不匹配
  { name: 'Alice', surname: '张' },
  { name: 'Bob', surname: '李' },
];

for (const tc of testCases) {
  const result = calcSurnameEnglishMatchScore(tc.name, tc.surname);
  const matchIcon = result.score > 0 ? '✅' : '❌';
  console.log(`${matchIcon} 姓氏"${tc.surname.padEnd(6)}" 英文名"${tc.name.padEnd(12)}" \u2192 ${result.score.toString().padStart(3)}分 ${result.detail}`);
}