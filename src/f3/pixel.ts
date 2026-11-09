/**
 * THE F3 SCENERY'S PIXEL TOOLS (08/11): what the living casco and the background battle draw with — a Bayer threshold
 * map, a value noise that breaks its grid (a plain Bayer reads as a checkerboard), and the "over" put into an RGBA
 * buffer of a layer that starts at screen row `y0`. Pure.
 */
export type RGB = readonly [number, number, number];

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const hash = (a: number, b: number): number => {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Value noise, 0–1. */
export function ruido(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** A put over an RGBA layer `w × h` whose top is screen row `y0` (screen coordinates in, rounded; alpha "over"). */
export function pintor(out: Uint8ClampedArray, w: number, h: number, y0: number): (x: number, y: number, c: RGB, a?: number) => void {
  return (x, y, c, a = 1) => {
    x = Math.round(x);
    y = Math.round(y) - y0;
    if (x < 0 || x >= w || y < 0 || y >= h || a <= 0) return;
    const i = (y * w + x) * 4;
    const oa = out[i + 3] / 255;
    if (a >= 1 || oa === 0) {
      out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = Math.round(Math.min(1, a) * 255);
      return;
    }
    const na = a + oa * (1 - a);
    out[i] = (c[0] * a + out[i] * oa * (1 - a)) / na;
    out[i + 1] = (c[1] * a + out[i + 1] * oa * (1 - a)) / na;
    out[i + 2] = (c[2] * a + out[i + 2] * oa * (1 - a)) / na;
    out[i + 3] = na * 255;
  };
}
