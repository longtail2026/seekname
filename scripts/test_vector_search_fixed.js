/**
 * 测试修复后的向量搜索
 */

const { searchSimilarClassicsByVector } = require('../src/lib/vector-similarity-search');

async function testVectorSearchFixed() {
  console.log('=== 测试修复后的向量搜索 ===\n');
  
  try {
    // 测试用例1：简单查询
    console.log('测试用例1：查询"平安健康"');
    const matches1 = await searchSimilarClassicsByVector('平安健康', 'F', {
      maxResults: 5,
      similarityThreshold: 0.1, // 低阈值
    });
    
    console.log(`找到 ${matches1.length} 个匹配结果`);
    if (matches1.length > 0) {
      matches1.forEach((match, i) => {
        console.log(`${i+1}. [${match.bookName}] 相似度: ${match.similarity.toFixed(4)}`);
        console.log(`   文本: ${match.ancientText || match.modernText}`);
        console.log(`   提取字符: ${match.extractedChars.join(', ')}`);
      });
    } else {
      console.log('警告：未找到任何匹配结果');
    }
    
    // 测试用例2：更具体的查询
    console.log('\n测试用例2：查询"聪明智慧"');
    const matches2 = await searchSimilarClassicsByVector('聪明智慧', 'M', {
      maxResults: 3,
      similarityThreshold: 0.05, // 更低的阈值
    });
    
    console.log(`找到 ${matches2.length} 个匹配结果`);
    if (matches2.length > 0) {
      matches2.forEach((match, i) => {
        console.log(`${i+1}. [${match.bookName}] 相似度: ${match.similarity.toFixed(4)}`);
      });
    }
    
    // 测试用例3：测试语义匹配流程
    console.log('\n测试用例3：测试完整语义匹配流程');
    const { semanticNamingFlow } = require('../src/lib/semantic-naming-engine');
    
    const testRequest = {
      rawInput: "希望女儿平安健康，聪明伶俐",
      surname: "李",
      gender: "F",
      birthDate: "2025-03-15",
      expectations: "平安健康，聪明伶俐",
      style: ["温柔", "诗意"],
      wordCount: 2
    };
    
    console.log('调用语义匹配起名流程...');
    const result = await semanticNamingFlow(testRequest);
    
    console.log(`成功: ${result.success}`);
    console.log(`消息: ${result.message}`);
    console.log(`匹配典籍数量: ${result.matches.length}`);
    console.log(`生成名字数量: ${result.generatedNames.length}`);
    console.log(`过滤后名字数量: ${result.filteredNames.length}`);
    
    if (result.matches.length > 0) {
      console.log('\n匹配的典籍（前3个）:');
      result.matches.slice(0, 3).forEach((match, i) => {
        console.log(`${i+1}. [${match.bookName}] 相似度: ${match.similarity.toFixed(4)}`);
      });
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误详情:', error.stack);
  }
}

// 运行测试
testVectorSearchFixed().catch(console.error);