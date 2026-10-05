// The drone INSIDE the geode crater (his sketch of 05/10): combos of rock + drone on the F2 painting at native scale,
// plus a ×6 close-up of each. Every combo: [label, rock.png, drone.png, offset of the drone centre from the CRATER
// centre (px), crater centre in the rock (px)].
//   node scripts/_elites/_folha-encaixe.mjs <dir> <out.png>
import path from 'node:path';
import sharp from 'sharp';

const [dir, saida] = process.argv.slice(2);
const W = 384;
const H = 216;
const p = (f) => path.join(dir, f);
const COMBOS = [
  ['A · grande 0 + drone 70%', 'rochaDGrande-53-0-esc.png', 'droneC-070.png', [8, -6], [34, 30]],
  ['B · grande 0 + drone 60%', 'rochaDGrande-53-0-esc.png', 'droneC-060.png', [9, -7], [34, 30]],
  ['C · grande 8 + drone 70%', 'rochaDGrande-53-8-esc.png', 'droneC-070.png', [8, -7], [34, 33]],
  ['D · grande 15 + drone 80%', 'rochaDGrande-53-15-esc.png', 'droneC-080.png', [6, -6], [33, 30]],
];

/** Rock + drone (drone facing LEFT, drill into the crystal), as one transparent image. */
async function par([, rocha, drone, [ox, oy], [cx, cy]]) {
  const r = await sharp(p(rocha)).metadata();
  const d = await sharp(p(drone)).flop().png().toBuffer({ resolveWithObject: true });
  const dx = Math.round(cx + ox - d.info.width / 2);
  const dy = Math.round(cy + oy - d.info.height / 2);
  const left = Math.min(0, dx);
  const top = Math.min(0, dy);
  const w = Math.max(r.width, dx + d.info.width) - left;
  const h = Math.max(r.height, dy + d.info.height) - top;
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: p(rocha), left: -left, top: -top },
      { input: d.data, left: dx - left, top: dy - top },
    ])
    .png()
    .toBuffer({ resolveWithObject: true });
}

const pares = await Promise.all(COMBOS.map(par));
// 1) In game: the four combos on the F2 painting, native, with the ship for scale; then ×3.
const nave = await sharp('public/sprites/ship-jato.png').png().toBuffer();
const xs = [70, 160, 250, 335];
const jogo = await sharp('public/sprites/paint-bg-f2.png')
  .resize(W, H)
  .composite([
    { input: nave, left: 14, top: 160 },
    ...pares.map((q, i) => ({ input: q.data, left: Math.round(xs[i] - q.info.width / 2), top: Math.round(100 - q.info.height / 2) })),
  ])
  .png()
  .toBuffer();
const jogo3 = await sharp(jogo).resize(W * 3, H * 3, { kernel: 'nearest' }).png().toBuffer();
// 2) Close-ups ×6 on a dark ground, with labels.
const Z = 4;
const zooms = await Promise.all(pares.map((q) => sharp(q.data).resize(q.info.width * Z, q.info.height * Z, { kernel: 'nearest' }).png().toBuffer({ resolveWithObject: true })));
const CW = W * 3 / 4;
const CH = Math.max(...zooms.map((z) => z.info.height)) + 50;
const rot = (t, x) => ({ input: Buffer.from(`<svg width="${CW}" height="34"><text x="6" y="26" font-family="monospace" font-size="22" fill="#e8e2d0">${t}</text></svg>`), left: x, top: H * 3 + 6 });
await sharp({ create: { width: W * 3, height: H * 3 + CH, channels: 4, background: '#14171d' } })
  .composite([
    { input: jogo3, left: 0, top: 0 },
    ...zooms.map((z, i) => ({ input: z.data, left: Math.round(i * CW + (CW - z.info.width) / 2), top: H * 3 + 44 })),
    ...COMBOS.map((c, i) => rot(c[0], i * CW)),
  ])
  .png()
  .toFile(saida);
console.log(saida);
