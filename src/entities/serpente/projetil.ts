/**
 * HER PROJECTILES DRAWN IN PIXELS (the mock 146–175, the 14th round): a sprite authored pointing right, turned to its
 * heading the way the game turns one (`setRotation` with `pixelArt` + `roundPixels` on the 384×216 canvas — its corner
 * snaps to the grid, and every screen pixel samples the sprite, nearest, through the inverse turn), and the missile's
 * flame in its head's colour, glued to its tail. Pure: Node runs it (`scripts/test-serpente-hab.mjs`).
 */
import { HAB } from './numerosHab.ts';
import type { SpriteRGBA } from './projeteisHab';
import type { Cor, Ponto, Put } from './tipos';

/** `alfa` multiplies every pixel's (a skill dissolving) */
export function desenharSprite(put: Put, s: SpriteRGBA, x: number, y: number, ux: number, uy: number, alfa = 1): void {
  const x0 = Math.round(x - s.w / 2), y0 = Math.round(y - s.h / 2), cx = x0 + s.w / 2, cy = y0 + s.h / 2;
  const R = Math.ceil(Math.hypot(s.w, s.h) / 2) + 1;
  for (let Y = Math.floor(cy) - R; Y <= Math.ceil(cy) + R; Y++) for (let X = Math.floor(cx) - R; X <= Math.ceil(cx) + R; X++) {
    const dx = X + 0.5 - cx, dy = Y + 0.5 - cy;
    const sx = Math.floor(dx * ux + dy * uy + s.w / 2), sy = Math.floor(-dx * uy + dy * ux + s.h / 2);
    if (sx < 0 || sy < 0 || sx >= s.w || sy >= s.h) continue;
    const i = (sy * s.w + sx) * 4;
    if (s.px[i + 3] > 8) put(X, Y, [s.px[i], s.px[i + 1], s.px[i + 2]], (s.px[i + 3] / 255) * alfa);
  }
}

/** where a sprite turned nose-down (heading (0, 1)) ends at the top: the screen pixel right above its tail, on the
 * middle column (the same snapping as `desenharSprite`) */
export function caudaDe(s: SpriteRGBA, x: number, y: number): Ponto {
  const cx = Math.round(x - s.w / 2) + s.w / 2, cy = Math.round(y - s.h / 2) + s.h / 2;
  return { x: Math.floor(cx - 0.5 + (s.h / 2 - Math.floor(s.h / 2))), y: Math.ceil(cy - s.w / 2 - 0.5) - 1 };
}

/** the missile's flame in its head's colour (her ordnance: her plates and a coloured flame — two axes apart from the
 * hull's launcher, gunmetal with a cold flame, and the Leviathan's, bone with an amber flame). `k` is the frame count
 * (its length flickers a pixel) */
export function chamaCor(put: Put, x: number, y: number, ux: number, uy: number, f: number, k: number, cor: Cor, alfa = 1): void {
  const { NUCLEO, COR } = HAB.cores;
  const L = Math.round(2 + 4 * Math.min(2.2, f) + ((k * 7 + Math.round(x)) % 3) - 1);
  const px = -uy, py = ux;
  for (let s = 0; s <= L; s++) { // a white root, the head's near-white, its colour; sides one step cooler
    const larg = s < L * 0.5 ? 1 : 0;
    const c = s < 1 ? [255, 255, 255] : s < L * 0.45 ? NUCLEO[cor] : COR[cor];
    const lado = s < 1 ? NUCLEO[cor] : COR[cor];
    for (let w = -larg; w <= larg; w++) put(x + ux * s + px * w, y + uy * s + py * w, w ? lado : c, (s > L * 0.7 ? 0.7 : w ? 0.85 : 1) * alfa);
  }
}
