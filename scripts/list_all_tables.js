const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Tables in public:');
    r.rows.forEach(t => console.log('  -', t.table_name));
    
    // Also search for ename related
    const e = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%ename%'");
    if (e.rows.length > 0) {
      console.log('\nTables matching "%ename%":');
      e.rows.forEach(t => console.log('  -', t.table_name));
    } else {
      console.log('\nNo tables matching "ename"');
    }
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