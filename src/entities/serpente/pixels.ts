/**
 * THE PIXEL LAYER, the pure part (spec §5.1). The mock blends every effect onto the finished frame (`put`:
 * out = out + (c − out)·a). In the game the effects live on their own transparent canvases, composited over the scene:
 * `sobre` is Porter-Duff "over" with straight alpha, which composites to the same colour. Two canvases
 * (`HAB.profundidade`): a pixel over HER BODY (or the breach lip) goes to the upper one, over her; any other to the lower
 * one, under the ship — the mock's order (scene, her, lip, effects, the ship on top). The ship sits at depth 1, under
 * her (the squid's ink rule), so one canvas could not be both over her and under the ship.
 */
import type { Put, RGB } from './tipos';

export const W = 384, H = 216;

export function sobre(buf: Uint8ClampedArray, i: number, c: RGB, a: number): void {
  if (!(a > 0)) return;
  if (a >= 1) {
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = 255;
    return;
  }
  const da = buf[i + 3] / 255, oa = a + da * (1 - a);
  for (let q = 0; q < 3; q++) buf[i + q] = Math.round((c[q] * a + buf[i + q] * da * (1 - a)) / oa);
  buf[i + 3] = Math.round(oa * 255);
}

/** A drawn object as it sits on screen: its frame's alpha (1 = opaque, `w`×`h`), its top-left on screen and its scale. */
export interface Mascara {
  a: Uint8Array;
  w: number;
  h: number;
  x0: number;
  y0: number;
  sx: number;
  sy: number;
}

/** Is screen pixel (X, Y) opaque in the object — the nearest-neighbour mapping `pixelArt` draws it with? */
export function opaco(m: Mascara, X: number, Y: number): boolean {
  const fx = Math.floor((X + 0.5 - m.x0) / m.sx), fy = Math.floor((Y + 0.5 - m.y0) / m.sy);
  return fx >= 0 && fy >= 0 && fx < m.w && fy < m.h && m.a[fy * m.w + fx] === 1;
}

/**
 * Is (x, y) in THE HEAD, from the skull `a` to the mouth `b`, `r` wide: round behind the skull, along the segment, and a
 * straight cut `alem` of the length past the mouth (03/11: a round end at the mouth spilled onto the dead cyan's neck,
 * next to the green's open mouth in the B).
 */
export function naCabeca(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }, r: number, alem = 0.2): boolean {
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
  const u = L2 > 0 ? ((x - a.x) * dx + (y - a.y) * dy) / L2 : 0;
  if (u > 1 + alem) return false;
  const k = Math.max(0, u);
  return (x - a.x - k * dx) ** 2 + (y - a.y - k * dy) ** 2 <= r * r;
}

/**
 * WHERE A PLAYER SHOT LANDS ON HER (03/11 — the whole body takes damage): the screen box [x0, x1) × [y0, y1) against her
 * drawn pixels. A VISIBLE one inside the head about to fall (`cabeca`, screen pixel → inside?) → `cabeca` (worth more;
 * it wins over the body when the box touches both); any other visible one → `corpo` (it hurts); only where the breach's
 * lip covers her (the lip is drawn in front of her coils) → `casco` (the hull absorbs it); none → `null` (it flies past
 * her: the arcade box is the frame's, the drawing is not).
 */
export function acertoNoCorpo(
  ela: Mascara,
  labio: Mascara | null,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cabeca?: (X: number, Y: number) => boolean,
): 'cabeca' | 'corpo' | 'casco' | null {
  let coberto = false, corpo = false;
  for (let Y = Math.floor(y0); Y < Math.ceil(y1); Y++)
    for (let X = Math.floor(x0); X < Math.ceil(x1); X++) {
      if (!opaco(ela, X, Y)) continue;
      if (labio && opaco(labio, X, Y)) coberto = true;
      else if (cabeca?.(X, Y)) return 'cabeca';
      else corpo = true;
    }
  return corpo ? 'corpo' : coberto ? 'casco' : null;
}

export class Lona {
  readonly cima = new Uint8ClampedArray(W * H * 4);
  readonly baixo = new Uint8ClampedArray(W * H * 4);
  /** 1 where her body (or the breach lip) is opaque this frame */
  readonly corpo = new Uint8Array(W * H);
  /** something was drawn since the last clear */
  sujou = false;

  limpar(): void {
    this.cima.fill(0);
    this.baixo.fill(0);
    this.sujou = false;
  }

  readonly put: Put = (x, y, c, a = 1) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const j = y * W + x;
    sobre(this.corpo[j] ? this.cima : this.baixo, j * 4, c, a);
    this.sujou = true;
  };
}
