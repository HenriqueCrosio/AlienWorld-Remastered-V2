// BLOCO G · the F1 horizon, cut from HIS painting (`assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png`,
// 1768×890): the WHOLE painting reduced to the screen height (429×216 — his rule, 20/10: never a crop or a zoom), the
// "off" state of its lights, and the waterfall loop.
//   node scripts/_g/_camadas-f1.mjs [outDir=public/sprites/f1]
// At 1× the lights are single amber pixels and the spire beacons blend into the amber, so they are DETECTED at 4×
// (1716×864, where a beacon is still pure red) with the menu rules, and ERASED at 1×: every 1× pixel that holds a 4×
// light (or its fringe) and is warm is refilled by diffusion from its neighbours.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { lum, detectarLuzes, marcarMuda, apagarPorDifusao, gruposDeLuz } from '../_cenario/luzes.mjs';

const [OUT = 'public/sprites/f1'] = process.argv.slice(2);
const ORIG = 'assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png';
const W = 429, H = 216, K = 4;
// The waterfall right of the citadel (game px, measured on the 1× reduction: the warm-lit water at x 313–318, y 103–111).
const AGUA = { x: 311, y: 101, w: 9, h: 12 };
const QUADROS_AGUA = 8;
fs.mkdirSync(OUT, { recursive: true });

const reduzir = (w, h) => sharp(ORIG).resize(w, h, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
const p1 = await reduzir(W, H); // the painting, ONE pass from the original
const p4 = await reduzir(W * K, H * K); // the detection copy

// HIS beacons are ROSE, not the menu's pure red (measured 20/10 at 4×: r 120–200, g and b each ~0.45–0.6 r, g ≈ b). A
// rose cluster with the dark around it (≤ 4% warm-lit pixels on the 2K–3K ring — the menu's beacon test) is a beacon:
// the spire tips of the citadel, the left outpost, the right tower. The rule lives here, not in luzes.mjs: the menu
// depends on that one as it is.
const ROSA = { rMin: 120, gMax: 0.62, bMax: 0.66, gbMax: 0.16, anelMax: 0.04 };

// ─── 1. Detect at 4× (the waterfall is warm-lit water, not a window: its box is left out) ──────────────────────
const W4 = W * K, H4 = H * K;
const tipo4 = detectarLuzes(p4, W4, H4, K);
{
  const rosa = new Uint8Array(W4 * H4);
  for (let s = 0; s < W4 * H4; s++) {
    const r = p4[s * 4], g = p4[s * 4 + 1], b = p4[s * 4 + 2];
    if (r >= ROSA.rMin && g < ROSA.gMax * r && b < ROSA.bMax * r && Math.abs(g - b) < ROSA.gbMax * r) rosa[s] = 1;
  }
  const visto = new Uint8Array(W4 * H4);
  for (let s = 0; s < W4 * H4; s++) {
    if (!rosa[s] || visto[s]) continue;
    const fila = [s], membros = [];
    visto[s] = 1;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    while (fila.length) {
      const c = fila.pop();
      membros.push(c);
      const cx = c % W4, cy = (c / W4) | 0;
      x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W4 || ny >= H4) continue;
        const q = ny * W4 + nx;
        if (rosa[q] && !visto[q]) { visto[q] = 1; fila.push(q); }
      }
    }
    const cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
    let aceso = 0, total = 0;
    for (let dy = -3 * K; dy <= 3 * K; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 2 * K) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W4 || ny >= H4) continue;
      const j = (ny * W4 + nx) * 4;
      total++;
      if (lum(p4[j], p4[j + 1], p4[j + 2]) > 55 && p4[j] > p4[j + 2] + 20) aceso++;
    }
    if (total && aceso / total <= ROSA.anelMax) for (const c of membros) tipo4[c] = 2;
  }
}
for (let y = AGUA.y * K; y < (AGUA.y + AGUA.h) * K; y++) for (let x = AGUA.x * K; x < (AGUA.x + AGUA.w) * K; x++) tipo4[y * W * K + x] = 0;
const muda4 = marcarMuda(p4, W * K, H * K, K, tipo4);
const grupos = gruposDeLuz(tipo4, W * K, H * K, K);

// ─── 2. Erase at 1× ────────────────────────────────────────────────────────────────────────────────────────────
const muda1 = new Uint8Array(W * H);
for (let y = 0; y < H * K; y++) for (let x = 0; x < W * K; x++) {
  const m = muda4[y * W * K + x];
  if (!m) continue;
  const s = ((y / K) | 0) * W + ((x / K) | 0);
  muda1[s] = muda1[s] === 1 ? 1 : m; // a light pixel wins over a fringe pixel
}
// A neutral 1× pixel keeps its value: only warm ones carry the light.
for (let s = 0; s < W * H; s++) if (muda1[s] && !(p1[s * 4] > p1[s * 4 + 2] + 8)) muda1[s] = 0;
// Beacons: at 1× their rose glow spreads over a pixel or two around the box (the reduction's kernel), and a faint rose
// pixel fails the warm test above (measured 20/10: three of thirteen beacons changed nothing, and the others left the
// glow beside the erased pixel lit). Every pixel within 1 px of a beacon box that is red-tinted (r above the mean of
// g and b by more than 4; the sky around is −10) changes too.
for (const g of grupos.filter((q) => q.tipo === 'farol')) {
  for (let y = Math.floor(g.y) - 1; y <= Math.ceil(g.y + g.h); y++) for (let x = Math.floor(g.x) - 1; x <= Math.ceil(g.x + g.w); x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const s = y * W + x, i = s * 4;
    if (p1[i] - (p1[i + 1] + p1[i + 2]) / 2 > 4) muda1[s] = muda1[s] || 1;
  }
}
const apagadas = apagarPorDifusao(p1, W, H, muda1);

// ─── 3. The waterfall loop (the menu recipe at 1×: stripes falling 1 px per frame, a seamless 8-frame loop) ─────
let semente = 7;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const listras = [];
for (let x = 0; x < AGUA.w; x++) {
  const col = Array.from({ length: QUADROS_AGUA }, () => rnd());
  listras.push(col.map((_, y) => (col[y] + col[(y + 1) % QUADROS_AGUA] + col[(y + QUADROS_AGUA - 1) % QUADROS_AGUA]) / 3));
}
const aguaFolha = Buffer.alloc(AGUA.w * QUADROS_AGUA * AGUA.h * 4);
let pixelsAgua = 0;
for (let f = 0; f < QUADROS_AGUA; f++) for (let y = 0; y < AGUA.h; y++) for (let x = 0; x < AGUA.w; x++) {
  const i = ((AGUA.y + y) * W + (AGUA.x + x)) * 4;
  const r = p1[i], g = p1[i + 1], b = p1[i + 2];
  if (lum(r, g, b) < 90) continue; // only the water itself
  if (f === 0) pixelsAgua++;
  const v = listras[x][((y - f) % QUADROS_AGUA + QUADROS_AGUA) % QUADROS_AGUA];
  const m = 0.72 + 0.62 * v;
  const o = (y * AGUA.w * QUADROS_AGUA + f * AGUA.w + x) * 4;
  aguaFolha[o] = Math.min(255, Math.round(r * m));
  aguaFolha[o + 1] = Math.min(255, Math.round(g * m));
  aguaFolha[o + 2] = Math.min(255, Math.round(b * m));
  aguaFolha[o + 3] = 255;
}

// ─── 4. Write ──────────────────────────────────────────────────────────────────────────────────────────────────
const png = (buf, w, h, f) => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(OUT, f));
await png(p1, W, H, 'pintura.png');
await png(apagadas, W, H, 'apagadas.png');
await png(aguaFolha, AGUA.w * QUADROS_AGUA, AGUA.h, 'cachoeira.png');
fs.writeFileSync(path.join(OUT, 'dados.json'), JSON.stringify({
  k: 1, w: W, h: H,
  agua: { ...AGUA, quadros: QUADROS_AGUA, fw: AGUA.w, fh: AGUA.h },
  grupos,
}, null, 1));
const nMuda = muda1.reduce((a, v) => a + (v ? 1 : 0), 0);
console.log(OUT, `${W}x${H}`, 'grupos', grupos.length, 'janelas', grupos.filter((g) => g.tipo === 'janela').length,
  'faróis', grupos.filter((g) => g.tipo === 'farol').length, 'pixels apagados', nMuda, 'água', pixelsAgua);
