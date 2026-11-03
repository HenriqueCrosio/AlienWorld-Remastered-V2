/**
 * THE BEAM'S GEOMETRY (the mock 1436–1453, 1473–1495, 1513–1530; rounds 8–12): the beam leaves the middle of her open
 * jaws, straight, and its far end sweeps the screen's LEFT EDGE (`yL`); her head follows it, frame by frame of the
 * PixelLab sets (`poseDe`: where the beam meets the left edge picks the frame — −10 raised, 75 the approved middle, 150
 * lowered). It stops at the hull's crest and burns the plate. The salvo's slices are drawn by the rule that every slice
 * covers the ship and leaves a way out ≤ 25 px. Pure: Node runs it (the oracle, `scripts/test-serpente-hab.mjs`).
 */
import { HAB } from './numerosHab.ts';
import { H, W } from './pixels.ts';
import type { Ponto } from './tipos';

export interface Feixe {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  bate: boolean;
}

/** a set's frames for the head raised, in the middle (the approved pose) and lowered */
export interface Faixa {
  cima: number;
  meio: number;
  baixo: number;
}

/** the open mouth for a beam whose far end is at yL (the head follows the beam) */
export type BocaPara = (yL: number) => Ponto;

const CRISTA = HAB.crista;

/** where the line from p through (x, y) meets x = 0 */
export function yBorda(p: Ponto, x: number, y: number): number {
  return p.y + ((y - p.y) * p.x) / (p.x - x);
}

/** from p towards (0, yL) */
export function angDe(p: Ponto, yL: number): number {
  return Math.atan2(yL - p.y, -p.x);
}

/** the beam from her mouth along `a`: to the left edge, or to the hull if it gets there first (it burns the plate) */
export function feixe(b: Ponto, a: number): Feixe {
  const c = Math.cos(a), s = Math.sin(a);
  let L = b.x / -c, bate = false;
  if (s > 0 && b.y + L * s > CRISTA - 1) {
    L = (CRISTA - 1 - b.y) / s;
    bate = true;
  }
  return { x0: b.x, y0: b.y, x1: b.x + c * L, y1: b.y + s * L, bate };
}

/** which frame of a set (fractional) for a left-edge y */
export function poseDe(p: Faixa, yL: number): number {
  return yL <= 75 ? p.meio - (p.meio - p.cima) * Math.min(1, (75 - yL) / 85) : p.meio + (p.baixo - p.meio) * Math.min(1, (yL - 75) / 75);
}

/** a set of `n` frames: the frame shown for a fractional position */
export function quadroDe(n: number, x: number): number {
  return Math.max(0, Math.min(n - 1, Math.round(x)));
}

/** the beam's y at column x when its far end is at yL */
function yNaColuna(yL: number, x: number, bocaPara: BocaPara): number {
  const b = bocaPara(yL);
  return b.y + ((yL - b.y) * (b.x - x)) / b.x;
}

/** the far end whose beam passes through (x, y) — solved, since the mouth moves with yL */
export function yLPara(x: number, y: number, bocaPara: BocaPara): number {
  let lo = -400, hi = 600;
  for (let k = 0; k < 50; k++) {
    const md = (lo + hi) / 2;
    if (yNaColuna(md, x, bocaPara) < y) lo = md;
    else hi = md;
  }
  return (lo + hi) / 2;
}

/**
 * The path drawn: EXACTLY where the beam will pass (its band, the tremor included, over the whole sweep, the head
 * following it); per pixel, how far into the sweep (0–1) the beam first covers it (Infinity where it never does).
 * In parts: one beam position per step of the generator (a big slice is ~400 of them, ≈ 50 ms all at once).
 */
export function* caminhoPorPartes(f: { de: number; ate: number; meia?: number }, bocaPara: BocaPara, meiaPadrao: number): Generator<undefined, Float32Array, undefined> {
  const m = (f.meia ?? meiaPadrao) + 0.6, u = new Float32Array(W * H).fill(Infinity);
  const n = Math.max(40, Math.ceil(Math.abs(f.ate - f.de) * 4));
  for (let s = 0; s <= n; s++) {
    const uu = s / n, yL = f.de + (f.ate - f.de) * uu, b = bocaPara(yL), fx = feixe(b, angDe(b, yL));
    const L = Math.hypot(fx.x1 - fx.x0, fx.y1 - fx.y0), ux = (fx.x1 - fx.x0) / L, uy = (fx.y1 - fx.y0) / L;
    for (let q = 0; q <= L; q += 0.5) for (let w = -m; w <= m; w += 0.5) {
      const x = Math.round(fx.x0 + ux * q - uy * w), y = Math.round(fx.y0 + uy * q + ux * w);
      if (x >= 0 && x < W && y >= 0 && y < H && uu < u[y * W + x]) u[y * W + x] = uu;
    }
    yield;
  }
  return u;
}

/** the whole path at once */
export function caminho(f: { de: number; ate: number; meia?: number }, bocaPara: BocaPara, meiaPadrao: number): Float32Array {
  const g = caminhoPorPartes(f, bocaPara, meiaPadrao);
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

/**
 * ONE SLICE OF THE SALVO, drawn at its own start with the ship where it is (the body of the mock's `sorteiaSalva` loop):
 * it covers the ship's centre P (it must move) with a band 26–38 px tall whose near edge is 5–12 px from P, so the way
 * out (that edge + the hitbox's half-height + 8 px) is ≤ 25 px and stays on screen; the side and the sweep's direction
 * are drawn. Four draws, in the mock's order (`d`, `h`, `sobe`, `desce`).
 */
export function sorteiaFatia(P: number, x: number, sorte: () => number, bocaPara: BocaPara): { lo: number; hi: number; de: number; ate: number; para: number } {
  const d = 5 + sorte() * 7, h = 26 + sorte() * 12, sai = d + 4.5 + 8; // 8 px of room
  let sobe = sorte() < 0.5;
  if (P - sai < 30) sobe = false;
  if (P + sai > 143) sobe = true;
  const lo = sobe ? P - d : P + d - h, hi = lo + h, Q = sobe ? P - sai : P + sai;
  const mv = HAB.raio.salva.meia * 1.05; // the thin beam's vertical half-height at this slope
  const yA = yLPara(x, lo + mv, bocaPara), yB = yLPara(x, hi - mv, bocaPara);
  const desce = sorte() < 0.5;
  return { lo, hi, de: desce ? yA : yB, ate: desce ? yB : yA, para: Q };
}

/** the beam's band (half-width `meia`) touches the box */
export function feixeNaCaixa(fx: Feixe, meia: number, esq: number, dir: number, topo: number, base: number): boolean {
  const L = Math.hypot(fx.x1 - fx.x0, fx.y1 - fx.y0);
  if (L < 1e-6 || meia <= 0) return false;
  const n = Math.ceil(L);
  for (let s = 0; s <= n; s++) {
    const x = fx.x0 + ((fx.x1 - fx.x0) * s) / n, y = fx.y0 + ((fx.y1 - fx.y0) * s) / n;
    // the band is perpendicular to the beam: distance from the box to the point ≤ meia
    const dx = Math.max(esq - x, 0, x - dir), dy = Math.max(topo - y, 0, y - base);
    if (Math.hypot(dx, dy) <= meia) return true;
  }
  return false;
}
