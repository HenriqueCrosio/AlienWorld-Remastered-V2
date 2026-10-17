// 17/10 — ITEM 7 (polish block C), THE BRIDGE: he chose the /image-to-pixelart redraw (the one that keeps the amber
// lamp and the detail) and asked for it bigger, so the deck clears the tables. /image-to-pixelart caps at 320 px a side
// and the bridge needs ~384 (248 px × 1.55, the top of its computed scale range in the `Parallax`), so it is redrawn in
// TWO OVERLAPPING HALVES and stitched back along a MIN-COST SEAM — a crooked path through the overlap where the two
// redraws agree the most. Never a straight cut (his rule: no straight cuts, no visible seams).
//   node scripts/_polimento/_ponte-em-metades.mjs <approved png> <K> <out dir> <seed> [overlap px of the source]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { gerar } from '../_f8/_pl.mjs';
import { naPaleta, paletaDe } from '../_f8/_paleta.mjs';

const [SRC, K_S, OUT, SEED_S, SOBRA_S] = process.argv.slice(2);
const K = Number(K_S), SEED = Number(SEED_S), SOBRA = Number(SOBRA_S ?? 40);
fs.mkdirSync(OUT, { recursive: true });
const nome = path.basename(SRC, '.png');
const m = await sharp(SRC).metadata();
const W = Math.round(m.width * K), H = Math.round(m.height * K);
const grande = await sharp(SRC).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer();
const alfa = await sharp(grande).ensureAlpha().extractChannel(3).threshold(128).raw().toBuffer();

// The two halves, in OUTPUT pixels: [0, meio + sobra) and [meio − sobra, W).
const meio = Math.round(W / 2), sobra = Math.round(SOBRA * K / 2);
const metades = [
  { x0: 0, x1: meio + sobra },
  { x0: meio - sobra, x1: W },
];

async function redesenha({ x0, x1 }) {
  const w = x1 - x0;
  if (w > 320 || H > 320) throw new Error(`half ${w}×${H} passes the 320 px cap`);
  const pedaco = await sharp(grande).extract({ left: x0, top: 0, width: w, height: H }).png().toBuffer();
  const [img] = await gerar('/image-to-pixelart', {
    image: { type: 'base64', base64: pedaco.toString('base64'), format: 'png' },
    image_size: { width: w, height: H }, output_size: { width: w, height: H }, seed: SEED,
  });
  return sharp(img).resize(w, H, { kernel: 'nearest' }).removeAlpha().raw().toBuffer();
}

const [esq, dir] = [await redesenha(metades[0]), await redesenha(metades[1])];
const ox0 = metades[1].x0, ox1 = metades[0].x1, ow = ox1 - ox0;
const pE = (x, y) => (y * (ox1) + x) * 3; // left half: global x
const pD = (x, y) => (y * (W - ox0) + (x - ox0)) * 3; // right half: global x
// The cost of cutting at (x, y): how much the two redraws disagree there (0 where the piece is empty).
const custo = (x, y) => {
  if (!alfa[y * W + x]) return 0;
  const a = pE(x, y), b = pD(x, y);
  return Math.abs(esq[a] - dir[b]) + Math.abs(esq[a + 1] - dir[b + 1]) + Math.abs(esq[a + 2] - dir[b + 2]);
};
// Dynamic programming, top to bottom, the path moving at most 1 px sideways per row. Keep it off the overlap's edges.
const margem = 4, lo = ox0 + margem, hi = ox1 - margem;
const acc = Array.from({ length: H }, () => new Float64Array(W).fill(Infinity));
const de = Array.from({ length: H }, () => new Int32Array(W));
for (let x = lo; x < hi; x++) acc[0][x] = custo(x, 0);
for (let y = 1; y < H; y++)
  for (let x = lo; x < hi; x++) {
    let best = Infinity, bx = x;
    for (const dx of [-1, 0, 1]) {
      const px = x + dx;
      if (px >= lo && px < hi && acc[y - 1][px] < best) { best = acc[y - 1][px]; bx = px; }
    }
    acc[y][x] = best + custo(x, y);
    de[y][x] = bx;
  }
let cx = lo;
for (let x = lo; x < hi; x++) if (acc[H - 1][x] < acc[H - 1][cx]) cx = x;
const corte = new Int32Array(H);
for (let y = H - 1; y >= 0; y--) { corte[y] = cx; cx = de[y][cx]; }

const px = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, j = x < corte[y] ? pE(x, y) : pD(x, y), src = x < corte[y] ? esq : dir;
    const [r, g, b] = [src[j], src[j + 1], src[j + 2]];
    // The grey ground of /image-to-pixelart leaking into the outline (see `_gerar-nativo.mjs`).
    const chao = Math.abs(r - 128) < 12 && Math.abs(g - 127) < 12 && Math.abs(b - 125) < 12;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = chao ? 0 : alfa[y * W + x];
  }
const arq = path.join(OUT, `${nome}-metades-${SEED}.png`);
await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toFile(arq);
fs.writeFileSync(arq.replace(/\.png$/, '-paleta.png'), await naPaleta(fs.readFileSync(arq), await paletaDe(SRC, 64)));
// The seam, drawn in red on a copy, so the sheet can show WHERE it runs.
const marca = Buffer.from(px);
for (let y = 0; y < H; y++) { const i = (y * W + corte[y]) * 4; marca[i] = 255; marca[i + 1] = 0; marca[i + 2] = 0; marca[i + 3] = 255; }
await sharp(marca, { raw: { width: W, height: H, channels: 4 } }).png().toFile(arq.replace(/\.png$/, '-costura.png'));
console.log(`${arq}: ${W}×${H} (×${K}), halves ${metades.map((h) => h.x1 - h.x0).join('+')}, seam x ${Math.min(...corte)}–${Math.max(...corte)}`);
