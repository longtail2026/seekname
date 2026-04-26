/**
 * 测试纯JS八字排盘算法
 * 验证多组日期与 lunisolar 库的结果对比
 */
const lunisolar = require('lunisolar');

const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

function getLunisolarBazi(dateStr) {
  const ls = lunisolar(dateStr);
  const list = ls.char8._list;
  return list.map(p => ({
    stem: p.stem.value,
    branch: p.branch.value,
    text: TIAN_GAN[p.stem.value] + DI_ZHI[p.branch.value]
  }));
}

// 验证多个日期
const dates = [
  '2026-04-26 12:00',
  '2024-01-01 12:00',
  '2024-02-10 12:00',
  '2000-01-01 12:00',
  '1990-06-15 08:30',
  '1988-03-21 14:00',
  '2025-12-31 12:00',
  '2026-02-01 12:00',
  '2026-04-05 12:00',
  '1900-01-01 12:00',
  '1900-02-01 12:00'
];

console.log("=== lunisolar 基准测试 ===");
dates.forEach(d => {
  try {
    const bazi = getLunisolarBazi(d);
    const text = bazi.map(b => `${b.text}(${b.stem},${b.branch})`).join(' ');
    console.log(`${d.padEnd(25)} -> ${text}`);
  } catch(e) {
    console.log(`${d.padEnd(25)} -> ERROR: ${e.message}`);
  }
});