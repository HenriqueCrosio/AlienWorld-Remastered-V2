// BLOCO D · the IMPACT — the EJECTA CURTAIN, baked in pixel at native resolution (`efeito-de-cena-assado-em-pixel`).
// On an airless moon dust does NOT billow: every grain leaves the crater on its own ballistic arc, the arcs together
// form an inverted cone with sharp edges, and everything falls back, slowly, under the low gravity. The grains near the
// core leave molten (lava palette) and cool to dust (ground palette) in flight. Under it, a flattened shock ring runs
// along the ground, dithered.
// Sheet: COLS×ROWS frames of FW×FH, the contact point at (CX, CY) in each frame.
//   node scripts/_leviata/_ejecao.mjs [out=public/sprites/f8-ejecao-sheet.png]
import sharp from 'sharp';

const [OUT = 'public/sprites/f8-ejecao-sheet.png'] = process.argv.slice(2);
// ⚠️ 18/10: the first bake (240×130, 1px grey grains) barely read next to the whole body — now the cone spans the
// screen, the dust is lit by the crater glow and the grains thrown toward the camera are 2px.
export const FW = 384, FH = 200, CX = 192, CY = 170, N = 48, FPS = 18, COLS = 6;
const ROWS = Math.ceil(N / COLS);
const G = 62; // px/s² — the moon: arcs you can follow with the eye

// Deterministic RNG (mulberry32).
let s = 0x5eed1e5;
const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const LAVA = [[255, 214, 120], [246, 150, 60], [214, 92, 38], [140, 52, 30]];
const PO = [[178, 170, 164], [142, 138, 140], [106, 106, 118], [72, 74, 88]]; // dust lit warm by the crater

// Each grain leaves the crater rim in 3D: an azimuth around the crater (φ), a narrow elevation near 45° — the
// curtain is a CONE, and seen from the side its two walls (φ ≈ 0, π) are dense with sharp edges and its front/back
// fill is thin. Depth on the ground projects as a squash of 0.16 (the ground plane seen from low).
const SQ = 0.16;
const graos = [];
for (let k = 0; k < 3200; k++) {
  const phi = rnd() * Math.PI * 2;
  // the walls (φ near 0 and π) carry the curtain; the front/back fill is thinned out
  if (rnd() > 0.25 + 0.75 * Math.abs(Math.cos(phi))) continue;
  const elev = (42 + 8 * rnd() + (rnd() < 0.1 ? -16 * rnd() : 0)) * (Math.PI / 180);
  const v = 34 + 118 * Math.sqrt(rnd());
  const vr = v * Math.cos(elev);
  graos.push({
    vx: vr * Math.cos(phi) * (Math.cos(phi) > 0 ? 1.12 : 1), // a little more to the right: the body came in moving right
    vd: vr * Math.sin(phi), vy: v * Math.sin(elev),
    t0: rnd() * 0.04, quente: rnd() < 0.3 && v > 55, tom: Math.floor(rnd() * 4), pedra: false,
  });
}
// A few rocks (2×2), slower and higher, the ones the eye follows all the way down.
for (let k = 0; k < 24; k++) {
  const phi = rnd() * Math.PI * 2, elev = (50 + 20 * rnd()) * (Math.PI / 180), v = 78 + 46 * rnd();
  graos.push({ vx: v * Math.cos(elev) * Math.cos(phi), vd: v * Math.cos(elev) * Math.sin(phi), vy: v * Math.sin(elev),
    t0: 0.02 * rnd(), quente: false, tom: 2, pedra: true });
}

const frames = [];
for (let f = 0; f < N; f++) {
  const t = f / FPS;
  const buf = Buffer.alloc(FW * FH * 4, 0);
  const px = (x, y, c, a = 255) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= FW || y >= FH) return;
    const i = (y * FW + x) * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = a;
  };
  // The shock ring along the ground: radius grows fast then slows, density thins out (ordered dither).
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  if (t < 0.9) {
    const r = 190 * (1 - Math.pow(1 - Math.min(1, t / 0.9), 2.4));
    const dens = 13 * (1 - t / 0.9);
    for (let a = 0; a < Math.PI * 2; a += 1 / Math.max(8, r)) {
      // broken: the dust front is ragged — the radius wobbles and whole stretches drop out
      const ruido = Math.sin(a * 7 + 1.3) + 0.6 * Math.sin(a * 13 + 4.1);
      if (ruido < -0.9) continue;
      const rr = r + 2.5 * ruido;
      const frente = Math.sin(a) > 0 ? 1 : 0; // the near half is thicker
      for (let dr = 0; dr >= -2 - frente; dr--) {
        const xi = Math.round(CX + Math.cos(a) * (rr + dr)), yi = Math.round(CY + 2 + Math.sin(a) * (rr + dr) * SQ);
        if (BAYER[(yi + 400) % 4][(xi + 400) % 4] < dens + dr * 3) px(xi, yi, PO[-dr > 1 ? 2 : 1]);
      }
    }
  }
  // The grains.
  for (const g of graos) {
    const tt = t - g.t0;
    if (tt < 0) continue;
    const chao = CY + g.vd * tt * SQ; // the ground under the grain, on screen
    const x = CX + g.vx * tt, y = chao - g.vy * tt + 0.5 * G * tt * tt;
    const vy = -g.vy + G * tt;
    const voo = (2 * g.vy) / G; // airborne time (lands back on its own ground point)
    if (tt >= voo) {
      // Landed: a speck stays on the ground for a short while.
      if (tt - voo < 0.3) px(CX + g.vx * voo, CY + g.vd * voo * SQ, PO[3]);
      continue;
    }
    // Molten grains cool in flight: lava → dust over ~0.9 s.
    let c;
    if (g.quente) {
      const k = Math.min(1, tt / 0.9);
      c = k < 0.75 ? LAVA[Math.min(3, Math.floor(k * 4) + (g.tom > 2 ? 1 : 0))] : PO[1];
    } else c = PO[Math.min(3, g.tom + (tt > 1.2 ? 1 : 0) + (tt > 1.9 ? 1 : 0))]; // the dust darkens as it spreads
    px(x, y, c);
    if (g.pedra) { px(x + 1, y, PO[2]); px(x, y + 1, PO[3]); px(x + 1, y + 1, PO[3]); continue; }
    // A short streak behind the fast ones (the first instants), along the velocity.
    const vel = Math.hypot(g.vx, vy);
    if (g.vd > 25) px(x + 1, y, c); // toward the camera: bigger
    if (vel > 70 && tt < 0.5) px(x - (g.vx / vel) * 1.2, y - (vy / vel) * 1.2, c);
  }
  frames.push({ input: await sharp(buf, { raw: { width: FW, height: FH, channels: 4 } }).png().toBuffer(), left: (f % COLS) * FW, top: Math.floor(f / COLS) * FH });
}
await sharp({ create: { width: FW * COLS, height: FH * ROWS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(frames).png().toFile(OUT);
console.log(OUT, `${N} quadros de ${FW}×${FH} (${COLS}×${ROWS}), contato em ${CX},${CY}, ${FPS} fps`);
