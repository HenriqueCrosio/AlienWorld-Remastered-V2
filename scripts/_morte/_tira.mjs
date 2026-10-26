// Debug: the frames of an animation side by side, magnified.   node scripts/_morte/_tira.mjs <out.png> <prefix> <n> [zoom=6]
import sharp from 'sharp';
const [OUT, PRE, N = '9', Z = '6'] = process.argv.slice(2);
const z = Number(Z), comp = [];
let x = 4, H = 0;
for (let i = 0; i < Number(N); i++) {
  const m = await sharp(`${PRE}-${i}.png`).metadata();
  comp.push({ input: await sharp(`${PRE}-${i}.png`).resize(m.width * z, m.height * z, { kernel: 'nearest' }).png().toBuffer(), left: x, top: 4 });
  x += m.width * z + 4;
  H = Math.max(H, m.height * z + 8);
}
await sharp({ create: { width: x, height: H, channels: 4, background: '#1a1f2b' } }).composite(comp).png().toFile(OUT);
