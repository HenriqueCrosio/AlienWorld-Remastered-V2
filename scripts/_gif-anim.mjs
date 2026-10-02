// An animated GIF from numbered frames, scaled ×zoom over the dark backdrop (to judge motion, not frames).
// Usage: node scripts/_gif-anim.mjs <frames-dir> <out.gif> <ms-per-frame> <zoom> <first> <last>
import sharp from 'sharp';
const [DIR, OUT, MS, Z, A, B] = process.argv.slice(2);
const z = Number(Z);
const quadros = [];
for (let i = Number(A); i <= Number(B); i++) {
  const q = await sharp(`${DIR}/${i}.png`).ensureAlpha().png().toBuffer();
  const m = await sharp(q).metadata();
  const u = await sharp(q).resize(m.width * z, m.height * z, { kernel: 'nearest' }).toBuffer();
  quadros.push(await sharp({ create: { width: m.width * z, height: m.height * z, channels: 4, background: { r: 11, g: 13, b: 20, alpha: 1 } } }).composite([{ input: u }]).png().toBuffer());
}
await sharp(quadros, { join: { animated: true } }).gif({ delay: Array(quadros.length).fill(Number(MS)), loop: 0 }).toFile(OUT);
console.log(OUT, quadros.length, 'quadros');
