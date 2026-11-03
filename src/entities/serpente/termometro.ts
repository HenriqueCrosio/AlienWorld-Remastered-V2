/**
 * THE THERMOMETER (round 7, his: *"um termômetro pequeno que sobe a temperatura, quando chegar, explode de volta na
 * serpente [...] Caso tenha incendiar, a barrinha de termometro pega fogo e explode"*; the mock 912–1006, R1–R7).
 *
 * Beside her, only while her gas is out. It rises with each shot that goes THROUGH the gas (her body does not count: it
 * teaches where to shoot) and cools slowly. The orange's spark burns the gas the ship heated and the fresh breath is
 * cold, so it starts over at every spark (his choice). Full first: the flashback — `esquenta` returns true and the gas
 * lights it. With INCENDIÁRIO it catches fire at the first touch and bursts (`acender`). Pure: Node runs it.
 */
import { HAB } from './numerosHab.ts';
import type { Put, RGB } from './tipos';

/** a burst drawn by the gas (`gas.ts`): a white flash, the orange body thinning out, a red ring; `ang` leans it */
export interface Estouro {
  x: number;
  y: number;
  t0: number;
  R: number;
  ang?: number;
  dur?: number;
  onda?: boolean;
}

interface Caco {
  x: number;
  y: number;
  vx: number;
  vy: number;
  idade: number;
  vida: number;
  quente: boolean;
}

export type EstadoTermo = 'sobe' | 'cheio' | 'zera' | 'fogo' | 'estourado';

const T = HAB.gas.termo, BAYER = HAB.cores.BAYER;

/** the heat's colour up the column (f 0 at the bulb, 1 at the top) */
function rampa(f: number): RGB {
  const R = HAB.gas.rampa, s = Math.max(0, Math.min(0.999, f)) * (R.length - 1), i = Math.floor(s), u = s - i;
  return R[i].map((v, q) => Math.round(v + (R[i + 1][q] - v) * u));
}

export class Termometro {
  v = 0;
  mostra = 0;
  alfa = 0;
  estado: EstadoTermo = 'sobe';
  t0 = 0;
  pisca = -9;
  cacos: Caco[] = [];
  private readonly acaso: () => number;

  constructor(acaso: () => number) {
    this.acaso = acaso;
  }

  /** a shot through the gas adds `q` of heat; true when it just filled (the caller lights the flashback) — not while
   * she is already choking (`engasgou`). Draining after her spark, the shots in the air do not count */
  esquenta(t: number, q: number, engasgou = false): boolean {
    if (this.estado !== 'sobe') return false;
    this.v = Math.min(1, this.v + q);
    this.pisca = t;
    if (this.v >= 1 && !engasgou) {
      this.estado = 'cheio';
      this.t0 = t;
      return true;
    }
    return false;
  }

  /** her spark: it starts over */
  zera(t: number): void {
    if (this.estado === 'sobe') {
      this.estado = 'zera';
      this.t0 = t;
    }
    this.v = 0;
  }

  /** INCENDIÁRIO: it catches fire (and bursts 0.34 s later) */
  acender(t: number): void {
    this.estado = 'fogo';
    this.t0 = t;
    this.v = 1;
  }

  /** `ativo`: her gas is out (the breath, and 0.8 s after it); the glass's burst goes to the gas's `estouros` */
  passo(t: number, dt: number, ativo: boolean, estouros: Estouro[]): void {
    const fora = this.estado === 'estourado' || (this.estado === 'cheio' && t - this.t0 > 0.7);
    const liga = ativo && !fora;
    this.alfa = Math.max(0, Math.min(1, this.alfa + (liga ? dt / 0.3 : -dt / 0.35)));
    if (this.estado === 'sobe' && this.v > 0) this.v = Math.max(0, this.v - HAB.gas.termoEsfria * dt);
    // the level shown eases to the real one: it climbs quickly, drains in ~0.3 s, shoots up when the card lights it
    const alvo = this.estado === 'fogo' || this.estado === 'cheio' ? 1 : this.v;
    this.mostra += (alvo - this.mostra) * Math.min(1, dt * (this.estado === 'fogo' ? 22 : this.estado === 'zera' ? 10 : 8));
    if (this.estado === 'zera' && t - this.t0 > 0.5) this.estado = 'sobe';
    if (this.estado === 'fogo' && t - this.t0 > 0.34) {
      // it bursts: the glass flies in shards, a small blast where it was
      this.estado = 'estourado';
      this.t0 = t;
      this.alfa = 0;
      const a = this.acaso, cx = T.x + 1, cy = T.y + T.alto * 0.6;
      estouros.push({ x: cx, y: Math.round(cy), t0: t, R: 9, dur: 0.3 });
      for (let j = 0; j < 14; j++) {
        const ang = a() * Math.PI * 2, v = 40 + a() * 80;
        this.cacos.push({ x: cx + (a() - 0.5) * 3, y: cy + (a() - 0.5) * T.alto * 0.8, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, idade: 0, vida: 0.3 + a() * 0.25, quente: a() < 0.4 });
      }
    }
    for (const c of this.cacos) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.idade += dt;
    }
    this.cacos = this.cacos.filter((c) => c.idade < c.vida);
  }

  get visivel(): boolean {
    return this.alfa > 0 || this.cacos.length > 0;
  }

  /** the mock's `termoDesenha` (the flames of INCENDIÁRIO flicker on the physics die, as the mock's did) */
  desenhar(put: Put, t: number): void {
    for (const c of this.cacos) put(c.x, c.y, c.quente ? [255, 190, 100] : [196, 206, 226], 1 - c.idade / c.vida);
    const A = this.alfa;
    if (A <= 0) return;
    const { x, y, alto } = T, bx = x + 1, by = y + alto + 3;
    const fogo = this.estado === 'fogo', clara = this.estado === 'cheio' && t - this.t0 < 0.12;
    const nivel = Math.round(this.mostra * alto);
    // the casing: dark metal, its left edge lit, a cap on top; ticks on the right at each quarter, the top one hot
    for (let j = -1; j < alto; j++) {
      put(x - 1, y + j, [96, 104, 122], A);
      put(x + 3, y + j, [34, 38, 50], A);
    }
    for (let i = -1; i <= 3; i++) put(x + i, y - 2, i === -1 || i === 3 ? [70, 78, 94] : [150, 158, 176], A);
    for (const q of [0.25, 0.5, 0.75]) put(x + 4, y + Math.round(alto * (1 - q)), [90, 98, 114], A);
    put(x + 4, y, [255, 120, 40], A);
    put(x + 5, y, [255, 120, 40], A * 0.7);
    // the glass and the heat in it
    for (let j = 0; j < alto; j++) {
      const yy = y + alto - 1 - j, cheio = j < nivel;
      for (let i = 0; i < 3; i++) {
        if (clara) {
          put(x + i, yy, [255, 250, 232], A);
          continue;
        }
        if (!cheio) {
          put(x + i, yy, this.estado === 'zera' && t - this.t0 < 0.1 ? [70, 74, 90] : [16, 18, 26], A * 0.9);
          continue;
        }
        let c = rampa(j / alto);
        if (i === 0) c = c.map((v) => Math.round(v + (255 - v) * 0.25)); // the glass's shine on its left
        if (j === nivel - 1 && t - this.pisca < 0.07) c = [255, 255, 240]; // a hit: the top flashes
        put(x + i, yy, c, A);
      }
    }
    // the bulb: a 7-px disc, a dark rim lit up-left, open to the glass at its top, the heat inside glowing with the level
    const quente = rampa(Math.max(0.12, this.mostra * 0.6));
    const dentro = (dx: number, dy: number): boolean => dx * dx + dy * dy <= 10;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (!dentro(dx, dy)) continue;
      const borda = !(dentro(dx + 1, dy) && dentro(dx - 1, dy) && dentro(dx, dy + 1) && dentro(dx, dy - 1)) && !(dy === -3 && Math.abs(dx) <= 1);
      if (borda) {
        put(bx + dx, by + dy, dx + dy < 0 ? [120, 128, 146] : [34, 38, 50], A);
        continue;
      }
      let c: RGB = clara ? [255, 250, 232] : quente;
      if (dx === -1 && dy === -1 && !clara) c = c.map((v) => Math.round(v + (255 - v) * 0.4));
      put(bx + dx, by + dy, c, A);
    }
    // full: a hot glow around it for a moment
    if (this.estado === 'cheio' && t - this.t0 < 0.45) {
      const f = (t - this.t0) / 0.45;
      for (let j = -4; j < alto + 8; j++) for (let i = -3; i <= 5; i++) {
        if ((i >= -1 && i <= 3 && j >= -2 && j < alto) || BAYER[((y + j) & 3) * 4 + ((x + i) & 3)] / 16 > 0.45 * (1 - f)) continue;
        put(x + i, y + j, [255, 170, 80], 0.5 * (1 - f) * A);
      }
    }
    // INCENDIÁRIO: it catches fire — flames licking out of its top and along its sides, flickering every frame
    if (fogo) for (let i = -2; i <= 4; i++) {
      const topo = 3 + Math.floor(this.acaso() * 6) - (i < 0 || i > 2 ? 3 : 0);
      for (let s = 0; s < topo; s++) put(x + i, y - 3 - s, s < 2 ? [255, 244, 210] : s < topo - 1 ? [255, 160, 60] : [220, 70, 36], 0.95);
      for (let j = 0; j < alto; j += 3) if (this.acaso() < 0.4) put(i < 1 ? x - 2 : x + 4, y + j + Math.floor(this.acaso() * 3), [255, 150, 60], 0.85);
    }
  }
}
