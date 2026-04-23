/**
 * 通过API测试语义匹配起名流程 - 使用内置http模块
 */

const http = require('http');

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
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/name/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          console.log('\nAPI响应状态:', res.statusCode);
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
          
          console.log('\n=== 测试完成 ===');
          resolve(result);
        } catch (error) {
          console.error('解析响应失败:', error.message);
          console.error('原始响应:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('请求失败:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// 运行测试
testSemanticNamingAPI().catch(error => {
  console.error('测试失败:', error.message);
  process.exit(1);
});


