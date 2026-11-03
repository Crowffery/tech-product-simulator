/**
 * 翻译覆盖率：统计源码中「玩家可见的中文字符串」有多少已经包在 tr('中文', 'English') 里。
 * 运行：node scripts/i18n-coverage.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
const root = new URL('../src/', import.meta.url).pathname;
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
})(root);
let total = 0;
let done = 0;
const rows = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const lits = src.match(/(['"`])(?:(?!\1)[^\\\n]|\\.)*[一-龥](?:(?!\1)[^\\\n]|\\.)*\1/g) || [];
  const tr = (src.match(/tr\(\s*(['"`])/g) || []).length;
  total += lits.length;
  done += Math.min(tr, lits.length);
  rows.push([f.replace(root, 'src/'), lits.length, tr]);
}
rows.sort((a, b) => b[1] - a[1]);
for (const [f, n, t] of rows.slice(0, 25)) console.log(`${String(t).padStart(4)} / ${String(n).padStart(4)}  ${f}`);
console.log(`\n已翻译约 ${done} / ${total} 段（${((done / Math.max(1, total)) * 100).toFixed(1)}%）`);
