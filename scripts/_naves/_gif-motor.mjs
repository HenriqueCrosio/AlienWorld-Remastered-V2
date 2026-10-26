// A ship animation (or several, side by side) as a magnified GIF at the game's 12 fps, with a name over each.
//   node scripts/_naves/_gif-motor.mjs <out.gif> <prefix>:<n>:<name> [<prefix>:<n>:<name> ...]   (zoom: GIF_ZOOM=5)
// e.g. public/sprites/ship-jato-anim:9:X-AELO  →  reads public/sprites/ship-jato-anim-0..8.png
import sharp from 'sharp';
const [OUT, ...SERIES] = process.argv.slice(2);
const Z = Number(process.env.GIF_ZOOM ?? 5), ROT = 22, M = 8;
// (split from the END: a Windows path has its own ':')
const series = SERIES.map((s) => { const p = s.split(':'); const nome = p.pop(), n = p.pop(); return { pre: p.join(':'), n: Number(n), nome }; });
const meta = await sharp(`${series[0].pre}-0.png`).metadata();
const w = meta.width * Z, h = meta.height * Z;
const N = 36; // 3 s
const W = series.length * (w + M) + M, H = h + ROT + M;
const rotulos = await Promise.all(series.map((s) => sharp(Buffer.from(
  `<svg width="${w}" height="${ROT}" xmlns="http://www.w3.org/2000/svg"><text x="2" y="${ROT - 6}" font-family="Consolas, monospace" font-size="14" fill="#ffb040">${s.nome}</text></svg>`)).png().toBuffer()));
const quadros = [];
for (let q = 0; q < N; q++) {
  const comp = [];
  for (const [k, s] of series.entries()) {
    comp.push({ input: rotulos[k], left: M + k * (w + M), top: 2 });
    comp.push({ input: await sharp(`${s.pre}-${q % s.n}.png`).resize(w, h, { kernel: 'nearest' }).png().toBuffer(), left: M + k * (w + M), top: ROT });
  }
  quadros.push(await sharp({ create: { width: W, height: H, channels: 4, background: '#141821' } }).composite(comp).png().toBuffer());
}
await sharp(quadros, { join: { animated: true } }).gif({ delay: Array(N).fill(83), loop: 0 }).toFile(OUT);
console.log(OUT, N, 'quadros');
