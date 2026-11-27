/**
 * THE PIXEL MASK — collision where things are DRAWN (27/11, the rebalance, step 2; plan
 * `plans/2026-11-27-hitbox-pelo-desenho.md`). Him: *"às vezes relam e não tomam dano ou não relam e tomam dano"*; the
 * Arcade box stays the broad phase, this is the narrow phase — the same idea as the Beast's (`besta/mascara.ts`, 25/11),
 * at 1 px for the small pieces of the stage.
 *
 * Pure (no Phaser): the Node test imports it (`scripts/test-mascara-pixel.mjs`).
 */

export type MascaraPx = {
  /** frame size in px */
  w: number;
  h: number;
  /** 1 = drawn, row by row */
  px: Uint8Array;
};

/** A pixel counts as drawn from this alpha up. */
export const ALFA_MIN = 128;
/** In an ADDITIVE sprite (glow), black is no body: a pixel counts only with light (alpha × brightness, 0–255). */
export const LUZ_MIN_ADD = 64;

/** Packs an RGBA buffer into the mask. `aditivo` = the sprite is drawn with the ADD blend. */
export function montarMascaraPx(rgba: ArrayLike<number>, w: number, h: number, aditivo = false): MascaraPx {
  const px = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3];
    if (a < (aditivo ? 1 : ALFA_MIN)) continue;
    if (aditivo) {
      const luz = (a * Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])) / 255;
      if (luz < LUZ_MIN_ADD) continue;
    }
    px[i] = 1;
  }
  return { w, h, px };
}

/** The pixels drawn in EVERY mask (same size): the human ship's hull, without the engine fire that changes per frame. */
export function intersecao(ms: MascaraPx[]): MascaraPx {
  const { w, h } = ms[0];
  const px = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) px[i] = ms.every((m) => m.w === w && m.h === h && m.px[i]) ? 1 : 0;
  return { w, h, px };
}

/**
 * The FORGIVENESS (him, 27/11: "1 px de perdão"): a pixel stays only if its 4 neighbours are drawn too, `n` times. A
 * 1-px graze of the border does not count; a real touch always does.
 */
export function erodir(m: MascaraPx, n = 1): MascaraPx {
  let atual = m;
  for (let k = 0; k < n; k++) {
    const { w, h, px } = atual;
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        out[i] = px[i] && x > 0 && x < w - 1 && y > 0 && y < h - 1 && px[i - 1] && px[i + 1] && px[i - w] && px[i + w] ? 1 : 0;
      }
    atual = { w, h, px: out };
  }
  return atual;
}

/** Is the frame pixel (x, y) drawn? Outside the frame = no. */
export function desenhado(m: MascaraPx, x: number, y: number): boolean {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  return xi >= 0 && yi >= 0 && xi < m.w && yi < m.h && m.px[yi * m.w + xi] === 1;
}

/** How a sprite sits in the world: what `paraQuadro` needs (Phaser's convention: the frame mirrored about its centre). */
export type Pose = {
  x: number;
  y: number;
  /** radians */
  rotacao: number;
  escalaX: number;
  escalaY: number;
  /** the origin in frame px */
  origemX: number;
  origemY: number;
  espelhoX: boolean;
  espelhoY: boolean;
};

/** A world point → the frame px under it. */
export function paraQuadro(p: Pose, m: MascaraPx, wx: number, wy: number): { x: number; y: number } {
  const dx = wx - p.x;
  const dy = wy - p.y;
  const c = Math.cos(-p.rotacao);
  const s = Math.sin(-p.rotacao);
  let x = (dx * c - dy * s) / (Math.abs(p.escalaX) || 1) + p.origemX;
  let y = (dx * s + dy * c) / (Math.abs(p.escalaY) || 1) + p.origemY;
  if (p.espelhoX) x = m.w - x;
  if (p.espelhoY) y = m.h - y;
  return { x, y };
}

/**
 * Do the two drawings touch inside the world box [x0,x1)×[y0,y1) (where both are, already intersected)? Samples the
 * centre of every world px — at the stage's scales (0.6–1.3) that is at least one sample per frame px of the smaller one.
 */
export function tocam(a: Pose, ma: MascaraPx, b: Pose, mb: MascaraPx, x0: number, y0: number, x1: number, y1: number): boolean {
  for (let wy = Math.floor(y0); wy < y1; wy++)
    for (let wx = Math.floor(x0); wx < x1; wx++) {
      const pa = paraQuadro(a, ma, wx + 0.5, wy + 0.5);
      if (!desenhado(ma, pa.x, pa.y)) continue;
      const pb = paraQuadro(b, mb, wx + 0.5, wy + 0.5);
      if (desenhado(mb, pb.x, pb.y)) return true;
    }
  return false;
}
