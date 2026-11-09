// 08/11 — THE SILHOUETTE CONCEPTS (round 3, plan `plans/2026-11-08-cenario-casco-rodada3.md`): the 4 ship and 4 creature
// options of `src/f3/silhuetasF3.ts`, each 6× over a crop of the arena sky, and all of them at game size (×2 of the native
// screen) over the whole sky with the drifting clouds — the way they will read.
//   node scripts/_cenario/_f3-silhuetas-folha.mjs <out.png>
import sharp from 'sharp';
import { SILHUETAS_HUMANAS, SILHUETAS_CRIATURAS, COR_SILHUETA, carimbo } from '../../src/f3/silhuetasF3.ts';
import { NUVENS_F3 } from '../../src/f3/numerosCeuF3.ts';

const OUT = process.argv[2];
// the clouds where the game starts them (the TileSprite's x0: the tile shifted left by x0, wrapping)
const nuvem = async (arq, x0) => {
  const { data } = await sharp(arq).raw().toBuffer({ resolveWithObject: true });
  const o = Buffer.alloc(data.length);
  for (let y = 0; y < 216; y++) for (let x = 0; x < 384; x++) data.copy(o, (y * 384 + x) * 4, (y * 384 + ((x + x0) % 384)) * 4, (y * 384 + ((x + x0) % 384)) * 4 + 4);
  return sharp(o, { raw: { width: 384, height: 216, channels: 4 } }).png().toBuffer();
};
const ceu = await sharp('public/sprites/f3casco/ceu.png')
  .composite([
    { input: await nuvem('public/sprites/f3casco/nuvem-longe.png', NUVENS_F3[0].x0) },
    { input: await nuvem('public/sprites/f3casco/nuvem-perto.png', NUVENS_F3[1].x0) },
  ])
  .removeAlpha().raw().toBuffer();
const W = 384, H = 216;
const cor = (k, humana) => (k === 0 ? COR_SILHUETA.corpo : k === 1 ? COR_SILHUETA.luz : humana ? COR_SILHUETA.motor : COR_SILHUETA.olho);
const pinta = (buf, w, c, x0, y0, humana) => {
  for (let i = 0; i < c.px.length; i += 3) {
    const x = x0 + c.px[i], y = y0 + c.px[i + 1], o = (y * w + x) * 3, k = cor(c.px[i + 2], humana);
    buf[o] = k[0]; buf[o + 1] = k[1]; buf[o + 2] = k[2];
  }
};
const recorte = (cx, cy, w, h) => {
  const b = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((cy + y) * W + cx + x) * 3, o = (y * w + x) * 3;
    b[o] = ceu[s]; b[o + 1] = ceu[s + 1]; b[o + 2] = ceu[s + 2];
  }
  return b;
};

const CW = 32, CH = 16, Z = 6;
const comps = [];
const linhas = [[SILHUETAS_HUMANAS, true], [SILHUETAS_CRIATURAS, false]];
for (const [li, [mapas, humana]] of linhas.entries()) {
  for (const [ci, op] of ['A', 'B', 'C', 'D'].entries()) {
    const c = carimbo(mapas[op]);
    const b = recorte(40 + ci * 70, 30 + li * 40, CW, CH);
    pinta(b, CW, c, Math.floor((CW - c.w) / 2), Math.floor((CH - c.h) / 2), humana);
    comps.push({ input: await sharp(b, { raw: { width: CW, height: CH, channels: 3 } }).resize(CW * Z, CH * Z, { kernel: 'nearest' }).png().toBuffer(), left: ci * (CW * Z + 8), top: li * (CH * Z + 8) });
  }
}
// all of them at game size: the ships in a row chased by the creatures, the 4 pairs one over the other
const cena = Buffer.from(ceu);
for (const [i, op] of ['A', 'B', 'C', 'D'].entries()) {
  const y = 22 + i * 26;
  [0, 18, 34].forEach((dx, j) => pinta(cena, W, carimbo(SILHUETAS_HUMANAS[op]), 200 + dx - j * 2, y + (j % 2) * 4, true));
  [0, 16].forEach((dx, j) => pinta(cena, W, carimbo(SILHUETAS_CRIATURAS[op]), 140 + dx, y + 2 + j * 3, false));
}
const largura = 4 * (CW * Z + 8);
comps.push({ input: await sharp(cena, { raw: { width: W, height: H, channels: 3 } }).resize(W * 2, H * 2, { kernel: 'nearest' }).png().toBuffer(), left: Math.floor((largura - W * 2) / 2), top: 2 * (CH * Z + 8) + 8 });
await sharp({ create: { width: largura, height: 2 * (CH * Z + 8) + 8 + H * 2, channels: 3, background: '#0e0f14' } })
  .composite(comps).png().toFile(OUT);
console.log('ok', OUT);
