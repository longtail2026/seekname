const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Check all tables
    const tables = await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
    );
    console.log('All tables in DB:', tables.map(t => t.table_name).join(', '));

    // Check for ename-related tables
    const enameTables = tables.filter(t => 
      t.table_name.toLowerCase().includes('ename') || 
      t.table_name.toLowerCase().includes('en_name') ||
      t.table_name.toLowerCase().includes('english')
    );
    console.log('English name related tables:', enameTables.map(t => t.table_name));

    // If any found, check their structure and row count
    for (const t of enameTables) {
      const name = t.table_name;
      const cols = await prisma.$queryRawUnsafe(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='${name}' ORDER BY ordinal_position`
      );
      console.log(`\nTable: ${name}`);
      console.log('Columns:', cols.map(c => `${c.column_name}(${c.data_type})`).join(', '));
      
      const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM "${name}"`);
      console.log('Row count:', count[0].cnt);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  await prisma.$disconnect();
}

main();