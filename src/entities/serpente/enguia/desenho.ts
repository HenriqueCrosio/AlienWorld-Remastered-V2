/**
 * THE EEL'S FRAME AT THE NATIVE 384×216 (the mock's `desenho.mjs`, ported line by line; plan
 * `2026-11-08-enguia-instalacao.md`, Task 7). Every pixel goes through an `Alvo` (`alvos.ts`): the oracle's opaque frame
 * over the arena photo, or the game's two canvases. In the mock's order: what is in the den, the breach lip in front,
 * the hull's warnings, the lanes' tint, the fire (behind her), her skin, the pipes' mouths, the head and the joint's
 * seal, the geysers, the Echo, the breathers, the particles, the pixelfx layer. (The mock's ship and shots are not
 * here: the oracle draws them after.) The hull's bump, crack and tremble are the game's `cascoVivo` (decision 6); the
 * oracle (`s.cascoProprio`) draws them as the mock does.
 * Her skin: the whole strip BENT along the path, every column laid across it at its arc length, the roll a turning
 * cylinder (the side art on the flanks, the dorsal texture on the back), relit by the normal maps; the head in its
 * approved art (or a gesture's frame, or a turn-over view), turned and mirrored, relit the same way.
 */
import { CENTRO, CRANIO_X, PESCOCO, SOBRE, type Numeros } from './numeros.ts';
import { brilha, realce, type Arte } from './arte.ts';
import type { Alvo } from './alvos.ts';
import { PARTE_CABECA, PARTE_CORPO } from './alvos.ts';
import { bocasDosCanos, type EstadoCanos } from './canos.ts';
import { cabecaParaTela, naToca, telaParaCabeca } from './corpo.ts';
import type { EstadoEco } from './eco.ts';
import type * as Efeitos from './efeitos.ts';
import type { QuadroGesto } from './gestos.ts';
import { trilhaFissura } from './geiseres.ts';
import type { Respiros } from './respiros.ts';
import type { Amostra, Geiser, Img, Med, Ponto, Pose, Sinal } from './tipos.ts';

type RGB = readonly number[];
type PutC = (x: number, y: number, c: RGB, a?: number) => void;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const hashD = (a: number, b: number, c: number): number => {
  let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const hash = hashD;

export interface Particula {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  idade: number;
  vida: number;
  tam: number;
  cor?: RGB;
  a?: number;
  cresce?: boolean;
  arrasto?: number;
  gota?: boolean;
  anel?: boolean;
  pedaco?: { dx: number; dy: number; c: RGB; brasa?: boolean; borda?: boolean }[];
}

export interface Pfx {
  mod: typeof Efeitos;
  camada: Efeitos.Camada;
  vivos: Efeitos.FxVivo[];
  estouro: { t: number; x: number; y: number } | null;
  fusao: Efeitos.FxVivo | null;
}

/** the frame's state (the mock's `s`, 470–480) */
export interface EstadoDesenho {
  t: number;
  f: number;
  pose: Pose;
  geis: Geiser[];
  lombada: number | null;
  canos: EstadoCanos | null;
  brasas: { livre: number; k: number }[];
  eco: (EstadoEco & { rastro: { x: number; y: number }[] | null }) | null;
  sinais: Sinal[];
  fissuras: { de: number; ate: number; cura: number }[];
  particulas: Particula[];
  semCabeca: boolean;
  morta: boolean;
  mordida: { x: number; y: number; r: number } | null;
  olhoAceso: boolean;
  gesto: QuadroGesto | null;
  decapitada: boolean;
  pfx: Pfx;
  respiros: Respiros | null;
  luzCorpo: ((u: number) => number) | null;
  /** the oracle: draw the hull's bump, crack and tremble as the mock (the game: `cascoVivo`) */
  cascoProprio?: boolean;
}

export interface Desenho {
  W: number;
  H: number;
  N: Numeros;
  med: Med;
  arte: Arte;
  /** the arena photo (the oracle only: the hull's bump reads the band from it) */
  fundo: Uint8Array | null;
  naFrente: Uint8Array;
  /** the lip's box (the restore walks only it; the mock walks the whole frame — the same pixels) */
  caixaLabio: { x0: number; y0: number; x1: number; y1: number };
  /** the lip's colours on screen (W × H × 4) */
  labioTela: Uint8Array;
  bordaLabio: Uint8Array;
  pertoBorda: Uint8Array;
  trilha: Int16Array;
  ramos: { x: number; y: number }[];
}

// ─── her skin (the mock's `corpoArte`, the 'pele' way) ───
// (Task 9, the hot path — the md5 of every frame stays the mock's: a sample whose skin cannot reach the screen is
// skipped, so is a pixel off the screen (the target would drop it); the torn edges are worked out once per row; the
// colours go to the target as numbers, never as arrays)
const corteTab = new Float64Array(96), corteTem = new Int32Array(96), decapTab = new Float64Array(96), decapTem = new Uint8Array(96);
let corteGeracao = 0;
function corpoArte(D: Desenho, s: EstadoDesenho, alvo: Alvo, filtro: (a: Amostra) => boolean): void {
  const A = D.arte, F = A.faixa, nF = A.nFaixa, C = A.luzFaixa, P = s.pose, T = s.morta ? [] : P.tubo;
  if (!T.length) return;
  const W = D.W, H = D.H;
  const comp = P.nAneis * D.N.corpo.passo, mordida = P.nAneis < D.N.corpo.aneis;
  const geracao = ++corteGeracao;
  const corte = (row: number): number => {
    const q = Math.round(row), k = q + 16;
    if (k >= 0 && k < 96 && corteTem[k] === geracao) return corteTab[k];
    const sem = P.nAneis * 7.3;
    let j = 6 + 4 * Math.sin(q * 0.83 + sem) + 3 * Math.sin(q * 2.17 + sem * 1.9) + 2 * Math.sin(q * 5.3 + sem * 0.7);
    if (hashD(q, P.nAneis, 3) < 0.12) j -= 6;
    const c = comp - Math.round(j);
    if (k >= 0 && k < 96) { corteTab[k] = c; corteTem[k] = geracao; }
    return c;
  };
  if (s.decapitada) decapTem.fill(0);
  const decap = (rowf: number): number => {
    const q = Math.round(rowf), k = q + 16;
    if (k >= 0 && k < 96 && decapTem[k]) return decapTab[k];
    const c = 12 + 3 + 3 * Math.sin(q * 0.91 + 2.1) + 2 * Math.sin(q * 2.3) + (hashD(q, 7, 1) < 0.15 ? -5 : 0);
    if (k >= 0 && k < 96) { decapTab[k] = c; decapTem[k] = 1; }
    return c;
  };
  const Dz = A.dorso;
  const pr = (X: number, Y: number, r: number, g: number, b: number): void => alvo.put(X, Y, r, g, b, 1, PARTE_CORPO);
  const pinta = (X: number, Y: number, rowf: number, uf: number, dx: number, dy: number, D0x: number, D0y: number, lado: number, dw: number | null = null): void => {
    let p: number, src: ArrayLike<number> = F.data;
    if (dw != null && Dz) {
      const ui = Math.min(Dz.w - 1, Math.max(0, Math.floor(uf)));
      if (Dz.topo[ui] < 0) return;
      const yd = Math.round(Dz.meio[ui] - dw * Dz.meia[ui]);
      p = yd * Dz.w + ui;
      if (yd < 0 || yd >= Dz.h || Dz.data[p * 4 + 3] < 128) return;
      src = Dz.data;
    } else {
      p = A.faixa8.fonte(uf, rowf);
      if (p < 0) return;
    }
    const u = uf - PESCOCO;
    let r = src[p * 4], g = src[p * 4 + 1], b = src[p * 4 + 2];
    if (s.decapitada) { // (the head blown off: the neck's front torn the same way as the tail's stump)
      const c = decap(rowf);
      if (uf < c) return;
      if (uf < c + 2.4) {
        const h = hashD(Math.round(X), Math.round(Y), 99);
        if (h < 0.1) pr(X, Y, 255, 120, 44); else if (h < 0.5) pr(X, Y, 120, 28, 22); else if (h < 0.85) pr(X, Y, 70, 16, 18); else pr(X, Y, 28, 8, 10);
        return;
      }
    }
    if (mordida) {
      const c = corte(rowf), falta = c - u;
      if (falta < 0) return;
      if (falta < 2.2) { // the torn rim: dark flesh, a few embers
        const h = hashD(Math.round(X), Math.round(Y), P.nAneis);
        if (h < 0.12) pr(X, Y, 255, 120, 44); else if (h < 0.45) pr(X, Y, 92, 22, 16); else if (h < 0.8) pr(X, Y, 52, 12, 12); else pr(X, Y, 24, 8, 10);
        return;
      }
      if (falta < 4.5) { r *= 0.6; g *= 0.45; b *= 0.45; } // bruised just behind it
    }
    if (dw == null && !brilha(r, g, b)) {
      const q = p * 3, nx = nF[q], ny = nF[q + 1], nz = nF[q + 2];
      const vx = -nx * dx + ny * lado * D0x, vy = -nx * dy + ny * lado * D0y;
      const k = realce(C, nx, ny, nz, vx, -vy);
      r *= k; g *= k; b *= k;
    } else if (dw == null && s.luzCorpo) { // (her lights swell where a breather fires, and with the rest wave)
      const k = s.luzCorpo(u);
      const kk = Math.min(k, 235 / Math.max(r, g, b, 1));
      if (kk > 1) { r *= kk; g *= kk; b *= kk; }
    }
    pr(X, Y, Math.min(255, r), Math.min(255, g), Math.min(255, b));
  };
  // every 0.25 px of arc, tail → head, the strip's column laid across the path
  for (let i = T.length - 2; i >= 0; i--) {
    const a = T[i], b = T[i + 1];
    if (!filtro(a)) continue;
    // (the skin reaches ±32 px across the path and 2 px along it: a sample farther than that from the screen draws
    // nothing the target would keep)
    if (a.x < -36 || a.x > W + 36 || a.y < -36 || a.y > H + 36) continue;
    for (let sub = 3; sub >= 0; sub--) {
      const f = sub / 4, u = a.u + (b.u - a.u) * f;
      if (u > comp + 10) continue;
      const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, dx = a.dx + (b.dx - a.dx) * f, dy = a.dy + (b.dy - a.dy) * f;
      const m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m, D0x = -uy, D0y = ux;
      const fi = a.fi + (b.fi - a.fi) * f, Rr = Math.max(3, a.r + 1), cf = Math.cos(fi);
      const uf = u + PESCOCO;
      const emRolagem = fi > 0.05 && fi < Math.PI - 0.05;
      const ua = Math.min(F.w - 1, Math.max(0, Math.round(uf))), r0 = F.topo[ua] + 2, r1 = F.base[ua] - 2;
      for (let vs = -CENTRO; vs < CENTRO; vs += 0.5) {
        { const X = Math.round(x + D0x * vs), Y = Math.round(y + D0y * vs); if (X < 0 || X >= W || Y < 0 || Y >= H) continue; }
        let row: number;
        if (!emRolagem || Math.abs(vs) >= Rr) row = CENTRO - (cf >= 0 ? vs : -vs);
        else if (Dz) {
          const aa = Math.asin(vs / Rr) + fi, sa = Math.sin(aa), mm = Math.sin(fi) ** 2;
          const PX = Math.round(x + D0x * vs), PY = Math.round(y + D0y * vs);
          const lim = 1 - mm * (1 - Dz.borda) + (BAYER[(PY & 3) * 4 + (PX & 3)] - 0.5) * 0.08;
          const rowCil = Math.min(r1, Math.max(r0, CENTRO - Rr * sa));
          if (sa > lim) pinta(x + D0x * vs, y + D0y * vs, rowCil, uf, ux, uy, D0x, D0y, cf >= 0 ? 1 : -1, Math.cos(aa));
          else pinta(x + D0x * vs, y + D0y * vs, rowCil, uf, ux, uy, D0x, D0y, cf >= 0 ? 1 : -1);
          continue;
        } else {
          const aa = Math.asin(vs / Rr) + fi;
          const rowCil = CENTRO - Rr * Math.sin(aa);
          const af = aa > Math.PI / 2 ? Math.PI - aa : aa;
          const rowArco = CENTRO - af * ((2 * Rr) / Math.PI);
          const w = Math.sin(fi) ** 2;
          row = Math.min(r1, Math.max(r0, rowCil * (1 - w) + rowArco * w));
        }
        pinta(x + D0x * vs, y + D0y * vs, row, uf, ux, uy, D0x, D0y, cf >= 0 ? 1 : -1);
      }
    }
  }
}

// ─── the head in its approved art (E3), turned and mirrored, relit by its normal map (the mock's `cabecaArte`) ───
function cabecaArte(D: Desenho, s: EstadoDesenho, put: PutC): void {
  const A = D.arte, H = D.med.cabeca, img = A.cabeca;
  const VS = s.gesto?.vistas ?? A.vistas;
  const kV = VS ? Math.round((s.pose.cabeca.fi * 180) / Math.PI / VS.passo) : 0;
  const V = VS && kV > 0 && kV < VS.lista.length - 1 ? VS.lista[kV] : null;
  const C = V ? { ...s.pose.cabeca, espelho: false } : s.pose.cabeca;
  const Gq = !V && s.gesto ? s.gesto : null, fw = Gq ? Gq.w : img.w, oy = Gq ? Gq.oy : 0;
  const dados: ArrayLike<number> = Gq ? Gq.data : V ? V.data : img.data;
  const mapa8 = Gq ? Gq.m8 : V ? V.m8 : A.cabeca8;
  const nC = Gq ? Gq.n : V ? V.n : A.nCabeca, n0 = Gq ? Gq.n : V ? V.n0 : A.nCabeca;
  const a = { x: Math.cos(H.ang), y: Math.sin(H.ang) }, r = C.ang - H.ang, cr = Math.cos(r), sr = Math.sin(r);
  const vira = (vx: number, vy: number): [number, number] => {
    if (C.espelho) {
      const d = vx * a.x + vy * a.y;
      vx = 2 * d * a.x - vx;
      vy = 2 * d * a.y - vy;
    }
    return [vx * cr - vy * sr, vx * sr + vy * cr];
  };
  for (let Y = Math.floor(C.pescoco.y - 70); Y <= C.pescoco.y + 70; Y++)
    for (let X = Math.floor(C.pescoco.x - 70); X <= C.pescoco.x + 70; X++) {
      if (X < 0 || X >= D.W || Y < 0 || Y >= D.H) continue; // (Task 9: off the screen the target drops it)
      const p = telaParaCabeca(C, D.med, { x: X + 0.5, y: Y + 0.5 });
      if (p.x >= CRANIO_X + SOBRE) continue; // (the neck is the skin's; the skull overlaps it by SOBRE px)
      const src = mapa8.fonte(p.x, p.y + oy);
      if (src < 0) continue;
      const ax = src % fw, ay = Math.floor(src / fw), i = src * 4;
      if (s.mordida) { // the bite in the skull: a WOUND (torn flesh at its rim, dark and glowing inside)
        const dm = Math.hypot(p.x - s.mordida.x, p.y - s.mordida.y);
        if (dm < s.mordida.r) {
          const h = hashD(Math.round(p.x * 2), Math.round(p.y * 2), 41);
          put(X, Y, dm > s.mordida.r - 1.6 ? (h < 0.5 ? [120, 30, 24] : [70, 18, 18]) : h < 0.12 ? [255, 120, 44] : h < 0.5 ? [44, 10, 12] : [24, 6, 10]);
          continue;
        }
      }
      let rr = dados[i], g = dados[i + 1], b = dados[i + 2];
      if (!brilha(rr, g, b)) {
        const q = (ay * fw + ax) * 3, [vx, vy] = vira(nC[q], -nC[q + 1]);
        const k = realce(A.luzCabeca, n0[q], n0[q + 1], n0[q + 2], vx, -vy, nC[q + 2]);
        rr *= k; g *= k; b *= k;
      } else if (s.olhoAceso && b > rr + 40) { rr = rr + (220 - rr) * 0.5; g = g + (245 - g) * 0.5; b = b + (255 - b) * 0.5; }
      put(X, Y, [Math.min(255, rr), Math.min(255, g), Math.min(255, b)]);
    }
}

/** everything that does not change: the lip in front of the den, its inner edge, the crack */
export function preparaDesenho(N: Numeros, med: Med, arte: Arte, { fundo = null, labio }: { fundo?: Uint8Array | null; labio: Img }): Desenho {
  const W = N.tela.W, H = N.tela.H;
  const naFrente = new Uint8Array(W * H), labioTela = new Uint8Array(W * H * 4);
  const cx = { x0: W, y0: H, x1: -1, y1: -1 };
  for (let y = 0; y < labio.h; y++)
    for (let x = 0; x < labio.w; x++) {
      const k = (y * labio.w + x) * 4;
      if (labio.data[k + 3] < 128) continue;
      const X = N.rombo.labio.x + x, Y = N.rombo.labio.y + y;
      if (X >= 0 && X < W && Y >= 0 && Y < H) {
        const j = Y * W + X;
        naFrente[j] = 1;
        labioTela.set([labio.data[k], labio.data[k + 1], labio.data[k + 2], 255], j * 4);
        cx.x0 = Math.min(cx.x0, X); cx.x1 = Math.max(cx.x1, X); cx.y0 = Math.min(cx.y0, Y); cx.y1 = Math.max(cx.y1, Y);
      }
    }
  const { trilha, ramos } = trilhaFissura(N);
  const bordaLabio = new Uint8Array(W * H);
  for (let y = N.rombo.labio.y; y < H; y++)
    for (let x = N.rombo.x0 - 14; x <= N.rombo.x1 + 14; x++) {
      const i = y * W + x;
      if (!naFrente[i]) continue;
      const furo = (X: number, Y: number): boolean => X >= N.rombo.x0 && X <= N.rombo.x1 && Y >= 128 && Y < H && !naFrente[Y * W + X];
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => furo(x + a, y + b))) bordaLabio[i] = 1;
    }
  const pertoBorda = new Uint8Array(W * H);
  {
    let fila: number[] = [];
    for (let i = 0; i < W * H; i++) if (bordaLabio[i]) { pertoBorda[i] = 1; fila.push(i); }
    for (let d = 2; d <= 10; d++) {
      const prox: number[] = [];
      for (const i of fila) for (const o of [1, -1, W, -W]) {
        const j = i + o;
        if (j >= 0 && j < W * H && naFrente[j] && !pertoBorda[j]) { pertoBorda[j] = d; prox.push(j); }
      }
      fila = prox;
    }
  }
  return { W, H, N, med, arte, fundo, naFrente, caixaLabio: cx, labioTela, bordaLabio, pertoBorda, trilha, ramos };
}

// the venom, dark teal → toxic yellow-green → a near-white bubble (the green head's own family)
export const VENENO: RGB[] = [[10, 30, 24], [18, 60, 40], [28, 110, 66], [52, 168, 92], [104, 224, 116], [170, 248, 140], [224, 255, 186], [244, 255, 226]];

const COR = {
  aro: [34, 36, 44], olho: [96, 210, 255], brasa: [255, 140, 48],
  livre: [205, 228, 255], perigo: [255, 46, 32], ciano: [88, 200, 255], verde: [96, 240, 136], laranja: [255, 160, 64],
} as const;

export function quadro(D: Desenho, s: EstadoDesenho, alvo: Alvo): void {
  const { W, N } = D;
  const put: PutC = (x, y, c, a = 1) => alvo.put(x, y, c[0], c[1], c[2], a, 0);
  // (the mock's disc, pixel by pixel through `put`; Task 9: the target draws it span by span — the same pixels, the same
  // blend, in the same order)
  const disco = (cx: number, cy: number, r: number, c: RGB, a = 1): void => alvo.disco(cx, cy, r, c[0], c[1], c[2], a);
  const t = s.t, P = s.pose;

  // ── 0 · what is in the den (the head too, when its neck is in the hole), her eye's glow down in the hole before she
  // breaks out, then the breach's lip over it all
  for (const g of s.sinais) {
    const k = Math.min(1, (t - g.t0) / (g.t1 - g.t0));
    disco(g.x, 214, 6 + 16 * k, COR.ciano, 0.12 + 0.3 * k * (0.7 + 0.3 * Math.sin(t * 20)));
    disco(g.x, 214, 3 + 5 * k, [200, 240, 255], 0.3 * k);
  }
  const putCabeca: PutC = (x, y, c, a = 1) => alvo.put(x, y, c[0], c[1], c[2], a, PARTE_CABECA);
  corpoArte(D, s, alvo, (a) => a.toca);
  const cabecaNaToca = naToca(P.cabeca.pescoco, N);
  if (cabecaNaToca) cabeca();
  {
    const c = D.caixaLabio;
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) { const i = y * W + x; if (D.naFrente[i]) alvo.labio(i); }
  }

  // ── 1 · the living hull (the oracle only: the game's is `cascoVivo`), and the geysers' warning on the crack
  if (s.cascoProprio && D.fundo) {
    const fundo = D.fundo, L = N.geiser.lombada;
    const desloca = (x: number): number => {
      let d = 0;
      if (s.lombada != null) d = Math.max(d, L.amp * Math.exp(-(((x - s.lombada) / L.larg) ** 2)));
      for (const g of s.sinais) {
        const k = Math.min(1, (t - g.t0) / (g.t1 - g.t0));
        d = Math.max(d, 2.2 * k * (0.6 + 0.4 * Math.sin(t * 38)) * Math.exp(-(((x - g.x) / 34) ** 2)));
      }
      return Math.round(d);
    };
    const xsLombada: number[] = [];
    if (s.lombada != null) for (let x = Math.floor(s.lombada - 3 * L.larg); x <= s.lombada + 3 * L.larg; x++) xsLombada.push(x);
    for (const g of s.sinais) for (let x = Math.floor(g.x - 80); x <= g.x + 80; x++) xsLombada.push(x);
    for (const x of new Set(xsLombada)) {
      if (x < 0 || x >= W) continue;
      const d = desloca(x);
      if (!d) continue;
      for (let y = N.crista - 16; y < 200; y++) {
        const dy = d * Math.max(0, 1 - Math.max(0, y - N.crista + 1) / L.fundo);
        const sy = Math.min(D.H - 1, Math.round(y + dy)), i = (sy * W + x) * 4;
        put(x, y, [fundo[i], fundo[i + 1], fundo[i + 2]]);
      }
    }
    for (const fi of s.fissuras) {
      const len = (fi.ate - fi.de + 6) * fi.cura, curaAte = fi.ate - len;
      for (let x = Math.ceil(fi.de); x <= fi.ate; x++) {
        if (x < 0 || x >= W || x > curaAte) continue;
        const y = D.trilha[x] - desloca(x);
        put(x, y - 1, [10, 11, 15]); put(x, y, [16, 17, 22]); put(x, y - 2, [0, 0, 0], 0.45); put(x, y + 1, [255, 255, 255], 0.28);
      }
      for (const r of D.ramos) if (r.x >= fi.de && r.x <= Math.min(fi.ate, curaAte)) put(r.x, r.y - desloca(r.x), [14, 15, 20]);
      if (fi.cura > 0)
        for (let q = 0; q <= 10; q++) {
          const x = Math.round(curaAte + q);
          if (x < fi.de || x > fi.ate || x < 0 || x >= W) continue;
          for (const dy of [-2, -1, 0, 1]) put(x, D.trilha[x] + dy, [6, 6, 10], 0.35 * (1 - q / 10));
        }
    }
  }
  for (const g of s.geis) { // the warning: the crack lights green where the geyser will break, a puff, the plates rise
    if (t < g.tAviso || t >= g.tFim) continue;
    const k = t < g.tColuna ? (t - g.tAviso) / N.geiser.aviso : 1;
    for (let dx = -9; dx <= 9; dx++) {
      const x = Math.round(g.x + dx), y = D.trilha[Math.max(0, Math.min(W - 1, x))];
      const a = (0.35 + 0.65 * k) * (1 - Math.abs(dx) / 11);
      put(x, y - 1, COR.verde, a); put(x, y, [200, 255, 220], a * 0.8); put(x, y - 2, COR.verde, a * 0.4);
      if (t < g.tColuna) put(x, N.crista - 1, [80, 92, 110], 0.6 * k);
    }
  }

  // ── 2 · the lanes' warning (behind her: the tint is on the arena)
  if (s.canos) {
    const q = s.canos, F = N.canos.faixas;
    if ((q.fase === 'aviso' || q.fase === 'fogo') && q.livre != null) {
      const carga = q.fase === 'aviso' ? q.k : 1;
      const pulso = 0.5 + 0.5 * Math.sin(t * (8 + 18 * carga));
      for (let l = 0; l < 4; l++) {
        const livre = l === q.livre;
        const a = livre ? 0.13 + 0.05 * pulso : (0.08 + 0.12 * carga) * (0.7 + 0.3 * pulso);
        const c = livre ? COR.livre : COR.perigo;
        alvo.faixa(F[l], F[l + 1], c[0], c[1], c[2], a);
        if (!livre) for (let x = 0; x < W; x += 1) { put(x, F[l] + 1, COR.perigo, 0.25 + 0.4 * carga); put(x, F[l + 1] - 2, COR.perigo, 0.25 + 0.4 * carga); }
        else for (let x = 0; x < W; x += 3) { put(x, F[l] + 1, COR.livre, 0.55); put(x, F[l + 1] - 2, COR.livre, 0.55); }
      }
    }
  }
  // ── 3 · the fire (behind her body: it leaves the pipes' mouths and runs left) — the pixelfx plasma stream
  if (s.canos && s.canos.fase === 'fogo') {
    const q = s.canos, F = N.canos.faixas, bocas = bocasDosCanos(P, N), pin = s.pfx.camada.pintor();
    for (let l = 0; l < 4; l++) {
      if (l === q.livre) continue;
      const fim = q.k > 0.8 ? 1 - (q.k - 0.8) / 0.2 : 1;
      s.pfx.mod.fogoCanos(pin, t, { x: bocas[l].x, y: (F[l] + F[l + 1]) / 2, meia: (F[l + 1] - F[l]) / 2 - 1, alcance: bocas[l].x + 6, frente: q.frente as number, fim, semente: l * 13 + 7 });
    }
    if (s.pfx.camada.usada) {
      alvo.compoeFx(s.pfx.camada.f);
      s.pfx.camada.usada = false;
    }
  }
  for (const b of s.brasas ?? []) {
    const F = N.canos.faixas;
    for (let l = 0; l < 4; l++) {
      if (l === b.livre) continue;
      for (let i = 0; i < 90; i++) {
        const x = hash(i, l, 7) * 340, y = F[l] + 4 + hash(i, l, 9) * 46;
        const vivo = hash(i, l, 11) > b.k;
        if (vivo) put(x - b.k * 14, y, hash(i, l, 13) < 0.6 ? [255, 120, 40] : [90, 86, 90], (1 - b.k) * 0.9);
      }
    }
  }

  // ── 4 · her (out of the den): the skin, the pipes' mouths, then the head
  corpoArte(D, s, alvo, (a) => !a.toca);
  if (s.canos && s.canos.fase !== 'fecha' && s.canos.fase !== 'apaga') {
    const bocas = bocasDosCanos(P, N), q = s.canos;
    const brilho = q.fase === 'abre' ? q.k * 0.4 : q.fase === 'aviso' ? 0.4 + 0.6 * q.k : q.fase === 'fogo' ? 1 : 0.35;
    for (let l = 0; l < 4; l++) {
      const b = bocas[l];
      for (let dx = -5; dx <= 0; dx++) for (let dy = -2; dy <= 2; dy++) put(b.x + dx, b.y + dy, Math.abs(dy) === 2 ? COR.aro : [40, 40, 46]);
      if (l !== q.livre || q.fase === 'abre') for (let dy = -1; dy <= 1; dy++) put(b.x - 5, b.y + dy, COR.laranja, brilho);
    }
  }
  if (!cabecaNaToca) cabeca();

  // THE JOINT'S SEAL: near the joint, any pixel that isn't hers but has her on both sides within 3 px (across, down, or
  // on a diagonal) is a gap: it takes the darker of those two pixels, twice over
  function selaJunta(): void {
    const J = P.cabeca.pescoco, R0 = 24, Rf = 3, Hh = D.H;
    const x0 = Math.max(0, Math.floor(J.x - R0)), x1 = Math.min(W - 1, Math.ceil(J.x + R0));
    const y0 = Math.max(0, Math.floor(J.y - R0)), y1 = Math.min(Hh - 1, Math.ceil(J.y + R0));
    for (let passada = 0; passada < 2; passada++) {
      const novos: [number, number][] = [];
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          if (alvo.dela(y * W + x) || (x - J.x) ** 2 + (y - J.y) ** 2 > R0 * R0) continue;
          let melhor: number | null = null;
          for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
            const lado = (sg: number): number => {
              for (let k = 1; k <= Rf; k++) {
                const X = x + sg * dx * k, Y = y + sg * dy * k;
                if (X >= 0 && X < W && Y >= 0 && Y < Hh && alvo.dela(Y * W + X)) return Y * W + X;
              }
              return -1;
            };
            const a = lado(1), b = lado(-1);
            if (a < 0 || b < 0) continue;
            const c = alvo.lum(a) <= alvo.lum(b) ? a : b;
            if (melhor == null || alvo.lum(c) < alvo.lum(melhor)) melhor = c;
          }
          if (melhor != null) novos.push([y * W + x, melhor]);
        }
      for (const [i, j] of novos) alvo.copia(i, j);
    }
  }
  function cabeca(): void {
    if (s.semCabeca) return;
    cabecaArte(D, s, putCabeca);
    selaJunta();
  }

  // ── 5 · the geysers' columns (in front: they burst out of the crack, through the crest)
  for (const g of s.geis) {
    if (t < g.tColuna || t >= g.tFim) continue;
    const k = (t - g.tColuna) / N.geiser.coluna, y0 = D.trilha[Math.max(0, Math.min(W - 1, Math.round(g.x)))];
    const sobe = Math.min(1, k / 0.15), topo = y0 - (y0 - N.geiser.topo) * sobe, pe = y0 + 1;
    const L = N.geiser.largura / 2;
    for (let dx = -11; dx <= 11; dx++) {
      const x = Math.round(g.x + dx), abre = Math.max(0, 1 - Math.abs(dx) / 11), h = Math.round(1 + 2 * abre);
      for (let dy = -h; dy <= h; dy++) put(x, y0 + dy, Math.abs(dy) < h ? [210, 255, 225] : [20, 60, 34], Math.abs(dy) < h ? 0.9 : 0.8);
      put(x, y0 - h - 1, [120, 136, 150], 0.8 * abre); put(x, y0 + h + 1, [90, 100, 112], 0.6 * abre);
    }
    const flui = t * 170, fimK = k > 0.8 ? (k - 0.8) / 0.2 : 0;
    for (let y = Math.floor(topo); y < pe; y++) {
      const acima = y <= y0, dist = acima ? y0 - y : y - y0;
      const onda = 0.82 + 0.18 * Math.sin((y + flui) / 5 + g.x) * Math.sin((y + flui) / 13);
      const larg = (acima ? L : L * 0.7) * Math.min(1, 0.3 + dist / 12) * onda;
      if (acima && fimK > 0 && dist < fimK * (y0 - N.geiser.topo)) continue;
      for (let dx = -Math.ceil(larg); dx < larg; dx++) {
        const yf = Math.floor((y + flui) / 2), n = hash(g.x + dx, yf, 3), d = Math.abs(dx + 0.5) / larg;
        if (d > 0.86 + 0.14 * hash(yf >> 1, g.x, 5)) continue;
        if (acima && y < topo + 5 && hash(dx, y, s.f) > (y - topo) / 5) continue;
        const c = d < 0.22 ? VENENO[6] : d < 0.45 ? (n < 0.5 ? VENENO[5] : VENENO[4]) : d < 0.75 ? (n < 0.3 ? VENENO[4] : VENENO[3]) : VENENO[2];
        put(g.x + dx, y, c, acima ? 0.95 : 0.85);
        if (hash(g.x + dx, yf, 11) < 0.012) put(g.x + dx, y, VENENO[7]); // a bubble rising in it
      }
    }
    if (sobe >= 1) {
      const kk = Math.min(1, (k - 0.15) / 0.5);
      for (let i = 0; i < 9; i++) {
        const an = (i / 9) * Math.PI * 2 + t * 2, rr = 4 + 7 * kk;
        const cx = g.x + Math.cos(an) * rr * 1.3, cy = N.geiser.topo + 2 + Math.sin(an) * rr * 0.6 - 3 * kk;
        disco(cx, cy, 3 + 2.5 * kk, i % 2 ? VENENO[3] : VENENO[4], 0.55 * (1 - fimK));
      }
      disco(g.x, N.geiser.topo + 1, 4 + 3 * kk, VENENO[5], 0.5 * (1 - fimK));
    }
  }

  // ── 6 · the Echo: the trail being read, the seeds, the blasts
  if (s.eco) {
    if (s.eco.rastro)
      for (let i = 0; i < s.eco.rastro.length; i += 2) {
        const p = s.eco.rastro[i], a = 0.15 + 0.45 * (i / s.eco.rastro.length);
        put(p.x, p.y, COR.ciano, a); put(p.x + 1, p.y, COR.ciano, a * 0.5);
      }
    for (const sm of s.eco.sementes) {
      const pisca = sm.voo < 1 ? 1 : sm.falta < 0.3 ? (Math.floor(t * 20) % 2 ? 1 : 0.4) : 0.75 + 0.25 * Math.sin(t * 12 + sm.i);
      s.pfx.mod.semente(s.pfx.camada.pintor(), t, { x: sm.x, y: sm.y, r: 4.5, semente: sm.i * 17 + 3, k: pisca });
    }
    for (const x of s.eco.explosoes) {
      const r = x.k < 0.3 ? 4 + (x.r - 4) * (x.k / 0.3) : x.r;
      const a = x.k < 0.3 ? 1 : 1 - (x.k - 0.3) / 0.7;
      disco(x.x, x.y, r, x.k < 0.3 ? [230, 245, 255] : [120, 200, 255], a * 0.75);
      for (let i = 0; i < 48; i++) { const an = (i / 48) * Math.PI * 2; put(x.x + Math.cos(an) * r, x.y + Math.sin(an) * r, COR.ciano, a); }
    }
  }

  // ── 6½ · the breathers: their gas and their jets, over her
  if (s.respiros) s.respiros.desenha(put);

  // ── 7 · the particles (jets, debris, embers, steam, dust) — nothing falls: they drift and fade
  for (const p of s.particulas) {
    const a = Math.max(0, 1 - p.idade / p.vida) * (p.a ?? 1);
    if (p.pedaco) {
      const fim = p.idade / p.vida, esc = 1 - 0.55 * fim, some = fim > 0.7 ? 1 - (fim - 0.7) / 0.3 : 1;
      for (const q of p.pedaco) {
        const brasa = q.borda && q.brasa && fim < 0.7;
        put(p.x + q.dx, p.y + q.dy, brasa ? [255, 130, 50] : [q.c[0] * esc, q.c[1] * esc, q.c[2] * esc], some);
      }
    } else if (p.gota) {
      const vx = p.vx ?? 0, vy = p.vy ?? 0, v = Math.hypot(vx, vy) || 1, ux = vx / v, uy = vy / v, cauda = Math.min(5, v * 0.035), cor = p.cor as RGB;
      for (let k = 0; k <= cauda; k += 0.5) put(p.x - ux * k, p.y - uy * k, cor, a * (1 - k / (cauda + 1)));
      if (p.tam > 1) { disco(p.x, p.y, p.tam, cor, a); put(p.x - 0.5, p.y - 0.5, [255, 150, 60], a * 0.9); }
    } else if (p.anel) {
      const r = p.tam * (1 + (p.idade / p.vida) * 3);
      const n = Math.max(24, Math.round(r * 6));
      for (let i = 0; i < n; i++) { const an = (i / n) * Math.PI * 2; put(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r, p.cor as RGB, a); }
    } else if (p.tam > 1) disco(p.x, p.y, p.tam * (p.cresce ? 1 + p.idade / p.vida : 1), p.cor as RGB, a);
    else put(p.x, p.y, p.cor as RGB, a);
  }

  // ── 7½ · the pixelfx layer: the seeds above, the running instances (the implosion, the vapour), the fireball
  {
    const C = s.pfx.camada;
    for (const inst of s.pfx.vivos) { C.pintor(); inst.draw(C.f); }
    const e = s.pfx.estouro;
    if (e && t - e.t < 1.6) s.pfx.mod.bolaDeFogo(C.pintor(), t - e.t, { x: e.x, y: e.y, semente: 5 });
    if (C.usada) {
      alvo.compoeFx(C.f);
      C.usada = false;
    }
  }
}

/** the head's pixels on screen (for its undoing in the breach) — the mock's `pixelsDaCabeca` */
export function pixelsDaCabeca(D: Desenho, P: Pose, s: { mordida?: { x: number; y: number; r: number } } = {}): { x: number; y: number; c: RGB }[] {
  const { W, H, med } = D, C = P.cabeca, M = med.cabeca, out: { x: number; y: number; c: RGB }[] = [];
  for (let y = Math.floor(C.pescoco.y - 70); y <= C.pescoco.y + 70; y++)
    for (let x = Math.floor(C.pescoco.x - 70); x <= C.pescoco.x + 70; x++) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const a = telaParaCabeca(C, med, { x: x + 0.5, y: y + 0.5 }), ax = Math.floor(a.x), ay = Math.floor(a.y);
      if (ax < 0 || ay < 0 || ax >= M.w || ay >= M.h || !M.mascara[ay * M.w + ax]) continue;
      if (s.mordida && Math.hypot(ax - s.mordida.x, ay - s.mordida.y) < s.mordida.r) continue;
      const i = (ay * M.w + ax) * 4, A = D.arte.cabeca;
      out.push({ x, y, c: [A.data[i], A.data[i + 1], A.data[i + 2]] });
    }
  return out;
}
export const bocaNaTela = (P: Pose, med: Med): Ponto => cabecaParaTela(P.cabeca, med, med.cabeca.boca as Ponto);
export const olhoNaTela = (P: Pose, med: Med): Ponto => cabecaParaTela(P.cabeca, med, med.cabeca.olho as Ponto);
