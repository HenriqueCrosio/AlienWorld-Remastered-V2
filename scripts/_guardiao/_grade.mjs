// magnified crop with a 10 px coordinate grid: node grade.mjs <png> <frame> <x0> <y0> <w> <h> <zoom> <out>
import sharp from 'sharp';
const [src, fr, x0, y0, w, h, z, out] = process.argv.slice(2);
const F = Number(fr), X0 = +x0, Y0 = +y0, W = +w, Hh = +h, Z = +z;
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const o = Buffer.alloc(W * Z * Hh * Z * 4);
for (let y = 0; y < Hh * Z; y++) for (let x = 0; x < W * Z; x++) {
  const sx = X0 + Math.floor(x / Z) + F * 256, sy = Y0 + Math.floor(y / Z);
  const i = (sy * info.width + sx) * 4, j = (y * W * Z + x) * 4;
  const a = data[i + 3] / 255;
  let r = data[i] * a + 58 * (1 - a), g = data[i + 1] * a + 58 * (1 - a), b = data[i + 2] * a + 72 * (1 - a);
  const gx = (X0 + x / Z) % 10 < 1 / Z, gy = (Y0 + y / Z) % 10 < 1 / Z;
  if (gx || gy) { const big = ((X0 + Math.floor(x / Z)) % 50 === 0 && gx) || ((Y0 + Math.floor(y / Z)) % 50 === 0 && gy); r = big ? 255 : 120; g = big ? 255 : 160; b = big ? 0 : 200; }
  o[j] = r; o[j + 1] = g; o[j + 2] = b; o[j + 3] = 255;
}
await sharp(o, { raw: { width: W * Z, height: Hh * Z, channels: 4 } }).png().toFile(out);
