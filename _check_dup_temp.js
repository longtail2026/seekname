const { Client } = require('pg');
const c = new Client('postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
c.connect().then(async () => {
  const r1 = await c.query('SELECT COUNT(*) as total, COUNT(DISTINCT english_name) as distinct_names, COUNT(embedding) as vec_cnt FROM ename_dict');
  console.log('Stats:', r1.rows[0]);
  const r2 = await c.query("SELECT english_name, COUNT(*) as cnt FROM ename_dict GROUP BY english_name HAVING COUNT(*) > 1 ORDER BY cnt DESC LIMIT 20");
  console.log('Duplicates:', JSON.stringify(r2.rows));
  const r3 = await c.query("SELECT DISTINCT english_name FROM ename_dict ORDER BY english_name");
  console.log('Distinct names count:', r3.rows.length);
  c.end();
});