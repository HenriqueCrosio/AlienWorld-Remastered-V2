// BLOCO E · the title's letters as the game bakes them: Silkscreen at its native 8 px, binarized (fonte.ts `assar`).
// Writes <out>/glifos.json: { w, h, linhas: ["..#..", ...], letras: [{ ch, x0, x1 }] } for the given text.
//   node scripts/_menu/_glifos.mjs <out> ["ALIEN WORLD"]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [OUT, TEXTO = 'ALIEN WORLD'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
const r = await page.evaluate(async (texto) => {
  const f = new FontFace('sk', 'url(/fonts/silkscreen.woff2)');
  await f.load();
  document.fonts.add(f);
  const med = document.createElement('canvas').getContext('2d');
  med.font = '8px "sk"';
  const m = med.measureText('ÁÇgjy|');
  const asc = Math.ceil(m.fontBoundingBoxAscent), h = asc + Math.ceil(m.fontBoundingBoxDescent);
  const letras = [];
  let x = 0;
  for (const ch of texto) { const adv = Math.round(med.measureText(ch).width); letras.push({ ch, x0: x, adv }); x += adv; }
  const w = x + 2;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = med.font; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  for (const l of letras) g.fillText(l.ch, l.x0, asc);
  const d = g.getImageData(0, 0, w, h).data;
  const linhas = [];
  for (let y = 0; y < h; y++) { let s = ''; for (let xx = 0; xx < w; xx++) s += d[(y * w + xx) * 4 + 3] >= 128 ? '#' : '.'; linhas.push(s); }
  return { w, h, asc, linhas, letras };
}, TEXTO);
await browser.close();
// Trim the empty rows and columns, keep each letter's ink span.
const ys = r.linhas.map((l, y) => (l.includes('#') ? y : -1)).filter((y) => y >= 0);
const y0 = ys[0], y1 = ys[ys.length - 1];
const cols = [...Array(r.w).keys()].filter((x) => r.linhas.some((l) => l[x] === '#'));
const x0 = cols[0], x1 = cols[cols.length - 1];
const linhas = r.linhas.slice(y0, y1 + 1).map((l) => l.slice(x0, x1 + 1));
const letras = r.letras.filter((l) => l.ch !== ' ').map((l) => {
  const span = [...Array(l.adv).keys()].map((i) => l.x0 + i).filter((x) => r.linhas.some((ln) => ln[x] === '#'));
  return { ch: l.ch, x0: span[0] - x0, x1: span[span.length - 1] - x0 };
});
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'glifos.json'), JSON.stringify({ w: x1 - x0 + 1, h: y1 - y0 + 1, linhas, letras }, null, 1));
console.log(linhas.join('\n'));
console.log(JSON.stringify(letras));
