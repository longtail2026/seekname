const fs = require('fs');
const content = fs.readFileSync('src/lib/ename-generator.ts', 'utf8');
const regex = /"([\u4e00-\u9fff]+)"\s*:\s*"([a-z]+)"/g;
const entries = [];
let m;
while ((m = regex.exec(content)) !== null) {
  entries.push({ ch: m[1], py: m[2], idx: m.index });
}
const seen = {};
const duplicates = {};
for (const e of entries) {
  if (seen[e.ch]) {
    if (!duplicates[e.ch]) duplicates[e.ch] = [seen[e.ch]];
    duplicates[e.ch].push(e);
  } else {
    seen[e.ch] = e;
  }
}
console.log('重复键:');
for (const [ch, occ] of Object.entries(duplicates)) {
  console.log(ch + ': ' + occ.map(o => o.py + ' @pos ' + o.idx).join(', '));
}