const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});
async function main() {
  const client = await pool.connect();
  try {
    // Check ename_dict columns
    const cols = await client.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'ename_dict' ORDER BY ordinal_position"
    );
    console.log('=== ename_dict columns ===');
    cols.rows.forEach(c => console.log(' ', c.column_name, '-', c.data_type, 'nullable:', c.is_nullable));
    
    const cnt = await client.query('SELECT COUNT(*) FROM ename_dict');
    console.log('\nTotal rows:', cnt.rows[0].count);
    
    const sample = await client.query('SELECT * FROM ename_dict LIMIT 3');
    console.log('\n=== Sample rows ===');
    console.log(JSON.stringify(sample.rows, null, 2));
    
    // Specifically check for syllable/phone fields
    console.log('\n=== Checking for syllable/phonetic fields ===');
    const phoneCols = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ename_dict' AND (column_name LIKE '%syllable%' OR column_name LIKE '%phone%' OR column_name LIKE '%phonetic%' OR column_name LIKE '%structure%' OR column_name LIKE '%pronounce%')"
    );
    phoneCols.rows.forEach(c => console.log('  FOUND:', c.column_name, c.data_type));
    if (phoneCols.rows.length === 0) console.log('  No syllable/phonetic fields found');
    
    // Also check ename-phonetic-structure table if exists
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%ename%' OR table_name LIKE '%phone%'");
    console.log('\n=== All ename/phonetic related tables ===');
    tables.rows.forEach(t => console.log(' ', t.table_name));
    
  } finally { client.release(); }
  await pool.end();
}
main().catch(err => { console.error('FATAL:', err); pool.end(); });