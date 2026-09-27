// eiken-town.html を src/ から生成するビルドスクリプト（依存なし・Node標準のみ）。
// 使い方: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = p => readFileSync(join(root, p), 'utf8');

const template = read('src/template.html');
const bank = read('src/question-bank.js');
const app = read('src/app.js');

for (const [name, src] of [['question-bank.js', bank], ['app.js', app]]) {
  if (src.includes('</script')) throw new Error(`${name} contains "</script" — inline embedding would break the HTML`);
}
if (!template.includes('<!--QUESTION_BANK-->') || !template.includes('<!--APP-->')) {
  throw new Error('src/template.html lacks placeholders');
}

const out = template
  .replace('<!--QUESTION_BANK-->', () => bank.replace(/\n$/, ''))
  .replace('<!--APP-->', () => app.replace(/\n$/, ''));

writeFileSync(join(root, 'eiken-town.html'), out);
console.log(`built eiken-town.html (${Buffer.byteLength(out)} bytes)`);
