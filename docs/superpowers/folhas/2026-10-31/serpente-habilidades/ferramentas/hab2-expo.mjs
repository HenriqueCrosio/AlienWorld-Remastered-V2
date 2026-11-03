// EXPOSURE LOCK (31/10, his "cada animação deixa a cor diferente"): the generator keeps the approved 52 colours but in
// some frames shifts the PLATES to darker (or lighter) entries — the whole serpent dims and pops back at the cut to idle.
// For a frame whose plate brightness strays > 3% from the approved frame 0, the plate pixels (approved colours with
// OKLab chroma < 0.065 — the accents, mouths and effects are never touched) are remapped by lightness QUANTILE to the
// approved frame's plate distribution BAND BY BAND (necks, middle, coils, base: the darkening is not uniform), each to the plate colour nearest in lightness among those near its own hue.
//   node hab2-expo.mjs <in-dir> <out-dir>
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [inDir, outDir] = process.argv.slice(2);
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const oklab = (r, g, b) => { r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; };
const ap = await sharp('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/public/sprites/serpente.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const placa = new Map(); // key -> {r,g,b,L,a,b}
for (let i = 0; i < ap.info.width * ap.info.height; i++) if (ap.data[i * 4 + 3] >= 128) {
  const r = ap.data[i * 4], g = ap.data[i * 4 + 1], b = ap.data[i * 4 + 2], k = (r << 16) | (g << 8) | b;
  if (placa.has(k)) continue; const [L, A, B] = oklab(r, g, b); if (Math.hypot(A, B) < 0.065) placa.set(k, { r, g, b, L, A, B });
}
const P = [...placa.values()];
const n = fs.readdirSync(inDir).filter((f) => /^\d+\.png$/.test(f)).length;
fs.mkdirSync(outDir, { recursive: true });
const ler = async (f) => (await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
const ref = await ler('C:/Users/Henrique/AppData/Local/Temp/claude/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/8ff31437-57ef-4a5b-82a7-281ddc3ef938/scratchpad/bote/A-quadro0-256.png');
const FAIXAS = [[0, 100], [100, 150], [150, 200], [200, 256]]; // necks/heads, the middle, the coils, the coils' base
const plates = (d, y0 = 0, y1 = 256) => { const o = []; for (let i = y0 * 256; i < y1 * 256; i++) if (d[i * 4 + 3] > 64) { const k = (d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2]; const p = placa.get(k); if (p) o.push([i, p]); } return o; };
const refF = FAIXAS.map(([a, b]) => plates(ref.data, a, b).map(([, p]) => p.L).sort((x, y) => x - y));
const media = (v) => v.reduce((s, x) => s + x, 0) / v.length;
const rep = [];
for (let f = 0; f < n; f++) {
  const { data, info } = await ler(path.join(inDir, `${f}.png`));
  const linha = [];
  FAIXAS.forEach(([a, b], z) => {
    const refL = refF[z];
    const pl = plates(data, a, b);
    if (pl.length < 50 || refL.length < 50) { linha.push('·'); return; }
    const dev = media(pl.map(([, p]) => p.L)) / media(refL) - 1;
    if (Math.abs(dev) <= 0.03) { linha.push(`${(dev * 100).toFixed(0)}`); return; }
    const ord = pl.map(([, p], j) => [p.L, j]).sort((x, y) => x[0] - y[0]);
    const alvo = new Float64Array(pl.length);
    ord.forEach(([, j], q) => { alvo[j] = refL[Math.min(refL.length - 1, Math.floor((q / ord.length) * refL.length))]; });
    pl.forEach(([i, p], j) => {
      let best = p, bd = 1e9;
      for (const c of P) { const dh = Math.hypot(c.A - p.A, c.B - p.B); const d = (c.L - alvo[j]) ** 2 + 4 * dh * dh; if (d < bd) { bd = d; best = c; } }
      data[i * 4] = best.r; data[i * 4 + 1] = best.g; data[i * 4 + 2] = best.b;
    });
    const dev2 = media(plates(data, a, b).map(([, p]) => p.L)) / media(refL) - 1;
    linha.push(`${(dev * 100).toFixed(0)}→${(dev2 * 100).toFixed(0)}`);
  });
  rep.push(`${f}:[${linha.join(',')}]`);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(path.join(outDir, `${f}.png`));
}
console.log(path.basename(inDir).padEnd(8), 'plate brightness per band vs approved (%), corrected where >3:', rep.join(' '));
