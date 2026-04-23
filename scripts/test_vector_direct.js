/**
 * 直接测试向量搜索（不依赖TypeScript模块）
 */

const { Pool } = require('pg');

// 从环境变量获取连接字符串
const DATABASE_URL = process.env.POSTGRES_PRISMA_URL || 
                     process.env.DATABASE_URL || 
                     "postgresql://postgres:postgres@localhost:5432/seekname_db?schema=public";

console.log('=== 直接测试向量搜索 ===\n');
console.log('使用连接字符串:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * 解析bytea格式的嵌入向量为浮点数数组
 */
function parseEmbedding(embeddingBytes) {
  if (!embeddingBytes) {
    return [];
  }

  const bytes = new Uint8Array(embeddingBytes);
  
  // 假设是float32数组（4字节）
  if (bytes.length % 4 !== 0) {
    throw new Error(`字节长度 ${bytes.length} 不是4的倍数`);
  }

  const dimension = bytes.length / 4;
  const floats = new Float32Array(dimension);
  
  for (let i = 0; i < dimension; i++) {
    const byteOffset = i * 4;
    const view = new DataView(bytes.buffer, byteOffset, 4);
    floats[i] = view.getFloat32(0, true); // little-endian
  }

  return Array.from(floats);
}

/**
 * 计算两个向量的余弦相似度
 */
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error(`向量维度不匹配: ${vec1.length} !== ${vec2.length}`);
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

/**
 * 生成测试嵌入向量
 */
function generateTestEmbedding(text, dimension = 1024) {
  // 简单哈希生成伪随机向量
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0; // 转换为32位整数
  }

  // 使用哈希作为随机种子
  const vec = [];
  for (let i = 0; i < dimension; i++) {
    // 简单的伪随机数生成
    const rand = Math.sin(hash + i) * 10000;
    const val = (rand - Math.floor(rand)) * 0.2 - 0.1; // 生成-0.1到0.1之间的值
    vec.push(val);
  }

  return vec;
}

async function testVectorSearchDirect() {
  const client = await pool.connect();
  
  try {
    console.log('1. 获取向量数据...');
    const entries = await client.query(`
      SELECT id, book_name, ancient_text, modern_text, combined_text_embedding
      FROM naming_classics
      WHERE combined_text_embedding IS NOT NULL
      LIMIT 50
    `);
    
    console.log(`   获取到 ${entries.rows.length} 条记录`);
    
    if (entries.rows.length === 0) {
      console.log('错误：未找到向量数据');
      return;
    }
    
    // 测试第一个向量的解析
    console.log('\n2. 测试向量解析...');
    const firstEntry = entries.rows[0];
    const vector = parseEmbedding(firstEntry.combined_text_embedding);
    console.log(`   第一个向量维度: ${vector.length}`);
    console.log(`   前5个值: ${vector.slice(0, 5).map(v => v.toFixed(6)).join(', ')}`);
    
    // 测试相似度计算
    console.log('\n3. 测试相似度计算...');
    const queryText = "平安健康";
    const queryVector = generateTestEmbedding(queryText, 1024);
    console.log(`   查询文本: "${queryText}"`);
    console.log(`   查询向量维度: ${queryVector.length}`);
    
    // 计算与所有向量的相似度
    console.log('\n4. 计算相似度...');
    const similarities = [];
    
    for (const entry of entries.rows) {
      try {
        const docVector = parseEmbedding(entry.combined_text_embedding);
        if (docVector.length > 0) {
          const similarity = cosineSimilarity(queryVector, docVector);
          similarities.push({
            id: entry.id,
            book_name: entry.book_name,
            similarity,
            text: (entry.ancient_text || entry.modern_text || '').substring(0, 30)
          });
        }
      } catch (error) {
        console.warn(`   解析记录 ${entry.id} 失败:`, error.message);
      }
    }
    
    console.log(`   成功计算 ${similarities.length} 个相似度`);
    
    // 按相似度排序
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log('\n5. 相似度统计:');
    console.log(`   最高相似度: ${similarities[0]?.similarity?.toFixed(4) || 'N/A'}`);
    console.log(`   最低相似度: ${similarities[similarities.length-1]?.similarity?.toFixed(4) || 'N/A'}`);
    console.log(`   平均相似度: ${(similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length).toFixed(4)}`);
    
    // 检查不同阈值下的匹配数量
    console.log('\n6. 阈值分析:');
    const thresholds = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05];
    for (const threshold of thresholds) {
      const aboveThreshold = similarities.filter(s => s.similarity >= threshold).length;
      console.log(`   阈值 ${threshold}: ${aboveThreshold}/${similarities.length} (${(aboveThreshold/similarities.length*100).toFixed(1)}%)`);
    }
    
    // 显示前5个匹配
    console.log('\n7. 前5个匹配结果:');
    similarities.slice(0, 5).forEach((s, i) => {
      console.log(`   ${i+1}. ID:${s.id} [${s.book_name}] 相似度:${s.similarity.toFixed(4)}`);
      console.log(`      文本: ${s.text}...`);
    });
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误详情:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// 运行测试
testVectorSearchDirect().catch(console.error);