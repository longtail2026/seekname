/**
 * 爬取海词英文人名词典 (ename.dict.cn) 的所有英文名数据
 * 目标页面: https://ename.dict.cn/list/all/{letter}/{page}
 * 数据字段: 英文名, 性别, 音标, 中文译名, 来源语种, 流行度
 * 
 * 使用方法: node scripts/scrape_ename_dict.js
 * 输出文件: ename_dict_data.csv
 */
const { execSync } = require('child_process');
const fs = require('fs');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const OUTPUT_FILE = 'ename_dict_data.csv';
const DELAY_MS = 500; // 请求间隔

const CSV_HEADER = '英文名,性别,音标,中文译名,来源,流行度';
let csvRows = [];
let totalNames = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 使用curl获取页面HTML */
function fetchPage(letter, page) {
  const url = page === 1
    ? `https://ename.dict.cn/list/all/${letter}`
    : `https://ename.dict.cn/list/all/${letter}/${page}`;

  const cmd = `curl -s -o - "${url}" 2>&1`;
  try {
    const stdout = execSync(cmd, { 
      timeout: 30000,
      encoding: 'utf-8',
      maxBuffer: 5 * 1024 * 1024
    });
    return stdout;
  } catch (err) {
    throw new Error(`curl failed: ${err.message}`);
  }
}

/** 从HTML中解析所有名字行 */
function parseNamesFromHtml(html) {
  const names = [];

  // 用正则匹配每一个 <tr> ... </tr>，并确保包含名字链接
  const trRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  let trMatch;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const tr = trMatch[0];

    // 必须包含名字链接（跳过表头/非名字行）
    const nameMatch = tr.match(/<a href="\/[^"]+"[^>]*>([^<]+)<\/a>/);
    if (!nameMatch) continue;
    const englishName = nameMatch[1].trim();
    if (!englishName || englishName.length === 0) continue;

    // 性别
    let gender = '未知';
    if (tr.includes('class="female"')) gender = '女性';
    else if (tr.includes('class="male"')) gender = '男性';
    else if (tr.includes('class="neutral"')) gender = '中性';

    // 音标 (<i>...</i>)
    const phoneticMatch = tr.match(/<i>([^<]*)<\/i>/);
    const phonetic = phoneticMatch ? phoneticMatch[1].trim() : '';

    // 中文译名: 第3个<td>的内容
    // 来源: <bdo>...</bdo>
    // 流行度: class="star(\d+)"
    let chineseName = '';
    let source = '';
    let popularity = '';

    // 提取所有td内容
    const tdMatches = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
    if (tdMatches.length >= 4) {
      // 第3个td是中文译名 (0=英文名link, 1=性别图标, 2=音标, 3=中文译名)
      const chnTd = tdMatches[3][1].replace(/<[^>]+>/g, '').trim();
      chineseName = chnTd;
    }

    // 来源
    const srcMatch = tr.match(/<bdo[^>]*>([^<]*)<\/bdo>/);
    if (srcMatch) source = srcMatch[1].trim();

    // 流行度
    const starMatch = tr.match(/class="star(\d+)"/);
    if (starMatch) {
      const starLabels = ['无', '★', '★★', '★★★', '★★★★', '★★★★★'];
      const idx = parseInt(starMatch[1]);
      popularity = idx < starLabels.length ? starLabels[idx] : `${idx}星`;
    }

    names.push({ englishName, gender, phonetic, chineseName, source, popularity });
  }

  return names;
}

/** 从HTML中获取总页数 */
function getTotalPages(html) {
  // 匹配 "共X/Y页"
  const pageMatch = html.match(/共(\d+)\/(\d+)页/);
  if (pageMatch) return parseInt(pageMatch[2]);

  // 从分页链接中找最大页码
  const pageLinks = html.match(/\/list\/all\/[A-Z]\/(\d+)/g);
  if (pageLinks) {
    let maxPage = 0;
    for (const link of pageLinks) {
      const num = parseInt(link.match(/\/(\d+)$/)[1]);
      if (num > maxPage) maxPage = num;
    }
    if (maxPage > 0) return maxPage;
  }
  return 1;
}

/** CSV字段转义 */
function escapeCsv(val) {
  if (!val) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function scrapeAll() {
  console.log('='.repeat(60));
  console.log('  英文人名词典爬虫 - ename.dict.cn');
  console.log('='.repeat(60));
  console.log(`  输出文件: ${OUTPUT_FILE}`);
  console.log(`  共计 26 个字母 (A-Z)\n`);

  csvRows.push(CSV_HEADER);

  for (let li = 0; li < LETTERS.length; li++) {
    const letter = LETTERS[li];
    let page = 1;
    let totalPages = 1;
    let letterNames = 0;
    let consecutiveErrors = 0;
    const maxErrors = 3;

    process.stdout.write(`[${String(li + 1).padStart(2)}/${LETTERS.length}] 字母 ${letter}`);

    while (page <= totalPages && consecutiveErrors < maxErrors) {
      let html;
      try {
        html = fetchPage(letter, page);
      } catch (err) {
        process.stdout.write(`\n  ⚠ 第${page}页失败: ${err.message}, 重试...`);
        await sleep(2000);
        try {
          html = fetchPage(letter, page);
        } catch (err2) {
          process.stdout.write(`\n  ⚠ 第${page}页重试失败: ${err2.message}`);
          consecutiveErrors++;
          page++;
          continue;
        }
      }

      consecutiveErrors = 0;

      // 第一页获取总页数
      if (page === 1) {
        totalPages = getTotalPages(html);
        process.stdout.write(` → ${totalPages}页`);
      }

      const names = parseNamesFromHtml(html);
      if (names.length === 0) {
        process.stdout.write(`\n  ⚠ 第${page}页未解析到数据（页面可能格式有变）`);
        page++;
        continue;
      }

      for (const n of names) {
        csvRows.push([
          escapeCsv(n.englishName),
          escapeCsv(n.gender),
          escapeCsv(n.phonetic),
          escapeCsv(n.chineseName),
          escapeCsv(n.source),
          escapeCsv(n.popularity)
        ].join(','));
      }

      letterNames += names.length;
      totalNames += names.length;

      process.stdout.write(`.`);
      if (page % 20 === 0) process.stdout.write(`(${page})`);

      await sleep(DELAY_MS);
      page++;
    }

    console.log(` ✓ ${letterNames}条`);
    
    // 每个字母写入一次CSV，防止进度丢失
    fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'), 'utf-8');
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  ✅ 全部完成！`);
  console.log(`     总计: ${totalNames} 个英文名`);
  console.log(`     文件: ${OUTPUT_FILE}`);
  console.log('='.repeat(60));
}

scrapeAll().catch(err => {
  console.error('\n❌ 严重错误:', err);
  if (csvRows.length > 1) {
    fs.writeFileSync(OUTPUT_FILE, csvRows.join('\n'), 'utf-8');
    console.log(`已保存 ${csvRows.length - 1} 条数据到 ${OUTPUT_FILE}`);
  }
  process.exit(1);
});