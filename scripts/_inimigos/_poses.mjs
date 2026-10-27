import sharp from 'sharp';
const [out, ...items] = process.argv.slice(2);
// item = file:frameW:nFrames(take every k):scale
const rows = [];
for (const it of items) {
  const [file, fw, take] = it.split(':');
  const img = sharp('public/sprites/' + file).ensureAlpha();
  const m = await img.metadata();
  const w = Number(fw) || m.width, n = Math.floor(m.width / w);
  const idx = take ? take.split(',').map(Number).filter((q) => q < n) : [...Array(n).keys()];
  const tiles = [];
  for (const q of idx) {
    const t = await sharp('public/sprites/' + file).extract({ left: q * w, top: 0, width: w, height: m.height }).resize(Math.round(w * 0.5), Math.round(m.height * 0.5), { kernel: 'nearest' }).png().toBuffer();
    tiles.push(t);
  }
  rows.push({ file, tiles, w: Math.round(w * 0.5), h: Math.round(m.height * 0.5) });
}
const W = Math.max(...rows.map((r) => r.tiles.length * (r.w + 4))) + 200;
let H = 0; for (const r of rows) H += r.h + 18;
const comp = []; let y = 0;
for (const r of rows) {
  comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="16"><text x="2" y="12" font-size="12" fill="#ffb040" font-family="monospace">${r.file}</text></svg>`), left: 0, top: y });
  r.tiles.forEach((t, i) => comp.push({ input: t, left: i * (r.w + 4), top: y + 16 }));
  y += r.h + 18;
}
await sharp({ create: { width: W, height: H, channels: 4, background: '#3a4250' } }).composite(comp).png().toFile(out);
console.log(out, W, H);
