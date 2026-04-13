/**
 * 测试寻名网起名引擎
 * 运行: node test-naming-engine.js
 */

const fetch = require('node-fetch');

async function testNamingEngine() {
  console.log('🚀 测试寻名网起名引擎 V2...\n');
  
  const testCases = [
    {
      name: '测试用例1: 完整描述文本',
      request: {
        rawInput: '女孩，姓张，2025年3月15日出生，希望名字温柔诗意，喜欢水意象'
      }
    },
    {
      name: '测试用例2: 结构化参数',
      request: {
        surname: '李',
        gender: 'M',
        birthDate: '2024-08-20',
        expectations: '大气阳刚，有志向',
        style: '古典'
      }
    },
    {
      name: '测试用例3: 简单输入',
      request: {
        surname: '王',
        gender: 'F',
        birthDate: '2023-12-05',
        expectations: '聪明伶俐'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}`);
    console.log('请求:', JSON.stringify(testCase.request, null, 2));
    
    try {
      const response = await fetch('http://localhost:3000/api/name/generate-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.request),
      });
      
      const data = await response.json();
      
      console.log('状态码:', response.status);
      console.log('响应:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log('✅ 成功生成名字');
        const candidates = data.data?.candidates || [];
        console.log(`📊 生成 ${candidates.length} 个候选名字:`);
        
        candidates.forEach((candidate, index) => {
          console.log(`  ${index + 1}. ${candidate.fullName} (${candidate.pinyin})`);
          console.log(`     五行: ${candidate.wuxing}, 笔画: ${candidate.strokeCount}, 评分: ${candidate.score}`);
          console.log(`     含义: ${candidate.meaning}`);
          if (candidate.sources && candidate.sources.length > 0) {
            console.log(`     出处: ${candidate.sources[0].book} - ${candidate.sources[0].text}`);
          }
          console.log('');
        });
        
        const stats = data.data?.statistics || {};
        console.log('📈 统计信息:');
        console.log(`   考虑字符数: ${stats.totalCharactersConsidered}`);
        console.log(`   匹配典籍条目: ${stats.totalClassicsEntriesMatched}`);
        console.log(`   分析人名样本: ${stats.totalNameSamplesAnalyzed}`);
        console.log(`   安全检查次数: ${stats.safetyChecksPerformed}`);
        console.log(`   生成时间: ${stats.generationTime}ms`);
      } else {
        console.log('❌ 失败:', data.error);
      }
      
    } catch (error) {
      console.log('❌ 请求失败:', error.message);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// 检查是否在运行开发服务器
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/name/generate-v2', {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 检查开发服务器是否运行...');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ 开发服务器未运行！');
    console.log('请先运行: npm run dev');
    console.log('然后在另一个终端运行此测试脚本');
    return;
  }
  
  console.log('✅ 开发服务器正在运行\n');
  await testNamingEngine();
}

main().catch(console.error);