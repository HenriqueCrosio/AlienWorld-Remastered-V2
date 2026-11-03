/**
 * THE LOOSE BITS IN VACUUM (the mock 277–349, 533–539): the jets' gas (born inside the frame, already out of the nozzle,
 * so the stream is continuous), the sparks off the hull and the beam, the soot, the cold puffs, a missile's burst on the
 * hull. In vacuum nothing drags them: they keep the body's own velocity; gas that meets the hull spreads on it. One
 * instance per skill, on the skill's physics die (`acaso`), stepped with the game's `dt` (the mock's `1/FPS`, R1–R2).
 * Pure: Node runs it.
 */
import { FPS_MAQUETE, HAB } from './numerosHab.ts';
import type { Cor, Put, RGB } from './tipos';

export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  idade: number;
  vida: number;
  /** a spark, in this colour (hot white first) */
  faisca?: RGB;
  /** the spark drawn as a streak along its flight */
  rasto?: boolean;
  fumaca?: boolean;
  frio?: boolean;
  flash?: boolean;
  /** a coloured exhaust (the missiles' engines): the head's near-white, its colour, then cold vapour */
  cor?: Cor;
}

export class Particulas {
  readonly lista: Particula[] = [];
  /** the missiles' bursts on the hull: a hot core, then a thin ring that opens */
  readonly claroes: { x: number; y: number; cor: Cor; idade: number }[] = [];
  private readonly acaso: () => number;

  constructor(acaso: () => number) {
    this.acaso = acaso;
  }

  push(p: Particula): void {
    this.lista.push(p);
  }

  /** a jet's gas along (ux, uy) at `forca` (the mock's `jato`: `taxa` particles per second at force 1) */
  jato(x: number, y: number, ux: number, uy: number, forca: number, vxB: number, vyB: number, dt: number, taxa = 420, cor?: Cor): void {
    const a = this.acaso;
    const qtd = Math.floor(forca * taxa * dt + a());
    for (let i = 0; i < qtd; i++) {
      // born somewhere inside this frame: already that far out of the nozzle, so the stream is continuous, not dashes
      const ang = Math.atan2(uy, ux) + (a() - 0.5) * 0.45, v = 75 + a() * 50, idade = a() * dt;
      const ex = Math.cos(ang) * v, ey = Math.sin(ang) * v;
      this.lista.push({ x: x + ex * idade, y: y + ey * idade, vx: vxB + ex, vy: vyB + ey, idade, vida: 0.12 + a() * 0.16, cor });
    }
  }

  /** sparks off the hull's plate (a real hit), in the hot white then the given colour */
  faiscas(x: number, y: number, n: number, cor: RGB): void {
    const a = this.acaso;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI * (0.08 + a() * 0.84), v = 50 + a() * 90;
      this.lista.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, idade: 0, vida: 0.12 + a() * 0.18, faisca: cor });
    }
  }

  /** soot: in vacuum it just drifts on and spreads */
  fumaca(x: number, y: number, n: number, vx = 0, vy = 0): void {
    const a = this.acaso;
    for (let i = 0; i < n; i++) {
      const ang = a() * Math.PI * 2, v = 4 + a() * 12;
      this.lista.push({ x: x + (a() - 0.5) * 3, y: y + (a() - 0.5) * 3, vx: vx + Math.cos(ang) * v, vy: vy + Math.sin(ang) * v, idade: 0, vida: 0.6 + a() * 0.7, fumaca: true });
    }
  }

  /** a missile's burst on the hull */
  clarao(x: number, y: number, cor: Cor): void {
    this.claroes.push({ x, y, cor, idade: 0 });
  }

  /** the mock's `passoGas` */
  passo(dt: number): void {
    const C = HAB.crista;
    for (const p of this.lista) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.idade += dt;
      if (p.y > C && p.vy > 0) { // gas that meets the hull spreads on it
        p.y = C;
        p.vy *= -0.25;
        p.vx *= 1.5;
      }
    }
    for (let i = this.lista.length - 1; i >= 0; i--) if (this.lista[i].idade > this.lista[i].vida) this.lista.splice(i, 1);
    for (const c of this.claroes) c.idade += dt;
    for (let i = this.claroes.length - 1; i >= 0; i--) if (this.claroes[i].idade > 0.16) this.claroes.splice(i, 1);
  }

  get vazio(): boolean {
    return this.lista.length === 0 && this.claroes.length === 0;
  }

  /** the mock's `desenhaGas`; `alfa` multiplies everything (a skill dissolving) */
  desenhar(put0: Put, alfa = 1): void {
    const put: Put = alfa >= 1 ? put0 : (x, y, c, a = 1) => put0(x, y, c, a * alfa);
    const { GAS, FRIO, NUCLEO, COR } = HAB.cores;
    for (const p of this.lista) {
      const f = p.idade / p.vida;
      if (p.faisca && p.rasto) { // a streak: the hot head, a short tail back along its flight
        const v = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / v, uy = p.vy / v, L = Math.min(4, Math.max(1, (v / FPS_MAQUETE) * 0.7));
        for (let s = L; s >= 0; s -= 0.5) put(p.x - ux * s, p.y - uy * s, s < 1 && f < 0.5 ? GAS.quente : p.faisca, (1 - f * 0.5) * (1 - (s / (L + 1)) * 0.7));
      } else if (p.faisca) put(p.x, p.y, f < 0.35 ? GAS.quente : p.faisca, 1 - f * 0.5);
      else if (p.fumaca) { // soot: a 2×2 grey puff, fading
        const c = f < 0.3 ? [122, 116, 112] : [88, 86, 92], a = 0.7 * Math.pow(1 - f, 1.1);
        put(p.x, p.y, c, a);
        put(p.x + 1, p.y, c, a);
        put(p.x, p.y + 1, c, a);
        put(p.x + 1, p.y + 1, c, a * 0.8);
      } else if (p.frio) { // cold stabilizer gas: a white puff that opens and is gone
        if (p.flash) put(p.x, p.y, [255, 255, 255]);
        else if (p.idade < 0.05) put(p.x, p.y, FRIO.quente);
        else if (p.idade < 0.13) put(p.x, p.y, FRIO.meio, 0.9);
        else put(p.x, p.y, FRIO.vapor, 0.7 * Math.pow(1 - f, 1.2));
      } else if (p.cor) { // a coloured exhaust: the head's near-white, its colour, then cold vapour
        if (p.idade < 0.035) put(p.x, p.y, NUCLEO[p.cor]);
        else if (p.idade < 0.1) put(p.x, p.y, COR[p.cor]);
        else put(p.x, p.y, GAS.vapor, 0.6 * Math.pow(1 - f, 1.5));
      } else if (p.idade < 0.035) put(p.x, p.y, GAS.quente);
      else if (p.idade < 0.1) put(p.x, p.y, GAS.chama);
      else put(p.x, p.y, GAS.vapor, 0.6 * Math.pow(1 - f, 1.5));
    }
    for (const c of this.claroes) { // a missile's burst on the hull: a hot core, then a thin ring that opens (no dark smudge)
      const f = c.idade / 0.16, r = 2 + f * 6;
      for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
        const d = Math.hypot(dx, dy);
        if (f < 0.35 && d <= r * 0.6) put(c.x + dx, c.y + dy, d < r * 0.3 ? GAS.quente : NUCLEO[c.cor]);
        else if (Math.abs(d - r) < 0.7 && f < 0.8) put(c.x + dx, c.y + dy, COR[c.cor], 1 - f);
      }
    }
  }
}
