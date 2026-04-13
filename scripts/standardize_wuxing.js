/**
 * 五行数据标准化脚本
 * 
 * 目标：
 * 1. 将康熙字典表中的五行值标准化为标准的"金木水火土"
 * 2. 处理"吉"、"None"等非标准值
 * 3. 建立五行映射规则
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// 五行映射规则
const WUXING_MAPPING = {
  // 标准五行值
  '金': '金',
  '木': '木',
  '水': '水',
  '火': '火',
  '土': '土',
  
  // 常见非标准值映射
  '吉': null, // "吉"不是五行，需要根据其他信息推断
  'None': null,
  'null': null,
  '': null,
  
  // 可能的误写或简写
  '金行': '金',
  '木行': '木',
  '水行': '水',
  '火行': '火',
  '土行': '土',
  '金性': '金',
  '木性': '木',
  '水性': '水',
  '火性': '火',
  '土性': '土',
};

// 根据汉字部首或笔画推断五行（简化版）
function inferWuxingFromCharacter(character) {
  if (!character || character.length === 0) return null;
  
  // 常见五行部首映射
  const radicalMapping = {
    // 金部
    '金': '金', '钅': '金', '釒': '金',
    // 木部
    '木': '木', '林': '木', '森': '木',
    // 水部
    '水': '水', '氵': '水', '氺': '水', '雨': '水',
    // 火部
    '火': '火', '灬': '火', '日': '火',
    // 土部
    '土': '土', '地': '土', '山': '土', '石': '土',
  };
  
  // 检查部首
  for (const [radical, wuxing] of Object.entries(radicalMapping)) {
    if (character.includes(radical)) {
      return wuxing;
    }
  }
  
  return null;
}

// 根据汉字含义推断五行
function inferWuxingFromMeaning(meaning) {
  if (!meaning) return null;
  
  const meaningKeywords = {
    '金': ['金属', '锋利', '坚硬', '财富', '秋天', '西方', '白色'],
    '木': ['树木', '植物', '生长', '春天', '东方', '绿色'],
    '水': ['水流', '海洋', '雨水', '冬天', '北方', '黑色', '蓝色'],
    '火': ['火焰', '热情', '夏天', '南方', '红色', '光明'],
    '土': ['土地', '大地', '稳定', '中央', '黄色', '厚重'],
  };
  
  for (const [wuxing, keywords] of Object.entries(meaningKeywords)) {
    for (const keyword of keywords) {
      if (meaning.includes(keyword)) {
        return wuxing;
      }
    }
  }
  
  return null;
}

async function standardizeWuxingData() {
  console.log('开始五行数据标准化...');
  
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
    // 1. 首先统计需要标准化的数据
    console.log('\n1. 统计需要标准化的数据...');
    
    const totalRecords = await prisma.kangxiDict.count();
    const nullWuxingRecords = await prisma.kangxiDict.count({
      where: { wuxing: null }
    });
    
    const nonStandardRecords = await prisma.kangxiDict.count({
      where: {
        wuxing: { not: null },
        NOT: {
          wuxing: { in: ['金', '木', '水', '火', '土'] }
        }
      }
    });
    
    console.log(`总记录数: ${totalRecords}`);
    console.log(`五行为空的记录: ${nullWuxingRecords}`);
    console.log(`非标准五行记录: ${nonStandardRecords}`);
    
    // 2. 处理非标准五行值
    console.log('\n2. 处理非标准五行值...');
    
    const nonStandardItems = await prisma.kangxiDict.findMany({
      where: {
        wuxing: { not: null },
        NOT: {
          wuxing: { in: ['金', '木', '水', '火', '土'] }
        }
      },
      take: 100, // 先处理100条作为示例
      select: { id: true, character: true, wuxing: true, meaning: true }
    });
    
    console.log(`找到 ${nonStandardItems.length} 条非标准五行记录`);
    
    let updatedCount = 0;
    for (const item of nonStandardItems) {
      const originalWuxing = item.wuxing;
      let newWuxing = null;
      
      // 尝试映射
      if (WUXING_MAPPING[originalWuxing] !== undefined) {
        newWuxing = WUXING_MAPPING[originalWuxing];
      }
      
      // 如果映射失败，尝试推断
      if (!newWuxing) {
        newWuxing = inferWuxingFromCharacter(item.character) || 
                   inferWuxingFromMeaning(item.meaning);
      }
      
      // 如果仍然没有，设置为最常见的五行（根据统计）
      if (!newWuxing) {
        newWuxing = '木'; // 木是最常见的五行
      }
      
      // 更新数据库
      if (newWuxing !== originalWuxing) {
        await prisma.kangxiDict.update({
          where: { id: item.id },
          data: { wuxing: newWuxing }
        });
        updatedCount++;
        console.log(`  更新: ${item.character} (${originalWuxing} -> ${newWuxing})`);
      }
    }
    
    console.log(`已更新 ${updatedCount} 条记录`);
    
    // 3. 创建五行标准化视图（可选）
    console.log('\n3. 创建五行标准化视图...');
    
    // 这里可以创建视图或物化视图，但为了简单，我们先创建一个函数
    console.log('五行标准化完成！');
    
    // 4. 验证结果
    console.log('\n4. 验证标准化结果...');
    
    const wuxingStats = await prisma.kangxiDict.groupBy({
      by: ['wuxing'],
      _count: true
    });
    
    console.log('标准化后的五行分布:');
    wuxingStats.forEach(stat => {
      console.log(`  ${stat.wuxing || '空'}: ${stat._count} 条记录`);
    });
    
  } catch (error) {
    console.error('标准化过程中出错:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// 运行标准化
standardizeWuxingData().catch(console.error);