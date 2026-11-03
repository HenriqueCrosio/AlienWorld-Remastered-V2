// 02/11 — clears the generator's LOOSE SPECKS (the sparks and dots it paints around a head): opaque 8-connected bits
// smaller than `max` px, touching nothing else, LIT (some pixel's luminance ≥ `luz`: the art's own loose bits — the
// dorsal spines, the teeth's tips — are dark outline pieces and stay), that are NOT in any reference frame (a bit is
// kept when at least half of it is opaque in a reference, within `folga` px; refs comma-separated: the pose the set
// starts from and the one it ends on). Only inside the box [x0, y0, x1, y1) when given. Everything else is untouched.
//   node pintas.mjs <in-dir> <out-dir> <ref.png[,ref2.png]> [max=16] [folga=2] [luz=120] [caixa=x0,y0,x1,y1]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [IN, OUT, REF, ...resto] = process.argv.slice(2);
const opc = Object.fromEntries(resto.map((a) => a.split('=')));
const MAX = Number(opc.max ?? 16), FOLGA = Number(opc.folga ?? 2), LUZ = Number(opc.luz ?? 120);
const CX = opc.caixa ? opc.caixa.split(',').map(Number) : [0, 0, 256, 256];
const W = 256, H = 256;
// the references' opacity, grown by `folga` (the stump's sparks flicker a pixel or two between frames)
const perto = new Uint8Array(W * H);
for (const arq of REF.split(',')) {
  const ref = await sharp(arq).ensureAlpha().raw().toBuffer();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ref[(y * W + x) * 4 + 3] >= 64)
    for (let dy = -FOLGA; dy <= FOLGA; dy++) for (let dx = -FOLGA; dx <= FOLGA; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < W && Y < H) perto[Y * W + X] = 1;
    }
}
const lum = (d, j) => 0.2126 * d[j * 4] + 0.7152 * d[j * 4 + 1] + 0.0722 * d[j * 4 + 2];
fs.mkdirSync(OUT, { recursive: true });
const n = fs.readdirSync(IN).filter((f) => /^\d+\.png$/.test(f)).length;
const rel = [];
for (let f = 0; f < n; f++) {
  const d = await sharp(path.join(IN, `${f}.png`)).ensureAlpha().raw().toBuffer();
  const visto = new Uint8Array(W * H);
  let tirados = 0;
  for (let s = 0; s < W * H; s++) {
    if (visto[s] || d[s * 4 + 3] < 64) continue;
    const reg = [s]; visto[s] = 1;
    for (let q = 0; q < reg.length && reg.length <= MAX; q++) {
      const x0 = reg[q] % W, y0 = (reg[q] / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = x0 + dx, y = y0 + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const j = y * W + x;
        if (!visto[j] && d[j * 4 + 3] >= 64) { visto[j] = 1; reg.push(j); }
      }
    }
    if (reg.length > MAX) continue;
    const dentro = reg.every((j) => { const x = j % W, y = (j / W) | 0; return x >= CX[0] && y >= CX[1] && x < CX[2] && y < CX[3]; });
    if (!dentro || !reg.some((j) => lum(d, j) >= LUZ)) continue;
    const naRef = reg.filter((j) => perto[j]).length;
    if (naRef * 2 >= reg.length) continue;
    for (const j of reg) d[j * 4 + 3] = 0;
    tirados += reg.length;
  }
  rel.push(tirados);
  await sharp(d, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `${f}.png`));
}
console.log(path.basename(IN), 'specks px cleared per frame:', rel.join(' '));
