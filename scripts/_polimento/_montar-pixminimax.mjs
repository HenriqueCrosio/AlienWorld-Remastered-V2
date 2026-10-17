// 16/10 — A PIXMINIMAX CLIP OF THE REAR OF THE TAIL, SEWN INTO THE WHOLE ART. The generator takes at most 256×256, the
// tail is 368×248: only x 0..256 (fin + end of the stalk) was animated (`base-256.png`, the crop placed at y=4).
// He rejects any visible seam between an animated part and a still one, so per frame:
//   1. the colours are snapped to the palette of the approved art (the generator drifts and brightens frame by frame);
//   2. specks smaller than MIN px are dropped (the generator leaves grey blots around the fin);
//   3. the generated rear meets the original front along a MINIMUM-ERROR SEAM (image-quilting style): a vertical path
//      inside the band [BAND, 255], one column per row, moving at most 1px per row, through the pixels where the two
//      agree best — it follows the plate edges instead of a straight line.
//   node scripts/_polimento/_montar-pixminimax.mjs <full art 368×248> <frames dir 0.png..N.png> <out dir> [band=196]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [ARTE, DIR, OUT, BAND_S = '196'] = process.argv.slice(2);
const BAND = Number(BAND_S), TOPO = 4, MIN = 10, GW = 256;
const orig = await sharp(ARTE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = orig.info.width, H = orig.info.height, O = orig.data;

const paleta = [];
{
  const vistos = new Set();
  for (let p = 0; p < W * H; p++) {
    if (O[p * 4 + 3] < 128) continue;
    const k = (O[p * 4] << 16) | (O[p * 4 + 1] << 8) | O[p * 4 + 2];
    if (!vistos.has(k)) { vistos.add(k); paleta.push([O[p * 4], O[p * 4 + 1], O[p * 4 + 2]]); }
  }
}
const cache = new Map();
const maisPerto = (r, g, b) => {
  const k = (r << 16) | (g << 8) | b;
  if (cache.has(k)) return cache.get(k);
  let best = paleta[0], bd = Infinity;
  for (const c of paleta) { const d = (c[0] - r) ** 2 * 3 + (c[1] - g) ** 2 * 4 + (c[2] - b) ** 2 * 2; if (d < bd) { bd = d; best = c; } }
  cache.set(k, best);
  return best;
};

fs.mkdirSync(OUT, { recursive: true });
const quadros = fs.readdirSync(DIR).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
for (const q of quadros) {
  const g = await sharp(path.join(DIR, q)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // 1. The generated rear in the art's coordinates, alpha made binary, colours on the approved palette.
  const gen = new Uint8ClampedArray(GW * H * 4);
  const defeito = new Uint8Array(GW * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < GW; x++) {
    const i = ((y + TOPO) * GW + x) * 4, o = (y * GW + x) * 4;
    if (g.data[i + 3] < 128) continue;
    // The WHITE ROUGH EDGES (his note, 16/10: "o corpo tem aquelas bordas brancas, grosseiras"): grey/white
    // (saturation < 30) brighter than 90. The approved M2 has 3 such pixels; the frames of take 2 up to 99.
    const r = g.data[i], gg = g.data[i + 1], b = g.data[i + 2];
    if (Math.max(r, gg, b) - Math.min(r, gg, b) < 30 && 0.299 * r + 0.587 * gg + 0.114 * b >= 90) defeito[y * GW + x] = 1;
    const c = maisPerto(r, gg, b);
    gen[o] = c[0]; gen[o + 1] = c[1]; gen[o + 2] = c[2]; gen[o + 3] = 255;
  }
  // A white blot touching the outside is a scratch ON the contour: it goes. One inside the body is repainted with the
  // colours around it (the median of the non-defect neighbours within 2px, by luminance).
  {
    const visto = new Uint8Array(GW * H);
    for (let p = 0; p < GW * H; p++) {
      if (!defeito[p] || visto[p]) continue;
      const pilha = [p], comp = [];
      visto[p] = 1;
      let fora = false;
      while (pilha.length) {
        const c = pilha.pop(); comp.push(c);
        const cx = c % GW, cy = (c / GW) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= GW || ny >= H) { fora = true; continue; }
          const n = ny * GW + nx;
          if (!gen[n * 4 + 3]) fora = true;
          else if (defeito[n] && !visto[n]) { visto[n] = 1; pilha.push(n); }
        }
      }
      for (const c of comp) {
        if (fora) { gen[c * 4 + 3] = 0; continue; }
        const cx = c % GW, cy = (c / GW) | 0, viz = [];
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= GW || ny >= H) continue;
          const n = ny * GW + nx;
          if (gen[n * 4 + 3] && !defeito[n]) viz.push(n);
        }
        if (!viz.length) continue;
        viz.sort((a, b) => (gen[a * 4] + gen[a * 4 + 1] + gen[a * 4 + 2]) - (gen[b * 4] + gen[b * 4 + 1] + gen[b * 4 + 2]));
        const m = viz[(viz.length / 2) | 0];
        gen[c * 4] = gen[m * 4]; gen[c * 4 + 1] = gen[m * 4 + 1]; gen[c * 4 + 2] = gen[m * 4 + 2];
      }
    }
  }
  // 2. Drop the specks (8-connected components smaller than MIN).
  const visto = new Uint8Array(GW * H);
  for (let p = 0; p < GW * H; p++) {
    if (visto[p] || !gen[p * 4 + 3]) continue;
    const pilha = [p], comp = [];
    visto[p] = 1;
    while (pilha.length) {
      const c = pilha.pop(); comp.push(c);
      const cx = c % GW, cy = (c / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= H) continue;
        const n = ny * GW + nx;
        if (!visto[n] && gen[n * 4 + 3]) { visto[n] = 1; pilha.push(n); }
      }
    }
    if (comp.length < MIN) for (const c of comp) gen[c * 4 + 3] = 0;
  }
  // 3. The minimum-error seam inside the band (dynamic programming, top to bottom).
  const B = GW - BAND;
  const custo = (y, x) => {
    const a = ((y * GW) + x) * 4, b = (y * W + x) * 4;
    const ga = gen[a + 3] > 0, oa = O[b + 3] > 128;
    if (ga !== oa) return 400;
    if (!ga) return 0;
    return Math.abs(gen[a] - O[b]) + Math.abs(gen[a + 1] - O[b + 1]) + Math.abs(gen[a + 2] - O[b + 2]);
  };
  const acc = Array.from({ length: H }, () => new Float64Array(B));
  const de = Array.from({ length: H }, () => new Int8Array(B));
  for (let x = 0; x < B; x++) acc[0][x] = custo(0, BAND + x);
  for (let y = 1; y < H; y++) for (let x = 0; x < B; x++) {
    let best = acc[y - 1][x], k = 0;
    if (x > 0 && acc[y - 1][x - 1] < best) { best = acc[y - 1][x - 1]; k = -1; }
    if (x < B - 1 && acc[y - 1][x + 1] < best) { best = acc[y - 1][x + 1]; k = 1; }
    acc[y][x] = best + custo(y, BAND + x);
    de[y][x] = k;
  }
  let x = 0;
  for (let k = 1; k < B; k++) if (acc[H - 1][k] < acc[H - 1][x]) x = k;
  const costura = new Int32Array(H);
  let total = 0;
  for (let y = H - 1; y >= 0; y--) { costura[y] = BAND + x; total += custo(y, BAND + x); x += de[y][x]; }
  // Compose: the original everywhere, the generated rear left of the seam.
  const out = Buffer.from(O);
  for (let y = 0; y < H; y++) for (let xx = 0; xx < costura[y]; xx++) {
    const a = (y * GW + xx) * 4, b = (y * W + xx) * 4;
    out[b] = gen[a]; out[b + 1] = gen[a + 1]; out[b + 2] = gen[a + 2]; out[b + 3] = gen[a + 3];
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `q-${q.replace('.png', '').padStart(2, '0')}.png`));
  console.log(`${q}: seam x ${Math.min(...costura)}..${Math.max(...costura)}, mean error ${(total / H).toFixed(1)}`);
}
