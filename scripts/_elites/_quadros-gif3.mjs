// Contact sheet of N evenly spread frames of a GIF: node _quadros-gif3.mjs <gif> <out> <n> [cols]
import fs from 'node:fs';
import sharp from 'sharp';
const [gif, out, n = '9', cols = '3'] = process.argv.slice(2);
const buf = fs.readFileSync(gif);
const m = await sharp(buf).metadata();
const N = Number(n), C = Number(cols), W = 520;
const ims = [];
for (let i = 0; i < N; i++) ims.push(await sharp(buf, { page: Math.round((i * (m.pages - 1)) / (N - 1)) }).resize({ width: W }).png().toBuffer());
const h = (await sharp(ims[0]).metadata()).height;
await sharp({ create: { width: C * W, height: Math.ceil(N / C) * h, channels: 4, background: '#000' } })
  .composite(ims.map((b, i) => ({ input: b, left: (i % C) * W, top: Math.floor(i / C) * h }))).png().toFile(out);
console.log(m.pages);
