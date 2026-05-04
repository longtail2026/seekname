const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const db = await client.query('SELECT current_database(), current_schema()');
    console.log('Connected to:', db.rows[0].current_database, 'schema:', db.rows[0].current_schema);
    
    // Check ename_dict_data columns
    const cols = await client.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'ename_dict_data' ORDER BY ordinal_position"
    );
    console.log('\n=== ename_dict_data columns ===');
    cols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type}) nullable=${c.is_nullable} default=${c.column_default}`));
    
    // Get sample data
    const sample = await client.query('SELECT * FROM ename_dict_data LIMIT 3');
    console.log('\n=== Sample rows ===');
    console.log(JSON.stringify(sample.rows, null, 2));
    
    // Count
    const cnt = await client.query('SELECT COUNT(*) FROM ename_dict_data');
    console.log('\nTotal rows:', cnt.rows[0].count);
    
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