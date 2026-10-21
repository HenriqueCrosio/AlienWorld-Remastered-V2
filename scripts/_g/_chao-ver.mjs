// BLOCO G · round 5 — a quick still of the ground strips over the painting, with today's props planted, at ×3.
//   node scripts/_g/_chao-ver.mjs <dirWithStrips> <out.png> [offVale=0] [offPais=120] [offFrente=60]
import sharp from 'sharp';
const [DIR, OUT, ov = '0', op = '120', of = '60'] = process.argv.slice(2);
const d = (await import('node:fs')).readFileSync(`${DIR}/chao.json`, 'utf8');
const dados = JSON.parse(d);
const faixa = async (n, ox) => {
  const m = dados[n];
  const strip = await sharp({ create: { width: m.w * 3, height: m.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([0, 1, 2].map((k) => ({ input: `${DIR}/chao-${n}.png`, left: k * m.w, top: 0 }))).png().toBuffer();
  return { input: await sharp(strip).extract({ left: Number(ox), top: 0, width: 384, height: m.h }).png().toBuffer(), left: 0, top: m.y };
};
const base = await sharp('public/sprites/f1/pintura.png').extract({ left: 22, top: 0, width: 384, height: 216 }).png().toBuffer();
const props = [['building', 60, 210], ['silo', 170, 208], ['radar', 290, 212], ['turret', 350, 207]];
const P = [];
for (const [k, x, y] of props) { const m = await sharp(`public/sprites/${k}.png`).metadata(); P.push({ input: `public/sprites/${k}.png`, left: x - (m.width >> 1), top: y - m.height }); }
const img = await sharp(base).composite([await faixa('vale', ov), await faixa('paisagem', op), ...P, await faixa('frente', of)]).png().toBuffer();
await sharp(img).resize(1152, 648, { kernel: 'nearest' }).toFile(OUT);
