// Debug: a grid of close-ups of one panel of a kept film (`_filmar-morte.mjs --manter`), at chosen seconds.
//   node scripts/_morte/_grade.mjs <framesDir> <panel> <out.png> [x,y,w,h in panel px] [seconds,...] [zoom=1]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const [DIR, PAINEL, OUT, CAIXA = '40,40,400,260', SEGS = '0.53,0.6,0.67,0.8,0.93,1.1,1.3,1.6,1.9,2.2,2.6,3.0', ZOOM = '1'] = process.argv.slice(2);
const [cx, cy, w0, h0] = CAIXA.split(',').map(Number);
const z = Number(ZOOM), cw = w0 * z, ch = h0 * z;
const HP = 172 * 2 + 26;
const nomes = fs.readdirSync(DIR).filter((n) => n.endsWith('.png')).sort();
const comp = [];
const COL = 4;
const segs = SEGS.split(',').map(Number);
for (const [k, s] of segs.entries()) {
  const i = Math.min(nomes.length - 1, Math.round(s * 30));
  const top = Number(PAINEL) * HP + 26 + cy;
  const buf = await sharp(path.join(DIR, nomes[i])).extract({ left: cx, top, width: w0, height: h0 }).resize(cw, ch, { kernel: 'nearest' }).png().toBuffer();
  const rot = Buffer.from(`<svg width="${cw}" height="18" xmlns="http://www.w3.org/2000/svg"><text x="4" y="14" font-family="Consolas" font-size="13" fill="#ffb040">${s.toFixed(2)} s (q${i})</text></svg>`);
  comp.push({ input: buf, left: (k % COL) * (cw + 6), top: Math.floor(k / COL) * (ch + 24) + 20 });
  comp.push({ input: rot, left: (k % COL) * (cw + 6), top: Math.floor(k / COL) * (ch + 24) });
}
await sharp({ create: { width: COL * (cw + 6), height: Math.ceil(segs.length / COL) * (ch + 24), channels: 4, background: '#000' } }).composite(comp).png().toFile(OUT);
