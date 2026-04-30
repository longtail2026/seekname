const fs = require('fs');
const c = fs.readFileSync('src/lib/ename-generator.ts', 'utf8');

// Build map tracking first occurrence
const r = /"([\u4e00-\u9fff]+)"\s*:\s*"([a-z]+)"/g;
const seen = {};
let m;
const dups = [];
while ((m = r.exec(c)) !== null) {
  const key = m[1] + ':' + m[2];
  if (seen[m[1]]) {
    dups.push({ ch: m[1], py: m[2], pos: m.index });
  } else {
    seen[m[1]] = { py: m[2], pos: m.index };
  }
}

console.log('Found', dups.length, 'duplicates:');
for (const d of dups) {
  console.log('  "' + d.ch + '": "' + d.py + '" at pos', d.pos, '- first was:', JSON.stringify(seen[d.ch]));
}