const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPI() {
  console.log('🚀 测试寻名网起名API V2...\n');
  
  const testData = {
    surname: "张",
    gender: "F",
    birthDate: "2025-03-15",
    expectations: "温柔诗意，喜欢水意象"
  };
  
  console.log('发送请求:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch('http://localhost:3000/api/name/generate-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log('状态码:', response.status);
    
    const data = await response.json();
    console.log('响应:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ API测试成功！');
      const candidates = data.data?.candidates || [];
      console.log(`📊 生成 ${candidates.length} 个候选名字`);
      
      if (candidates.length > 0) {
        console.log('\n前3个候选名字:');
        candidates.slice(0, 3).forEach((candidate, index) => {
          console.log(`\n${index + 1}. ${candidate.fullName} (${candidate.pinyin})`);
          console.log(`   五行: ${candidate.wuxing}, 笔画: ${candidate.strokeCount}, 评分: ${candidate.score}`);
          console.log(`   含义: ${candidate.meaning}`);
          if (candidate.sources && candidate.sources.length > 0) {
            console.log(`   出处: ${candidate.sources[0].book} - ${candidate.sources[0].text}`);
          }
        });
      }
    } else {
      console.log('❌ API测试失败:', data.error);
    }
    
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

// 直接运行测试
testAPI().catch(console.error);
