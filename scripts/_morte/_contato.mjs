import sharp from 'sharp';
const arqs = process.argv.slice(3);
const out = process.argv[2];
const Z = 8;
const imgs = await Promise.all(arqs.map(async (a) => { const m = await sharp(a).metadata(); return { a, w: m.width, h: m.height }; }));
const W = Math.max(...imgs.map((i) => i.w)) * Z + 16;
const H = imgs.reduce((s, i) => s + i.h * Z + 8, 8);
let y = 8;
const comp = [];
for (const i of imgs) {
  const buf = await sharp(i.a).resize(i.w * Z, i.h * Z, { kernel: 'nearest' }).png().toBuffer();
  comp.push({ input: buf, left: 8, top: y });
  y += i.h * Z + 8;
}
await sharp({ create: { width: W, height: H, channels: 4, background: '#1a1f2b' } }).composite(comp).png().toFile(out);
console.log(imgs.map((i) => `${i.a.split('/').pop()} ${i.w}x${i.h}`).join('\n'));
