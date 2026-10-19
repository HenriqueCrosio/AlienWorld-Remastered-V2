// BLOCO D · passo 2 — the WEAKENED Leviathan of the final scene (the canonical biomechanical, brought down), made
// FROM the approved base (`aprovado/leviata-base.png`, his pick of 18/10: mandible head 0.85 + shark body, seam 42)
// by inpainting regions, never by generating another creature. Each concept is a chain of regional inpaints:
// the generator repaints one mask with the rest as frozen context, the result is pasted back only inside that mask
// (so nothing else moves by a pixel) and snapped to the base palette plus the old final Leviathan's (`f8-leviata`,
// for the bone and crimson the base does not have).
//   node scripts/_leviata/_gerar-ferido.mjs <concept> <outDir> <seed>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

const [conceito, outDir, SEED_S = '51'] = process.argv.slice(2);
const SEED = Number(SEED_S);
const BASE = 'docs/superpowers/folhas/2026-10-18/leviata/aprovado/leviata-base.png';

const DARK = 'Dark sci-fi pixel art, desaturated, low contrast, light ONLY in the glowing orange lava. Transparent background.';
const FERIDA =
  'A huge gaping torn wound in the armored flank of a colossal space leviathan, side view: the hull plates are ' +
  'ripped open with jagged broken edges, revealing pale curved rib bones arching across a deep dark crimson ' +
  'cavity, a dim orange lava glow deep inside, a few loose plate shards at the rim. ' + DARK;
const DORSAL =
  'The tall dorsal fin of an armored space leviathan, broken and torn: a jagged stub with shredded ragged ' +
  'membrane, missing chunks and snapped spined rays, near-black blue-grey. ' + DARK;
const CASCO =
  'Armor plates torn off the back of a colossal space leviathan, side view: a ragged gap in the hull plating ' +
  'exposing dark crimson membrane and pale rib-like struts, thin glowing orange lava cracks along the torn edges. ' + DARK;
const PEITORAL =
  'The pectoral fin of an armored space leviathan, torn: ragged holes and missing chunks in the fin, broken edge ' +
  'plates, near-black blue-grey. ' + DARK;

// Masks in base pixels: ellipses {e:[cx,cy,rx,ry]} or boxes {r:[x0,y0,x1,y1]}.
const CONCEITOS = {
  unica: [{ e: [185, 80, 32, 26], d: FERIDA }],
  dorsal: [{ e: [185, 80, 32, 26], d: FERIDA }, { r: [176, 0, 246, 44], d: DORSAL }],
  casco: [{ e: [185, 80, 32, 26], d: FERIDA }, { e: [118, 62, 22, 14], d: CASCO }, { e: [258, 50, 20, 11], d: CASCO }],
  pesado: [
    { e: [182, 80, 44, 32], d: FERIDA },
    { r: [176, 0, 246, 44], d: DORSAL },
    { e: [112, 64, 22, 15], d: CASCO },
    { r: [176, 112, 252, 160], d: PEITORAL },
  ],
};
const ops = CONCEITOS[conceito];
if (!ops) throw new Error(`concept? ${Object.keys(CONCEITOS).join(' | ')}`);

const m0 = await sharp(BASE).metadata();
const W = m0.width, H = m0.height;
const dentro = (op, x, y) => {
  if (op.e) { const [cx, cy, rx, ry] = op.e; return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1; }
  const [x0, y0, x1, y1] = op.r; return x >= x0 && x <= x1 && y >= y0 && y <= y1;
};

// Palette: the base + the old final Leviathan.
const cores = new Map();
for (const f of [BASE, 'public/sprites/f8-leviata.png']) {
  const { data } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) cores.set((data[i] << 16) | (data[i + 1] << 8) | data[i + 2], [data[i], data[i + 1], data[i + 2]]);
}
const pal = [...cores.values()];
const snap = (r, g, b) => {
  let best = pal[0], d = Infinity;
  for (const c of pal) { const e = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (e < d) { d = e; best = c; } }
  return best;
};

fs.mkdirSync(outDir, { recursive: true });
let atual = await sharp(BASE).ensureAlpha().raw().toBuffer();
for (const [k, op] of ops.entries()) {
  const mascara = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dentro(op, x, y)) mascara.fill(255, (y * W + x) * 3, (y * W + x) * 3 + 3);
  const [img] = await gerar('/inpaint-v3', {
    description: op.d,
    inpainting_image: { image: b64(await sharp(atual, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()), size: { width: W, height: H } },
    mask_image: { image: b64(await sharp(mascara, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer()), size: { width: W, height: H } },
    no_background: true,
    seed: SEED + k,
  });
  const gen = await sharp(img).resize(W, H, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer();
  const prox = Buffer.from(atual);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!dentro(op, x, y)) continue;
    const i = (y * W + x) * 4;
    if (gen[i + 3] < 110) { prox[i + 3] = 0; continue; }
    const c = snap(gen[i], gen[i + 1], gen[i + 2]);
    prox[i] = c[0]; prox[i + 1] = c[1]; prox[i + 2] = c[2]; prox[i + 3] = 255;
  }
  atual = prox;
}
const arq = path.join(outDir, `${conceito}-${SEED}.png`);
await sharp(atual, { raw: { width: W, height: H, channels: 4 } }).png().toFile(arq);
console.log(arq);
