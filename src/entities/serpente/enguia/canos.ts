/**
 * THE FIRE PIPES (spec §3, his design; the mock's `canos.mjs` ported line by line): 4 lanes of 54 px, a salvo of 3 —
 * the free lane bluish-white, the others warning red while the pipes charge, then the jets cross the whole screen right
 * to left (a fast front, the burn, the embers). The free lane is drawn by rule at each warning's start: never the
 * ship's; 2nd within 2 lanes of it; 3rd the neighbour.
 */
import type { Numeros } from './numeros.ts';
import type { Pose } from './tipos.ts';

export const faixaDe = (y: number, _N?: Numeros): number => Math.min(3, Math.max(0, Math.floor(y / 54)));

export function sorteiaLivre(n: number, faixaNave: number, rnd: () => number): number {
  const c = [0, 1, 2, 3].filter((f) => f !== faixaNave && (n === 0 || (n === 1 ? Math.abs(f - faixaNave) <= 2 : Math.abs(f - faixaNave) === 1)));
  return c[Math.min(c.length - 1, Math.floor(rnd() * c.length))];
}

export interface Salva {
  i: number;
  tAviso: number;
  tFogo: number;
  tFim: number;
  livre: number | null;
  daNave?: number;
}

export type FaseCanos = 'abre' | 'aviso' | 'fogo' | 'brasa' | 'entre' | 'apaga' | 'fecha';
export interface EstadoCanos {
  fase: FaseCanos;
  k: number;
  i?: number;
  livre?: number | null;
  frente?: number;
}

export class Canos {
  readonly t0: number;
  readonly N: Numeros;
  readonly rnd: () => number;
  corte: number | null;
  readonly salvas: Salva[] = [];
  constructor(t0: number, N: Numeros, rnd: () => number, corte: number | null = null) {
    const C = N.canos;
    this.t0 = t0;
    this.N = N;
    this.rnd = rnd;
    this.corte = corte;
    let r = C.antes;
    for (let i = 0; i < 3; i++) {
      // (the mock's key order: `tFim` comes last — the oracle compares the objects as JSON)
      const s = { i, tAviso: r, tFogo: r + C.aviso[i], livre: null } as unknown as Salva;
      s.tFim = s.tFogo + C.frente + C.queima;
      this.salvas.push(s);
      r = s.tFim + C.entre;
    }
  }
  /** draws each salvo's free lane when its warning starts (the ship's lane at that moment) */
  atualiza(t: number, naveY: number): void {
    const rel = t - this.t0;
    for (const s of this.salvas)
      if (s.livre == null && rel >= s.tAviso && !(this.corte != null && s.tAviso >= this.corte)) {
        s.daNave = faixaDe(naveY, this.N);
        s.livre = sorteiaLivre(s.i, s.daNave, this.rnd);
      }
  }
  estado(t: number): EstadoCanos | null {
    const C = this.N.canos, rel = t - this.t0;
    if (rel < 0) return null;
    if (this.corte != null && rel >= this.corte) return { fase: 'apaga', k: Math.min(1, (rel - this.corte) / 0.3), i: 1, livre: this.salvas[1].livre };
    if (rel < C.antes) return { fase: 'abre', k: rel / C.antes };
    for (const s of this.salvas) {
      if (rel < s.tAviso) return { fase: 'entre', i: s.i - 1, k: 0 };
      if (rel < s.tFogo) return { fase: 'aviso', i: s.i, livre: s.livre, k: (rel - s.tAviso) / (s.tFogo - s.tAviso) };
      if (rel < s.tFim) return { fase: 'fogo', i: s.i, livre: s.livre, k: (rel - s.tFogo) / (s.tFim - s.tFogo), frente: Math.min(1, (rel - s.tFogo) / C.frente) };
    }
    const u = this.salvas[2];
    return rel < u.tFim + C.brasa ? { fase: 'brasa', i: 2, livre: u.livre, k: (rel - u.tFim) / C.brasa } : { fase: 'fecha', k: 1 };
  }
  /** the embers of the last salvo still glowing while the next warns (looks only) */
  brasas(t: number): { livre: number; k: number }[] {
    const rel = t - this.t0, out: { livre: number; k: number }[] = [];
    for (const s of this.salvas) if (rel >= s.tFim && rel < s.tFim + this.N.canos.brasa && s.livre != null) out.push({ livre: s.livre, k: (rel - s.tFim) / this.N.canos.brasa });
    return out;
  }
}

export interface Boca {
  x: number;
  y: number;
  anel: number;
}

/** where each lane's pipe opens on her body: the leftmost edge of her rings in that lane (the post: down the right edge) */
export function bocasDosCanos(P: Pose, N: Numeros): Boca[] {
  const F = N.canos.faixas, out: Boca[] = [];
  for (let f = 0; f < 4; f++) {
    const mid = (F[f] + F[f + 1]) / 2;
    let melhor: Pose['aneis'][number] | null = null;
    for (const a of P.aneis) if (a.y >= F[f] - 6 && a.y < F[f + 1] + 6 && a.x < N.tela.W + 10) if (!melhor || Math.abs(a.y - mid) < Math.abs(melhor.y - mid)) melhor = a;
    out.push(melhor ? { x: melhor.x - melhor.r + 2, y: Math.min(F[f + 1] - 8, Math.max(F[f] + 8, melhor.y)), anel: melhor.k } : { x: 352, y: mid, anel: -1 });
  }
  return out;
}
