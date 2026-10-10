// Consecutive GIF frames, cropped, in a grid: node _quadros-seq.mjs <gif> <out> <from> <to> <x> <y> <w> <h> [cols]
import fs from 'node:fs';
import sharp from 'sharp';
const [gif, out, de, ate, x, y, w, h, cols = '8'] = process.argv.slice(2);
const buf = fs.readFileSync(gif);
const m = await sharp(buf).metadata();
const ims = [];
for (let p = Number(de); p <= Math.min(Number(ate), m.pages - 1); p++) {
  const b = await sharp(buf, { page: p }).extract({ left: +x, top: +y, width: +w, height: +h }).png().toBuffer();
  const lab = Buffer.from(`<svg width="${w}" height="16" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#000"/><text x="3" y="12" font-family="Consolas" font-size="12" fill="#ffb040">${p}</text></svg>`);
  ims.push(await sharp({ create: { width: +w, height: +h + 16, channels: 4, background: '#000' } }).composite([{ input: lab, left: 0, top: 0 }, { input: b, left: 0, top: 16 }]).png().toBuffer());
}
const C = Number(cols), H = +h + 16;
await sharp({ create: { width: C * +w, height: Math.ceil(ims.length / C) * H, channels: 4, background: '#000' } })
  .composite(ims.map((b, i) => ({ input: b, left: (i % C) * +w, top: Math.floor(i / C) * H }))).png().toFile(out);
console.log(m.pages);
