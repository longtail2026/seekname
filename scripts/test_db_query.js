/**
 * 测试数据库查询和向量搜索
 */

const { queryRaw } = require('../src/lib/prisma');

async function testDatabaseQuery() {
  console.log('=== 测试数据库查询 ===\n');
  
  try {
    // 1. 测试简单查询
    console.log('1. 测试naming_classics表查询...');
    const countResult = await queryRaw('SELECT COUNT(*) as count FROM naming_classics');
    console.log(`   表记录数: ${countResult[0].count}`);
    
    // 2. 测试带嵌入向量的查询
    console.log('\n2. 测试带嵌入向量的查询...');
    const vectorResult = await queryRaw(`
      SELECT id, book_name, ancient_text, modern_text, keywords
      FROM naming_classics
      WHERE combined_text_embedding IS NOT NULL
      LIMIT 5
    `);
    
    console.log(`   找到 ${vectorResult.length} 条带向量的记录`);
    for (let i = 0; i < Math.min(vectorResult.length, 3); i++) {
      const row = vectorResult[i];
      console.log(`   ${i+1}. ID: ${row.id}, 书名: ${row.book_name}`);
      console.log(`      古籍原文: ${row.ancient_text?.substring(0, 50)}...`);
      console.log(`      现代释义: ${row.modern_text?.substring(0, 50)}...`);
    }
    
    // 3. 测试关键词搜索
    console.log('\n3. 测试关键词搜索...');
    const keyword = '平安';
    const keywordResult = await queryRaw(`
      SELECT id, book_name, ancient_text, modern_text, keywords
      FROM naming_classics
      WHERE ancient_text ILIKE $1 
         OR modern_text ILIKE $1
         OR keywords ILIKE $1
      LIMIT 5
    `, [`%${keyword}%`]);
    
    console.log(`   关键词"${keyword}"找到 ${keywordResult.length} 条记录`);
    
    // 4. 测试向量维度
    console.log('\n4. 测试向量维度...');
    const dimensionResult = await queryRaw(`
      SELECT octet_length(combined_text_embedding) as embedding_size
      FROM naming_classics
      WHERE combined_text_embedding IS NOT NULL
      LIMIT 1
    `);
    
    if (dimensionResult[0] && dimensionResult[0].embedding_size) {
      const byteSize = parseInt(dimensionResult[0].embedding_size);
      const floatSize = byteSize / 4; // 每个float32占4字节
      console.log(`   向量字节大小: ${byteSize}`);
      console.log(`   向量维度: ${floatSize} (应为1024)`);
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误详情:', error.stack);
  }
}

// 运行测试
testDatabaseQuery().catch(console.error);