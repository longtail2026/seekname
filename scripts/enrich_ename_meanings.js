/**
 * 英文名含义补充脚本
 * 
 * 功能：调用 DeepSeek API 为每个英文名查询含义（meaning）
 * 支持断点续传：已查询过的名称不会重复查询
 * 
 * 用法：node scripts/enrich_ename_meanings.js
 * 
 * 注意：需要配置 DEEPSEEK_API_KEY 环境变量（已在 .env 中）
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 加载 .env 文件
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) {
  console.error('❌ 未找到 DEEPSEEK_API_KEY，请在 .env 文件中配置');
  process.exit(1);
}

const API_URL = 'https://api.deepseek.com/v1/chat/completions';

// ============ 配置参数 ============
const BATCH_SIZE = 40;        // 每批查询多少个名字（减少数量提高可靠性）
const DELAY_MS = 3000;        // 每批之间的延迟（避免速率限制）
const MAX_RETRIES = 5;        // 单次查询最大重试次数
const REQUEST_TIMEOUT = 45000; // 请求超时时间

// ============ 文件路径 ============
const CSV_INPUT = path.join(__dirname, '..', 'ename_dict_data.csv');
const CSV_OUTPUT = path.join(__dirname, '..', 'ename_dict_with_meaning.csv');
const PROGRESS_FILE = path.join(__dirname, '..', 'ename_meanings_progress.json');

// ============ 辅助函数 ============

/** 解析CSV行（处理引号中的逗号） */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** 将行编码为CSV（处理包含逗号或引号的内容） */
function encodeCSVValue(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** 延迟函数 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** 调用 DeepSeek API */
async function callDeepSeek(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: '你是一位精通英汉姓名学的大师。你会返回JSON格式的响应，不要包含任何其他文字。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API错误 ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

/** 查询一批名字的含义 */
async function queryBatchMeanings(names) {
  const nameList = names.map(n => `- ${n}`).join('\n');
  
  const prompt = `您是一位精通英文姓名学的专家。请逐个评估以下英文人名的含义（meaning）和文化背景。

请严格按照以下JSON格式返回结果（必须是一个合法的JSON数组）：
[
  {
    "name": "英文名",
    "meaning": "该名字的原始含义及文化背景解释（用中文，50-150字）"
  },
  ...
]

需要评估的名字列表：
${nameList}

注意：
1. meaning 字段用中文描述该英文名的词源含义、历史背景、文化象征等
2. 如果某个名字有多个可能的含义，选择最公认的那个
3. 返回的JSON必须合法，不要包含markdown代码块标记
4. 必须返回与输入相同数量的条目`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callDeepSeek(prompt);
      
      // 尝试解析JSON
      let json = result.trim();
      // 移除markdown代码块标记
      json = json.replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '').trim();
      // 找到第一个 [ 和最后一个 ]
      const arrStart = json.indexOf('[');
      const arrEnd = json.lastIndexOf(']');
      if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
        json = json.substring(arrStart, arrEnd + 1);
      }
      
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        throw new Error('返回结果不是数组');
      }
      
      // 验证每个条目
      const valid = parsed.filter(item => item.name && item.meaning);
      if (valid.length === 0) {
        throw new Error('没有有效的含义数据');
      }
      
      return valid;
    } catch (err) {
      console.log(`  ⚠️ 第${attempt}次尝试失败: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await sleep(3000 * attempt);
      }
    }
  }
  
  // 所有重试都失败，返回空结果
  console.log(`  ❌ 查询批处理失败（${names.length}个名字）`);
  return names.map(name => ({ name, meaning: '' }));
}

// ============ 主函数 ============

async function main() {
  console.log('========================================');
  console.log('  英文名含义补充工具');
  console.log('  数据源: ename_dict_data.csv');
  console.log('  输出: ename_dict_with_meaning.csv');
  console.log(`  批处理大小: ${BATCH_SIZE} 个/批次`);
  console.log(`  API: DeepSeek Chat`);
  console.log(`  API Key: ${API_KEY.substring(0, 8)}...`);
  console.log('========================================\n');

  // 1. 读取CSV
  if (!fs.existsSync(CSV_INPUT)) {
    console.error(`❌ 找不到文件: ${CSV_INPUT}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_INPUT, 'utf-8');
  const lines = csvContent.trim().split('\n');
  console.log(`📄 共 ${lines.length - 1} 条数据\n`);

  // 2. 解析数据
  const headers = lines[0];
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length >= 6) {
      data.push({
        name: cols[0],
        gender: cols[1],
        phonetic: cols[2],
        chinese: cols[3],
        origin: cols[4],
        popularity: cols[5] || ''
      });
    }
  }

  // 3. 加载已有进度
  let existingMeanings = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      existingMeanings = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      console.log(`📌 已加载 ${Object.keys(existingMeanings).length} 个已有含义（断点续传）\n`);
    } catch (e) {
      console.log('⚠️ 进度文件损坏，重新开始\n');
    }
  }

  // 4. 找出需要查询的名字
  const namesToQuery = [];
  const skippedNames = [];
  
  for (const item of data) {
    if (existingMeanings[item.name]) {
      skippedNames.push(item.name);
    } else {
      namesToQuery.push(item.name);
    }
  }

  console.log(`✅ 已有含义: ${skippedNames.length} 个`);
  console.log(`🔍 需要查询: ${namesToQuery.length} 个\n`);

  if (namesToQuery.length === 0) {
    console.log('🎉 所有名字的含义已齐全！');
    await saveFinalCSV(headers, data, existingMeanings);
    return;
  }

  // 5. 批量查询
  const batches = [];
  for (let i = 0; i < namesToQuery.length; i += BATCH_SIZE) {
    batches.push(namesToQuery.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`📦 共 ${batches.length} 个批次\n`);

  let totalQueried = 0;
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const start = b * BATCH_SIZE + 1;
    const end = Math.min((b + 1) * BATCH_SIZE, namesToQuery.length);
    
    console.log(`[批次 ${b + 1}/${batches.length}] 正在查询 ${batch[0]} ~ ${batch[batch.length-1]} (${start}-${end}/${namesToQuery.length})`);
    
    const results = await queryBatchMeanings(batch);
    
    // 保存结果
    for (const r of results) {
      if (r.name && r.meaning) {
        existingMeanings[r.name] = r.meaning;
      }
    }
    
    totalQueried += results.length;
    
    // 保存进度
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(existingMeanings, null, 2), 'utf-8');
    
    console.log(`  ✅ 完成 ${totalQueried}/${namesToQuery.length} 个\n`);
    
    // 批次间延迟
    if (b < batches.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // 6. 生成最终CSV
  console.log('📝 正在生成最终CSV...');
  await saveFinalCSV(headers, data, existingMeanings);
  
  console.log('\n🎉 全部完成！');
  console.log(`📁 CSV文件: ${CSV_OUTPUT}`);
  console.log(`📁 含义缓存: ${PROGRESS_FILE}`);
  
  // 统计
  const withMeaning = Object.values(existingMeanings).filter(m => m.length > 0).length;
  const withoutMeaning = Object.values(existingMeanings).filter(m => m.length === 0).length;
  console.log(`\n📊 统计:`);
  console.log(`   ✅ 有含义: ${withMeaning} 个`);
  console.log(`   ⚠️ 无含义: ${withoutMeaning} 个`);
}

async function saveFinalCSV(headers, data, meanings) {
  // 新表头：增加"含义"列
  const newHeaders = headers + ',含义';
  
  const rows = [newHeaders];
  for (const item of data) {
    const meaning = meanings[item.name] || '';
    const row = [
      encodeCSVValue(item.name),
      encodeCSVValue(item.gender),
      encodeCSVValue(item.phonetic),
      encodeCSVValue(item.chinese),
      encodeCSVValue(item.origin),
      encodeCSVValue(item.popularity),
      encodeCSVValue(meaning)
    ];
    rows.push(row.join(','));
  }
  
  fs.writeFileSync(CSV_OUTPUT, rows.join('\n'), 'utf-8');
  console.log(`✅ 已写入 ${CSV_OUTPUT}，共 ${rows.length - 1} 条数据`);
}

main().catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});