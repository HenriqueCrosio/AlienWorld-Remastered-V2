// Silhouette-only body motion: per frame, pixels in the COIL band (y >= 150 on the 256 canvas) whose opacity flips
// vs frame 0 (colour drift ignored), as % of frame 0's coil pixels; plus the coil band's bbox shift.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
for (const dir of process.argv.slice(2)) {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
  const fr = [];
  for (let i = 0; i < n; i++) fr.push((await sharp(path.join(dir, `${i}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  const W = fr[0].info.width, H = fr[0].info.height;
  const op = (d, x, y) => d[(y * W + x) * 4 + 3] > 64;
  let base = 0; for (let y = 150; y < H; y++) for (let x = 0; x < W; x++) if (op(fr[0].data, x, y)) base++;
  let mx = 0; const out = [];
  for (let i = 0; i < n; i++) {
    let d = 0, top = H, l = W, r = 0;
    for (let y = 150; y < H; y++) for (let x = 0; x < W; x++) {
      const a = op(fr[0].data, x, y), b = op(fr[i].data, x, y);
      if (a !== b) d++;
      if (b) { l = Math.min(l, x); r = Math.max(r, x); }
    }
    for (let y = 100; y < H; y++) { let any = false; for (let x = 0; x < W; x++) if (op(fr[i].data, x, y) && x > 40) { any = true; break; } if (any) { top = y; break; } }
    const p = (d / base) * 100; mx = Math.max(mx, p); out.push(p.toFixed(0));
  }
  console.log(path.basename(dir).padEnd(8), 'max', mx.toFixed(0).padStart(3) + '%', ' per frame:', out.join(' '));
}
