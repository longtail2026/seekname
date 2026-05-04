const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const r = await pool.query(`SELECT COUNT(*) as total, COUNT(pattern_key) as filled, COUNT(NULLIF(syllables,0)) as has_syl, COUNT(start_sound) as has_start, COUNT(middle_sound) as has_mid, COUNT(end_sound) as has_end FROM ename_dict`);
    console.log(JSON.stringify(r.rows[0], null, 2));
    
    const empty = await pool.query(`SELECT english_name FROM ename_dict WHERE pattern_key IS NULL ORDER BY id LIMIT 5`);
    console.log('\npattern_key为空的样本:');
    empty.rows.forEach(r => console.log(`  ${r.english_name}`));
    
    const samples = await pool.query(`SELECT english_name, pattern_key FROM ename_dict WHERE pattern_key IS NOT NULL ORDER BY id LIMIT 10`);
    console.log('\n已填充的样本:');
    samples.rows.forEach(r => console.log(`  ${r.english_name.padEnd(20)} → ${r.pattern_key}`));
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();