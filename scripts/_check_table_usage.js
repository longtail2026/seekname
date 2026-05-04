const fs = require('fs');
const path = require('path');

function searchFiles(dir, pattern) {
  let results = [];
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      if (stat.isDirectory() && !f.startsWith('node_modules') && !f.startsWith('.') && !f.startsWith('task_backup')) {
        results = results.concat(searchFiles(fp, pattern));
      } else if (stat.isFile() && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.py'))) {
        try {
          const content = fs.readFileSync(fp, 'utf-8');
          if (pattern.test(content)) {
            results.push(fp.replace(/\\/g,'/'));
          }
        } catch(e) {}
      }
    }
  } catch(e) {}
  return results;
}

// Check each table name usage
const tables = [
  'name_record', 'name_records', 
  'order', 'orders',
  'name_favorite', 'name_favorites',
  'blog_comment', 'blog_comments',
  'blog_post', 'blog_posts',
  'name_wuxing',
  'playing_with_neon',
  'naming_classics', 'naming_materials',
  'classics_entries', 'classics_books',
  'kangxi_dict', 'sensitive_words',
  'name_samples', 'wuxing_characters',
  'character_frequency',
  'subscription', 'blog_tags', 'blog_post_tags',
  'blog_favorites', 'blog_likes',
  'user', 'users',
  'ename_dict'
];

for (const table of tables) {
  const files = searchFiles('src', new RegExp('\\b' + table + '\\b'));
  const prismaFiles = searchFiles('prisma', new RegExp('\\b' + table + '\\b'));
  const scriptFiles = searchFiles('scripts', new RegExp('\\b' + table + '\\b'));
  const allFiles = [...new Set([...files, ...prismaFiles, ...scriptFiles])];
  if (allFiles.length > 0) {
    console.log(table.padEnd(25) + ' -> ' + allFiles.length + ' files');
  } else {
    console.log(table.padEnd(25) + ' -> NOT referenced in code');
  }
}