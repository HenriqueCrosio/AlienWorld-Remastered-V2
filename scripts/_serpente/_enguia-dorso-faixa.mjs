// The body's DORSAL strip (7 Nov): the chosen PixelLab back (a straight segment seen from above, its plates repeating)
// cut at one clean period and tiled to the side strip's length, the spine on row 32 — `enguia-dorso/dorso-corpo.png`,
// read by `arte.mjs` `carregaDorso`.
//   node scripts/_serpente/_enguia-dorso-faixa.mjs <candidato.png>
import fs from 'node:fs';
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-11-07/enguia-dorso';
const [cand = `${DIR}/cru/corpo/11-0.png`] = process.argv.slice(2);
const W = JSON.parse(fs.readFileSync('docs/superpowers/folhas/2026-11-07/enguia-aneis/faixa.json', 'utf8')).w;
const { data, info } = await sharp(cand).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height, px = (x, y) => (y * w + x) * 4;

// the body's rows: the opaque band of the middle column
let a = -1, b = -1;
for (let y = 0; y < h; y++) if (data[px(w >> 1, y) + 3] >= 128) { if (a < 0) a = y; b = y; }
// the period: the shift (6–20 px) where the middle 60% of the image best matches itself
const x0 = Math.round(w * 0.2), x1 = Math.round(w * 0.8);
let P = 0, melhor = Infinity;
for (let d = 6; d <= 20; d++) {
  let e = 0, n = 0;
  for (let x = x0; x + d < x1; x++) for (let y = a; y <= b; y++) {
    const i = px(x, y), j = px(x + d, y);
    e += Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]); n++;
  }
  if (e / n < melhor) { melhor = e / n; P = d; }
}
// the piece: P columns starting where the seam (its first vs the column after its last) matches best
let ini = x0, eIni = Infinity;
for (let x = x0; x + P < x1; x++) {
  let e = 0;
  for (let y = a; y <= b; y++) { const i = px(x, y), j = px(x + P, y); e += Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]); }
  if (e < eIni) { eIni = e; ini = x; }
}
// (7 Nov, his circle on the spine: the glowing nodes along the middle are nowhere on the side art, so mid-roll they
// came in from nothing. Taken out — the rows where the warm nodes sit plus their two bright ridge rows — and the two
// halves closed up, so the chevrons meet in a point down the middle; the stray warm specks get their neighbour's colour)
const quenteP = (i) => data[i + 3] >= 128 && data[i] > 70 && data[i] > data[i + 2] * 1.8;
const nQ = (y) => { let n = 0; for (let x = x0; x < x1; x++) if (quenteP(px(x, y))) n++; return n; };
const meioY = Math.round((a + b) / 2);
let e0 = meioY, e1 = meioY;
while (e0 - 1 > a && nQ(e0 - 1) >= 5) e0--;
while (e1 + 1 < b && nQ(e1 + 1) >= 5) e1++;
e0--; e1++; // (the ridge rows that frame the nodes)
for (let y = a; y <= b; y++) for (let x = 1; x < w - 1; x++) {
  const i = px(x, y);
  if (y >= e0 && y <= e1) continue;
  if (!quenteP(i)) continue;
  const viz = [px(x - 1, y), px(x + 1, y), px(x, y - 1), px(x, y + 1)].find((j) => !quenteP(j) && data[j + 3] >= 128);
  if (viz != null) data.copy(data, i, viz, viz + 4);
}
const linhas = [];
for (let y = a; y <= b; y++) if (y < e0 || y > e1) linhas.push(y);
console.log(`a espinha retirada: linhas ${e0}–${e1} (${e1 - e0 + 1})`);
const H = 64, top = 32 - Math.floor(linhas.length / 2);
const out = Buffer.alloc(W * H * 4);
for (let X = 0; X < W; X++) {
  const sx = ini + (X % P);
  linhas.forEach((y, k) => {
    const Y = top + k;
    if (Y < 0 || Y >= H) return;
    data.copy(out, (Y * W + X) * 4, px(sx, y), px(sx, y) + 4);
  });
}
// the spine's glow toned to the side's red flesh: the back only shows mid-roll, so a brighter glow would flash on and
// off with every turn — the opposite of a quiet roll. Warm pixels (red over blue) scaled so their mean brightness is
// the side strip's warm mean.
{
  const f = await sharp('docs/superpowers/folhas/2026-11-07/enguia-aneis/faixa.png').ensureAlpha().raw().toBuffer();
  const quente = (d, i) => d[i + 3] >= 128 && d[i] > 70 && d[i] > d[i + 2] * 1.8;
  const lum = (d, i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
  // (by the 90th percentile, not the mean: it is the brightest nodes that would flash)
  const p90 = (d) => { const v = []; for (let i = 0; i < d.length; i += 4) if (quente(d, i)) v.push(lum(d, i)); v.sort((a, b) => a - b); return v[Math.floor(v.length * 0.9)] ?? 1; };
  const ls = p90(f), ld = p90(out), k = Math.min(1, ls / ld);
  for (let i = 0; i < out.length; i += 4) if (quente(out, i)) for (let c = 0; c < 3; c++) out[i + c] = Math.round(out[i + c] * k);
  console.log(`a espinha: × ${k.toFixed(2)} (p90 do lado ${ls.toFixed(0)}, do dorso ${ld.toFixed(0)})`);
}
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${DIR}/dorso-corpo.png`);
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).extract({ left: 0, top: 0, width: 200, height: H }).resize(800, 256, { kernel: 'nearest' }).png().toFile(`${DIR}/cru/dorso-corpo-x4.png`);
console.log(`dorso-corpo.png ${W}×${H} · período ${P} px (erro ${melhor.toFixed(1)}), peça x ${ini}, linhas ${a}–${b}`);
