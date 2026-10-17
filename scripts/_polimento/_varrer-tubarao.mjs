// 16/10 — THE SHARK SWEEP, BAKED IN PIXELS. A shark's caudal fin is VERTICAL and sweeps side to side (toward and away
// from the camera); a whale's fluke is horizontal and beats up and down. Seen in profile, the whale beat is a rotation
// in the screen plane (what `raboDoLeviata` does with `angle`), but the shark sweep is NOT.
//
// v2 (his notes on v1: "parece que ele sai do centro para trás de forma leve … o certo é ir para um lado e outro num
// movimento mais completo (está engessado) … é perceptível a quebra de onde ele começa a se mover e o resto estático"):
//   - v1 only FORESHORTENED, and foreshortening is the same for +θ and −θ: the eye saw "shrink and come back" twice
//     per beat, never "one side, then the other". Now the two sides differ: the side coming toward us is bigger and
//     lighter, the side going away smaller and darker, and the camera sits slightly ABOVE (the classic side-view
//     cheat), so the near side drops a little on screen and the far side rises.
//   - v1 bent with u² — the first third barely moved and the fin hinged on a stiff body. Now it is a WAVE running down
//     the whole tail from the pivot (the yaw grows linearly from 0, so position and slope are continuous there: no
//     seam), and the fin past the narrowest column (the peduncle) is RIGID, following the angle of the tail's end.
//
// No generator: the PixMiniMax/v3 animation turned the last fin into a propeller. One continuous warp of the art,
// sampled NEAREST, so the pixel stays crisp.
//   node scripts/_polimento/_varrer-tubarao.mjs <in.png> <out dir> [frames=46] [yaw° at the fin=38] [camera elevation°=15]
// The pivot is the code's origin (0.92 of the width): everything right of it stays still.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// v3 (16/10, his note on v2: "ficou perceptível agora que a imagem é achatada, ou seja, 2D"): a warp only MOVES the
// pixels; every plate and highlight stays painted for one angle, so it reads as a paper cut-out bending. With a NORMAL
// MAP (PixelLab `create_normal_map`, opengl: R right, G up, B toward us) each column's normals turn with its yaw, and
// the light runs across the plates as the tail sweeps. The light is not guessed: it is FITTED to the painting
// (lum ≈ c0 + c·n by least squares), so the relit art keeps the light it was painted with at rest. Lava (emissive) is
// left alone.
//   … [normal map png] [gain=1.6]
// The fitted light of M2 is almost all FRONT and TOP (nx weighs 2.5 against nz 14.5): turning either way darkens about
// the same, the symmetry that made v1 read as "shrink and come back". A SIDE light (from the left, where the tail
// points) is added to the fitted one: the side that turns toward it catches light, the other falls into shadow.
//   … [normal map png] [gain=1.6] [side light, in lum per unit of −nx = 0]
const [IN, OUT, N = '46', YAW = '38', ELEV = '15', NORMAL = '', GANHO_S = '1.6', LADO_S = '0'] = process.argv.slice(2);
const FRAMES = Number(N);
const AMAX = (Number(YAW) * Math.PI) / 180;
const ELEVACAO = Math.sin((Number(ELEV) * Math.PI) / 180);
const ONDA = 2.2; // phase lag from the pivot to the peduncle (radians): the wave you see running down the body
const PERSP = 1.0; // perspective distance, in tail lengths: smaller = the near side grows more
const LUZ = NORMAL ? 0.06 : 0.16; // the near side lighter, the far side darker (smaller when the normals do the work)
const GANHO = Number(GANHO_S); // how much of the relighting difference is applied (1 = the fitted light as is)

const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

const lava = (i) => data[i] > 110 && data[i] > data[i + 1] * 1.35 && data[i] > data[i + 2] * 1.8;
let nrm = null, C = null;
if (NORMAL) {
  const n = await sharp(NORMAL).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (n.info.width !== W || n.info.height !== H) throw new Error(`normal map ${n.info.width}×${n.info.height} ≠ art ${W}×${H}`);
  nrm = new Float32Array(W * H * 3);
  for (let p = 0; p < W * H; p++) for (let k = 0; k < 3; k++) nrm[p * 3 + k] = n.data[p * 4 + k] / 127.5 - 1;
  // Least squares lum = c0 + c1·nx + c2·ny + c3·nz over the opaque, non-lava pixels.
  const A = Array.from({ length: 4 }, () => new Float64Array(5));
  let cnt = 0;
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (data[i + 3] < 128 || n.data[i + 3] < 128 || lava(i)) continue;
    const v = [1, nrm[p * 3], nrm[p * 3 + 1], nrm[p * 3 + 2]];
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    for (let r = 0; r < 4; r++) { for (let c = 0; c < 4; c++) A[r][c] += v[r] * v[c]; A[r][4] += v[r] * lum; }
    cnt++;
  }
  for (let c = 0; c < 4; c++) { // Gauss–Jordan
    let piv = c; for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < 4; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 5; k++) A[r][k] -= f * A[c][k]; }
  }
  C = A.map((row, r) => row[4] / row[r]);
  console.log(`light fitted on ${cnt} px: lum ≈ ${C[0].toFixed(1)} + ${C[1].toFixed(1)}·nx + ${C[2].toFixed(1)}·ny + ${C[3].toFixed(1)}·nz`);
  C[1] -= Number(LADO_S);
}
const preve = (nx, ny, nz) => Math.max(6, C[0] + C[1] * nx + C[2] * ny + C[3] * nz);
const PX = Math.round(W * 0.92);
const L = PX; // the length from the pivot to the left edge

const altura = (x) => { let n = 0; for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > 24) n++; return n; };
// The peduncle: the narrowest column between 15% and 50% of the width. Left of it is the fin, which turns rigid.
let XJ = Math.round(W * 0.15);
for (let x = XJ; x <= W * 0.5; x++) if (altura(x) > 0 && altura(x) < altura(XJ)) XJ = x;
const DJ = PX - XJ;

// The body's centerline per column (alpha-weighted mean y), smoothed: the vertical scale happens around it.
const centro = new Float64Array(W);
for (let x = 0; x < W; x++) {
  let s = 0, n = 0;
  for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > 24) { s += y; n++; }
  centro[x] = n ? s / n : H / 2;
}
const liso = new Float64Array(W);
for (let x = 0; x < W; x++) {
  let s = 0, n = 0;
  for (let k = -12; k <= 12; k++) { const j = x + k; if (j >= 0 && j < W) { s += centro[j]; n++; } }
  liso[x] = s / n;
}

fs.mkdirSync(OUT, { recursive: true });
const deslocMax = new Float64Array(L + 1); // how far each column travels over the beat (to check there is no seam)
const base = new Float64Array(L + 1);
for (let f = 0; f < FRAMES; f++) {
  const fase = (2 * Math.PI * f) / FRAMES;
  // Walk from the pivot to the tip: the yaw grows linearly with the distance and lags in phase (the travelling wave);
  // past the peduncle it freezes (rigid fin). x' = where the column lands, z = its depth (+ = toward the camera).
  const xo = new Float64Array(L + 1), z = new Float64Array(L + 1), yaw = new Float64Array(L + 1);
  let ax = 0, az = 0;
  for (let d = 0; d <= L; d++) {
    const u = Math.min(d, DJ) / L;
    const th = AMAX * (u / (DJ / L)) * Math.sin(fase - ONDA * u);
    ax += Math.cos(th);
    az += Math.sin(th);
    xo[d] = PX - ax;
    z[d] = az;
    yaw[d] = th;
  }
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = PX; x < W; x++) data.copy(out, (y * W + x) * 4, (y * W + x) * 4, (y * W + x) * 4 + 4);
  let d = 0;
  for (let x = PX - 1; x >= 0; x--) {
    while (d < L && xo[d + 1] >= x + 0.5) d++;
    if (xo[d] < x - 0.5) continue; // the tip has been pulled in past this column: empty
    const sx = PX - d;
    if (sx < 0) continue;
    const s = 1 + z[d] / (PERSP * L); // near = bigger
    const dy = z[d] * ELEVACAO; // near = lower on screen (the camera is slightly above)
    const shade = 1 + LUZ * Math.max(-1, Math.min(1, z[d] / (0.3 * L)));
    const c = liso[sx];
    // The segment's yaw turns its normals about the vertical axis: the direction (−1,0,0) goes to (−cosθ,0,sinθ).
    const ct = Math.cos(yaw[d]), st = Math.sin(yaw[d]);
    for (let y = 0; y < H; y++) {
      const sy = Math.round(c + (y - dy - c) / s);
      if (sy < 0 || sy >= H) continue;
      const i = (sy * W + sx) * 4, o = (y * W + x) * 4;
      if (data[i + 3] === 0) continue;
      let k = shade;
      if (nrm && !lava(i)) {
        const p = (sy * W + sx) * 3, nx = nrm[p], ny = nrm[p + 1], nz = nrm[p + 2];
        const antes = preve(nx, ny, nz);
        const depois = preve(nx * ct + nz * st, ny, -nx * st + nz * ct);
        k *= Math.max(0.45, Math.min(1.8, 1 + (GANHO * (depois - antes)) / antes));
      }
      out[o] = Math.min(255, data[i] * k); out[o + 1] = Math.min(255, data[i + 1] * k);
      out[o + 2] = Math.min(255, data[i + 2] * k); out[o + 3] = data[i + 3];
    }
  }
  for (let k = 0; k <= L; k++) {
    const p = Math.hypot(xo[k], z[k] * ELEVACAO);
    if (f === 0) base[k] = p; else deslocMax[k] = Math.max(deslocMax[k], Math.abs(p - base[k]), Math.abs(z[k]));
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `q-${String(f).padStart(2, '0')}.png`));
}
const amostra = [0.05, 0.15, 0.3, 0.45, 0.6, DJ / L, 1].map((u) => `${(u * 100).toFixed(0)}%:${deslocMax[Math.round(u * L)].toFixed(1)}px`);
console.log(`${OUT}: ${FRAMES} frames, ${W}×${H}, pivot x=${PX}, peduncle x=${XJ}; travel by distance from the pivot ${amostra.join(' ')}`);
