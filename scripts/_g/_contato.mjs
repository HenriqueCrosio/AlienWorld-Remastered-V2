// BLOCO G · a contact sheet of every PNG in a folder, ×Z on the night sky of the F1 painting, with its index on top
// (the order of the file names) — for the triage before a sheet.
//   node scripts/_g/_contato.mjs <dir> <out.png> [zoom=3] [colunas=8]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [DIR, OUT, ZS = '3', CS = '8'] = process.argv.slice(2);
const Z = Number(ZS), COL = Number(CS);
const nomes = fs.readdirSync(DIR).filter((n) => n.endsWith('.png')).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const imgs = [];
for (const n of nomes) {
  const m = await sharp(path.join(DIR, n)).metadata();
  imgs.push({ n, w: m.width * Z, h: m.height * Z, b: await sharp(path.join(DIR, n)).resize(m.width * Z, m.height * Z, { kernel: 'nearest' }).png().toBuffer() });
}
const cw = Math.max(...imgs.map((i) => i.w)) + 8, ch = Math.max(...imgs.map((i) => i.h)) + 20;
const linhas = Math.ceil(imgs.length / COL);
const rotulo = (txt) => Buffer.from(`<svg width="${cw}" height="14"><text x="2" y="11" font-family="monospace" font-size="11" fill="#9aa3b5">${txt}</text></svg>`);
const comp = [];
imgs.forEach((im, k) => {
  const x = (k % COL) * cw, y = Math.floor(k / COL) * ch;
  comp.push({ input: rotulo(`${k} ${im.n.replace(/\.png$/, '')}`), left: x, top: y });
  comp.push({ input: im.b, left: x + 4, top: y + 16 + (ch - 20 - im.h) });
});
await sharp({ create: { width: COL * cw, height: linhas * ch, channels: 4, background: { r: 20, g: 26, b: 38, alpha: 1 } } })
  .composite(comp).png().toFile(OUT);
console.log(OUT, imgs.length);
