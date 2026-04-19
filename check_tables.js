const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/seekname_db' });

async function main() {
  // 查询所有表
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('=== 所有表 ===');
  console.log(tables.rows.map(t => t.table_name).join('\n'));

  // 检查 classics_entries 表
  const hasClassics = tables.rows.some(t => t.table_name === 'classics_entries');
  console.log('\n=== classics_entries 表是否存在 ===');
  console.log(hasClassics ? '是' : '否');

  if (hasClassics) {
    const count = await pool.query("SELECT COUNT(*) as cnt FROM classics_entries");
    console.log('数据量:', count.rows[0].cnt);

    const sample = await pool.query("SELECT * FROM classics_entries LIMIT 2");
    console.log('\n=== 抽样数据 ===');
    console.log(JSON.stringify(sample.rows, null, 2));
  }

  await pool.end();
}

main().catch(e => {
  console.error(e.message);
  pool.end();
});
