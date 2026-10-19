// BLOCO D · chapter 5, the IMPACT (19/10). His note on round 4: "eu só não gostei do leviatã sendo fincado no solo,
// duro... se um animal colossal e bio mecânico cai, ele não cai duro... talvez não seja melhor usar um efeito de
// explosão + toda física de partículas que você adicionou para mudar depois para o quadro dele já caído?"
// So the body no longer stays staked: on contact an EXPLOSION covers the whole area where the carcass will lie, and as
// it thins the chapter-6 frame (the carcass lying across the colony) shows through. Baked in pixel at native
// resolution (`efeito-de-cena-assado-em-pixel`), in screen coordinates (384×216, origin 0,0), three parts:
//   · the FIREBALL at the contact — billows thrown up and out, white-hot to red, rising and darkening into smoke;
//   · the BASE SURGE — a ground-hugging wall of lit dust running left and right along the ground, wide enough to cover
//     the carcass from the tail (x≈90) to the head (x≈340) — it is what hides the swap;
//   · the PLUME — a few billows that keep rising.
// Every billow is a disc shaded in bands (hotter inside and below, a darker rim), and it dissolves through an ordered
// dither — never alpha — so it stays pixel art.
//   node scripts/_leviata/_explosao.mjs [out=public/sprites/f8-explosao-sheet.png]
import sharp from 'sharp';

const [OUT = 'public/sprites/f8-explosao-sheet.png'] = process.argv.slice(2);
export const FW = 384, FH = 216, N = 48, FPS = 18, COLS = 6;
/** The contact point (the nose of the body in `queda.ts`, NARIZ). */
export const CX = 258, CY = 160;
const ROWS = Math.ceil(N / COLS);

let s = 0xb00b1e5;
const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const entre = (a, b) => a + (b - a) * rnd();

// Hot → cold, the lava palette of the scene into the night's smoke.
const RAMPA = [
  [0.86, [255, 244, 210]],
  [0.72, [255, 214, 120]],
  [0.58, [246, 150, 60]],
  [0.45, [214, 92, 38]],
  [0.33, [140, 52, 30]],
  [0.24, [96, 50, 40]],
];
const cor = (T) => RAMPA.findIndex(([lim]) => T > lim);
// The cold smoke (v1 was ONE flat colour — a dark slab): five tones, lighter on top (the night sky above it), darker
// below and on the rim, with a warm brown underside while the fire under it still glows.
// (v2's were lilac-grey and read as cotton: the night smoke is darker, only a touch lighter on top)
const FUMACA = [[68, 66, 80], [52, 52, 66], [40, 41, 54], [31, 32, 44], [23, 24, 34]];
const BAIXO_QUENTE = [[80, 50, 44], [58, 42, 44]];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/**
 * A billow: starts at (x0, y0), moves with velocity (vx, vy) braked by `drag` (exp), plus a rise `sobe` (px/s²) after
 * `sobeDe` s. Radius r0 → r1 (ease out over `cresce` s), aspect `ax` (x stretch). Temperature T0 · exp(−t/tau).
 * Opacity 1 until `some` s, then dissolves over `dura` s. Born at `t0`.
 */
const bolas = [];
const bola = (o) => bolas.push({ t0: 0, ax: 1, sobe: 0, sobeDe: 0, cresce: 0.5, tom: entre(-0.8, 0.8), zj: entre(-12, 12), ...o });

// 1 · the FIREBALL — thrown up and out over the contact (never below the ground).
for (let k = 0; k < 30; k++) {
  const a = entre(-Math.PI + 0.25, -0.25), v = entre(70, 210);
  bola({ x0: CX + entre(-6, 6), y0: CY - entre(0, 6), vx: Math.cos(a) * v * 1.25, vy: Math.sin(a) * v, drag: 3.6,
    r0: entre(9, 16), r1: entre(20, 32), cresce: 0.45, T0: entre(1.0, 1.25), tau: entre(0.38, 0.6),
    sobe: entre(14, 30), sobeDe: 0.35, some: entre(0.95, 1.45), dura: entre(0.7, 1.0) });
}
// the white flash at the very contact (2 frames — v1's big white disc read as a sticker)
bola({ x0: CX, y0: CY - 8, vx: 0, vy: 0, drag: 1, r0: 22, r1: 40, cresce: 0.12, T0: 1.4, tau: 0.15, some: 0.02, dura: 0.12, ax: 1.3, zj: 200 });

// 2 · the BASE SURGE — along the ground, more to the LEFT (the carcass lies left of the contact, to x≈90).
for (let k = 0; k < 46; k++) {
  const esq = k < 30;
  const v = esq ? entre(230, 420) : entre(160, 300);
  const prof = entre(-12, 26); // the depth on the ground: away (up the screen) or toward the camera
  bola({ x0: CX + entre(-8, 8), y0: CY + prof * 0.35, vx: (esq ? -1 : 1) * v, vy: prof * entre(0.4, 1.1) - entre(4, 18), drag: 2.3,
    r0: entre(7, 11), r1: entre(16, 27), cresce: 0.7, ax: entre(1.5, 2.0), T0: entre(0.55, 0.78), tau: entre(0.28, 0.42),
    sobe: entre(4, 12), sobeDe: 0.5, some: entre(1.05, 1.6), dura: entre(0.8, 1.15), t0: entre(0, 0.08) });
}
// the DEBRIS CLOUD over the carcass's back — the ribs and the dorsal reach up to y≈66 between x≈90 and 250 (v1 left
// them bare from 0.4 s to 1 s, right when the carcass shows through): billows thrown up-left to land over them,
// each aimed at a target point and braked to arrive (travel = v / drag).
for (let k = 0; k < 26; k++) {
  const alvo = { x: entre(92, 300), y: entre(62, 132) };
  const drag = 2.6;
  bola({ x0: CX + entre(-6, 6), y0: CY - entre(4, 12), vx: (alvo.x - CX) * drag, vy: (alvo.y - CY) * drag, drag,
    r0: entre(9, 13), r1: entre(20, 30), cresce: 0.6, ax: entre(1.1, 1.5), T0: entre(0.6, 0.85), tau: entre(0.3, 0.5),
    sobe: entre(6, 14), sobeDe: 0.6, some: entre(1.05, 1.5), dura: entre(0.8, 1.1), t0: entre(0, 0.1) });
}
// the FRONT SKIRT — dust thrown toward the camera, over the carcass's belly on the near ground (y 165–195; v2 left it
// bare while the rest was covered).
for (let k = 0; k < 16; k++) {
  const alvo = { x: entre(130, 345), y: entre(170, 198) };
  const drag = 2.8;
  bola({ x0: CX + entre(-8, 8), y0: CY + entre(0, 6), vx: (alvo.x - CX) * drag, vy: (alvo.y - CY) * drag, drag,
    r0: entre(8, 12), r1: entre(17, 25), cresce: 0.55, ax: entre(1.6, 2.1), T0: entre(0.5, 0.7), tau: entre(0.26, 0.4),
    some: entre(1.0, 1.45), dura: entre(0.75, 1.0), t0: entre(0, 0.08) });
}
// 3 · the PLUME — keeps rising after the rest has thinned.
for (let k = 0; k < 9; k++) {
  bola({ x0: CX + entre(-14, 10), y0: CY - entre(10, 24), vx: entre(-14, 10), vy: entre(-120, -70), drag: 1.4,
    r0: entre(10, 14), r1: entre(20, 28), cresce: 0.9, T0: entre(0.8, 0.95), tau: entre(0.55, 0.8),
    sobe: 18, sobeDe: 0.4, some: entre(1.5, 1.95), dura: entre(0.7, 0.9), t0: entre(0.05, 0.2) });
}

const estado = (b, t) => {
  const tt = t - b.t0;
  if (tt < 0) return null;
  const e = Math.exp(-b.drag * tt), viaja = (1 - e) / b.drag;
  const sob = tt > b.sobeDe ? 0.5 * b.sobe * (tt - b.sobeDe) ** 2 : 0;
  const x = b.x0 + b.vx * viaja, y = Math.min(CY + 30, b.y0 + b.vy * viaja - sob);
  const r = b.r0 + (b.r1 - b.r0) * (1 - Math.exp(-tt / (b.cresce / 2.5)));
  const T = b.T0 * Math.exp(-tt / b.tau);
  const op = tt < b.some ? 1 : Math.max(0, 1 - (tt - b.some) / b.dura);
  // z: lower on the screen = nearer the camera = in front (plus a jitter so rows do not stack like bricks)
  return op > 0 ? { x, y, r, T, op, ax: b.ax, tom: b.tom, z: y + b.zj } : null;
};

// The palettes as ramps, so a pixel can be darkened "one step" inside its own ramp (the contour pass below).
const RAMPAS = [RAMPA.map(([, c]) => c), BAIXO_QUENTE, FUMACA];
const passo = ([r, k]) =>
  r === 0 ? (k + 1 < RAMPAS[0].length ? [0, k + 1] : [1, 0]) : r === 1 ? (k === 0 ? [1, 1] : [2, 3]) : [2, Math.min(FUMACA.length - 1, k + 1)];

const frames = [];
for (let f = 0; f < N; f++) {
  const t = f / FPS;
  // ⚠️ v5: "the billow that covers the pixel the most wins" cut the cloud into straight-seamed polygons. Now the one
  // IN FRONT wins and is drawn whole — round bumps overlapping, the way a pixel cloud is built.
  const vivas = bolas.map((b) => estado(b, t)).filter(Boolean).sort((a, b) => b.z - a.z);
  const buf = Buffer.alloc(FW * FH * 4, 0);
  const dono = new Int16Array(FW * FH).fill(-1); // the billow that owns the pixel
  const tinta = new Int8Array(FW * FH * 2); // [ramp, index]
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const lim = (BAYER[y % 4][x % 4] + 0.5) / 16;
    let melhor = null;
    for (let j = 0; j < vivas.length; j++) {
      const b = vivas[j];
      const dx = (x - b.x) / b.ax, dy = y - b.y;
      if (Math.abs(dx) > b.r * 1.2 || Math.abs(dy) > b.r * 1.2) continue;
      // a lumpy edge: the radius wobbles with the angle, so the disc reads as a billow
      const ang = Math.atan2(dy, dx);
      const rr = b.r * (1 + 0.09 * Math.sin(ang * 5 + b.x * 0.3) + 0.06 * Math.sin(ang * 9 + b.y));
      const d = Math.hypot(dx, dy) / rr;
      if (d >= 1) continue;
      // dissolve through the dither: the edge of the billow goes first, then the whole of it as `op` drops — and
      // where the front one has dissolved, the one behind shows
      // (the dithered rim is thin — ~2 px: a wide one let the billow behind grain through the fire everywhere)
      const cobre = Math.min(1, (1 - d) * 7) * Math.min(1, b.op * 1.25);
      if (cobre < lim) continue;
      melhor = { j, b, d, dy: dy / rr };
      break;
    }
    if (!melhor) continue;
    const { j, b, d, dy } = melhor;
    // hotter inside and BELOW (lit by the fire under it), cooler on top
    const T = b.T * (1 + 0.28 * (1 - d)) + 0.06 * dy;
    let rk;
    const k = cor(T);
    if (k >= 0) {
      rk = d > 0.85 ? passo([0, k]) : [0, k]; // the darker rim
    } else if (dy > 0.25 && T > 0.12) {
      rk = [1, d > 0.75 ? 1 : 0];
    } else {
      // dy runs −1 (top) … 1 (bottom): each billow is a ball lit from the sky above, with its own tone
      const v = 1.4 + 1.5 * dy + b.tom + (d > 0.8 ? 1 : 0) - 0.6 * (1 - d);
      rk = [2, Math.max(0, Math.min(FUMACA.length - 1, Math.round(v)))];
    }
    const p = y * FW + x;
    dono[p] = j; tinta[p * 2] = rk[0]; tinta[p * 2 + 1] = rk[1];
  }
  // The CONTOUR: where two billows meet, the pixel of the one BEHIND goes one step darker — the shadow the front one
  // casts. ⚠️ v4 did it on every side and turned the cloud into cobblestones: only the SHADOW sides — under and right
  // of the billow in front (light from above-left) — and never inside the white-yellow core of the fire.
  // (`vivas` is sorted front to back: a smaller index is nearer the camera.)
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const p = y * FW + x;
    if (dono[p] < 0) continue;
    let rk = [tinta[p * 2], tinta[p * 2 + 1]];
    if (rk[0] === 0 && rk[1] < 2) { const c = RAMPAS[0][rk[1]]; const i = p * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255; continue; }
    for (const [dx, dy] of [[-1, 0], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= FW || yy >= FH) continue;
      const q = yy * FW + xx;
      if (dono[q] >= 0 && dono[q] < dono[p]) { rk = passo(rk); break; }
    }
    const c = RAMPAS[rk[0]][rk[1]];
    const i = p * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
  }
  frames.push({ input: await sharp(buf, { raw: { width: FW, height: FH, channels: 4 } }).png().toBuffer(), left: (f % COLS) * FW, top: Math.floor(f / COLS) * FH });
}
await sharp({ create: { width: FW * COLS, height: FH * ROWS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(frames).png().toFile(OUT);
console.log(OUT, `${N} quadros de ${FW}×${FH} (${COLS}×${ROWS}), contato em ${CX},${CY}, ${FPS} fps, ${bolas.length} bolas`);
