// Contact sheet of chosen frames of an animated GIF (for review): node _quadros-gif2.mjs <gif> <out> <cols> <frame...>
import fs from 'node:fs';
import sharp from 'sharp';
const [gif, out, cols, ...fr] = process.argv.slice(2);
const buf = fs.readFileSync(gif);
const m = await sharp(buf).metadata();
const W = 576, ims = [];
for (const p of fr.map(Number)) ims.push(await sharp(buf, { page: Math.min(p, m.pages - 1) }).resize({ width: W }).png().toBuffer());
const h = (await sharp(ims[0]).metadata()).height, C = Number(cols);
await sharp({ create: { width: C * W, height: Math.ceil(ims.length / C) * h, channels: 4, background: '#000' } })
  .composite(ims.map((b, i) => ({ input: b, left: (i % C) * W, top: Math.floor(i / C) * h }))).png().toFile(out);
console.log(m.pages);
