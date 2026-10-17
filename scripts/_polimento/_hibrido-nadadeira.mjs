// 16/10 — THE GENERATED FIN ON THE APPROVED BODY. His verdict on the PixMiniMax take 2: "o movimento da nadadeira …
// ficou muito bom (natural e fluido), só que o restante do corpo ficou realmente estranho" — the generator repaints
// the plates every frame and they boil. So each technique does what it does well:
//   - the FIN comes from the generated take (cleaned, on the approved palette), cut at its peduncle;
//   - the BODY is the approved art, either still (yaw 0) or bent by the v3 warp (`_varrer-tubarao.mjs`: wave from the
//     pivot, normal-map relighting, camera 15° above) in step with the fin: the take turns the fin ONE way and back
//     over its 16 frames, so the body bends one way and back too (sin(π·f/N));
//   - the fin is carried to where the (bent) body's peduncle is in each frame, and the two meet along a
//     minimum-error seam in a band around the peduncle — the natural joint — never a straight line.
//   node scripts/_polimento/_hibrido-nadadeira.mjs <art> <normal map> <generated frames dir> <out dir> [body yaw°=0]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [ARTE, NORMAL, DIR, OUT, YAW_S = '0'] = process.argv.slice(2);
const AMAX = (Number(YAW_S) * Math.PI) / 180;
const TOPO = 4, GW = 256, MIN = 10;
const ELEVACAO = Math.sin((15 * Math.PI) / 180), PERSP = 1.0, LUZ = 0.06, GANHO = 1.2, LADO = -20, ONDA = 0.6;

const orig = await sharp(ARTE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = orig.info.width, H = orig.info.height, O = orig.data;
const PX = Math.round(W * 0.92), L = PX;
const opaco = (buf, w, x, y) => buf[(y * w + x) * 4 + 3] > 128;

// The peduncle of the approved art: the narrowest column between 15% and 50% of the width.
const altura = (buf, w, h, x) => { let n = 0; for (let y = 0; y < h; y++) if (opaco(buf, w, x, y)) n++; return n; };
const meioY = (buf, w, h, x) => { let s = 0, n = 0; for (let y = 0; y < h; y++) if (opaco(buf, w, x, y)) { s += y; n++; } return n ? s / n : h / 2; };
let XJ = Math.round(W * 0.15);
for (let x = XJ; x <= W * 0.5; x++) if (altura(O, W, H, x) > 0 && altura(O, W, H, x) < altura(O, W, H, XJ)) XJ = x;
const DJ = PX - XJ;

// The centerline, smoothed (the warp scales around it).
const liso = new Float64Array(W);
{
  const c = Array.from({ length: W }, (_, x) => meioY(O, W, H, x));
  for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let k = -12; k <= 12; k++) { const j = x + k; if (j >= 0 && j < W) { s += c[j]; n++; } } liso[x] = s / n; }
}

// The normals and the light fitted to the painting (see `_varrer-tubarao.mjs` v3), plus the side light from the right.
const lava = (b, i) => b[i] > 110 && b[i] > b[i + 1] * 1.35 && b[i] > b[i + 2] * 1.8;
const nm = await sharp(NORMAL).ensureAlpha().raw().toBuffer();
const nrm = new Float32Array(W * H * 3);
for (let p = 0; p < W * H; p++) for (let k = 0; k < 3; k++) nrm[p * 3 + k] = nm[p * 4 + k] / 127.5 - 1;
const C = (() => {
  const A = Array.from({ length: 4 }, () => new Float64Array(5));
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (O[i + 3] < 128 || nm[i + 3] < 128 || lava(O, i)) continue;
    const v = [1, nrm[p * 3], nrm[p * 3 + 1], nrm[p * 3 + 2]];
    const lum = 0.299 * O[i] + 0.587 * O[i + 1] + 0.114 * O[i + 2];
    for (let r = 0; r < 4; r++) { for (let c = 0; c < 4; c++) A[r][c] += v[r] * v[c]; A[r][4] += v[r] * lum; }
  }
  for (let c = 0; c < 4; c++) {
    let piv = c; for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < 4; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 5; k++) A[r][k] -= f * A[c][k]; }
  }
  const c = A.map((row, r) => row[4] / row[r]);
  c[1] -= LADO;
  return c;
})();
const preve = (nx, ny, nz) => Math.max(6, C[0] + C[1] * nx + C[2] * ny + C[3] * nz);

// The approved palette (the generated fin is snapped to it).
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
const quadros = fs.readdirSync(DIR).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b)).slice(0, 16);
const N = quadros.length;
for (let f = 0; f < N; f++) {
  // --- The generated frame: art coordinates, binary alpha, approved palette, no specks.
  const g = await sharp(path.join(DIR, quadros[f])).ensureAlpha().raw().toBuffer();
  const gen = new Uint8ClampedArray(GW * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < GW; x++) {
    const i = ((y + TOPO) * GW + x) * 4, o = (y * GW + x) * 4;
    if (g[i + 3] < 128) continue;
    const c = maisPerto(g[i], g[i + 1], g[i + 2]);
    gen[o] = c[0]; gen[o + 1] = c[1]; gen[o + 2] = c[2]; gen[o + 3] = 255;
  }
  {
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
  }
  // The generated peduncle: the narrowest column near where the approved one is (the take pulls it right as it turns).
  let xg = XJ - 30;
  for (let x = XJ - 30; x <= XJ + 90; x++) { const h = altura(gen, GW, H, x); if (h > 0 && h < altura(gen, GW, H, xg)) xg = x; }
  const yg = meioY(gen, GW, H, xg);

  // --- The body: the approved art, bent one way and back with the fin (rigid past the peduncle is not drawn: the fin
  //     there is the generated one).
  const s01 = Math.sin((Math.PI * f) / N);
  const xo = new Float64Array(L + 1), z = new Float64Array(L + 1), yaw = new Float64Array(L + 1);
  let ax = 0, az = 0;
  for (let d = 0; d <= L; d++) {
    const u = Math.min(d, DJ) / DJ;
    const th = AMAX * u * s01 * Math.cos(ONDA * u * 0.5);
    ax += Math.cos(th); az += Math.sin(th);
    xo[d] = PX - ax; z[d] = az; yaw[d] = th;
  }
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = PX; x < W; x++) O.copy(out, (y * W + x) * 4, (y * W + x) * 4, (y * W + x) * 4 + 4);
  let d = 0;
  for (let x = PX - 1; x >= 0; x--) {
    while (d < L && xo[d + 1] >= x + 0.5) d++;
    if (xo[d] < x - 0.5 || d > DJ + 14) continue; // only the body (and a little past the peduncle, for the seam)
    const sx = PX - d;
    if (sx < 0) continue;
    const sc = 1 + z[d] / (PERSP * L), dy = z[d] * ELEVACAO, c = liso[sx];
    const shade = 1 + LUZ * Math.max(-1, Math.min(1, z[d] / (0.3 * L)));
    const ct = Math.cos(yaw[d]), st = Math.sin(yaw[d]);
    for (let y = 0; y < H; y++) {
      const sy = Math.round(c + (y - dy - c) / sc);
      if (sy < 0 || sy >= H) continue;
      const i = (sy * W + sx) * 4, o = (y * W + x) * 4;
      if (O[i + 3] === 0) continue;
      let k = shade;
      if (!lava(O, i)) {
        const p = (sy * W + sx) * 3, nx = nrm[p], ny = nrm[p + 1], nz = nrm[p + 2];
        const antes = preve(nx, ny, nz), depois = preve(nx * ct + nz * st, ny, -nx * st + nz * ct);
        k *= Math.max(0.45, Math.min(1.8, 1 + (GANHO * (depois - antes)) / antes));
      }
      out[o] = Math.min(255, O[i] * k); out[o + 1] = Math.min(255, O[i + 1] * k); out[o + 2] = Math.min(255, O[i + 2] * k); out[o + 3] = O[i + 3];
    }
  }
  // Where the body's peduncle landed this frame.
  const xt = Math.round(xo[DJ]), yt = liso[XJ] + z[DJ] * ELEVACAO;
  const ox = xt - xg, oy = Math.round(yt - yg);

  // --- The fin, carried to it, meets the body along a minimum-error seam in the band [xt − 12, xt + 12].
  const genAt = (x, y) => { const gx = x - ox, gy = y - oy; if (gx < 0 || gx >= GW || gy < 0 || gy >= H) return null; const i = (gy * GW + gx) * 4; return gen[i + 3] ? [gen[i], gen[i + 1], gen[i + 2]] : null; };
  const B0 = Math.max(0, xt - 12), B = 25;
  const custo = (y, x) => {
    const a = genAt(x, y), i = (y * W + x) * 4, b = out[i + 3] > 0;
    if (!!a !== b) return 400;
    if (!a) return 0;
    return Math.abs(a[0] - out[i]) + Math.abs(a[1] - out[i + 1]) + Math.abs(a[2] - out[i + 2]);
  };
  const acc = Array.from({ length: H }, () => new Float64Array(B)), de = Array.from({ length: H }, () => new Int8Array(B));
  for (let x = 0; x < B; x++) acc[0][x] = custo(0, B0 + x);
  for (let y = 1; y < H; y++) for (let x = 0; x < B; x++) {
    let best = acc[y - 1][x], k = 0;
    if (x > 0 && acc[y - 1][x - 1] < best) { best = acc[y - 1][x - 1]; k = -1; }
    if (x < B - 1 && acc[y - 1][x + 1] < best) { best = acc[y - 1][x + 1]; k = 1; }
    acc[y][x] = best + custo(y, B0 + x); de[y][x] = k;
  }
  let bx = 0;
  for (let k = 1; k < B; k++) if (acc[H - 1][k] < acc[H - 1][bx]) bx = k;
  let total = 0;
  for (let y = H - 1; y >= 0; y--) {
    const sxm = B0 + bx;
    total += custo(y, sxm);
    for (let x = 0; x < sxm; x++) {
      const a = genAt(x, y), o = (y * W + x) * 4;
      if (a) { out[o] = a[0]; out[o + 1] = a[1]; out[o + 2] = a[2]; out[o + 3] = 255; } else out[o + 3] = 0;
    }
    bx += de[y][bx];
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `q-${String(f).padStart(2, '0')}.png`));
  console.log(`q${f}: fin peduncle x${xg}→${xt} (Δ${ox},${oy}), seam error ${(total / H).toFixed(1)}`);
}
