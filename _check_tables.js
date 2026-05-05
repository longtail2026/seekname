const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
});
client.connect().then(async () => {
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('Tables:', res.rows.map(x => x.table_name).join(', '));
  await client.end();
}).catch(e => console.error('Error:', e.message));