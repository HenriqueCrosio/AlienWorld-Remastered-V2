/**
 * THE BACKGROUND BATTLE (08/11, round 3 — spec 2026-11-08-cenario-casco-arena §4, §6; plan
 * `plans/2026-11-08-cenario-casco-rodada3.md`). Pure: `camadaBatalha.ts` feeds it and uploads what it draws.
 *
 * Far off in the nebula the last of the fleet is falling:
 *   - FLASHES: distant explosions — a hot core, a dithered bank cooling down its ramp, a faint glow lighting the gas;
 *     always, rare (both regimes);
 *   - PASSES (the arena only, and only when the fight is calm): 1–3 ships in silhouette fleeing, 2–3 creatures behind,
 *     trading 3 px shots; one ship is hit — a flash, it loses its thrust and tumbles on along its momentum (in the vacuum
 *     nothing falls), trailing smoke, and blows up.
 * Small, dark and slow ([[camada-de-tras-diminui]]); the drifting clouds pass in front of it.
 */
import { BAYER, pintor, ruido, type RGB } from './pixel.ts';
import { COR_SILHUETA, OPCOES, SILHUETAS_CRIATURAS, SILHUETAS_HUMANAS, carimbo, type Carimbo } from './silhuetasF3.ts';

export type RegimeBatalha = 'casco' | 'arena';

/** The layer: 384 × h from screen row y0 (the sky over the hull), between the painting (−96) and the clouds (−92). */
export const CAMADA_BATALHA = { y0: 8, h: 128, depth: -93, hz: 30 } as const;

export const CLAROES = {
  /** seconds between two distant explosions (both regimes) */
  espera: [6, 10] as [number, number],
  vida: [0.55, 0.9] as [number, number],
  raio: [2, 4.5] as [number, number],
  x: [16, 368] as [number, number],
  y: [14, 112] as [number, number],
  rampa: [[255, 222, 150], [255, 170, 80], [200, 96, 50], [110, 54, 40]] as RGB[],
  brilho: [120, 70, 60] as RGB,
};

export const PASSAGEM = {
  /** never two passes closer than this (s, start to start) */
  // (09/11, round 3: "A frequencia pode ser aumentada ligeiramente, pois agora existem mais modelos" — 8 s → 6 s and
  // 0.75 → 0.9; still discreet)
  minEntre: 6,
  /** the chance a calm window gets a pass */
  chance: 0.9,
  vel: [30, 44] as [number, number],
  humanas: [1, 3] as [number, number],
  criaturas: [2, 3] as [number, number],
  /** the high band of the sky: the heads stand up to y≈65 at the right, the eel holds the right edge (her post) */
  y: [16, 58] as [number, number],
  /**
   * A PASS IS SHORT: out of the nebula's haze and back into it (dithered in and out over `nevoa` s), `duracao` s in all —
   * ~150 px of sky. Measured (08/11): the 3 heads' calm windows last 2.4 s and the eel's ~4 s; a full crossing (~10 s at
   * this speed) would run far past them. Where the leading ship appears, by direction — the whole pass stays in the left
   * two thirds, away from the fight (the 1st look put one right over the heads).
   */
  duracao: 4.5,
  nevoa: 0.6,
  xDireita: [30, 120] as [number, number],
  xEsquerda: [190, 270] as [number, number],
  /** a creature shoots every … s; a ship answers half as often */
  tiro: [0.5, 1.1] as [number, number],
  velTiro: 140,
  /** when, along the pass (0–1 of its `duracao`), the leading ship is hit */
  abate: [0.4, 0.62] as [number, number],
  /** the hit ship: how long it tumbles before it blows up (s), its drift (px/s, constant: no gravity) */
  gira: 0.9,
  deriva: [-6, 6] as [number, number],
  tiroHumano: [255, 196, 110] as RGB,
  tiroCriatura: [100, 190, 160] as RGB,
  fumaca: [52, 50, 64] as RGB,
};

const W = 384;
const H = CAMADA_BATALHA.h;
const Y0 = CAMADA_BATALHA.y0;

interface Clarao { x: number; y: number; idade: number; vida: number; raio: number }
interface Nave {
  humana: boolean;
  c: Carimbo;
  x: number;
  y: number;
  /** base row and the sine of the formation */
  yb: number;
  fase: number;
  vx: number;
  vy: number;
  /** null = flying; else seconds since it was hit */
  abatida: number | null;
  viva: boolean;
}
interface Tiro { x: number; y: number; vx: number; vy: number; idade: number; humano: boolean }
interface Fumaca { x: number; y: number; idade: number }
interface Passagem { naves: Nave[]; d: 1 | -1; tiro: number; abateEm: number; abateu: boolean; idade: number }

export class BatalhaFundo {
  readonly claroes: Clarao[] = [];
  passagem: Passagem | null = null;
  readonly tiros: Tiro[] = [];
  private readonly fumacas: Fumaca[] = [];
  private t = 0;
  private k = 0;
  private kAlvo = 0;
  private kVel = 0;
  private esperaClarao: number;
  private ultimaPassagem = -1e9;
  /** the calm window already rolled its dice */
  private janelaUsada = false;
  /** passes started (for the tests) */
  passagens = 0;
  private semente: number;
  /** every model, ready: each pass draws one ship model and one creature model (the whole fleet flies that pair) */
  private readonly humanas = OPCOES.map((o) => carimbo(SILHUETAS_HUMANAS[o]));
  private readonly criaturas = OPCOES.map((o) => carimbo(SILHUETAS_CRIATURAS[o]));
  /** the models of the passes so far (for the tests): "ship/creature" */
  readonly modelos: string[] = [];

  constructor(semente: number) {
    this.semente = semente >>> 0 || 1;
    this.esperaClarao = this.entre(CLAROES.espera) * 0.5;
  }

  private rnd(): number {
    this.semente = (Math.imul(this.semente, 1664525) + 1013904223) >>> 0;
    return this.semente / 4294967296;
  }
  private entre([a, b]: readonly [number, number]): number {
    return a + (b - a) * this.rnd();
  }

  regime(r: RegimeBatalha, ms = 4000): void {
    this.kAlvo = r === 'arena' ? 1 : 0;
    if (ms <= 0) this.k = this.kAlvo;
    this.kVel = ms > 0 ? 1000 / ms : 0;
  }

  /** One step. `calmo`: the fight is in a calm window (the arena's passes wait for one). */
  passo(dt: number, calmo: boolean): void {
    this.t += dt;
    if (this.k !== this.kAlvo) {
      const d = this.kVel * dt;
      this.k = this.k < this.kAlvo ? Math.min(this.kAlvo, this.k + d) : Math.max(this.kAlvo, this.k - d);
    }

    // the flashes
    this.esperaClarao -= dt;
    if (this.esperaClarao <= 0) {
      this.esperaClarao = this.entre(CLAROES.espera);
      this.claroes.push({ x: this.entre(CLAROES.x), y: this.entre(CLAROES.y), idade: 0, vida: this.entre(CLAROES.vida), raio: this.entre(CLAROES.raio) });
    }
    for (let i = this.claroes.length - 1; i >= 0; i--) {
      const c = this.claroes[i];
      c.idade += dt;
      if (c.idade >= c.vida) this.claroes.splice(i, 1);
    }

    // a pass: the arena, a calm window, one roll per window, never two within `minEntre`
    if (!calmo) this.janelaUsada = false;
    else if (this.k > 0.5 && !this.passagem && !this.janelaUsada && this.t - this.ultimaPassagem >= PASSAGEM.minEntre) {
      this.janelaUsada = true;
      if (this.rnd() < PASSAGEM.chance) this.comecaPassagem();
    }
    if (this.passagem) this.andaPassagem(dt);

    for (let i = this.tiros.length - 1; i >= 0; i--) {
      const s = this.tiros[i];
      s.idade += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.idade > 0.7 || s.x < -10 || s.x > W + 10) this.tiros.splice(i, 1);
    }
    for (let i = this.fumacas.length - 1; i >= 0; i--) {
      this.fumacas[i].idade += dt;
      if (this.fumacas[i].idade > 0.8) this.fumacas.splice(i, 1);
    }
  }

  private comecaPassagem(): void {
    this.passagens++;
    this.ultimaPassagem = this.t;
    const d: 1 | -1 = this.rnd() < 0.5 ? 1 : -1;
    const v = this.entre(PASSAGEM.vel) * d;
    const y = this.entre(PASSAGEM.y);
    const x0 = this.entre(d > 0 ? PASSAGEM.xDireita : PASSAGEM.xEsquerda);
    const naves: Nave[] = [];
    const nh = Math.round(this.entre(PASSAGEM.humanas)), nc = Math.round(this.entre(PASSAGEM.criaturas));
    const ih = Math.floor(this.rnd() * OPCOES.length), ic = Math.floor(this.rnd() * OPCOES.length);
    const humana = this.humanas[ih], criatura = this.criaturas[ic];
    this.modelos.push(`${OPCOES[ih]}/${OPCOES[ic]}`);
    for (let i = 0; i < nh; i++) {
      const yb = y + (i % 2 ? 5 : -2) + i * 2;
      naves.push({ humana: true, c: humana, x: x0 - d * i * 16, y: yb, yb, fase: this.rnd() * 6.28, vx: v, vy: 0, abatida: null, viva: true });
    }
    for (let i = 0; i < nc; i++) {
      const yb = y + (i % 2 ? 6 : 0) + this.entre([-3, 3]);
      naves.push({ humana: false, c: criatura, x: x0 - d * (nh * 16 + 22 + i * 15), y: yb, yb, fase: this.rnd() * 6.28, vx: v * 1.04, vy: 0, abatida: null, viva: true });
    }
    this.passagem = { naves, d, tiro: this.entre(PASSAGEM.tiro), abateEm: this.entre(PASSAGEM.abate), abateu: false, idade: 0 };
  }

  private andaPassagem(dt: number): void {
    const p = this.passagem!;
    p.idade += dt;
    for (const n of p.naves) {
      if (!n.viva) continue;
      if (n.abatida == null) {
        n.x += n.vx * dt;
        n.y = n.yb + 2.5 * Math.sin(this.t * 2.1 + n.fase);
      } else {
        // no thrust: momentum only (vx, vy constant) — it tumbles on, smoking, and blows up
        n.abatida += dt;
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (Math.floor(n.abatida / 0.05) !== Math.floor((n.abatida - dt) / 0.05)) this.fumacas.push({ x: n.x + n.c.w / 2, y: n.y + n.c.h / 2, idade: 0 });
        if (n.abatida >= PASSAGEM.gira) {
          n.viva = false;
          this.claroes.push({ x: n.x + n.c.w / 2, y: n.y + n.c.h / 2, idade: 0, vida: 0.7, raio: 3.5 });
        }
      }
    }
    // the hit: the leading ship, `abateEm` into the pass
    const lider = p.naves.find((n) => n.humana && n.viva && n.abatida == null);
    if (!p.abateu && lider) {
      if (p.idade >= p.abateEm * PASSAGEM.duracao) {
        p.abateu = true;
        lider.abatida = 0;
        lider.vx *= 0.8;
        lider.vy = this.entre(PASSAGEM.deriva);
        this.claroes.push({ x: lider.x + lider.c.w / 2, y: lider.y + lider.c.h / 2, idade: 0, vida: 0.35, raio: 2 });
      }
    }
    // the shots: a creature at a ship, now and then a ship back
    p.tiro -= dt;
    if (p.tiro <= 0) {
      p.tiro = this.entre(PASSAGEM.tiro);
      const voando = p.naves.filter((n) => n.viva && n.abatida == null);
      const caca = voando.filter((n) => !n.humana), presa = voando.filter((n) => n.humana);
      if (caca.length && presa.length) {
        const de = caca[Math.floor(this.rnd() * caca.length)], para = presa[Math.floor(this.rnd() * presa.length)];
        const humano = this.rnd() < 0.33;
        const a = humano ? para : de, b = humano ? de : para;
        const sx = a.x + (humano ? (p.d > 0 ? 0 : a.c.w) : (p.d > 0 ? a.c.w : 0)), sy = a.y + a.c.h / 2;
        const dx = b.x + b.c.w / 2 - sx, dy = b.y + b.c.h / 2 - sy, L = Math.hypot(dx, dy) || 1;
        this.tiros.push({ x: sx, y: sy, vx: (dx / L) * PASSAGEM.velTiro, vy: (dy / L) * PASSAGEM.velTiro, idade: 0, humano });
      }
    }
    // the pass is over when it has gone back into the haze (a ship still tumbling blows up first)
    if (p.idade >= PASSAGEM.duracao && p.naves.every((n) => !n.viva || n.abatida == null)) this.passagem = null;
  }

  /** Nothing to draw (most of the time: the flashes are rare and the passes rarer). */
  get vazia(): boolean {
    return !this.claroes.length && !this.passagem && !this.tiros.length && !this.fumacas.length;
  }

  /** How much of the pass shows (0–1): out of the haze and back into it. */
  private visibilidade(): number {
    const p = this.passagem;
    if (!p) return 0;
    return Math.max(0, Math.min(1, p.idade / PASSAGEM.nevoa, (PASSAGEM.duracao - p.idade) / PASSAGEM.nevoa));
  }

  /** Draws the layer (384 × h, RGBA, from y0), cleared first. */
  desenhar(out: Uint8ClampedArray): void {
    out.fill(0);
    const put = pintor(out, W, H, Y0);
    const R = CLAROES.rampa;

    // the flashes: a faint glow lighting the gas, a dithered bank cooling, a hot core at first
    for (const c of this.claroes) {
      const f = c.idade / c.vida;
      const halo = c.raio * 2.6;
      for (let dy = -Math.ceil(halo); dy <= Math.ceil(halo); dy++) {
        for (let dx = -Math.ceil(halo); dx <= Math.ceil(halo); dx++) {
          const d = Math.hypot(dx, dy);
          const x = Math.round(c.x + dx), y = Math.round(c.y + dy);
          const th = BAYER[(y & 3) * 4 + (x & 3)];
          const r = c.raio * (0.6 + 0.6 * f);
          if (d <= r) {
            const forca = (1 - f) * (1 - 0.5 * (d / r)) * (0.55 + ruido(x * 0.6, y * 0.6 + this.t));
            if (th < forca) put(x, y, R[Math.min(R.length - 1, Math.floor(f * R.length + d / r))]);
          } else if (d <= halo && th < 0.22 * (1 - f) * (1 - d / halo)) put(x, y, CLAROES.brilho, 0.6);
        }
      }
      if (f < 0.25) put(c.x, c.y, R[0]);
    }

    for (const s of this.fumacas) {
      if (BAYER[(Math.round(s.y) & 3) * 4 + (Math.round(s.x) & 3)] < 1 - s.idade / 0.8) put(s.x, s.y, PASSAGEM.fumaca, 0.8);
    }
    for (const s of this.tiros) {
      const L = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / L, uy = s.vy / L, cor = s.humano ? PASSAGEM.tiroHumano : PASSAGEM.tiroCriatura;
      put(s.x, s.y, cor);
      put(s.x - ux, s.y - uy, cor, 0.6);
      put(s.x - 2 * ux, s.y - 2 * uy, cor, 0.3);
    }

    const p = this.passagem;
    if (p) {
      const vis = this.visibilidade();
      for (const n of p.naves) {
        if (!n.viva) continue;
        // in and out of the haze: dithered (the hit one stays whole until it blows up)
        const aparece = n.abatida != null ? 1 : vis;
        // facing its way; the hit one tumbles (flipped every 0.12 s)
        const espelho = p.d < 0;
        const vira = n.abatida != null && Math.floor(n.abatida / 0.12) % 2 === 1;
        const x0 = Math.round(n.x), y0 = Math.round(n.y);
        for (let i = 0; i < n.c.px.length; i += 3) {
          const cx = espelho ? n.c.w - 1 - n.c.px[i] : n.c.px[i];
          const cy = vira ? n.c.h - 1 - n.c.px[i + 1] : n.c.px[i + 1];
          const k = n.c.px[i + 2];
          if (aparece < 1 && BAYER[((y0 + cy) & 3) * 4 + ((x0 + cx) & 3)] >= aparece) continue;
          // the hit ship's engine dies
          if (k === 2 && n.abatida != null) { put(x0 + cx, y0 + cy, COR_SILHUETA.corpo); continue; }
          put(x0 + cx, y0 + cy, k === 0 ? COR_SILHUETA.corpo : k === 1 ? COR_SILHUETA.luz : n.humana ? COR_SILHUETA.motor : COR_SILHUETA.olho);
        }
      }
    }
  }
}
