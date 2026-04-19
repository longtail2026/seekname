const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/seekname_db' });

async function testQuery() {
  // 测试搜索 "才华"
  const result = await pool.query(`
    SELECT id, book_name, ancient_text, modern_text
    FROM classics_entries
    WHERE ancient_text ILIKE '%才华%'
       OR modern_text ILIKE '%才华%'
       OR book_name ILIKE '%才华%'
    LIMIT 3
  `);

  console.log('=== 搜索【才华】结果 ===');
  console.log('数量:', result.rows.length);
  result.rows.forEach(row => {
    console.log(`- ${row.book_name}: ${row.ancient_text?.slice(0, 40)}...`);
  });

  // 测试搜索 "诗意"
  const result2 = await pool.query(`
    SELECT id, book_name, ancient_text, modern_text
    FROM classics_entries
    WHERE ancient_text ILIKE '%诗意%'
       OR modern_text ILIKE '%诗意%'
    LIMIT 3
  `);

  console.log('\n=== 搜索【诗意】结果 ===');
  console.log('数量:', result2.rows.length);
  result2.rows.forEach(row => {
    console.log(`- ${row.book_name}: ${row.ancient_text?.slice(0, 40)}...`);
  });

  await pool.end();
}

testQuery().catch(e => {
  console.error(e.message);
  pool.end();
});
