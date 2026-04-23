/**
 * 调试向量搜索问题
 */

const { queryRaw } = require('../src/lib/prisma');
const { cosineSimilarity, parseEmbedding, generateTestEmbedding } = require('../src/lib/vector-similarity-search');

async function debugVectorSearch() {
  console.log('=== 调试向量搜索问题 ===\n');
  
  try {
    // 1. 测试数据库连接和向量数据
    console.log('1. 检查数据库向量数据...');
    const vectorData = await queryRaw(`
      SELECT 
        COUNT(*) as total,
        COUNT(combined_text_embedding) as with_vector,
        AVG(octet_length(combined_text_embedding)) as avg_size
      FROM naming_classics
    `);
    
    console.log(`   总记录数: ${vectorData[0].total}`);
    console.log(`   有向量的记录: ${vectorData[0].with_vector}`);
    console.log(`   平均向量大小: ${vectorData[0].avg_size} 字节`);
    
    // 2. 检查向量维度
    console.log('\n2. 检查向量维度...');
    const sampleVector = await queryRaw(`
      SELECT combined_text_embedding
      FROM naming_classics
      WHERE combined_text_embedding IS NOT NULL
      LIMIT 1
    `);
    
    if (sampleVector[0] && sampleVector[0].combined_text_embedding) {
      const vec = parseEmbedding(sampleVector[0].combined_text_embedding);
      console.log(`   样本向量维度: ${vec.length}`);
      console.log(`   样本向量前5个值: ${vec.slice(0, 5).map(v => v.toFixed(6)).join(', ')}`);
    }
    
    // 3. 测试generateTestEmbedding
    console.log('\n3. 测试generateTestEmbedding...');
    const testText = "平安健康";
    const testVec = generateTestEmbedding(testText, 1024);
    console.log(`   测试文本: "${testText}"`);
    console.log(`   生成向量维度: ${testVec.length}`);
    console.log(`   生成向量前5个值: ${testVec.slice(0, 5).map(v => v.toFixed(6)).join(', ')}`);
    
    // 4. 测试余弦相似度
    console.log('\n4. 测试余弦相似度计算...');
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    const vec3 = [1, 1, 0];
    
    const sim1 = cosineSimilarity(vec1, vec2);
    const sim2 = cosineSimilarity(vec1, vec3);
    const sim3 = cosineSimilarity(vec2, vec3);
    
    console.log(`   vec1 [1,0,0] vs vec2 [0,1,0]: ${sim1.toFixed(4)}`);
    console.log(`   vec1 [1,0,0] vs vec3 [1,1,0]: ${sim2.toFixed(4)}`);
    console.log(`   vec2 [0,1,0] vs vec3 [1,1,0]: ${sim3.toFixed(4)}`);
    
    // 5. 测试实际搜索
    console.log('\n5. 测试实际向量搜索...');
    const searchText = "平安健康聪明";
    const searchVec = generateTestEmbedding(searchText, 1024);
    
    // 获取一些样本数据计算相似度
    const sampleEntries = await queryRaw(`
      SELECT id, book_name, ancient_text, modern_text, combined_text_embedding
      FROM naming_classics
      WHERE combined_text_embedding IS NOT NULL
      LIMIT 20
    `);
    
    console.log(`   获取 ${sampleEntries.length} 个样本进行相似度计算`);
    
    const similarities = [];
    for (const entry of sampleEntries) {
      try {
        const docVec = parseEmbedding(entry.combined_text_embedding);
        if (docVec.length > 0) {
          const sim = cosineSimilarity(searchVec, docVec);
          similarities.push({
            id: entry.id,
            book_name: entry.book_name,
            similarity: sim,
            text: (entry.ancient_text || entry.modern_text || '').substring(0, 30)
          });
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    
    // 按相似度排序
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log(`   计算了 ${similarities.length} 个相似度`);
    console.log(`   最高相似度: ${similarities[0]?.similarity?.toFixed(4) || 'N/A'}`);
    console.log(`   最低相似度: ${similarities[similarities.length-1]?.similarity?.toFixed(4) || 'N/A'}`);
    console.log(`   平均相似度: ${(similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length).toFixed(4)}`);
    
    if (similarities.length > 0) {
      console.log('\n   相似度最高的5个:');
      similarities.slice(0, 5).forEach((s, i) => {
        console.log(`   ${i+1}. ID:${s.id} [${s.book_name}] 相似度:${s.similarity.toFixed(4)}`);
        console.log(`      文本: ${s.text}...`);
      });
    }
    
    // 6. 检查阈值问题
    console.log('\n6. 检查阈值问题...');
    const thresholds = [0.1, 0.2, 0.3, 0.4, 0.5];
    for (const threshold of thresholds) {
      const aboveThreshold = similarities.filter(s => s.similarity >= threshold).length;
      console.log(`   阈值 ${threshold}: ${aboveThreshold}/${similarities.length} (${(aboveThreshold/similarities.length*100).toFixed(1)}%)`);
    }
    
    console.log('\n=== 调试完成 ===');
    
  } catch (error) {
    console.error('调试失败:', error.message);
    console.error('错误详情:', error.stack);
  }
}

// 运行调试
debugVectorSearch().catch(console.error);