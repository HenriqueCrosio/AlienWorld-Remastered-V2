/**
 * THE EEL'S CHOREOGRAPHY, LIVE (plan `2026-11-08-enguia-instalacao.md`, decision 7). The mock's `roteiro.mjs` builds the
 * whole fight at once with the bites at fixed times; in the game her LIFE decides when she goes to her den. So its
 * `montaRoteiro` is cut into blocks that each end on a pause, appended as the fight gets there (the same `move` /
 * `pausa` / `prepara` / `recua`, the same order, the same numbers):
 *   chegada()                  C0: the den, the fusion's pause, the arc, out by the bottom, the post (1), its pipes
 *   mergulhoErguida(c, final)  C1: the draw-back, the dive, the hidden U-turn, the draw-back, the rise, the Echo's pause
 *   sobVolta(c)                C2: the draw-back, the sink, under the hull out and back, up hidden, the way back, the edge
 *   posto(c, canos)            C3: the post of cycle c (its coil sized for the rings she has then), and its pipes
 *   ecoFinal(c)                another final Echo where she stands (alive after the last one)
 *   morte()                    the death: back down her path, stuck, undone, the rest sinks, the end
 *   cortaCanos(rel) / corta(t) the running pause ends early (the pipes at 5 %, the Echo at her death)
 * Appended in the mock's order, the blocks give its path, legs, roll and tells exactly (the oracle). The roll and the
 * tells are worked out per block: the roll's backward pass (an undecided run shows the side of the NEXT decided turn)
 * is redone from the new end back into the old path while the old samples are undecided.
 * Waypoints are the SNOUT's; `s(t)` is analytic, so the looks ahead (the snaps, the breaths) work on what is built.
 */
import { Caminho } from './caminho.ts';
import type { Numeros } from './numeros.ts';
import type { Estado, Med, Roteiro, Sinal, Trecho } from './tipos.ts';

type P2 = [number, number];

// a move's duration and position: cruising at v, with smooth (cosine-shaped) pushes of `a` s at the rest ends
function perfil(L: number, v: number, a: number, para0: boolean, para1: boolean): { D: number; pos: (t: number) => number } {
  const n = (para0 ? 1 : 0) + (para1 ? 1 : 0);
  if (L <= 0) return { D: 0, pos: () => 0 };
  if (n && L < ((v * a * n) / 2) * 1.2) { // too short for full pushes: one cosine ease
    const D = (L / v) * 1.6;
    return { D, pos: (t) => (L * (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t / D))))) / 2 };
  }
  const D = L / v + (a / 2) * n;
  const rampa = (u: number): number => v * (u / 2 - (a / (2 * Math.PI)) * Math.sin((Math.PI * u) / a));
  return {
    D,
    pos: (t) => {
      t = Math.min(D, Math.max(0, t));
      const ta = para0 ? a : 0, tb = para1 ? D - a : D;
      if (t < ta) return rampa(t);
      let s = para0 ? (v * a) / 2 : 0;
      if (t < tb) return s + v * (t - ta);
      s += v * (tb - ta);
      const u = t - tb;
      return s + (v * a) / 2 - rampa(a - u);
    },
  };
}

// the eco pause's length: per round the reading, the flight, the seeds in sight, the chain, the last blast
export const duracaoEco = (E: Numeros['eco'], final = false): number => {
  const leitura = final ? E.final.leitura : E.leitura, intervalo = final ? E.final.intervalo : E.intervalo;
  const rodadas = final ? E.final.rodadas : E.rodadas;
  const r = leitura + E.voo + E.vista + (E.sementes - 1) * intervalo + E.fere + 0.3;
  return rodadas * r + (rodadas - 1) * E.entre;
};
// the pipes pause: the pipes open, three salvos (warning + front + burn), `entre` between, the embers
export const duracaoCanos = (C: Numeros['canos']): number => C.antes + C.aviso.reduce((a, b) => a + b, 0) + 3 * (C.frente + C.queima) + 2 * C.entre + C.brasa;
// where the mock's 5% bite cuts the third cycle's pipes: after the 2nd salvo's burn
export const corteCanos = (C: Numeros['canos']): number => C.antes + C.aviso[0] + C.aviso[1] + 2 * (C.frente + C.queima) + C.entre;

// the post (the trick): up the right edge, out by the top-right corner, coiled off the canvas, back down with the head;
// the coil is ELASTIC (`h`), solved for the rings she still has
const postoPontos = (h: number): P2[] => {
  const topo = -12 - h, cx = 347, R = 25;
  const arco = [0.25, 0.5, 0.75].map((k) => [Math.round(cx + R * Math.cos(Math.PI * k)), Math.round(topo - R * Math.sin(Math.PI * k))] as P2);
  return [[372, 180], [372, 96], [372, 30], [372, topo], ...arco, [322, topo], [322, Math.max(topo + 8, -4)], [318, 16], [300, 30], [262, 38]];
};
// how far down the body must reach: the stump after a bite, or where the tail gets thin (radius < 16 px)
export function alcanceNoPosto(N: Numeros, med: Med, nAneis: number): number {
  const comp = nAneis * N.corpo.passo;
  if (nAneis < N.corpo.aneis) return N.corpo.cabeca + comp - 4;
  let u = comp;
  while (u > 0 && med.raioU(u) < 16) u -= 2;
  return N.corpo.cabeca + u;
}
function resolvePosto(alcance: number, dirEntrada: P2): number {
  const cabe = (h: number): boolean => {
    const c = new Caminho([372, 620]);
    c.dir = dirEntrada;
    c.junta(postoPontos(h));
    return c.ponto(c.L - alcance).y >= 236;
  };
  let lo = 0, hi = 220;
  if (!cabe(lo)) return lo;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (cabe(m)) lo = m;
    else hi = m;
  }
  return lo;
}

export interface OpcoesVivo {
  /** the rings the post's coil is sized for, when the post of cycle `c` is built */
  aneisNoPosto: (ciclo: number) => number;
}

interface OpcMove {
  para0?: boolean;
  para1?: boolean;
  onda?: boolean;
  vIni?: number | null;
  ciclo?: number;
  emerge?: boolean;
  sob?: 'ida' | 'volta';
  hab?: Trecho['hab'];
}

export class RoteiroVivo implements Roteiro {
  readonly N: Numeros;
  readonly med: Med;
  readonly opc: OpcoesVivo;
  readonly caminho: Caminho;
  readonly trechos: Trecho[] = [];
  readonly sinais: Sinal[] = [];
  readonly postos: { ciclo: number; aneis: number; h: number }[] = [];
  readonly CORPO: number;
  /** the time the last built stretch ends */
  T = 0;
  private sRecuo: number | null = null;
  private lado = new Uint8Array(1024);
  private rolagem = new Float32Array(1024);
  /** the path length the roll was last worked out for */
  private Lrola = -1;
  private readonly FUNDO: number;

  constructor(N: Numeros, med: Med, opc: OpcoesVivo) {
    this.N = N;
    this.med = med;
    this.opc = opc;
    this.CORPO = N.corpo.cabeca + N.corpo.aneis * N.corpo.passo;
    this.FUNDO = 216 + this.CORPO + 40; // the snout this deep = the whole body below the screen
    this.caminho = new Caminho([300, 216 + this.CORPO + 260]);
  }

  // ─── the mock's builders (roteiro.mjs 102–148) ───
  private s(): number {
    return this.sRecuo ?? this.caminho.L;
  }
  private pausa(nome: string, cap: string, dur: number, extra: Partial<Trecho> = {}): void {
    this.trechos.push({ nome, cap, tipo: 'pausa', t0: this.T, t1: this.T + dur, s0: this.s(), s1: this.s(), ...extra });
    this.T += dur;
  }
  private move(nome: string, cap: string, pontos: P2[], v: number, { para0 = false, para1 = false, onda = false, vIni = null, ...extra }: OpcMove = {}): void {
    const [s0, s1] = this.caminho.junta(pontos, { onda: onda ? this.N.onda : null, calma0: para0, calma1: para1 });
    let p = perfil(s1 - s0, v, this.N.vel.rampa, para0, para1);
    if (vIni != null) {
      const L = s1 - s0, D = (2 * L) / (vIni + v), vi = vIni;
      p = {
        D,
        pos: (tt) => {
          tt = Math.min(D, Math.max(0, tt));
          return vi * tt + ((v - vi) * tt * tt) / (2 * D);
        },
      };
    }
    this.trechos.push({ nome, cap, tipo: 'move', t0: this.T, t1: this.T + p.D, s0, s1, pos: p.pos, ...extra });
    this.T += p.D;
  }
  private recua(nome: string, cap: string, ate: number, v: number, extra: Partial<Trecho> = {}): number {
    const s0 = this.s(), p = perfil(s0 - ate, v, this.N.vel.rampa, true, true);
    this.trechos.push({ nome, cap, tipo: 'move', t0: this.T, t1: this.T + p.D, s0, s1: ate, pos: p.pos, recua: true, ...extra });
    this.T += p.D;
    this.sRecuo = ate;
    return ate;
  }
  private prepara(cap: string, ciclo: number): void {
    this.pausa('prepara', cap, this.N.prepara.dur, { prepara: true, ciclo });
  }
  private POSTO(c: number): P2[] {
    const aneis = this.opc.aneisNoPosto(c);
    const h = resolvePosto(alcanceNoPosto(this.N, this.med, aneis), [0, -1]);
    this.postos.push({ ciclo: c, aneis, h });
    return postoPontos(h);
  }

  // ─── the blocks ───
  /** C0 (the mock 150–171, and the first cycle's pipes) */
  chegada(): void {
    const i0 = this.trechos.length, N = this.N, V = N.vel;
    this.caminho.junta([[300, 300]]); // the prologue: the whole body hidden in the den (no time passes)
    this.pausa('fusao', 'chegada', 1.6, { hab: 'fusao' });
    this.move('arco', 'chegada', [[300, 150], [288, 72], [252, 38], [196, 26], [158, 30]], V.chegada, { onda: true, emerge: true });
    this.move('arco-curva', 'chegada', [[126, 44], [102, 66], [88, 96], [82, 128]], 100, { vIni: V.chegada });
    this.move('arco-desce', 'chegada', [[86, 168], [96, 214], [108, 262]], V.chegada, { vIni: 100 });
    this.move('arco-fora', 'chegada', [[150, 330], [260, 360], [350, 330], [372, 262]], V.chegada);
    this.move('posto', 'chegada', this.POSTO(1), V.chegada, { para1: true });
    this.canos(1);
    this.depois(i0);
  }
  private canos(c: number): void {
    this.pausa('canos', 'canos', duracaoCanos(this.N.canos), { hab: 'canos', ciclo: c, corte: null });
  }
  /** C1 (the mock 177–188) */
  mergulhoErguida(c: number, final: boolean): void {
    const i0 = this.trechos.length, N = this.N, V = N.vel, FUNDO = this.FUNDO;
    this.prepara('mergulho', c);
    this.move('mergulho', 'mergulho', [[226, 50], [198, 74], [192, 104], [210, 130], [244, 154], [276, 182], [290, 216], [294, 300]], V.passagem, { para0: true, onda: true, ciclo: c });
    this.move('mergulho-cauda', 'mergulho', [[294, FUNDO]], V.passagem, { para1: true, ciclo: c });
    this.move('volta-escondida', 'mergulho', [[296, FUNDO + 40], [312, FUNDO], [312, 300]], V.escondido, { para1: true, ciclo: c });
    this.prepara('erguida', c);
    this.move('erguida', 'erguida', [[312, 216], [312, 92], [305, 52], [282, 34], [240, 30]], V.rombo, { para0: true, para1: true, onda: true, ciclo: c, emerge: true });
    this.pausa('eco', 'erguida', duracaoEco(N.eco, final), { hab: 'eco', ciclo: c, final });
    this.depois(i0);
  }
  /** C2 (the mock 190–200) */
  sobVolta(c: number): void {
    const i0 = this.trechos.length, N = this.N, V = N.vel, FUNDO = this.FUNDO;
    this.prepara('sob', c);
    this.move('afunda', 'sob', [[222, 38], [212, 62], [214, 96], [232, 128], [256, 160], [272, 190], [278, 216], [278, FUNDO]], V.afunda, { para0: true, ciclo: c });
    this.move('sob-ida', 'sob', [[262, FUNDO + 26], [230, FUNDO + 36], [N.geiser.fim, FUNDO + 36]], V.sob, { ciclo: c, sob: 'ida' });
    this.move('sob-volta', 'sob', [[N.geiser.fim - 18, FUNDO + 48], [N.geiser.fim, FUNDO + 60], [300, FUNDO + 60]], V.sob, { ciclo: c, sob: 'volta' });
    this.move('sobe-escondida', 'volta', [[306, FUNDO + 30], [306, 300]], V.escondido, { ciclo: c });
    this.move('volta', 'volta', [[306, 216], [306, 150], [320, 122], [342, 128], [350, 170], [352, 216], [350, 330], [362, 400], [374, 330]], V.passagem, { onda: true, ciclo: c, emerge: true });
    this.move('volta-borda', 'volta', [[372, 216]], V.passagem, { ciclo: c });
    this.depois(i0);
  }
  /** C3 (the mock 201): the post of cycle `c` (after the way back of cycle c − 1), and its pipes unless `canos` false */
  posto(c: number, canos = true): void {
    const i0 = this.trechos.length;
    this.move('posto', 'volta', this.POSTO(c), this.N.vel.passagem, { para1: true, ciclo: c - 1 });
    if (canos) this.canos(c);
    this.depois(i0);
  }
  /** another final Echo where she stands */
  ecoFinal(c: number): void {
    const i0 = this.trechos.length;
    this.pausa('eco', 'erguida', duracaoEco(this.N.eco, true), { hab: 'eco', ciclo: c, final: true });
    this.depois(i0);
  }
  /** the death (the mock 206–216) */
  morte(): void {
    const i0 = this.trechos.length, N = this.N, cam = this.caminho;
    let alvo = this.s();
    for (let q = this.s(); q > 0; q -= 1) {
      const p = cam.ponto(q - N.corpo.cabeca);
      if (p.y >= 168) { alvo = q; break; }
    }
    this.recua('afunda-morte', 'morte', alvo, N.vel.recua);
    this.pausa('presa', 'morte', 0.9, { hab: 'presa' });
    this.pausa('desfaz', 'morte', 1.8, { hab: 'desfaz' });
    this.recua('resto', 'morte', alvo - 320, 180, { hab: 'resto' });
    this.pausa('fim', 'morte', 1.8, { hab: 'fim' });
    this.depois(i0);
  }
  /** the running pause (the last one built) ends at t */
  corta(t: number): void {
    const tr = this.trechos[this.trechos.length - 1];
    if (tr.tipo !== 'pausa') return;
    tr.t1 = Math.max(tr.t0, t);
    this.T = tr.t1;
  }
  /** the pipes' pause cut `rel` s after it started: the fire fades for 0.3 s (the mock's `corte`) */
  cortaCanos(rel: number): void {
    const tr = this.trechos[this.trechos.length - 1];
    if (tr.hab !== 'canos') return;
    tr.corte = rel;
    this.corta(tr.t0 + (rel + 0.3)); // (the mock's own float order: `t + dur`, dur = corte + 0.3)
  }
  /** the stretch running at t is the last one built, and it is over */
  noFim(t: number): boolean {
    return t >= this.T;
  }
  get ultimo(): Trecho {
    return this.trechos[this.trechos.length - 1];
  }

  // ─── the mock's state (218–227) ───
  estado(tq: number): Estado {
    const trechos = this.trechos;
    let lo = 0, hi = trechos.length - 1;
    if (tq <= 0) return { s: trechos[0].s0, trecho: trechos[0], tl: 0 };
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (trechos[m].t0 <= tq) lo = m;
      else hi = m - 1;
    }
    const tr = trechos[lo], tl = Math.min(tq, tr.t1) - tr.t0;
    let sq = tr.s0;
    if (tr.tipo === 'move') sq = tr.recua ? tr.s0 - (tr.pos as (t: number) => number)(tl) : tr.s0 + (tr.pos as (t: number) => number)(tl);
    return { s: sq, trecho: tr, tl };
  }

  rola(q: number): number {
    return this.rolagem[Math.min(this.caminho.L, Math.max(0, Math.round(q)))];
  }

  // ─── after each block: the tells of its emerging legs, the roll of its new path ───
  private depois(i0: number): void {
    const N = this.N, cam = this.caminho;
    const naTela = (p: { x: number; y: number }): boolean => p.x >= 0 && p.x < N.tela.W && p.y >= 0 && p.y < N.tela.H;
    for (let i = i0; i < this.trechos.length; i++) {
      const tr = this.trechos[i];
      if (!tr.emerge) continue;
      for (let tq = tr.t0; tq < tr.t1; tq += 1 / 240) {
        const p = cam.ponto(this.estado(tq).s);
        if (naTela(p)) {
          if (p.x >= N.rombo.x0 - 20 && p.x <= N.rombo.x1 + 20) this.sinais.push({ t0: tq - N.prepara.dur, t1: tq, x: p.x });
          break;
        }
      }
    }
    this.rolar();
  }

  /** the mock's roll (241–272), worked out for the path appended since the last time */
  private rolar(): void {
    const cam = this.caminho, L = cam.L;
    if (L === this.Lrola) return;
    if (this.lado.length < L + 1) {
      let n = this.lado.length;
      while (n < L + 1) n *= 2;
      const lado = new Uint8Array(n), rol = new Float32Array(n);
      lado.set(this.lado);
      rol.set(this.rolagem);
      this.lado = lado;
      this.rolagem = rol;
    }
    const lado = this.lado, velho = this.Lrola;
    // the backward pass, from the new end (m = 0, as the mock at the path's end), down into the old path while the old
    // samples are undecided (and over the few whose heading the new path changed: `rumo` looks ±6 px)
    let m = 0, menor = 0;
    for (let q = L; q >= 0; q--) {
      const d = cam.rumo(q);
      const decidido = d.x > 0.66 || d.x < -0.66;
      if (d.x > 0.66) m = 1;
      else if (d.x < -0.66) m = 0;
      if (velho >= 0 && q < velho - 8 && decidido && lado[q] === m) { menor = q; break; }
      lado[q] = m;
      menor = q;
    }
    const J = 40, rol = this.rolagem;
    const at = (k: number): number => lado[Math.min(L, Math.max(0, k))];
    const q0 = Math.max(0, menor - J - 1);
    let soma = 0;
    for (let q = q0 - J; q <= q0 + J; q++) soma += at(q);
    for (let q = q0; q <= L; q++) {
      rol[q] = (Math.PI * soma) / (2 * J + 1);
      soma += at(q + J + 1) - at(q - J);
    }
    this.Lrola = L;
  }
}
