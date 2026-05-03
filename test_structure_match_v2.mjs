/**
 * 发音结构匹配算法 v2.0 - 完整测试验证脚本
 * 
 * 测试目标：
 * 1. guoguang → Gordon (高分≥80)
 * 2. zhang → 姓氏映射 (Cheung)
 * 3. 全名 "张国光" → "Gordon Cheung"
 */

// ===== 用 Node.js 加载 TypeScript 文件 =====
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// 转译 TS 文件
import { register } from 'node:module';
import { pathToFileURL } from 'url';

// 为了能在 Node 中直接 import .ts 文件
// 使用 esbuild 或 ts-node

console.log('========================================');
console.log('  发音结构匹配算法 v2.0 - 验证测试');
console.log('========================================\n');

// 先构建 CommonJS bundle 来测试
// 使用 tsc 或直接运行 ts-node

import { execSync } from 'child_process';

try {
  // 使用 tsx 运行
  console.log('Running tests via tsx...\n');
  execSync('npx tsx -e "
    const { parsePinyinSyllables, splitEnglishIntoSyllables, matchPinyinToEnglishName, sortByStructureMatch, buildStructureFromPinyin, testStructureMatch } = require(\'./src/lib/ename-phonetic-structure.ts\');
    
    // 运行内置测试
    testStructureMatch();
    
    console.log(\'\\n===== 详细测试: 中文名全名匹配 =====\');
    console.log(\'\\n1. 姓氏映射验证（需要在 ename-surname-map.ts 中查看）\');
    
    // 拼音解析测试
    console.log(\'\\n2. 拼音解析测试:\');
    const testPinyins = [\'zhang\', \'guoguang\', \'zhangsan\', \'xiaoming\', \'li\', \'wei\', \'taoqiang\', \'guoping\'];
    for (const p of testPinyins) {
      const s = buildStructureFromPinyin(p);
      console.log(\`   \${p} → \${s.syllableCount}音节: initials=[\${s.initials.join(\",\")}] finals=[\${s.finals.join(\",\")}] endings=[\${s.endings.join(\",\")}]\`);
    }
    
    // 英文名切分测试
    console.log(\'\\n3. 英文名音节切分测试:\');
    const testNames = [\'Gordon\', \'Gideon\', \'Glover\', \'George\', \'Gavin\', \'Galloway\', \'Gaylord\', \'Garrison\', \'Gustav\', \'Gonzalo\', \'Simon\', \'Johnson\', \'Cheung\'];
    for (const n of testNames) {
      const syls = splitEnglishIntoSyllables(n);
      console.log(\`   \${n} → \${syls.length}音节: \${syls.map(s => s.full).join(\"-\")} [\${syls.map(s => \`\${s.onset}\${s.nucleus}(\${s.coda||\\\"\\\"})\`).join(\", \")}]\`);
    }
    
    // 全名排序测试: zhang + guoguang → 匹配 Cheung + Gordon 的变体
    console.log(\'\\n4. 全名组合匹配: 张国光 → 按英文姓氏+名字匹配\');
    
    const surnames = [\'Cheung\', \'Zhang\', \'Chang\', \'Chong\', \'Chow\', \'Cho\'];
    const givenNames = [\'Gordon\', \'Glover\', \'Galloway\', \'Garrison\', \'Gaylord\', \'Gideon\', \'George\', \'Gavin\', \'Gilbert\'];
    
    // 测试所有姓氏+名字组合
    const allCombos = [];
    for (const sn of surnames) {
      for (const gn of givenNames) {
        const full = \`\${gn} \${sn}\`;
        const zhScore = matchPinyinToEnglishName(\'zhang\', sn).score;
        const ggScore = matchPinyinToEnglishName(\'guoguang\', gn).score;
        const total = zhScore * 0.35 + ggScore * 0.65;
        allCombos.push({ full, zhScore, ggScore, total });
      }
    }
    allCombos.sort((a, b) => b.total - a.total);
    allCombos.slice(0, 10).forEach((c, i) => {
      console.log(\`   \${i+1}. \${c.full} → 姓\${c.zhScore}分 + 名\${c.ggScore}分 = \${Math.round(c.total)}分\`);
    });
    
  "', { stdio: 'inherit' });
} catch (e) {
  console.log('tsx not available, trying tsc alternative...');
  try {
    // 直接用 node 运行编译后的测试
    execSync('npx tsx src/lib/ename-phonetic-structure.ts 2>&1 | head -100', { stdio: 'inherit' });
  } catch (e2) {
    console.error('Need tsx. Installing...');
    execSync('npm install -g tsx', { stdio: 'inherit' });
  }
}