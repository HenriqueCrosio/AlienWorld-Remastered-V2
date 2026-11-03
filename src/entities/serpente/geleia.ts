/**
 * THE BURNING JELLY (rounds 6–7, his: *"bolas maiores como se fossem geleias [...] se desfazer ou desgrudar em pequenos
 * pedaços [...] o comportamento de algo viscoso"*; the mock 540–807, R1–R7).
 *
 * A blob is a soft body: its outline is a circle plus two wobble modes (l = 2 the oval, l = 3 the trefoil) that ring
 * like a liquid drop — Rayleigh: ω_l² ∝ l(l−1)(l+2)/R³, so the small drops ring faster and settle sooner. Its burning
 * skin boils (small random pushes), so it never sits still. The blast that throws it squashes it along the push. It
 * comes apart the way a viscous liquid does: a lobe swells, a THREAD forms, thins as it stretches and snaps, beading into
 * a tiny satellite drop, and both ends spring back. The mothers of the dodges tear across (the fan) or along (a train),
 * then drip off their backs only. A blob thrown at her face sticks and burns there; one that reaches the hull splats.
 * Drawn as ONE metaball field (the blobs, the drops and the threads together), so necks and pinch-offs read.
 * Pure: Node runs it (the oracle).
 */
import { HAB, chance } from './numerosHab.ts';
import type { Particulas } from './particulas.ts';
import { H, W } from './pixels.ts';
import type { Estouro } from './termometro.ts';
import type { Cor, Ponto, Put, RGB } from './tipos';

export interface Geleia {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** its mass: R² */
  m: number;
  idade: number;
  calor: number;
  vida: number;
  origem: string;
  /** the wobble modes' amplitudes and speeds (l = 2: [0, 1]; l = 3: [2, 3]) */
  A: number[];
  V: number[];
  /** thrown at this face; stuck to it (or to the hull) */
  alvo?: Cor;
  preso?: Cor | 'casco';
  ox?: number;
  oy?: number;
  angGolpe?: number;
  /** a dodge's mother: how it tears, and when */
  mae?: boolean;
  corte?: 'atravessa' | 'aoLongo';
  tRacha?: number;
  esticou?: boolean;
  pinca?: number | null;
  psi?: number;
  /** a torn piece that drips off its back */
  pingador?: boolean;
  proxGota?: number;
  pincaGota?: number | null;
  lado?: number;
  /** it crosses the hull's crest instead of splatting on it (the hull lies in the background: the ship can hide under
   * the crest — his, 03/11), and so do its pieces and drops */
  cruza?: boolean;
  morto?: boolean;
}

interface Fio {
  a: Geleia;
  b: Geleia;
  w0: number;
  L0: number;
  w?: number;
  /** across a gap: its satellite burns out at once */
  curto?: boolean;
  morto?: boolean;
}

/** what a blob does to her and to the scene (the gas owns these) */
export interface MundoGeleia {
  particulas: Particulas;
  estouros: Estouro[];
  /** her mouth now (the target, and where a stuck blob rides) */
  boca(cor: Cor): Ponto;
  /** a blob stuck on her face: the hot flash, the shake, her flinch from the first */
  grudou(t: number): void;
}

const CRISTA = HAB.crista, GEL = HAB.gas.gel, BAYER = HAB.cores.BAYER;
// [cool, hot] per layer: a near-white core, the orange body, the red outside, a dark-red skin
const GELCOR = {
  nucleo: [[255, 196, 120], [255, 248, 224]],
  meio: [[228, 108, 46], [255, 190, 82]],
  fora: [[150, 48, 30], [240, 116, 44]],
  borda: [[84, 24, 22], [150, 40, 28]],
} as const;
type Par = (typeof GELCOR)[keyof typeof GELCOR];
const mistura = (par: Par, h: number): RGB => par[0].map((v, i) => Math.round(v + (par[1][i] - v) * h));

export const raioDe = (g: Geleia): number => Math.sqrt(g.m);
const omega = (g: Geleia, l: number): number =>
  Math.min(2 * Math.PI * 9, 2 * Math.PI * GEL.f0 * Math.sqrt((l * (l - 1) * (l + 2)) / 8) * Math.pow(7 / Math.max(1, raioDe(g)), 1.5));
const amort = (g: Geleia, l: number): number => Math.min(0.7, 0.1 * Math.sqrt(7 / Math.max(1, raioDe(g))) * (l === 3 ? 1.5 : 1));
/** the outline's radius at angle th (it shrinks a little as it cools) */
export const contorno = (g: Geleia, th: number): number =>
  raioDe(g) * (0.85 + 0.15 * g.calor) * (1 + g.A[0] * Math.cos(2 * th) + g.A[1] * Math.sin(2 * th) + g.A[2] * Math.cos(3 * th) + g.A[3] * Math.sin(3 * th));
/** the visible radius at its widest (the wobble included): what it reaches — the probes' and `toca`'s measure */
export const alcance = (g: Geleia): number => raioDe(g) * (0.85 + 0.15 * g.calor) * (1 + Math.hypot(g.A[0], g.A[1]) + Math.hypot(g.A[2], g.A[3]));

function linha(put: Put, x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
}

export class Geleias {
  readonly lista: Geleia[] = [];
  private fios: Fio[] = [];
  private n = 0;
  private readonly campo = new Float32Array(W * H);
  private readonly prof = new Float32Array(W * H);
  private readonly quente = new Float32Array(W * H);
  private readonly acaso: () => number;
  private readonly visual: () => number;
  private readonly mundo: MundoGeleia;

  constructor(acaso: () => number, visual: () => number, mundo: MundoGeleia) {
    this.acaso = acaso;
    this.visual = visual;
    this.mundo = mundo;
  }

  /** the mock's `normal`: a Gaussian on the physics die */
  private normal(): number {
    return Math.sqrt(-2 * Math.log(this.acaso() + 1e-9)) * Math.cos(2 * Math.PI * this.acaso());
  }

  nova(x: number, y: number, vx: number, vy: number, R: number, origem: string, extra: Partial<Geleia> = {}): Geleia {
    const g: Geleia = { id: this.n++, x, y, vx, vy, m: R * R, idade: 0, calor: 1, vida: 2.4, origem, A: [0, 0, 0, 0], V: [0, 0, 0, 0], ...extra };
    this.lista.push(g);
    return g;
  }

  /** a stretch (amp > 0) or a squash (amp < 0) along ψ on mode l: as a shape now, or as a push (the shape peaks a
   * quarter of its own period later) */
  deforma(g: Geleia, l: number, psi: number, amp: number, empurrao = false): void {
    const i = (l - 2) * 2, a = amp * Math.cos(l * psi), b = amp * Math.sin(l * psi);
    if (empurrao) {
      const w = omega(g, l);
      g.V[i] += a * w;
      g.V[i + 1] += b * w;
    } else {
      g.A[i] += a;
      g.A[i + 1] += b;
    }
  }

  /** a drop pinches off the tip of the lobe at ψ, joined to the rest by a thread */
  private pinga(g: Geleia, atras = false): void {
    const psi = g.psi ?? 0, ux = Math.cos(psi), uy = Math.sin(psi);
    const md = g.m * (0.09 + this.acaso() * 0.04);
    const r1 = contorno(g, psi);
    g.m -= md;
    // off its back the drop leaves slower than the blob, not backwards: it trails in the blob's own lane
    const rd = Math.sqrt(md), vr = atras ? 14 + this.acaso() * 12 : 30 + this.acaso() * 16;
    // a drop is as hot as the blob it left and smaller, so it never outlives it
    const vida = atras ? Math.min(1.1 + this.acaso() * 0.5, Math.max(0.3, g.vida - g.idade)) : 1.1 + this.acaso() * 0.5;
    const d = this.nova(g.x + ux * (r1 - rd * 0.2), g.y + uy * (r1 - rd * 0.2), g.vx + ux * vr, g.vy + uy * vr, rd, g.origem, { vida, calor: atras ? g.calor : 1, ...(g.cruza ? { cruza: true } : {}) });
    this.deforma(d, 2, psi, 0.35); // it leaves stretched along its way out
    g.vx -= (ux * vr * md) / g.m; // the recoil (momentum)
    g.vy -= (uy * vr * md) / g.m;
    this.deforma(g, 2, psi, -0.22, true); // and the rest snaps back
    this.fios.push({ a: g, b: d, w0: Math.min(1.5, rd * 0.75), L0: Math.hypot(d.x - g.x, d.y - g.y) });
  }

  /** it tears in two along ψ; the thick thread between the halves beads into a third drop in the middle. Torn ACROSS
   * its flight (the fan) or ALONG it (a train); then each piece drips off its back, and the satellite a thread leaves
   * across a gap burns out at once */
  private racha(g: Geleia): void {
    g.morto = true;
    const aoLongo = g.corte === 'aoLongo', psi = g.psi ?? 0;
    const ux = Math.cos(psi), uy = Math.sin(psi), r1 = contorno(g, psi), vr = aoLongo ? 22 : 34;
    const filho = (x: number, y: number, vx: number, vy: number, m: number): Geleia =>
      this.nova(x, y, vx, vy, Math.sqrt(m), g.origem, { vida: g.vida, idade: g.idade, calor: g.calor, pingador: !!g.corte, proxGota: g.idade + 0.18 + this.acaso() * 0.12, ...(g.cruza ? { cruza: true } : {}) });
    const lado = (s: number): Geleia => {
      const p = filho(g.x + s * ux * r1 * 0.5, g.y + s * uy * r1 * 0.5, g.vx + s * ux * vr, g.vy + s * uy * vr, g.m * 0.36);
      this.deforma(p, 2, psi, 0.28); // each half leaves stretched towards where it tore
      return p;
    };
    const e = lado(-1), d = lado(1);
    const meio = filho(g.x, g.y, g.vx, g.vy, g.m * 0.2);
    this.deforma(meio, 2, psi, 0.4);
    const curto = !!g.corte && !aoLongo;
    this.fios.push({ a: e, b: meio, w0: 2.2, L0: Math.hypot(meio.x - e.x, meio.y - e.y), curto });
    this.fios.push({ a: meio, b: d, w0: 2.2, L0: Math.hypot(d.x - meio.x, d.y - meio.y), curto });
  }

  /** a viscous blob does not bounce: it spends its push spreading, sticks to her face and burns there */
  private gruda(g: Geleia, t: number): void {
    const alvo = g.alvo as Cor, b = this.mundo.boca(alvo), ang = Math.atan2(g.vy, g.vx), a = this.acaso;
    g.preso = alvo;
    g.ox = g.x - b.x;
    g.oy = g.y - b.y;
    g.vx = 0;
    g.vy = 0;
    g.idade = 0;
    g.vida = 0.9;
    g.angGolpe = ang;
    // the blast pointed at her face: it leans past her, along the push
    this.mundo.estouros.push({ x: g.x, y: g.y, t0: t, R: alvo === 'verde' ? 26 : 20, ang, dur: 0.46, onda: true });
    for (let j = 0; j < (alvo === 'verde' ? 26 : 18); j++) {
      const ag = ang + (a() - 0.5) * 1.8, v = 60 + a() * 90;
      this.mundo.particulas.push({ x: g.x, y: g.y, vx: Math.cos(ag) * v, vy: Math.sin(ag) * v, idade: 0, vida: 0.1 + a() * 0.16, faisca: [255, 190, 80], rasto: true });
    }
    this.mundo.grudou(t);
    this.mundo.particulas.fumaca(g.x, g.y, 10, Math.cos(ang) * 14, Math.sin(ang) * 14);
  }

  private noCasco(g: Geleia, t: number): void {
    const R = raioDe(g);
    g.preso = 'casco';
    g.ox = g.x;
    g.oy = CRISTA - R * 0.35;
    g.x = g.ox;
    g.y = g.oy;
    g.vx = 0;
    g.vy = 0;
    g.idade = 0;
    g.vida = Math.min(0.9, 0.35 + R * 0.08);
    g.angGolpe = Math.PI / 2;
    if (R > 2.5) {
      this.mundo.estouros.push({ x: Math.round(g.x), y: Math.round(CRISTA - 2), t0: t, R: R + 3 });
      this.mundo.particulas.faiscas(g.x, CRISTA - 1, 4, [255, 170, 70]);
    }
  }

  /** the mock's `geleiaPasso` */
  passo(t: number, dt: number): void {
    const a = this.acaso, P = this.mundo.particulas;
    for (const g of this.lista.slice()) {
      if (g.morto) continue;
      g.idade += dt;
      if (g.preso === 'casco') {
        g.x = g.ox ?? g.x;
        g.y = g.oy ?? g.y;
      } else if (g.preso) {
        const b = this.mundo.boca(g.preso);
        g.x = b.x + (g.ox ?? 0);
        g.y = b.y + (g.oy ?? 0);
      } else {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
      }
      const R = raioDe(g);
      for (let s = 0; s < 4; s++) for (let l = 2; l <= 3; l++) {
        const w = omega(g, l), z = amort(g, l), h = dt / 4;
        for (let q = 0; q < 2; q++) {
          const i = (l - 2) * 2 + q;
          g.V[i] += GEL.ruido * Math.min(1, R / 5) * Math.sqrt(h) * this.normal() + (-w * w * g.A[i] - 2 * z * w * g.V[i]) * h;
          g.A[i] += g.V[i] * h;
        }
      }
      if (g.preso) { // stuck flat on her face (or on the hull): wide across the hit, still ringing a little, smoking
        const ida = g.idade, base = -0.42 + 0.22 * Math.exp(-7 * ida) * Math.cos(28 * ida), ag = g.angGolpe ?? 0;
        g.A[0] = base * Math.cos(2 * ag);
        g.A[1] = base * Math.sin(2 * ag);
        // its soot leaves from the outer edge (drawn over its middle it read as a grey smudge on the fire)
        if (a() < chance(0.5, dt)) {
          const r = contorno(g, -0.9) + 1;
          P.fumaca(g.x + Math.cos(-0.9) * r, g.y + Math.sin(-0.9) * r, 1, 8, -5);
        }
      }
      const amp = Math.hypot(g.A[0], g.A[1]) + Math.hypot(g.A[2], g.A[3]);
      if (amp > 0.7) for (let i = 0; i < 4; i++) g.A[i] *= 0.7 / amp; // never inside out
      // it burns: hot while young, then it cools (darker, a little smaller) and goes out in a puff of soot
      g.calor = Math.max(0, Math.min(g.calor, (g.vida - g.idade) / (g.vida * 0.55)));
      if (g.idade >= g.vida) {
        g.morto = true;
        P.fumaca(g.x, g.y, Math.round(2 + R * (g.preso ? 2 : 1)), g.preso ? 8 : g.vx * 0.5, g.preso ? -3 : g.vy * 0.5);
        continue;
      }
      // the hull is a surface too: a blob that reaches it splats and burns there (viscous: no bounce) — unless it was
      // thrown to cross it (`cruza`)
      if (!g.preso && !g.alvo && !g.cruza && g.vy > 0 && g.y + raioDe(g) * 0.7 >= CRISTA) {
        this.noCasco(g, t);
        continue;
      }
      if (g.alvo && !g.preso) {
        // it lands once it is on her mouth or has just passed it (a fast blob can step over a small window)
        const b = this.mundo.boca(g.alvo), dx = b.x - g.x, dy = b.y - g.y;
        if (Math.hypot(dx, dy) < 5 || dx * g.vx + dy * g.vy <= 0) this.gruda(g, t);
      }
      // the mother tears (across or along, `corte`), then her pieces drip off their backs
      if (g.corte && g.mae) {
        if (!g.esticou && g.idade >= (g.tRacha ?? 0.32)) {
          g.esticou = true;
          const va = Math.atan2(g.vy, g.vx);
          g.psi = g.corte === 'atravessa' ? va + Math.PI / 2 : va;
          this.deforma(g, 2, g.psi, 0.5, true);
          g.pinca = g.idade + Math.PI / 2 / omega(g, 2);
        }
        if (g.pinca != null && g.idade >= g.pinca) {
          g.pinca = null;
          this.racha(g);
        }
        continue;
      }
      if (g.pingador && !g.preso && g.m > 9) {
        if (g.idade >= (g.proxGota ?? Infinity) && g.pincaGota == null) {
          g.psi = Math.atan2(g.vy, g.vx) + Math.PI + (a() - 0.5) * 0.5; // a lobe swells off its back
          this.deforma(g, 2, g.psi, 0.3, true);
          this.deforma(g, 3, g.psi, 0.16, true);
          g.pincaGota = g.idade + Math.PI / 2 / omega(g, 2);
          g.proxGota = g.idade + 0.3 + a() * 0.14;
        }
        if (g.pincaGota != null && g.idade >= g.pincaGota) {
          g.pincaGota = null;
          this.pinga(g, true);
        }
      }
      if (g.mae && !g.corte) {
        // (a mother that does not tear — none of the dodges' — sheds drops sideways, alternating sides)
        if (g.idade >= (g.proxGota ?? Infinity) && g.m > 14) {
          g.lado = -(g.lado ?? (a() < 0.5 ? 1 : -1));
          g.psi = Math.atan2(g.vy, g.vx) + g.lado * (Math.PI * 0.55 + (a() - 0.5) * 0.5);
          this.deforma(g, 2, g.psi, 0.3, true);
          this.deforma(g, 3, g.psi, 0.16, true); // l = 2 + l = 3: one lobe, not two
          g.pinca = g.idade + Math.PI / 2 / omega(g, 2);
          g.proxGota = g.idade + 0.26 + a() * 0.12;
        }
        if (g.pinca != null && g.idade >= g.pinca) {
          g.pinca = null;
          this.pinga(g);
        }
      }
    }
    // the threads: thinner as they stretch; they snap, bead into a satellite drop, and both ends spring back
    for (const f of this.fios) {
      if (f.morto) continue;
      const L = Math.hypot(f.b.x - f.a.x, f.b.y - f.a.y);
      f.w = f.w0 * Math.pow(f.L0 / Math.max(f.L0, L), 0.9);
      if (f.w >= 0.68 && !f.a.morto && !f.b.morto) continue;
      f.morto = true;
      if (f.a.morto || f.b.morto) continue;
      const ra = raioDe(f.a), rb = raioDe(f.b), gap = L - ra - rb, ang = Math.atan2(f.b.y - f.a.y, f.b.x - f.a.x);
      if (gap > 3) {
        const k = (ra + gap / 2) / L;
        this.nova(f.a.x + (f.b.x - f.a.x) * k, f.a.y + (f.b.y - f.a.y) * k, (f.a.vx + f.b.vx) / 2, (f.a.vy + f.b.vy) / 2, 1.1, f.a.origem,
          { vida: f.curto ? 0.18 + a() * 0.08 : 0.5 + a() * 0.3, calor: Math.min(f.a.calor, f.b.calor), ...(f.a.cruza ? { cruza: true } : {}) });
      }
      this.deforma(f.a, 2, ang, -0.15, true);
      this.deforma(f.b, 2, ang, -0.2, true);
    }
    this.fios = this.fios.filter((f) => !f.morto);
    for (let i = this.lista.length - 1; i >= 0; i--) if (this.lista[i].morto) this.lista.splice(i, 1);
  }

  /** the burning jelly (alight: the sparks' threshold, `calor > 0.3`) touches the box — what hurts (spec §3.4) */
  toca(esq: number, dir: number, topo: number, base: number): boolean {
    return this.folga(esq, dir, topo, base) <= 0;
  }

  /** the smallest gap (px) between a burning blob's outline and the box (the probes' measure, rounds 7 and 13) */
  folga(esq: number, dir: number, topo: number, base: number): number {
    let f = Infinity;
    for (const g of this.lista) {
      if (g.calor <= 0.3) continue;
      const dx = Math.max(esq - g.x, 0, g.x - dir), dy = Math.max(topo - g.y, 0, g.y - base);
      f = Math.min(f, Math.hypot(dx, dy) - alcance(g));
    }
    return f;
  }

  /** the mock's `geleiaDesenha`; `alfa` multiplies everything */
  desenhar(put: Put): void {
    if (!this.lista.length) return;
    const { campo, prof, quente } = this, v = this.visual;
    campo.fill(0);
    prof.fill(-9);
    quente.fill(0);
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    const caixa = (x: number, y: number): void => {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    };
    for (const g of this.lista) {
      const amp = Math.hypot(g.A[0], g.A[1]) + Math.hypot(g.A[2], g.A[3]);
      const ext = Math.ceil(raioDe(g) * 1.42 * (1 + amp)) + 1, cx = Math.round(g.x), cy = Math.round(g.y);
      for (let y = Math.max(0, cy - ext); y <= Math.min(H - 1, cy + ext); y++) for (let x = Math.max(0, cx - ext); x <= Math.min(W - 1, cx + ext); x++) {
        const dx = x - g.x, dy = y - g.y, d = Math.hypot(dx, dy), r = contorno(g, Math.atan2(dy, dx));
        const s = d / (r * 1.42);
        if (s >= 1) continue;
        const i = y * W + x;
        campo[i] += (1 - s * s) ** 2;
        const p = 1 - d / r;
        if (p > prof[i]) {
          prof[i] = p;
          quente[i] = g.calor;
        }
        caixa(x, y);
      }
    }
    for (const f of this.fios) { // a capsule from centre to centre, as thick as the thread
      const { a, b } = f, h = Math.min(a.calor, b.calor), w = f.w ?? f.w0, ext = w * 1.42 + 1;
      const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1;
      for (let y = Math.max(0, Math.floor(Math.min(a.y, b.y) - ext)); y <= Math.min(H - 1, Math.ceil(Math.max(a.y, b.y) + ext)); y++)
        for (let x = Math.max(0, Math.floor(Math.min(a.x, b.x) - ext)); x <= Math.min(W - 1, Math.ceil(Math.max(a.x, b.x) + ext)); x++) {
          const u = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / L2));
          const s = Math.hypot(x - a.x - u * vx, y - a.y - u * vy) / (w * 1.42);
          if (s >= 1) continue;
          const i = y * W + x;
          campo[i] += (1 - s * s) ** 2;
          if (prof[i] < -1) { // a thread outside every body: the outer colour
            prof[i] = -1;
            quente[i] = h;
          }
          caixa(x, y);
        }
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x, F = campo[i];
      if (F < 0.08) continue;
      const h = quente[i];
      if (F < 0.25) { // the heat's glow around it, sparse
        if (BAYER[(y & 3) * 4 + (x & 3)] / 16 < ((F - 0.08) / 0.17) * 0.45 * (0.4 + 0.6 * h)) put(x, y, mistura(GELCOR.fora, h), 0.35);
        continue;
      }
      const p = prof[i];
      const par = F < 0.39 ? GELCOR.borda : p > 0.62 ? GELCOR.nucleo : p > 0.3 ? GELCOR.meio : GELCOR.fora;
      put(x, y, mistura(par, h), par === GELCOR.borda ? 0.85 : 1);
    }
    // the jelly's wet shine: a hard highlight up-left on the bigger blobs
    for (const g of this.lista) {
      const R = raioDe(g) * (0.85 + 0.15 * g.calor);
      if (R < 3.2) continue;
      const th = -2.3, r = contorno(g, th) * 0.56, hx = g.x + Math.cos(th) * r, hy = g.y + Math.sin(th) * r;
      put(hx, hy, [255, 255, 246]);
      if (R >= 5) {
        put(hx + 1, hy, [255, 236, 200], 0.8);
        put(hx, hy + 1, [255, 236, 200], 0.6);
      }
    }
    // the plasma crackles (his, round 10; visual only): small electric arcs licking its skin, new every frame
    for (const g of this.lista) {
      const R = raioDe(g) * (0.85 + 0.15 * g.calor);
      if (R < 2.6 || g.calor < 0.2) continue;
      for (let i = 0; i < (R >= 6 ? 2 : 1); i++) {
        if (v() > 0.6) continue;
        const th = v() * Math.PI * 2, dir = v() < 0.5 ? -1 : 1, n = 3;
        const r0 = contorno(g, th);
        let xa = g.x + Math.cos(th) * r0, ya = g.y + Math.sin(th) * r0;
        for (let p = 1; p <= n; p++) {
          const ag = th + dir * 0.22 * p + (v() - 0.5) * 0.25;
          const alto = Math.max(0.5, (2 + R * 0.35) * Math.sin((Math.PI * p) / (n + 0.6)) + (v() - 0.5) * 1.5);
          const xb = g.x + Math.cos(ag) * (contorno(g, ag) + alto), yb = g.y + Math.sin(ag) * (contorno(g, ag) + alto);
          linha(put, xa, ya, xb, yb, p === 1 ? [255, 250, 230] : [255, 196, 100], 1 - (0.3 * p) / n);
          xa = xb;
          ya = yb;
        }
      }
    }
  }
}
