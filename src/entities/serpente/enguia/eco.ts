/**
 * THE ECHO (spec §4, the clever skill; the mock's `eco.mjs` ported line by line): she reads the ship (~2 s, a faint
 * trail in her eye's colour marks the ship's last ~2 s), spits ~5 plasma seeds that fly STRAIGHT to points spaced
 * along that trail and stick, pulsing; they blow in the order the ship passed (oldest first), 0.25 s apart, radius 15.
 * Fair: the newest point is ≥ 0.4 s old when she spits; every seed is in sight ≥ 0.6 s before it blows.
 */
import type { Numeros } from './numeros.ts';
import type { Ponto } from './tipos.ts';

export interface PontoT {
  t: number;
  x: number;
  y: number;
}

/** the ship's trail, shared by the fight (one sample per frame) */
export class Trilha {
  readonly p: PontoT[] = [];
  grava(t: number, x: number, y: number): void {
    this.p.push({ t, x, y });
  }
  entre(t0: number, t1: number): PontoT[] {
    return this.p.filter((q) => q.t >= t0 - 1e-9 && q.t <= t1 + 1e-9);
  }
  /** the game keeps only the last seconds (the mock keeps the whole run) */
  esquece(antes: number): void {
    let n = 0;
    while (n < this.p.length && this.p[n].t < antes) n++;
    if (n) this.p.splice(0, n);
  }
}

/** `n` points spaced evenly along a polyline's arc, first to last (a still trail → all on the same spot) */
export function espacaNoArco(pts: PontoT[], n: number): PontoT[] {
  if (!pts.length) return [];
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const L = acc[acc.length - 1], out: PontoT[] = [];
  for (let j = 0; j < n; j++) {
    const alvo = n === 1 ? L : (L * j) / (n - 1);
    let i = 1;
    while (i < pts.length - 1 && acc[i] < alvo) i++;
    const a = pts[i - 1] ?? pts[0], b = pts[i] ?? pts[0], seg = acc[i] - acc[i - 1] || 1, k = Math.min(1, Math.max(0, (alvo - acc[i - 1]) / seg));
    out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, t: a.t + (b.t - a.t) * k });
  }
  return out;
}

export interface Semente {
  i: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  tPasso: number;
  tDetona: number;
}
export interface Rodada {
  r: number;
  ini: number;
  cospe: number;
  crava: number;
  det0: number;
  fim: number;
  sementes: Semente[] | null;
  idadeMaisNova?: number;
}
export interface EstadoEco {
  lendo: Rodada | null;
  sementes: { x: number; y: number; voo: number; i: number; falta: number }[];
  explosoes: { x: number; y: number; r: number; k: number; fere: boolean }[];
}

export class Eco {
  readonly N: Numeros;
  readonly t0: number;
  readonly leitura: number;
  readonly intervalo: number;
  readonly rodadas: Rodada[] = [];
  /** the death took the seeds (the game: nothing of hers stays on screen) */
  apagado = false;
  constructor(t0: number, N: Numeros, final = false) {
    const E = N.eco;
    this.N = N;
    this.t0 = t0;
    this.leitura = final ? E.final.leitura : E.leitura;
    this.intervalo = final ? E.final.intervalo : E.intervalo;
    const rodadas = final ? E.final.rodadas : E.rodadas;
    const dur = this.leitura + E.voo + E.vista + (E.sementes - 1) * this.intervalo + E.fere + 0.3;
    for (let r = 0; r < rodadas; r++) {
      const ini = t0 + r * (dur + E.entre), cospe = ini + this.leitura, crava = cospe + E.voo, det0 = crava + E.vista;
      this.rodadas.push({ r, ini, cospe, crava, det0, fim: ini + dur, sementes: null });
    }
  }
  /** at the spit: the seeds, from the mouth to points along the ship's last reading (newest ≥ minIdade old) */
  atualiza(t: number, trilha: Trilha, boca: Ponto): void {
    const E = this.N.eco;
    for (const r of this.rodadas)
      if (!r.sementes && t >= r.cospe) {
        const pts = trilha.entre(r.cospe - this.leitura, r.cospe - E.minIdade);
        const alvos = espacaNoArco(pts.length ? pts : [trilha.p[trilha.p.length - 1]], E.sementes);
        r.sementes = alvos.map((a, i) => ({ i, x0: boca.x, y0: boca.y, x: a.x, y: a.y, tPasso: a.t, tDetona: r.det0 + i * this.intervalo }));
        r.idadeMaisNova = r.cospe - Math.max(...alvos.map((a) => a.t));
      }
  }
  estado(t: number): EstadoEco {
    const E = this.N.eco, out: EstadoEco = { lendo: null, sementes: [], explosoes: [] };
    if (this.apagado) return out;
    for (const r of this.rodadas) {
      if (t >= r.ini && t < r.cospe) out.lendo = r;
      if (!r.sementes) continue;
      for (const s of r.sementes) {
        if (t < r.cospe) continue;
        if (t < s.tDetona) {
          const voo = Math.min(1, (t - r.cospe) / E.voo);
          out.sementes.push({ x: s.x0 + (s.x - s.x0) * voo, y: s.y0 + (s.y - s.y0) * voo, voo, i: s.i, falta: s.tDetona - t });
        } else if (t < s.tDetona + 0.35) {
          const k = (t - s.tDetona) / 0.35;
          out.explosoes.push({ x: s.x, y: s.y, r: E.raio, k, fere: t < s.tDetona + E.fere });
        }
      }
    }
    return out;
  }
  /** the spec's fairness, per round: the newest point's age at the spit, the shortest time a seed sat in sight */
  justica(): { idadeMaisNova: number | undefined; vistaMin: number; ordem: boolean; E: Numeros['eco'] }[] {
    const E = this.N.eco;
    return this.rodadas
      .filter((r) => r.sementes)
      .map((r) => {
        const ss = r.sementes as Semente[];
        return {
          idadeMaisNova: r.idadeMaisNova,
          vistaMin: Math.min(...ss.map((s) => s.tDetona - r.crava)),
          ordem: ss.every((s, i) => !i || s.tPasso >= ss[i - 1].tPasso - 1e-9),
          E,
        };
      });
  }
}
