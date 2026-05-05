import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function replaceInDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.next')) {
        replaceInDir(fullPath);
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.jsx') || entry.name.endsWith('.mjs')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const newContent = content.replace(/https:\/\/www\.seekname\.cn/g, 'https://seekname.cn');
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Fixed: ' + fullPath);
      }
    }
  }
}

replaceInDir(path.join(rootDir, 'src'));
replaceInDir(path.join(rootDir, 'public'));
replaceInDir(path.join(rootDir, 'scripts'));
console.log('All www.seekname.cn references have been replaced with seekname.cn');