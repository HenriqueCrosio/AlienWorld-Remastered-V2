// Top colors of an image (opaque pixels, quantized to 4 bits/channel), to borrow the explosion's palette.
//   node scripts/_morte/_paleta.mjs <png> [n=24]
import sharp from 'sharp';
const [arq, N = '24'] = process.argv.slice(2);
const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const cont = new Map();
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] < 200) continue;
  const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
  cont.set(k, (cont.get(k) ?? 0) + 1);
}
const hex = (k) => [k >> 10, (k >> 5) & 31, k & 31].map((v) => ((v << 3) | 4).toString(16).padStart(2, '0')).join('');
const top = [...cont].sort((a, b) => b[1] - a[1]).slice(0, Number(N));
const lum = (k) => 0.3 * (k >> 10) + 0.59 * ((k >> 5) & 31) + 0.11 * (k & 31);
console.log(info.width, info.height);
console.log(top.sort((a, b) => lum(b[0]) - lum(a[0])).map(([k, n]) => `${hex(k)} ${n}`).join('\n'));
