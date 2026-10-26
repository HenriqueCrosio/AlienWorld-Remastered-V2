// 26/10 — a GIF's frames in a grid, for a close look: node scripts/_morte/_grade-gif.mjs <gif> <out.png> [de] [ate] [colunas]
import sharp from 'sharp';
const [arq, out, de = '0', ate = '99', cols = '3'] = process.argv.slice(2);
const meta = await sharp(arq, { animated: true }).metadata();
const n = meta.pages, w = meta.width, h = meta.pageHeight;
const sel = [];
for (let i = +de; i <= Math.min(+ate, n - 1); i++) sel.push(i);
const C = +cols, R = Math.ceil(sel.length / C);
const comp = [];
for (let k = 0; k < sel.length; k++) {
  const f = await sharp(arq, { page: sel[k], pages: 1 }).png().toBuffer();
  comp.push({ input: f, left: (k % C) * (w + 4), top: Math.floor(k / C) * (h + 4) });
}
await sharp({ create: { width: C * (w + 4), height: R * (h + 4), channels: 4, background: '#303030' } }).composite(comp).png().toFile(out);
console.log(n, 'quadros', w, 'x', h, '->', out);
