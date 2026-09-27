// eiken-town.html（単一ファイル配布用）と index.html（Pages公開用）を
// src/ から生成するビルドスクリプト（依存なし・Node標準のみ）。
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

// Pages用: 同一ソースを外部JSとして読み込む index.html を生成する。
// src/*.js をそのまま配信するため、JSの二重管理は発生しない。
const bankBlock = '<script id="question-bank">\n<!--QUESTION_BANK-->\n</script>';
const appBlock = '<script>\n<!--APP-->\n</script>';
if (!template.includes(bankBlock) || !template.includes(appBlock)) {
  throw new Error('src/template.html script blocks changed — update build.mjs');
}
const index = template
  .replace(bankBlock, () => '<script id="question-bank" src="src/question-bank.js"></script>')
  .replace(appBlock, () => '<script src="src/app.js"></script>');
if (index.includes('<!--QUESTION_BANK-->') || index.includes('<!--APP-->')) {
  throw new Error('index.html still contains placeholders');
}

writeFileSync(join(root, 'index.html'), index);
console.log(`built index.html (${Buffer.byteLength(index)} bytes)`);
