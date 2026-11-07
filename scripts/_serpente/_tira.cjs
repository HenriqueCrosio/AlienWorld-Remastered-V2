// A quick strip: the given PNGs side by side on a dark ground, ×4, nearest. node _tira.cjs out.png a.png b.png ...
const s = require('sharp');
(async () => {
  const [out, ...fs] = process.argv.slice(2);
  const ms = await Promise.all(fs.map((f) => s(f).metadata()));
  const W = ms.reduce((a, m) => a + m.width + 4, 4), H = Math.max(...ms.map((m) => m.height)) + 8;
  let x = 4; const comps = fs.map((f, i) => { const c = { input: f, left: x, top: 4 }; x += ms[i].width + 4; return c; });
  const b = await s({ create: { width: W, height: H, channels: 4, background: { r: 40, g: 44, b: 52, alpha: 1 } } }).composite(comps).png().toBuffer();
  await s(b).resize(W * 4, H * 4, { kernel: 'nearest' }).toFile(out);
})();
