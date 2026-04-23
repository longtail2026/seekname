/**
 * 测试语义匹配起名流程
 * 验证整个流程：语义匹配 → 构建提示词 → DeepSeek调用 → 过滤
 */

const { semanticNamingFlow } = require('./src/lib/semantic-naming-engine');

async function testSemanticNamingFlow() {
  console.log('=== 测试语义匹配起名流程 ===\n');
  
  // 测试用例1：女孩名字，期望平安健康
  const testCase1 = {
    rawInput: "希望女儿平安健康，聪明伶俐",
    surname: "李",
    gender: "F",
    birthDate: "2025-03-15",
    expectations: "平安健康，聪明伶俐",
    style: ["温柔", "诗意"],
    wordCount: 2
  };
  
  console.log('测试用例1：女孩名字，期望平安健康');
  console.log('输入参数:', JSON.stringify(testCase1, null, 2));
  
  try {
    const result = await semanticNamingFlow(testCase1);
    
    console.log('\n测试结果:');
    console.log('成功:', result.success);
    console.log('消息:', result.message);
    console.log('匹配典籍数量:', result.matches.length);
    console.log('生成名字数量:', result.generatedNames.length);
    console.log('过滤后名字数量:', result.filteredNames.length);
    
    if (result.filteredNames.length > 0) {
      console.log('\n过滤后的名字（前5个）:');
      result.filteredNames.slice(0, 5).forEach((name, index) => {
        console.log(`${index + 1}. ${name.name} (${name.pinyin})`);
        console.log(`   寓意: ${name.meaning.substring(0, 50)}...`);
      });
    }
    
    if (result.filterResult.removed.length > 0) {
      console.log('\n被过滤的名字（前5个）:');
      result.filterResult.removed.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - 原因: ${item.reason}`);
      });
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误详情:', error.stack);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
testSemanticNamingFlow().catch(console.error);