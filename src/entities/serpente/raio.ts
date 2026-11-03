/**
 * THE CYAN'S BEAM (spec §3.3; the mock's `varredura`, rounds 8–12 — lines 1455–1795, ported with the plan's R1–R8).
 *
 * Two big slices, then the salvo of six thin beams. Each big beam, inside a 1.6 s warning:
 *   READ (0.35 s)      the closed head follows the ship, a small pulse from her eye at each reading;
 *   REHEARSE (0.45 s)  the eye's focus runs the path once, the head following it; then the eye LOCKS (a flash);
 *   WIND-UP            back to the middle, the jaws open drawn back (`abre`), energy falling into the mouth; then
 *                      up or down to the path's start;
 *   FIRE               the head follows the beam (a front of energy runs out of the mouth first — only what is drawn
 *                      hurts); then the RECOVERY: the jaws snap shut, the head is thrown back (`recupera`).
 * The path still to come is shaded faintly, exactly where the beam will pass. The hull is cut hard: sparks fly off
 * straight (vacuum), small bursts, a scorch cooling white → orange → red. In the salvo the jaws stay open between the
 * shots; each slice is DRAWN AT ITS OWN START with the ship where it is (the plan's correction 3: the mock drew all six
 * at once for its mannequin; with the ship on the mannequin the slices are the same, which the oracle proves).
 *
 * Her head moves only through the PixelLab sets (`corpo.tocador.mostrar`), never in code. Pure enough for Node: the
 * oracle runs it against the approved mock's own log (`scripts/_serpente/_oraculo.mjs`).
 */
import { CONJUNTOS, type ChaveConjunto } from './gestosHab.ts';
import { angDe, caminho, caminhoPorPartes, feixe, feixeNaCaixa, poseDe, quadroDe, sorteiaFatia, yBorda, type Faixa, type Feixe } from './geometriaRaio.ts';
import type { CorpoSerpente, Habilidade } from './habilidade';
import { FPS_MAQUETE, HAB, chance, gerador, porQuadro } from './numerosHab.ts';
import { Particulas } from './particulas.ts';
import { H, W } from './pixels.ts';
import type { Ponto, Put, RGB } from './tipos';

type NomeCab = keyof typeof HAB.conjuntos.raio;

interface Fatia {
  de: number;
  ate: number;
  dur: number;
  carga: number;
  meia?: number;
  salva?: boolean;
  t0: number;
  t1: number;
  t2: number;
  t3: number;
  tE?: number;
  tC?: number;
  tA?: number;
  tAb?: number;
  tCab: number;
  tFoco?: [number, number];
  recupera?: boolean;
  /** the eased move of the open head to the slice's start */
  xIni?: number;
  tIni?: number;
  /** the path drawn (computed once, when first shown) */
  u?: Float32Array;
  /** a salvo slice not drawn yet (its `de`/`ate` wait for its start) */
  pendente?: boolean;
  /** the salvo's way out for the ship (the probes read it) */
  para?: number;
}

interface FeixeVivo extends Feixe {
  frente: number;
  ds: number;
  salva: boolean;
  meia: number;
}

const R = HAB.raio;
const { COR, NUCLEO, BAYER } = HAB.cores;
const CRISTA = HAB.crista;

/** the mock's `linha` (528–531) */
function linha(put: Put, x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
}

/** a thin ring (the eye's reading pulse) */
function anel(put: Put, cx: number, cy: number, r: number, cor: RGB, a: number): void {
  const n = Math.max(8, Math.ceil(r * 7));
  for (let k = 0; k < n; k++) put(cx + Math.cos((k / n) * 6.283) * r, cy + Math.sin((k / n) * 6.283) * r, cor, a);
}

function brilho(put: Put, cx: number, cy: number, r: number, miolo: RGB, borda: RGB, a: number): void {
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
    const d = Math.hypot(dx, dy);
    if (d <= r) put(cx + dx, cy + dy, d < r * 0.45 ? miolo : borda, a * (1 - d / (r + 1)));
  }
}

export class Raio implements Habilidade {
  readonly nome = 'raio' as const;
  /** the skill's clock (the mock's `t`: the first slice reads at `inicio`) */
  t = 0;
  /** the time of the last step (what `desenhar` draws) */
  private tq = 0;
  /** the salvo's die seed: `Math.random` in the game; the oracle sets the mock's 11 before `comecar` */
  sementeSalva: number | null = null;
  fatias: Fatia[] = [];
  private fimRec = 0;
  private drec = 0;
  private sorteSalva: () => number = Math.random;
  private acaso: () => number = Math.random;
  private visual: () => number = Math.random;
  private p = new Particulas(Math.random);
  /** the head now: its set and frame (fractional while it moves); null = the idle */
  private cab: { nome: NomeCab | null; x: number } = { nome: null, x: 0 };
  private mostrando = false;
  /** the beam this step (null between shots) */
  feixe: FeixeVivo | null = null;
  private bateAnt: number | null = null;
  private atrai: { a: number; r0: number; idade: number; vida: number }[] = [];
  private vapor: { x: number; y: number; vx: number; vy: number; idade: number; vida: number; r0: number }[] = [];
  private estouros: { x: number; y: number; idade: number; vida: number; r: number }[] = [];
  private casco = new Float32Array(W);
  private luz = 0;
  private desc = 0;
  private abortado = false;
  private tAborto = 0;
  /** THE BIG SLICES' PATHS: the same every round (she never leaves her post), ≈ 50 ms each all at once — a visible
   * hitch —, so they are computed a few beam positions per step through the idle cycle before the first reading, and
   * kept. The salvo's (drawn per round, ~4 ms) are computed when first shown */
  private readonly caminhos = new Map<string, Float32Array>();
  private preparo: { chave: string; g: Generator<undefined, Float32Array, undefined> } | null = null;
  private readonly corpo: CorpoSerpente;

  // (no parameter property: Node runs this module, stripping types only — the oracle)
  constructor(corpo: CorpoSerpente) {
    this.corpo = corpo;
  }

  get viva(): boolean {
    if (this.abortado) return this.tAborto < HAB.aborta;
    return this.t < this.fimRec || !this.p.vazio || this.vapor.length > 0 || this.estouros.length > 0 || this.atrai.length > 0;
  }

  /** the scorch on the hull still cooling after the skill ended (the boss keeps drawing it) */
  get restos(): boolean {
    if (this.abortado) return false;
    for (let x = 0; x < W; x++) if (this.casco[x] >= 0.03) return true;
    return false;
  }

  comecar(): void {
    this.t = R.inicio - HAB.cicloIdle;
    this.tq = this.t;
    const s = this.sementeSalva ?? Math.floor(Math.random() * 2 ** 31);
    this.sorteSalva = gerador(s);
    this.acaso = gerador(Math.floor(Math.random() * 2 ** 31));
    this.visual = gerador(Math.floor(Math.random() * 2 ** 31));
    this.p = new Particulas(this.acaso);
    this.cab = { nome: null, x: 0 };
    this.mostrando = false;
    this.feixe = null;
    this.bateAnt = null;
    this.atrai = [];
    this.vapor = [];
    this.estouros = [];
    this.casco = new Float32Array(W);
    this.luz = 0;
    this.desc = 0;
    this.abortado = false;
    this.tAborto = 0;
    // the timeline of the two big slices (the mock 1496–1512), then the salvo's (1513–1538, without the draw)
    this.drec = R.recupera.centra + CONJUNTOS.raioRecupera.quadros / R.recupera.fps;
    this.fatias = [];
    let tt: number = R.inicio;
    const F = R.fase;
    for (const g of R.fatias) {
      const t0 = tt, t1 = tt + g.carga, t2 = t1 + g.dur, t3 = t2 + R.segura;
      const tE = t0 + F.le, tC = tE + F.ensaia, tA = tC + F.centra, tAb = tA + F.abre;
      this.fatias.push({ de: g.de, ate: g.ate, dur: g.dur, carga: g.carga, t0, t1, t2, t3, tE, tC, tA, tAb, tCab: t0, recupera: true });
      tt = t3 + this.drec; // the next one reads right after the recovery, from the approved pose it ends on
    }
    const S = R.salva, st0 = tt;
    for (let i = 0; i < S.n; i++) {
      const carga = i ? S.ciclo : S.cargaPrimeira, t1 = st0 + S.cargaPrimeira + i * S.ciclo;
      const f: Fatia = { de: 0, ate: 0, pendente: true, dur: S.dur, carga, meia: S.meia, salva: true,
        t0: t1 - carga, t1, t2: t1 + S.dur, t3: t1 + S.dur + S.segura, tFoco: [t1 - 0.6, t1 - 0.3], tCab: 0 };
      if (i === 0) {
        f.tE = f.t0 + S.le;
        f.tA = f.tE + S.centra;
        f.tAb = f.tA + R.fase.abre;
        f.tCab = f.t0;
      } else f.tCab = this.fatias[this.fatias.length - 1].t3; // the jaws stay open: straight to the next start
      if (i === S.n - 1) f.recupera = true;
      this.fatias.push(f);
    }
    this.fimRec = this.fatias[this.fatias.length - 1].t3 + this.drec;
  }

  update(dt: number): void {
    this.passo(this.t, dt);
    this.tq = this.t;
    this.t += dt;
  }

  // ─── her head: the sets, through the facade ───

  private chave(nome: NomeCab): ChaveConjunto {
    return HAB.conjuntos.raio[nome];
  }

  private faixa(nome: 'fechada' | 'aberta'): Faixa {
    return CONJUNTOS[this.chave(nome)].faixa as Faixa;
  }

  private n(nome: NomeCab): number {
    return CONJUNTOS[this.chave(nome)].quadros;
  }

  /** a point of a set's frame; the closed head has no mouth (the mock's `fechada` has none: nothing leaves it) */
  private ponto(nome: NomeCab, i: number, tipo: 'boca' | 'olho'): Ponto | null {
    if (tipo === 'boca' && nome === 'fechada') return null;
    return this.corpo.ponto(this.chave(nome), i, tipo);
  }

  private pontoCab(tipo: 'boca' | 'olho'): Ponto | null {
    const c = this.cab;
    return c.nome ? this.ponto(c.nome, quadroDe(this.n(c.nome), c.x), tipo) : null;
  }

  /** the open mouth for a beam whose far end is at yL (the head follows the beam) */
  private readonly bocaPara = (yL: number): Ponto =>
    this.ponto('aberta', quadroDe(this.n('aberta'), poseDe(this.faixa('aberta'), yL)), 'boca') ?? { x: 0, y: 0 };

  /** the head moves toward frame `alvo` of a set through the clip's own frames, ≤ `vel` frames/s. A set is entered at
   * the middle pose it shares with the one before */
  private vira(nome: 'fechada' | 'aberta', alvo: number, vel: number, dt: number): void {
    const c = this.cab;
    if (c.nome !== nome) {
      c.nome = nome;
      c.x = this.faixa(nome).meio;
    }
    const d = alvo - c.x, m = (vel * porQuadro(dt)) / FPS_MAQUETE;
    c.x += Math.abs(d) <= m ? d : Math.sign(d) * m;
  }

  /** the salvo's slice, drawn at its start with the ship where it is */
  private sortear(f: Fatia): void {
    const n = this.corpo.nave(), s = sorteiaFatia(n.y, n.x, this.sorteSalva, this.bocaPara);
    f.de = s.de;
    f.ate = s.ate;
    f.para = s.para;
    f.pendente = false;
  }

  private chaveCaminho(f: Fatia): string {
    return `${f.de},${f.ate},${f.meia ?? R.meia}`;
  }

  /** `n` more beam positions of the next big slice's path not computed yet */
  private preparar(n: number): void {
    if (!this.preparo) {
      const f = this.fatias.find((g) => !g.salva && !this.caminhos.has(this.chaveCaminho(g)));
      if (!f) return;
      this.preparo = { chave: this.chaveCaminho(f), g: caminhoPorPartes(f, this.bocaPara, R.meia) };
    }
    for (let i = 0; i < n; i++) {
      const r = this.preparo.g.next();
      if (r.done) {
        this.caminhos.set(this.preparo.chave, r.value);
        this.preparo = null;
        return;
      }
    }
  }

  /** a slice's path: kept, or computed now */
  private caminhoDe(f: Fatia): Float32Array {
    if (f.u) return f.u;
    const k = this.chaveCaminho(f);
    let u = this.caminhos.get(k);
    if (!u) {
      u = caminho(f, this.bocaPara, R.meia);
      if (!f.salva) this.caminhos.set(k, u);
      if (this.preparo?.chave === k) this.preparo = null;
    }
    return (f.u = u);
  }

  /** a per-frame count of the mock, for this step (R2) */
  private quantos(n: number, dt: number): number {
    return Math.floor(n * porQuadro(dt) + (porQuadro(dt) === 1 ? 0 : this.visual()));
  }

  /** the mock's `varrePasso` (1540–1603) */
  private passo(t: number, dt: number): void {
    this.feixe = null;
    if (this.abortado) {
      this.tAborto += dt;
      this.efeitos(t, dt, false);
      this.p.passo(dt);
      return;
    }
    for (const f of this.fatias) if (f.pendente && t >= f.t0) this.sortear(f);
    this.preparar(24);
    // the head: the beam being fired leads; then a charge in progress; then a recovery; else the idle
    const ativa = this.fatias.find((f) => t >= f.t1 && t < f.t3);
    const carrega = !ativa ? this.fatias.find((f) => t >= f.tCab && t < f.t1) : undefined;
    const recup = !ativa && !carrega ? this.fatias.find((f) => f.recupera && t >= f.t3 && t < f.t3 + this.drec) : undefined;
    const c = this.cab, meioF = this.faixa('fechada').meio;
    if (ativa) {
      const u = Math.min(1, (t - ativa.t1) / ativa.dur);
      c.nome = 'aberta';
      c.x = poseDe(this.faixa('aberta'), ativa.de + (ativa.ate - ativa.de) * u);
    } else if (carrega) {
      const f = carrega;
      if (f.tE !== undefined && t < f.tE) { // READ: her eye's line through the ship, the head following it
        const o = this.ponto('fechada', meioF, 'olho'), n = this.corpo.nave();
        if (o) this.vira('fechada', poseDe(this.faixa('fechada'), yBorda(o, n.x + 1.5, n.y)), 20, dt);
      } else if (f.tC !== undefined && f.tE !== undefined && t < f.tC)
        this.vira('fechada', poseDe(this.faixa('fechada'), f.de + ((f.ate - f.de) * (t - f.tE)) / (f.tC - f.tE)), 40, dt);
      else if (f.tA !== undefined && t < f.tA) this.vira('fechada', meioF, 60, dt);
      else if (f.tAb !== undefined && f.tA !== undefined && t < f.tAb) {
        c.nome = 'abre';
        c.x = ((t - f.tA) / (f.tAb - f.tA)) * (this.n('abre') - 1);
      } else { // the open head to the slice's start, eased, arriving just before the shot
        if (c.nome !== 'aberta') {
          c.nome = 'aberta';
          c.x = this.faixa('aberta').meio;
        }
        if (f.xIni === undefined || f.tIni === undefined) {
          f.xIni = c.x;
          f.tIni = t;
        }
        const u = Math.min(1, (t - f.tIni) / Math.max(0.05, f.t1 - 0.03 - f.tIni)), e = u * u * (3 - 2 * u);
        c.x = f.xIni + (poseDe(this.faixa('aberta'), f.de) - f.xIni) * e;
      }
    } else if (recup) {
      const tr = t - recup.t3;
      if (tr < R.recupera.centra) this.vira('aberta', this.faixa('aberta').meio, 80, dt);
      else {
        c.nome = 'recupera';
        c.x = Math.min(this.n('recupera') - 1, (tr - R.recupera.centra) * R.recupera.fps);
      }
    } else c.nome = null;
    this.efeitos(t, dt, true);
    this.mostrarCab();
    if (t < this.fimRec) {
      this.corpo.luz({ ciano: this.luz });
      this.treme(t);
    }
    if (ativa) this.disparar(ativa, t, dt);
    this.p.passo(dt);
  }

  /** the set frame on her sprite (the idle only on the way back to it) */
  private mostrarCab(): void {
    const c = this.cab;
    if (c.nome) {
      this.corpo.tocador.mostrar(this.chave(c.nome), quadroDe(this.n(c.nome), c.x));
      this.mostrando = true;
    } else if (this.mostrando) {
      this.corpo.tocador.idle();
      this.mostrando = false;
    }
  }

  /** the beam (the mock 1585–1603): from the mouth of the frame shown, its far end swept steadily along the left edge.
   * It does not appear whole: a front of energy runs out of the mouth (0.09 s; 0.05 in the salvo) */
  private disparar(f: Fatia, t: number, dt: number): void {
    const u = Math.min(1, (t - f.t1) / f.dur), m = f.meia ?? R.meia, yL = f.de + (f.ate - f.de) * u, b = this.bocaPara(yL);
    const cheio = feixe(b, angDe(b, yL)), frente = Math.min(1, (t - f.t1) / (f.salva ? 0.05 : 0.09));
    const fx: FeixeVivo = {
      x0: cheio.x0, y0: cheio.y0, x1: cheio.x0 + (cheio.x1 - cheio.x0) * frente, y1: cheio.y0 + (cheio.y1 - cheio.y0) * frente,
      bate: cheio.bate && frente >= 1, frente, ds: t - f.t1, salva: !!f.salva, meia: t > f.t3 - 0.1 ? (m * Math.max(0, f.t3 - t)) / 0.1 : m,
    };
    this.feixe = fx;
    const v = this.visual;
    if (!fx.bate) this.bateAnt = null;
    else {
      const xb = fx.x1;
      if (this.acaso() < chance(0.7, dt)) this.p.faiscas(xb, CRISTA - 1, 2, COR.ciano);
      // the hull hit hard: the plate heats where it cuts — the whole stretch since the last step, so the cut is a line
      const xa = this.bateAnt ?? xb, lo = Math.min(xa, xb), hi = Math.max(xa, xb);
      for (let x = Math.floor(lo - 3); x <= Math.ceil(hi + 3); x++)
        if (x >= 0 && x < W) this.casco[x] = Math.max(this.casco[x], x >= lo && x <= hi ? 1 : 1 - Math.min(Math.abs(x - lo), Math.abs(x - hi)) * 0.18);
      this.bateAnt = xb;
      for (let i = 0, n = this.quantos(3, dt); i < n; i++) { // sparks flying off it straight, small bursts
        const a = -Math.PI * (0.08 + v() * 0.84), vv = 60 + v() * 110;
        this.p.push({ x: xb, y: CRISTA - 1, vx: Math.cos(a) * vv, vy: Math.sin(a) * vv, idade: 0, vida: 0.12 + v() * 0.2,
          faisca: v() < 0.5 ? [255, 236, 190] : [160, 210, 255], rasto: true });
      }
      if (v() < chance(0.3, dt)) this.estouros.push({ x: xb + (v() - 0.5) * 4, y: CRISTA - 2 - v() * 3, idade: 0, vida: 0.12 + v() * 0.12, r: 2 + v() * 2.5 });
    }
    // electric sparks thrown off its sides (the 10th round), visual only
    const L0 = Math.hypot(fx.x1 - fx.x0, fx.y1 - fx.y0) || 1, ux = (fx.x1 - fx.x0) / L0, uy = (fx.y1 - fx.y0) / L0;
    for (let i = 0; i < (m > 4 ? 3 : 1); i++) {
      if (!(v() < chance(0.7, dt))) continue;
      const s0 = 10 + v() * (L0 - 10), lado = v() < 0.5 ? -1 : 1, vv = 50 + v() * 70, sp = (v() - 0.5) * 60;
      this.p.push({ x: fx.x0 + ux * s0 - uy * lado * m, y: fx.y0 + uy * s0 + ux * lado * m, vx: -uy * lado * vv + ux * sp, vy: ux * lado * vv + uy * sp,
        idade: 0, vida: 0.08 + v() * 0.12, faisca: [150, 190, 255], rasto: true });
    }
  }

  /** the mock's `efeitosPasso` (1613–1643); `vivo` = new effects may start (not while dissolving) */
  private efeitos(t: number, dt: number, vivo: boolean): void {
    const B = this.pontoCab('boca'), v = this.visual, k = porQuadro(dt);
    if (vivo) {
      // her head's lights: up with the charge (from the jaws opening), full while she fires, fading after
      const ini = (f: Fatia): number => f.tA ?? f.t1 - 0.34;
      const fc = this.fatias.find((f) => t >= ini(f) && t < f.t3);
      const alvo = fc ? (t < fc.t1 ? (t - ini(fc)) / (fc.t1 - ini(fc)) : 1) : 0;
      this.luz = alvo >= this.luz ? alvo : this.luz * Math.exp(-dt / 0.35);
      // energy drawn INTO the mouth: sparks born on a ring around it, falling in faster and faster (a rate: at full
      // charge the mock spawned on every frame, so the chance per step is scaled, not compounded)
      if (fc && t < fc.t1 && B) for (let i = 0; i < (fc.salva ? 1 : 2); i++)
        if (v() < (0.45 + 0.55 * alvo) * Math.min(1, k)) this.atrai.push({ a: v() * 6.283, r0: (fc.salva ? 9 : 13) + v() * (fc.salva ? 7 : 11), idade: 0, vida: 0.2 + v() * 0.16 });
      // as a beam dies: discharges off the jaws and the residue — vapour leaving the mouth along the last aim, straight
      const fim = this.fatias.find((f) => t >= f.t3 - 0.12 && t < f.t3);
      if (fim && B) {
        const curto = !!fim.salva && !fim.recupera;
        this.desc = Math.max(this.desc, curto ? 0.45 : 1);
        const ang = angDe(B, fim.ate);
        for (let i = 0, n = this.quantos(curto ? 1 : 3, dt); i < n; i++) {
          const a = ang + (v() - 0.5) * 0.9, vv = 8 + v() * 16;
          this.vapor.push({ x: B.x + (v() - 0.5) * 3, y: B.y + (v() - 0.5) * 3, vx: Math.cos(a) * vv, vy: Math.sin(a) * vv, idade: 0, vida: 0.8 + v() * 0.7, r0: 1 + v() * 1.5 });
        }
      }
    } else this.luz *= Math.exp(-dt / 0.35);
    for (const p of this.atrai) p.idade += dt;
    this.atrai = this.atrai.filter((p) => p.idade < p.vida);
    this.desc *= Math.exp(-dt / 0.45);
    for (const p of this.vapor) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.idade += dt;
    }
    this.vapor = this.vapor.filter((p) => p.idade < p.vida);
    for (const e of this.estouros) e.idade += dt;
    this.estouros = this.estouros.filter((e) => e.idade < e.vida);
    for (let x = 0; x < W; x++) this.casco[x] *= Math.exp(-dt / 1.4);
  }

  /** the screen kicks when a big beam fires (2 px, gone in 0.16 s) */
  private treme(t: number): void {
    const f = this.fatias.find((g) => !g.salva && t >= g.t1 && t < g.t1 + 0.16);
    if (!f) return;
    const a = 2 * (1 - (t - f.t1) / 0.16), v = this.visual;
    this.corpo.treme(Math.round((v() - 0.5) * 2 * a), Math.round((v() - 0.5) * 2 * a));
  }

  /** what the beam hurts: its band (only what is drawn, the front included) touching the ship's box */
  morde(esq: number, dir: number, topo: number, base: number): boolean {
    const fx = this.feixe;
    return !this.abortado && !!fx && feixeNaCaixa(fx, fx.meia, esq, dir, topo, base);
  }

  /** her head died: the beam goes out at once; the rest (the scorch, the vapour, the sparks) fades in `HAB.aborta` s */
  abortar(): void {
    this.abortado = true;
    this.tAborto = 0;
    this.feixe = null;
    this.mostrando = false;
  }

  /** the mock's `varreDesenha` (1662–1795), then the loose bits (`desenhaGas`) */
  desenhar(put0: Put): void {
    const alfa = this.abortado ? Math.max(0, 1 - this.tAborto / HAB.aborta) : 1;
    if (alfa <= 0) return;
    const put: Put = alfa >= 1 ? put0 : (x, y, c, a = 1) => put0(x, y, c, a * alfa);
    const t = this.tq, fx = this.feixe, v = this.visual;
    const E = this.abortado ? null : this.pontoCab('olho'), B = this.abortado ? null : this.pontoCab('boca');
    // the scorch on the plate where the beam cut: white-hot → orange → red, cooling (a glow just over the plate)
    for (let x = 0; x < W; x++) {
      const h = this.casco[x];
      if (h < 0.03) continue;
      const cor = h > 0.7 ? [255, 238, 200] : h > 0.42 ? [255, 150, 60] : h > 0.2 ? [205, 70, 30] : [130, 34, 22];
      put(x, CRISTA, cor, Math.min(1, h * 1.5));
      put(x, CRISTA + 1, cor, Math.min(1, h * 0.9));
      put(x, CRISTA + 2, cor, h * 0.4);
      if (h > 0.3) put(x, CRISTA - 1, [255, 190, 120], (h - 0.3) * 0.5);
    }
    // the residue: soft dithered puffs, spreading and thinning
    for (const p of this.vapor) {
      const u = p.idade / p.vida, r = p.r0 + 4 * u, a = 0.32 * (1 - u);
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        const X = Math.round(p.x + dx), Y = Math.round(p.y + dy);
        if (BAYER[(Y & 3) * 4 + (X & 3)] / 16 < (1 - d / (r + 0.5)) * 0.9) put(X, Y, [140, 200, 255], a);
      }
    }
    if (!this.abortado) for (const f of this.fatias) {
      if (f.pendente || t < f.t0 || t >= f.t2) continue;
      const c = Math.min(1, (t - f.t0) / f.carga), carregando = t < f.t1;
      // the path still to come: a faint shading, exactly where the beam will pass (never over her head)
      const P = this.caminhoDe(f), uAgora = carregando ? 0 : Math.min(1, (t - f.t1) / f.dur), dens = carregando ? 0.04 + 0.05 * c : 0.05;
      for (let y = 0; y < CRISTA; y++) for (let x = 0; x < 226; x++) {
        const pv = P[y * W + x];
        if (pv !== Infinity && pv >= uAgora && BAYER[(y & 3) * 4 + (x & 3)] / 16 < dens) put(x, y, [120, 150, 255], 0.22);
      }
      if (!carregando) continue;
      // READ: a small pulse from her eye at each reading (every 0.15 s while she follows the ship; once per salvo shot)
      if (E) {
        const pulsos = f.tE !== undefined ? [f.t0, f.tE, 0.15] : [f.t1 - 0.7, f.t1 - 0.55, 0.15];
        if (t >= pulsos[0] && t < pulsos[1]) {
          const p = ((t - pulsos[0]) % pulsos[2]) / pulsos[2];
          anel(put, E.x, E.y, 1.5 + 5 * p, [190, 220, 255], 0.75 * (1 - p));
        }
      }
      // REHEARSE: her eye's focus runs the path once, ONE straight line from the eye
      const tf0 = f.tC !== undefined ? (f.tE ?? f.t0) : (f.tFoco?.[0] ?? f.t1 - 0.6), tf1 = f.tC !== undefined ? f.tC : (f.tFoco?.[1] ?? f.t1 - 0.3);
      if (E && t >= tf0 && t < tf1) {
        const u = (t - tf0) / (tf1 - tf0), foco = feixe(E, angDe(E, f.de + (f.ate - f.de) * u)), LF = Math.hypot(foco.x1 - foco.x0, foco.y1 - foco.y0);
        for (let s = 3; s < LF; s += 0.5)
          put(foco.x0 + ((foco.x1 - foco.x0) * s) / LF, foco.y0 + ((foco.y1 - foco.y0) * s) / LF, [200, 222, 255], (0.3 + 0.2 * c) * (1 - (0.6 * s) / LF));
      }
      // her eye: a soft glint while she reads; from the end of the focus pass it LOCKS — a flash, then a steady hard glint
      if (E) {
        if (t < tf1) brilho(put, E.x, E.y, 2.2, [240, 248, 255], NUCLEO.ciano, 0.6 + 0.3 * Math.sin(t * 30));
        else if (t < tf1 + 0.08) brilho(put, E.x, E.y, 4, [255, 255, 255], [220, 236, 255], 1);
        else brilho(put, E.x, E.y, 2.4, [250, 252, 255], NUCLEO.ciano, 1);
      }
      // WIND-UP: energy falls into her mouth, and a small sphere of it grows there, flickering
      const tCarga = f.tA ?? f.t1 - 0.34;
      if (B && t >= tCarga) {
        const cw = Math.min(1, (t - tCarga) / (f.t1 - tCarga)), r = (f.salva ? 1.5 + 2.2 * cw : 2 + 3.6 * cw) + (v() - 0.5) * 0.5;
        brilho(put, B.x, B.y, r + 3 + 2 * cw, [150, 225, 255], [110, 190, 255], 0.35 + 0.25 * cw);
        for (const p of this.atrai) {
          const u = p.idade / p.vida, rr = p.r0 * Math.pow(1 - u, 1.6);
          if (rr < r) continue;
          const ca = Math.cos(p.a), sa = Math.sin(p.a);
          linha(put, B.x + ca * rr, B.y + sa * rr, B.x + ca * (rr + 1.5 + 3 * u), B.y + sa * (rr + 1.5 + 3 * u), u > 0.6 ? [235, 245, 255] : [120, 190, 255], 0.5 + 0.5 * u);
        }
        for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          const d = Math.hypot(dx, dy);
          if (d <= r) put(B.x + dx, B.y + dy, d < r - 1 ? [238, 246, 255] : COR.ciano);
        }
      }
    }
    // the beam, in layers: a thin white core, her electric blue, and an outer cyan glow whose opacity ripples outward
    // along it; a pixel of tremor; a flare on her mouth; a burn where it meets the hull. Per pixel, by its distance to
    // the beam's line, so the glow is not stacked
    if (fx && fx.meia > 0) {
      const L = Math.hypot(fx.x1 - fx.x0, fx.y1 - fx.y0) || 1, ux = (fx.x1 - fx.x0) / L, uy = (fx.y1 - fx.y0) / L;
      const m = fx.meia + (Math.floor(t * 30) % 2) * (fx.meia > 4 ? 0.6 : 0.3), halo = fx.meia > 4 ? 4 : 2, nuc = Math.max(0.75, m * 0.2);
      const Rr = m + halo, bx0 = Math.floor(Math.min(fx.x0, fx.x1) - Rr), bx1 = Math.ceil(Math.max(fx.x0, fx.x1) + Rr);
      const by0 = Math.floor(Math.min(fx.y0, fx.y1) - Rr), by1 = Math.ceil(Math.max(fx.y0, fx.y1) + Rr);
      for (let Y = Math.max(0, by0); Y <= Math.min(H - 1, by1); Y++) for (let X = Math.max(0, bx0); X <= Math.min(W - 1, bx1); X++) {
        const px = X - fx.x0, py = Y - fx.y0, s = px * ux + py * uy;
        if (s < 0 || s > L) continue;
        const aw = Math.abs(-px * uy + py * ux);
        if (aw > Rr) continue;
        if (aw <= nuc) put(X, Y, [248, 252, 255]);
        else if (aw <= m * 0.7) put(X, Y, COR.ciano);
        else put(X, Y, [120, 215, 255], (0.72 + 0.28 * Math.sin(s * 0.16 - t * 38)) * 0.8 * (1 - (aw - m * 0.7) / (Rr - m * 0.7)));
      }
      const flares: [number, number, number][] = [[fx.x0, fx.y0, fx.meia > 4 ? 7 : 4]];
      if (fx.bate) flares.push([fx.x1, CRISTA - 2, 4]);
      for (const [cx, cy, r] of flares) brilho(put, cx, cy, r, [240, 246, 255], NUCLEO.ciano, 1);
      // the front, while it runs: a bulb of energy at its tip
      if (fx.frente < 1) brilho(put, fx.x1, fx.y1, m + 2.5, [255, 255, 255], [150, 225, 255], 1);
      // the shot's flash: a burst on her mouth (the screen kicks: `treme`)
      if (fx.ds < 0.12) {
        const kk = fx.ds / 0.12;
        brilho(put, fx.x0, fx.y0, (fx.salva ? 7 : 13) * (1 - 0.45 * kk), [255, 255, 255], [190, 230, 255], 1 - 0.5 * kk);
      }
      // short jagged arcs jumping off its edges, new every frame (his, 10th round: "faíscas elétricas"; they do not hurt)
      const grosso = fx.meia > 4;
      for (let i = 0; i < (grosso ? 6 : 3); i++) {
        const s0 = 14 + v() * (L - 14), lado = v() < 0.5 ? -1 : 1, comp = 4 + v() * (grosso ? 11 : 7), n = 3 + Math.floor(v() * 2);
        let xa = fx.x0 + ux * s0 - uy * lado * fx.meia, ya = fx.y0 + uy * s0 + ux * lado * fx.meia, sa = s0;
        for (let p = 1; p <= n; p++) {
          sa += (v() - 0.35) * 4;
          const o = fx.meia + (comp * p) / n + (v() - 0.5) * 2;
          const xb = fx.x0 + ux * sa - uy * lado * o, yb = fx.y0 + uy * sa + ux * lado * o;
          linha(put, xa, ya, xb, yb, p === 1 ? [235, 245, 255] : [150, 185, 255], 1 - (0.45 * p) / n);
          xa = xb;
          ya = yb;
        }
      }
    }
    // after the shot: discharges crawling off her jaws, fading — they follow her head through the recoil
    if (B && this.desc > 0.05) {
      const n = Math.round(2 + 5 * this.desc);
      for (let i = 0; i < n; i++) {
        if (v() > 0.4 + 0.6 * this.desc) continue;
        let a = v() * 6.283, xa = B.x + Math.cos(a) * 2, ya = B.y + Math.sin(a) * 2;
        const comp = 5 + v() * 9 * (0.4 + 0.6 * this.desc);
        for (let p = 1; p <= 3; p++) {
          a += (v() - 0.5) * 1.4;
          const xb = xa + (Math.cos(a) * comp) / 3, yb = ya + (Math.sin(a) * comp) / 3;
          linha(put, xa, ya, xb, yb, p === 1 ? [240, 248, 255] : [140, 200, 255], Math.min(1, 0.4 + this.desc) * (1 - (0.3 * p) / 3));
          xa = xb;
          ya = yb;
        }
      }
    }
    // the small bursts where the beam bites the plate
    for (const e of this.estouros) {
      const kk = e.idade / e.vida;
      brilho(put, e.x, e.y, e.r * (0.6 + 0.6 * kk), [255, 245, 220], [255, 170, 80], 1 - kk);
    }
    this.p.desenhar(put);
  }
}
