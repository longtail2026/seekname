const fs = require('fs');
const content = fs.readFileSync('src/lib/ename-generator.ts', 'utf8');

const hzStart = content.indexOf('const HANZI_TO_PINYIN: Record<string, string> = {');
const ssStart = content.indexOf('const SPECIAL_SURNAMES: Record<string, string> = {');
const getPinyinStart = content.indexOf('function getPinyin(');

// Find HANZI_TO_PINYIN body
const hzOpen = content.indexOf('{', hzStart) + 1;
const hzBodyToEnd = content.slice(hzOpen, ssStart);
const hzCloseActual = hzOpen + hzBodyToEnd.lastIndexOf('}');
const hzBodyContent = content.slice(hzOpen, hzCloseActual);

// Find SPECIAL_SURNAMES body
const ssOpen = content.indexOf('{', ssStart) + 1;
const ssBodyToEnd = content.slice(ssOpen, getPinyinStart);
const ssCloseActual = ssOpen + ssBodyToEnd.lastIndexOf('}');
const ssBodyContent = content.slice(ssOpen, ssCloseActual);

// Build global map tracking first occurrence of each key (hanzi)
const globalMap = new Map(); // hanzi -> pinyin
const hzPairs = [];
const hzDupSkipped = new Set();

const regex = /"([\u4e00-\u9fff]+)"\s*:\s*"([a-z]+)"/g;
let m;
while ((m = regex.exec(hzBodyContent)) !== null) {
  const ch = m[1];
  const py = m[2];
  if (globalMap.has(ch)) {
    hzDupSkipped.add(ch + '=' + py);
  } else {
    globalMap.set(ch, py);
    hzPairs.push(`"${ch}":"${py}"`);
  }
}

const ssPairs = [];
const ssDupSkipped = [];
while ((m = regex.exec(ssBodyContent)) !== null) {
  const ch = m[1];
  const py = m[2];
  if (globalMap.has(ch)) {
    ssDupSkipped.push(ch + '=' + py + ' (first in HANZI: ' + globalMap.get(ch) + ')');
  } else {
    globalMap.set(ch, py);
    ssPairs.push(`"${ch}":"${py}"`);
  }
}

// Reconstruct file
const beforeHz = content.slice(0, hzOpen);
const betweenHzAndSs = content.slice(hzCloseActual + 1, ssOpen);
const afterSs = content.slice(ssCloseActual + 1);

const newContent = beforeHz + hzPairs.join(',') + betweenHzAndSs + ssPairs.join(',') + afterSs;

console.log('=== Results ===');
console.log('HANZI_TO_PYININ: ' + hzPairs.length + ' unique entries');
if (hzDupSkipped.size > 0) {
  console.log('  HANZI dups skipped: ' + [...hzDupSkipped].join(', '));
}
console.log('SPECIAL_SURNAMES: ' + ssPairs.length + ' unique entries');
if (ssDupSkipped.length > 0) {
  console.log('  SPECIAL dups skipped: ' + ssDupSkipped.join(', '));
}

// Verify no duplicates in output
const seen2 = new Map();
let dCount = 0;
const verifyRegex2 = /"([\u4e00-\u9fff]+)"\s*:\s*"([a-z]+)"/g;
while ((m = verifyRegex2.exec(newContent)) !== null) {
  if (seen2.has(m[1])) dCount++;
  else seen2.set(m[1], true);
}

console.log('\nVerification:');
console.log('  Original size:', content.length);
console.log('  New size:', newContent.length);
console.log('  Remaining duplicates:', dCount);

if (dCount === 0) {
  fs.writeFileSync('src/lib/ename-generator.ts', newContent, 'utf8');
  console.log('  File written successfully!');
} else {
  console.log('  FAILED - duplicates still remain, NOT writing file');
}
