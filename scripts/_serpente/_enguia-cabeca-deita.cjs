// Path A's views back to lying (snout left): rotate −90° and crop/pad to 96×96. node _enguia-cabeca-deita.cjs <in> <out>
const s = require('sharp');
(async () => {
  const [inp, out] = process.argv.slice(2);
  const r = await s(inp).ensureAlpha().rotate(270).png().toBuffer();
  const m = await s(r).metadata();
  const b = await s(r).extract({ left: 0, top: 0, width: Math.min(96, m.width), height: Math.min(96, m.height) }).png().toBuffer();
  const m2 = await s(b).metadata();
  await s(b).extend({ right: 96 - m2.width, bottom: 96 - m2.height, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out);
})();
