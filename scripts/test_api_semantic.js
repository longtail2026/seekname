/**
 * 通过API测试语义匹配起名流程
 * 避免直接导入server-only模块的问题
 */

const fetch = require('node-fetch');

async function testSemanticNamingAPI() {
  console.log('=== 通过API测试语义匹配起名流程 ===\n');
  
  // 测试用例1：女孩名字，期望平安健康
  const testData = {
    surname: "李",
    gender: "F",
    birthDate: "2025-03-15",
    expectations: "希望女儿平安健康，聪明伶俐",
    style: "温柔诗意",
    intentions: ["平安", "健康", "聪明"],
    styles: ["温柔", "诗意"],
    category: "personal"
  };
  
  console.log('测试用例：女孩名字，期望平安健康');
  console.log('请求数据:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch('http://localhost:3000/api/name/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    const result = await response.json();
    
    console.log('\nAPI响应状态:', response.status);
    console.log('API响应结果:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n测试成功！');
      console.log('订单号:', result.data.orderNo);
      console.log('匹配典籍数量:', result.data.semanticMatches);
      console.log('生成名字数量:', result.data.names.length);
      
      if (result.data.names.length > 0) {
        console.log('\n生成的名字（前5个）:');
        result.data.names.slice(0, 5).forEach((name, index) => {
          console.log(`${index + 1}. ${name.name} (${name.pinyin})`);
          console.log(`   五行: ${name.wuxing}, 寓意: ${name.meaning.substring(0, 50)}...`);
        });
      }
    } else {
      console.log('\n测试失败:', result.error);
      console.log('错误详情:', result.detail);
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误详情:', error.stack);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
testSemanticNamingAPI().catch(console.error);