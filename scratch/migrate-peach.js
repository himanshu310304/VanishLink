import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src');

const replacements = [
  { regex: /bg-slate-50 dark:bg-slate-950/g, replacement: 'bg-orange-50 dark:bg-slate-950' },
  { regex: /bg-white dark:bg-slate-900/g, replacement: 'bg-orange-100/50 dark:bg-slate-900' },
  { regex: /bg-slate-100 dark:bg-slate-800/g, replacement: 'bg-orange-100 dark:bg-slate-800' },
  { regex: /bg-slate-50 dark:bg-black/g, replacement: 'bg-orange-50 dark:bg-black' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (let rule of replacements) {
    if (content.match(rule.regex)) {
      content = content.replace(rule.regex, rule.replacement);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.css')) {
      processFile(fullPath);
    }
  }
}

traverseDir(srcDir);
console.log('Peach migration complete.');
