import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src');

const replacements = [
  // Backgrounds
  { regex: /bg-slate-950/g, replacement: 'bg-slate-50 dark:bg-slate-950' },
  { regex: /bg-slate-900/g, replacement: 'bg-white dark:bg-slate-900' },
  { regex: /bg-slate-800/g, replacement: 'bg-slate-100 dark:bg-slate-800' },
  { regex: /bg-black/g, replacement: 'bg-slate-50 dark:bg-black' },
  
  // Texts
  { regex: /text-slate-400/g, replacement: 'text-slate-600 dark:text-slate-400' },
  { regex: /text-slate-300/g, replacement: 'text-slate-700 dark:text-slate-300' },
  { regex: /text-slate-200/g, replacement: 'text-slate-800 dark:text-slate-200' },
  { regex: /text-white/g, replacement: 'text-slate-900 dark:text-white' }, // Wait, button text-white?
  
  // Borders
  { regex: /border-slate-800/g, replacement: 'border-slate-200 dark:border-slate-800' },
  { regex: /border-slate-700/g, replacement: 'border-slate-300 dark:border-slate-700' },
];

// Special care for text-white on buttons/cards vs normal text-white.
// The script might be too aggressive.

// Let's refine the regexes.
// We only want to replace if they are NOT already prefixed with `dark:` or `hover:dark:` etc.
// Lookbehind for space or quote or backtick.
const rules = [
  { p: /(?<!dark:)bg-slate-950/g, r: 'bg-slate-50 dark:bg-slate-950' },
  { p: /(?<!dark:)bg-slate-900/g, r: 'bg-white dark:bg-slate-900' },
  { p: /(?<!dark:)bg-slate-800/g, r: 'bg-slate-100 dark:bg-slate-800' },
  { p: /(?<!dark:)bg-black/g, r: 'bg-slate-50 dark:bg-black' },
  { p: /(?<!dark:)text-slate-400/g, r: 'text-slate-600 dark:text-slate-400' },
  { p: /(?<!dark:)text-slate-300/g, r: 'text-slate-700 dark:text-slate-300' },
  { p: /(?<!dark:)text-slate-200/g, r: 'text-slate-800 dark:text-slate-200' },
  { p: /(?<!dark:)border-slate-800/g, r: 'border-slate-200 dark:border-slate-800' },
  { p: /(?<!dark:)border-slate-700/g, r: 'border-slate-300 dark:border-slate-700' },
  
  // Red theme logic (Admin)
  { p: /(?<!dark:)border-red-900/g, r: 'border-red-200 dark:border-red-900' },
  
  // Specific `text-white` replacements. If it's a heading, it's text-white.
  // We don't want to change `text-white` on buttons (`bg-emerald-600 text-white`).
  // So we will NOT replace `text-white` globally. Instead we replace `text-white` only if it's next to `font-bold` or `mb-` (common in headings).
  // Actually, wait, it's easier to just leave text-white alone and use text-slate-900 on headings if we can.
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Protect specific elements where text-white should always be text-white
  // e.g., bg-emerald-600 text-white, bg-red-600 text-white
  content = content.replace(/bg-emerald-600(.*?)\btext-white\b/g, 'bg-emerald-600$1TEXT_WHITE_PROTECTED');
  content = content.replace(/bg-red-600(.*?)\btext-white\b/g, 'bg-red-600$1TEXT_WHITE_PROTECTED');
  content = content.replace(/bg-blue-600(.*?)\btext-white\b/g, 'bg-blue-600$1TEXT_WHITE_PROTECTED');
  
  // Now replace all remaining text-white with the dark mode swap
  if (content.includes('text-white')) {
    content = content.replace(/(?<!dark:)text-white/g, 'text-slate-900 dark:text-white');
    changed = true;
  }
  
  // Restore the protected text-white
  content = content.replace(/TEXT_WHITE_PROTECTED/g, 'text-white');
  
  for (let rule of rules) {
    if (content.match(rule.p)) {
      content = content.replace(rule.p, rule.r);
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
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

traverseDir(srcDir);
console.log('Migration complete.');
