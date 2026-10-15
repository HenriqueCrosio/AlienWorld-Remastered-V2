// 15/10 — MAKE AN F4 BORDER STRIP TILE (polish items 2 and 3: `f4-faixa-c`, the duct, and `f4-faixa-b`, the ribs).
//
// The strip is repeated every 128px and its two ends do not meet: the duct's left end is three times brighter than its
// right end, and the lava band is cut. The pixel-honest way to fix it, in two steps:
//   prep   — flatten the left→right light trend (a per-column gain, at `forca` of the full correction, keeping the
//            mean), then ROLL the strip by half its width. After the roll the tile's two ends are columns that were
//            neighbours in the middle of the original, so the tile boundary is seamless by construction; the old seam
//            now sits in the middle, where it is repaired by inpainting a narrow band (PixelLab), with the rest of the
//            strip as frozen context.
//   medir  — prints, for a strip, the mean brightness of its two end columns and the mean |difference| between them
//            (the numbers of the report of 14/10: 25.6 × 8.1 and 80 per row on the duct).
//   node scripts/_polimento/_ladrilhar.mjs prep <original png> <out png> [forca 0..1]
//   node scripts/_polimento/_ladrilhar.mjs medir <png>
import sharp from 'sharp';

const [CMD, SRC, OUT, FORCA_S = '0.7'] = process.argv.slice(2);
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const lum = (d, i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];

if (CMD === 'medir') {
  let a = 0, b = 0, diff = 0;
  for (let y = 0; y < H; y++) {
    const i = (y * W) * 4, j = (y * W + W - 1) * 4;
    a += lum(data, i); b += lum(data, j);
    diff += Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]);
  }
  console.log(`${SRC}: left ${(a / H).toFixed(1)}, right ${(b / H).toFixed(1)}, |diff| ${(diff / H).toFixed(1)} per row`);
  process.exit(0);
}

// Flatten: a linear fit of each column's mean luminance, corrected by `forca`.
const FORCA = Number(FORCA_S);
const m = [];
for (let x = 0; x < W; x++) { let s = 0; for (let y = 0; y < H; y++) s += lum(data, (y * W + x) * 4); m.push(s / H); }
const mx = (W - 1) / 2, my = m.reduce((p, q) => p + q) / W;
let num = 0, den = 0;
m.forEach((v, x) => { num += (x - mx) * (v - my); den += (x - mx) ** 2; });
const k = num / den;
const plano = Buffer.from(data);
for (let x = 0; x < W; x++) {
  const f = 1 + FORCA * (my / Math.max(1, my + k * (x - mx)) - 1);
  for (let y = 0; y < H; y++) {
    const i = (y * W + x) * 4;
    for (let c = 0; c < 3; c++) plano[i + c] = Math.min(255, Math.round(data[i + c] * f));
  }
}
// Roll by half: new column x shows old column (x + W/2) % W.
const rolado = Buffer.alloc(plano.length);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const s = (y * W + ((x + W / 2) % W)) * 4, d = (y * W + x) * 4;
  plano.copy(rolado, d, s, s + 4);
}
await sharp(rolado, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);
console.log(`${OUT}: trend ${k.toFixed(3)}/col flattened at ${FORCA}, rolled by ${W / 2}; old seam now at x=${W / 2}`);
