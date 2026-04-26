/**
 * 硬性过滤5规则独立验证脚本
 * 直接导入 hard-filter.ts 验证各规则
 */

import { hardFilterNames, hardFilterSingleName, HardFilter } from './src/lib/hard-filter.ts';

// ── 测试数据 ──
const testCases = [
  // 应通过组（全部使用常用字，无负面含义，笔画适中）
  { name: '明慧', givenName: '明慧', pinyin: 'míng huì', expected: 'pass', desc: '常用字+好寓意' },
  { name: '婉婷', givenName: '婉婷', pinyin: 'wǎn tíng', expected: 'pass', desc: '常见女名' },
  { name: '翰林', givenName: '翰林', pinyin: 'hàn lín', expected: 'pass', desc: '文雅类' },
  { name: '思远', givenName: '思远', pinyin: 'sī yuǎn', expected: 'pass', desc: '励志类' },
  { name: '一凡', givenName: '一凡', pinyin: 'yī fán', expected: 'pass', desc: '简约类' },
  { name: '璟雯', givenName: '璟雯', pinyin: 'jǐng wén', expected: 'pass', desc: '补充字库字' },

  // 生僻字过滤
  { name: '彧骉', givenName: '彧骉', pinyin: 'yù biāo', expected: 'rare', desc: '生僻字' },
  { name: '甪直', givenName: '甪直', pinyin: 'lù zhí', expected: 'rare', desc: '非常用字' },

  // 负面含义过滤
  { name: '死生', givenName: '死生', pinyin: 'sǐ shēng', expected: 'negative', desc: '负面字-死' },
  { name: '贫穷', givenName: '贫穷', pinyin: 'pín qióng', expected: 'negative', desc: '负面双字词' },
  { name: '病夫', givenName: '病夫', pinyin: 'bìng fū', expected: 'negative', desc: '负面字-病' },

  // 谐音避讳过滤
  { name: '史珍香', givenName: '珍香', pinyin: 'zhēn xiāng', expected: 'homophone', 
    options: { surname: '史' }, desc: '史珍香→屎真香' },
  { name: '王八', givenName: '王八', pinyin: 'wáng bā', expected: 'homophone', desc: '王八谐音' },

  // 笔画极端
  { name: '了乙', givenName: '了乙', pinyin: 'le yǐ', expected: 'stroke_low', desc: '笔画过少(1+1=2)' },
  { name: '懿麟鑫', givenName: '懿麟鑫', pinyin: 'yì lín xīn', expected: 'stroke_high', desc: '笔画过多(22+23+24=69)' },
];

async function main() {
  console.log('='.repeat(80));
  console.log('硬性过滤5规则验证');
  console.log('='.repeat(80));
  console.log();

  let passCount = 0;
  let failCount = 0;

  for (const tc of testCases) {
    const options = tc.options || {};
    const results = hardFilterSingleName(tc.givenName, tc.pinyin, options);
    
    let status;
    if (results.length === 0) {
      status = 'pass';
    } else {
      const rules = results.map(r => r.rule);
      if (rules.includes('生僻字过滤')) status = 'rare';
      else if (rules.includes('负面含义')) status = 'negative';
      else if (rules.includes('谐音避讳')) status = 'homophone';
      else if (rules.includes('笔画极端')) status = results[0].reason.includes('过少') ? 'stroke_low' : 'stroke_high';
      else status = 'unknown';
    }

    const expected = tc.expected;
    const passed = status === expected;
    const icon = passed ? '✅' : '❌';
    if (passed) passCount++;
    else failCount++;

    console.log(`${icon} [${tc.desc}]`);
    console.log(`   名字: "${tc.name}" (${tc.pinyin})`);
    console.log(`   预期: ${expected}, 实际: ${status}`);
    if (results.length > 0) {
      console.log(`   原因: ${results.map(r => `[${r.rule}] ${r.reason}`).join('; ')}`);
    }
    console.log();
  }

  console.log('='.repeat(80));
  console.log(`总计: ${testCases.length} 用例 | ✅ 通过: ${passCount} | ❌ 失败: ${failCount}`);
  console.log('='.repeat(80));
}

main().catch(console.error);