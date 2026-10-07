// THE SQUID'S INK — an offline test (07/10), before any game code: 4 panels on the real act-1 nebula, at real speed.
//   rows:    VETORIAL (hard-edged circles, as Phaser Graphics would draw them at native res; the squid fades by alpha)
//            À MÃO   (a pixel blob: noisy edge, 3 tones + rim, ordered-dither fade; the squid fades by dither)
//   columns: CORTINA (big cloud, lingers ~1.2s, above enemies, BELOW every shot — the bullet crosses over it)
//            SÓ A LULA (a small puff just covering her while she fades, gone in ~0.5s)
//   node scripts/_elites/_tinta-f3.mjs [lula]   → folhas/2026-10-07/elites/tinta-lula.gif
import sharp from 'sharp';
import { BLOBS, bayer, clamp01, easeOut, hex, px, tintaMao as tintaMaoLib } from './_tinta-lib.mjs';

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

// ── the two INK BEHAVIOURS (times in s, sizes in native px; origin = the squid's centre) ──
// (07/10: the hand ink moved to `_tinta-lib.mjs`, shared with the installer; the times here are the TEST's, absolute.)
const TINTAS = {
  cortina: { t0: 0.5, cresce: 0.35, segura: 1.7, some: 2.4, blobs: BLOBS.cortina },
  lula: { t0: 0.5, cresce: 0.15, segura: 1.0, some: 1.4, blobs: BLOBS.sopro },
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

const tintaMao = (img, T, cx, cy, t) =>
  tintaMaoLib(img, { cresceS: T.cresce, seguraS: T.segura - T.t0, someS: T.some - T.t0 }, T.blobs, cx, cy, t - T.t0);

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
