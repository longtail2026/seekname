/**
 * 修复 ename-generator.ts 中的重复键问题：
 * 1. 移除 SPECIAL_SURNAMES 中与 HANZI_TO_PINYIN 相同读音的冗余条目
 * 2. 移除 HANZI_TO_PINYIN 中的重复键（保留第一个）
 */
const fs = require('fs');

const content = fs.readFileSync('src/lib/ename-generator.ts', 'utf8');

// 定位 HANZI_TO_PINYIN 部分
const hzStartMarker = 'const HANZI_TO_PINYIN: Record<string, string> = {';
const hzEndMarker = '// ===== 常见100个姓氏特殊读音';

const hzStart = content.indexOf(hzStartMarker);
const hzEnd = content.indexOf(hzEndMarker);

// 定位 SPECIAL_SURNAMES 部分
const ssStartMarker = 'const SPECIAL_SURNAMES: Record<string, string> = {';
const ssEndMarker = '// ===== 工具函数';

const ssStart = content.indexOf(ssStartMarker);
const ssEnd = content.indexOf(ssEndMarker);

console.log('HANZI_TO_PINYIN:', hzStart, '-', hzEnd);
console.log('SPECIAL_SURNAMES:', ssStart, '-', ssEnd);

if (hzStart === -1 || hzEnd === -1 || ssStart === -1 || ssEnd === -1) {
  console.error('Could not find marker positions');
  process.exit(1);
}

// 解析 HANZI_TO_PINYIN 到 Map（保留第一个）
const hzMap = new Map();
const hzLines = content.slice(hzStart + hzStartMarker.length, hzEnd).split('\n');
const hzCleanLines = [];
const hzDupKeys = new Set();

for (const line of hzLines) {
  const m = line.match(/"([\u4e00-\u9fff]+)"\s*:\s*"([a-z]+)"/);
  if (m) {
    const ch = m[1];
    const py = m[2];
    if (hzMap.has(ch)) {
      hzDupKeys.add(ch);
      console.log('HANZI_TO_PINYIN duplicate, skipping:', ch, py);
      continue; // skip duplicate
    }
    hzMap.set(ch, py);
    hzCleanLines.push(line);
  } else {
    hzCleanLines.push(line);
  }
}

const newHZContent = hzCleanLines.join('\n');

// 解析 SPECIAL_SURNAMES：只保留与 HANZI_TO_PINYIN 中读音不同的
const ssLines = content.slice(ssStart + ssStartMarker.length, ssEnd).split('\n');
const ssCleanLines = [];
let ssRemovedCount = 0;

// 找出 SPECIAL_SURNAMES 中所有键以及它们的值
const ssEntries = [];
for (let i = 0; i < ssLines.length; i++) {
  const line = ssLines[i];
  const m = line.match(/"([\u4e00-\u9fff]+)"\s*:\s*"([a-z]+)"/);
  if (m) {
    ssEntries.push({ ch: m[1], py: m[2], lineIdx: i, line });
  }
}

// 找出 SPECIAL_SURNAMES 中跟 HANZI_TO_PINYIN 相同的条目
for (const entry of ssEntries) {
  const hzPy = hzMap.get(entry.ch);
  if (hzPy && hzPy === entry.py) {
    // 冗余，移除
    console.log('SPECIAL_SURNAMES redundant, removing:', entry.ch, entry.py);
    ssCleanLines.push(''); // empty placeholder
    ssRemovedCount++;
  } else {
    ssCleanLines.push(entry.line);
  }
}

// 对于非键行（注释等），保留
let ssLineIdx = 0;
for (let i = 0; i < ssLines.length; i++) {
  const m = ssLines[i].match(/"([\u4e00-\u9fff]+)"\s*:\s*"([a-z]+)"/);
  if (!m) {
    // 非键行，直接保留
    ssCleanLines[i] = ssLines[i];
  }
}

// 清理空行（移除被移除条目留下的空行）
const finalSSLines = ssCleanLines.filter(l => l !== '' && l !== undefined && l !== null);

const needNewLine = content.slice(hzStart + hzStartMarker.length, hzEnd).endsWith('\n');
const newSSContent = finalSSLines.join('\n');

// 重构文件
const beforeHZ = content.slice(0, hzStart + hzStartMarker.length);
const between = '\n' + newHZContent;
const midSection = content.slice(hzEnd, ssStart + ssStartMarker.length);
const afterSS = content.slice(ssEnd);

const newContent = beforeHZ + between + midSection + '\n' + newSSContent + afterSS;

fs.writeFileSync('src/lib/ename-generator.ts', newContent, 'utf8');
console.log('\nDone!');
console.log('HANZI_TO_PINYIN duplicates removed:', hzDupKeys.size > 0 ? [...hzDupKeys].join(', ') : 'none');
console.log('SPECIAL_SURNAMES redundant entries removed:', ssRemovedCount);