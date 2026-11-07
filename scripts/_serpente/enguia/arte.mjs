// 07/11 — Part B, step 1 (the rings): the approved eel's BODY as a straight strip, long enough for the fight. The F1
// (`folhas/2026-11-04/enguia-corpo/aprovada/enguia-f1.png`) is drawn with a gentle S and is only ~10 rings long; the
// fight wants 20. So:
//   1. straighten: every column is shifted so the silhouette's (smoothed) middle sits on the strip's centre row;
//   2. lengthen by cutting AT THE RIBS (the spec: "cortar pelas costelas, que já marcam os segmentos"): the ribcage
//      repeats every ~9 px, and in the stretch of near-constant thickness (x ~205–245) two ribs (18 px) come back almost
//      the same — so the strip is the neck part as drawn, then 18 px pieces from that stretch, alternated among the
//      starts that join each other best (one piece repeated would read as a tile), then the rest of the body and the
//      tail as drawn.
// The strip runs from the NECK (2nd round of the rings, his circles: the head rigid down to x 95 crossed the bent body
// at the joint — so only the SKULL stays rigid, x < 66, and the neck x 66–95 is the start of the strip and bends with
// her). u = 0 is still the old joint (x 96), so the neck is u −30…0 and the strip's index is u + PESCOCO; +x runs to the
// tail; the dorsal plates are up.
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-11-04/enguia-corpo/aprovada/';
export const ALTURA = 64, CENTRO = 32, PERIODO = 18;
// (3rd round, his circles: a slit opened between the rigid skull and the bent neck where she bends hard — so the two
// OVERLAP: the strip starts 10 px inside the skull, x 56, drawn under it; the skull is drawn 6 px into the neck)
export const CRANIO_X = 66; // the skull's rigid part (its chord) ends at x 66
export const FAIXA_X0 = 56; // the strip starts here: x 56–65 lie under the skull
export const PESCOCO = 96 - FAIXA_X0; // the strip's index of u = 0 (the old joint, x 96)
export const JUNTA = 96 - CRANIO_X; // from the skull's joint to u = 0, on the path (30 px)
export const SOBRE = 6; // the skull drawn past its joint, over the skin

export async function faixaCorpo(N) {
  const { data, info } = await sharp(DIR + 'enguia-f1.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const meio = [];
  for (let x = 0; x < W; x++) {
    let a = -1, b = -1;
    for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > 128) { if (a < 0) a = y; b = y; }
    meio.push(a < 0 ? null : (a + b) / 2);
  }
  const liso = meio.map((_, x) => { let s = 0, n = 0; for (let k = -12; k <= 12; k++) { const m = meio[x + k]; if (m != null) { s += m; n++; } } return n ? s / n : H / 2; });
  const X0 = FAIXA_X0, X1 = W - 1 - [...meio].reverse().findIndex((m) => m != null);
  const coluna = (x) => {
    const out = new Uint8Array(ALTURA * 4);
    for (let r = 0; r < ALTURA; r++) {
      const y = Math.round(liso[x] + r - CENTRO);
      if (y < 0 || y >= H) continue;
      out.set(data.subarray((y * W + x) * 4, (y * W + x) * 4 + 4), r * 4);
    }
    return out;
  };
  const dif = (a, b) => {
    let s = 0;
    for (let r = 0; r < ALTURA; r++) {
      const va = a[r * 4 + 3] > 128, vb = b[r * 4 + 3] > 128;
      if (va !== vb) s += 0.25 * 255 * 255;
      else if (va) for (let k = 0; k < 3; k++) s += (a[r * 4 + k] - b[r * 4 + k]) ** 2;
    }
    return s;
  };
  // how well piece j may follow piece i: the columns around i's end against those around j's start
  const junta = (fimI, iniJ) => { let s = 0; for (let k = -2; k <= 2; k++) s += dif(coluna(fimI + k), coluna(iniJ + k)); return Math.sqrt(s / 5 / ALTURA); };
  // the pool: starts in the constant-thickness stretch whose 18 px piece closes on itself well
  const cand = [];
  for (let a = 205; a <= 236; a++) cand.push({ a, e: junta(a + PERIODO, a) });
  cand.sort((p, q) => p.e - q.e);
  const pool = [];
  for (const c of cand) if (pool.length < 4 && pool.every((p) => Math.abs(p.a - c.a) >= 5)) pool.push(c);
  pool.sort((p, q) => p.a - q.a);
  // the sequence: the neck part as drawn up to the first piece; then pieces, each the best-joining pool start (never
  // the same one twice in a row); then the body's rest from where the last piece ends
  const alvo = N.corpo.aneis * N.corpo.passo + PESCOCO;
  const inicio = pool[0].a;
  const cols = [];
  for (let x = X0; x < inicio; x++) cols.push({ x, peca: -1 });
  const restoDepois = X1 - (pool.at(-1).a + PERIODO) + 1; // what the drawn body has after the stretch
  let fim = inicio, anterior = -1, n = 0;
  while (cols.length + restoDepois + PERIODO <= alvo + 4) {
    let melhor = null;
    for (let i = 0; i < pool.length; i++) {
      if (i === anterior) continue;
      const e = junta(fim, pool[i].a) + (n % pool.length === i ? 0 : 3); // (a small nudge to cycle through the pool)
      if (!melhor || e < melhor.e) melhor = { i, e };
    }
    for (let k = 0; k < PERIODO; k++) cols.push({ x: pool[melhor.i].a + k, peca: n });
    fim = pool[melhor.i].a + PERIODO; anterior = melhor.i; n++;
  }
  // the rest of the drawn body, from the column that joins the last piece's end best (around the pool's end)
  let melhorResto = { x: fim, e: Infinity };
  for (let x = fim - 6; x <= fim + 6; x++) { const e = junta(fim, x); if (e < melhorResto.e) melhorResto = { x, e }; }
  for (let x = melhorResto.x; x <= X1; x++) cols.push({ x, peca: -2 });
  const w = cols.length;
  const out = Buffer.alloc(w * ALTURA * 4);
  cols.forEach((c, u) => { const col = coluna(c.x); for (let r = 0; r < ALTURA; r++) col.subarray(r * 4, r * 4 + 4).forEach((v, k) => { out[(r * w + u) * 4 + k] = v; }); });
  // (6th round, his circle on the back of the skull late in the fight: the strip's part under the skull (x 56–65) stuck
  // out over the skull when the head turned toward the ship — it is there only to close the joint's slit, so only its
  // middle band stays, ±10 rows around the centre, always inside the skull's outline)
  // (7 Nov, his circle in the cannons' flash: a 2 px slit between the jaw's underside and the neck at x 64–65 — the
  // band stopped at row 42 there, the jaw at ~45 and the skin past the joint at 52. Under the joint only, the band's
  // underside ramps down to meet both: row 43 at x 61 … 51 at x 65, behind the jaw)
  const fundo = (u) => Math.max(CENTRO + 10, 33 + 2 * u);
  for (let u = 0; u < CRANIO_X - FAIXA_X0; u++) for (let r = 0; r < ALTURA; r++) if (r < CENTRO - 10 || r > fundo(u)) out[(r * w + u) * 4 + 3] = 0;
  // each column's first and last opaque row (the roll samples inside them: the outline must never land mid-body)
  const topo = new Int16Array(w), base = new Int16Array(w);
  for (let u = 0; u < w; u++) {
    topo[u] = ALTURA; base[u] = -1;
    for (let r = 0; r < ALTURA; r++) if (out[(r * w + u) * 4 + 3] > 128) { if (topo[u] === ALTURA) topo[u] = r; base[u] = r; }
  }
  return { w, h: ALTURA, data: out, cols, pool, pecas: n, alvo, topo, base, liso };
}

// ─── the light (the rule of [[jogo-de-luz-por-normais]], the method of `_polimento/_corpo-todo.mjs`) ───
// The normal maps come from the PixelLab (`create_normal_map`, lite, opengl: green = up). The strip is wider than its
// 512 px limit, so it went in two halves overlapping 80 px (219–299): they are joined in the middle of the overlap,
// blended over 40 px, far from each half's cut end (where the generator rounds a false rim).
const NORMAIS = 'docs/superpowers/folhas/2026-11-07/enguia-aneis/';
const BLA = 219, J0 = 239, J1 = 279;
const lerNormais = async (arq) => {
  const { data, info } = await sharp(NORMAIS + arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
// what glows by itself (the ribs' embers, the tail's cyan, the vents' green, the eye, the mouth's ember) is not relit
export const brilha = (r, g, b) => Math.max(r, g, b) > 105 && Math.max(r, g, b) - Math.min(r, g, b) > 55;

// the painting's own light, fitted by least squares: lum ≈ C0 + C1·nx + C2·ny + C3·nz (nx right, ny up, nz out)
function ajustaLuz(cor, nrm, n) {
  const M = Array.from({ length: 4 }, () => new Float64Array(5));
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (cor[i + 3] < 128 || brilha(cor[i], cor[i + 1], cor[i + 2]) || (nrm[p * 3] === 0 && nrm[p * 3 + 1] === 0 && nrm[p * 3 + 2] === 0)) continue;
    const v = [1, nrm[p * 3], nrm[p * 3 + 1], nrm[p * 3 + 2]], lum = 0.299 * cor[i] + 0.587 * cor[i + 1] + 0.114 * cor[i + 2];
    for (let r = 0; r < 4; r++) { for (let c = 0; c < 4; c++) M[r][c] += v[r] * v[c]; M[r][4] += v[r] * lum; }
  }
  for (let c = 0; c < 4; c++) {
    let piv = c; for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < 4; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 5; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((row, r) => row[4] / row[r]);
}

// everything the art renderers need: the strip and its normals, the head and its normals, each one's fitted light
export async function carregaArte(N) {
  const faixa = await faixaCorpo(N);
  const A = await lerNormais('faixa-a-normal.png'), B = await lerNormais('faixa-b-normal.png');
  const nF = new Float32Array(faixa.w * ALTURA * 3);
  const vec = (img, x, y) => { const i = (y * img.w + x) * 4; return img.data[i + 3] < 128 ? null : [img.data[i] / 127.5 - 1, img.data[i + 1] / 127.5 - 1, img.data[i + 2] / 127.5 - 1]; };
  const nc = await lerNormais('cabeca-normal.png');
  for (let y = 0; y < ALTURA; y++) for (let i = 0; i < faixa.w; i++) {
    let n;
    if (i < PESCOCO) { // the neck: the head's own map (the same drawing; the head sits at y 8 in the F1)
      const x = FAIXA_X0 + i, yc = Math.round(faixa.liso[x] + y - CENTRO) - 8;
      n = yc >= 0 && yc < nc.h ? vec(nc, x, yc) : null;
    } else {
      const u = i - PESCOCO; // (the halves were made for the strip from x 96)
      const a = u < A.w ? vec(A, u, y) : null, b = u >= BLA ? vec(B, u - BLA, y) : null;
      const k = u <= J0 ? 0 : u >= J1 ? 1 : (u - J0) / (J1 - J0);
      n = !b || k === 0 ? a : !a || k === 1 ? b : a.map((q, j) => q * (1 - k) + b[j] * k);
    }
    if (!n) continue;
    const m = Math.hypot(...n) || 1;
    nF.set(n.map((q) => q / m), (y * faixa.w + i) * 3);
  }
  const cab = await sharp('docs/superpowers/folhas/2026-11-04/enguia-corpo/aprovada/cabeca-e3-pescoco.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const nC = new Float32Array(cab.info.width * cab.info.height * 3);
  for (let p = 0; p < cab.info.width * cab.info.height; p++) { const v = vec(nc, p % nc.w, Math.floor(p / nc.w)); if (v) nC.set(v, p * 3); }
  return {
    dorso: await carregaDorso(faixa.w),
    faixa, nFaixa: nF, luzFaixa: ajustaLuz(faixa.data, nF, faixa.w * ALTURA), faixa8: amplia8(faixa.data, faixa.w, ALTURA),
    cabeca: { data: cab.data, w: cab.info.width, h: cab.info.height }, nCabeca: nC, luzCabeca: ajustaLuz(cab.data, nC, cab.info.width * cab.info.height),
    cabeca8: amplia8(cab.data, cab.info.width, cab.info.height),
    vistas: await vistasCabeca(cab.data, cab.info.width, cab.info.height, nC),
  };
}

// ─── the head's TURN-OVER views (7 Nov, his ask: the head snapped to the other side in one frame). The skull rolls
// about its own chord (the neck joint → the snout) like the body's cylinder, every opaque run of a column (the upper
// jaw, the lower jaw, a tooth) its own elliptic section. Two sources, each where it sees the surface face-on: the
// approved E3 (its exact projection) on the flanks, the DORSAL head on the top of the skull — its share growing with
// the roll, none at rest. The normals roll with the pixels, so the light keeps working. Every 10°: views[k] is
// φ = 10k°; 0 and 180 are left to the art itself (as drawn, and mirrored).
export const DORSO_CABECA = 'docs/superpowers/folhas/2026-11-07/enguia-dorso/dorso-cabeca.png';
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export async function vistasCabeca(data, W, H, nC, { passo = 10, K = 0.9, borda = Number(process.env.ENGUIA_BORDA_CAB ?? 0.7) } = {}) {
  // (borda 0.7: the dorsal head only on the top of the skull, θ < ~45° — its eyes never show; the eyes always come
  // from the E3's flank, near and mirrored, so there are never three of them)
  const fs = await import('node:fs');
  if (process.env.ENGUIA_VISTAS === '0') return null;
  let dz = null;
  if (fs.existsSync(DORSO_CABECA)) {
    const d = await sharp(DORSO_CABECA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const dw = d.info.width, dh = d.info.height, meio = new Float32Array(dw), meia = new Float32Array(dw), tem = new Uint8Array(dw);
    let x0 = -1, x1 = -1;
    for (let x = 0; x < dw; x++) {
      let a = -1, b = -1;
      for (let y = 0; y < dh; y++) if (d.data[(y * dw + x) * 4 + 3] >= 128) { if (a < 0) a = y; b = y; }
      if (a < 0) continue;
      tem[x] = 1; meio[x] = (a + b) / 2; meia[x] = Math.max(1, (b - a) / 2);
      if (x0 < 0) x0 = x; x1 = x;
    }
    dz = { data: d.data, w: dw, h: dh, meio, meia, tem, x0, x1 };
  }
  const op = (x, y) => data[(y * W + x) * 4 + 3] > 128;
  const meioCol = (x) => { let a = -1, b = -1; for (let y = 0; y < H; y++) if (op(x, y)) { if (a < 0) a = y; b = y; } return a < 0 ? null : (a + b + 1) / 2; };
  let xs = 0; while (meioCol(xs) == null) xs++;
  const p0 = { x: xs, y: meioCol(xs) }, p1 = { x: CRANIO_X, y: meioCol(CRANIO_X) };
  const eixo = (x) => p0.y + ((p1.y - p0.y) * (x - p0.x)) / (p1.x - p0.x);
  const XF = CRANIO_X + SOBRE; // (past it the neck is the skin's: never drawn from the head)
  const vistas = [];
  for (let g = 0; g <= 180; g += passo) {
    if (g === 0 || g === 180) { vistas.push(null); continue; }
    const fi = (g * Math.PI) / 180, cf = Math.cos(fi), sf = Math.sin(fi), m = sf * sf;
    // (n0: the normal its colour was painted with — the light already in it; n: where it faces now, rolled)
    const out = new Uint8ClampedArray(W * H * 4), nOut = new Float32Array(W * H * 3), n0Out = new Float32Array(W * H * 3);
    const zb = new Float32Array(W * H).fill(-1e9);
    for (let x = 0; x < Math.min(W, XF + 1); x++) {
      const p = eixo(x);
      let run = 0;
      for (let y = 0; y < H; ) {
        if (!op(x, y)) { y++; continue; }
        const t = y; while (y < H && op(x, y)) y++;
        const b = y - 1, ar = (b - t + 1) / 2, c = (t + b + 1) / 2, U0 = p - c, wr = K * ar;
        const xd = dz ? Math.round(dz.x0 + ((x - xs) * (dz.x1 - dz.x0)) / (W - 1 - xs)) : -1;
        for (let k = -400; k <= 400; k++) {
          const th = (k / 400) * Math.PI, ct = Math.cos(th), st = Math.sin(th);
          const U = U0 + ar * ct, Z = wr * st;
          const Ur = U * cf - Z * sf, Zr = Z * cf + U * sf;
          const Y = Math.floor(p - Ur);
          if (Y < 0 || Y >= H) continue;
          const j = Y * W + x;
          if (Zr <= zb[j]) continue;
          let cor, ny, nz, nx = 0, n0;
          const lim = 1 - m * (1 - borda) + (BAYER4[(Y & 3) * 4 + (x & 3)] - 0.5) * 0.08;
          if (run === 0 && dz && dz.tem[xd] && ct > lim) { // the top of the skull: the dorsal head, read across by sin θ
            const yd = Math.round(dz.meio[xd] - st * dz.meia[xd]);
            if (yd < 0 || yd >= dz.h || dz.data[(yd * dz.w + xd) * 4 + 3] < 128) continue;
            const s = (yd * dz.w + xd) * 4;
            cor = [dz.data[s], dz.data[s + 1], dz.data[s + 2]];
            ny = ct; nz = st;
            n0 = [0, -st, ct]; // (painted from above: it faced that camera, tilted across)
          } else { // the flank: the E3's own pixel at its projected row (the far side = the near side mirrored)
            const row = Math.min(b, Math.max(t, Math.floor(c - ar * ct)));
            const s = (row * W + x) * 4;
            cor = [data[s], data[s + 1], data[s + 2]];
            const q = (row * W + x) * 3;
            nx = nC[q]; ny = nC[q + 1]; nz = st >= 0 ? nC[q + 2] : -nC[q + 2];
            n0 = [nC[q], nC[q + 1], nC[q + 2]];
          }
          zb[j] = Zr;
          out.set([cor[0], cor[1], cor[2], 255], j * 4);
          nOut.set([nx, ny * cf - nz * sf, nz * cf + ny * sf], j * 3);
          n0Out.set(n0, j * 3);
        }
        run++;
      }
    }
    vistas.push({ data: out, n: nOut, n0: n0Out, m8: amplia8(out, W, H) });
  }
  return { passo, lista: vistas, temDorso: !!dz };
}

// ─── the BACK seen from above (7 Nov): the dorsal strip, indexed like the side strip (column = the strip's index), the
// spine along its middle. Per column: its silhouette's middle and half-thickness (the texture is read across it at
// dw ∈ [−1, 1]). `borda`: sin of the surface angle where the plated back meets the ribbed flank — mid-roll, the back
// takes everything above it. Missing file → null (the old arc reading).
export const DORSO = 'docs/superpowers/folhas/2026-11-07/enguia-dorso/dorso-corpo.png';
export async function carregaDorso(w, borda = Number(process.env.ENGUIA_BORDA ?? 0.3)) {
  const fs = await import('node:fs');
  if (process.env.ENGUIA_DORSO === '0' || !fs.existsSync(DORSO)) return null;
  const { data, info } = await sharp(DORSO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width < w) throw new Error(`dorso-corpo.png tem ${info.width} colunas; a faixa tem ${w}`);
  const topo = new Int16Array(info.width).fill(-1), meio = new Float32Array(info.width), meia = new Float32Array(info.width);
  for (let x = 0; x < info.width; x++) {
    let a = -1, b = -1;
    for (let y = 0; y < info.height; y++) if (data[(y * info.width + x) * 4 + 3] >= 128) { if (a < 0) a = y; b = y; }
    if (a < 0) continue;
    topo[x] = a; meio[x] = (a + b) / 2; meia[x] = Math.max(1, (b - a) / 2);
  }
  return { data, w: info.width, h: info.height, topo, meio, meia, borda };
}

// ─── turning pixel art without breaking it (2nd round of the rings, his circles on the head: the jaw came out chopped)
// The RotSprite idea: blow the art up 8× with Scale2x three times — it rounds the diagonals and keeps every line one
// colour, never inventing a colour — then sample THAT at the turned position. The map keeps, for every 8× pixel, the
// index of the source pixel it copies (−1 = transparent), so colour and normal come from the same source pixel.
export function amplia8(rgba, w, h) {
  let idx = new Int32Array(w * h), W = w, H = h;
  for (let p = 0; p < w * h; p++) idx[p] = rgba[p * 4 + 3] > 128 ? p : -1;
  const igual = (a, b) => {
    if (a === b) return true;
    if (a < 0 || b < 0) return false;
    return rgba[a * 4] === rgba[b * 4] && rgba[a * 4 + 1] === rgba[b * 4 + 1] && rgba[a * 4 + 2] === rgba[b * 4 + 2];
  };
  for (let k = 0; k < 3; k++) {
    const out = new Int32Array(W * 2 * H * 2), W2 = W * 2;
    const at = (x, y) => idx[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (!igual(C, B) && !igual(A, D)) {
        if (igual(C, A)) e0 = A;
        if (igual(A, B)) e1 = B;
        if (igual(D, C)) e2 = C;
        if (igual(B, D)) e3 = D;
      }
      const o = y * 2 * W2 + x * 2;
      out[o] = e0; out[o + 1] = e1; out[o + W2] = e2; out[o + W2 + 1] = e3;
    }
    idx = out; W *= 2; H *= 2;
  }
  return { idx, w: W, h: H };
}
// the source pixel under an art position (float art px), through the 8× map
export const fonte8 = (m, ax, ay) => {
  const X = Math.floor(ax * 8), Y = Math.floor(ay * 8);
  return X < 0 || Y < 0 || X >= m.w || Y >= m.h ? -1 : m.idx[Y * m.w + X];
};
// the relight factor of a pixel whose normal (nx right, ny up, nz out, in the painting's frame) now faces (sx, sy, nz)
// on screen (sx right, sy UP): the fitted light's ratio, clamped (the method of the tail, GANHO 1.2)
// (`sz`: the out-of-screen part after a roll, when it changed — the head's turn-over views; else the same nz)
export function realce(C, nx, ny, nz, sx, sy, sz = nz) {
  const antes = Math.max(6, C[0] + C[1] * nx + C[2] * ny + C[3] * nz), depois = Math.max(6, C[0] + C[1] * sx + C[2] * sy + C[3] * sz);
  return Math.max(0.45, Math.min(1.8, 1 + (1.2 * (depois - antes)) / antes));
}
