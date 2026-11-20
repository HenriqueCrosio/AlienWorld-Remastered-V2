import { GAME_HEIGHT } from '../../config.ts';
import { SONDA as S } from '../../data/numerosSonda.ts';

/**
 * THE SONDA's rules (spec 2026-11-20 §3), pure: the path, who shoots, the dodge, the lean. No Phaser — the tests run
 * them in Node (`scripts/test-sonda-regras.mjs`).
 */
export type TipoCaminho = 'mergulho' | 'diagonal' | 'dispersao';
/** The path of a WAVE: y as a function of x (drawn in space — no sine). */
export interface Caminho {
  tipo: TipoCaminho;
  /** the height she enters at (x = `xEntra`)… */
  y0: number;
  /** …and the one she ends at */
  y1: number;
}
export type Rnd = () => number;
const limitar = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
/** smoothstep on [0, 1], clamped */
export const suave = (u: number): number => {
  const k = limitar(u, 0, 1);
  return k * k * (3 - 2 * k);
};

/**
 * The wave's path, one of three in equal thirds: the DIVE (from the high or low edge of the band to the ship's height),
 * the DIAGONAL CUT, or the DISPERSION (in line at a mid height; each member's own side comes from `caminhoDoMembro`).
 */
export function sortearCaminho(rnd: Rnd, naveY: number): Caminho {
  const alto = rnd() < 0.5;
  const borda = alto ? S.faixa[0] : S.faixa[1];
  const qual = rnd();
  if (qual < 1 / 3) return { tipo: 'mergulho', y0: borda, y1: limitar(naveY, S.faixa[0], S.faixa[1]) };
  if (qual < 2 / 3) return { tipo: 'diagonal', y0: borda, y1: alto ? S.faixa[1] : S.faixa[0] };
  const D = S.dispersao;
  const y = D.alturaY[0] + (D.alturaY[1] - D.alturaY[0]) * rnd();
  return { tipo: 'dispersao', y0: y, y1: y };
}

/** The sides of a dispersing wave of `n` (−1 up, 0 on, +1 down): drawn, but never all the same (that is no fan). */
export function ladosDaDispersao(rnd: Rnd, n: number): number[] {
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    const lados = Array.from({ length: n }, () => Math.floor(rnd() * 3) - 1);
    if (n <= 1 || new Set(lados).size > 1) return lados;
  }
  return Array.from({ length: n }, (_, i) => (i % 3) - 1);
}

/** A member's own path: the wave's, except in the dispersion, where she opens to her side. */
export function caminhoDoMembro(c: Caminho, lado: number): Caminho {
  if (c.tipo !== 'dispersao') return c;
  return { ...c, y1: limitar(c.y0 + lado * S.dispersao.abertura, S.faixa[0], S.faixa[1]) };
}

/** Where the path is at `x`: the dive curves between `curva[0]` and `curva[1]`, the diagonal runs the whole width. */
export function yNoCaminho(c: Caminho, x: number): number {
  const u =
    c.tipo === 'mergulho'
      ? suave((S.curva[0] - x) / (S.curva[0] - S.curva[1]))
      : c.tipo === 'dispersao'
        ? suave((S.dispersao.abre[0] - x) / (S.dispersao.abre[0] - S.dispersao.abre[1]))
        : limitar((S.xEntra - x) / (S.xEntra - S.xSai), 0, 1);
  return c.y0 + (c.y1 - c.y0) * u;
}

/** Which of a wave of `n` shoot: 1 or 2 of 3 (spec §3: gap > shot); a wave of 1 shoots. */
export function quemAtira(rnd: Rnd, n: number): boolean[] {
  const quantos = n <= 1 ? n : rnd() < 0.5 ? 1 : 2;
  const ordem = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  const marca: boolean[] = Array.from({ length: n }, () => false);
  for (let i = 0; i < quantos; i++) marca[ordem[i]] = true;
  return marca;
}

/** The x where her FIRST warning starts: as soon as she is whole on screen. */
export function xDoPrimeiroAviso(rnd: Rnd): number {
  return S.tiro.xPrimeiro[0] + (S.tiro.xPrimeiro[1] - S.tiro.xPrimeiro[0]) * rnd();
}

/**
 * May she start another warning? Under `max` shots, `intervaloS` since the last, and still `frente` px in front of the
 * ship (she does not shoot point-blank or from behind it).
 */
export function atiraDeNovo(tiros: number, desdeUltimoS: number, x: number, naveX: number): boolean {
  return tiros > 0 && tiros < S.tiro.max && desdeUltimoS >= S.tiro.intervaloS - 1e-9 && x >= naveX + S.tiro.frente;
}

/** The dodge: how long the ship has been aligned, when the step started (`null` = not yet), and its side. */
export interface Esquiva {
  alinhadaS: number;
  inicio: number | null;
  dir: 1 | -1;
}
export const esquivaNova = (): Esquiva => ({ alinhadaS: 0, inicio: null, dir: 1 });

/**
 * The ship AIMING at her: at her height and in front of her (she reacts to the aim, not to the shots) — and she is well
 * inside the screen (`xMax`): a dodge at the edge as she comes in is one nobody sees.
 */
export function alinhada(naveX: number, naveY: number, x: number, y: number): boolean {
  return x <= S.esquiva.xMax && naveX <= x - S.esquiva.frenteMin && Math.abs(naveY - y) <= S.esquiva.faixaY;
}

/** One frame of the dodge at her clock `t`: aligned for `demoraS` → the step starts, to the open side; once. */
export function passoEsquiva(s: Esquiva, t: number, dt: number, alinhadaAgora: boolean, y: number): Esquiva {
  if (s.inicio !== null) return s;
  const a = alinhadaAgora ? s.alinhadaS + dt : 0;
  if (a >= S.esquiva.demoraS - 1e-9) return { alinhadaS: a, inicio: t, dir: y < GAME_HEIGHT / 2 ? 1 : -1 };
  return { ...s, alinhadaS: a };
}

/** How far the dodge takes her off the path at her clock `t` (out in `idaS`, back in `voltaS`). */
export function desvioDaEsquiva(s: Esquiva, t: number): number {
  if (s.inicio === null) return 0;
  const u = t - s.inicio;
  const { passo, idaS, voltaS } = S.esquiva;
  if (u < 0) return 0;
  if (u <= idaS) return s.dir * passo * suave(u / idaS);
  if (u < idaS + voltaS) return s.dir * passo * (1 - suave((u - idaS) / voltaS));
  return 0;
}

/**
 * THE SWAY at her clock `t`, on her own `fase` (rad): `dy` added to the path's height, `vx` added to her speed to the
 * left (the surge, as a velocity: the physics moves her x).
 */
export function balanco(t: number, fase: number): { dy: number; vx: number } {
  const B = S.balanco;
  const wy = (2 * Math.PI) / B.periodoS;
  const wx = (2 * Math.PI) / B.periodoXS;
  return { dy: B.amp * Math.sin(wy * t + fase), vx: B.ampX * wx * Math.cos(wx * t + fase * 1.7) };
}

/** Each member's phase: spread along the wave (the line does not sway in unison) plus a little luck. */
export function faseDoBalanco(i: number, rnd: Rnd): number {
  return i * 2.1 + rnd() * 0.8;
}

export type Inclinacao = 'reto' | 'sobe' | 'desce';
/** Her lean from her vertical speed (screen y grows downward). */
export function inclinacao(vy: number): Inclinacao {
  return vy < -S.inclina ? 'sobe' : vy > S.inclina ? 'desce' : 'reto';
}
