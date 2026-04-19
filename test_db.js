const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require',
});

async function main() {
  // 查询木行字
  const result1 = await pool.query('SELECT name_char FROM name_wuxing WHERE wuxing = $1 LIMIT 5', ['木']);
  console.log('木行字:', result1.rows);

  // 查询水行字
  const result2 = await pool.query('SELECT name_char FROM name_wuxing WHERE wuxing = $1 LIMIT 5', ['水']);
  console.log('水行字:', result2.rows);

  // 查询所有木行字数量
  const result3 = await pool.query('SELECT COUNT(*) FROM name_wuxing WHERE wuxing = $1', ['木']);
  console.log('木行字总数:', result3.rows);

  await pool.end();
}

main().catch(console.error);
