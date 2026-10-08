// Raw-RGBA pixel helpers for the elite art scripts (08/10): read/write PNGs, paste with alpha, flip, and ROTATE BY
// NEAREST NEIGHBOUR — what the game does with `pixelArt: true` (sharp's rotate resamples and blurs pixel art).
// `img` = { d: RGBA Buffer, w, h }.
import sharp from 'sharp';
import { px } from './_tinta-lib.mjs';

export const novo = (w, h) => ({ d: Buffer.alloc(w * h * 4), w, h });

export async function ler(arq, op = {}) {
  let s = sharp(arq).ensureAlpha();
  if (op.flop) s = s.flop();
  if (op.trim) s = sharp(await s.trim().png().toBuffer()).ensureAlpha();
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  return { d: Buffer.from(data), w: info.width, h: info.height };
}

export const gravar = (img, arq) => sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } }).png().toFile(arq);
export const png = (img) => sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } }).png().toBuffer();

/** Pastes `spr` with its top-left at (ox, oy); `alpha` multiplies its opacity. */
export function colar(img, spr, ox, oy, alpha = 1) {
  ox = Math.round(ox);
  oy = Math.round(oy);
  for (let y = 0; y < spr.h; y++)
    for (let x = 0; x < spr.w; x++) {
      const k = (y * spr.w + x) * 4;
      const a = spr.d[k + 3] / 255;
      if (a) px(img, ox + x, oy + y, [spr.d[k], spr.d[k + 1], spr.d[k + 2]], a * alpha);
    }
}

/** Pastes `spr` CENTRED on (cx, cy). */
export const colarCentro = (img, spr, cx, cy, alpha = 1) => colar(img, spr, cx - spr.w / 2, cy - spr.h / 2, alpha);

/** Nearest-neighbour rotation by `rot` rad (clockwise on screen, as Phaser), around the centre; grows the canvas. */
export function girar(spr, rot) {
  if (Math.abs(rot) < 1e-6) return spr;
  const c = Math.cos(rot), s = Math.sin(rot);
  const W = Math.ceil(Math.abs(spr.w * c) + Math.abs(spr.h * s)) + 2;
  const H = Math.ceil(Math.abs(spr.w * s) + Math.abs(spr.h * c)) + 2;
  const out = novo(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - W / 2, dy = y + 0.5 - H / 2;
      const sx = Math.floor(c * dx + s * dy + spr.w / 2), sy = Math.floor(-s * dx + c * dy + spr.h / 2);
      if (sx < 0 || sy < 0 || sx >= spr.w || sy >= spr.h) continue;
      spr.d.copy(out.d, (y * W + x) * 4, (sy * spr.w + sx) * 4, (sy * spr.w + sx) * 4 + 4);
    }
  return out;
}

/** Resizes by nearest (for the magnified sheets). */
export const ampliar = (img, z) => sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } }).resize(img.w * z, img.h * z, { kernel: 'nearest' }).png().toBuffer();
