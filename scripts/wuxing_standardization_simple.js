/**
 * 简化版五行数据标准化脚本
 * 不使用AI，仅使用规则推断
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// 五行映射规则（扩展版）
const WUXING_MAPPING = {
  // 标准五行值
  '金': '金', '木': '木', '水': '水', '火': '火', '土': '土',
  
  // 非标准值映射
  '吉': null, '凶': null, '中': null, '平': null,
  'None': null, 'null': null, 'NULL': null, '': null,
  '无': null, '未知': null, '不详': null,
  
  // 五行简写
  '金行': '金', '木行': '木', '水行': '水', '火行': '火', '土行': '土',
  '金性': '金', '木性': '木', '水性': '水', '火性': '火', '土性': '土',
  '属金': '金', '属木': '木', '属水': '水', '属火': '火', '属土': '土',
  
  // 数字五行（河图洛书）
  '1': '水', '2': '火', '3': '木', '4': '金', '5': '土',
  '6': '水', '7': '火', '8': '木', '9': '金', '10': '土',
  
  // 天干五行
  '甲': '木', '乙': '木', '丙': '火', '丁': '火',
  '戊': '土', '己': '土', '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
  
  // 地支五行
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

// 五行部首映射（更全面）
const RADICAL_WUXING_MAPPING = {
  // 金部
  '金': '金', '钅': '金', '釒': '金',
  // 木部
  '木': '木', '林': '木', '森': '木', '朩': '木',
  // 水部
  '水': '水', '氵': '水', '氺': '水', '雨': '水', '冫': '水',
  // 火部
  '火': '火', '灬': '火', '日': '火', '光': '火', '炎': '火',
  // 土部
  '土': '土', '地': '土', '山': '土', '石': '土', '田': '土',
  // 其他常见部首
  '月': '木', '肉': '木', '艹': '木', '竹': '木',
  '玉': '金', '王': '金', '贝': '金',
  '禾': '木', '米': '木',
  '口': '土', '囗': '土',
  '人': '金', '亻': '金',
  '手': '金', '扌': '金',
  '心': '火', '忄': '火',
  '目': '木', '耳': '水',
};

// 根据汉字部首推断五行
function inferWuxingFromRadical(character) {
  if (!character || character.length === 0) return null;
  
  // 检查每个部首
  for (const [radical, wuxing] of Object.entries(RADICAL_WUXING_MAPPING)) {
    if (character.includes(radical)) {
      return wuxing;
    }
  }
  
  return null;
}

// 根据笔画数推断五行（简化版）
function inferWuxingFromStrokeCount(strokeCount) {
  if (!strokeCount) return null;
  
  // 根据笔画数尾数推断五行
  const lastDigit = strokeCount % 10;
  
  switch (lastDigit) {
    case 1: case 2: return '木'; // 1,2属木
    case 3: case 4: return '火'; // 3,4属火
    case 5: case 6: return '土'; // 5,6属土
    case 7: case 8: return '金'; // 7,8属金
    case 9: case 0: return '水'; // 9,0属水
    default: return null;
  }
}

// 根据汉字含义推断五行
function inferWuxingFromMeaning(meaning) {
  if (!meaning) return null;
  
  const meaningKeywords = {
    '金': ['金属', '锋利', '坚硬', '财富', '秋天', '西方', '白色', '金', '钢', '铁', '铜'],
    '木': ['树木', '植物', '生长', '春天', '东方', '绿色', '木', '林', '森', '草', '花'],
    '水': ['水流', '海洋', '雨水', '冬天', '北方', '黑色', '蓝色', '水', '河', '海', '雨'],
    '火': ['火焰', '热情', '夏天', '南方', '红色', '光明', '火', '炎', '热', '光', '日'],
    '土': ['土地', '大地', '稳定', '中央', '黄色', '厚重', '土', '地', '山', '石', '田'],
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

// 综合推断五行
function inferWuxingComprehensive(item) {
  let wuxing = null;
  
  // 1. 首先检查是否有标准五行值
  if (item.wuxing && WUXING_MAPPING[item.wuxing] !== undefined) {
    wuxing = WUXING_MAPPING[item.wuxing];
    if (wuxing) return wuxing;
  }
  
  // 2. 根据部首推断
  wuxing = inferWuxingFromRadical(item.character);
  if (wuxing) return wuxing;
  
  // 3. 根据笔画数推断
  if (item.strokeCount) {
    wuxing = inferWuxingFromStrokeCount(item.strokeCount);
    if (wuxing) return wuxing;
  }
  
  // 4. 根据含义推断
  if (item.meaning) {
    wuxing = inferWuxingFromMeaning(item.meaning);
    if (wuxing) return wuxing;
  }
  
  // 5. 根据拼音推断（简单规则）
  if (item.pinyin) {
    const pinyin = item.pinyin.toLowerCase();
    // 某些拼音结尾与五行相关
    if (pinyin.includes('jin') || pinyin.includes('qin') || pinyin.includes('xin')) {
      return '金';
    }
    if (pinyin.includes('mu') || pinyin.includes('lin') || pinyin.includes('sen')) {
      return '木';
    }
    if (pinyin.includes('shui') || pinyin.includes('hai') || pinyin.includes('jiang')) {
      return '水';
    }
    if (pinyin.includes('huo') || pinyin.includes('yan') || pinyin.includes('re')) {
      return '火';
    }
    if (pinyin.includes('tu') || pinyin.includes('shan') || pinyin.includes('di')) {
      return '土';
    }
  }
  
  // 6. 默认返回最常见的五行（木）
  return '木';
}

async function standardizeWuxingData() {
  console.log('开始五行数据标准化（简化版）...');
  
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
    // 1. 统计数据分析
    console.log('\n1. 数据统计分析...');
    
    const totalRecords = await prisma.kangxiDict.count();
    
    // 统计五行分布
    const wuxingStats = await prisma.kangxiDict.groupBy({
      by: ['wuxing'],
      _count: true
    });
    
    console.log(`总记录数: ${totalRecords}`);
    console.log('当前五行分布:');
    wuxingStats.forEach(stat => {
      const percentage = ((stat._count / totalRecords) * 100).toFixed(2);
      console.log(`  ${stat.wuxing || '空'}: ${stat._count} (${percentage}%)`);
    });
    
    // 2. 批量处理数据
    console.log('\n2. 批量处理五行数据...');
    
    const batchSize = 1000;
    let processed = 0;
    let updated = 0;
    
    // 获取所有需要处理的数据
    const totalToProcess = await prisma.kangxiDict.count({
      where: {
        OR: [
          { wuxing: null },
          { wuxing: { not: { in: ['金', '木', '水', '火', '土'] } } }
        ]
      }
    });
    
    console.log(`需要处理的总记录数: ${totalToProcess}`);
    
    // 分批处理
    for (let skip = 0; skip < totalToProcess; skip += batchSize) {
      console.log(`\n处理批次: ${skip + 1} - ${Math.min(skip + batchSize, totalToProcess)}`);
      
      const items = await prisma.kangxiDict.findMany({
        where: {
          OR: [
            { wuxing: null },
            { wuxing: { not: { in: ['金', '木', '水', '火', '土'] } } }
          ]
        },
        skip,
        take: batchSize,
        select: {
          id: true,
          character: true,
          wuxing: true,
          meaning: true,
          strokeCount: true,
          pinyin: true
        }
      });
      
      for (const item of items) {
        processed++;
        
        // 每处理500条记录显示一次进度
        if (processed % 500 === 0) {
          const progress = ((processed / totalToProcess) * 100).toFixed(1);
          console.log(`  进度: ${processed}/${totalToProcess} (${progress}%)`);
        }
        
        const originalWuxing = item.wuxing;
        const newWuxing = inferWuxingComprehensive(item);
        
        // 更新数据库
        if (newWuxing !== originalWuxing) {
          await prisma.kangxiDict.update({
            where: { id: item.id },
            data: { wuxing: newWuxing }
          });
          updated++;
        }
      }
    }
    
    console.log(`\n处理完成: 共处理 ${processed} 条记录，更新 ${updated} 条记录`);
    
    // 3. 生成五行标准化报告
    console.log('\n3. 生成五行标准化报告...');
    
    const finalStats = await prisma.kangxiDict.groupBy({
      by: ['wuxing'],
      _count: true
    });
    
    console.log('标准化后的五行分布:');
    finalStats.forEach(stat => {
      const percentage = ((stat._count / totalRecords) * 100).toFixed(2);
      console.log(`  ${stat.wuxing || '空'}: ${stat._count} (${percentage}%)`);
    });
    
    // 4. 导出统计报告
    console.log('\n4. 五行标准化统计报告:');
    console.log('='.repeat(50));
    console.log(`总记录数: ${totalRecords}`);
    console.log(`处理记录数: ${processed}`);
    console.log(`更新记录数: ${updated}`);
    console.log(`标准化完成率: ${((processed / totalRecords) * 100).toFixed(2)}%`);
    
    // 计算五行平衡度
    const standardRecords = await prisma.kangxiDict.count({
      where: { wuxing: { in: ['金', '木', '水', '火', '土'] } }
    });
    
    console.log(`标准五行记录数: ${standardRecords}`);
    console.log(`标准五行比例: ${((standardRecords / totalRecords) * 100).toFixed(2)}%`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('标准化过程中出错:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// 运行标准化
standardizeWuxingData().catch(console.error);