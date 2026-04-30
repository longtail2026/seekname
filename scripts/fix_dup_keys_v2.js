const fs = require('fs');
const content = fs.readFileSync('src/lib/ename-generator.ts', 'utf8');

// 找到所有关键标记位置
const hzStart = content.indexOf('const HANZI_TO_PINYIN: Record<string, string> = {');
const ssStart = content.indexOf('const SPECIAL_SURNAMES: Record<string, string> = {');
const getPinyinStart = content.indexOf('function getPinyin(');

console.log('Position debug:');
console.log('  hzStart:', hzStart);
console.log('  ssStart:', ssStart);
console.log('  getPinyinStart:', getPinyinStart);

// HANZI_TO_PINYIN: 找 { 和 }
const hzOpen = content.indexOf('{', hzStart) + 1; // start after {
// HANZI的 } 在 SPECIAL_SURNAMES 之前
const hzClose = ssStart; 
// 我们需要在 hzClose 之前找到匹配的 }
// 简单方法：在 hzOpen 到 hzClose 之间找到最后一个 }
const hzBodyRaw = content.slice(hzOpen, hzClose);
const hzCloseActual = hzOpen + hzBodyRaw.lastIndexOf('}');
const hzBodyContent = content.slice(hzOpen, hzCloseActual);
const hzAfter = hzCloseActual + 1; // after }

console.log('  hzOpen:', hzOpen, 'hzCloseActual:', hzCloseActual);
console.log('  HANZI body length:', hzBodyContent.length);

// 解析 HANZI_TO_PINYIN
const hzRegex = /"([\u4e00-\u9fff]+)"\s*:\s*"([a-z]+)"/g;
const hzMap = new Map();
const hzPairs = [];
let match;
while ((match = hzRegex.exec(hzBodyContent)) !== null) {
  const ch = match[1];
  const py = match[2];
  if (!hzMap.has(ch)) {
    hzMap.set(ch, py);
    hzPairs.push(`"${ch}":"${py}"`);
  } else {
    console.log('  HANZI DUP SKIP:', ch, '=', py);
  }
}

const newHzBody = hzPairs.join(',');

// SPECIAL_SURNAMES: 找 { 和 }
const ssOpen = content.indexOf('{', ssStart) + 1;
const ssBodyRaw = content.slice(ssOpen, getPinyinStart);
const ssCloseActual = ssOpen + ssBodyRaw.lastIndexOf('}');
const ssBodyContent = content.slice(ssOpen, ssCloseActual);
const ssAfter = ssCloseActual + 1;

console.log('  ssOpen:', ssOpen, 'ssCloseActual:', ssCloseActual);
console.log('  SPECIAL body length:', ssBodyContent.length, 'starts:', ssBodyContent.slice(0, 50));

// 解析 SPECIAL_SURNAMES
const ssRegex = /"([\u4e00-\u9fff]+)"\s*:\s*"([a-z]+)"/g;
const ssPairs = [];
let keptCount = 0, removedCount = 0;

while ((match = ssRegex.exec(ssBodyContent)) !== null) {
  const ch = match[1];
  const py = match[2];
  const hzPy = hzMap.get(ch);
  if (hzPy && hzPy === py) {
    console.log('  SPECIAL REDUNDANT REMOVED:', ch, py);
    removedCount++;
  } else {
    console.log('  SPECIAL KEPT:', ch, py, '(hz:', hzPy || 'N/A', ')');
    ssPairs.push(`"${ch}":"${py}"`);
    keptCount++;
  }
}

const newSsBody = ssPairs.join(',');

// 构建新文件
const beforeHz = content.slice(0, hzOpen);
const betweenHzAndSs = content.slice(hzCloseActual + 1, ssOpen);
const afterSs = content.slice(ssCloseActual + 1);

// 验证中间部分包含 "const SPECIAL_SURNAMES"
console.log('\n  between check:', betweenHzAndSs.slice(0, 60));

const newContent = beforeHz + newHzBody + betweenHzAndSs + newSsBody + afterSs;

// 验证新文件长度合理
console.log('\n  Original size:', content.length);
console.log('  New size:', newContent.length);

// 验证没有重复键了
const checkRegex = /"([\u4e00-\u9fff]+)"\s*:\s*"([a-z]+)"/g;
const checkMap = new Map();
let checkMatch;
let dupCount = 0;
while ((checkMatch = checkRegex.exec(newContent)) !== null) {
  if (checkMap.has(checkMatch[1])) dupCount++;
  else checkMap.set(checkMatch[1], true);
}
console.log('  Remaining duplicates:', dupCount);

if (dupCount === 0) {
  fs.writeFileSync('src/lib/ename-generator.ts', newContent, 'utf8');
  console.log('\n=== Success ===');
  console.log('HANZI_TO_PINYIN:', hzMap.size, 'entries');
  console.log('SPECIAL_SURNAMES:', keptCount, 'kept,', removedCount, 'removed');
} else {
  console.log('\n=== FAILED - duplicates still exist ===');
}