// 23/10 — round 2a, SHAPE FIRST: the ship ladders built from parts (polygons/ellipses) on the 44×26 ship frame, as
// flat colour blocks (hull in three tones + rim, dark metal, glass, amber, flame), outlined, centred like the game
// centres every ship. No PixelLab: the silhouette and the ladder logic get approved before any detail is painted.
//   node scripts/_naves/_silhuetas.mjs <outDir> [tom...]      (tons: ambar osso aco grafite; default all)
// Writes <outDir>/<linha>-t<n>-<tom>.png (44×26) and <outDir>/medidas.json.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { LINHAS } from './silhuetas-linhas.mjs';

export const W = 44, H = 26;

/** Hull tones to compare (S shadow, H mid, L light, R rim) + the fixed materials. */
export const TONS = {
  ambar:   { S: '#6e3f24', H: '#a8612f', L: '#d4914f', R: '#f2c68a' },
  osso:    { S: '#5f5a50', H: '#968d7a', L: '#c4b99f', R: '#e9e0c8' },
  aco:     { S: '#3b3a3f', H: '#5f5d63', L: '#8a8686', R: '#b8b0a4' },
  grafite: { S: '#22252c', H: '#343841', L: '#4b505a', R: '#6f7682' },
};
const FIXO = {
  K: '#0b0c10', k: '#1c1d22', D: '#2a2c33', d: '#4a4d57', G: '#2f6f9a', g: '#9fdcf2',
  A: '#ffb347', a: '#c46a1c', F: '#fff2b8', f: '#ff9a2e', o: '#d2481c',
};

function dentroPoligono(px, py, pts) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
const dentro = (p, x, y) => (p.ell
  ? ((x - p.ell[0]) / p.ell[2]) ** 2 + ((y - p.ell[1]) / p.ell[3]) ** 2 <= 1
  : dentroPoligono(x, y, p.pts));

/** Renders one ship: returns a W×H grid of palette keys ('' = empty). */
export function rasterizar(pecas) {
  const dono = Array.from({ length: H }, () => new Array(W).fill(-1));
  pecas.forEach((p, id) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dentro(p, x + 0.5, y + 0.5)) dono[y][x] = p.mat === 'cut' ? -1 : id;
  });
  const g = Array.from({ length: H }, () => new Array(W).fill(''));
  pecas.forEach((p, id) => {
    // column span of this part's VISIBLE pixels, for the top-lit shading
    for (let x = 0; x < W; x++) {
      const ys = [];
      for (let y = 0; y < H; y++) if (dono[y][x] === id) ys.push(y);
      if (!ys.length) continue;
      const top = ys[0], bot = ys[ys.length - 1], span = bot - top;
      for (const y of ys) {
        const t = span ? (y - top) / span : 0.5;
        let c;
        if (p.mat === 'hull') c = y === top && span >= 2 ? 'R' : t < 0.34 ? 'L' : t > 0.7 ? 'S' : 'H';
        else if (p.mat === 'far') c = y === top && span >= 2 ? 'L' : t < 0.5 ? 'H' : 'S';
        // a flat plate facing the light (wings, fins): one big lit plane, rim on top, shadow on the last row
        else if (p.mat === 'plane') c = y === top && span >= 2 ? 'R' : y === bot && span >= 2 ? 'S' : 'L';
        else if (p.mat === 'farplane') c = y === top && span >= 2 ? 'L' : y === bot && span >= 2 ? 'S' : 'H';
        else if (p.mat === 'dark') c = y === top ? 'd' : 'D';
        else if (p.mat === 'glass') c = y === top ? 'g' : 'G';
        else if (p.mat === 'amber') c = 'A';
        else if (p.mat === 'ink') c = 'K';
        else if (p.mat === 'seam') c = 'k';
        else if (p.mat === 'flame') c = 'flame';
        g[y][x] = c;
      }
    }
  });
  // flames: hot core along the axis, near the nozzle; orange body; red tip
  pecas.forEach((p, id) => {
    if (p.mat !== 'flame') return;
    let x0 = W, x1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dono[y][x] === id) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    const cy = p.eixo;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dono[y][x] === id) {
      const u = (x - x0) / Math.max(1, x1 - x0); // 0 tip … 1 nozzle
      g[y][x] = Math.abs(y + 0.5 - cy) < 0.9 && u > 0.35 ? 'F' : u < 0.25 ? 'o' : 'f';
    }
  });
  // seams: a part drawn OVER an earlier solid part gets a dark line where it meets it
  pecas.forEach((p, id) => {
    if (!p.costura) return;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (dono[y][x] !== id) continue;
      for (const [dx, dy] of p.costura === true ? [[0, 1], [0, -1], [1, 0], [-1, 0]] : p.costura) {
        const q = dono[y + dy]?.[x + dx];
        if (q !== undefined && q >= 0 && q < id && pecas[q].mat !== 'flame') { g[y][x] = 'k'; break; }
      }
    }
  });
  // outer outline (flame neither gets nor gives one)
  const solido = (x, y) => g[y]?.[x] && !['F', 'f', 'o'].includes(g[y][x]);
  const contorno = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x]) continue;
    if (solido(x - 1, y) || solido(x + 1, y) || solido(x, y - 1) || solido(x, y + 1)) contorno.push([x, y]);
  }
  for (const [x, y] of contorno) g[y][x] = 'K';
  return g;
}

/** Centres the drawing in the 44×26 frame, the way every ship is installed. */
export function centrar(g) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, ox = Math.floor((W - bw) / 2) - x0, oy = Math.floor((H - bh) / 2) - y0;
  const n = Array.from({ length: H }, () => new Array(W).fill(''));
  let px = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y][x]) { n[y + oy][x + ox] = g[y][x]; px++; }
  return { g: n, bw, bh, px };
}

export function png(g, tom) {
  const pal = { ...FIXO, ...TONS[tom] };
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = g[y][x];
    if (!c) continue;
    const hex = pal[c];
    const i = (y * W + x) * 4;
    buf[i] = parseInt(hex.slice(1, 3), 16); buf[i + 1] = parseInt(hex.slice(3, 5), 16); buf[i + 2] = parseInt(hex.slice(5, 7), 16); buf[i + 3] = 255;
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('_silhuetas.mjs')) {
  const [OUT, ...pedidos] = process.argv.slice(2);
  const tons = pedidos.length ? pedidos : Object.keys(TONS);
  fs.mkdirSync(OUT, { recursive: true });
  const medidas = {};
  for (const [linha, tiers] of Object.entries(LINHAS)) {
    for (const [t, pecas] of tiers.entries()) {
      const { g, bw, bh, px } = centrar(rasterizar(pecas));
      medidas[`${linha}-t${t}`] = `${bw}×${bh} (${px} px)`;
      for (const tom of tons) fs.writeFileSync(path.join(OUT, `${linha}-t${t}-${tom}.png`), await png(g, tom));
    }
  }
  fs.writeFileSync(path.join(OUT, 'medidas.json'), JSON.stringify(medidas, null, 1));
  console.log(JSON.stringify(medidas, null, 1));
}
