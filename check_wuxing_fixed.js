const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function checkWuxingData() {
  console.log('检查五行数据...');
  
  const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/seekname_db?schema=public";
  
  // 创建 pg 连接池
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  // 创建 Prisma adapter
  const adapter = new PrismaPg(pool);
  
  const prisma = new PrismaClient({
    adapter,
    log: ["error"]
  });
  
  try {
    // 检查康熙字典表中的五行数据
    const kangxiSamples = await prisma.kangxiDict.findMany({
      take: 10,
      select: { character: true, wuxing: true }
    });
    
    console.log('康熙字典五行样本:');
    kangxiSamples.forEach(item => {
      console.log(`  ${item.character}: ${item.wuxing || '空'}`);
    });
    
    // 检查五行字组表中的数据
    const wuxingSamples = await prisma.wuxingCharacter.findMany({
      take: 10,
      select: { character: true, wuxing: true }
    });
    
    console.log('\n五行字组样本:');
    wuxingSamples.forEach(item => {
      console.log(`  ${item.character}: ${item.wuxing || '空'}`);
    });
    
    // 统计五行值的分布
    const wuxingStats = await prisma.kangxiDict.groupBy({
      by: ['wuxing'],
      _count: true,
      where: { wuxing: { not: null } }
    });
    
    console.log('\n五行值分布统计:');
    wuxingStats.forEach(stat => {
      console.log(`  ${stat.wuxing}: ${stat._count} 条记录`);
    });
    
    // 检查非标准五行值
    console.log('\n检查非标准五行值...');
    const allWuxing = await prisma.kangxiDict.findMany({
      where: { wuxing: { not: null } },
      select: { wuxing: true },
      distinct: ['wuxing']
    });
    
    console.log('所有五行值:');
    allWuxing.forEach(item => {
      console.log(`  "${item.wuxing}"`);
    });
    
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWuxingData();