// IN-GAME sheet for the F2 elite candidates: each panel is the F2 painting at NATIVE resolution (384×216, 1 px of
// art = 1 px of game), with the ship for scale, then upscaled ×3 nearest for viewing.
//   node scripts/_elites/_folha-emjogo.mjs <candDir> <out.png>
import path from 'node:path';
import sharp from 'sharp';

const [cand, saida] = process.argv.slice(2);
const W = 384;
const H = 216;
const Z = 3;
const BG = 'public/sprites/paint-bg-f2.png';
const SHIP = 'public/sprites/ship-jato.png';

const sprite = async (arq, { flip = false } = {}) => {
  let s = sharp(arq).trim({ threshold: 0 });
  if (flip) s = s.flop();
  const { data, info } = await s.png().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const c = (n) => path.join(cand, `${n}.png`);
const texto = (t, x, y) => ({
  input: Buffer.from(`<svg width="${W * Z}" height="40"><text x="0" y="28" font-family="monospace" font-size="26" fill="#e8e2d0" stroke="#000" stroke-width="1">${t}</text></svg>`),
  left: x * Z,
  top: y * Z - 30,
});

/** One panel: items = [{ arq, x, y (centre), flip, rotulo }] on the F2 painting, ship on the left. */
async function painel(titulo, itens) {
  const base = sharp(BG).resize(W, H);
  const comp = [];
  const nave = await sprite(SHIP);
  comp.push({ input: nave.data, left: 24, top: 100 });
  const rotulos = [];
  for (const it of itens) {
    const s = await sprite(it.arq, it);
    const left = Math.round(it.x - s.w / 2);
    const top = Math.round(it.y - s.h / 2);
    comp.push({ input: s.data, left, top });
    if (it.rotulo) rotulos.push({ t: `${it.rotulo} ${s.w}×${s.h}`, x: left, y: top - 2 });
  }
  const nativo = await base.composite(comp).png().toBuffer();
  const grande = await sharp(nativo).resize(W * Z, H * Z, { kernel: 'nearest' }).png().toBuffer();
  return sharp(grande)
    .composite([texto(titulo, 4, 12), ...rotulos.map((r) => texto(r.t, r.x, r.y))])
    .png()
    .toBuffer();
}

const paineis = [
  await painel('DRONE DE MINERACAO (virado p/ a nave)', [
    { arq: c('drone-11-0'), x: 130, y: 70, flip: true, rotulo: 'A' },
    { arq: c('drone-11-7'), x: 250, y: 70, flip: true, rotulo: 'B' },
    { arq: c('drone2-12-4'), x: 130, y: 160, flip: true, rotulo: 'C' },
    { arq: c('drone2-12-12'), x: 250, y: 160, flip: true, rotulo: 'D' },
    { arq: 'public/sprites/enemy-kamikaze.png', x: 345, y: 115, rotulo: 'kamikaze' },
  ]),
  await painel('ASTEROIDE MINERAVEL', [
    { arq: c('asteroide2-22-0'), x: 130, y: 65, rotulo: 'A' },
    { arq: c('asteroide2-22-2'), x: 250, y: 65, rotulo: 'B' },
    { arq: c('asteroide2-22-8'), x: 130, y: 160, rotulo: 'C' },
    { arq: c('asteroide2-22-14'), x: 250, y: 160, rotulo: 'D' },
    { arq: 'public/sprites/asteroid-2.png', x: 345, y: 115, rotulo: 'rocha' },
  ]),
  await painel('SENTINELA ABERTA (virada p/ a nave)', [
    { arq: c('sentinelaAberta-31-4'), x: 130, y: 65, flip: true, rotulo: 'A' },
    { arq: c('sentinelaAberta2-32-1'), x: 250, y: 65, flip: true, rotulo: 'B' },
    { arq: c('sentinelaAberta2-32-6'), x: 130, y: 160, flip: true, rotulo: 'C' },
    { arq: c('sentinelaAberta2-32-10'), x: 250, y: 160, flip: true, rotulo: 'D' },
  ]),
  await painel('SENTINELA EM RODA + O DRONE MINERANDO', [
    { arq: c('sentinelaRoda-41-13'), x: 110, y: 50, rotulo: 'R1' },
    { arq: c('sentinelaRoda-41-36'), x: 170, y: 50, rotulo: 'R2' },
    { arq: c('sentinelaRoda-41-56'), x: 230, y: 50, rotulo: 'R3' },
    { arq: c('sentinelaRoda-41-7'), x: 290, y: 50, rotulo: 'R4' },
    { arq: c('asteroide2-22-0'), x: 170, y: 150 },
    { arq: c('drone-11-0'), x: 128, y: 150, rotulo: 'A+A' },
    { arq: c('asteroide2-22-14'), x: 320, y: 150 },
    { arq: c('drone2-12-4'), x: 276, y: 150, rotulo: 'C+D' },
  ]),
];

const PW = W * Z;
const PH = H * Z;
await sharp({ create: { width: PW * 2 + 12, height: PH * 2 + 12, channels: 4, background: '#000' } })
  .composite(paineis.map((p, i) => ({ input: p, left: (i % 2) * (PW + 12), top: Math.floor(i / 2) * (PH + 12) })))
  .png()
  .toFile(saida);
console.log(saida);
