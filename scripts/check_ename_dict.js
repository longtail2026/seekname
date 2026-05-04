const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // Columns
    const cols = await client.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'ename_dict' ORDER BY ordinal_position");
    console.log('=== ename_dict columns ===');
    cols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type}) nullable=${c.is_nullable} default=${c.column_default}`));

    // Sample data
    const sample = await client.query('SELECT * FROM ename_dict LIMIT 5');
    console.log('\n=== Sample rows ===');
    sample.rows.forEach((r, i) => console.log(`Row ${i}:`, JSON.stringify(r)));

    // Count
    const cnt = await client.query('SELECT COUNT(*) FROM ename_dict');
    console.log('\nTotal rows:', cnt.rows[0].count);

    // Check existing indexes
    const idx = await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ename_dict'");
    console.log('\n=== Indexes ===');
    idx.rows.forEach(i => console.log(`  ${i.indexname}: ${i.indexdef}`));

  } finally {
    client.release();
  }
  await pool.end();
}

main().catch(err => {
  console.error('FATAL:', err);
  pool.end();
  process.exit(1);
});