// THE STRIKE THAT TWISTS, take B (10/10) — FOLLOW THE LEADER. Why the dolphin read fluid and the serpent did not:
// the dolphin is compact, its whole body sits at ONE point of its path, so "carry the drawing along the path and turn
// it" is right for it. The serpent is ~140px long: her body covers a whole stretch of the path, and every point of
// a real snake's body passes exactly where the head passed. A drawn sprite carried by code (any drawn frame) makes
// the tail slide sideways where the head never went — that is the "travado"/"colado" he saw.
// So here the WHOLE generated serpent (the 63-3 stretched views, one continuous drawing, never parts) is BENT along
// the trail of its own head every frame: the strike up out of the hull, a real loop at the top (the body coils
// because it follows the head round the loop), the long arc down. The roll is tied to the path too: where the head
// rolled, each part of the body rolls when it gets there (a corkscrew travelling down her), picking the side /
// back / flipped-side / belly view of the drawing by the local roll angle. Recomputed at 25 fps: no held frames.
//   node scripts/_elites/_serpente-rastro-demo.mjs   → folhas/2026-10-10/elites/serpente-rastro-demo.gif
import fs from 'node:fs';
import sharp from 'sharp';
import { ampliar, colar, girar, ler, novo } from './_pixel-lib.mjs';
import { CRISTA, mapa, nave, px, recorte } from './_cena-casco.mjs';

const E = 'docs/superpowers/folhas/2026-10-09/elites/esticada';
const OUT = 'docs/superpowers/folhas/2026-10-10/elites';
fs.mkdirSync(OUT, { recursive: true });
const ESCALA = 0.6; // the stretched drawing is ~230px → ~138px in game (he: "quase 4 naves" at 150 was too long)

/** Straighten a stretched view along its own centre line and scale it ONCE (no per-frame rescale = no shimmer). */
async function textura(arq) {
  const q = await ler(arq);
  const cols = [];
  for (let x = 0; x < q.w; x++) {
    let sy = 0, n = 0;
    for (let y = 0; y < q.h; y++) if (q.d[(y * q.w + x) * 4 + 3] > 64) [sy, n] = [sy + y, n + 1];
    cols.push(n ? sy / n : null);
  }
  const x0 = cols.findIndex((c) => c !== null), x1 = cols.findLastIndex((c) => c !== null);
  const R = 10, c = [];
  for (let x = x0; x <= x1; x++) {
    let s = 0, n = 0;
    for (let k = -R; k <= R; k++) if (cols[x + k] != null) [s, n] = [s + cols[x + k], n + 1];
    c.push(s / n);
  }
  const W = x1 - x0 + 1, H = 96;
  const reta = novo(W, H);
  for (let i = 0; i < W; i++)
    for (let j = 0; j < H; j++) {
      const sx = x0 + i, sy = Math.round(c[i] + j - H / 2);
      if (sy < 0 || sy >= q.h) continue;
      q.d.copy(reta.d, (j * W + i) * 4, (sy * q.w + sx) * 4, (sy * q.w + sx) * 4 + 4);
    }
  const Wk = Math.round(W * ESCALA), Hk = Math.round(H * ESCALA);
  const buf = await sharp(reta.d, { raw: { width: W, height: H, channels: 4 } }).resize(Wk, Hk, { kernel: 'nearest' })
    .png({ palette: true, colours: 48, dither: 0 }).toBuffer();
  const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let k = 3; k < data.length; k += 4) data[k] = data[k] > 110 ? 255 : 0;
  return { d: data, w: Wk, h: Hk };
}
const LADO = await textura(`${E}/esticada.png`);
const DORSO = await textura(`${E}/rola-dorso/8.png`);
const BARRIGA = await textura(`${E}/rola-barriga/8.png`);
const L = LADO.w;
// The skull is RIGID (a bone, like any skeletal rig): the first quarter of the drawing never bends, it is carried
// by the neck's position and heading — bending it along the trail mangled the jaws and crest into noise.
const NUCA = Math.round(L * 0.25);

// The eye: the brightest red pixel of the snout (first 12%) of the side view — further back is red tissue.
let OLHO = { i: 0, j: 0, v: -1 };
for (let i = 0; i < L * 0.12; i++)
  for (let j = 0; j < LADO.h; j++) {
    const k = (j * L + i) * 4;
    if (!LADO.d[k + 3]) continue;
    const v = LADO.d[k] - (LADO.d[k + 1] + LADO.d[k + 2]) / 2;
    if (v > OLHO.v) OLHO = { i, j, v };
  }

// ── the path (window px, z: <0 behind the hull, >0 in front) — his drawing: up out of the hull on the right, a loop
// at the top, a long arc down-left in front of the hull. The loop is ~44px across: the 138px body coils about once.
const FPS = 25, J = { x: 92, y: 14, w: 260, h: 202 }, cr = CRISTA - J.y;
const NAVE = { x: 64, y: 70 };
const PONTOS = [
  [240, 460, -1], [238, 300, -1], [234, 200, -1], [228, 140, -0.7], [216, 98, -0.45], [198, 68, -0.25], [178, 54, -0.1],
  [160, 52, -0.05], // into the loop, heading left
  [144, 60, 0], [138, 76, 0.05], [146, 92, 0.1], [162, 98, 0.15], [178, 90, 0.2], [184, 74, 0.25], [176, 58, 0.3],
  [156, 50, 0.4], // out of the loop over its own entry, in front of it
  [132, 56, 0.45], [114, 74, 0.55], [104, 102, 0.7], [102, 136, 0.9], [106, 172, 1], [112, 240, 1], [118, 460, 1],
];
const LACO = [7, 15];
const cr3 = (p0, p1, p2, p3, u) => 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3);
const densa = [];
for (let i = 0; i < PONTOS.length - 1; i++) {
  const [a, b, c, d] = [PONTOS[Math.max(0, i - 1)], PONTOS[i], PONTOS[i + 1], PONTOS[Math.min(PONTOS.length - 1, i + 2)]];
  for (let k = 0; k < 200; k++) densa.push([...[0, 1, 2].map((j) => cr3(a[j], b[j], c[j], d[j], k / 200)), i + k / 200]);
}
densa.push([...PONTOS.at(-1), PONTOS.length - 1]);
// Resample at a fixed step along the arc → O(1) lookup by arc length.
const PASSO = 0.25;
const cam = [];
{
  let acc = 0, alvo = 0;
  for (let i = 1; i < densa.length; i++) {
    const [a, b] = [densa[i - 1], densa[i]];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (alvo <= acc + seg) {
      const u = seg ? (alvo - acc) / seg : 0;
      cam.push(a.map((v, j) => v + (b[j] - v) * u));
      alvo += PASSO;
    }
    acc += seg;
  }
}
const SMAX = (cam.length - 1) * PASSO;
const idx = (s) => Math.max(0, Math.min(cam.length - 1, Math.round(s / PASSO)));
const sDoPonto = (p) => cam.findIndex((c) => c[3] >= p) * PASSO;
const S_LACO = [sDoPonto(LACO[0]), sDoPonto(LACO[1])];
// A gentle slither on the rise and the descent (lateral undulation is a property of the PATH: the body slides
// through fixed bends), fading out at the loop.
const tang = (s) => {
  const a = cam[idx(s - 3)], b = cam[idx(s + 3)];
  const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / n, (b[1] - a[1]) / n];
};
const ondulado = cam.map((c, k) => {
  const s = k * PASSO;
  const longe = Math.min(Math.abs(s - S_LACO[0]), Math.abs(s - S_LACO[1]));
  const dentro = s > S_LACO[0] && s < S_LACO[1];
  const m = dentro ? 0 : Math.min(1, longe / 40);
  const [tx, ty] = tang(s);
  const a = 2.5 * m * Math.sin((2 * Math.PI * s) / 64);
  return [c[0] + ty * a, c[1] - tx * a, c[2]];
});
const P = (s) => ondulado[idx(s)];
const T = (s) => {
  const a = ondulado[idx(s - 2)], b = ondulado[idx(s + 2)];
  const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / n, (b[1] - a[1]) / n];
};
// The roll, tied to the path: one full turn through the loop (smoothstep), none elsewhere.
const ROLA = (s) => {
  const u = Math.max(0, Math.min(1, (s - S_LACO[0]) / (S_LACO[1] - S_LACO[0])));
  return 2 * Math.PI * u * u * (3 - 2 * u);
};

// ── the head's speed along the path: the lunge decelerates as it climbs, the loop braked (~45%, the dolphin's
// brake, never a stop), gravity pulls the dive.
const yCrista = cam.findIndex((c) => c[1] < cr + 20) * PASSO; // start with the head just under the crest
const vel = (s) => {
  if (s < S_LACO[0]) return 300 - (300 - 130) * Math.min(1, (s - yCrista) / (S_LACO[0] - yCrista));
  if (s < S_LACO[1]) return 120;
  return Math.min(330, Math.sqrt(120 ** 2 + 2 * 420 * (s - S_LACO[1])));
};
const dt = 1 / 600;
const sCab = [yCrista];
while (sCab.at(-1) - L < SMAX - 60 && sCab.length < 1e5) sCab.push(sCab.at(-1) + vel(sCab.at(-1)) * dt);
const cabEm = (t) => sCab[Math.min(sCab.length - 1, Math.max(0, Math.round(t / dt)))];
const tDe = (s) => sCab.findIndex((x) => x >= s) * dt;
const tL0 = tDe(S_LACO[0]), tL1 = tDe(S_LACO[1]);

// ── one frame of the serpent: every texel of the drawing placed at (its distance behind the head) on the trail.
const LUZ_FRENTE = 1.08, LUZ_ATRAS = 0.85;
const ditherM = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function serpente(sh, W, H) {
  const cor = new Uint8ClampedArray(W * H * 4), zb = new Float32Array(W * H).fill(-1e9);
  const sN = sh - NUCA, [xN, yN, zN] = P(sN), [txN, tyN] = T(sN);
  for (let i = 0; i < L; i++) {
    const s = sh - i;
    if (s < 0) continue;
    const cabeca = i < NUCA;
    // In the skull: the neck's frame pushed forward along the neck's heading.
    const [x, y, z] = cabeca ? [xN + txN * (NUCA - i), yN + tyN * (NUCA - i), zN] : P(s);
    const [tx, ty] = cabeca ? [txN, tyN] : T(s);
    const nx = ty, ny = -tx; // the drawing's "up" (dorsal side) at heading left = screen up
    const phi = ROLA(cabeca ? sN : s) % (2 * Math.PI);
    // Which view: side (0), back (π/2), side flipped (π), belly (3π/2), dithered between neighbours.
    const q4 = (phi / (Math.PI / 2)) % 4, a = Math.floor(q4), f = q4 - a;
    const luz = z < 0 ? LUZ_ATRAS + (LUZ_FRENTE - LUZ_ATRAS) * (z + 1) : LUZ_FRENTE;
    for (let j = 0; j < LADO.h; j++) {
      // The view switches by whole columns (dithered along the length), never pixel by pixel; the skull takes
      // one view as a block.
      const lim = cabeca ? 0.5 : ditherM[i % 16] / 16;
      const vista = (f > lim ? a + 1 : a) % 4;
      const tex = vista === 1 ? DORSO : vista === 3 ? BARRIGA : LADO;
      const jj = vista === 2 ? LADO.h - 1 - j : j;
      const ii = Math.min(tex.w - 1, Math.round((i / L) * tex.w));
      const k = (jj * tex.w + ii) * 4;
      if (!tex.d[k + 3]) continue;
      const v = j - LADO.h / 2;
      // 2×2 sub-samples per texel: no holes on the outside of the bends.
      for (const [du, dv] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
        const X = Math.round(x - tx * du + nx * (v + dv)), Y = Math.round(y - ty * du + ny * (v + dv));
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        // Behind the hull only above the crest; after the loop she dives back INTO the hull at the crest.
        if ((z < 0 || s > S_LACO[1] + 40) && Y >= cr) continue;
        const o = Y * W + X, zz = z * 1000 - i * 0.01;
        if (zz < zb[o]) continue;
        zb[o] = zz;
        for (let c = 0; c < 3; c++) cor[o * 4 + c] = tex.d[k + c] * luz;
        cor[o * 4 + 3] = 255;
      }
    }
  }
  // The eye, projected by the roll (on the centre line when she shows her back), and where it is.
  const vo = (OLHO.j - LADO.h / 2) * Math.cos(ROLA(sN));
  const ex = xN + txN * (NUCA - OLHO.i) + tyN * vo, ey = yN + tyN * (NUCA - OLHO.i) - txN * vo;
  const olho = { x: Math.round(ex), y: Math.round(ey), visivel: !((zN < 0 || sN > S_LACO[1] + 40) && ey >= cr) };
  return { cor, olho };
}

// Spines: his 3 groups of 3, at the loop's 1/4, 1/2, 3/4 — out of the edge of the coil that faces the ship, straight
// at it, the groups on parallel lines with open lanes between them.
const ESPINHO = mapa(['.OOOOOO........', 'OFRrMMhhHHsssOO', '.OOOOOOOO......']);
const T0 = 0.35;
const espinhos = [];
{
  const c = PONTOS.slice(LACO[0], LACO[1] + 1);
  const cx = c.reduce((a, p) => a + p[0], 0) / c.length, cy = c.reduce((a, p) => a + p[1], 0) / c.length;
  const ang = Math.atan2(NAVE.y - cy, NAVE.x - cx), ux = Math.cos(ang), uy = Math.sin(ang);
  for (const [g, frac] of [0.25, 0.5, 0.75].entries()) {
    // Each trio leaves from the body itself: the first moment (from its quarter of the loop on) when some part of
    // the coil sits in the trio's lane ON THE SIDE FACING THE SHIP. Lanes are 24px apart across the line of fire,
    // so the three groups fly on parallel lines with gaps between.
    const off = (g - 1) * 24, nx = -uy, ny = ux;
    let best = null;
    for (let tt = tL0 + (tL1 - tL0) * (frac - 0.1); !best && tt < tL1 + 0.4; tt += 0.02) {
      const sh = cabEm(tt);
      for (let i = NUCA; i < L; i++) {
        const [x, y] = P(sh - i);
        if (Math.abs((x - cx) * nx + (y - cy) * ny - off) > 3) continue;
        const d = (x - cx) * ux + (y - cy) * uy;
        if (d > 8 && (!best || d > best.d)) best = { d, x, y, tt };
      }
    }
    for (const d of [-6, 0, 6]) espinhos.push({ t0: T0 + best.tt, x: best.x + nx * d, y: best.y + ny * d, ang });
  }
}

// QUADROS_A=<dir>: take A — the same motion, but each pose REDRAWN by PixelLab (transfer-outfit-v2 with the 63-3 as
// the reference, 3 poses per call): drawn frames at the dolphin's 14 fps, placed where the export crop was.
const A = process.env.QUADROS_A ? JSON.parse(fs.readFileSync(`${process.env.QUADROS_A}/recorte.json`, 'utf8')) : null;
const QA = A ? await Promise.all(fs.readdirSync(process.env.QUADROS_A).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b)).map((f) => ler(`${process.env.QUADROS_A}/${f}`))) : null;
const quadros = [];
const rastro = [];
const TOTAL = T0 + sCab.length * dt + 0.6;
for (let f = 0; f < Math.round(TOTAL * FPS); f++) {
  const t = f / FPS, tt = t - T0;
  const img = recorte(J);
  let corpo = null;
  if (tt >= 0 && !A) corpo = serpente(cabEm(tt), img.w, img.h);
  const pintar = () => {
    if (A) {
      const k = Math.floor(tt * 14 + 1e-6);
      if (tt < 0 || k >= QA.length) return;
      const q = QA[k];
      for (let y = 0; y < q.h; y++)
        for (let x = 0; x < q.w; x++) {
          const o = (y * q.w + x) * 4, X = x + A.x, Y = y + A.y;
          if (q.d[o + 3] > 64 && Y < cr) px(img, X, Y, [q.d[o], q.d[o + 1], q.d[o + 2]], 1); // the hull hides the rest
        }
      return;
    }
    if (!corpo) return;
    const { cor } = corpo;
    for (let o = 0; o < img.w * img.h; o++) if (cor[o * 4 + 3]) px(img, o % img.w, Math.floor(o / img.w), [cor[o * 4], cor[o * 4 + 1], cor[o * 4 + 2]], 1);
    // The eye glows, with a short trail: wherever she coils, the head is the point of light leading her.
    const { olho } = corpo;
    rastro.unshift(olho);
    rastro.length = Math.min(rastro.length, 6);
    rastro.forEach((p, k) => {
      if (!p.visivel || k === 0) return;
      px(img, p.x, p.y, [179, 26, 29], 0.5 * (1 - k / 6));
    });
    if (olho.visivel) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(img, olho.x + dx, olho.y + dy, [179, 26, 29], 0.55);
      px(img, olho.x, olho.y, [255, 74, 58], 1);
    }
  };
  colar(img, nave, NAVE.x - nave.w / 2, NAVE.y - nave.h / 2 + Math.min(1, Math.max(0, (tt - tL0 - 0.2) / 0.4)) * 12);
  for (const e of espinhos) {
    const k = t - e.t0;
    if (k < 0) continue;
    const x = e.x + Math.cos(e.ang) * 75 * k, y = e.y + Math.sin(e.ang) * 75 * k;
    if (x < -12 || y < -12) continue;
    const g = girar(ESPINHO, e.ang);
    colar(img, g, x - g.w / 2, y - g.h / 2);
  }
  pintar();
  quadros.push(await ampliar(img, 3));
}
await sharp(quadros, { join: { animated: true } }).gif({ delay: Array(quadros.length).fill(1000 / FPS), loop: 0 }).toFile(`${OUT}/${A ? 'serpente-redesenhada-demo.gif' : 'serpente-rastro-demo.gif'}`);
console.log('serpente-rastro-demo.gif', quadros.length, 'quadros', `laço ${tL0.toFixed(2)}–${tL1.toFixed(2)}s`, 'L', L, 'olho', OLHO);

// EXPORTAR=<dir> [N]: the creature alone (no eye glow, no scene) in a FIXED crop around the loop, N frames from just
// before the loop to just after it — the motion source for take A (PixelLab transfer-outfit redraws each pose).
if (process.env.EXPORTAR) {
  const dir = process.env.EXPORTAR;
  fs.mkdirSync(dir, { recursive: true });
  // TODO=1: the whole strike (out of the hull → loop → into the hull) at the dolphin's 14 fps; else N frames of the loop.
  const N = Number(process.env.N ?? 16);
  const ts = process.env.TODO
    ? [...Array(Math.ceil(sCab.length * dt * 14)).keys()].map((k) => k / 14)
    : [...Array(N).keys()].map((k) => tL0 - 0.12 + ((tL1 + 0.12 - (tL0 - 0.12)) * k) / (N - 1));
  const camadas = ts.map((t) => serpente(cabEm(t), J.w, J.h).cor);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const c of camadas)
    for (let o = 0; o < J.w * J.h; o++)
      if (c[o * 4 + 3]) {
        const x = o % J.w, y = Math.floor(o / J.w);
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
      }
  const LADOQ = Math.min(256, Math.max(x1 - x0, y1 - y0) + 8);
  const cx = Math.round((x0 + x1) / 2 - LADOQ / 2), cy = Math.round((y0 + y1) / 2 - LADOQ / 2);
  for (const [k, c] of camadas.entries()) {
    const q = novo(LADOQ, LADOQ);
    for (let y = 0; y < LADOQ; y++)
      for (let x = 0; x < LADOQ; x++) {
        const X = x + cx, Y = y + cy;
        if (X < 0 || Y < 0 || X >= J.w || Y >= J.h) continue;
        const o = (Y * J.w + X) * 4;
        for (let i = 0; i < 4; i++) q.d[(y * LADOQ + x) * 4 + i] = c[o + i];
      }
    await sharp(q.d, { raw: { width: LADOQ, height: LADOQ, channels: 4 } }).png().toFile(`${dir}/${k}.png`);
  }
  fs.writeFileSync(`${dir}/recorte.json`, JSON.stringify({ x: cx, y: cy, lado: LADOQ, ts, T0 }));
  console.log('exportado', dir, N, 'quadros', LADOQ, 'px, recorte', cx, cy);
}
