// BLOCK SOUND (15/11) — checks a sound sheet in the automated browser before HE sees it: no page error, every take
// decodes, ▶ and ×8 play without error, a choice writes the footer text. Prints the takes that failed to decode.
//   npm run dev  in another terminal, then  node scripts/_som/_folha-conferir.mjs <pasta-da-folha> [--escolher nome=id]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const pasta = process.argv[2];
const escolher = process.argv.includes('--escolher') ? process.argv[process.argv.indexOf('--escolher') + 1] : null;
let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };

const dados = JSON.parse(readFileSync(join(pasta, 'dados.json'), 'utf8'));
const versoes = dados.grupos.flatMap((g) => g.sons.flatMap((s) => s.versoes.map((v) => v.arquivo)));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:5173/${pasta.replaceAll('\\', '/')}/folha.html`, { waitUntil: 'networkidle' });
const n = await page.locator('.versao').count();
ok(n === versoes.length, `every take is on the sheet (${n})`, { n, esperado: versoes.length });
const ruins = await page.evaluate(async (arquivos) => {
  const ctx = new AudioContext();
  const r = [];
  for (const a of arquivos) {
    try { await ctx.decodeAudioData(await (await fetch(a)).arrayBuffer()); } catch (e) { r.push(`${a}: ${e}`); }
  }
  return r;
}, versoes);
ok(ruins.length === 0, 'every take decodes', ruins);
await page.locator('.versao button').first().click();
const vezes = page.locator('.versao button', { hasText: '×8' });
if (await vezes.count()) await vezes.first().click();
await page.waitForTimeout(800);
if (escolher) {
  const [nome, id] = escolher.split('=');
  await page.locator(`input[type=radio][name="${nome}"][value="${id}"]`).check();
  const texto = await page.locator('#texto').inputValue();
  ok(texto.includes(`${nome}: ${id}`), 'a choice writes the footer text', texto);
}
ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
