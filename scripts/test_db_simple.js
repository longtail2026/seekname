/**
 * 简单数据库连接测试
 */

const { Pool } = require('pg');

async function testDatabaseConnection() {
  console.log('=== 测试数据库连接 ===\n');
  
  // 从环境变量获取连接字符串
  const DATABASE_URL = process.env.POSTGRES_PRISMA_URL || 
                       process.env.DATABASE_URL || 
                       "postgresql://postgres:postgres@localhost:5432/seekname_db?schema=public";
  
  console.log('使用连接字符串:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // 测试连接
    const client = await pool.connect();
    console.log('✓ 数据库连接成功');
    
    // 测试naming_classics表
    console.log('\n1. 测试naming_classics表...');
    const countResult = await client.query('SELECT COUNT(*) as count FROM naming_classics');
    console.log(`   表记录数: ${countResult.rows[0].count}`);
    
    // 检查向量数据
    console.log('\n2. 检查向量数据...');
    const vectorResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(combined_text_embedding) as with_vector,
        AVG(octet_length(combined_text_embedding)) as avg_size
      FROM naming_classics
    `);
    
    const row = vectorResult.rows[0];
    console.log(`   总记录数: ${row.total}`);
    console.log(`   有向量的记录: ${row.with_vector}`);
    console.log(`   平均向量大小: ${row.avg_size ? Math.round(row.avg_size) : 'N/A'} 字节`);
    
    // 检查向量维度
    console.log('\n3. 检查向量维度...');
    const sampleResult = await client.query(`
      SELECT combined_text_embedding
      FROM naming_classics
      WHERE combined_text_embedding IS NOT NULL
      LIMIT 1
    `);
    
    if (sampleResult.rows[0] && sampleResult.rows[0].combined_text_embedding) {
      const bytes = new Uint8Array(sampleResult.rows[0].combined_text_embedding);
      console.log(`   样本向量字节大小: ${bytes.length}`);
      console.log(`   样本向量维度: ${bytes.length / 4} (应为1024)`);
    }
    
    // 测试关键词搜索
    console.log('\n4. 测试关键词搜索...');
    const keyword = '平安';
    const keywordResult = await client.query(`
      SELECT id, book_name, ancient_text, modern_text, keywords
      FROM naming_classics
      WHERE ancient_text ILIKE $1 
         OR modern_text ILIKE $1
         OR keywords ILIKE $1
      LIMIT 3
    `, [`%${keyword}%`]);
    
    console.log(`   关键词"${keyword}"找到 ${keywordResult.rows.length} 条记录`);
    keywordResult.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ID:${row.id} [${row.book_name}]`);
      console.log(`      古籍: ${row.ancient_text?.substring(0, 50)}...`);
    });
    
    client.release();
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('✗ 数据库连接失败:', error.message);
    console.error('错误详情:', error.stack);
  } finally {
    await pool.end();
  }
}

// 运行测试
testDatabaseConnection().catch(console.error);