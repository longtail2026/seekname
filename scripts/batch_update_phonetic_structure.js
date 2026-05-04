/**
 * 快速批量更新 ename_dict 音节结构字段
 * 使用 UNNEST 批量更新，每个批次500条
 * 
 * 运行：node scripts/batch_update_phonetic_structure.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// ===== 音节分解引擎 =====
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

function isVowel(ch) {
  return VOWELS.has(ch);
}

const LEGAL_ONSETS = new Set([
  'b', 'bl', 'br', 'c', 'ch', 'cl', 'cr', 'd', 'dr', 'f', 'fl', 'fr',
  'g', 'gh', 'gl', 'gn', 'gr', 'h', 'j', 'k', 'kh', 'kn', 'l',
  'm', 'n', 'p', 'ph', 'pl', 'pn', 'pr', 'ps', 'qu',
  'r', 's', 'sc', 'sch', 'scr', 'sh', 'shr', 'sk', 'sl', 'sm', 'sn',
  'sp', 'spl', 'spr', 'sq', 'st', 'str', 'sw', 't', 'th', 'tr', 'tw',
  'v', 'w', 'wh', 'wr', 'x', 'y', 'z', 'zh',
]);

function isLegalOnset(c) {
  return LEGAL_ONSETS.has(c);
}

// 分割音节
function splitSyllables(name) {
  const s = name.toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return [];
  const chars = [...s];

  // 1. 找出所有元音组
  const vowelGroups = [];
  let inVowel = false;
  let start = -1;
  for (let i = 0; i < chars.length; i++) {
    if (isVowel(chars[i])) {
      if (!inVowel) { start = i; inVowel = true; }
    } else {
      if (inVowel) { vowelGroups.push([start, i - 1]); inVowel = false; }
    }
  }
  if (inVowel) vowelGroups.push([start, chars.length - 1]);
  if (vowelGroups.length === 0) return [s];

  // 2. 为每个元音组分配辅音
  const segments = [];
  for (let i = 0; i < vowelGroups.length; i++) {
    const [vStart, vEnd] = vowelGroups[i];
    let segEnd;
    if (i < vowelGroups.length - 1) {
      const nextVStart = vowelGroups[i + 1][0];
      const middleCons = chars.slice(vEnd + 1, nextVStart).join('');
      let splitPos = 0;
      // Maximal Onset: 尽可能多的辅音给后一个音节
      for (let j = middleCons.length; j >= 0; j--) {
        if (isLegalOnset(middleCons.slice(j))) {
          splitPos = j;
          break;
        }
      }
      segEnd = vEnd + splitPos;
    } else {
      segEnd = chars.length - 1;
    }
    const segStart = i === 0 ? 0 : segments[i - 1].end + 1;
    segments.push({ start: segStart, end: Math.max(segStart, segEnd) });
  }

  return segments.map(seg => chars.slice(seg.start, seg.end + 1).join(''));
}

// 提取开头音
function extractStartSound(syllables) {
  if (!syllables.length) return '';
  const first = syllables[0];
  let s = '';
  for (const ch of first) {
    if (isVowel(ch)) break;
    s += ch;
  }
  return s;
}

// 提取中间韵母
function extractMiddleSound(syllables) {
  const rimes = [];
  for (const syl of syllables) {
    let vPos = -1;
    for (let i = 0; i < syl.length; i++) {
      if (isVowel(syl[i])) { vPos = i; break; }
    }
    rimes.push(vPos >= 0 ? syl.slice(vPos) : syl);
  }
  return rimes.join('_');
}

// 提取尾音
function extractEndSound(syllables) {
  if (!syllables.length) return '';
  const last = syllables[syllables.length - 1];
  for (let i = last.length - 1; i >= 0; i--) {
    if (isVowel(last[i])) return last.slice(i + 1);
  }
  return last;
}

// 完整分解
function decomposeName(name) {
  const syllables = splitSyllables(name);
  if (!syllables.length) {
    return { syllables: 0, startSound: '', middleSound: '', endSound: '', pattern: '' };
  }
  const sc = syllables.length;
  const st = extractStartSound(syllables);
  const md = extractMiddleSound(syllables);
  const ed = extractEndSound(syllables);
  return {
    syllables: sc,
    startSound: st,
    middleSound: md,
    endSound: ed,
    pattern: `${sc}_${st}_${md}_${ed}`
  };
}

// ===== 批量更新数据库 =====
async function batchUpdate() {
  const client = await pool.connect();
  
  try {
    // 确认字段存在
    const cols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='ename_dict'"
    );
    const colNames = new Set(cols.rows.map(r => r.column_name));
    
    const addCols = [
      ['syllables', 'INTEGER'],
      ['start_sound', 'VARCHAR(20)'],
      ['middle_sound', 'VARCHAR(60)'],
      ['end_sound', 'VARCHAR(10)'],
      ['pattern_key', 'VARCHAR(80)'],
    ];
    for (const [name, type] of addCols) {
      if (!colNames.has(name)) {
        console.log(`添加字段: ${name}`);
        await client.query(`ALTER TABLE ename_dict ADD COLUMN IF NOT EXISTS ${name} ${type}`);
      }
    }
    
    // 获取所有名字
    const names = await client.query('SELECT id, english_name FROM ename_dict ORDER BY id');
    const total = names.rows.length;
    console.log(`总记录: ${total}`);
    
    // 预计算所有分解结果
    const results = names.rows.map(r => ({
      id: r.id,
      ...decomposeName(r.english_name)
    }));
    console.log('分解计算完成');
    
    // 批量更新
    const BATCH = 500;
    let updated = 0;
    
    for (let i = 0; i < total; i += BATCH) {
      const batch = results.slice(i, i + BATCH);
      const ids = batch.map(r => r.id);
      const sylvs = batch.map(r => r.syllables);
      const starts = batch.map(r => r.startSound);
      const mids = batch.map(r => r.middleSound);
      const ends = batch.map(r => r.endSound);
      const patts = batch.map(r => r.pattern);
      
      await client.query(
        `UPDATE ename_dict SET
           syllables = data.s,
           start_sound = data.st,
           middle_sound = data.md,
           end_sound = data.ed,
           pattern_key = data.pk
         FROM (
           SELECT
             UNNEST($1::int[]) as id,
             UNNEST($2::int[]) as s,
             UNNEST($3::varchar[]) as st,
             UNNEST($4::varchar[]) as md,
             UNNEST($5::varchar[]) as ed,
             UNNEST($6::varchar[]) as pk
         ) AS data
         WHERE ename_dict.id = data.id`,
        [ids, sylvs, starts, mids, ends, patts]
      );
      
      updated += batch.length;
      console.log(`  已更新 ${updated}/${total}`);
    }
    
    // 验证
    const cnt = await client.query("SELECT COUNT(*) FROM ename_dict WHERE pattern_key IS NOT NULL");
    console.log(`\n✓ 更新完成！已填充: ${cnt.rows[0].count}/${total}`);
    
    // 样本
    console.log('\n样本数据:');
    const samples = await client.query(
      "SELECT english_name, pattern_key FROM ename_dict WHERE pattern_key IS NOT NULL ORDER BY id LIMIT 10"
    );
    samples.rows.forEach(r => console.log(`  ${r.english_name.padEnd(20)} → ${r.pattern_key}`));
    
    // 创建索引
    console.log('\n创建索引...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ename_dict_syllables_start ON ename_dict(syllables, start_sound)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ename_dict_pattern ON ename_dict(pattern_key)');
    console.log('✓ 索引创建完成');
    
  } catch (err) {
    console.error('错误:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

batchUpdate();