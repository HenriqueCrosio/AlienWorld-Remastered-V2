// Contact sheet of PixelLab candidates: each at ×Z on dark, labelled, with the opaque box and a top-down score
// (how symmetric the silhouette is top-to-bottom: high = probably seen from above). The label number is the NN of
// `<prefix>-<seed>-NN.png` when all files share one seed (the concept sheet's todas-*.png were made this way).
//   node scripts/_naves/_triagem.mjs <dir> <file prefix> <out.png> [zoom]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [DIR, PREF, OUT, ZS = '4'] = process.argv.slice(2);
const Z = Number(ZS);
const fs_ = fs.readdirSync(DIR).filter((f) => f.startsWith(PREF) && f.endsWith('.png')).sort((a, b) => {
  const na = a.match(/-(\d+)-(\d+)\.png$/), nb = b.match(/-(\d+)-(\d+)\.png$/);
  return na[1] - nb[1] || na[2] - nb[2];
});
const tiles = [], info = [];
let cw = 0, ch = 0;
for (const f of fs_) {
  const { data, info: m } = await sharp(path.join(DIR, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  cw = m.width; ch = m.height;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) if (data[(y * m.width + x) * 4 + 3] > 100) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  // symmetry about the box's horizontal mid-line
  let igual = 0, tot = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const ym = y1 - (y - y0);
    const a = data[(y * m.width + x) * 4 + 3] > 100, b = data[(ym * m.width + x) * 4 + 3] > 100;
    if (a || b) { tot++; if (a && b) igual++; }
  }
  info.push({ f, box: `${x1 - x0 + 1}x${y1 - y0 + 1}`, sim: tot ? igual / tot : 0, n });
}
const COL = 8, TW = cw * Z + 8, TH = ch * Z + 18;
for (const [i, it] of info.entries()) {
  const img = await sharp(path.join(DIR, it.f)).resize(cw * Z, ch * Z, { kernel: 'nearest' }).png().toBuffer();
  const lab = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="16"><text x="2" y="12" font-family="monospace" font-size="11" fill="${it.sim > 0.8 ? '#ff6060' : '#9aa3b5'}">${i} ${it.box} s${it.sim.toFixed(2)}</text></svg>`);
  tiles.push({ input: img, left: (i % COL) * TW + 4, top: Math.floor(i / COL) * TH + 16 }, { input: lab, left: (i % COL) * TW, top: Math.floor(i / COL) * TH });
}
await sharp({ create: { width: COL * TW, height: Math.ceil(info.length / COL) * TH, channels: 4, background: '#1a1d26' } }).composite(tiles).png().toFile(OUT);
fs.writeFileSync(OUT.replace(/\.png$/, '.json'), JSON.stringify(info, null, 1));
console.log(OUT, info.length, 'candidates; top-down suspects (sim>0.8):', info.filter((x) => x.sim > 0.8).length);
