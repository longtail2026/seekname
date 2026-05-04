const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const c = await pool.connect();
  try {
    // 1. 列出所有数据库
    const dbs = await c.query(
      "SELECT datname, pg_database_size(datname) as size_bytes FROM pg_database ORDER BY size_bytes DESC"
    );
    console.log('=== Neon 数据库列表 ===');
    let total = 0;
    for (const r of dbs.rows) {
      const mb = (Number(r.size_bytes) / 1024 / 1024).toFixed(2);
      total += Number(r.size_bytes);
      console.log(r.datname.padEnd(30) + mb.padStart(10) + ' MB');
    }
    console.log('-'.repeat(50));
    console.log('总计'.padEnd(30) + (total / 1024 / 1024).toFixed(2).padStart(10) + ' MB');
    console.log('');

    // 2. 列出当前数据库 (neondb) 中所有用户表及其大小
    const tables = await c.query(`
      SELECT relname as table_name,
             n_live_tup as row_estimate,
             pg_total_relation_size(relid) as total_bytes
      FROM pg_stat_user_tables
      ORDER BY total_bytes DESC
    `);
    console.log('=== 当前数据库 (neondb) 中所有表的大小 ===');
    let tableTotal = 0;
    for (const t of tables.rows) {
      const mb = (Number(t.total_bytes) / 1024 / 1024).toFixed(2);
      tableTotal += Number(t.total_bytes);
      console.log(t.table_name.padEnd(30) + t.row_estimate.toString().padStart(10) + ' 行' + mb.padStart(10) + ' MB');
    }
    console.log('-'.repeat(50));
    console.log('表空间总计'.padEnd(30) + (tableTotal / 1024 / 1024).toFixed(2).padStart(20) + ' MB');
  } finally { c.release(); }
  await pool.end();
}
main().catch(e => { console.error('ERROR:', e); pool.end(); });