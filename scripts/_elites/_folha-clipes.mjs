// A sheet of animation CLIPS (one row each, chosen frames, magnified on a neutral background) — to compare takes.
//   node scripts/_elites/_folha-clipes.mjs <out.png> <zoom> <frames,comma,separated> <clipDir> [<clipDir> ...]
// Each clipDir holds 0.png … N.png (as `scripts/_f4/_pl.mjs anim|mini` writes them).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [OUT, ZOOM, QUADROS, ...CLIPES] = process.argv.slice(2);
const Z = Number(ZOOM);
const LH = 22;
const linhas = [];
for (const dir of CLIPES) {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
  const qs = QUADROS === 'todos' ? [...Array(n).keys()] : QUADROS.split(',').map(Number).filter((q) => q < n);
  const ims = [];
  for (const q of qs) {
    const f = path.join(dir, `${q}.png`);
    const m = await sharp(f).metadata();
    ims.push({ buf: await sharp(f).resize(m.width * Z, m.height * Z, { kernel: 'nearest' }).png().toBuffer(), w: m.width * Z, h: m.height * Z, q });
  }
  linhas.push({ nome: path.basename(dir), ims });
}
const W = Math.max(...linhas.map((l) => l.ims.reduce((s, i) => s + i.w + 4, 0)));
const H = linhas.reduce((s, l) => s + LH + Math.max(...l.ims.map((i) => i.h)) + 8, 0);
const comp = [];
let top = 0;
for (const l of linhas) {
  comp.push({ input: Buffer.from(`<svg width="${W}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="16" font-family="Consolas" font-size="15" fill="#ffb040">${l.nome} — quadros ${l.ims.map((i) => i.q).join(', ')}</text></svg>`), left: 0, top });
  let left = 0;
  for (const i of l.ims) {
    comp.push({ input: i.buf, left, top: top + LH });
    left += i.w + 4;
  }
  top += LH + Math.max(...l.ims.map((i) => i.h)) + 8;
}
await sharp({ create: { width: W, height: H, channels: 4, background: '#3a4660' } }).composite(comp).png().toFile(OUT);
console.log(OUT);
