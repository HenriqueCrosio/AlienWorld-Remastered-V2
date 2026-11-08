/**
 * THE EEL'S FIGHT, FRAME BY FRAME (the approved mock's main loop, `_enguia-maquete.mjs` 172–480, ported line by line;
 * plan `2026-11-08-enguia-instalacao.md`, Task 8). What the mock did for its probe player (moving, firing, counting) is
 * left to the caller; what it did for HER is here, in the same order, cut where the caller steps in:
 *   antes(t, dt, nave)  the blocks of the live choreography, the skills starting, the head's gesture and turn, the
 *                       Echo's spit, the scrape on the breach's rim, the breach's tell
 *   grava(x, y)         the ship's place this frame (the Echo reads it)
 *   fere(caixa)         what hurts the ship now
 *   faisca(x, y)        the mock's hit spark (its probe's shots only — the game has its own)
 *   depois(dt)          the breathers, the bites, the skull, the geysers' looks, the death, the fusion, the particles
 *   cena()              the frame's state for `quadro`
 * The life decides (`pedeMordida`, `mata`); the oracle asks them at the mock's own times (`roteiro=maquete`).
 * Per-frame chances and counts follow the mock at any `dt` (`chance`, `porQuadro`; at 1/30 s they are the mock's).
 */
import { chance, porQuadro } from '../numerosHab.ts';
import { Canos } from './canos.ts';
import { cabecaParaTela, pose, poseCabeca, tresDaCaudaVisiveis } from './corpo.ts';
import { bocaNaTela, pixelsDaCabeca, type Desenho, type EstadoDesenho, type Particula, type Pfx } from './desenho.ts';
import { Eco, Trilha } from './eco.ts';
import * as Efeitos from './efeitos.ts';
import { fissuras, geiseresDoTrecho, lombada } from './geiseres.ts';
import { MERGULHOS, chuteCanos, chuteMordida, quadroCanos, quadroEco, quadroMergulho, quadroMordida, quadroNadar, quadroPrepara, quadroPresa, type EstadoNadar, type Gestos, type QuadroGesto } from './gestos.ts';
import { LCG, N as NUM, type Numeros } from './numeros.ts';
import { folga, perigos, type Mundo, type Perigo } from './perigos.ts';
import { Respiros } from './respiros.ts';
import { RoteiroVivo, corteCanos } from './roteiro.ts';
import type { Geiser, Med, Mordida, Ponto, Pose, Trecho } from './tipos.ts';

type RGB = readonly number[];
const hex = (h: string): RGB => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
// the game's flesh ramps (`src/systems/morte/pedacos.ts`): the oily fluid with its orange glint, and the flesh reds
const FLUIDO = ['0a0608', '140a0a', '1a0b06', '2c0b04', '4a1d05', '5c2300', '7d2900', '913300', 'b5500c'].map(hex);
const CARNE = ['0c040c', '1c0c14', '2c0c1c', '3c1424', '541c2c', '6c2434', '94343c', 'b84850', 'd87060'].map(hex);
const VENENO: RGB[] = [[10, 30, 24], [18, 60, 40], [28, 110, 66], [52, 168, 92], [104, 224, 116], [170, 248, 140], [224, 255, 186], [244, 255, 226]];
export const MORDIDA_CRANIO = { x: 48, y: 4, r: 7 };

interface Pedido { pct: number; tPedido: number; cursor: number }
interface Raspado { x: number; y: number; dx: number; dy: number; ox: number; oy: number; t: number }

export interface OpcLuta {
  /** the dice: the pipes' free lane, the looks (the oracle: 20261107 and 5, the mock's) */
  sementes?: { rnd: number; sorte: number };
  /** the oracle's script: the fusion's stand-in lights drawn (the game has its own scene) */
  maquete?: boolean;
}

export class LutaEnguia {
  readonly N: Numeros = NUM;
  readonly med: Med;
  readonly G: Gestos;
  readonly D: Desenho;
  readonly R: RoteiroVivo;
  readonly mord: Mordida[] = [];
  readonly canos: Canos[] = [];
  readonly ecos: Eco[] = [];
  readonly geis: Geiser[] = [];
  readonly trilha = new Trilha();
  readonly respiros: Respiros;
  readonly pfx: Pfx;
  readonly particulas: Particula[] = [];
  readonly maquete: boolean;
  t = 0;
  /** the frame's index (the mock's `f`: the geysers' cap reads it) */
  f = -1;
  giro = 0;
  /** the final stretch is on (the skull was bitten) */
  final = false;
  cranio: { t: number } | null = null;
  morta = false;
  private readonly rnd: () => number;
  private readonly sorte: () => number;
  private readonly canosDe = new Map<Trecho, Canos>();
  private readonly ecoDe = new Map<Trecho, Eco>();
  private readonly respira: EstadoNadar = {};
  private readonly vistaCache = new Map<Trecho, number>();
  private readonly raspado: Raspado[] = [];
  private readonly pedidos: Pedido[] = [];
  private novas: Mordida[] = [];
  private cranioFeito = false;
  private desfeita = false;
  private ciclo = 1;
  /** C3 built for this cycle's way back */
  private postoFeito = 0;
  private efemeras: Particula[] = [];
  // this frame
  P!: Pose;
  gesto: QuadroGesto | null = null;
  agora: Perigo[] = [];
  private e!: ReturnType<RoteiroVivo['estado']>;

  constructor(med: Med, G: Gestos, D: Desenho, opc: OpcLuta = {}) {
    this.med = med;
    this.G = G;
    this.D = D;
    this.maquete = !!opc.maquete;
    const sem = opc.sementes ?? { rnd: (Math.random() * 2 ** 32) >>> 0, sorte: (Math.random() * 2 ** 32) >>> 0 };
    this.rnd = LCG(sem.rnd);
    this.sorte = LCG(sem.sorte);
    // (the posts' coil: the rings she has, less the tail bites asked and still waiting to land)
    this.R = new RoteiroVivo(this.N, med, { aneisNoPosto: () => this.nAneis - this.N.mordida.aneis * this.pedidos.length });
    this.R.chegada();
    this.respiros = new Respiros(this.R, this.N, med);
    this.pfx = { mod: Efeitos, camada: new Efeitos.Camada(this.N.tela.W, this.N.tela.H), vivos: [], estouro: null, fusao: null };
    this.blocoNovo();
  }

  get nAneis(): number {
    let n = this.N.corpo.aneis;
    for (const m of this.mord) if (!m.cranio) n -= this.N.mordida.aneis;
    return n;
  }
  get trecho(): Trecho {
    return this.R.estado(this.t).trecho;
  }
  /** she may die now: the Echo's pause of the final stretch */
  get podeMorrer(): boolean {
    const tr = this.trecho;
    return this.final && tr.hab === 'eco' && !this.morta;
  }
  get morrendo(): boolean {
    return this.morta;
  }
  /** nothing hurts her: the fusion's pause and the death */
  get imune(): boolean {
    return this.morta || this.trecho.hab === 'fusao';
  }
  /** the death has played to its end */
  get acabou(): boolean {
    return this.morta && this.t >= this.R.T;
  }

  // ─── the life's events ───
  /** a bite asked: 22 / 13 → the tail when it shows; 5 → the skull and the final stretch (at `t`, default now) */
  pedeMordida(pct: number, t = this.t, relCanos?: number): void {
    if (pct === 5) {
      if (this.cranio) return;
      this.cranio = { t };
      this.final = true;
      const tr = this.R.estado(t).trecho;
      if (tr.hab === 'canos' && tr === this.R.ultimo) {
        const rel = relCanos ?? t - tr.t0;
        this.R.cortaCanos(rel);
        const C = this.canosDe.get(tr);
        if (C) C.corte = rel;
      }
      return;
    }
    this.pedidos.push({ pct, tPedido: t, cursor: t });
  }
  /** the life reached 0 in the den: the death starts at `t` (default now) */
  mata(t = this.t): void {
    if (this.morta) return;
    this.morta = true;
    this.R.corta(t);
    this.R.morte();
    for (const E of this.ecos) E.apagado = true; // (her seeds die with her: the Capitânia's rule)
    this.blocoNovo();
  }

  // ─── the blocks of the live choreography ───
  private blocoNovo(): void {
    const R = this.R;
    for (const tr of R.trechos) if (tr.sob && !this.geis.some((g) => g.tAviso >= tr.t0 && g.tAviso <= tr.t1)) this.geis.push(...geiseresDoTrecho(R, this.N, tr));
    const u = R.ultimo;
    this.respiros.estalos.avanca(u.tipo === 'pausa' && !this.morta ? u.t0 : R.T);
  }
  private monta(t: number): void {
    const R = this.R;
    for (let guarda = 0; guarda < 4; guarda++) {
      const u = R.ultimo;
      // C3: the post, as soon as she is on her way back (its coil wants the rings she will have)
      const e = R.estado(t);
      if (e.trecho.nome === 'volta' && this.postoFeito < (e.trecho.ciclo ?? 0) && !this.morta) {
        this.postoFeito = e.trecho.ciclo ?? 0;
        if (this.final) {
          R.posto(this.ciclo + 1, false);
          R.mergulhoErguida(this.ciclo + 1, true);
        } else R.posto(this.ciclo + 1);
        this.ciclo++;
        this.blocoNovo();
        continue;
      }
      if (!R.noFim(t) || this.morta) return;
      if (u.hab === 'canos') R.mergulhoErguida(this.ciclo, this.final);
      else if (u.hab === 'eco') {
        if (this.final) R.ecoFinal(this.ciclo);
        else R.sobVolta(this.ciclo);
      } else if (u.nome === 'posto') R.mergulhoErguida(this.ciclo, true); // (the post without pipes: the final dive)
      else return;
      this.blocoNovo();
    }
  }

  // ─── the mock's looks ahead ───
  private vistaNoTrecho(tr: Trecho): number {
    let v = this.vistaCache.get(tr);
    if (v == null) {
      v = tr.t1 - tr.t0;
      for (let u = tr.t0; u < tr.t1; u += 1 / 30) {
        const C = poseCabeca(this.R, this.N, this.med, u).cabeca;
        if (C.focinho.y < -10 || C.focinho.y > this.N.tela.H || C.focinho.x < -10 || C.focinho.x > this.N.tela.W + 10) { v = u - tr.t0; break; }
      }
      this.vistaCache.set(tr, v);
    }
    return v;
  }
  private podeRespirar(t0: number): number {
    const R = this.R, N = this.N;
    for (let u = t0; u <= t0 + 2.4 + 1e-9; u += 0.05) {
      const tr = R.estado(u).trecho;
      let livre = !(tr.hab || tr.prepara || MERGULHOS.includes(tr.nome) || quadroPrepara(u, R.trechos) != null);
      if (livre) {
        const C = poseCabeca(R, N, this.med, u).cabeca, kV = Math.round((C.fi * 180) / Math.PI / 10);
        if (C.focinho.y < -10 || C.focinho.y > N.tela.H || C.focinho.x < -10 || C.focinho.x > N.tela.W + 10 || (kV > 0 && kV < 18)) livre = false;
      }
      if (!livre) return u - t0 - 0.05;
    }
    return 2.4;
  }

  private nasce(p: Partial<Particula> & { vida: number }): void {
    this.particulas.push({ x: 0, y: 0, idade: 0, tam: 1, ...p });
  }

  get mundo(): Mundo {
    return { R: this.R, N: this.N, med: this.med, mord: this.mord, canos: this.canos, ecos: this.ecos, geis: this.geis, giro: () => this.giro };
  }

  // ─── the mock 172–301 ───
  antes(t: number, dt: number, nave: Ponto): void {
    const { R, N, med, G, sorte } = this;
    this.t = t;
    this.f++;
    if (this.maquete) this.roteiroDaMaquete(t);
    this.monta(t);
    // the tail's bites asked: they land when 2 of the 3 rings to go are in sight (the mock's `mordidas`, 1/60 s steps)
    this.novas = [];
    for (let i = 0; i < this.pedidos.length; ) {
      const p = this.pedidos[i], n = this.nAneis;
      let caiu = false;
      for (; p.cursor <= t; p.cursor += 1 / 60) if (tresDaCaudaVisiveis(R, N, p.cursor, n)) { caiu = true; break; }
      if (!caiu) { i++; continue; }
      const m: Mordida = { pct: p.pct, tPedido: p.tPedido, t: p.cursor, de: n - N.mordida.aneis, ate: n };
      this.mord.push(m);
      this.novas.push(m);
      this.pedidos.splice(i, 1);
    }
    const e = (this.e = R.estado(t)), tr = e.trecho;

    // the skills start at their pauses
    if (tr.hab === 'canos' && !this.canosDe.has(tr)) {
      const C = new Canos(tr.t0, N, this.rnd, tr.corte ?? null);
      this.canosDe.set(tr, C);
      this.canos.push(C);
      // (the final stretch began on the way to the post: the pipes never fire, she goes straight to the dive)
      if (this.final && C.corte == null) {
        R.cortaCanos(t - tr.t0);
        C.corte = t - tr.t0;
      }
    }
    if (tr.hab === 'eco' && !this.ecoDe.has(tr)) { const E = new Eco(tr.t0, N, tr.final); this.ecoDe.set(tr, E); this.ecos.push(E); }
    for (const C of this.canos) C.atualiza(t, nave.y);

    // the head: in the Echo it follows the ship (±30°) and kicks as it spits; stuck, it slumps; before leaving rest it
    // draws back; at the pipes' charge it trembles
    const mord = this.mord, cranioT = this.cranio?.t ?? Infinity;
    const P0 = pose(R, N, med, t, { mord });
    const acima = Math.cos(P0.cabeca.ang) < 0 ? 1 : -1;
    const cabecaVisivel = P0.cabeca.focinho.y > -10 && P0.cabeca.focinho.y < N.tela.H && P0.cabeca.focinho.x > -10 && P0.cabeca.focinho.x < N.tela.W + 10;
    let alvoGiro = 0, rapido = 8;
    if (tr.hab === 'eco') {
      const alvo = Math.atan2(nave.y - P0.cabeca.pescoco.y, nave.x - P0.cabeca.pescoco.x);
      const d = Math.atan2(Math.sin(alvo - P0.cabeca.ang), Math.cos(alvo - P0.cabeca.ang));
      const lim = (N.eco.giro * Math.PI) / 180;
      alvoGiro = tr.t1 - t < 0.5 ? 0 : Math.max(-lim, Math.min(lim, d));
      rapido = 5;
    } else if (tr.hab === 'presa' || tr.hab === 'desfaz' || (tr.nome === 'afunda-morte' && e.tl > (tr.t1 - tr.t0) * 0.6)) {
      alvoGiro = (P0.cabeca.espelho ? 1 : -1) * 0.95;
      rapido = 3;
    } else if (tr.prepara && cabecaVisivel) {
      const k = Math.min(1, e.tl / (N.prepara.dur * 0.7));
      alvoGiro = acima * N.prepara.giro * k * k * (3 - 2 * k);
      rapido = 14;
    }
    this.giro += (alvoGiro - this.giro) * Math.min(1, dt * rapido);
    let tranco = 0;
    for (const E of this.ecos) for (const r of E.rodadas) if (t >= r.cospe && t < r.cospe + 0.35) tranco = acima * 0.22 * (1 - (t - r.cospe) / 0.35);
    const ultimoCanos = this.canos[this.canos.length - 1];
    if (tr.hab === 'canos') tranco += acima * chuteCanos(t, ultimoCanos);
    tranco += acima * chuteMordida(t, cranioT);
    let treme: Ponto | null = null;
    if (tr.hab === 'presa' || (t >= cranioT && t < cranioT + 0.45)) treme = { x: Math.round(sorte() * 2 - 1), y: Math.round(sorte() * 2 - 1) };
    else if (tr.hab === 'canos') {
      const q = ultimoCanos?.estado(t);
      if (q && q.fase === 'aviso' && sorte() < chance(q.k * 0.7, dt)) treme = { x: Math.round(sorte() * 2 - 1), y: Math.round(sorte() * 2 - 1) };
    }
    const P = (this.P = pose(R, N, med, t, { mord, giro: this.giro + tranco, treme }));
    // the head's gesture frame now (null = the E3 as approved)
    let gesto: QuadroGesto | null = null, gestoFixo = false;
    { const m = quadroMordida(t, cranioT); if (m) { gestoFixo = true; gesto = m[0] === 'eco' && !m[1] ? null : G[m[0]][m[1]]; } }
    if (!gestoFixo) { const k = quadroPresa(t, tr); if (k != null) { gestoFixo = true; gesto = G.agonia[k]; } }
    if (!gestoFixo && tr.hab === 'eco') { const k = quadroEco(t, this.ecos.flatMap((E) => E.rodadas)); if (k) gesto = G.eco[k]; }
    if (!gestoFixo && tr.hab === 'canos') { const k = quadroCanos(t, ultimoCanos); if (k) gesto = G.canos[k]; }
    if (!gesto && !gestoFixo) { const m = quadroMergulho(t, tr, R.trechos, MERGULHOS.includes(tr.nome) ? this.vistaNoTrecho(tr) : 0); if (m && m[1]) gesto = G[m[0]][m[1]]; }
    if (!gesto && !gestoFixo && !tr.hab && !MERGULHOS.includes(tr.nome) && cabecaVisivel) { const k = quadroPrepara(t, R.trechos); if (k) gesto = G.prepara[k]; }
    if (!gesto && !gestoFixo) { const k = quadroNadar(t, this.respira, (u) => this.podeRespirar(u)); if (k) gesto = G.nadar[k]; }
    this.gesto = gesto;
    const boca = (): Ponto => (gesto?.boca ? cabecaParaTela(P.cabeca, med, gesto.boca) : bocaNaTela(P, med));
    for (const E of this.ecos) {
      const antes = E.rodadas.map((r) => !!r.sementes);
      E.atualiza(t, this.trilha, boca());
      E.rodadas.forEach((r, i) => { // the spit's flash at the mouth
        if (!antes[i] && r.sementes) {
          const b = boca();
          for (let k = 0; k < 14; k++) { const an = sorte() * Math.PI * 2; this.nasce({ x: b.x, y: b.y, vx: Math.cos(an) * 40, vy: Math.sin(an) * 40, vida: 0.25, cor: [150, 220, 255] }); }
          this.nasce({ x: b.x, y: b.y, vx: 0, vy: 0, vida: 0.15, cor: [220, 245, 255], tam: 5 });
        }
      });
    }
    // ── the SCRAPE: where the edge of her body crosses the lip's metal while she moves — sparks, molten drops, shards,
    // and thick smoke that hides the clip; standing in the breach (the Echo), the rim keeps smoking
    const D = this.D, W = N.tela.W, kq = porQuadro(dt);
    const contato: Raspado[] = [];
    {
      const vel = Math.abs(R.estado(t + dt).s - e.s) / dt;
      const fumega = vel <= 30 && tr.cap === 'erguida';
      if (vel > 30 || fumega)
        for (let i = 0; i < P.tubo.length; i += 2) {
          const a = P.tubo[i];
          if (a.x < N.rombo.x0 - 40 || a.x > N.rombo.x1 + 40 || a.y < N.rombo.labio.y - a.r || a.y > N.tela.H + a.r) continue;
          const r1 = a.r;
          for (let Y = Math.floor(a.y - r1); Y <= a.y + r1; Y++)
            for (let X = Math.floor(a.x - r1); X <= a.x + r1; X++) {
              if (X < 0 || X >= W || Y < N.rombo.labio.y + 2 || Y >= N.tela.H) continue;
              const d = Math.hypot(X + 0.5 - a.x, Y + 0.5 - a.y), j = Y * W + X;
              if (d > r1 || !D.pertoBorda[j] || D.pertoBorda[j] > 3) continue;
              if (sorte() < chance(0.04, dt)) {
                const hx = X + 0.5 - N.rombo.x, hy = Y + 0.5 - 200, m = Math.hypot(hx, hy) || 1;
                contato.push({ x: X, y: Y, dx: a.dx, dy: a.dy, ox: hx / m, oy: hy / m, t });
              }
            }
        }
      for (const c of contato) if (sorte() < (fumega ? 0.12 : 0.25)) this.raspado.push({ ...c, t });
      if (fumega) for (const c of contato) if (sorte() < 0.5)
        this.nasce({ x: c.x + (sorte() - 0.5) * 8, y: c.y + (sorte() - 0.5) * 6, vx: (sorte() - 0.5) * 14 + c.ox * 8, vy: -6 - sorte() * 12, vida: 2.0 + sorte() * 1.2, cor: sorte() < 0.5 ? [52, 48, 52] : [36, 34, 38], tam: 3.5 + sorte() * 3, cresce: true, a: 0.5 });
      for (let i = this.raspado.length - 1; i >= 0; i--) {
        const c = this.raspado[i], idade = t - c.t, k = 1 - idade / 1.2;
        if (k <= 0) { this.raspado.splice(i, 1); continue; }
        if (sorte() < chance(0.12 * k, dt)) this.nasce({ x: c.x + (sorte() - 0.5) * 3, y: c.y, vx: (sorte() - 0.5) * 14, vy: -6 - sorte() * 12, vida: 1.6 + sorte() * 1.2, cor: sorte() < 0.5 ? [58, 54, 58] : [40, 38, 42], tam: 2.5 + sorte() * 2.5, cresce: true, a: 0.38 * k });
        if (sorte() < chance(0.08 * k, dt)) { const an = -Math.PI / 2 + (sorte() - 0.5) * 2.2, v = 40 + sorte() * 70; this.nasce({ x: c.x, y: c.y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.3 + sorte() * 0.4, cor: [255, 210, 120], arrasto: 1.4, gota: true }); }
      }
      const corFundo = D.fundo ?? D.labioTela;
      for (const c of fumega ? [] : contato.slice(0, Math.ceil(36 * kq))) {
        for (let k = 0; k < 2; k++) {
          const fora = sorte() < 0.75, bx = fora ? c.ox : c.dx, by = fora ? c.oy : c.dy;
          const v = fora ? 60 + sorte() * 110 : vel * (0.5 + sorte() * 0.6), an = (sorte() - 0.5) * (fora ? 1.6 : 0.8), ca = Math.cos(an), sa = Math.sin(an);
          const ux = bx * ca - by * sa, uy = bx * sa + by * ca;
          this.nasce({ x: c.x + c.ox * 2, y: c.y + c.oy * 2, vx: ux * v, vy: uy * v, vida: 0.2 + sorte() * 0.3, cor: sorte() < 0.35 ? [255, 252, 230] : sorte() < 0.7 ? [255, 214, 120] : [255, 150, 60], arrasto: 1.4, gota: true });
        }
        if (sorte() < 0.6) this.nasce({ x: c.x + (sorte() - 0.5) * 8, y: c.y + (sorte() - 0.5) * 8, vx: (sorte() - 0.5) * 14 + c.ox * 10, vy: -6 - sorte() * 12, vida: 2.0 + sorte() * 1.2, cor: sorte() < 0.5 ? [52, 48, 52] : [36, 34, 38], tam: 3.5 + sorte() * 3, cresce: true, a: 0.5 });
        if (sorte() < 0.35) { const an = sorte() * Math.PI * 2, v = 25 + sorte() * 55; this.nasce({ x: c.x, y: c.y, vx: Math.cos(an) * v + c.dx * 40, vy: Math.sin(an) * v + c.dy * 40, vida: 0.5 + sorte() * 0.5, cor: sorte() < 0.5 ? [255, 160, 60] : [255, 110, 30], tam: 1.5, arrasto: 1.2, gota: true }); }
        if (sorte() < 0.18) {
          const i0 = (c.y * N.tela.W + c.x) * 4, cor = [corFundo[i0], corFundo[i0 + 1], corFundo[i0 + 2]], an = sorte() * Math.PI * 2, v = 30 + sorte() * 60;
          const pedaco = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0]].slice(0, 2 + Math.floor(sorte() * 4)).map(([dx, dy]) => ({ dx, dy, c: cor, borda: true, brasa: sorte() < 0.5 }));
          this.nasce({ x: c.x, y: c.y, vx: Math.cos(an) * v + c.dx * 30, vy: Math.sin(an) * v + c.dy * 30, vida: 0.8 + sorte() * 0.6, arrasto: 0.8, pedaco });
        }
        if (sorte() < 0.7) this.nasce({ x: c.x + (sorte() - 0.5) * 6, y: c.y + (sorte() - 0.5) * 6, vx: (sorte() - 0.5) * 18 + c.dx * 15, vy: -8 - sorte() * 16 + c.dy * 15, vida: 1.6 + sorte() * 1.2, cor: sorte() < 0.5 ? [64, 60, 62] : [44, 42, 46], tam: 3 + sorte() * 3, cresce: true, a: 0.45 });
      }
    }
    // the breach's tell: dust breathing out of it before she breaks out
    for (const g of R.sinais) if (t >= g.t0 && t < g.t1 && sorte() < chance(0.8, dt))
      this.nasce({ x: g.x + (sorte() - 0.5) * 60, y: N.crista + sorte() * 40, vx: (sorte() - 0.5) * 16, vy: -12 - sorte() * 22, vida: 0.7, cor: sorte() < 0.3 ? [90, 150, 170] : [70, 66, 70], tam: sorte() < 0.4 ? 1.5 : 1, a: 0.7 });
  }

  /** the ship this frame (the Echo's trail) */
  grava(x: number, y: number): void {
    this.trilha.grava(this.t, x, y);
    if (!this.maquete) this.trilha.esquece(this.t - 6); // (the game keeps the last seconds; the mock keeps the run)
    this.agora = perigos(this.mundo, this.t, this.P);
  }

  /** what hurts the ship (its box) now */
  fere(caixa: { x0: number; y0: number; x1: number; y1: number }): boolean {
    const c = { x: (caixa.x0 + caixa.x1) / 2, y: (caixa.y0 + caixa.y1) / 2 }, hit = { w: caixa.x1 - caixa.x0, h: caixa.y1 - caixa.y0 };
    for (const h of this.agora) if (folga(c, hit, h.forma) < 0) return true;
    return false;
  }

  /** the mock's hit spark (its probe's shots) */
  faisca(x: number, y: number): void {
    this.nasce({ x, y, vx: -20, vy: (this.sorte() - 0.5) * 30, vida: 0.12, cor: [255, 240, 180] });
  }

  // ─── the mock 336–459 ───
  depois(dt: number): void {
    const { R, N, med, sorte, P } = this, t = this.t, e = this.e, tr = e.trecho;
    this.respiros.passo(t, dt, P);
    for (const m of this.novas) { // the bite: the three rings off the tail burst
      const ant = pose(R, N, med, t, { mord: [] });
      for (let k = m.de as number; k < (m.ate as number); k++) {
        const a = ant.aneis[k];
        if (!a) continue;
        for (let i = 0; i < 46; i++) { const an = sorte() * Math.PI * 2, v = 15 + sorte() * 50; this.nasce({ x: a.x + Math.cos(an) * a.r * sorte(), y: a.y + Math.sin(an) * a.r * sorte(), vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.7 + sorte() * 0.6, cor: sorte() < 0.25 ? [255, 160, 64] : [86, 90, 102] }); }
        this.nasce({ x: a.x, y: a.y, vx: 0, vy: 0, vida: 0.16, cor: [255, 200, 120], tam: Math.max(3, a.r * 0.5), a: 0.85 });
      }
    }
    // the stump's jet for 1.2 s after each bite
    for (const m of this.mord.filter((q) => !q.cranio && t >= q.t && t < q.t + 1.2)) {
      void m;
      const ultimo = P.aneis[P.aneis.length - 1];
      if (ultimo && sorte() < chance(0.7, dt)) this.nasce({ x: ultimo.x - ultimo.dx * ultimo.r, y: ultimo.y - ultimo.dy * ultimo.r, vx: -ultimo.dx * 70 + (sorte() - 0.5) * 20, vy: -ultimo.dy * 70 + (sorte() - 0.5) * 20, vida: 0.35, cor: [88, 200, 255] });
    }
    if (this.cranio && !this.cranioFeito && t >= this.cranio.t) {
      this.cranioFeito = true;
      const c = pose(R, N, med, t, { mord: this.mord }).cabeca;
      const p = { x: c.pescoco.x + (c.focinho.x - c.pescoco.x) * 0.55, y: c.pescoco.y + (c.focinho.y - c.pescoco.y) * 0.55 - 18 };
      for (let i = 0; i < 40; i++) { const an = sorte() * Math.PI * 2, v = 20 + sorte() * 60; this.nasce({ x: p.x, y: p.y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.6 + sorte() * 0.5, cor: sorte() < 0.3 ? [255, 140, 48] : [104, 108, 120] }); }
      this.nasce({ x: p.x, y: p.y, vx: 0, vy: 0, vida: 0.3, cor: [255, 236, 200], tam: 9, cresce: true });
    }
    const pfx = this.pfx;
    for (const g of this.geis) {
      const yc = this.D.trilha[Math.round(g.x)];
      // the steam left behind (pixelfx's `poison-cloud`; the old puffs still roll their dice, unseen)
      if (Math.abs(t - g.tFim) < dt / 2) { const v = Efeitos.vaporFx(g.x, yc, Math.round(g.x)); v.para = t + N.geiser.vapor; pfx.vivos.push(v); }
      if (Math.abs(t - g.tFim) < dt / 2) for (let i = 0; i < 34; i++) void [g.x + (sorte() - 0.5) * 18, N.geiser.topo + sorte() * (yc - N.geiser.topo), (sorte() - 0.5) * 36, -8 - sorte() * 22, N.geiser.vapor * (0.7 + sorte() * 0.6), sorte() < 0.5, 2 + sorte() * 3];
      if (t >= g.tAviso && t < g.tColuna && sorte() < chance(0.6, dt)) this.nasce({ x: g.x + (sorte() - 0.5) * 14, y: yc - 1, vx: (sorte() - 0.5) * 14, vy: -14 - sorte() * 18, vida: 0.45, cor: [150, 230, 170], tam: 1.5, a: 0.6 });
      if (Math.abs(t - g.tColuna) < dt / 2) for (let i = 0; i < 16; i++) {
        const an = -Math.PI / 2 + (sorte() - 0.5) * 2.4, v = 60 + sorte() * 90;
        this.nasce({ x: g.x + (sorte() - 0.5) * 8, y: yc, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.6 + sorte() * 0.5, cor: VENENO[3 + Math.floor(sorte() * 4)], tam: sorte() < 0.4 ? 1.5 : 1, arrasto: 1.4, gota: true });
      }
      if (t >= g.tColuna && t < g.tFim && sorte() < chance(0.9, dt)) for (let i = 0; i < 2; i++) {
        const lado = sorte() < 0.5 ? -1 : 1, y = N.geiser.topo + sorte() * (yc - N.geiser.topo);
        this.nasce({ x: g.x + lado * 7, y, vx: lado * (30 + sorte() * 60), vy: -20 - sorte() * 50, vida: 0.5 + sorte() * 0.5, cor: VENENO[3 + Math.floor(sorte() * 4)], tam: sorte() < 0.3 ? 1.5 : 1, arrasto: 1.6, gota: true });
      }
    }
    // ── the death: the head BLOWS APART, then the torn neck pumps her fluid out in pulses that weaken
    if (tr.hab === 'desfaz' && !this.desfeita) {
      this.desfeita = true;
      const ps = pixelsDaCabeca(this.D, P, { mordida: MORDIDA_CRANIO });
      const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
      const cor0 = (p: { c: RGB }): RGB => p.c ?? [104, 108, 120];
      const celulas = new Map<string, { x: number; y: number; c: RGB }[]>();
      for (const p of ps) { const k = `${Math.floor(p.x / 5)},${Math.floor(p.y / 5)}`; if (!celulas.has(k)) celulas.set(k, []); (celulas.get(k) as { x: number; y: number; c: RGB }[]).push(p); }
      for (const cel of celulas.values()) {
        const mx = cel.reduce((a, p) => a + p.x, 0) / cel.length, my = cel.reduce((a, p) => a + p.y, 0) / cel.length;
        const an = Math.atan2(my - cy, mx - cx) + (sorte() - 0.5) * 0.7, v = 25 + sorte() * 70;
        if (cel.length >= 6 && sorte() < 0.7) {
          const tem = new Set(cel.map((p) => `${p.x},${p.y}`));
          this.nasce({ x: mx, y: my, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 1.2 + sorte() * 0.9, arrasto: 0.5,
            pedaco: cel.map((p) => ({ dx: p.x - mx, dy: p.y - my, c: cor0(p), brasa: sorte() < 0.3, borda: [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !tem.has(`${p.x + a},${p.y + b}`)) })) });
        } else for (const p of cel) this.nasce({ x: p.x, y: p.y, vx: Math.cos(an) * v * 0.7, vy: Math.sin(an) * v * 0.7, vida: 0.6 + sorte() * 0.7, cor: cor0(p), arrasto: 0.6 });
      }
      pfx.estouro = { t, x: cx, y: cy };
      this.nasce({ x: cx, y: cy, vx: 0, vy: 0, vida: 0.5, cor: [255, 200, 140], tam: 9, anel: true });
      this.nasce({ x: cx, y: cy, vx: 0, vy: 0, vida: 0.75, cor: [200, 70, 40], tam: 6, anel: true, a: 0.6 });
      for (let i = 0; i < 46; i++) { const an = sorte() * Math.PI * 2, v = 60 + sorte() * 120; this.nasce({ x: cx, y: cy, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.4 + sorte() * 0.5, cor: sorte() < 0.5 ? [255, 210, 120] : [255, 120, 40], arrasto: 1.2 }); }
      for (let i = 0; i < 34; i++) { const an = sorte() * Math.PI * 2, v = 50 + sorte() * 110; this.nasce({ x: cx + (sorte() - 0.5) * 10, y: cy + (sorte() - 0.5) * 10, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 1.0 + sorte() * 1.0, cor: sorte() < 0.5 ? CARNE[4 + Math.floor(sorte() * 5)] : FLUIDO[4 + Math.floor(sorte() * 5)], tam: sorte() < 0.5 ? 1.5 + sorte() * 1.5 : 1, arrasto: 0.8, gota: true }); }
      for (let i = 0; i < 16; i++) { const an = sorte() * Math.PI * 2, v = 10 + sorte() * 30; this.nasce({ x: cx + (sorte() - 0.5) * 14, y: cy + (sorte() - 0.5) * 14, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.9 + sorte() * 0.7, cor: CARNE[2 + Math.floor(sorte() * 4)], tam: 3 + sorte() * 3, cresce: true, a: 0.55, arrasto: 1 }); }
    }
    if ((tr.hab === 'desfaz' || tr.hab === 'resto' || tr.hab === 'fim') && this.desfeita) {
      const morte0 = (R.trechos.find((q) => q.hab === 'desfaz') as Trecho).t0, tm = t - morte0;
      const forca = Math.exp(-tm / 2.2), pulso = tm % 0.34 < dt;
      const a = P.tubo[Math.min(P.tubo.length - 1, 8)], b = P.tubo[0];
      const fx = b.x + (a.x - b.x) * 0.2, fy = b.y + (a.y - b.y) * 0.2, ux = a.dx, uy = a.dy;
      const n = pulso ? Math.round(16 * forca) + 3 : sorte() < chance(0.6 * forca, dt) ? 1 : 0;
      for (let i = 0; i < n; i++) {
        const v = (pulso ? 70 + sorte() * 90 : 30 + sorte() * 40) * (0.4 + 0.6 * forca), lado = (sorte() - 0.5) * 2;
        const g = sorte() < 0.3 ? CARNE[4 + Math.floor(sorte() * 4)] : FLUIDO[4 + Math.floor(sorte() * 5)];
        this.nasce({ x: fx + (sorte() - 0.5) * 6, y: fy + (sorte() - 0.5) * 6, vx: ux * v - uy * lado * 35, vy: uy * v + ux * lado * 35, vida: 1.4 + sorte() * 1.2, cor: g, tam: sorte() < 0.45 ? 1.5 + sorte() * 1.2 : 1, arrasto: 0.9, gota: true });
      }
    }
    // the fusion: the pixelfx implosion at the breach (the lights converge by 0.8 s, the pop at 1.02 s); the oracle also
    // draws the mock's three stand-in lights (the game has its own scene for them)
    this.efemeras = [];
    if (tr.hab === 'fusao') {
      const k = Math.min(1, e.tl / 0.8), alvo = { x: N.rombo.x, y: 178 };
      if (this.maquete && e.tl < 1.02)
        ([[230, 120, [88, 200, 255]], [290, 110, [96, 240, 136]], [350, 125, [255, 160, 64]]] as [number, number, RGB][]).forEach(([x, y, cor]) => {
          const px = x + (alvo.x - x) * k * k, py = y + (alvo.y - y) * k * k;
          this.efemeras.push({ x: px, y: py, vida: 1, idade: 0, tam: 3, cor }, { x: px, y: py, vida: 1, idade: 0, tam: 6, cor, a: 0.3 });
        });
      if (!pfx.fusao) { pfx.fusao = Efeitos.implosaoFx(alvo.x, alvo.y); pfx.vivos.push(pfx.fusao); }
    }
    for (const v of pfx.vivos) { v.update(dt); if (v.para != null && t >= v.para) v.stop(); }
    pfx.vivos = pfx.vivos.filter((v) => !v.done());
    const ps = this.particulas;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.idade += dt;
      p.x += (p.vx ?? 0) * dt;
      p.y += (p.vy ?? 0) * dt;
      if (p.arrasto) { const k = Math.max(0, 1 - p.arrasto * dt); p.vx = (p.vx ?? 0) * k; p.vy = (p.vy ?? 0) * k; }
      if (p.idade >= p.vida) ps.splice(i, 1);
    }
  }

  /** the mock's script (`maquete`): the bites and the death asked at its own times — the 22 % at the way back of cycle
   * 1, the 13 % 1 s into the dive of cycle 2, the skull where it cut the third pipes, the death at the end of the last
   * Echo (its `mordidas` and `montaRoteiro`) */
  private roteiroDaMaquete(t: number): void {
    const R = this.R, ev = this.eventos, N = this.N;
    const tr = (nome: string, ciclo: number, hab?: string) => R.trechos.find((q) => (hab ? q.hab === hab : q.nome === nome) && q.ciclo === ciclo);
    if (!ev.has(22)) { const v = tr('volta', 1); if (v && t >= v.t0) { ev.add(22); this.pedeMordida(22, v.t0); } }
    if (!ev.has(13)) { const m = tr('mergulho', 2); if (m && t >= m.t0 + 1.0) { ev.add(13); this.pedeMordida(13, m.t0 + 1.0); } }
    if (!ev.has(5)) { const c = tr('', 3, 'canos'); const corte = corteCanos(N.canos); if (c && t >= c.t0 + corte) { ev.add(5); this.pedeMordida(5, c.t0 + corte, corte); } }
    if (!ev.has(0) && this.final) { const e = R.trechos.find((q) => q.hab === 'eco' && q.final); if (e && t >= e.t1) { ev.add(0); this.mata(e.t1); } }
  }
  private readonly eventos = new Set<number>();

  /** the frame's state for `quadro` (the mock 462–480) */
  cena(): EstadoDesenho {
    const { R, N, t } = this, tr = this.e.trecho, hab = tr.hab;
    const canosAgora = this.canos.map((C) => C.estado(t)).find((q) => q && q.fase !== 'fecha') ?? null;
    const ecoAgora = this.ecos.find((E) => t >= E.t0 && t < E.rodadas[E.rodadas.length - 1].fim + 0.4);
    let eco: EstadoDesenho['eco'] = null;
    if (ecoAgora) {
      const q = ecoAgora.estado(t);
      eco = { ...q, rastro: q.lendo ? this.trilha.entre(t - ecoAgora.leitura, t) : null };
    }
    return {
      t, f: this.f, pose: this.P, geis: this.geis, lombada: lombada(R, N, t),
      canos: canosAgora, brasas: this.canos.flatMap((C) => C.brasas(t)), eco,
      sinais: R.sinais.filter((a) => t >= a.t0 && t < a.t1), fissuras: fissuras(R, N, t),
      particulas: this.efemeras.length ? [...this.particulas, ...this.efemeras] : this.particulas,
      semCabeca: hab === 'desfaz' || hab === 'resto' || hab === 'fim', morta: hab === 'fusao',
      mordida: this.cranio && t >= this.cranio.t ? MORDIDA_CRANIO : null, olhoAceso: !!eco?.lendo, gesto: this.gesto,
      decapitada: this.desfeita,
      pfx: this.pfx,
      respiros: hab !== 'fusao' ? this.respiros : null, luzCorpo: (u) => this.respiros.luz(u),
    };
  }
}
