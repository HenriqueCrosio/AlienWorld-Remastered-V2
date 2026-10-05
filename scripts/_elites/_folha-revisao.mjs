// Review sheet of 05/10 (2): the THRUSTER sentinels (no legs) and the COMPLETE rock with the drone in the crater, on
// the F2 painting at native scale (×3), plus ×4 close-ups.
//   node scripts/_elites/_folha-revisao.mjs <candDir> <tratDir> <out.png>
import path from 'node:path';
import sharp from 'sharp';

const [cand, trat, saida] = process.argv.slice(2);
const W = 384;
const H = 216;
const Z = 3;

const img = async (f, flip = false) => {
  let s = sharp(f).trim({ threshold: 0 });
  if (flip) s = s.flop();
  return s.png().toBuffer({ resolveWithObject: true });
};
/** Rock + drone (facing left) with the drone's centre at crater centre + (8, -6) — the placement he approved. */
const par = async (rocha, [cx, cy]) => {
  const r = await img(path.join(trat, rocha));
  const d = await img('public/sprites/elite-drone.png', true);
  const dx = Math.round(cx + 8 - d.info.width / 2);
  const dy = Math.round(cy - 6 - d.info.height / 2);
  return sharp({ create: { width: r.info.width, height: r.info.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: r.data }, { input: d.data, left: dx, top: dy }])
    .png()
    .toBuffer({ resolveWithObject: true });
};

const ITENS = [
  ['S1', await img(path.join(cand, 'sentinelaPropulsores-62-14.png'), true)],
  ['S2', await img(path.join(cand, 'sentinelaPropulsores-63-1.png'), true)],
  ['S3', await img(path.join(cand, 'sentinelaPropulsores-63-5.png'), true)],
  ['S4', await img(path.join(cand, 'sentinelaPropulsores-63-15.png'), true)],
  ['roda R3', await img('public/sprites/elite-sentinela-roda.png')],
  ['A cortada (hoje)', await par('rochaDGrande-53-0-esc.png', [34, 30])],
  ['rocha 0 inteira', await par('rochaInteira-0-esc.png', [40, 36])],
  ['rocha 1 inteira', await par('rochaInteira-1-esc.png', [40, 34])],
];

const POS = [[90, 50], [160, 50], [230, 50], [300, 50], [355, 50], [90, 150], [200, 150], [310, 150]];
const nave = await sharp('public/sprites/ship-jato.png').png().toBuffer();
const nativo = await sharp('public/sprites/paint-bg-f2.png')
  .resize(W, H)
  .composite([
    { input: nave, left: 8, top: 96 },
    ...ITENS.map(([, q], i) => ({ input: q.data, left: Math.round(POS[i][0] - q.info.width / 2), top: Math.round(POS[i][1] - q.info.height / 2) })),
  ])
  .png()
  .toBuffer();
const jogo = await sharp(nativo).resize(W * Z, H * Z, { kernel: 'nearest' }).png().toBuffer();
const rotulos = ITENS.map(([t], i) => ({
  input: Buffer.from(`<svg width="240" height="30"><text x="0" y="22" font-family="monospace" font-size="20" fill="#e8e2d0" stroke="#000" stroke-width="1">${t}</text></svg>`),
  left: Math.max(0, Math.round((POS[i][0] - 20) * Z)),
  top: Math.round((POS[i][1] + (i < 5 ? 24 : 44)) * Z),
}));
// Close-ups ×4 of the four sentinels and the two complete rocks.
const ZZ = 4;
const perto = await Promise.all([0, 1, 2, 3, 6, 7].map((i) => sharp(ITENS[i][1].data).resize(ITENS[i][1].info.width * ZZ, ITENS[i][1].info.height * ZZ, { kernel: 'nearest' }).png().toBuffer({ resolveWithObject: true })));
const PH = Math.max(...perto.map((p) => p.info.height)) + 10;
let x = 0;
const pertoComp = perto.map((p) => {
  const c = { input: p.data, left: x, top: H * Z + 10 };
  x += p.info.width + 12;
  return c;
});
await sharp({ create: { width: Math.max(W * Z, x), height: H * Z + PH + 10, channels: 4, background: '#14171d' } })
  .composite([{ input: jogo, left: 0, top: 0 }, ...rotulos, ...pertoComp])
  .png()
  .toFile(saida);
console.log(saida);
