const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Header.tsx', 'utf8');

const oldStart = '      {/* ===== 主导航（内嵌到顶栏右侧） ===== */}';
const startIdx = content.indexOf(oldStart);

// Find the nav close tag and then find mobile menu comment after it
const navClosePattern = '      </nav>';
let navCloseIdx = content.indexOf(navClosePattern, startIdx);

// After </nav>, skip blank lines to get to mobile menu
// Find "/* ═══ 移动端菜单 ═══ */"
const mobileMenuStr = content.indexOf('/* \u25a4\u25a4\u25a4', navCloseIdx);  // use raw unicode for ═
if (mobileMenuStr === -1) {
  // Try with literal chars
  const altMobile = content.indexOf('\u79fb\u52a8\u7aef\u83dc\u5355', navCloseIdx);
  console.log('Alt mobile search:', altMobile);
}

console.log('Start:', startIdx, 'Nav close:', navCloseIdx, 'Mobile menu pos:', mobileMenuStr);

// Actually just remove from oldStart to the line before mobile menu
// Let's look at what's between
const between = content.substring(navCloseIdx, navCloseIdx + 30);
console.log('After nav close:', JSON.stringify(between));

// The end string we want is right before the mobile menu comment (with its indentation)
const targetEnd = '\r\n      {/* '; // start of mobile menu comment
const mobileCommentIdx = content.indexOf(targetEnd, navCloseIdx);
console.log('Mobile comment idx:', mobileCommentIdx);

if (startIdx > -1 && mobileCommentIdx > startIdx) {
  const removed = content.substring(startIdx, mobileCommentIdx);
  console.log('Removing:', removed.length, 'bytes');
  
  content = content.substring(0, startIdx) + content.substring(mobileCommentIdx);
  fs.writeFileSync('src/components/layout/Header.tsx', content, 'utf8');
  console.log('Done! File size:', content.length, 'bytes');
}
