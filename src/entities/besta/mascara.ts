/**
 * 25/11 — THE BEAST IS HIT WHERE SHE IS DRAWN (him, playing: *"os tiros estão batendo na caixa do hitbox, quem presta
 * atenção consegue ver que os tiros estão pegando no ar"*, and the slash that hit the ship in the empty top-left corner).
 * The arcade box stays as the broad phase; this is the narrow phase: the frame's ALPHA, read once from the loaded sheet
 * (so it follows any repaint of the art for free), packed in cells of `CELULA` frame px with a summed-area table — a
 * box query is four reads.
 */
import type Phaser from 'phaser';

/** Cell side, in px of the 256² frame (at the fight's 0.70 that is 1.4 screen px). */
export const CELULA = 2;
/** A pixel counts as drawn from this alpha up (the painted slash trails are a little translucent at the tip). */
export const ALFA_MIN = 96;

export type Mascara = {
  /** frame size in px */
  w: number;
  h: number;
  /** cells per row / column */
  cw: number;
  ch: number;
  /** summed-area table, (cw+1)·(ch+1): `soma[(y)·(cw+1)+x]` = drawn cells in [0,x)×[0,y) */
  soma: Int32Array;
};

const cache = new Map<string, Mascara | null>();

/** Packs an RGBA buffer (`w`×`h`) into the cell mask. Pure — exported for the Node test. */
export function montarMascara(rgba: Uint8ClampedArray, w: number, h: number, celula = CELULA, alfaMin = ALFA_MIN): Mascara {
  const cw = Math.ceil(w / celula);
  const ch = Math.ceil(h / celula);
  const cel = new Uint8Array(cw * ch);
  for (let y = 0; y < h; y++) {
    const cy = (y / celula) | 0;
    for (let x = 0; x < w; x++) if (rgba[(y * w + x) * 4 + 3] >= alfaMin) cel[cy * cw + ((x / celula) | 0)] = 1;
  }
  const soma = new Int32Array((cw + 1) * (ch + 1));
  for (let y = 0; y < ch; y++) {
    let linha = 0;
    for (let x = 0; x < cw; x++) {
      linha += cel[y * cw + x];
      soma[(y + 1) * (cw + 1) + x + 1] = soma[y * (cw + 1) + x + 1] + linha;
    }
  }
  return { w, h, cw, ch, soma };
}

/** Is any cell drawn inside the frame-px box [x0,x1)×[y0,y1)? (clipped to the frame) */
export function algumDesenhado(m: Mascara, x0: number, y0: number, x1: number, y1: number, celula = CELULA): boolean {
  const a = Math.max(0, Math.floor(x0 / celula));
  const b = Math.max(0, Math.floor(y0 / celula));
  const c = Math.min(m.cw, Math.ceil(x1 / celula));
  const d = Math.min(m.ch, Math.ceil(y1 / celula));
  if (a >= c || b >= d) return false;
  const W = m.cw + 1;
  return m.soma[d * W + c] - m.soma[b * W + c] - m.soma[d * W + a] + m.soma[b * W + a] > 0;
}

/** The mask of one frame of a loaded texture (built on first use, then cached). `null` = it could not be read. */
export function mascaraDe(scene: Phaser.Scene, chave: string, quadro: string | number): Mascara | null {
  const k = `${chave}#${quadro}`;
  if (cache.has(k)) return cache.get(k) ?? null;
  let m: Mascara | null = null;
  try {
    const f = scene.textures.getFrame(chave, quadro);
    const img = f?.source?.image as CanvasImageSource | undefined;
    if (f && img) {
      const w = f.cutWidth;
      const h = f.cutHeight;
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, f.cutX, f.cutY, w, h, 0, 0, w, h);
        m = montarMascara(ctx.getImageData(0, 0, w, h).data, w, h);
      }
    }
  } catch {
    m = null;
  }
  cache.set(k, m);
  return m;
}
