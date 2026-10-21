// BLOCO G · the F1 ground tile recoloured into HIS painting (spec §4, layer 5): the old cracked-rock tile keeps its
// drawing (and its mirrored seam) and its contrast, a quarter darker (the nearest plane of the painting is its darkest),
// and each pixel takes the painting's colour at that luminance — a SMOOTH ramp (the mean colour of each luminance bin
// of the near mountain), not pixel picks (20/10, 1st try: matching percentiles pixel by pixel on the darkest rock gave
// a near-black, speckled tile). The edge light is the painting's snow. The old tile is kept once as
// assets/raw/ground-tile-original.png.
//   node scripts/_g/_chao-f1.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { lum } from '../_cenario/luzes.mjs';

const ORIG = 'assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png';
const TILE = 'public/sprites/ground-tile.png';
const ANTIGO = 'assets/raw/ground-tile-original.png';
// The near mountain on the left (rock, snow and the mist on it): ORIGINAL pixels.
const AMOSTRA = { left: 252, top: 640, width: 345, height: 250 };
const ESCURECER = 0.75;
const BINS = 32;

if (!fs.existsSync(ANTIGO)) fs.copyFileSync(TILE, ANTIGO);
const r = await sharp(ORIG).extract(AMOSTRA).ensureAlpha().raw().toBuffer();
// The ramp: the mean colour per luminance bin (bins with too few pixels are skipped).
const soma = Array.from({ length: BINS }, () => [0, 0, 0, 0, 0]);
const neve = [];
for (let i = 0; i < r.length; i += 4) {
  const l = lum(r[i], r[i + 1], r[i + 2]);
  const b = Math.min(BINS - 1, Math.floor((l / 128) * BINS));
  const s = soma[b];
  s[0] += r[i]; s[1] += r[i + 1]; s[2] += r[i + 2]; s[3] += l; s[4]++;
  if (l >= 55 && r[i + 2] >= r[i]) neve.push([l, r[i], r[i + 1], r[i + 2]]);
}
const rampa = soma.filter((s) => s[4] >= 20).map((s) => ({ l: s[3] / s[4], c: [s[0] / s[4], s[1] / s[4], s[2] / s[4]] }));
const corEm = (alvo) => {
  let melhor = rampa[0];
  for (const p of rampa) if (Math.abs(p.l - alvo) < Math.abs(melhor.l - alvo)) melhor = p;
  const k = melhor.l > 0 ? alvo / melhor.l : 1;
  return melhor.c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
};

const t = await sharp(ANTIGO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = t.info;
const out = Buffer.from(t.data);
for (let s = 0; s < w * h; s++) {
  if (!t.data[s * 4 + 3]) continue;
  const c = corEm(lum(t.data[s * 4], t.data[s * 4 + 1], t.data[s * 4 + 2]) * ESCURECER);
  out[s * 4] = c[0]; out[s * 4 + 1] = c[1]; out[s * 4 + 2] = c[2];
}
await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(TILE);
neve.sort((a, b) => a[0] - b[0]);
const aresta = neve.length ? neve[neve.length >> 1].slice(1) : [138, 144, 156];
const hex = (c) => '0x' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
console.log(TILE, `${w}x${h}`, 'rampa', rampa.length, 'faixas; neve', neve.length, 'px; aresta', hex(aresta), aresta.join(','));
