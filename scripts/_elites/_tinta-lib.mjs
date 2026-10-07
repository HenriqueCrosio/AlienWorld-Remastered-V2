// THE SQUID'S INK, by hand (spec F3 §2.3 — the version he approved in `tinta-lula.gif`, 07/10): a pixel blob with a
// noisy edge, 3 tones + a violet rim and swirls, eaten by an ORDERED DITHER as it fades (edge first, then the body).
// Shared by the test GIF (`_tinta-f3.mjs`) and the installer that bakes the game frames (`_instalar-f3.mjs`).
// `img` = { d: RGBA Buffer, w, h }; times in s since the jet; sizes in native px.

export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const easeOut = (v) => 1 - (1 - clamp01(v)) ** 3;

export function px(img, x, y, rgb, a = 1) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h || a <= 0) return;
  const k = (y * img.w + x) * 4;
  const da = img.d[k + 3] / 255;
  // Over a transparent canvas (the baked frames) the colour is written as is; over a scene it is blended.
  if (da === 0) {
    for (let c = 0; c < 3; c++) img.d[k + c] = rgb[c];
    img.d[k + 3] = Math.round(a * 255);
    return;
  }
  for (let c = 0; c < 3; c++) img.d[k + c] = Math.round(img.d[k + c] * (1 - a) + rgb[c] * a);
  img.d[k + 3] = Math.round(Math.min(1, da + a * (1 - da)) * 255);
}

const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const noise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (v) => v * v * (3 - 2 * v);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
};

/** The two inks: the BLOBS (dx, dy, r) around the squid's centre; the times come from `ELITES.tinta`. */
export const BLOBS = {
  sopro: [[0, 0, 17], [-9, -6, 11], [8, 7, 11], [4, -10, 8], [-6, 10, 8]],
  cortina: [[0, 0, 24], [-14, -8, 15], [13, 6, 16], [6, -14, 12], [-8, 13, 13], [20, -4, 10], [-22, 4, 9]],
};

/** How far the ink reaches from its centre (to size a baked frame). */
export const raio = (blobs) => Math.max(...blobs.map(([dx, dy, r]) => Math.hypot(dx, dy) + r)) + 4;

/** Draws the ink `T = { cresceS, seguraS, someS }` with `blobs`, centred on (cx, cy), `t` s after the jet. */
export function tintaMao(img, T, blobs, cx, cy, t) {
  if (t < 0 || t > T.someS) return;
  const g = easeOut(t / T.cresceS);
  const keep = t < T.seguraS ? 1 : 1 - (t - T.seguraS) / (T.someS - T.seguraS);
  const ARO = hex('#2b2040'), MEIO = hex('#160f22'), MIOLO = hex('#0a0710'), BRILHO = hex('#3d2d57');
  const R = raio(blobs);
  const drift = t * 2.5;
  for (let y = Math.floor(cy - R); y <= cy + R; y++)
    for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      let f = -1;
      for (const [dx, dy, r] of blobs) {
        const rr = r * g;
        if (rr <= 0) continue;
        f = Math.max(f, 1 - Math.hypot(x - (cx + dx * g), y - (cy + dy * g)) / rr);
      }
      f += (noise((x + drift) / 5, (y - drift * 0.6) / 5) - 0.5) * 0.45;
      if (f <= 0) continue;
      // The fade eats the thin edge first, then the body — dithered, never translucent.
      if (bayer(x, y) + (1 - Math.min(1, f * 2.5)) * 0.6 > keep * 1.6) continue;
      // Swirls: a second noise bends the tone bands, so the inside reads as rolling ink, not a flat hole.
      const v = f + (noise((x - drift) / 4 + 20, (y + drift) / 4) - 0.5) * 0.35;
      const rgb = f < 0.1 ? ARO : v < 0.3 ? MEIO : v < 0.42 ? ARO : MIOLO;
      px(img, x, y, rgb, 1);
      if (f > 0.1 && v < 0.36 && noise(x / 3 + 40, y / 3) > 0.7 && x + y < cx + cy) px(img, x, y, BRILHO, 1);
    }
}
