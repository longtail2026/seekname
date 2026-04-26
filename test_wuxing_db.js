const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. wuxing_characters 表总数 ===');
  const wcCount = await prisma.wuxingCharacter.count();
  console.log(`总数: ${wcCount}`);

  console.log('\n=== 2. wuxing_characters 五行分布 ===');
  const wcGroups = await prisma.wuxingCharacter.groupBy({
    by: ['wuxing'],
    _count: true,
    orderBy: { _count: { id: 'desc' } }
  });
  console.log(JSON.stringify(wcGroups, null, 2));

  console.log('\n=== 3. wuxing_characters 数据示例 ===');
  const wcSamples = await prisma.wuxingCharacter.findMany({ take: 20 });
  console.log(JSON.stringify(wcSamples, null, 2));

  console.log('\n=== 4. kangxi_dict 五行字段统计 ===');
  // 使用原始查询
  const kdCount = await prisma.$queryRawUnsafe(`
    SELECT wuxing, COUNT(*) AS cnt 
    FROM kangxi_dict 
    WHERE wuxing IS NOT NULL AND wuxing != ''
    GROUP BY wuxing 
    ORDER BY cnt DESC
  `);
  console.log(JSON.stringify(kdCount, null, 2));

  console.log('\n=== 5. kangxi_dict 五行数据示例 (五行常见字) ===');
  const kdSamples = await prisma.$queryRawUnsafe(`
    SELECT character, pinyin, wuxing, stroke_count 
    FROM kangxi_dict 
    WHERE wuxing IN ('木','火','土','金','水')
    ORDER BY wuxing, stroke_count
    LIMIT 20
  `);
  console.log(JSON.stringify(kdSamples, null, 2));

  console.log('\n=== 6. 数据库中所有表 ===');
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema='public' ORDER BY table_name
  `);
  console.log(JSON.stringify(tables, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());