const fs = require('fs');
const { Pool } = require('pg');

async function main() {
  try {
    const data = fs.readFileSync('ename_dict_with_meaning.csv', 'utf-8');
    const lines = data.trim().split('\n').slice(1); // skip header
    const records = lines.map(l => {
      const parts = l.split(',');
      return { ename: parts[0].trim(), cname: parts[1]?.trim() || '' };
    });
    console.log('Total CSV records:', records.length);
    
    const pool = new Pool({
      connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      ssl: { rejectUnauthorized: false }
    });
    const client = await pool.connect();
    
    const result = await client.query('SELECT ename FROM ename_dict');
    const existing = new Set(result.rows.map(r => r.ename.toLowerCase()));
    console.log('Existing in DB:', existing.size);
    
    const missing = records.filter(r => !existing.has(r.ename.toLowerCase()));
    console.log('Missing records:', missing.length);
    if (missing.length > 0) {
      console.log('Sample missing:', missing.slice(0, 5).map(r => r.ename).join(', '));
    }
    
    client.release();
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  }
}

main();