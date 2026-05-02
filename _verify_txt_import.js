const fs = require('fs');

// 读取 TXT 文件，解析所有英文名
const lines = fs.readFileSync('C:/Users/Administrator/Desktop/英文名大全.txt', 'utf8').split('\n');

let txtNames = [];
let currentGender = null;
let inMaleSection = false;
let inFemaleSection = false;

for (let line of lines) {
  line = line.trim();
  if (!line) continue;

  if (line.includes('男生英文名')) {
    currentGender = '男性';
    inMaleSection = true;
    inFemaleSection = false;
    continue;
  }
  if (line.includes('女生英文名')) {
    currentGender = '女性';
    inMaleSection = false;
    inFemaleSection = true;
    continue;
  }

  // 跳过标题行和分隔线
  if (line.startsWith('英文名大全') || line.startsWith('-') || line.startsWith('名称包含')) continue;

  // 解析: 英文名 中文发音 来源 含义
  const parts = line.split(/\s+/);
  if (parts.length >= 4) {
    const enName = parts[0];
    const cnPron = parts[1];
    const origin = parts[2];
    let cnMeaning = parts.slice(3).join('');
    // Clean - remove trailing semicolons or garbled chars
    cnMeaning = cnMeaning.replace(/[；;]$/, '');
    txtNames.push({ enName, cnPron, origin, cnMeaning, gender: currentGender });
  }
}

console.log('TXT parsed total:', txtNames.length);
console.log('Male:', txtNames.filter(n => n.gender === '男性').length);
console.log('Female:', txtNames.filter(n => n.gender === '女性').length);

// 去重同名
const uniqueTxtNames = [...new Set(txtNames.map(n => n.enName.toLowerCase()))];
console.log('TXT unique names:', uniqueTxtNames.length);

const { Client } = require('pg');
const c = new Client('postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
c.connect().then(async () => {
  const r = await c.query("SELECT LOWER(english_name) as en FROM ename_dict");
  const dbNames = new Set(r.rows.map(row => row.en));

  const missing = uniqueTxtNames.filter(n => !dbNames.has(n));
  console.log('Missing from DB:', missing.length);
  if (missing.length > 0) {
    console.log('Missing names:', missing.slice(0, 30));
  }

  // 检查字段完整性
  const r2 = await c.query("SELECT COUNT(*) as total FROM ename_dict WHERE chinese_pronunciation IS NULL OR chinese_meaning IS NULL OR origin IS NULL OR gender IS NULL");
  console.log('Records with NULL fields:', r2.rows[0].total);

  // 检查各种 gender
  const r3 = await c.query("SELECT gender, COUNT(*) FROM ename_dict GROUP BY gender ORDER BY gender");
  console.log('Gender distribution:');
  for (const row of r3.rows) {
    console.log('  ' + row.gender + ': ' + row.count);
  }

  c.end();
});