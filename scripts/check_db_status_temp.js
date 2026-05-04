const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});
async function main() {
  const client = await pool.connect();
  try {
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('所有表:', tables.rows.map(r => r.table_name).join(', '));

    const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='ename_dict' ORDER BY ordinal_position");
    console.log('\nename_dict 字段:');
    cols.rows.forEach(c => console.log('  ' + c.column_name + ': ' + c.data_type));

    const cnt = await client.query("SELECT COUNT(*) as c FROM ename_dict WHERE pattern_key IS NOT NULL");
    const total = await client.query("SELECT COUNT(*) as c FROM ename_dict");
    console.log('\n已填充 pattern_key:', cnt.rows[0].c + '/' + total.rows[0].c);

    // 检查 start_sound 为空的数量
    const emptyStart = await client.query("SELECT COUNT(*) as c FROM ename_dict WHERE pattern_key IS NOT NULL AND (start_sound IS NULL OR start_sound = '')");
    console.log('start_sound 为空:', emptyStart.rows[0].c);

    // 样本
    const samples = await client.query("SELECT english_name, pattern_key FROM ename_dict WHERE pattern_key IS NOT NULL ORDER BY id LIMIT 5");
    console.log('\n样本:');
    samples.rows.forEach(r => console.log('  ' + (r.english_name || '') + ' -> ' + (r.pattern_key || '')));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(e => { console.error(e); pool.end(); });