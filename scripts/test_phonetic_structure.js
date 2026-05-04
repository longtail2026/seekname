/**
 * 验证读音结构匹配效果
 * 测试中文名拼音音节分解后与英文名字典的匹配
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  const client = await pool.connect();
  await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // 模拟中文名拼音音节分解后的结果
  // guoguang: 2_g_uo_ang_ng
  // liming: 2_l_i_i_ng
  // zhangwei: 2_zh_a_ei_ng
  // wangming: 2_w_a_i_ng
  
  const tests = [
    { label: 'guoguang (国光)', syllable: 2, start: 'g', mid: 'uo_ang', end: 'ng' },
    { label: 'liming (黎明)', syllable: 2, start: 'l', mid: 'i_i', end: 'ng' },
    { label: 'zhangwei (张伟)', syllable: 2, start: 'zh', mid: 'a_ei', end: 'ng' },
    { label: 'wangming (王明)', syllable: 2, start: 'w', mid: 'a_i', end: 'ng' },
    { label: 'haoyun (好运)', syllable: 2, start: 'h', mid: 'ao_uen', end: 'n' },
  ];

  for (const t of tests) {
    console.log(`\n=== ${t.label} (${t.syllable}_${t.start}_${t.mid}_${t.end}) ===`);
    
    // 用引号括起 end_sound 避免SQL保留字冲突
    const sql = `SELECT english_name, syllables, start_sound, "end_sound", middle_sound 
                 FROM ename_dict 
                 WHERE syllables = $1 AND start_sound = $2 
                 ORDER BY similarity(middle_sound, $3) DESC, similarity("end_sound", $4) DESC 
                 LIMIT 15`;
    
    const res = await client.query(sql, [t.syllable, t.start, t.mid, t.end]);
    
    if (res.rows.length === 0) {
      console.log('  (no exact syllable/start match)');
      // 放宽条件：只匹配音节数和开头音
      const sql2 = `SELECT english_name, syllables, start_sound, "end_sound", middle_sound 
                    FROM ename_dict 
                    WHERE syllables = $1 
                    ORDER BY similarity(start_sound, $2) DESC, similarity(middle_sound, $3) DESC 
                    LIMIT 10`;
      const res2 = await client.query(sql2, [t.syllable, t.start, t.mid]);
      res2.rows.forEach(r => {
        console.log(`  ${r.english_name.padEnd(20)} → ${r.syllables}_${r.start_sound}_${r.middle_sound}_${r.end_sound}`);
      });
    } else {
      res.rows.forEach(r => {
        console.log(`  ${r.english_name.padEnd(20)} → ${r.syllables}_${r.start_sound}_${r.middle_sound}_${r.end_sound}`);
      });
    }
  }

  // 展示数据库中的一些样本数据
  console.log('\n\n=== 数据库中部分样本数据 ===');
  const samples = await client.query(
    `SELECT english_name, syllables, start_sound, middle_sound, "end_sound" 
     FROM ename_dict 
     WHERE syllables = 2 
     ORDER BY id LIMIT 20`
  );
  samples.rows.forEach(r => {
    console.log(`  ${r.english_name.padEnd(20)} → ${r.syllables}_${r.start_sound}_${r.middle_sound}_${r.end_sound}`);
  });

  client.release();
  await pool.end();
}

test().catch(e => {
  console.error(e);
  pool.end();
  process.exit(1);
});