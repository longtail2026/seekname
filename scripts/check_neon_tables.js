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
    
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Tables in public:');
    tables.rows.forEach(r => console.log('  -', r.table_name));
    
    // also check all schemas
    const all = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name ILIKE '%naming%' OR table_name ILIKE '%material%'");
    if (all.rows.length > 0) {
      console.log('\nTables matching naming/material:');
      all.rows.forEach(r => console.log('  ', r.table_schema + '.' + r.table_name));
    } else {
      console.log('\nNo tables matching "naming" or "material" found in any schema');
    }
    
    // check naming_classics table
    const nc = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'naming_classics'");
    if (nc.rows.length > 0) {
      console.log('\nnaming_classics table FOUND');
      const count = await client.query('SELECT COUNT(*) FROM naming_classics');
      console.log('  rows:', count.rows[0].count);
    } else {
      console.log('\nnaming_classics table NOT FOUND');
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