// THE SQUID'S INK — an offline test (07/10), before any game code: 4 panels on the real act-1 nebula, at real speed.
//   rows:    VETORIAL (hard-edged circles, as Phaser Graphics would draw them at native res; the squid fades by alpha)
//            À MÃO   (a pixel blob: noisy edge, 3 tones + rim, ordered-dither fade; the squid fades by dither)
//   columns: CORTINA (big cloud, lingers ~1.2s, above enemies, BELOW every shot — the bullet crosses over it)
//            SÓ A LULA (a small puff just covering her while she fades, gone in ~0.5s)
//   node scripts/_elites/_tinta-f3.mjs [lula]   → folhas/2026-10-07/elites/tinta-lula.gif
import sharp from 'sharp';

const LULA = process.argv[2] ?? 'cacadorLula-21-13';
const D = 'docs/superpowers/folhas/2026-10-07/elites';
const FUNDO = 'docs/superpowers/folhas/2026-10-06/elites/ref/fundo-nebulosa.png';
const NAVE = 'public/sprites/ship-jato.png';
const J = { x: 150, y: 70, w: 150, h: 76 };
const Z = 3;
const FPS = 20;
const DUR = 3.0;

const raw = async (s) => {
  const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
};
const fundo = await raw(sharp(FUNDO).extract({ left: J.x, top: J.y, width: J.w, height: J.h }));
const nave = await raw(sharp(NAVE));
const lula = await raw(sharp(`${D}/cand/${LULA}.png`).trim());

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (v) => 1 - (1 - clamp01(v)) ** 3;

function px(img, x, y, rgb, a = 1) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h || a <= 0) return;
  const k = (y * img.w + x) * 4;
  for (let c = 0; c < 3; c++) img.d[k + c] = Math.round(img.d[k + c] * (1 - a) + rgb[c] * a);
}
// mode: { alpha } or { dither } (keep 0..1 — ordered dither removes pixels as it drops)
function blit(img, spr, ox, oy, mode = {}) {
  for (let y = 0; y < spr.h; y++)
    for (let x = 0; x < spr.w; x++) {
      const k = (y * spr.w + x) * 4;
      const a = spr.d[k + 3] / 255;
      if (!a) continue;
      if (mode.dither !== undefined && bayer(x, y) >= mode.dither) continue;
      px(img, ox + x, oy + y, [spr.d[k], spr.d[k + 1], spr.d[k + 2]], a * (mode.alpha ?? 1));
    }
}

// Value noise for the hand-drawn edge.
const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const noise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (v) => v * v * (3 - 2 * v);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
};

// ── the two INK BEHAVIOURS (times in s, sizes in native px; origin = the squid's centre) ──
const TINTAS = {
  cortina: {
    t0: 0.5, cresce: 0.35, segura: 1.7, some: 2.4,
    blobs: [[0, 0, 24], [-14, -8, 15], [13, 6, 16], [6, -14, 12], [-8, 13, 13], [20, -4, 10], [-22, 4, 9]],
  },
  lula: {
    t0: 0.5, cresce: 0.15, segura: 1.0, some: 1.4,
    blobs: [[0, 0, 17], [-9, -6, 11], [8, 7, 11], [4, -10, 8], [-6, 10, 8]],
  },
};
const LULA_SOME = [0.55, 0.95]; // the squid's own fade, under the ink

function tintaVetorial(img, T, cx, cy, t) {
  if (t < T.t0 || t > T.some) return;
  const g = easeOut((t - T.t0) / T.cresce);
  const a = t < T.segura ? 1 : 1 - (t - T.segura) / (T.some - T.segura);
  const CORPO = hex('#140e1f'), BRILHO = hex('#2a1f3d');
  const circ = (x0, y0, r, rgb, al) => {
    for (let y = Math.floor(y0 - r); y <= y0 + r; y++)
      for (let x = Math.floor(x0 - r); x <= x0 + r; x++) if ((x - x0) ** 2 + (y - y0) ** 2 <= r * r) px(img, x, y, rgb, al);
  };
  // Phaser-style: each fillCircle is its own alpha pass, so the overlaps darken — exactly what Graphics does.
  for (const [dx, dy, r] of T.blobs) circ(cx + dx * g, cy + dy * g, r * g, CORPO, 0.7 * a);
  for (const [dx, dy, r] of T.blobs.slice(0, 4)) circ(cx + dx * g - r * 0.3, cy + dy * g - r * 0.3, r * g * 0.4, BRILHO, 0.45 * a);
}

function tintaMao(img, T, cx, cy, t) {
  if (t < T.t0 || t > T.some) return;
  const g = easeOut((t - T.t0) / T.cresce);
  const keep = t < T.segura ? 1 : 1 - (t - T.segura) / (T.some - T.segura);
  const ARO = hex('#2b2040'), MEIO = hex('#160f22'), MIOLO = hex('#0a0710'), BRILHO = hex('#3d2d57');
  const R = Math.max(...T.blobs.map(([dx, dy, r]) => Math.hypot(dx, dy) + r)) + 4;
  const drift = t * 2.5;
  for (let y = Math.floor(cy - R); y <= cy + R; y++)
    for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      let f = -1;
      for (const [dx, dy, r] of T.blobs) {
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

// The enemy bullet that proves the layering: it crosses the cloud and is drawn ON TOP of it.
function tiro(img, t) {
  if (t < 0.9 || t > 2.3) return;
  const x = Math.round(J.w + 4 - (t - 0.9) * 120);
  const y = 40;
  for (const [dx, dy, c] of [[0, 0, '#ff9070'], [1, 0, '#ff4030'], [2, 0, '#ff4030'], [0, 1, '#ff4030'], [1, 1, '#c02018'], [2, 1, '#c02018']])
    px(img, x + dx, y + dy, hex(c));
}

function quadro(t, tecnica, tinta) {
  const img = { d: Buffer.from(fundo.d), w: fundo.w, h: fundo.h };
  blit(img, nave, 6, Math.round(J.h / 2 - nave.h / 2));
  const lx = J.w - lula.w - 10;
  const ly = Math.round(J.h / 2 - lula.h / 2 + Math.sin(t * 3) * 1);
  const k = 1 - clamp01((t - LULA_SOME[0]) / (LULA_SOME[1] - LULA_SOME[0]));
  if (k > 0) blit(img, lula, lx, ly, tecnica === 'vetorial' ? { alpha: k } : { dither: k });
  const cx = lx + lula.w / 2 + 3, cy = ly + lula.h / 2 + 2;
  (tecnica === 'vetorial' ? tintaVetorial : tintaMao)(img, TINTAS[tinta], cx, cy, t);
  tiro(img, t);
  return img;
}

const PAINEIS = [
  ['vetorial', 'cortina', 'VETORIAL · A cortina (abaixo dos tiros)'],
  ['vetorial', 'lula', 'VETORIAL · só tampa a lula'],
  ['mao', 'cortina', 'À MÃO · A cortina (abaixo dos tiros)'],
  ['mao', 'lula', 'À MÃO · só tampa a lula'],
];
const PW = J.w * Z, PH = J.h * Z, LH = 22, GAP = 6;
const rotulos = await Promise.all(PAINEIS.map(([, , txt]) =>
  sharp(Buffer.from(`<svg width="${PW}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="16" font-family="Consolas, monospace" font-size="14" fill="#ffb040">${txt}</text></svg>`)).png().toBuffer()));

const quadros = [];
for (let i = 0; i < Math.round(DUR * FPS); i++) {
  const t = i / FPS;
  const comp = [];
  for (let p = 0; p < PAINEIS.length; p++) {
    const [tec, tin] = PAINEIS[p];
    const img = quadro(t, tec, tin);
    const buf = await sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } }).resize(PW, PH, { kernel: 'nearest' }).png().toBuffer();
    const left = (p % 2) * (PW + GAP), top = Math.floor(p / 2) * (PH + LH + GAP);
    comp.push({ input: rotulos[p], left, top }, { input: buf, left, top: top + LH });
  }
  quadros.push(await sharp({ create: { width: 2 * PW + GAP, height: 2 * (PH + LH) + GAP, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer());
}
const out = `${D}/tinta-lula.gif`;
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(1000 / FPS), loop: 0, interFrameMaxError: 8 })
  .toFile(out);
console.log(out, quadros.length, 'quadros');
