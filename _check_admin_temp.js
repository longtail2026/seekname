import pkg from 'pg';
const { Client } = pkg;
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
});
client.connect().then(async () => {
  const res = await client.query("SELECT id, email, name, admin_role, status FROM users WHERE email='seekname@163.com' OR email='admin@seekname.cn'");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}).catch(e => console.error(e.message));
process.on('exit', () => {});