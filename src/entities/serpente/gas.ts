/**
 * THE GAS + SPARK (spec §3.4; the mock's `gas`, rounds 5–7 and 13 — lines 489–531, 808–906, 1007–1391, ported with
 * the plan's R1–R8). His design (31/10 → 02/11):
 *  - the green BREATHES the gas out of her open jaws, down, in a fan that sways and comes in puffs; in vacuum it keeps
 *    its direction and spreads along the hull into a low bank in front of her (it carries its own oxidizer);
 *  - the orange charges 2.5 s (its mouth glows and crackles, it draws back trembling) and STRIKES a pocket of the
 *    breath from behind: the pocket's blast throws burning jelly at the ship — THE THREE DODGES, in turn: the fan (one
 *    blob torn across into three: step out of the line), the rails (two blobs above and below, torn along: hold still),
 *    the file (three blobs in rhythm: keep moving). The pieces drip only off their backs;
 *  - the ship's shots THROUGH the gas heat a small round of it (the subtle hint) and the THERMOMETER: full, the flame
 *    runs back up the breath into the green's mouth and the gas in front of it is thrown into the faces — burning jelly
 *    sticks there (THE COUNTER: `HAB.contra` of the form's HP, once), and the three flinch (`encolhe`);
 *  - with INCENDIÁRIO (the card) it lights at the first touch, and the thermometer catches fire and bursts.
 * Only the burning jelly hurts (spec §3.4); the thin gas on the ship's side only flashes.
 *
 * Her heads move only through the PixelLab sets (`corpo.tocador`), never in code. Pure enough for Node: the oracle runs
 * it against the approved mock's three logs (`scripts/_serpente/_oraculo.mjs`).
 */
import { CONJUNTOS, type ChaveConjunto } from './gestosHab.ts';
import { Geleias, contorno, raioDe } from './geleia.ts';
import type { CorpoSerpente, Habilidade } from './habilidade';
import { HAB, chance, gerador, porQuadro } from './numerosHab.ts';
import { Particulas } from './particulas.ts';
import { H, W } from './pixels.ts';
import { Termometro, type Estouro } from './termometro.ts';
import type { Cor, Ponto, Put, RGB } from './tipos';

const G = HAB.gas, MOV = G.mov, CRISTA = HAB.crista, BAYER = HAB.cores.BAYER;
/** the gas's grid: 2-px cells */
const GC = 2, GW = Math.ceil(W / GC), GH = Math.ceil(H / GC);

type NomeCab = keyof typeof HAB.conjuntos.gas.A;
/** one blob of a strike, when it is not just px above/below the ship: its own aim (`rente`: along the hull, at the
 * ship's column) and its own size, speed and tear */
interface AlvoGolpe {
  readonly dy?: number;
  readonly rente?: boolean;
  /** an absolute screen row at the ship's column (under the crest: the band where a ship hides) */
  readonly y?: number;
  /** it crosses the hull's crest instead of splatting on it (the hull lies in the background) */
  readonly cruza?: boolean;
  readonly R?: number;
  readonly v?: number;
  readonly corte?: 'atravessa' | 'aoLongo';
  readonly tRacha?: number;
}
interface Golpe {
  readonly dt: number;
  readonly alvos: readonly (number | AlvoGolpe)[];
  readonly R: number;
  readonly v: number;
  readonly corte: 'atravessa' | 'aoLongo';
  readonly tRacha?: number;
}
interface Ataque {
  tf: number;
  tc: number;
  golpes: number[];
  ult: number;
  fim: number;
}
interface Ignicao {
  x: number;
  y: number;
  t0: number;
  origem: string;
  caras: { cor: Cor; d: number; feito: boolean }[];
  R?: number;
}
interface Wisp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  idade: number;
  vida: number;
  giro: number;
  comido?: boolean;
}
interface Solto {
  x: number;
  y: number;
  vx: number;
  vy: number;
  idade: number;
  vida: number;
  r0?: number;
}
interface Rasteja {
  pts: [number, number][];
  idade: number;
  vida: number;
  forte?: boolean;
}
/** a player's shot followed through the gas (its thickest gas, where, counted) */
interface Seguida {
  dmax: number;
  ox: number;
  oy: number;
  contada: boolean;
  ultimoX: number;
}
/** what the gas reads of a player's shot */
interface Bala {
  readonly x: number;
  readonly y: number;
  readonly active: boolean;
}

const celula = (x: number, y: number): number => {
  const cx = Math.floor(x / GC), cy = Math.floor(y / GC);
  return cx < 0 || cy < 0 || cx >= GW || cy >= GH ? -1 : cy * GW + cx;
};

function linha(put: Put, x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
}

/** a burst: a white flash, the orange body thinning out (dithered), a red ring; with `ang` it leans along it (the mock
 * 1157–1175) */
function estouroDesenha(put: Put, e: Estouro, t: number): void {
  const a = t - e.t0, f = a / (e.dur ?? 0.34);
  if (f >= 1) return;
  if (e.onda && a < 0.2) { // the shock: a thin bright ring running out past the fire
    const ro = e.R * (0.5 + 1.1 * (a / 0.2));
    for (let q = 0; q < 6.283; q += 0.6 / ro) put(e.x + Math.cos(q) * ro, e.y + Math.sin(q) * ro, [255, 226, 170], 0.75 * (1 - a / 0.2));
  }
  const r = e.R * (0.35 + 0.65 * Math.sqrt(f)), ca = e.ang !== undefined ? Math.cos(e.ang) : 0, sa = e.ang !== undefined ? Math.sin(e.ang) : 0;
  for (let dy = -Math.ceil(r) - 1; dy <= Math.ceil(r) + 1; dy++) for (let dx = -Math.ceil(r) - 1; dx <= Math.ceil(r) + 1; dx++) {
    const d = Math.hypot(dx, dy);
    if (d > r + 0.6) continue;
    if (e.ang !== undefined && d > r * 0.4 && (dx * ca + dy * sa) / (d || 1) < -0.15) continue; // the back half stays tight
    const lim = BAYER[((e.y + dy) & 3) * 4 + ((e.x + dx) & 3)] / 16;
    if (a < 0.07 && d < r * 0.65) put(e.x + dx, e.y + dy, d < r * 0.35 ? [255, 255, 250] : [255, 236, 180]);
    else if (d < r * (1 - 0.15 * f)) {
      if (lim < 1 - f) put(e.x + dx, e.y + dy, d < r * 0.45 * (1 - f) ? [255, 230, 170] : [255, 146, 54], 0.9);
    } else if (Math.abs(d - r) < 0.8) put(e.x + dx, e.y + dy, [200, 70, 36], 1 - f);
  }
}

export class Gas implements Habilidade {
  readonly nome = 'gas' as const;
  /** the skill's clock (the mock's `t`: the green's jaws start opening at `tAbre`, one idle cycle in) */
  t = 0;
  private tq = 0;
  /** the dice seeds: random in the game; the oracle sets the mock's 7 and 99 before `comecar` */
  sementes: [number, number] | null = null;
  private acaso: () => number = Math.random;
  private visual: () => number = Math.random;
  private p = new Particulas(Math.random);
  termo = new Termometro(Math.random);
  geleias!: Geleias;
  private nuvem: Wisp[] = [];
  private readonly dens = new Float32Array(GW * GH);
  private readonly densB = new Float32Array(GW * GH);
  private readonly calor = new Float32Array(GW * GH);
  private readonly queima = new Float32Array(GW * GH).fill(-1);
  private readonly queimaN = new Float32Array(GW * GH);
  private ignicoes: Ignicao[] = [];
  private arcos: { x0: number; y0: number; x1: number; y1: number; t0: number; seg?: number }[] = [];
  private estouros: Estouro[] = [];
  private agenda: { t: number; gp: Golpe; feito: boolean }[] = [];
  /** the strikes' times (the orange's flash) */
  private clarao: number[] = [];
  private respingos: { t: number; para: Cor; feito: boolean }[] = [];
  private feitas: boolean[] = [];
  /** the flame ran back at her (the counter or the card) */
  engasgou = false;
  private tEngasgo = Infinity;
  private tGruda = Infinity;
  private tinta = 0;
  private sacode = 0;
  private pufAgora = -1;
  private carta = false;
  private contraDado = false;
  private readonly seguidas = new Map<Bala, Seguida>();
  private fxg = { luzV: 0, luzL: 0, desc: 0, kick: -9, rasteja: [] as Rasteja[], fumo: [] as Solto[], resto: [] as Solto[] };
  /** her heads now: the set and frame shown (null = the idle) */
  private cab: { nome: NomeCab; i: number } | null = null;
  private abortaDe: number | null = null;
  private mostrando = false;
  private forma: 'A' | 'B' = 'A';
  ataques: Ataque[] = [];
  tAbre = 0;
  private tFecha = 0;
  tVolta = 0;
  private livres: [number, number][] = [];
  private abortado = false;
  private tAborto = 0;
  private readonly corpo: CorpoSerpente;

  // (no parameter property: Node runs this module, stripping types only — the oracle)
  constructor(corpo: CorpoSerpente) {
    this.corpo = corpo;
    this.geleias = this.novasGeleias();
  }

  private novasGeleias(): Geleias {
    return new Geleias(this.acaso, this.visual, {
      particulas: this.p,
      estouros: this.estouros,
      boca: (cor) => this.corpo.boca(cor),
      grudou: (t) => {
        this.tinta = 1;
        this.sacode = Math.max(this.sacode, 1);
        // she is knocked back by her own flinch (the PixelLab `encolhe`, from the first face hit), not a code spring
        this.tGruda = Math.min(this.tGruda, t);
      },
    });
  }

  /** the skill ends: back to the idle (the counter: once the flinch is over) */
  private get fim(): number {
    if (!this.engasgou) return this.tVolta;
    return Number.isFinite(this.tGruda) ? this.tGruda + MOV.encolhe : this.tEngasgo + 3;
  }

  get viva(): boolean {
    if (this.abortado) return this.tAborto < HAB.aborta;
    return this.t < this.fim || this.geleias.lista.length > 0;
  }

  /** the breath still thinning, the thermometer fading, the last sparks (the boss keeps drawing them) */
  get restos(): boolean {
    if (this.abortado) return false;
    return this.nuvem.length > 0 || !this.p.vazio || this.estouros.length > 0 || this.termo.visivel || this.fxg.fumo.length > 0 || this.fxg.resto.length > 0;
  }

  comecar(): void {
    const [s1, s2] = this.sementes ?? [Math.floor(Math.random() * 2 ** 31), Math.floor(Math.random() * 2 ** 31)];
    this.acaso = gerador(s1);
    this.visual = gerador(s2);
    this.p = new Particulas(this.acaso);
    this.termo = new Termometro(this.acaso);
    this.nuvem = [];
    this.dens.fill(0);
    this.densB.fill(0);
    this.calor.fill(0);
    this.queima.fill(-1);
    this.queimaN.fill(0);
    this.ignicoes = [];
    this.arcos = [];
    this.estouros = [];
    this.agenda = [];
    this.clarao = [];
    this.respingos = [];
    this.feitas = G.faiscas.map(() => false);
    this.engasgou = false;
    this.tEngasgo = Infinity;
    this.tGruda = Infinity;
    this.tinta = 0;
    this.sacode = 0;
    this.pufAgora = -1;
    this.carta = this.corpo.incendiario();
    this.contraDado = false;
    this.seguidas.clear();
    this.fxg = { luzV: 0, luzL: 0, desc: 0, kick: -9, rasteja: [], fumo: [], resto: [] };
    this.cab = null;
    this.abortaDe = null;
    this.mostrando = false;
    this.abortado = false;
    this.tAborto = 0;
    this.geleias = this.novasGeleias();
    // the timeline (the mock 1264–1272): each strike's charge and pecks; the green opens, pours, closes
    this.forma = this.corpo.forma === 'B' ? 'B' : 'A';
    this.ataques = G.faiscas.map((tf, i) => {
      const golpes = this.padrao(i).map((gp) => tf + gp.dt);
      const ult = golpes[golpes.length - 1];
      return { tf, tc: tf - G.carga, golpes, ult, fim: ult + MOV.pico + MOV.volta + MOV.relaxa };
    });
    this.tAbre = G.sopro[0] - MOV.abre;
    this.tFecha = Math.max(G.sopro[1], this.ataques[this.ataques.length - 1].fim);
    this.tVolta = this.tFecha + MOV.fecha;
    // the windows where neither the orange nor the opening/closing plays: the green's neck pumps there
    this.livres = [[G.sopro[0], this.ataques[0].tc], ...this.ataques.slice(0, -1).map((A, i): [number, number] => [A.fim, this.ataques[i + 1].tc])];
    // the jaws open as the idle comes back to its frame 0: one idle cycle after the start (which is on its frame 0)
    this.t = this.tAbre - HAB.cicloIdle;
    this.tq = this.t;
  }

  update(dt: number): void {
    this.passo(this.t, dt);
    this.tq = this.t;
    this.t += dt;
  }

  // ─── her heads: the sets, through the facade ───

  private chave(nome: NomeCab): ChaveConjunto {
    return HAB.conjuntos.gas[this.forma][nome];
  }

  /** the last frame of a set */
  private n(nome: NomeCab): number {
    return CONJUNTOS[this.chave(nome)].quadros - 1;
  }

  private q(nome: NomeCab, x: number): { nome: NomeCab; i: number } {
    return { nome, i: Math.max(0, Math.min(this.n(nome), Math.round(x))) };
  }

  /** the mock's `gasCabPasso` (1273–1309): which frame, on the skill's own clock */
  private cabPasso(t: number): void {
    this.cab = this.cabEm(t);
    if (this.cab) {
      this.corpo.tocador.mostrar(this.chave(this.cab.nome), this.cab.i);
      this.mostrando = true;
    } else if (this.mostrando) {
      this.corpo.tocador.idle();
      this.mostrando = false;
    }
  }

  private cabEm(t: number): { nome: NomeCab; i: number } | null {
    // the counter: from the first face hit, the flinch (it ends on the approved frame: the idle again)
    if (t >= this.tGruda) {
      const u = (t - this.tGruda) / MOV.encolhe;
      return u < 1 ? this.q('encolhe', u * this.n('encolhe')) : null;
    }
    if (t >= this.fim) return null;
    // the fire running back at her: the orange lets its charge go (the charge played back, fast), the green holds open
    if (t >= this.tEngasgo) {
      if (this.abortaDe === null) this.abortaDe = this.cab?.nome === 'carga' ? this.cab.i : this.cab?.nome === 'bote' ? this.n('carga') : 0;
      const x = this.abortaDe - (t - this.tEngasgo) * MOV.aborta;
      return x > 0 ? this.q('carga', x) : this.q('sopra', 0);
    }
    if (t < this.tAbre) return null;
    if (t < G.sopro[0]) return this.q('abre', ((t - this.tAbre) / MOV.abre) * this.n('abre'));
    if (t >= this.tVolta) return null;
    if (t >= this.tFecha) return this.q('fecha', ((t - this.tFecha) / MOV.fecha) * this.n('fecha'));
    const A = this.ataques.find((a) => t >= a.tc && t < a.fim);
    if (A) {
      if (t < A.tc + MOV.carga) return this.q('carga', ((t - A.tc) / MOV.carga) * this.n('carga'));
      const g = A.golpes.find((s) => t >= s - MOV.vai && t < s + MOV.pico + MOV.volta);
      if (g !== undefined) { // a peck: out to its peak just as the arc leaves, held, back
        const nb = this.n('bote');
        return this.q('bote', t < g ? nb * (1 - (g - t) / MOV.vai) : t < g + MOV.pico ? nb : nb * (1 - (t - g - MOV.pico) / MOV.volta));
      }
      if (t < A.ult) return this.q('carga', this.n('carga') - [0, 1, 2, 1][Math.floor(t * 12) % 4]); // drawn back, trembling
      return this.q('carga', this.n('carga') * (1 - (t - A.ult - MOV.pico - MOV.volta) / MOV.relaxa)); // it eases back
    }
    // free: the green's neck pumps — the sopra frames out and back, fitted to the window so it starts and ends on B
    const w = this.livres.find(([a, b]) => t >= a && t < b);
    if (!w) return this.q('sopra', 0);
    const k = Math.min(this.n('sopra'), Math.floor(((w[1] - w[0]) * MOV.sopraFps) / 2)), u = (t - w[0]) / (w[1] - w[0]);
    return this.q('sopra', k * (1 - Math.abs(2 * u - 1)));
  }

  // ─── the step (the mock's frame, 1812–1842 and 2059–2066) ───

  private passo(t: number, dt: number): void {
    if (this.abortado) {
      this.tAborto += dt;
      this.geleias.passo(t, dt);
      this.p.passo(dt);
      return;
    }
    this.cabPasso(t);
    this.gasPasso(t, dt);
    this.fxPasso(t, dt);
    this.p.passo(dt);
    if (t < this.fim) {
      // the screen: the counter's shake (the physics die, as the mock's `quadro` call), else the peck's kick (the looks)
      if (this.sacode > 0) this.corpo.treme(Math.round((this.acaso() - 0.5) * 4 * this.sacode), Math.round((this.acaso() - 0.5) * 4 * this.sacode));
      else {
        const k = this.kick(t);
        if (k) this.corpo.treme(k.x, k.y);
      }
      this.corpo.luz({ verde: this.fxg.luzV, laranja: this.fxg.luzL }, this.tinta);
    }
  }

  /** a per-frame count of the mock, for this step (R2) */
  private quantos(n: number, dt: number, sorte: () => number): number {
    return Math.floor(n * porQuadro(dt) + (porQuadro(dt) === 1 ? 0 : sorte()));
  }

  /** the mock's `gasPasso` (1007–1156) */
  private gasPasso(t: number, dt: number): void {
    const a = this.acaso, k = porQuadro(dt), bl = this.corpo.boca('laranja');
    const { dens, densB, calor, queima, queimaN } = this;
    // the green BREATHES IT OUT of her open jaws, down and forward, in a fan that sways and breathes: its aim wanders
    // (two slow sines), its width opens and closes, and it comes in puffs
    this.pufAgora = -1;
    if (!this.engasgou && t >= G.sopro[0] && t < G.sopro[1]) {
      const ta = t - G.sopro[0];
      const eixo = G.vapor.eixo + 0.1 * Math.sin(2 * Math.PI * 0.8 * ta) + 0.05 * Math.sin(2 * Math.PI * 2.1 * ta + 1.3);
      const abre = G.vapor.abre + 0.06 * Math.sin(2 * Math.PI * 1.5 * ta + 0.4);
      const puf = 0.5 + 0.5 * Math.max(0, Math.sin(2 * Math.PI * 1.3 * ta));
      this.pufAgora = puf; // her lights pulse with it
      const q = Math.floor(G.vapor.taxa * puf * Math.min(1, ta / 0.3) * k + a());
      const l = this.corpo.labios();
      for (let i = 0; i < q; i++) {
        const ang = eixo + (a() - 0.5) * 2 * abre, v = 34 + a() * 34, ida = a() * dt;
        this.nuvem.push({ x: l.x + Math.cos(ang) * v * ida, y: l.y + Math.sin(ang) * v * ida, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
          idade: ida, vida: 2.0 + a() * 0.8, giro: (a() - 0.5) * 0.6 });
      }
    }
    for (const p of this.nuvem) {
      const c = Math.cos(p.giro * dt), s = Math.sin(p.giro * dt); // a wisp curls a little (the jet's eddies)
      const vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c;
      p.vx = vx;
      p.vy = vy;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.idade += dt;
      if (p.y >= CRISTA - 2 && p.vy > 0) {
        // the wall jet: it slows as it spreads and thickens (a slow lift), and lingers as a low bank
        const v = Math.hypot(p.vx, p.vy), lado = (p.vx < 0 ? -1 : 1) * (a() < 0.2 ? -1 : 1);
        p.y = CRISTA - 2;
        p.vy = -v * (0.08 + 0.2 * a());
        p.vx = lado * v * (0.45 + 0.35 * a());
        p.giro = 0;
        p.vida = Math.max(p.vida, p.idade + 1.4 + a());
      }
    }
    for (let i = this.nuvem.length - 1; i >= 0; i--) if (this.nuvem[i].idade > this.nuvem[i].vida || this.nuvem[i].comido) this.nuvem.splice(i, 1);
    // the density: each particle weighs less with age (the gas thins as it spreads), summed over 3×3 cells
    dens.fill(0);
    for (const p of this.nuvem) {
      const c = celula(p.x, p.y);
      if (c >= 0) dens[c] += 1 - Math.pow(p.idade / p.vida, 1.5);
    }
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
      let s = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const x2 = cx + ox, y2 = cy + oy;
        if (x2 >= 0 && y2 >= 0 && x2 < GW && y2 < GH) s += dens[y2 * GW + x2];
      }
      densB[cy * GW + cx] = s;
    }
    const esfria = Math.exp(-dt / G.calorTau);
    for (let c = 0; c < GW * GH; c++) calor[c] *= esfria;
    // the orange's sparks. The wind-up: its mouth glows and crackles for `carga` s, mostly out of its jaws. The strike:
    // the gas the ship heated burns, the thermometer starts over; her pattern's strikes
    G.faiscas.forEach((tf, i) => {
      if (this.engasgou || this.feitas[i]) return;
      if (t >= tf - G.carga && t < tf - 1e-6) {
        const c = 1 - (tf - t) / G.carga;
        const n = a() < chance(0.5 + 0.5 * c, dt) ? 1 + Math.floor(a() * (1 + 2 * c)) : 0;
        for (let j = 0; j < n; j++) {
          const ang = Math.PI + (a() - 0.5) * 2.6, v = 35 + a() * 60;
          this.p.push({ x: bl.x, y: bl.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, idade: 0, vida: 0.06 + a() * 0.12, faisca: [255, 196, 96], rasto: true });
        }
        return;
      }
      if (t < tf - 1e-6) return;
      this.feitas[i] = true;
      this.termo.zera(t);
      for (const gp of this.padrao(i)) this.agenda.push({ t: tf + gp.dt, gp, feito: false });
    });
    for (const ag of this.agenda) if (!ag.feito && t >= ag.t - 1e-6 && !this.engasgou) {
      ag.feito = true;
      this.golpeia(ag.gp, t);
    }
    for (const r of this.respingos) if (!r.feito && t >= r.t - 1e-6) {
      r.feito = true;
      if (this.corpo.cores.includes(r.para)) this.respinga(r.para); // (the B has no cyan)
    }
    // the ship's shots: a hot round heats the gas it passes through (more where the gas is denser) and a small radius
    // around its path; INCENDIÁRIO carries fire and lights it at the first touch
    if (t < this.fim) this.tiros(t);
    this.termo.passo(t, dt, t >= G.sopro[0] && t < G.sopro[1] + 0.8, this.estouros);
    // the flame fronts: the gas they reach burns (and is used up); lit from the ship's side, the faces they reach get the
    // gas in front of them thrown in
    for (const ig of this.ignicoes) {
      const R = G.frente * (t - ig.t0);
      if (R > 220) continue;
      const x0 = Math.max(0, Math.floor((ig.x - R) / GC)), x1 = Math.min(GW - 1, Math.ceil((ig.x + R) / GC));
      const y0 = Math.max(0, Math.floor((ig.y - R) / GC)), y1 = Math.min(GH - 1, Math.ceil((ig.y + R) / GC));
      // a flame front passes ONCE: only the shell it crossed this step lights
      const R0 = ig.R ?? -1;
      ig.R = R;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const c = cy * GW + cx, d = Math.hypot(cx * GC + 1 - ig.x, cy * GC + 1 - ig.y);
        if (queima[c] < 0 && densB[c] > G.dMin * 0.6 && d <= R && d > R0 - 2) {
          queima[c] = t;
          queimaN[c] = Math.min(1, densB[c] / G.dCheia);
        }
      }
      for (const c of ig.caras) if (!c.feito && c.d <= R) {
        c.feito = true;
        this.naCara(c.cor, ig, t);
      }
    }
    for (const p of this.nuvem) {
      const c = celula(p.x, p.y);
      if (c >= 0 && queima[c] >= 0 && t - queima[c] < 0.4) p.comido = true;
    }
    for (let c = 0; c < GW * GH; c++) if (queima[c] >= 0 && t - queima[c] > 0.45) queima[c] = -1;
    this.geleias.passo(t, dt);
    // the plasma throws an electric spark now and then (visual only; its own die)
    const v = this.visual;
    for (const g of this.geleias.lista) {
      const R = raioDe(g);
      if (R < 2.6 || g.calor < 0.3 || !(v() < chance(0.12 * Math.min(2, R / 4), dt))) continue;
      const th = v() * Math.PI * 2, r0 = contorno(g, th), vv = 40 + v() * 60;
      this.p.push({ x: g.x + Math.cos(th) * r0, y: g.y + Math.sin(th) * r0, vx: g.vx + Math.cos(th) * vv, vy: g.vy + Math.sin(th) * vv,
        idade: 0, vida: 0.08 + v() * 0.12, faisca: [255, 214, 130], rasto: true });
    }
    for (let i = this.estouros.length - 1; i >= 0; i--) if (t - this.estouros[i].t0 > (this.estouros[i].dur ?? 0.34)) this.estouros.splice(i, 1);
    for (let i = this.arcos.length - 1; i >= 0; i--) if (t - this.arcos[i].t0 > 0.1) this.arcos.splice(i, 1);
    this.sacode = Math.max(0, this.sacode - dt * 3.5);
    this.tinta = Math.max(0, this.tinta - dt * 9); // a quick hot flash, not a wash over her art
  }

  /**
   * THE PLAYER'S SHOTS (the mock 1084–1104, with the game's own bullets): each is followed (`seguidas`) from its first
   * step in the gas; it counts for the thermometer once — when it reaches her left edge, or when it is gone (the scene
   * killed it on her drawn body first) — by the thickest gas it crossed (its first touch is always the cloud's thin
   * edge). A reused pool sprite that jumped back left is a new shot.
   */
  private tiros(t: number): void {
    const { densB, calor } = this;
    for (const [b, s] of this.seguidas) if (!b.active) {
      if (!s.contada) this.esquentar(t, s);
      this.seguidas.delete(b);
    }
    for (const b of this.corpo.balas() as readonly Bala[]) {
      let s = this.seguidas.get(b);
      if (s && b.x < s.ultimoX - 4) s = undefined;
      if (!s) {
        s = { dmax: 0, ox: 0, oy: 0, contada: false, ultimoX: b.x };
        this.seguidas.set(b, s);
      }
      s.ultimoX = b.x;
      if (s.contada) continue;
      const c = celula(b.x, b.y);
      if (c >= 0 && densB[c] > G.dVis && !this.engasgou) {
        if (this.carta && densB[c] > G.dMin) {
          this.termo.acender(t);
          this.acende(b.x, b.y, t, 'nave');
        } else if (!this.carta) {
          // the subtle hint stays (the spot it heats); the thermometer takes each shot's heat once
          const cx = c % GW, cy = Math.floor(c / GW), q = G.calorTiro * Math.min(1, densB[c] / 2);
          for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
            const d = Math.hypot(ox, oy), x2 = cx + ox, y2 = cy + oy;
            if (d <= 3 && x2 >= 0 && y2 >= 0 && x2 < GW && y2 < GH) calor[y2 * GW + x2] += q * (1 - d / 4);
          }
          if (densB[c] > s.dmax) {
            s.dmax = densB[c];
            s.ox = b.x;
            s.oy = b.y;
          }
        }
      }
      // through: it reached her (the scene draws its hit on her body)
      if (b.x >= this.corpo.bordaEsq(Math.round(b.y))) {
        s.contada = true;
        this.esquentar(t, s);
      }
    }
  }

  /** a shot through: the thermometer takes its heat; full, the flashback */
  private esquentar(t: number, s: Seguida): void {
    s.contada = true;
    if (!s.dmax || this.engasgou) return;
    if (this.termo.esquenta(t, G.termoTiro * Math.min(1, s.dmax / 1.2), this.engasgou)) this.acende(s.ox, s.oy, t, 'nave');
  }

  /** light the cloud at (x, y): a flame front leaves it (the mock 808–819; its pockets' branch is dead since round 7) */
  private acende(x: number, y: number, t: number, origem: 'nave' | 'padrao'): void {
    if (origem === 'nave') {
      // lit from the ship's side: the thin gas there only flashes. The front runs back up the breath into HER mouth;
      // the blast there throws the gas in front of it into her face and splashes jelly onto her sisters' (`naCara`)
      const b = this.corpo.boca('verde');
      this.ignicoes.push({ x, y, t0: t, origem, caras: [{ cor: 'verde', d: Math.max(0, Math.hypot(b.x - x, b.y - y) - 12), feito: false }] });
      this.engasgou = true;
      this.tEngasgo = t;
      return;
    }
    this.ignicoes.push({ x, y, t0: t, origem: 'laranja', caras: [] });
  }

  /** the gas in front of a face, lit from the ship's side, is thrown into it (away from the light point). THE COUNTER:
   * her HP takes `HAB.contra` of the form's at the first face the flame reaches */
  private naCara(cor: Cor, ig: Ignicao, t: number): void {
    const b = this.corpo.boca(cor), d = Math.hypot(b.x - ig.x, b.y - ig.y);
    const ux = d > 1 ? (b.x - ig.x) / d : 1, uy = d > 1 ? (b.y - ig.y) / d : 0, ini = Math.min(12, d);
    const g = this.geleias.nova(b.x - ux * ini, b.y - uy * ini, ux * 160, uy * 160, cor === 'verde' ? 6.5 : 5.5, 'nave', { alvo: cor, vida: 2 });
    this.geleias.deforma(g, 2, Math.atan2(uy, ux), -0.3);
    // the green's mouth blows up: burning jelly splashes from it onto the orange (nearer) and the cyan
    if (cor === 'verde') this.respingos.push({ t: t + 0.06, para: 'laranja', feito: false }, { t: t + 0.13, para: 'ciano', feito: false });
    if (!this.contraDado) {
      this.contraDado = true;
      this.corpo.contra();
    }
  }

  private respinga(cor: Cor): void {
    const de = this.corpo.labios(), b = this.corpo.boca(cor), d = Math.hypot(b.x - de.x, b.y - de.y) || 1, ux = (b.x - de.x) / d, uy = (b.y - de.y) / d;
    const g = this.geleias.nova(de.x + ux * 4, de.y + uy * 4, ux * 210, uy * 210, 5.5, 'nave', { alvo: cor, vida: 2 });
    this.geleias.deforma(g, 2, Math.atan2(uy, ux), -0.3);
  }

  /** a pocket of the breath, 20 px down its axis from her jaws (two of them side by side for the rails) */
  private bolsao(k: number, n: number): Ponto {
    const l = this.corpo.labios(), ax = Math.cos(G.vapor.eixo), ay = Math.sin(G.vapor.eixo), s = n > 1 ? (k - (n - 1) / 2) * 12 : 0;
    return { x: l.x + ax * 20 - ay * s, y: l.y + ay * 20 + ax * s };
  }

  /** strike i's dodge, in this form's sequence */
  private padrao(i: number): readonly Golpe[] {
    const ordem = G.ordem[this.forma], P = G.padroes[this.forma] as Record<string, readonly Golpe[]>;
    return P[ordem[i % ordem.length]];
  }

  /** the orange's strike (the mock 880–906): from behind a pocket, so its blast throws the jelly at the ship */
  private golpeia(gp: Golpe, t: number): void {
    const a = this.acaso, bl = this.corpo.boca('laranja'), alvo = this.corpo.nave(), alvos: Ponto[] = [];
    gp.alvos.forEach((a0, k) => {
      const al: AlvoGolpe = typeof a0 === 'number' ? { dy: a0 } : a0;
      const R = al.R ?? gp.R, v = al.v ?? gp.v;
      // `rente`: just over the hull's crest at the ship's column (it skims the plate there and splats burning on it)
      const p = this.bolsao(k, gp.alvos.length), tx = alvo.x, ty = al.y ?? (al.rente ? CRISTA - R - 1 : alvo.y + (al.dy ?? 0));
      const d = Math.hypot(tx - p.x, ty - p.y), ux = (tx - p.x) / d, uy = (ty - p.y) / d;
      const s = { x: p.x - ux * (R + 3), y: p.y - uy * (R + 3) }; // the strike: behind the pocket
      alvos.push(s);
      const g = this.geleias.nova(p.x, p.y, ux * v, uy * v, R, 'laranja', { mae: true, vida: 2.6, corte: al.corte ?? gp.corte, tRacha: al.tRacha ?? gp.tRacha ?? 0.32, ...(al.cruza ? { cruza: true } : {}) });
      this.geleias.deforma(g, 2, Math.atan2(uy, ux), -0.3); // the blast squashes it along the push: it leaves wobbling
      this.estouros.push({ x: Math.round(p.x), y: Math.round(p.y), t0: t, R: 8, ang: Math.atan2(uy, ux), dur: 0.22 });
      const aS = Math.atan2(s.y - bl.y, s.x - bl.x), dS = Math.hypot(s.x - bl.x, s.y - bl.y);
      for (let j = 0; j < 14; j++) {
        const ang = aS + (a() - 0.5) * 0.8, v = (dS / 0.1) * (0.7 + a() * 0.8);
        this.p.push({ x: bl.x, y: bl.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, idade: 0, vida: 0.08 + a() * 0.14, faisca: [255, 200, 90], rasto: true });
      }
      this.acende(s.x, s.y, t, 'padrao');
    });
    // one arc per strike; the rails' arc forks two thirds of the way
    if (alvos.length === 1) this.arcos.push({ x0: bl.x, y0: bl.y, x1: alvos[0].x, y1: alvos[0].y, t0: t });
    else {
      const mx = alvos.reduce((s, p) => s + p.x, 0) / alvos.length, my = alvos.reduce((s, p) => s + p.y, 0) / alvos.length;
      const fx = bl.x + (mx - bl.x) * 0.66, fy = bl.y + (my - bl.y) * 0.66;
      this.arcos.push({ x0: bl.x, y0: bl.y, x1: fx, y1: fy, t0: t, seg: 3 });
      for (const s of alvos) this.arcos.push({ x0: fx, y0: fy, x1: s.x, y1: s.y, t0: t, seg: 2 });
    }
    this.clarao.push(t);
  }

  /** the mock's `gasFxPasso` (1311–1352): her lights, the orange's crawling arcs, the pecks' smoke and discharges, the
   * green's last breath — visual only */
  private fxPasso(t: number, dt: number): void {
    const X = this.fxg, v = this.visual, bl = this.corpo.boca('laranja');
    // the green's lights: up with each puff, down between them; out when she stops
    const vv = this.pufAgora >= 0 ? 0.2 + 0.8 * (this.pufAgora - 0.5) * 2 : 0;
    X.luzV = vv >= X.luzV ? X.luzV + (vv - X.luzV) * chance(0.6, dt) : X.luzV * Math.exp(-dt / 0.18);
    // the orange's lights: up through its charge, full at the strikes, fading after (and at once if she chokes)
    const A = t < this.tEngasgo ? this.ataques.find((a) => t >= a.tc && t < a.ult + MOV.pico) : undefined;
    const alvo = A ? Math.min(1, (t - A.tc) / G.carga) : 0;
    X.luzL = alvo >= X.luzL ? alvo : X.luzL * Math.exp(-dt / 0.4);
    // small arcs crawling on its snout while it charges, more as it fills
    if (A && t < A.tf) for (let j = 0; j < 2; j++) if (v() < chance(0.15 + 0.55 * alvo, dt)) {
      const a = v() * 6.283, r = 2 + v() * (3 + 3 * alvo), pts: [number, number][] = [];
      let x = bl.x + Math.cos(a) * r, y = bl.y + Math.sin(a) * r;
      for (let s = 0; s < 3 + Math.floor(v() * 2); s++) {
        pts.push([x, y]);
        x += (v() - 0.5) * 5;
        y += (v() - 0.5) * 5;
      }
      X.rasteja.push({ pts, idade: 0, vida: 0.04 + v() * 0.06 });
    }
    // each peck: the screen kicks, smoke drifts off the muzzle along the strike, discharges on the snout
    for (const at of this.ataques) for (const s of at.golpes) if (t < this.tEngasgo && t >= s && t - dt < s) {
      X.kick = t;
      X.desc = Math.max(X.desc, s === at.ult ? 1 : 0.55);
      const ar = this.arcos[this.arcos.length - 1], ang = ar ? Math.atan2(ar.y1 - ar.y0, ar.x1 - ar.x0) : Math.PI;
      for (let j = 0; j < 3; j++) {
        const a2 = ang + (v() - 0.5) * 0.8, sp = 6 + v() * 12;
        X.fumo.push({ x: bl.x + (v() - 0.5) * 2, y: bl.y + (v() - 0.5) * 2, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, idade: 0, vida: 0.7 + v() * 0.6, r0: 1 + v() });
      }
    }
    if (X.desc > 0.05 && v() < chance(0.6 * X.desc, dt)) {
      const a = v() * 6.283, r = 3 + v() * 4, pts: [number, number][] = [];
      let x = bl.x + Math.cos(a) * r, y = bl.y + Math.sin(a) * r;
      for (let s = 0; s < 3; s++) {
        pts.push([x, y]);
        x += Math.cos(a) * 2.5 + (v() - 0.5) * 3;
        y += Math.sin(a) * 2.5 + (v() - 0.5) * 3;
      }
      X.rasteja.push({ pts, idade: 0, vida: 0.05 + v() * 0.05, forte: true });
    }
    X.desc *= Math.exp(-dt / 0.35);
    // the green closing: a last breath leaks out of her jaws, along her breath's axis, thinning
    if (t >= this.tFecha && t < this.tFecha + 0.4 && t < this.tEngasgo) {
      const b = this.corpo.labios();
      for (let j = 0, n = this.quantos(2, dt, v); j < n; j++) {
        const a2 = G.vapor.eixo + (v() - 0.5) * 0.6, sp = 10 + v() * 14;
        X.resto.push({ x: b.x, y: b.y, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, idade: 0, vida: 0.6 + v() * 0.6 });
      }
    }
    for (const L of [X.fumo, X.resto]) for (const p of L) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.idade += dt;
    }
    for (const p of X.rasteja) p.idade += dt;
    X.fumo = X.fumo.filter((p) => p.idade < p.vida);
    X.resto = X.resto.filter((p) => p.idade < p.vida);
    X.rasteja = X.rasteja.filter((p) => p.idade < p.vida);
  }

  /** the peck's kick: 1 px, gone in 0.08 s */
  private kick(t: number): { x: number; y: number } | null {
    return t - this.fxg.kick < 0.08 ? { x: this.visual() < 0.5 ? -1 : 0, y: this.visual() < 0.5 ? 1 : 0 } : null;
  }

  /** only the burning jelly hurts (spec §3.4; the thin gas on the ship's side only flashes) */
  morde(esq: number, dir: number, topo: number, base: number): boolean {
    return !this.abortado && this.geleias.toca(esq, dir, topo, base);
  }

  /** her head died: the jelly stops hurting at once; everything fades in `HAB.aborta` s */
  abortar(): void {
    this.abortado = true;
    this.tAborto = 0;
    this.mostrando = false;
  }

  /** the mock's `gasDesenha` + `gasFxDesenha` (1176–1253, 1355–1391), then the loose bits (`desenhaGas`) */
  desenhar(put0: Put): void {
    const alfa = this.abortado ? Math.max(0, 1 - this.tAborto / HAB.aborta) : 1;
    if (alfa <= 0) return;
    const put: Put = alfa >= 1 ? put0 : (x, y, c, a = 1) => put0(x, y, c, a * alfa);
    const t = this.tq, { densB, calor, queima, queimaN } = this;
    const escura = [38, 104, 66], clara = [104, 214, 132];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = Math.floor(y / GC) * GW + Math.floor(x / GC);
      const lim = BAYER[(y & 3) * 4 + (x & 3)] / 16;
      if (queima[c] >= 0) { // burning, dithered by how much gas was there: a white-hot flash, the orange body, a red fade
        const a = t - queima[c], n = queimaN[c];
        if (lim >= 0.25 + 0.75 * n) continue;
        if (a < 0.06) put(x, y, n > 0.5 ? [255, 246, 214] : [255, 214, 140], 0.9);
        else if (a < 0.2) put(x, y, n > 0.6 && lim < 0.3 ? [255, 214, 120] : [255, 150, 60], 0.85);
        else if (a < 0.4 && lim < 1 - (a - 0.2) / 0.2) put(x, y, [150, 52, 30], 0.6);
        continue;
      }
      const d = densB[c];
      // the subtle hint: where the ship's shots heated the gas, a sparse amber shimmer of its own; denser as it heats
      const h = Math.min(1, calor[c] / G.calorIgn);
      if (h > 0.3 && d > G.dVis * 0.5 && BAYER[((y + 1) & 3) * 4 + ((x + 2) & 3)] / 16 < (h - 0.3) * 0.35) {
        put(x, y, h > 0.8 ? [255, 206, 130] : [255, 160, 80], 0.4 + 0.3 * h);
        continue;
      }
      if (d < G.dVis) continue;
      const n = Math.min(1, (d - G.dVis) / (G.dCheia - G.dVis));
      if (lim >= 0.15 + n * 0.75) continue; // ordered dither: thin gas = sparse pixels
      put(x, y, escura.map((v, i) => Math.round(v + (clara[i] - v) * n)), 0.35 + 0.3 * n);
    }
    // the breath's root: the young wisps drawn one by one, so the stream reads leaving her jaws
    for (const p of this.nuvem) {
      if (p.idade > 0.5 || p.comido) continue;
      const f = p.idade / 0.5, v = Math.hypot(p.vx, p.vy) || 1;
      const c = f < 0.3 ? [200, 255, 218] : [136, 228, 164], a = 0.7 * (1 - f);
      put(p.x, p.y, c, a);
      if (f < 0.6) put(p.x - p.vx / v, p.y - p.vy / v, c, a * 0.55); // a short streak back towards her mouth
    }
    for (const e of this.estouros) estouroDesenha(put, e, t);
    this.geleias.desenhar(put);
    if (!this.abortado) this.desenharLaranja(put, t);
    // (the mock drew its own shots here; in the game the player's bullets draw themselves)
    this.termo.desenhar(put, t);
    this.desenharFx(put);
    this.p.desenhar(put);
  }

  /** the orange's mouth: the wind-up glow (pulsing faster and growing as the spark nears), each strike's flash; the
   * spark's jump: a jagged hot line, new zigzag each frame (on the physics die, as the mock's) */
  private desenharLaranja(put: Put, t: number): void {
    const bl = this.corpo.boca('laranja');
    for (const tf of [...G.faiscas, ...this.clarao.map((c) => -c)]) {
      let r = 0, forte = 0;
      if (tf < 0) {
        if (t + tf < 0.1 && -tf < this.tEngasgo + 1e-6) {
          r = 5.5;
          forte = 1;
        }
      } else if (t >= tf - G.carga && t < tf && t < this.tEngasgo) {
        const c = 1 - (tf - t) / G.carga;
        r = 2 + 3 * c + (Math.sin(t * (14 + 50 * c)) > 0 ? 0.7 : 0);
        forte = 0.5 + 0.5 * c;
      }
      if (r <= 0) continue;
      const rh = r * 2.4; // the halo on her snout
      for (let dy = -Math.ceil(rh); dy <= Math.ceil(rh); dy++) for (let dx = -Math.ceil(rh); dx <= Math.ceil(rh); dx++) {
        const d = Math.hypot(dx, dy);
        if (d > r && d <= rh && BAYER[((Math.round(bl.y) + dy) & 3) * 4 + ((Math.round(bl.x) + dx) & 3)] / 16 < 0.5 * (1 - (d - r) / (rh - r))) put(bl.x + dx, bl.y + dy, [255, 150, 60], 0.35 * forte);
      }
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= r) put(bl.x + dx, bl.y + dy, d < r * 0.4 ? [255, 244, 214] : [255, 160, 64], forte * (1 - d / (r + 1)));
      }
    }
    for (const ar of this.arcos) {
      const L = Math.hypot(ar.x1 - ar.x0, ar.y1 - ar.y0) || 1, px = -(ar.y1 - ar.y0) / L, py = (ar.x1 - ar.x0) / L;
      const nseg = ar.seg ?? 5;
      let xa = ar.x0, ya = ar.y0;
      for (let s = 1; s <= nseg; s++) {
        const f = s / nseg, j = s < nseg ? (this.acaso() - 0.5) * 6 : 0;
        const xb = ar.x0 + (ar.x1 - ar.x0) * f + px * j, yb = ar.y0 + (ar.y1 - ar.y0) * f + py * j;
        linha(put, xa + px, ya + py, xb + px, yb + py, [255, 150, 60], 0.5);
        linha(put, xa, ya, xb, yb, [255, 244, 210]);
        linha(put, xa - px * 0.5, ya - py * 0.5, xb - px * 0.5, yb - py * 0.5, [255, 226, 160], 0.8);
        xa = xb;
        ya = yb;
      }
    }
  }

  private desenharFx(put: Put): void {
    const X = this.fxg;
    // smoke off the muzzle: dithered, warm grey, spreading and thinning
    for (const p of X.fumo) {
      const f = p.idade / p.vida, r = (p.r0 ?? 1) + f * 3.5;
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const d = Math.hypot(dx, dy), Xx = Math.round(p.x + dx), Y = Math.round(p.y + dy);
        if (d > r || BAYER[(Y & 3) * 4 + (Xx & 3)] / 16 > 0.55 * (1 - f) * (1 - d / (r + 1))) continue;
        put(Xx, Y, f < 0.15 ? [200, 150, 110] : [110, 104, 112], 0.6 * (1 - f));
      }
    }
    // the last breath: the gas's own greens, sparse
    for (const p of X.resto) {
      const f = p.idade / p.vida, Xx = Math.round(p.x), Y = Math.round(p.y);
      put(Xx, Y, f < 0.3 ? [150, 236, 176] : [80, 170, 110], 0.6 * (1 - f));
      if (f < 0.5) put(Xx - Math.sign(p.vx), Y - Math.sign(p.vy), [80, 170, 110], 0.35 * (1 - f));
    }
    // the crawling arcs and the discharges: a white-hot thread with an amber edge
    for (const a of X.rasteja) {
      const f = a.idade / a.vida;
      for (let s = 1; s < a.pts.length; s++) {
        const [x0, y0] = a.pts[s - 1], [x1, y1] = a.pts[s];
        linha(put, x0, y0 + 1, x1, y1 + 1, [255, 140, 50], 0.45 * (1 - f));
        linha(put, x0, y0, x1, y1, a.forte || s === 1 ? [255, 246, 220] : [255, 200, 120], 1 - f * 0.6);
      }
    }
  }
}
