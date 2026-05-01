/**
 * Test phonetic matching v3 for "徐小燕" (xu xiao yan)
 */

const { matchPronunciation, getChineseNamePinyin, searchByPhoneticMatch } = require('./src/lib/ename-phonetic');

// Test the key example: 徐小燕
const pinyin = getChineseNamePinyin('徐小燕');
console.log('=== 徐小燕拼音分解 ===');
console.log('全名拼音:', JSON.stringify(pinyin));

// Test specific names that SHOULD match well for "xu xiao yan"
const testNames = [
  // Expected good matches for "xiao yan":
  'Shania',     // "xiao" → "Shania" has "sha" start
  'Shawna',     // "xiao" → "shaw" matching
  'Shawn',      // "xiao" → "shaw"
  'Sienna',     // "xiao" → "sian" match
  'Sianna',     // "xiao" → "sian" match
  'Xian',       // "xiao" → "xia" match
  'Shane',      // "xiao" → "sha" match
  'Yana',       // "yan" → "yan"
  'Yanni',      // "yan" → "yann"
  'Shania Twain', // combined
  
  // Old bad results that shouldn't rank high:
  'Diana',      // old result - should be low/no match for xiaoyan
  'Diane',      // old result
  'Dione',      // old result
  'Fidelia',    // old result
  'Dias',       // old result
  'Dickerson',  // old result
  'Iris',       // old result
  'Jillian',    // old result
  'White',      // old result
  
  // Names starting with Xu:
  'Sue',        // "xu" → "sue"
  'Susan',      // "xu" → "su"
  'Suzie',      // "xu" → "su"
  'Xuxa',       // "xu" → "xu"
  
  // Related to given name "yan":
  'Yan',        // direct "yan"
  'Yana',       // "yan" + "a"
  'Yanis',      // "yan" start
  'Yanni',      // "yann"
  
  // Names with "xia" prefix:
  'Xia',        // "xia"
  'Xiaoli',     // "xiao" → "xia"
  'Sharon',     // "xiao" → "sha" + "ron"
  'Charo',      // similar to "xiao" sound
  
  // Names that might match "xu" part:
  'Suzanna',    // "su" by "xu"
  'Suzette',    // "su" for "xu"
  'Susanna',    // "su" for "xu"
  
  // Chinese-sounding names:
  'Xiaomei',    // "xiao" → "xia"
  'Xiaoping',   // "xiao" → "xiao"
  'Mei Yan',    // partial match
];

console.log('\n=== 发音匹配测试 ===');
for (const name of testNames) {
  const result = matchPronunciation(pinyin.givenName, name);
  const stars = result.score >= 0.8 ? '★★★★' : 
                result.score >= 0.6 ? '★★★☆' :
                result.score >= 0.4 ? '★★☆☆' :
                result.score >= 0.2 ? '★☆☆☆' : '☆☆☆☆';
  console.log(`${stars} ${name.padEnd(16)} score=${result.score.toFixed(2)} level=${result.matchedLevel} | ${result.detail}`);
}

// Test what top matches would be from the full ename dict
console.log('\n=== 测试完整词典的前20名 ===');
const { getAllRecords } = require('./src/lib/ename-dict');
const allRecords = getAllRecords();
const femaleRecords = allRecords.filter(r => r.gender === '女性' || r.gender === '中性');

console.log(`共 ${femaleRecords.length} 个女性/中性英文名`);

const sorted = searchByPhoneticMatch(pinyin.givenName, femaleRecords.map(r => ({ name: r.name, meaning: r.meaning, gender: r.gender })), 30);
console.log('\n发音匹配 Top 30:');
sorted.forEach((r, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${r.name.padEnd(16)} score=${r.phoneticScore} ${r.phoneticDetail}`);
});

// Check which of the old bad results would pass the hard filter (>60)
console.log('\n=== 用户示例中的名字（旧结果）硬过滤检查 ===');
const oldNames = ['Diana', 'Diane', 'Dione', 'Fidelia', 'Dias', 'Dickerson', 'Dickson', 'Gibbs', 'Giles', 'Gillespie', 'Iris', 'Jillian', 'White', 'Childers', 'Diamond', 'Dickens', 'Dickey', 'Dickinson', 'Finney', 'Friend'];
for (const name of oldNames) {
  const result = matchPronunciation(pinyin.givenName, name);
  const rawScore = result.score;
  const phoneticOutput = rawScore >= 0.9 ? 95 : rawScore >= 0.7 ? 80 : rawScore >= 0.5 ? 60 : rawScore >= 0.3 ? 40 : 10;
  const pass = phoneticOutput >= 60;
   console.log(`${pass ? '✅' : '❌'} ${name.padEnd(16)} rawScore=${rawScore.toFixed(2)}→phoneticOutput=${phoneticOutput} | ${result.detail}`);
 }
