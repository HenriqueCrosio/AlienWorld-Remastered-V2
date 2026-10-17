// 16/10 — WHERE CAN A PIXMINIMAX CLIP MEET THE STILL ART? The generator takes at most 256×256 and the tail is 368×248,
// so only the rear (x 0..256: the fin and the end of the stalk) is animated, and the front stays as it is. He rejects
// any visible seam between an animated part and a still one (memory partir-da-arte-aprovada). For every column near
// the right edge, this prints how much the generated frames drift from the original (mean |ΔRGB| over the opaque
// pixels, worst frame) and how far the drawing shifted (alpha flips). A seam is only possible where both are ~0.
//   node scripts/_polimento/_emenda-pixminimax.mjs <base-256.png> <frames dir (0.png..N.png)>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [BASE, DIR] = process.argv.slice(2);
const ler = async (f) => (await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
const base = await ler(BASE);
const W = base.info.width, H = base.info.height;
const quadros = fs.readdirSync(DIR).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
const pior = new Float64Array(W), flips = new Float64Array(W);
for (const q of quadros) {
  const { data } = await ler(path.join(DIR, q));
  for (let x = 0; x < W; x++) {
    let soma = 0, n = 0, f = 0;
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      const a0 = base.data[i + 3] > 128, a1 = data[i + 3] > 128;
      if (a0 !== a1) f++;
      if (a0 && a1) { soma += Math.abs(base.data[i] - data[i]) + Math.abs(base.data[i + 1] - data[i + 1]) + Math.abs(base.data[i + 2] - data[i + 2]); n++; }
    }
    pior[x] = Math.max(pior[x], n ? soma / n / 3 : 0);
    flips[x] = Math.max(flips[x], f);
  }
}
const cols = [0, 32, 64, 96, 128, 160, 192, 208, 224, 236, 244, 250, 255];
console.log(`${DIR}: ${quadros.length} frames`);
console.log('col   ' + cols.map((c) => String(c).padStart(5)).join(''));
console.log('ΔRGB  ' + cols.map((c) => pior[c].toFixed(1).padStart(5)).join(''));
console.log('flips ' + cols.map((c) => String(flips[c]).padStart(5)).join(''));
