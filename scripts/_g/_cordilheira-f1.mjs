// BLOCO G · the F1 mountain bands, cut from the NEAR mountains of HIS painting (spec §4, layer 4). Each piece follows
// its RIDGE: per column, the top of the rock is the first run of dark pixels (a thin wisp of fog above it does not
// count), smoothed by a median; everything below the ridge is the mountain, mist painted in front of the rock included
// (as in the painting). The two ends ramp down to the base, so a piece never ends in a vertical wall. Reduced ONCE from
// the original to each band height; the alpha is dithered. The far band is the SAME pieces smaller and hazier (the
// "back layer shrinks" rule).
// (20/10, 1st try: alpha from darkness + hole filling kept the fog bands crossing the rock as solid blobs, and a piece
// touching the box sides came out as a rectangle.)
//   node scripts/_g/_cordilheira-f1.mjs [outDir=public/sprites] [sheetDir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { lum } from '../_cenario/luzes.mjs';

const [OUT = 'public/sprites', FOLHA = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1'] = process.argv.slice(2);
const ORIG = 'assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png';
// The pieces, in ORIGINAL pixels: a box around each near mass whose TOP ROWS are the light fog above its ridge (the sky
// behind these mountains is as dark as the rock, so the box top must sit in the mist), its bottom on the bottom of the
// painting, and no colony light inside (it would show twice, moving): the right slope of the big mountain on the left
// and the big mountain on the right. (20/10: the dark hills in the middle carried colony lights, and the pine ridge at
// the bottom has almost no fog above it — fog 10.6 against rock 8.1 — so its ridge came out in steps. Two pieces, both
// bands, flipped at random.)
const PECAS = [
  { nome: 'encosta', x: 252, y: 552, w: 345, h: 338 },
  { nome: 'direita', x: 1448, y: 455, w: 320, h: 435 },
];
// The ridge: per piece, the threshold is halfway between the fog (median lum of the top 4 rows) and the rock (median of
// the bottom third); the ridge is the first run of RUN pixels darker than it down a column; a median of ±MEDIANA
// columns; the ends ramp down over RAMPA of the width (a quadratic ease, not a straight cut). NEVOA is the fog's lower
// bound (for the fog colour below).
const RUN = 4, MEDIANA = 4, RAMPA = 0.2, NEVOA = 36;
// The bands: the height of the TALLEST piece (game px; the others keep their size relative to it) and the haze.
const BANDAS = [
  { arquivo: 'f1-cordilheira-perto', altura: 80, nevoa: 0 },
  { arquivo: 'f1-cordilheira', altura: 52, nevoa: 0.22 },
];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
fs.mkdirSync(FOLHA, { recursive: true });

const orig = await sharp(ORIG).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const OW = orig.info.width, OH = orig.info.height, px = orig.data;

// The fog colour: the mean of the fog-lit pixels (lum NEVOA..70) in the lower half of the painting.
const nev = [0, 0, 0];
let nn = 0;
for (let y = OH >> 1; y < OH; y++) for (let x = 0; x < OW; x++) {
  const i = (y * OW + x) * 4, l = lum(px[i], px[i + 1], px[i + 2]);
  if (l >= NEVOA && l <= 70) { nev[0] += px[i]; nev[1] += px[i + 1]; nev[2] += px[i + 2]; nn++; }
}
const corNevoa = nev.map((v) => v / nn);

function recortar(p) {
  const { w, h } = p;
  const rgba = Buffer.alloc(w * h * 4);
  const L = new Float32Array(w * h);
  let quentes = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((p.y + y) * OW + (p.x + x)) * 4, s = y * w + x;
    for (let c = 0; c < 3; c++) rgba[s * 4 + c] = px[i + c];
    L[s] = lum(px[i], px[i + 1], px[i + 2]);
    if (px[i] >= 105 && px[i] > px[i + 2] + 45) quentes++;
  }
  const mediana = (y0, y1) => { const v = []; for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) v.push(L[y * w + x]); v.sort((a, b) => a - b); return v[v.length >> 1]; };
  const nevoaTopo = mediana(0, 4), rochaBase = mediana(Math.floor((h * 2) / 3), h);
  const limiar = (nevoaTopo + rochaBase) / 2;
  console.log(p.nome, 'névoa no topo', nevoaTopo.toFixed(1), 'rocha', rochaBase.toFixed(1), 'limiar', limiar.toFixed(1), 'luzes quentes', quentes);
  const escuro = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) if (L[s] < limiar) escuro[s] = 1;
  // The ridge per column: the first run of RUN dark pixels (h = no rock in this column).
  const cume = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    cume[x] = h;
    let run = 0;
    for (let y = 0; y < h; y++) {
      run = escuro[y * w + x] ? run + 1 : 0;
      if (run === RUN) { cume[x] = y - RUN + 1; break; }
    }
  }
  // A median over ±MEDIANA columns (a lone dark pixel column is not a peak), then the ends ramp down to the base.
  const liso = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const viz = [];
    for (let d = -MEDIANA; d <= MEDIANA; d++) viz.push(cume[Math.min(w - 1, Math.max(0, x + d))]);
    viz.sort((a, b) => a - b);
    const ponta = Math.min(x, w - 1 - x) / (RAMPA * w);
    liso[x] = Math.max(viz[MEDIANA], ponta < 1 ? h * (1 - ponta) * (1 - ponta) : 0);
  }
  let y0 = h;
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) rgba[(y * w + x) * 4 + 3] = y >= liso[x] ? 255 : 0;
    y0 = Math.min(y0, Math.ceil(liso[x]));
  }
  return { rgba, w, h, caixa: { left: 0, top: y0, width: w, height: h - y0 } };
}

const recortes = PECAS.map((p) => ({ p, ...recortar(p) }));
const maisAlto = Math.max(...recortes.map((r) => r.caixa.height));
const folha = [];
for (const b of BANDAS) {
  for (let n = 0; n < recortes.length; n++) {
    const r = recortes[n];
    const esc = b.altura / maisAlto;
    const ow = Math.max(1, Math.round(r.caixa.width * esc)), oh = Math.max(1, Math.round(r.caixa.height * esc));
    const out = await sharp(r.rgba, { raw: { width: r.w, height: r.h, channels: 4 } })
      .extract(r.caixa).resize(ow, oh, { kernel: 'lanczos3' }).raw().toBuffer();
    for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
      const i = (y * ow + x) * 4;
      const al = out[i + 3] / 255;
      out[i + 3] = al > 0.86 ? 255 : al > BAYER4[(y % 4) * 4 + (x % 4)] ? 255 : 0;
      // The bottom row is buried under the ground anyway: solid, so the base never shows a dithered seam.
      if (y === oh - 1 && al > 0.2) out[i + 3] = 255;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round(out[i + c] * (1 - b.nevoa) + corNevoa[c] * b.nevoa);
    }
    const nome = `${b.arquivo}${n === 0 ? '' : `-${n + 1}`}.png`;
    await sharp(out, { raw: { width: ow, height: oh, channels: 4 } }).png().toFile(path.join(OUT, nome));
    folha.push({ nome, buf: await sharp(out, { raw: { width: ow, height: oh, channels: 4 } }).png().toBuffer(), ow, oh });
    console.log(nome, `${ow}x${oh}`, r.p.nome);
  }
}
// The sheet: every piece ×4 on the fog colour, bases aligned.
const Z = 4, PAD = 8;
const larg = folha.reduce((a, f) => a + f.ow * Z + PAD, PAD), alt = Math.max(...folha.map((f) => f.oh)) * Z + 2 * PAD;
let x = PAD;
const camadas = [];
for (const f of folha) {
  camadas.push({ input: await sharp(f.buf).resize(f.ow * Z, f.oh * Z, { kernel: 'nearest' }).png().toBuffer(), left: x, top: alt - PAD - f.oh * Z });
  x += f.ow * Z + PAD;
}
const bg = corNevoa.map((v) => Math.round(v));
await sharp({ create: { width: larg, height: alt, channels: 4, background: { r: bg[0], g: bg[1], b: bg[2], alpha: 1 } } })
  .composite(camadas).png().toFile(path.join(FOLHA, 'cordilheira.png'));
console.log('névoa', bg.join(','), 'folha', path.join(FOLHA, 'cordilheira.png'));
