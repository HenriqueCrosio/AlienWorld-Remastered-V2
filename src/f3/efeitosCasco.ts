/**
 * THE LIVING CASCO, SIMULATED AND DRAWN (08/11, round 2 — plan `plans/2026-11-08-cenario-casco-rodada2.md`). Pure: no
 * Phaser; `camadaCasco.ts` feeds it the pieces on screen and uploads what it draws.
 *
 * Everything is a pixel at the native resolution, drawn over his hull art from its own pixels:
 *   - THE PULSE: the copper traces of each piece mixed toward the lit copper by a wave running toward the head;
 *   (- the RIM on the crest was shown on round 2 and taken out by him;)
 *   - THE VAPOUR: short puffs out of the vents — a 1 px stream at the nozzle, then a dithered bank that slows, swells and
 *     fades. In the vacuum nothing rises or falls by weight: the jet only slows (in the hull's frame; the hull's scroll
 *     carries it along, the gas inherits the nozzle);
 *   - THE SPARKS (the arena, at the open breach's torn rim): straight streaks cooling down their ramp, and a flash.
 */
import {
  CAMADA_CASCO, COR_BRILHO, COR_PULSO, FAISCAS, MS_REGIME, PULSO, RESPIROS, VAPOR, VAPOR_PARTICULA,
  intensidadePulso, type RegimeCasco,
} from './numerosCascoF3.ts';
import { BAYER, pintor, ruido } from './pixel.ts';

const W = 384;
const H = CAMADA_CASCO.h;
const Y0 = CAMADA_CASCO.y0;

/** A piece's pixels, read once per texture: RGBA, the copper (x, y, r, g, b …) and the top row of each column (−1). */
export interface Mascara {
  w: number;
  h: number;
  px: Uint8ClampedArray;
  cobre: Int16Array;
  topo: Int16Array;
}
/** A piece on screen: `id` stable while the sprite lives; `x0, y0` its top-left. */
export interface PecaNaTela {
  id: number;
  key: string;
  x0: number;
  y0: number;
  mascara: Mascara;
}
/** The open breach: its hole's screen columns and the crest row. */
export interface RomboNaTela {
  buraco: [number, number];
  crista: number;
}

interface Vapor { x: number; y: number; vx: number; vy: number; v0: number; idade: number; vida: number }
interface Faisca { x: number; y: number; vx: number; vy: number; ang: number; idade: number; vida: number }
interface Clarao { x: number; y: number; idade: number }
interface Respiro { espera: number; sopro: number; acumulado: number; visto: boolean }

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export class EfeitosCasco {
  readonly vapor: Vapor[] = [];
  readonly faiscas: Faisca[] = [];
  private readonly claroes: Clarao[] = [];
  private readonly respiros = new Map<string, Respiro>();
  private t = 0;
  /** how far the hull has scrolled on screen (px, negative = leftward): the pulse is measured on the hull */
  private andado = 0;
  /** 0 = the casco regime, 1 = the arena */
  private k = 0;
  private kAlvo = 0;
  private kVel = 0;
  private esperaFaisca = 0;
  private semente: number;
  private pecas: PecaNaTela[] = [];
  /**
   * WHO IS ON TOP at each pixel of the layer (the piece's index, −1 none). The band's pieces OVERLAP (the next one drawn
   * over the last): without this map the pulse lit the copper hidden under the next piece (rings of light over plain
   * plate — the 1st look), and the vents did the same.
   */
  private readonly dono = new Int16Array(W * H);

  constructor(semente: number) {
    this.semente = semente >>> 0 || 1;
    this.esperaFaisca = this.entre(FAISCAS.espera);
  }

  private rnd(): number {
    this.semente = (Math.imul(this.semente, 1664525) + 1013904223) >>> 0;
    return this.semente / 4294967296;
  }
  private entre([a, b]: readonly [number, number]): number {
    return a + (b - a) * this.rnd();
  }

  /** The switch between the regimes, eased over `ms` (0 = at once). */
  regime(r: RegimeCasco, ms = MS_REGIME): void {
    this.kAlvo = r === 'arena' ? 1 : 0;
    if (ms <= 0) this.k = this.kAlvo;
    this.kVel = ms > 0 ? 1000 / ms : 0;
  }

  /** One step: `rolagem` is the hull's scroll on screen (px/s, negative = leftward), carried by the gas. */
  passo(dt: number, pecas: PecaNaTela[], rombo: RomboNaTela | null, rolagem = 0): void {
    this.t += dt;
    this.andado += rolagem * dt;
    this.pecas = pecas;
    this.marcaDonos();
    if (this.k !== this.kAlvo) {
      const d = this.kVel * dt;
      this.k = this.k < this.kAlvo ? Math.min(this.kAlvo, this.k + d) : Math.max(this.kAlvo, this.k - d);
    }
    const vc = VAPOR.casco, va = VAPOR.arena, k = this.k;

    // the vents: each one waits, then blows for a while (keyed by the piece's id and the vent's index)
    for (const r of this.respiros.values()) r.visto = false;
    pecas.forEach((p, ip) => {
      const vs = RESPIROS[p.key];
      if (!vs) return;
      vs.forEach((v, i) => {
        // a vent under the next piece does not breathe (nor keep a state)
        if (!this.visivel(ip, p.x0 + v.x, p.y0 + v.y)) return;
        const chave = `${p.id}:${i}`;
        let r = this.respiros.get(chave);
        if (!r) {
          r = { espera: this.entre([0.2, lerp(vc.espera[1], va.espera[1], k)]), sopro: 0, acumulado: 0, visto: true };
          this.respiros.set(chave, r);
        }
        r.visto = true;
        if (r.sopro > 0) {
          r.sopro -= dt;
          r.acumulado += lerp(vc.porSeg, va.porSeg, k) * dt;
          while (r.acumulado >= 1) {
            r.acumulado -= 1;
            this.sopra(p.x0 + v.x, p.y0 + v.y);
          }
          if (r.sopro <= 0) r.espera = this.entre([lerp(vc.espera[0], va.espera[0], k), lerp(vc.espera[1], va.espera[1], k)]);
        } else {
          r.espera -= dt;
          if (r.espera <= 0) r.sopro = this.entre([lerp(vc.sopro[0], va.sopro[0], k), lerp(vc.sopro[1], va.sopro[1], k)]);
        }
      });
    });
    for (const [c, r] of this.respiros) if (!r.visto) this.respiros.delete(c);

    // the vapour: the jet slows (drag on the jet only), the hull's scroll carries it
    const freio = Math.exp(-VAPOR_PARTICULA.arrasto * dt);
    for (let i = this.vapor.length - 1; i >= 0; i--) {
      const q = this.vapor[i];
      q.idade += dt;
      if (q.idade >= q.vida) { this.vapor.splice(i, 1); continue; }
      q.vx *= freio;
      q.vy *= freio;
      q.x += (q.vx + rolagem) * dt;
      q.y += q.vy * dt;
    }

    // the sparks: only in the arena, only at the open breach
    if (rombo && k > 0.5) {
      this.esperaFaisca -= dt;
      if (this.esperaFaisca <= 0) {
        this.esperaFaisca = this.entre(FAISCAS.espera);
        this.estala(rombo);
      }
    }
    for (let i = this.faiscas.length - 1; i >= 0; i--) {
      const f = this.faiscas[i];
      f.idade += dt;
      if (f.idade >= f.vida) { this.faiscas.splice(i, 1); continue; }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    }
    for (let i = this.claroes.length - 1; i >= 0; i--) {
      this.claroes[i].idade += dt;
      if (this.claroes[i].idade > 0.05) this.claroes.splice(i, 1);
    }
  }

  private marcaDonos(): void {
    const D = this.dono;
    D.fill(-1);
    this.pecas.forEach((p, ip) => {
      const m = p.mascara, x0 = Math.round(p.x0), y0 = Math.round(p.y0) - Y0;
      for (let y = Math.max(0, -y0); y < m.h && y + y0 < H; y++) {
        for (let x = Math.max(0, -x0); x < m.w && x + x0 < W; x++) {
          if (m.px[(y * m.w + x) * 4 + 3] >= 128) D[(y + y0) * W + x + x0] = ip;
        }
      }
    });
  }

  /** Is piece `ip` the one on top at this screen pixel? */
  private visivel(ip: number, x: number, y: number): boolean {
    x = Math.round(x);
    y = Math.round(y) - Y0;
    return x >= 0 && x < W && y >= 0 && y < H && this.dono[y * W + x] === ip;
  }

  private sopra(x: number, y: number): void {
    const P = VAPOR_PARTICULA;
    const a = -Math.PI / 2 + (this.rnd() * 2 - 1) * P.abre;
    const v = this.entre(P.vel);
    this.vapor.push({ x: x + (this.rnd() - 0.5), y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, v0: v, idade: 0, vida: this.entre(P.vida) });
  }

  private estala(r: RomboNaTela): void {
    const esquerda = this.rnd() < 0.5;
    const x = esquerda ? r.buraco[0] + Math.floor(this.rnd() * 4) - 1 : r.buraco[1] - Math.floor(this.rnd() * 4) + 1;
    const y = r.crista + Math.floor(this.rnd() * 6);
    this.claroes.push({ x, y, idade: 0 });
    const n = Math.round(this.entre(FAISCAS.n));
    for (let i = 0; i < n; i++) {
      // up and away from the hole: the left rim throws up-left, the right rim up-right
      const ang = esquerda ? this.entre([-2.8, -1.7]) : this.entre([-1.45, -0.35]);
      const v = this.entre(FAISCAS.vel);
      this.faiscas.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, ang, idade: 0, vida: this.entre(FAISCAS.vida) });
    }
  }

  /** Draws the layer (384 × h, RGBA, from y0), cleared first. */
  desenhar(out: Uint8ClampedArray): void {
    out.fill(0);
    const put = pintor(out, W, H, Y0);
    const pulso = {
      v: lerp(PULSO.casco.v, PULSO.arena.v, this.k),
      lambda: lerp(PULSO.casco.lambda, PULSO.arena.lambda, this.k),
      pico: lerp(PULSO.casco.pico, PULSO.arena.pico, this.k),
      k: lerp(PULSO.casco.k, PULSO.arena.k, this.k),
    };

    // the pulse on the copper (only the copper on top): first the 1 px glow it throws on the plate around, then the
    // lit copper over it. The wave is measured ON THE HULL (`andado` takes the scroll out), and the glow fades with it
    // (it used to switch on at a = 0.25: a pop at each crossing)
    for (const passe of [0, 1]) {
      for (let ip = 0; ip < this.pecas.length; ip++) {
        const p = this.pecas[ip];
        const c = p.mascara.cobre;
        const x0 = Math.round(p.x0), y0 = Math.round(p.y0);
        for (let i = 0; i < c.length; i += 5) {
          const sx = x0 + c[i], sy = y0 + c[i + 1];
          const a = intensidadePulso(sx - this.andado, this.t, pulso);
          if (a <= 0.02 || !this.visivel(ip, sx, sy)) continue;
          if (passe === 1) put(sx, sy, COR_PULSO, a);
          else {
            put(sx - 1, sy, COR_BRILHO, a * 0.35); put(sx + 1, sy, COR_BRILHO, a * 0.35);
            put(sx, sy - 1, COR_BRILHO, a * 0.35); put(sx, sy + 1, COR_BRILHO, a * 0.35);
          }
        }
      }
    }

    // the vapour: the young stream a lit pixel, then a bank that swells and fades — dithered through a drifting noise
    // (a plain Bayer grid read as a checkerboard), its core one shade lighter than its edge
    const P = VAPOR_PARTICULA, R = P.rampa;
    for (const q of this.vapor) {
      const f = q.idade / q.vida;
      if (f < 0.15) { put(q.x, q.y, R[0], 0.9); continue; }
      const raio = P.raio[0] + f * P.raio[1];
      const tom = Math.min(R.length - 2, 1 + Math.floor(f * (R.length - 2)));
      const forca = 0.9 * (1 - f) ** 0.8;
      const r = Math.ceil(raio);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > raio) continue;
          const x = Math.round(q.x + dx), y = Math.round(q.y + dy);
          const n = ruido(x * 0.35, y * 0.35 - this.t * 0.8);
          if (BAYER[(y & 3) * 4 + (x & 3)] < forca * (1 - 0.6 * (d / raio)) * (0.5 + n)) put(x, y, d < raio * 0.5 ? R[tom] : R[tom + 1]);
        }
      }
    }

    // the sparks: a head and a 2 px tail, cooling; the flash a plus
    const F = FAISCAS.rampa;
    for (const s of this.faiscas) {
      const f = s.idade / s.vida;
      const cor = F[Math.min(F.length - 1, Math.floor(f * F.length))];
      const ux = s.vx / Math.hypot(s.vx, s.vy), uy = s.vy / Math.hypot(s.vx, s.vy);
      put(s.x, s.y, cor);
      put(s.x - ux, s.y - uy, F[Math.min(F.length - 1, Math.floor(f * F.length) + 1)], 0.8);
      put(s.x - 2 * ux, s.y - 2 * uy, F[F.length - 1], 0.5);
    }
    for (const c of this.claroes) {
      put(c.x, c.y, FAISCAS.flash);
      put(c.x - 1, c.y, FAISCAS.flash, 0.7); put(c.x + 1, c.y, FAISCAS.flash, 0.7);
      put(c.x, c.y - 1, FAISCAS.flash, 0.7); put(c.x, c.y + 1, FAISCAS.flash, 0.7);
    }
  }
}
