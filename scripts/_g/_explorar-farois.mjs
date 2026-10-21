// BLOCO G · exploration: the pink-red points of HIS painting at 4× (the beacons here are rose, not the menu's pure
// red), grouped, with the share of warm-lit pixels on the 2K–3K ring around each (beacons stand against the dark).
//   node scripts/_g/_explorar-farois.mjs
import sharp from 'sharp';
import { lum } from '../_cenario/luzes.mjs';

const { data, info } = await sharp('assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png')
  .resize(1716, 864, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, K = 4;
const rosa = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
  if (r >= 120 && g < 0.62 * r && b < 0.66 * r && Math.abs(g - b) < 0.16 * r) rosa[y * W + x] = 1;
}
const vis = new Uint8Array(W * H);
const grupos = [];
for (let s = 0; s < W * H; s++) {
  if (!rosa[s] || vis[s]) continue;
  const fila = [s];
  vis[s] = 1;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, mx = 0;
  while (fila.length) {
    const c = fila.pop(); n++;
    const cx = c % W, cy = (c / W) | 0;
    x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
    mx = Math.max(mx, data[c * 4]);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (rosa[q] && !vis[q]) { vis[q] = 1; fila.push(q); }
    }
  }
  let aceso = 0, total = 0;
  const cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
  for (let dy = -3 * K; dy <= 3 * K; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 2 * K) continue;
    const nx = cx + dx, ny = cy + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const j = (ny * W + nx) * 4;
    total++;
    if (lum(data[j], data[j + 1], data[j + 2]) > 55 && data[j] > data[j + 2] + 20) aceso++;
  }
  grupos.push({ x: +(x0 / K).toFixed(1), y: +(y0 / K).toFixed(1), w: x1 - x0 + 1, h: y1 - y0 + 1, n, mx, anel: +((aceso / total) * 100).toFixed(1) });
}
console.log('grupos rosados', grupos.length);
for (const g of grupos) console.log(JSON.stringify(g));
