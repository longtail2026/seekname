/**
 * 英文名含义补充脚本 v2
 * 
 * 改进：小batch (10个) + 短超时 (20s) + 先求进度再补漏
 * 用法：node scripts/enrich_ename_meanings_v2.js
 */
const fs = require('fs');
const path = require('path');

// 加载 .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('❌ 未找到 DEEPSEEK_API_KEY'); process.exit(1); }

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const CSV_INPUT = path.join(__dirname, '..', 'ename_dict_data.csv');
const CSV_OUTPUT = path.join(__dirname, '..', 'ename_dict_with_meaning.csv');
const PROGRESS_FILE = path.join(__dirname, '..', 'ename_meanings_progress.json');

const BATCH_SIZE = 10;        // 每批10个
const MAX_RETRIES = 5;
const REQUEST_TIMEOUT = 20000; // 20秒超时

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += ch;
  }
  result.push(current.trim());
  return result;
}

function encodeCSVValue(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function callDeepSeek(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: '你是一位精通英汉姓名学的大师。你会返回JSON格式的响应，不要包含任何其他文字。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`API错误 ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function queryBatch(names) {
  const nameList = names.map(n => `- ${n}`).join('\n');
  const prompt = `请评估以下英文人名的含义和文化背景，返回JSON数组：
[
  { "name": "英文名", "meaning": "中文含义解释（50-150字）" }
]
列表：
${nameList}
注意：只返回合法JSON，不要markdown。必须返回${names.length}个条目。`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let result = await callDeepSeek(prompt);
      let json = result.replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '').trim();
      const arrStart = json.indexOf('[');
      const arrEnd = json.lastIndexOf(']');
      if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) json = json.substring(arrStart, arrEnd + 1);
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error('不是数组');
      const valid = parsed.filter(item => item.name && item.meaning);
      if (valid.length === 0) throw new Error('无有效数据');
      return valid;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = 2000 * attempt;
        console.log(`  ⚠️ 重试 ${attempt}/${MAX_RETRIES}: ${err.message} (等待${delay}ms)`);
        await sleep(delay);
      } else {
        console.log(`  ❌ 批次失败: ${err.message}`);
      }
    }
  }
  return names.map(name => ({ name, meaning: '' }));
}

async function saveFinalCSV(headers, data, meanings) {
  const newHeaders = headers + ',含义';
  const rows = [newHeaders];
  for (const item of data) {
    const meaning = meanings[item.name] || '';
    rows.push([
      encodeCSVValue(item.name), encodeCSVValue(item.gender), encodeCSVValue(item.phonetic),
      encodeCSVValue(item.chinese), encodeCSVValue(item.origin), encodeCSVValue(item.popularity),
      encodeCSVValue(meaning)
    ].join(','));
  }
  fs.writeFileSync(CSV_OUTPUT, rows.join('\n'), 'utf-8');
  console.log(`✅ 已写入 ${CSV_OUTPUT}，共 ${rows.length - 1} 条`);
}

async function main() {
  console.log('========================================');
  console.log('  英文名含义补充工具 v2');
  console.log(`  批次: ${BATCH_SIZE}个/批, 超时: ${REQUEST_TIMEOUT}ms`);
  console.log(`  API: ${API_KEY.substring(0, 8)}...`);
  console.log('========================================\n');

  // 读取CSV
  const csvContent = fs.readFileSync(CSV_INPUT, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const headers = lines[0];
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length >= 6) {
      data.push({ name: cols[0], gender: cols[1], phonetic: cols[2], chinese: cols[3], origin: cols[4], popularity: cols[5] || '' });
    }
  }
  console.log(`📄 共 ${data.length} 条数据\n`);

  // 加载进度
  let meanings = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    try { meanings = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')); }
    catch (e) { console.log('⚠️ 进度文件损坏，重来'); }
  }

  const needQuery = data.filter(item => !meanings[item.name] || !meanings[item.name]);
  const skipped = data.length - needQuery.length;
  console.log(`✅ 已有含义: ${skipped} 个`);
  console.log(`🔍 待查询: ${needQuery.length} 个\n`);

  if (needQuery.length === 0) {
    console.log('🎉 全部完成！');
    await saveFinalCSV(headers, data, meanings);
    return;
  }

  const batches = [];
  for (let i = 0; i < needQuery.length; i += BATCH_SIZE) {
    batches.push(needQuery.slice(i, i + BATCH_SIZE));
  }
  console.log(`📦 ${batches.length} 批次\n`);

  let totalSuccess = 0;
  let totalFail = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const names = batch.map(item => item.name);
    const startIdx = b * BATCH_SIZE + 1;
    const endIdx = Math.min((b + 1) * BATCH_SIZE, needQuery.length);

    console.log(`[批次 ${b+1}/${batches.length}] ${names[0]}~${names[names.length-1]} (${startIdx}-${endIdx}/${needQuery.length})`);

    const results = await queryBatch(names);

    let batchSuccess = 0;
    for (const r of results) {
      if (r.name && r.meaning) {
        if (!meanings[r.name] || !meanings[r.name]) {
          meanings[r.name] = r.meaning;
          batchSuccess++;
        }
      }
    }
    totalSuccess += batchSuccess;
    totalFail += (names.length - batchSuccess);

    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(meanings, null, 2), 'utf-8');

    const progress = Object.keys(meanings).filter(n => meanings[n]).length;
    const pct = (progress / data.length * 100).toFixed(1);
    console.log(`  ✅ +${batchSuccess} 失败:${names.length - batchSuccess} | 总进度: ${progress}/${data.length} (${pct}%)`);

    if (b < batches.length - 1) await sleep(1500);
  }

  // 最终统计
  const allKeys = Object.keys(meanings);
  const withMeaning = allKeys.filter(n => meanings[n]).length;
  const without = allKeys.filter(n => !meanings[n]).length;

  console.log(`\n📊 最终统计:`);
  console.log(`   总进度: ${allKeys.length}/${data.length}`);
  console.log(`   ✅ 有含义: ${withMeaning}`);
  console.log(`   ⚠️ 无含义: ${without}`);
  console.log(`   📈 成功率: ${(withMeaning / Math.max(1, allKeys.length) * 100).toFixed(1)}%`);

  console.log('\n📝 生成最终CSV...');
  await saveFinalCSV(headers, data, meanings);

  console.log(`\n📁 含义缓存: ${PROGRESS_FILE}`);
  console.log('🎉 完成！');
}

main().catch(err => { console.error('❌ 错误:', err); process.exit(1); });