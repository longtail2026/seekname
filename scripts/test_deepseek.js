/**
 * DeepSeek API 快速测试
 */
const fs = require('fs');
const path = require('path');

// 加载 .env
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
const match = env.match(/DEEPSEEK_API_KEY=(.+)/);
const key = match ? match[1].trim() : '';
console.log('API Key:', key.substring(0, 8) + '...');

(async () => {
  try {
    const names = ['Aaron', 'Abigail', 'Alexander'];
    const nameList = names.map(n => '- ' + n).join('\n');
    
    const prompt = `你是英文姓名学家。请评估以下英文名的含义。
返回JSON数组格式：
[{"name": "英文名", "meaning": "中文含义描述（50-150字）"}]

名字列表：
${nameList}

注意：返回合法JSON，不要markdown代码块，必须返回与输入相同数量的条目。`;

    console.log('Sending request...');
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer ' + key 
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: '你是姓名学专家。只返回JSON数组。不要任何其他文字。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
      signal: AbortSignal.timeout(30000)
    });

    console.log('Status:', resp.status);
    const text = await resp.text();
    console.log('\nFull response:');
    console.log(text);
    console.log('\n---');
    
    // 尝试解析JSON
    let json = text.trim();
    const jsonMatch = json.match(/\[\s*\{.*\}\s*\]/s);
    if (jsonMatch) json = jsonMatch[0];
    
    try {
      const parsed = JSON.parse(json);
      console.log('\n✅ JSON解析成功! 条目数:', parsed.length);
      parsed.forEach(p => console.log('  -', p.name, ':', p.meaning ? p.meaning.substring(0, 80) + '...' : 'NO MEANING'));
    } catch(e) {
      console.log('\n❌ JSON解析失败:', e.message);
    }
  } catch(e) {
    console.log('Error:', e.message);
  }
})();