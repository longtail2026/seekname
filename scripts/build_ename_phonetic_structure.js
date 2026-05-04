/**
 * 重新构建英文名字典的音节发音结构
 * 
 * 使用面向中文拼音匹配的简化规则：
 * 1. 音节数：按元音组切分（连续元音算1个元音组）
 * 2. 开头音：第一个辅音/辅音组合 → 到第一个元音前
 * 3. 中间音：每个音节的韵母（去掉声母后的完整部分），用_连接
 * 4. 尾音：最后一个音节末尾的辅音
 * 
 * 运行方式：node scripts/build_ename_phonetic_structure.js
 *            node scripts/build_ename_phonetic_structure.js --test   (仅测试)
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// ===== 基本字符集 =====
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

function isVowel(ch) {
  return VOWELS.has(ch);
}

// ===== 合法英文音节开头辅音组合 =====
const LEGAL_ONSETS = new Set([
  'b','bl','br', 'c','ch','cl','cr', 'd','dr', 'f','fl','fr',
  'g','gh','gl','gn','gr', 'h', 'j', 'k','kh','kn', 'l',
  'm', 'n', 'p','ph','pl','pn','pr','ps', 'qu',
  'r', 's','sc','sch','scr','sh','shr','sk','sl','sm','sn',
  'sp','spl','spr','sq','st','str','sw', 't','th','tr','tw',
  'v', 'w','wh','wr', 'x', 'y', 'z','zh',
]);

function isLegalOnset(c) {
  return LEGAL_ONSETS.has(c);
}

// ===== 核心：按音節分割 =====
// 思路：按元音组分割，分布中间辅音，遵循 Maximal Onset 原则
function splitSyllables(name) {
  const s = name.toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return [];
  
  // 1. 找出所有元音和辅音的交替位置
  const chars = [...s];
  const vowelGroups = [];  // [[startPos, endPos], ...]
  let inVowel = false;
  let groupStart = -1;
  
  for (let i = 0; i < chars.length; i++) {
    if (isVowel(chars[i])) {
      if (!inVowel) {
        groupStart = i;
        inVowel = true;
      }
    } else {
      if (inVowel) {
        vowelGroups.push([groupStart, i - 1]);
        inVowel = false;
      }
    }
  }
  if (inVowel) {
    vowelGroups.push([groupStart, chars.length - 1]);
  }
  
  if (vowelGroups.length === 0) {
    // 没有元音（很少见）
    return [s];
  }
  
  // 2. 构建音节段
  // 每个音节 = [起始位, 元音组结束位]（包括开头辅音）
  const segments = [];
  
  for (let i = 0; i < vowelGroups.length; i++) {
    const [vStart, vEnd] = vowelGroups[i];
    
    let segStart = vStart;
    let segEnd = vEnd;
    
    // 确定这个音节的结尾：
    // 如果是最后一个音节，结尾到名字末尾
    // 否则，在中间辅音中找到合适的分割点
    if (i < vowelGroups.length - 1) {
      const nextVStart = vowelGroups[i + 1][0];
      const middleCons = chars.slice(vEnd + 1, nextVStart);
      
      // 在中间辅音中找到分割点
      const splitPos = findSplitPoint(middleCons);
      
      // 分割点：前一个音节保留 midCons[0..splitPos-1]，后一个音节得到 midCons[splitPos..]
      if (splitPos < middleCons.length) {
        segEnd = vEnd + splitPos;
      } else {
        segEnd = vEnd + splitPos; // 所有中间辅音归前一个音节
      }
    } else {
      segEnd = chars.length - 1;
    }
    
    // 确定这个音节的起始：
    // 如果是第一个音节，起始到名字开头
    if (i === 0) {
      segStart = 0;
    } else {
      // 前一个音节的结尾 + 1
      const prevSegEnd = segments[i - 1].end;
      segStart = prevSegEnd + 1;
    }
    
    segments.push({ start: segStart, end: segEnd });
  }
  
  // 3. 提取音节字符串
  const syllables = segments.map(seg => chars.slice(seg.start, seg.end + 1).join(''));
  
  return syllables;
}

// 在中间辅音序列中找到分割点
// 返回前一个音节应该保留的辅音数量
function findSplitPoint(consonants) {
  const cons = consonants.join('');
  const len = cons.length;
  
  if (len === 0) return 0;
  if (len === 1) {
    // 单个辅音归后一个音节（V.CV）
    return 0;
  }
  
  // 从长到短尝试：后一个音节能尽量多地取走辅音
  for (let i = len; i >= 1; i--) {
    const onset = cons.slice(len - i);  // 后一个音节可能得到的开头辅音
    const coda = cons.slice(0, len - i); // 前一个音节保留的尾辅音
    
    if (isLegalOnset(onset)) {
      // 检查 coda 是否也是合法尾音（不为空即可，英文中多数单辅音可做尾音）
      if (coda.length <= 2) {
        return len - i;
      }
      // coda 太长时保留一些
    }
  }
  
  // 默认：均衡分配
  return Math.floor(len / 2);
}

// ===== 2. 提取开头音 start_sound =====
function extractStartSound(syllables) {
  if (syllables.length === 0) return '';
  const firstSyl = syllables[0];
  let start = '';
  for (const ch of firstSyl) {
    if (isVowel(ch)) break;
    start += ch;
  }
  return start;
}

// ===== 3. 提取中间韵母组合 middle_sound =====
// 每个音节的韵母 = 去掉声母(onset)后的部分
function extractMiddleSound(syllables) {
  const rimes = [];
  for (const syl of syllables) {
    // 找到第一个元音位置
    let vowelPos = -1;
    for (let i = 0; i < syl.length; i++) {
      if (isVowel(syl[i])) {
        vowelPos = i;
        break;
      }
    }
    if (vowelPos >= 0) {
      rimes.push(syl.slice(vowelPos));
    } else {
      rimes.push(syl); // 没有元音的音节（极少）
    }
  }
  return rimes.join('_');
}

// ===== 4. 提取尾音 end_sound =====
function extractEndSound(syllables) {
  if (syllables.length === 0) return '';
  const lastSyl = syllables[syllables.length - 1];
  
  let lastVowelPos = -1;
  for (let i = lastSyl.length - 1; i >= 0; i--) {
    if (isVowel(lastSyl[i])) {
      lastVowelPos = i;
      break;
    }
  }
  
  if (lastVowelPos === -1) return lastSyl;
  return lastSyl.slice(lastVowelPos + 1);
}

// ===== 完整分解 =====
function decomposeName(name) {
  const syllables = splitSyllables(name);
  
  if (syllables.length === 0) {
    return { syllables: 0, startSound: '', middleSound: '', endSound: '', pattern: '' };
  }
  
  const syllableCount = syllables.length;
  const startSound = extractStartSound(syllables);
  const middleSound = extractMiddleSound(syllables);
  const endSound = extractEndSound(syllables);
  const pattern = `${syllableCount}_${startSound}_${middleSound}_${endSound}`;
  
  return { syllables: syllableCount, startSound, middleSound, endSound, pattern, rawSyllables: syllables };
}

// ===== 测试函数 =====
function testDecomposition() {
  const testNames = [
    'Gordon', 'Jason', 'David', 'Daniel', 'Jack', 
    'Charles', 'Thomas', 'Brian', 'Mike', 'Grace',
    'Steven', 'Gary', 'Gavin', 'Garrett', 'Gerald',
    'Lily', 'Linda', 'Lincoln', 'Lilith', 'Levi',
    'Alice', 'Bob', 'Catherine', 'Edward', 'Frank',
    'George', 'Henry', 'Ivan', 'Julia', 'Kevin',
    'Leo', 'Mary', 'Nancy', 'Oscar', 'Paul',
    'Queen', 'Robert', 'Sam', 'Tom', 'Uma',
    'Victor', 'Wendy', 'Xavier', 'Yvonne', 'Zoe',
    'Aaron', 'Abbey', 'Able', 'Brianna', 'Christopher',
    'Christina', 'Elizabeth', 'Jonathan', 'Katherine',
    'Margaret', 'Nathaniel', 'Nicholas', 'Alexander',
    'Benjamin', 'Christian', 'Dominic', 'Emmanuel',
    'Frederick', 'Gregory', 'Harrison', 'Jefferson',
    'Kimberly', 'Leonardo', 'Maximilian', 'Nathan',
    'Roberto', 'Sebastian', 'Theodore', 'Valentine',
    'William', 'Zachary',
    // 与中文名guoguang比较的测试
    'Gary', 'Gavin', 'Grant', 'Glen', 'Glenn',
    'Graham', 'Greg', 'Griffin', 'Grover', 'Gunner',
    'Guthrie', 'Guy', 'Gordon',
  ];
  
  console.log('=== 测试分解结果 ===');
  console.log('格式：名字 → 音节数_开头音_中间音_尾音');
  console.log('');
  for (const name of testNames) {
    const result = decomposeName(name);
    console.log(`${name.padEnd(20)} → ${result.pattern.padEnd(30)}  [音节: ${result.rawSyllables ? result.rawSyllables.join('·') : '?'}]`);
  }
  
  console.log('\n');
  console.log('=== 与中文名对照测试 ===');
  const chineseTests = [
    { name: '国光(guoguang)', pinyin: 'guoguang', expected: '2_g_uo_uang_ng' },
    { name: '张伟(zhangwei)', pinyin: 'zhangwei', expected: '2_zh_ang_ei_ng' },
    { name: '李明(liming)', pinyin: 'liming', expected: '2_l_i_ing_ng' },
    { name: '王芳(wangfang)', pinyin: 'wangfang', expected: '2_w_ang_ang_ng' },
    { name: '刘洋(liuyang)', pinyin: 'liuyang', expected: '2_l_iu_iang_ng' },
  ];
  
  console.log('中文拼音音节分解:');
  for (const ct of chineseTests) {
    const result = decomposeName(ct.pinyin);
    const match = result.pattern === ct.expected ? '✓' : '✗';
    console.log(`  ${ct.name.padEnd(30)} → ${result.pattern.padEnd(25)} ${match} (期望: ${ct.expected})`);
  }
  
  console.log('\n英文名与 guoguang (2_g_uo_uang_ng) 匹配:');
  for (const name of testNames) {
    const result = decomposeName(name);
    if (result.syllables === 2 && result.startSound === 'g') {
      console.log(`  ${name.padEnd(20)} → ${result.pattern}`);
    }
  }
}

// ===== 批量更新数据库 =====
async function updateDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('连接数据库...');
    
    // 检查表结构
    const tableInfo = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name='ename_dict' ORDER BY ordinal_position
    `);
    console.log('当前 ename_dict 表字段:');
    for (const col of tableInfo.rows) {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    }
    
    // 添加缺失字段
    const existingCols = new Set(tableInfo.rows.map(r => r.column_name));
    
    const alterCmds = [
      { name: 'syllables', col: 'syllables', type: 'INTEGER' },
      { name: 'start_sound', col: 'start_sound', type: 'VARCHAR(20)' },
      { name: 'middle_sound', col: 'middle_sound', type: 'VARCHAR(60)' },
      { name: 'end_sound', col: 'end_sound', type: 'VARCHAR(10)' },
      { name: 'pattern_key', col: 'pattern_key', type: 'VARCHAR(80)' },
    ];
    
    for (const cmd of alterCmds) {
      if (!existingCols.has(cmd.col)) {
        console.log(`添加 ${cmd.col} 字段...`);
        await client.query(`ALTER TABLE ename_dict ADD COLUMN ${cmd.col} ${cmd.type}`);
      }
    }
    
    // 获取所有英文名
    console.log('\n获取所有英文名...');
    const names = await client.query(`SELECT id, english_name FROM ename_dict ORDER BY id`);
    console.log(`共 ${names.rows.length} 个英文名`);
    
    let updated = 0;
    let errors = 0;
    let errorDetails = [];
    
    for (const row of names.rows) {
      try {
        const result = decomposeName(row.english_name);
        await client.query(
          `UPDATE ename_dict SET 
             syllables = $1,
             start_sound = $2,
             middle_sound = $3,
             end_sound = $4,
             pattern_key = $5
           WHERE id = $6`,
          [result.syllables, result.startSound, result.middleSound, result.endSound, result.pattern, row.id]
        );
        updated++;
        
        if (updated % 500 === 0) {
          console.log(`已更新 ${updated}/${names.rows.length}...`);
        }
      } catch (err) {
        errors++;
        errorDetails.push(`${row.english_name}: ${err.message}`);
      }
    }
    
    console.log(`\n=== 更新完成 ===`);
    console.log(`总记录: ${names.rows.length}`);
    console.log(`更新成功: ${updated}`);
    console.log(`更新失败: ${errors}`);
    
    if (errorDetails.length > 0) {
      console.log('\n错误详情（前10条）:');
      errorDetails.slice(0, 10).forEach(e => console.log(`  ${e}`));
    }
    
    // 显示样本
    console.log('\n=== 样本数据验证（前50条）===');
    const samples = await client.query(
      `SELECT english_name, syllables, start_sound, middle_sound, end_sound, pattern_key 
       FROM ename_dict ORDER BY id LIMIT 50`
    );
    for (const r of samples.rows) {
      console.log(`  ${r.english_name.padEnd(25)} → ${r.pattern_key}`);
    }
    
    // 匹配测试：guoguang
    console.log('\n=== 与 guoguang(2_g_uo_uang_ng) 匹配测试 ===');
    const matchTest = await client.query(
      `SELECT english_name, pattern_key
       FROM ename_dict
       WHERE syllables = 2 AND start_sound = 'g'
       ORDER BY
         similarity(middle_sound, 'uo_uang') * 1.5
         + similarity(end_sound, 'ng')
       DESC
       LIMIT 15`
    );
    console.log('guoguang → 2_g_uo_uang_ng');
    for (const r of matchTest.rows) {
      const midSim = await client.query(`SELECT similarity($1, 'uo_uang') as sim`, [r.pattern_key.split('_')[2]]);
      const endPart = r.pattern_key.split('_').slice(-1)[0];
      const endSim = await client.query(`SELECT similarity($1, 'ng') as sim`, [endPart]);
      console.log(`  ${r.english_name.padEnd(20)} → ${r.pattern_key.padEnd(30)}  (mid=${midSim.rows[0].sim.toFixed(3)}, end=${endSim.rows[0].sim.toFixed(3)})`);
    }
    
    // 索引优化
    console.log('\n=== 创建索引 ===');
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_ename_dict_syllables_start ON ename_dict(syllables, start_sound)`,
      `CREATE INDEX IF NOT EXISTS idx_ename_dict_pattern ON ename_dict(pattern_key)`,
    ];
    for (const idx of indexes) {
      await client.query(idx);
      console.log(`  索引创建完成: ${idx.slice(0, 60)}...`);
    }
    
  } catch (err) {
    console.error('数据库操作失败:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

// ===== 主入口 =====
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test') || args.includes('-t')) {
    testDecomposition();
    await pool.end();
    return;
  }
  
  if (args.includes('--dry-run') || args.includes('-d')) {
    console.log('=== 干运行模式 ===\n');
    testDecomposition();
    await pool.end();
    return;
  }
  
  console.log('=== 开始批量更新英文名字典音节结构 ===');
  console.log('使用 --test 参数仅测试而不更新数据库\n');
  await updateDatabase();
}

main().catch(err => {
  console.error('主程序异常:', err);
  pool.end();
  process.exit(1);
});