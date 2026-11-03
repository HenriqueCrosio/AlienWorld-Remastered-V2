// Contact sheet of a clip + body-motion measure.
//   node hab2-folha.mjs <clipdir> <out.png> [scale=2]
// Body motion: per frame, the share of the LOWER-half opaque pixels (y >= 150 on the 256 canvas: the coils)
// whose opacity or colour differs a lot from frame 0. Head motion: the same for the upper half.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [dir, out, esc = '2'] = process.argv.slice(2);
const k = Number(esc);
const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
const qs = [];
for (let i = 0; i < n; i++) qs.push(await sharp(path.join(dir, `${i}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
const W = qs[0].info.width, H = qs[0].info.height;
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (const { data } of qs) for (let i = 0; i < W * H; i++) if (data[i * 4 + 3] > 64) {
  const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
}
const mov = (a, b, ya, yb) => {
  let tot = 0, dif = 0;
  for (let y = ya; y < yb; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; const oa = a[i + 3] > 64, ob = b[i + 3] > 64;
    if (!oa && !ob) continue; tot++;
    if (oa !== ob) { dif++; continue; }
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (d > 60) dif++;
  }
  return tot ? dif / tot : 0;
};
const linha = [];
for (let i = 0; i < n; i++) linha.push(`${i}:c${(mov(qs[0].data, qs[i].data, 150, H) * 100).toFixed(0)}/h${(mov(qs[0].data, qs[i].data, 0, 150) * 100).toFixed(0)}`);
console.log(path.basename(dir), 'coils/heads % changed vs f0 ->', linha.join(' '));
const cw = x1 - x0 + 1, ch = y1 - y0 + 1, gap = 4;
const cols = Math.min(n, 8), rows = Math.ceil(n / cols);
const comp = [];
for (let i = 0; i < n; i++) {
  const buf = await sharp(qs[i].data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: cw, height: ch })
    .resize(cw * k, ch * k, { kernel: 'nearest' }).png().toBuffer();
  comp.push({ input: buf, left: (i % cols) * (cw * k + gap), top: Math.floor(i / cols) * (ch * k + gap) });
}
await sharp({ create: { width: cols * (cw * k + gap), height: rows * (ch * k + gap), channels: 4, background: { r: 34, g: 38, b: 48, alpha: 1 } } })
  .composite(comp).png().toFile(out);
