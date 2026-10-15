// 15/10 — A CONTACT SHEET OF EVERY PNG IN A FOLDER, enlarged k× with nearest neighbour (for judging hand-drawn pieces).
//   node scripts/_polimento/_ampliar.mjs <dir> <out png> [k]
import fs from 'node:fs';
import sharp from 'sharp';

const [DIR, OUT, K = '6'] = process.argv.slice(2);
const k = Number(K);
const arqs = fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort();
let y = 8, W = 0;
const comps = [];
for (const f of arqs) {
  const m = await sharp(`${DIR}/${f}`).metadata();
  comps.push({ input: await sharp(`${DIR}/${f}`).resize(m.width * k, m.height * k, { kernel: 'nearest' }).toBuffer(), left: 8, top: y });
  y += m.height * k + 12;
  W = Math.max(W, m.width * k + 16);
}
await sharp({ create: { width: W, height: y, channels: 4, background: { r: 60, g: 60, b: 70, alpha: 1 } } }).composite(comps).png().toFile(OUT);
console.log(OUT, arqs.join(' '));
