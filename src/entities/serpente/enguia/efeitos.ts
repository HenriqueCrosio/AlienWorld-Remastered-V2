/**
 * THE EEL'S PIXELFX EFFECTS (08/11, the round he approved: "Perfeito, todos ficaram ótimos") — the mock's
 * `scripts/_serpente/enguia/efeitos.mjs`, ported line by line (plan `2026-11-08-enguia-instalacao.md`, Task 2), on the
 * vendored pixelfx (`./pixelfx/`, patch-gg/pixelfx, MIT — see its LICENSE/NOTICE; Hugo Duprez's Sprite Fusion
 * recipes), each bent to the game's rules (in the vacuum nothing sags, falls or rises by weight) and to her scale:
 *   - the pipes' FIRE (from `flamethrower`): a pressurised plasma stream per lane, dead straight;
 *   - the Echo's SEEDS (from `plasma-ball`): a ~5 px plasma core with 4 wandering tendrils;
 *   - the fusion's IMPLOSION (`implosion` as it is, in a cool steel ramp);
 *   - the geysers' VAPOUR (`poison-cloud` in a dark venom ramp, small);
 *   - the head's burst (the FIREBALL of `big-explosion`, only its body).
 * Drawn into a pixelfx frame (colour + additive light) and laid over the eel's frame (`Camada`).
 */
import { createFrame, clearFrame, painterFor, composite, createFx, fit, hex, mix, WHITE, TAU, rng, loopNoise, clamp, noise2 } from './pixelfx/core/index.js';
import type { Cor, Frame, Fx, Painter } from './pixelfx/core/index.js';
import { pnoise, hotFirst, firePuff, spark, smokePuff } from './pixelfx/fx/fire/_lib.js';
import * as implosao from './pixelfx/fx/explosions/implosion.js';
import * as nuvem from './pixelfx/fx/nature/poison-cloud.js';

export type { Fx, Frame, Painter };

const FOGO = fit(['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6', '#ffffff'], 9);
const CIANO = fit(['#081830', '#14466e', '#288cc8', '#58c8ff', '#9ee0ff', '#d2f2ff', '#f4fcff', '#ffffff'], 8);
export const VENENO_HEX = ['#0a1e18', '#123c28', '#1c6e42', '#34a85c', '#68e074', '#aaf88c', '#e0ffba', '#f4ffe2'];
const ACO = ['#08080e', '#16182a', '#2c3450', '#56688e', '#9cb0cc', '#dce8f4', '#ffffff'];

/** the layer: a pixelfx frame the size of the screen, laid over the eel's frame */
export class Camada {
  readonly f: Frame;
  private readonly bg: Uint32Array;
  usada = false;
  readonly W: number;
  readonly H: number;
  constructor(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.f = createFrame(W, H);
    this.bg = new Uint32Array(W * H);
  }
  pintor(): Painter {
    if (!this.usada) {
      clearFrame(this.f);
      this.usada = true;
    }
    return painterFor(this.f);
  }
  /** the mock's compose onto an opaque RGBA frame (the oracle's) */
  compoe(out: Uint8Array | Uint8ClampedArray): void {
    if (!this.usada) return;
    for (let i = 0, j = 0; i < this.bg.length; i++, j += 4) this.bg[i] = (255 << 24) | (out[j + 2] << 16) | (out[j + 1] << 8) | out[j];
    composite(this.f, out, this.bg);
    this.usada = false;
  }
}

export interface OpcFogo { x: number; y: number; meia: number; alcance: number; frente: number; fim: number; semente: number }

/** the pipes' fire, one lane: o.x, o.y the mouth (the lane's middle), `meia` the lane's half height, `alcance` to the
 * screen's edge, `frente` 0…1 the front's run, `fim` 1…0 burning out */
export function fogoCanos(p: Painter, t: number, o: OpcFogo): void {
  const H = hotFirst(FOGO), S = o.semente, L = o.alcance, Lf = L * clamp(o.frente), M = o.meia, fim = clamp(o.fim);
  p.place(o.x, o.y, true); // (local +x runs left, out of the mouth)
  const cy = (x: number): number => pnoise(x * 0.03 - t * 2.2, 64, S + 9) * 1.6 * Math.min(1, x / 50); // (a waver, never a sag)
  const width = (x: number): number => M * (0.2 + 0.72 * Math.pow(Math.min(1, x / L), 0.32)) * (1 + 0.08 * pnoise(x * 0.09 - t * 9, 64, S + 4));
  const P = 9; // surges racing down it
  for (let x = 0; x <= Lf; x++) {
    const c = cy(x), w = width(x), dn = x / L;
    for (let y = Math.floor(c - w - 2); y <= Math.ceil(c + w + 2); y++) {
      const q = Math.abs(y + 0.5 - c) / w, n = noise2(x * 0.11 - t * 16, y * 0.2 + t * 2, S);
      const qq = q + n * 0.28;
      if (qq > 1.08) continue;
      if (fim < 1 && (noise2(x * 0.2 + 40, y * 0.3, S + 77) * 0.5 + 0.5) > fim) continue; // (burning out in holes)
      const fase = ((x * 0.03 - t * P + 0.35 * noise2(y * 0.15, x * 0.02, S + 5)) % 1 + 1) % 1;
      const surge = fase < 0.08 && qq < 0.5 && noise2(x * 0.3, y * 0.4 - t * 8, S + 8) > -0.2 ? 1 : 0;
      const dj = dn + n * 0.12;
      let lvl = (qq < 0.14 ? 0 : qq < 0.36 ? 1 : qq < 0.62 ? 2 : qq < 0.86 ? 3 : 4) + (dj > 0.35 && qq < 0.36 ? 1 : 0) + (dj > 0.75 && qq < 0.62 ? 1 : 0);
      lvl = Math.max(0, Math.min(4, lvl - surge));
      if (lvl === 4 && pnoise(x * 0.5 + y * 7.3 - t * 30, 40, S + 6) < 0) continue;
      p.px(x, y, [H[0], H[2], H[4], H[6], H[7]][lvl]);
    }
  }
  // puffs of burning plasma tearing off its skin and streaming down with it (straight: nothing falls)
  const R = rng(S, 3);
  for (let i = 0; i < 26; i++) {
    const ph = (R.next() + t * R.range(1.4, 2.4)) % 1, x = ph * L, s = R.sign(), sz = R.range(2.5, 5.5);
    if (x > Lf) continue;
    const c = cy(x), w = width(x), y = c + s * w * R.range(0.7, 1.0);
    firePuff(p, x, y, (1 - ph) * fim, sz * (0.6 + dnOf(x, L)), R.next(), H, 0.12, 1, 0);
  }
  // sparks flung forward along the lane
  for (let i = 0; i < 16; i++) {
    const ph = (R.next() + t * R.range(2, 3.5)) % 1, x = ph * L, y = cy(x) + R.range(-1, 1) * width(x) * 1.1;
    if (x > Lf) continue;
    spark(p, x, y, R.range(350, 600), R.range(-30, 30), (1 - ph) * fim, [H[0], H[1], H[3], H[5]]);
  }
  // the front: a bulb of white fire racing out, puffs rolling off it
  if (o.frente < 1) {
    const c = cy(Lf), w = width(Lf);
    for (let i = 0; i < 7; i++) firePuff(p, Lf - i * 2.5, c + (i - 3) * w * 0.28, 0.9, w * 0.42, 0.05, H, 0.25, 1, 0);
    p.glow(Lf, c, w * 2.2, H[3], 0.5);
  }
  // the mouth: white-hot where the plasma leaves the pipe
  p.circle(1, 0, Math.max(2, M * 0.2) * fim, WHITE);
  p.glow(1, 0, M * 1.2, H[2], 0.7 * fim);
  // light down the lane (the hull and her body catch it)
  for (let d = 10; d <= Lf; d += 14) p.glow(d, cy(d), M * 1.1 + d * 0.05, mix(H[3], H[4], 0.5), 0.22 * fim);
}
const dnOf = (x: number, L: number): number => Math.min(1, x / L);

export interface OpcSemente { x: number; y: number; r: number; semente: number; k?: number }

/** an Echo seed: a small plasma core, its tendrils wandering to the skin of its field (`k` the blink before it bursts) */
export function semente(p: Painter, t: number, o: OpcSemente): void {
  const C = CIANO, r = o.r, n = 4, f = Math.floor(t * 30), ph = (f % 60) / 60, k = o.k ?? 1;
  p.place(o.x, o.y);
  p.glow(0, 0, r + 6, C[3], 0.35 * k);
  p.disc(0, 0, r, C[2], 0.5); // (its field, so it reads as a ball and not a scribble)
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * TAU + 1.2 * loopNoise(ph, 0.9, o.semente + i * 7), rr = r * (0.75 + 0.25 * loopNoise(ph, 0.7, o.semente + i * 7 + 3));
    const ex = Math.cos(a) * rr, ey = Math.sin(a) * rr, w = 1.2 * loopNoise(ph, 1.1, o.semente + i * 7 + 5);
    const mx = ex * 0.5 - Math.sin(a) * w, my = ey * 0.5 + Math.cos(a) * w;
    p.line(0, 0, mx, my, k > 0.6 ? C[3] : C[2]);
    p.line(mx, my, ex, ey, k > 0.6 ? C[4] : C[3]);
    p.px(ex, ey, C[5]);
    p.glow(ex, ey, 4, C[5], 0.4 * k);
  }
  p.circle(0, 0, 1.6, C[5]);
  p.px(0, 0, WHITE);
}

/** the head's burst: a sphere of fire puffs flung out of the skull and cooling. age (s) since the burst */
export function bolaDeFogo(p: Painter, age: number, o: { x: number; y: number; semente: number }): void {
  const H = hotFirst(FOGO), R = rng(o.semente, 9);
  p.place(o.x, o.y);
  if (age < 0.1) {
    p.circle(0, 0, 10 + age * 80, WHITE);
    p.glow(0, 0, 40, H[1], 0.9 * (1 - age / 0.1));
  }
  if (age < 0.55) firePuff(p, 0, 0, 1 - age / 0.55, 13, 0, H, 0.3, 0, 0);
  for (let i = 0; i < 40; i++) {
    const a = R.range(0, TAU), v = R.range(8, 60), life = R.range(0.35, 0.9), sz = R.range(2, 8), d0 = R.range(0, 9);
    if (age > life) continue;
    const u = age / life, d = d0 + v * (1 - Math.exp(-age * 3)); // (flung out, slowing as it spends)
    firePuff(p, Math.cos(a) * d, Math.sin(a) * d, 1 - u, sz, R.next() * 0.6 + (d0 > 5 ? 0.3 : 0), H, 0.2, Math.cos(a), Math.sin(a));
  }
  for (let i = 0; i < 10; i++) { // the spent fire turning to dark smoke, flung on outward (no rising)
    const a = R.range(0, TAU), v = R.range(10, 30), t0 = R.range(0.35, 0.6), life = R.range(0.6, 1.0);
    if (age < t0 || age > t0 + life) continue;
    const u = (age - t0) / life, d = 8 + v * age;
    smokePuff(p, Math.cos(a) * d, Math.sin(a) * d, 1 - u, R.range(4, 7), hex('#3a2a2a'), true, 0.9);
  }
  if (age < 0.5) p.glow(0, 0, 46, H[3], 0.6 * (1 - age / 0.5));
}

/** a running pixelfx instance, and the time the eel's fight stops it (`para`) */
export type FxVivo = Fx & { para?: number };

export function implosaoFx(x: number, y: number): FxVivo {
  return createFx(implosao, { x, y, palette: ACO, seed: 2 });
}
const VAPOR = ['#060c0a', '#0c1814', '#14281e', '#1e3a2a', '#2a5038', '#3a6a48', '#52885c', '#76a878'];
export function vaporFx(x: number, y: number, semente: number): FxVivo {
  return createFx(nuvem, { x, y, palette: VAPOR, spread: 0.22, seed: semente, light: 0.4 });
}

export type { Cor };
