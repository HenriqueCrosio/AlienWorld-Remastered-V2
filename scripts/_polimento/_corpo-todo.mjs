// 16/10 — THE WHOLE BODY MOVES WITH THE FIN. His note on the PixMiniMax take 2: the fin's motion is "natural e fluido",
// but only the rear 256px moves (the generator's limit) and the front sits still. This bends the WHOLE composed frame
// (`_montar-pixminimax.mjs` output) with the v3 warp of `_varrer-tubarao.mjs` — a wave from the pivot, the camera 15°
// above, perspective, and the normal-map light (side light from the right) on the body — in step with the fin:
// take 2 turns the fin ONE way and back over its 16 frames (rest at 0, edge-on around 7–9), so the body bends one way
// and back with a raised cosine, LEADING the fin by a frame or two (the wave is born in the body and reaches the tip).
// Past the peduncle (the fin) the bend is rigid and the light is left to the generated drawing.
//   node scripts/_polimento/_corpo-todo.mjs <frames dir q-00..> <art (for the peduncle and centerline)> <normal map>
//        <out dir> [body yaw°=20] [lead frames=1.5] [peak frame=7.5]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// v2 (his note, with a marked print: "quando eu falo o corpo todo é até o final do corpo aparente"): with the wave born
// at the sprite's pivot (screen x≈374, at the edge) the visible front barely moved. The Leviathan's body goes on past
// the right edge, so the wave is born there: a VIRTUAL PIVOT `EXT` px beyond the art's pivot. Every visible column
// bends now, more and more toward the tip; the art's straight right cut stays off screen (it only moves vertically).
//   … [virtual pivot beyond the art's, px = 0]
// v3 (16/10, he: "aplique de qualquer forma aquele jogo de luzes, ficou muito bom" — the v3d): the FIN gets the light
// too. It is a generated drawing that turns by itself, so it is lit as the blade it is: ONE plane (the mean normal of
// the approved fin in the normal map), turned by the body's yaw at the peduncle plus the fin's own turn (FIN_MAX at the
// peak of each half, edge-on), and the whole fin brightens or darkens together — what made v3d read.
//   … [halves=1] [sign of the first half=1] [fin turn at the peak°=75]
const [DIR, ARTE, NORMAL, OUT, YAW_S = '20', LEAD_S = '1.5', PICO_S = '7.5', EXT_S = '0', METADES_S = '1', SINAL_S = '1', FIN_S = '75'] = process.argv.slice(2);
const METADES = Number(METADES_S), SINAL = Number(SINAL_S), FIN_MAX = (Number(FIN_S) * Math.PI) / 180;
const AMAX = (Number(YAW_S) * Math.PI) / 180;
const ELEVACAO = Math.sin((15 * Math.PI) / 180), PERSP = 1.0, LUZ = 0.06, GANHO = 1.2, LADO = -20, ONDA = 0.8;

const art = await sharp(ARTE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = art.info.width, H = art.info.height, A = art.data;
const PX = Math.round(W * 0.92) + Number(EXT_S), L = PX; // PX here is the (virtual) pivot, maybe past the art
const altura = (x) => { let n = 0; for (let y = 0; y < H; y++) if (A[(y * W + x) * 4 + 3] > 24) n++; return n; };
let XJ = Math.round(W * 0.15);
for (let x = XJ; x <= W * 0.5; x++) if (altura(x) > 0 && altura(x) < altura(XJ)) XJ = x;
const DJ = PX - XJ;
const liso = new Float64Array(W);
{
  const c = Array.from({ length: W }, (_, x) => { let s = 0, n = 0; for (let y = 0; y < H; y++) if (A[(y * W + x) * 4 + 3] > 24) { s += y; n++; } return n ? s / n : H / 2; });
  for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let k = -12; k <= 12; k++) { const j = x + k; if (j >= 0 && j < W) { s += c[j]; n++; } } liso[x] = s / n; }
}
const lava = (b, i) => b[i] > 110 && b[i] > b[i + 1] * 1.35 && b[i] > b[i + 2] * 1.8;
const nm = await sharp(NORMAL).ensureAlpha().raw().toBuffer();
const nrm = new Float32Array(W * H * 3);
for (let p = 0; p < W * H; p++) for (let k = 0; k < 3; k++) nrm[p * 3 + k] = nm[p * 4 + k] / 127.5 - 1;
const C = (() => { // the light fitted to the approved painting, plus the side light (see `_varrer-tubarao.mjs` v3)
  const M = Array.from({ length: 4 }, () => new Float64Array(5));
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (A[i + 3] < 128 || nm[i + 3] < 128 || lava(A, i)) continue;
    const v = [1, nrm[p * 3], nrm[p * 3 + 1], nrm[p * 3 + 2]], lum = 0.299 * A[i] + 0.587 * A[i + 1] + 0.114 * A[i + 2];
    for (let r = 0; r < 4; r++) { for (let c = 0; c < 4; c++) M[r][c] += v[r] * v[c]; M[r][4] += v[r] * lum; }
  }
  for (let c = 0; c < 4; c++) {
    let piv = c; for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < 4; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 5; k++) M[r][k] -= f * M[c][k]; }
  }
  const c = M.map((row, r) => row[4] / row[r]);
  c[1] -= LADO;
  return c;
})();
const preve = (nx, ny, nz) => Math.max(6, C[0] + C[1] * nx + C[2] * ny + C[3] * nz);
// The fin's plane: the mean normal of the approved fin (left of the peduncle).
const NF = (() => {
  let x = 0, y = 0, z = 0;
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < XJ; xx++) {
    const p = yy * W + xx;
    if (nm[p * 4 + 3] < 128) continue;
    x += nrm[p * 3]; y += nrm[p * 3 + 1]; z += nrm[p * 3 + 2];
  }
  const n = Math.hypot(x, y, z) || 1;
  return [x / n, y / n, z / n];
})();

fs.mkdirSync(OUT, { recursive: true });
const quadros = fs.readdirSync(DIR).filter((f) => /^q-\d+\.png$/.test(f)).sort();
const N = quadros.length;
for (let f = 0; f < N; f++) {
  const src = await sharp(path.join(DIR, quadros[f])).ensureAlpha().raw().toBuffer();
  // A raised cosine with period N peaking at PICO − LEAD: one side and back, smooth across the loop.
  // With HALVES=2 (16/10: take 2 turns the fin one way, a second take turns it toward the screen) the frames are two
  // 16-frame halves of one full stroke: the body bends one way in the first and the OTHER way in the second.
  const M = N / METADES, h = Math.floor(f / M), fh = f - h * M;
  const lado = (h % 2 ? -1 : 1) * SINAL;
  const s01 = lado * (1 - Math.cos((2 * Math.PI * (fh - Number(PICO_S) + Number(LEAD_S) + M / 2)) / M)) / 2;
  const sFin = lado * (1 - Math.cos((2 * Math.PI * (fh - Number(PICO_S) + M / 2)) / M)) / 2; // the fin: no lead
  const xo = new Float64Array(L + 1), z = new Float64Array(L + 1), yaw = new Float64Array(L + 1);
  let ax = 0, az = 0;
  for (let d = 0; d <= L; d++) {
    const u = Math.min(d, DJ) / DJ;
    const th = AMAX * u * s01 * (1 - ONDA * 0.25 * u); // a slightly smaller bend toward the tip: the fin carries on
    ax += Math.cos(th); az += Math.sin(th);
    xo[d] = PX - ax; z[d] = az; yaw[d] = th;
  }
  const phi = yaw[Math.min(DJ, L)] + FIN_MAX * sFin, cf = Math.cos(phi), sf = Math.sin(phi);
  const fa = preve(NF[0], NF[1], NF[2]), fd = preve(NF[0] * cf + NF[2] * sf, NF[1], -NF[0] * sf + NF[2] * cf);
  const kFin = Math.max(0.45, Math.min(1.8, 1 + (GANHO * (fd - fa)) / fa));
  const out = Buffer.alloc(W * H * 4);
  // Right of the pivot (only when it is inside the art): still.
  for (let y = 0; y < H; y++) for (let x = PX; x < W; x++) src.copy(out, (y * W + x) * 4, (y * W + x) * 4, (y * W + x) * 4 + 4);
  let d = 0;
  for (let x = Math.min(PX, W) - 1; x >= 0; x--) {
    while (d < L && xo[d + 1] >= x + 0.5) d++;
    if (xo[d] < x - 0.5) continue;
    const sx = PX - d;
    if (sx < 0 || sx >= W) continue; // past the art's right cut: nothing there
    const sc = 1 + z[d] / (PERSP * L), dy = z[d] * ELEVACAO, c = liso[sx];
    const shade = 1 + LUZ * Math.max(-1, Math.min(1, z[d] / (0.3 * L)));
    const ct = Math.cos(yaw[d]), st = Math.sin(yaw[d]);
    const corpo = sx >= XJ + 8;
    for (let y = 0; y < H; y++) {
      const sy = Math.round(c + (y - dy - c) / sc);
      if (sy < 0 || sy >= H) continue;
      const i = (sy * W + sx) * 4, o = (y * W + x) * 4;
      if (src[i + 3] === 0) continue;
      let k = shade;
      if (corpo && !lava(src, i)) {
        const p = (sy * W + sx) * 3, nx = nrm[p], ny = nrm[p + 1], nz = nrm[p + 2];
        const antes = preve(nx, ny, nz), depois = preve(nx * ct + nz * st, ny, -nx * st + nz * ct);
        k *= Math.max(0.45, Math.min(1.8, 1 + (GANHO * (depois - antes)) / antes));
      } else if (!corpo && !lava(src, i)) k *= kFin;
      out[o] = Math.min(255, src[i] * k); out[o + 1] = Math.min(255, src[i + 1] * k); out[o + 2] = Math.min(255, src[i + 2] * k); out[o + 3] = src[i + 3];
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, quadros[f]));
}
console.log(`${OUT}: ${N} frames, body yaw ${YAW_S}°, peduncle x=${XJ}`);
