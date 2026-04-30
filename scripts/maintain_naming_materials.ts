import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check columns
  const columns = await prisma.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'naming_materials' ORDER BY ordinal_position`);
  console.log('=== Columns ===');
  columns.forEach((r: any) => console.log(`${r.column_name} - ${r.data_type}`));
  
  // Check total count
  const count: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM naming_materials`);
  console.log(`\n=== Total rows: ${count[0].cnt} ===`);
  
  // Find entries to delete
  const delList = ['绥和','无恙','奋杰','乐乐','姝丽','坚白','果行','才','让','庄','端','贞固','端庄','肃雍','暤','昍','婀娜','妩媚','嬛嬛','锷','犟','锷锋','禛','禧','祺','禤','禚','禔','禟','禥','禨','禧年','曲'];
  
  console.log('\n=== Searching for entries to DELETE ===');
  for (const term of delList) {
    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT id, term, meaning, wuxing, category FROM naming_materials WHERE term = $1`, term);
    if (rows.length > 0) {
      console.log(`FOUND: id=${rows[0].id}, term=${rows[0].term}, meaning=${rows[0].meaning}, wuxing=${rows[0].wuxing}, category=${rows[0].category}`);
    } else {
      console.log(`NOT FOUND: ${term}`);
    }
  }
  
  // Find entries to update
  console.log('\n=== Searching for entries to UPDATE ===');
  const updateFrom = ['强志', '画意', '琴心'];
  const updateTo = ['志强', '如诗', '艺琴'];
  
  for (let i = 0; i < updateFrom.length; i++) {
    const from = updateFrom[i];
    const to = updateTo[i];
    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT id, term, meaning FROM naming_materials WHERE term = $1`, from);
    if (rows.length > 0) {
      console.log(`FOUND '${from}': id=${rows[0].id}, term=${rows[0].term}, meaning=${rows[0].meaning}`);
    } else {
      console.log(`NOT FOUND '${from}' - also checking if '${to}' already exists...`);
      const existing: any[] = await prisma.$queryRawUnsafe(`SELECT id, term, meaning FROM naming_materials WHERE term = $1`, to);
      if (existing.length > 0) {
        console.log(`  '${to}' already EXISTS: id=${existing[0].id}, term=${existing[0].term}, meaning=${existing[0].meaning}`);
      } else {
        console.log(`  '${to}' does not exist either`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());