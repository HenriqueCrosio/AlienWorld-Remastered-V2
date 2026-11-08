/**
 * THE EEL'S ART, BUILT FROM THE APPROVED PNGs AT LOAD (the mock's `arte.mjs`, ported line by line; the files come from a
 * `Leitor` instead of `sharp`, and every `amplia8` is an `Ampliado`). See the mock for the rounds behind each step:
 *   - the BODY as a straight strip, long enough for 20 rings: straightened, lengthened by cutting at the ribs;
 *   - its normal maps (two PixelLab halves blended in their overlap) and the painting's own fitted light;
 *   - the head's TURN-OVER views (every 10°: the E3 on the flanks, the dorsal head on the top of the skull);
 *   - the BACK seen from above (the dorsal strip).
 */
import { Ampliado } from './ampliado.ts';
import type { Leitor } from './fonte.ts';
import { ALTURA, CENTRO, CRANIO_X, FAIXA_X0, PERIODO, PESCOCO, SOBRE, type Numeros } from './numeros.ts';
import type { Img } from './tipos.ts';

export interface Faixa {
  w: number;
  h: number;
  data: Uint8Array;
  cols: { x: number; peca: number }[];
  pool: { a: number; e: number }[];
  pecas: number;
  alvo: number;
  topo: Int16Array;
  base: Int16Array;
  liso: number[];
}

export function faixaCorpo(N: Numeros, f1: Img): Faixa {
  const data = f1.data, W = f1.w, H = f1.h;
  const meio: (number | null)[] = [];
  for (let x = 0; x < W; x++) {
    let a = -1, b = -1;
    for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > 128) { if (a < 0) a = y; b = y; }
    meio.push(a < 0 ? null : (a + b) / 2);
  }
  const liso = meio.map((_, x) => {
    let s = 0, n = 0;
    for (let k = -12; k <= 12; k++) {
      const m = meio[x + k];
      if (m != null) { s += m; n++; }
    }
    return n ? s / n : H / 2;
  });
  const X0 = FAIXA_X0, X1 = W - 1 - [...meio].reverse().findIndex((m) => m != null);
  const coluna = (x: number): Uint8Array => {
    const out = new Uint8Array(ALTURA * 4);
    for (let r = 0; r < ALTURA; r++) {
      const y = Math.round(liso[x] + r - CENTRO);
      if (y < 0 || y >= H) continue;
      out.set(data.subarray((y * W + x) * 4, (y * W + x) * 4 + 4), r * 4);
    }
    return out;
  };
  const dif = (a: Uint8Array, b: Uint8Array): number => {
    let s = 0;
    for (let r = 0; r < ALTURA; r++) {
      const va = a[r * 4 + 3] > 128, vb = b[r * 4 + 3] > 128;
      if (va !== vb) s += 0.25 * 255 * 255;
      else if (va) for (let k = 0; k < 3; k++) s += (a[r * 4 + k] - b[r * 4 + k]) ** 2;
    }
    return s;
  };
  const junta = (fimI: number, iniJ: number): number => {
    let s = 0;
    for (let k = -2; k <= 2; k++) s += dif(coluna(fimI + k), coluna(iniJ + k));
    return Math.sqrt(s / 5 / ALTURA);
  };
  const cand: { a: number; e: number }[] = [];
  for (let a = 205; a <= 236; a++) cand.push({ a, e: junta(a + PERIODO, a) });
  cand.sort((p, q) => p.e - q.e);
  const pool: { a: number; e: number }[] = [];
  for (const c of cand) if (pool.length < 4 && pool.every((p) => Math.abs(p.a - c.a) >= 5)) pool.push(c);
  pool.sort((p, q) => p.a - q.a);
  const alvo = N.corpo.aneis * N.corpo.passo + PESCOCO;
  const inicio = pool[0].a;
  const cols: { x: number; peca: number }[] = [];
  for (let x = X0; x < inicio; x++) cols.push({ x, peca: -1 });
  const restoDepois = X1 - (pool[pool.length - 1].a + PERIODO) + 1;
  let fim = inicio, anterior = -1, n = 0;
  while (cols.length + restoDepois + PERIODO <= alvo + 4) {
    let melhor: { i: number; e: number } | null = null;
    for (let i = 0; i < pool.length; i++) {
      if (i === anterior) continue;
      const e = junta(fim, pool[i].a) + (n % pool.length === i ? 0 : 3);
      if (!melhor || e < melhor.e) melhor = { i, e };
    }
    const m = melhor as { i: number; e: number };
    for (let k = 0; k < PERIODO; k++) cols.push({ x: pool[m.i].a + k, peca: n });
    fim = pool[m.i].a + PERIODO;
    anterior = m.i;
    n++;
  }
  let melhorResto = { x: fim, e: Infinity };
  for (let x = fim - 6; x <= fim + 6; x++) {
    const e = junta(fim, x);
    if (e < melhorResto.e) melhorResto = { x, e };
  }
  for (let x = melhorResto.x; x <= X1; x++) cols.push({ x, peca: -2 });
  const w = cols.length;
  const out = new Uint8Array(w * ALTURA * 4);
  cols.forEach((c, u) => {
    const col = coluna(c.x);
    for (let r = 0; r < ALTURA; r++) for (let k = 0; k < 4; k++) out[(r * w + u) * 4 + k] = col[r * 4 + k];
  });
  const fundo = (u: number): number => Math.max(CENTRO + 10, 33 + 2 * u);
  for (let u = 0; u < CRANIO_X - FAIXA_X0; u++) for (let r = 0; r < ALTURA; r++) if (r < CENTRO - 10 || r > fundo(u)) out[(r * w + u) * 4 + 3] = 0;
  const topo = new Int16Array(w), base = new Int16Array(w);
  for (let u = 0; u < w; u++) {
    topo[u] = ALTURA;
    base[u] = -1;
    for (let r = 0; r < ALTURA; r++) if (out[(r * w + u) * 4 + 3] > 128) { if (topo[u] === ALTURA) topo[u] = r; base[u] = r; }
  }
  return { w, h: ALTURA, data: out, cols, pool, pecas: n, alvo, topo, base, liso };
}

// ─── the light ───
const BLA = 219, J0 = 239, J1 = 279;
/** what glows by itself (the ribs' embers, the tail's cyan, the vents' green, the eye, the mouth's ember) is not relit */
export const brilha = (r: number, g: number, b: number): boolean => Math.max(r, g, b) > 105 && Math.max(r, g, b) - Math.min(r, g, b) > 55;

/** the painting's own light, fitted by least squares: lum ≈ C0 + C1·nx + C2·ny + C3·nz */
export function ajustaLuz(cor: ArrayLike<number>, nrm: Float32Array, n: number): number[] {
  const M = Array.from({ length: 4 }, () => new Float64Array(5));
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (cor[i + 3] < 128 || brilha(cor[i], cor[i + 1], cor[i + 2]) || (nrm[p * 3] === 0 && nrm[p * 3 + 1] === 0 && nrm[p * 3 + 2] === 0)) continue;
    const v = [1, nrm[p * 3], nrm[p * 3 + 1], nrm[p * 3 + 2]], lum = 0.299 * cor[i] + 0.587 * cor[i + 1] + 0.114 * cor[i + 2];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) M[r][c] += v[r] * v[c];
      M[r][4] += v[r] * lum;
    }
  }
  for (let c = 0; c < 4; c++) {
    let piv = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < 4; r++)
      if (r !== c) {
        const f = M[r][c] / M[c][c];
        for (let k = c; k < 5; k++) M[r][k] -= f * M[c][k];
      }
  }
  return M.map((row, r) => row[4] / row[r]);
}

export interface Vista {
  data: Uint8ClampedArray;
  n: Float32Array;
  n0: Float32Array;
  readonly m8: Ampliado;
}
export interface Vistas {
  passo: number;
  lista: (Vista | null)[];
  temDorso: boolean;
}
export interface Dorso {
  data: Uint8Array | Uint8ClampedArray;
  w: number;
  h: number;
  topo: Int16Array;
  meio: Float32Array;
  meia: Float32Array;
  borda: number;
}

export interface Arte {
  dorso: Dorso | null;
  faixa: Faixa;
  nFaixa: Float32Array;
  luzFaixa: number[];
  faixa8: Ampliado;
  cabeca: Img;
  nCabeca: Float32Array;
  luzCabeca: number[];
  cabeca8: Ampliado;
  vistas: Vistas;
  /** the dorsal head, prepared once (the gestures' turn-over views reuse it) */
  dorsoCabeca: DorsoCabeca | null;
}

const vecDe = (img: Img, x: number, y: number): number[] | null => {
  const i = (y * img.w + x) * 4;
  return img.data[i + 3] < 128 ? null : [img.data[i] / 127.5 - 1, img.data[i + 1] / 127.5 - 1, img.data[i + 2] / 127.5 - 1];
};

/** everything the renderer needs: the strip and its normals, the head and its normals, each one's fitted light */
export function carregaArte(N: Numeros, ler: Leitor): Arte {
  const faixa = faixaCorpo(N, ler('enguiaF1'));
  const A = ler('enguiaFaixaNA'), B = ler('enguiaFaixaNB');
  const nF = new Float32Array(faixa.w * ALTURA * 3);
  const nc = ler('enguiaCabecaN');
  for (let y = 0; y < ALTURA; y++)
    for (let i = 0; i < faixa.w; i++) {
      let n: number[] | null;
      if (i < PESCOCO) { // the neck: the head's own map (the same drawing; the head sits at y 8 in the F1)
        const x = FAIXA_X0 + i, yc = Math.round(faixa.liso[x] + y - CENTRO) - 8;
        n = yc >= 0 && yc < nc.h ? vecDe(nc, x, yc) : null;
      } else {
        const u = i - PESCOCO;
        const a = u < A.w ? vecDe(A, u, y) : null, b = u >= BLA ? vecDe(B, u - BLA, y) : null;
        const k = u <= J0 ? 0 : u >= J1 ? 1 : (u - J0) / (J1 - J0);
        n = !b || k === 0 ? a : !a || k === 1 ? b : a.map((q, j) => q * (1 - k) + b[j] * k);
      }
      if (!n) continue;
      const m = Math.hypot(...n) || 1;
      nF.set(n.map((q) => q / m), (y * faixa.w + i) * 3);
    }
  const cab = ler('enguiaCabeca');
  const nC = new Float32Array(cab.w * cab.h * 3);
  for (let p = 0; p < cab.w * cab.h; p++) {
    const v = vecDe(nc, p % nc.w, Math.floor(p / nc.w));
    if (v) nC.set(v, p * 3);
  }
  const dorsoCabeca = preparaDorsoCabeca(ler('enguiaDorsoCabeca'));
  return {
    dorso: carregaDorso(faixa.w, ler('enguiaDorso')),
    faixa, nFaixa: nF, luzFaixa: ajustaLuz(faixa.data, nF, faixa.w * ALTURA), faixa8: new Ampliado(faixa.data, faixa.w, ALTURA),
    cabeca: cab, nCabeca: nC, luzCabeca: ajustaLuz(cab.data, nC, cab.w * cab.h),
    cabeca8: new Ampliado(cab.data, cab.w, cab.h),
    vistas: vistasCabeca(cab.data, cab.w, cab.h, nC, dorsoCabeca),
    dorsoCabeca,
  };
}

// ─── the head's TURN-OVER views ───
export interface DorsoCabeca {
  data: Uint8Array | Uint8ClampedArray;
  w: number;
  h: number;
  meio: Float32Array;
  meia: Float32Array;
  tem: Uint8Array;
  x0: number;
  x1: number;
}
export function preparaDorsoCabeca(d: Img | null): DorsoCabeca | null {
  if (!d) return null;
  const dw = d.w, dh = d.h, meio = new Float32Array(dw), meia = new Float32Array(dw), tem = new Uint8Array(dw);
  let x0 = -1, x1 = -1;
  for (let x = 0; x < dw; x++) {
    let a = -1, b = -1;
    for (let y = 0; y < dh; y++) if (d.data[(y * dw + x) * 4 + 3] >= 128) { if (a < 0) a = y; b = y; }
    if (a < 0) continue;
    tem[x] = 1;
    meio[x] = (a + b) / 2;
    meia[x] = Math.max(1, (b - a) / 2);
    if (x0 < 0) x0 = x;
    x1 = x;
  }
  return { data: d.data, w: dw, h: dh, meio, meia, tem, x0, x1 };
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export function vistasCabeca(data: ArrayLike<number>, W: number, H: number, nC: Float32Array, dz: DorsoCabeca | null, { passo = 10, K = 0.9, borda = 0.7 } = {}): Vistas {
  const op = (x: number, y: number): boolean => data[(y * W + x) * 4 + 3] > 128;
  const meioCol = (x: number): number | null => {
    let a = -1, b = -1;
    for (let y = 0; y < H; y++) if (op(x, y)) { if (a < 0) a = y; b = y; }
    return a < 0 ? null : (a + b + 1) / 2;
  };
  let xs = 0;
  while (meioCol(xs) == null) xs++;
  const p0 = { x: xs, y: meioCol(xs) as number }, p1 = { x: CRANIO_X, y: meioCol(CRANIO_X) as number };
  const eixo = (x: number): number => p0.y + ((p1.y - p0.y) * (x - p0.x)) / (p1.x - p0.x);
  const XF = CRANIO_X + SOBRE;
  const vistas: (Vista | null)[] = [];
  for (let g = 0; g <= 180; g += passo) {
    if (g === 0 || g === 180) { vistas.push(null); continue; }
    const fi = (g * Math.PI) / 180, cf = Math.cos(fi), sf = Math.sin(fi), m = sf * sf;
    const out = new Uint8ClampedArray(W * H * 4), nOut = new Float32Array(W * H * 3), n0Out = new Float32Array(W * H * 3);
    const zb = new Float32Array(W * H).fill(-1e9);
    for (let x = 0; x < Math.min(W, XF + 1); x++) {
      const p = eixo(x);
      let run = 0;
      for (let y = 0; y < H; ) {
        if (!op(x, y)) { y++; continue; }
        const t = y;
        while (y < H && op(x, y)) y++;
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
          let c0: number, c1: number, c2: number, ny: number, nz: number, nx = 0, n00: number, n01: number, n02: number;
          const lim = 1 - m * (1 - borda) + (BAYER4[(Y & 3) * 4 + (x & 3)] - 0.5) * 0.08;
          if (run === 0 && dz && dz.tem[xd] && ct > lim) {
            const yd = Math.round(dz.meio[xd] - st * dz.meia[xd]);
            if (yd < 0 || yd >= dz.h || dz.data[(yd * dz.w + xd) * 4 + 3] < 128) continue;
            const s = (yd * dz.w + xd) * 4;
            c0 = dz.data[s]; c1 = dz.data[s + 1]; c2 = dz.data[s + 2];
            ny = ct; nz = st;
            n00 = 0; n01 = -st; n02 = ct;
          } else {
            const row = Math.min(b, Math.max(t, Math.floor(c - ar * ct)));
            const s = (row * W + x) * 4;
            c0 = data[s]; c1 = data[s + 1]; c2 = data[s + 2];
            const q = (row * W + x) * 3;
            nx = nC[q]; ny = nC[q + 1]; nz = st >= 0 ? nC[q + 2] : -nC[q + 2];
            n00 = nC[q]; n01 = nC[q + 1]; n02 = nC[q + 2];
          }
          zb[j] = Zr;
          out[j * 4] = c0; out[j * 4 + 1] = c1; out[j * 4 + 2] = c2; out[j * 4 + 3] = 255;
          nOut[j * 3] = nx; nOut[j * 3 + 1] = ny * cf - nz * sf; nOut[j * 3 + 2] = nz * cf + ny * sf;
          n0Out[j * 3] = n00; n0Out[j * 3 + 1] = n01; n0Out[j * 3 + 2] = n02;
        }
        run++;
      }
    }
    const lz = Ampliado.preguicoso(out, W, H);
    vistas.push({ data: out, n: nOut, n0: n0Out, get m8() { return lz.m8; } });
  }
  return { passo, lista: vistas, temDorso: !!dz };
}

/** the BACK seen from above: the dorsal strip, indexed like the side strip */
export function carregaDorso(w: number, img: Img | null, borda = 0.3): Dorso | null {
  if (!img) return null;
  const { data } = img;
  if (img.w < w) throw new Error(`dorso-corpo.png tem ${img.w} colunas; a faixa tem ${w}`);
  const topo = new Int16Array(img.w).fill(-1), meio = new Float32Array(img.w), meia = new Float32Array(img.w);
  for (let x = 0; x < img.w; x++) {
    let a = -1, b = -1;
    for (let y = 0; y < img.h; y++) if (data[(y * img.w + x) * 4 + 3] >= 128) { if (a < 0) a = y; b = y; }
    if (a < 0) continue;
    topo[x] = a;
    meio[x] = (a + b) / 2;
    meia[x] = Math.max(1, (b - a) / 2);
  }
  return { data, w: img.w, h: img.h, topo, meio, meia, borda };
}

/** the relight factor of a pixel whose normal (nx right, ny up, nz out) now faces (sx, sy, sz) on screen (sy UP) */
export function realce(C: readonly number[], nx: number, ny: number, nz: number, sx: number, sy: number, sz = nz): number {
  const antes = Math.max(6, C[0] + C[1] * nx + C[2] * ny + C[3] * nz), depois = Math.max(6, C[0] + C[1] * sx + C[2] * sy + C[3] * sz);
  return Math.max(0.45, Math.min(1.8, 1 + (1.2 * (depois - antes)) / antes));
}
