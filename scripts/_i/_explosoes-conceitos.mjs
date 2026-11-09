// BLOCO I, etapa 1 (09/11) — the EXPLOSION CONCEPTS (spec `specs/2026-11-09-bloco-i-explosoes-design.md` §4). Four
// ways, drawn with the pixelfx pieces (`firePuff`, `smokePuff`, `spark`, the light) as pure age → drawing functions (the
// model of the eel head's `bolaDeFogo`), all in the VACUUM (nothing rises or falls by weight), next to today's sheets:
//   A fogo e fumaça · B plasma · C fumaça densa · D estilhaços
// Writes into <out>: `comparativo.mp4` (rows = small / medium / big, columns = today, A, B, C, D, over the F2 painting,
// real speed), `cadeia.mp4` (the cutscene 1 chain — 14 bursts sweeping right to left, every 4th big — for each),
// `quadros-<X>.png` (the big one, every 3rd frame ×3) and `comparativo.png` (a still of the grid at 0.25 s).
//   node scripts/_i/_explosoes-conceitos.mjs <out-dir>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { createFrame, clearFrame, painterFor, composite, fit, hex, mix, WHITE, TAU, rng, clamp, noise2 } from '../../src/fx/pixelfx/core/index.js';
import { hotFirst, firePuff, smokePuff, spark, ember, soft, solid } from '../../src/fx/pixelfx/fx/fire/_lib.js';

const OUT = process.argv[2] ?? 'docs/superpowers/folhas/2026-11-09/explosoes';
fs.mkdirSync(OUT, { recursive: true });
const FPS = 30;

// the fire (light only where there is energy): white-hot → amber → red → soot
// the palettes, `ease`, `hash` and the smoke now live in the recipes (`explosoes/receitas.mjs`, the installed ones);
// the four concepts below stay as they were approved, so this sheet stays reproducible.
import { H, FUMO, CASCO, ease, hash, fumacaDensa } from './explosoes/receitas.mjs';
const FAISCA = [H[0], H[1], H[3], H[5]];
const BRASA = [H[2], H[4], H[6], hex('#2a1410')];

// ─── A — fogo e fumaça: the fireball opens, fire flung out and cooling, dark smoke opening in a sphere behind it ───
function A(p, age, { R, D, seed }) {
  const r = rng(seed, 9), rf = rng(seed, 21);
  // the smoke first (behind): it is born where the fire cools, and opens slowly
  const nS = Math.round(10 + R * 0.8), fumos = [];
  for (let i = 0; i < nS; i++) {
    const a = rf.range(0, TAU), dist = R * rf.range(0.6, 1.5), t0 = D * rf.range(0.22, 0.38), life = D * rf.range(0.9, 1.2), sz = R * rf.range(0.26, 0.46);
    if (age < t0 || age > t0 + life) continue;
    const u = (age - t0) / life, d = R * 0.35 + dist * ease(u * 1.2);
    fumos.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: sz * (0.8 + 0.8 * ease(u * 2)), w: 1.3 - 0.4 * u });
  }
  const ug = clamp((age - 0.3 * D) / (1.15 * D));
  fumacaDensa(p, fumos, { fio: ug ** 1.3, t: age, seed, resta: clamp((1 - ug) * 5) });
  if (age < 0.07) { p.circle(0, 0, R * 0.5 * (1 + age * 8), WHITE); p.glow(0, 0, R * 2.8, H[1], 0.9 * (1 - age / 0.07)); }
  const kc = 1 - age / (0.4 * D);
  if (kc > 0) firePuff(p, 0, 0, kc, R * 0.8, 0, H, 0.3, 0, 0);
  const nF = Math.round(10 + R * 1.1);
  for (let i = 0; i < nF; i++) {
    const a = r.range(0, TAU), dist = R * r.range(0.7, 2.0), life = D * r.range(0.3, 0.65), sz = R * r.range(0.18, 0.42), d0 = R * r.range(0, 0.45);
    if (age > life) continue;
    const d = d0 + dist * (1 - Math.exp((-age * 4) / D));
    firePuff(p, Math.cos(a) * d, Math.sin(a) * d, 1 - age / life, sz, r.next() * 0.6, H, 0.2, Math.cos(a), Math.sin(a));
  }
  const nK = Math.round(8 + R * 0.8);
  for (let i = 0; i < nK; i++) {
    const a = r.range(0, TAU), v = (R * r.range(5, 12)) / D, life = D * r.range(0.18, 0.45);
    if (age > life) continue;
    const d = v * age * (1 - (0.3 * age) / life);
    spark(p, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v, 1 - age / life, FAISCA);
  }
  if (age < 0.5 * D) p.glow(0, 0, R * 3, H[3], 0.55 * (1 - age / (0.5 * D)));
}

// ─── B — plasma: energy with no smoke; a shell with a ragged edge, a white core, crackling arcs ───
function B(p, age, { R, D, seed }) {
  const r = rng(seed, 5);
  const k = age / D;
  if (age < 0.06) { p.circle(0, 0, R * 0.7, WHITE); p.glow(0, 0, R * 3.2, H[1], 1); }
  const kc = 1 - k / 0.35;
  if (kc > 0) { solid(p, 0, 0, R * 0.55 * kc + 1, kc > 0.5 ? WHITE : H[1]); p.glow(0, 0, R * 1.8, H[2], 0.6 * kc); }
  // the shell: its radius runs out and slows, its thickness thins, its edge breathes with noise
  const rs = R * (0.4 + 1.7 * ease(k * 1.3)), w = Math.max(0.8, R * 0.28 * (1 - k)), fade = clamp(1.25 - k * 1.25);
  if (fade > 0) {
    const ext = rs + w + 3;
    p.each(-ext, -ext, ext, ext, (x, y) => {
      const d = Math.hypot(x, y), th = Math.atan2(y, x);
      const re = rs * (1 + 0.14 * (noise2(Math.cos(th) * 2 + seed, Math.sin(th) * 2 + age * 3) - 0.5) * 2);
      const e = Math.abs(d - re);
      if (e > w) return;
      const heat = clamp(k * 1.3 + (e / w) * 0.35);
      p.dot(x, y, H[Math.min(H.length - 1, 1 + Math.floor(heat * (H.length - 3)))], fade * (1 - (e / w) * 0.5));
    });
    p.glowRing(0, 0, rs, w + 3, H[3], 0.35 * fade);
  }
  // the arcs: a few jagged bolts from the core to the shell, re-rolled every 2 frames
  if (k < 0.6) {
    const q = Math.floor(age * 15), ra = rng(seed * 31 + q, 3), n = 3 + Math.round(R / 10);
    for (let i = 0; i < n; i++) {
      let a = ra.range(0, TAU), x0 = 0, y0 = 0;
      const steps = 4, len = rs * ra.range(0.6, 1);
      for (let s = 1; s <= steps; s++) {
        a += ra.range(-0.5, 0.5);
        const x1 = Math.cos(a) * (len * s) / steps, y1 = Math.sin(a) * (len * s) / steps;
        p.line(x0, y0, x1, y1, s < 3 ? H[1] : H[3]);
        x0 = x1; y0 = y1;
      }
    }
  }
  // the embers left floating (no smoke)
  const nE = Math.round(6 + R * 0.4);
  for (let i = 0; i < nE; i++) {
    const a = r.range(0, TAU), v = (R * r.range(1.2, 2.4)) / D, t0 = D * r.range(0.2, 0.4), life = D * r.range(0.4, 0.7);
    if (age < t0 || age > t0 + life) continue;
    const d = R * 0.5 + v * (age - t0);
    ember(p, Math.cos(a) * d, Math.sin(a) * d, 1 - (age - t0) / life, R > 20 ? 2 : 1, BRASA, i * 1.7 + age * 30);
  }
}

// ─── C — fumaça densa: a short fire, then a heavy cloud behind it that lingers and frays to wisps ───
function C(p, age, { R, D, seed }) {
  const r = rng(seed, 7), rf = rng(seed, 23);
  const Dc = D * 1.5;
  const nS = Math.round(12 + R * 1.0), fumos = [];
  for (let i = 0; i < nS; i++) {
    const a = rf.range(0, TAU), dist = R * Math.sqrt(rf.next()) * rf.range(0.5, 1.4), t0 = D * rf.range(0.14, 0.3), life = Dc * rf.range(0.8, 1.0), sz = R * rf.range(0.24, 0.44);
    if (age < t0 || age > t0 + life) continue;
    const u = (age - t0) / life, d = dist * (0.35 + 0.65 * ease(u * 1.2));
    fumos.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: sz * (0.8 + 0.8 * ease(u * 2)), w: 1.4 - 0.4 * u });
  }
  const ug = clamp((age - 0.25 * D) / (Dc * 1.05));
  fumacaDensa(p, fumos, { fio: ug ** 1.2, t: age, seed, resta: clamp((1 - ug) * 5) });
  // embers glowing in the smoke, first half
  const nE = Math.round(5 + R * 0.35);
  for (let i = 0; i < nE; i++) {
    const a = rf.range(0, TAU), d0 = R * rf.range(0.2, 1.1), t0 = D * rf.range(0.25, 0.4), life = D * rf.range(0.4, 0.8);
    if (age < t0 || age > t0 + life) continue;
    ember(p, Math.cos(a) * d0, Math.sin(a) * d0, 1 - (age - t0) / life, R > 20 ? 2 : 1, BRASA, i * 2.3 + age * 25);
  }
  if (age < 0.06) { p.circle(0, 0, R * 0.45, WHITE); p.glow(0, 0, R * 2.4, H[1], 0.8); }
  const kc = 1 - age / (0.3 * D);
  if (kc > 0) firePuff(p, 0, 0, kc, R * 0.7, 0, H, 0.25, 0, 0);
  const nF = Math.round(6 + R * 0.5);
  for (let i = 0; i < nF; i++) {
    const a = r.range(0, TAU), dist = R * r.range(0.5, 1.2), life = D * r.range(0.25, 0.45), sz = R * r.range(0.2, 0.4);
    if (age > life) continue;
    const d = dist * ease(age / life);
    firePuff(p, Math.cos(a) * d, Math.sin(a) * d, 1 - age / life, sz, r.next() * 0.5, H, 0.18, Math.cos(a), Math.sin(a));
  }
  if (age < 0.35 * D) p.glow(0, 0, R * 2.6, H[3], 0.5 * (1 - age / (0.35 * D)));
}

// ─── D — estilhaços: the fire, and hull shards tumbling out straight, burning, each leaving a smoke trail behind ───
function Dd(p, age, { R, D, seed }) {
  const r = rng(seed, 11), rf = rng(seed, 25);
  // the shards' state first (their trails go in the smoke, drawn behind everything)
  const nP = Math.round(5 + R * 0.35), trilhas = [], cacos = [];
  for (let i = 0; i < nP; i++) {
    const a = r.range(0, TAU), v = (R * r.range(2.2, 4.5)) / D, life = D * r.range(0.7, 1.1), s = Math.max(1, R * r.range(0.07, 0.14)), va = r.range(-9, 9), a0 = r.range(0, TAU);
    if (age > life) continue;
    const u = age / life, d = R * 0.3 + v * age;
    for (let j = 1; j <= 6; j++) {
      const ta = age - j * 0.05;
      if (ta < 0.08) break;
      const dd = R * 0.3 + v * ta;
      trilhas.push({ x: Math.cos(a) * dd, y: Math.sin(a) * dd, r: s * (1.5 + j * 0.3), w: clamp(1 - u * 0.7 - j * 0.08) * 1.3 });
    }
    cacos.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s, ang: a0 + va * age, u, i });
  }
  const nS = Math.round(5 + R * 0.3);
  for (let i = 0; i < nS; i++) {
    const a = rf.range(0, TAU), dist = R * rf.range(0.5, 1.2), t0 = D * rf.range(0.22, 0.35), life = D * rf.range(0.7, 0.95), sz = R * rf.range(0.35, 0.55);
    if (age < t0 || age > t0 + life) continue;
    const u = (age - t0) / life;
    trilhas.push({ x: Math.cos(a) * dist * ease(u), y: Math.sin(a) * dist * ease(u), r: sz * (0.8 + 0.7 * ease(u * 2)), w: 1.3 - 0.4 * u });
  }
  const ug = clamp((age - 0.25 * D) / D);
  fumacaDensa(p, trilhas, { fio: ug ** 1.2, t: age, seed, resta: clamp((1 - ug) * 5) });
  if (age < 0.06) { p.circle(0, 0, R * 0.45, WHITE); p.glow(0, 0, R * 2.6, H[1], 0.85); }
  const kc = 1 - age / (0.35 * D);
  if (kc > 0) firePuff(p, 0, 0, kc, R * 0.7, 0, H, 0.28, 0, 0);
  const nF = Math.round(7 + R * 0.7);
  for (let i = 0; i < nF; i++) {
    const a = r.range(0, TAU), dist = R * r.range(0.6, 1.5), life = D * r.range(0.25, 0.5), sz = R * r.range(0.16, 0.36);
    if (age > life) continue;
    const d = dist * (1 - Math.exp((-age * 4) / D));
    firePuff(p, Math.cos(a) * d, Math.sin(a) * d, 1 - age / life, sz, r.next() * 0.5, H, 0.2, Math.cos(a), Math.sin(a));
  }
  for (const c of cacos) {
    // a small turning triangle, lit side / shaded side, burning at first; it blinks out by noise at the end
    if (c.u > 0.75 && hash(c.i, Math.floor(age * 20), 3) > (1 - c.u) * 4) continue;
    const pts = [0, 2.1, 4.2].map((o, k) => [c.x + Math.cos(c.ang + o) * c.s * (k === 0 ? 1.4 : 1), c.y + Math.sin(c.ang + o) * c.s * (k === 0 ? 1.4 : 1)]);
    p.tri(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1], Math.cos(c.ang) > 0 ? CASCO.luz : CASCO.corpo);
    if (c.u < 0.6) ember(p, c.x, c.y, 1 - c.u / 0.6, 1, BRASA, c.i * 1.3 + age * 30);
  }
}

const CONCEITOS = { A, B, C, D: Dd };
// the three sizes, matched to what the game shows today (small sheet ×1.1 ≈ 35 px, medium ×0.9 ≈ 58, big ×1 = 128)
const TAMANHOS = [
  { nome: 'pequena', R: 6, D: 0.55, cel: 60, hoje: { arq: 'explosion-small-sheet', q: 32, n: 9, fps: 20, esc: 1.1 } },
  { nome: 'média', R: 11, D: 0.8, cel: 100, hoje: { arq: 'explosion-sheet', q: 64, n: 13, fps: 18, esc: 0.9 } },
  { nome: 'grande', R: 26, D: 1.2, cel: 190, hoje: { arq: 'explosion-big-sheet', q: 128, n: 13, fps: 13, esc: 1 } },
];
const COLW = 190, COLS = ['hoje', 'A', 'B', 'C', 'D'];
const GW = COLW * COLS.length, GH = TAMANHOS.reduce((s, t) => s + t.cel, 0);

// the background: the F2 painting (480×270), its middle
const fundo = await sharp('public/sprites/paint-bg-f2.png').removeAlpha().raw().toBuffer({ resolveWithObject: true });

/** today's frames, scaled (nearest) to how the game draws them */
const hojeFrames = {};
for (const t of TAMANHOS) {
  const h = t.hoje, lado = Math.round(h.q * h.esc), fr = [];
  for (let i = 0; i < h.n; i++) {
    const { data } = await sharp(`public/sprites/${h.arq}.png`).extract({ left: i * h.q, top: 0, width: h.q, height: h.q })
      .resize(lado, lado, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    fr.push({ data, lado });
  }
  hojeFrames[t.nome] = fr;
}

/** the painting tile under a cell at (x0, y0) of a W×H canvas: it wraps over the 480×270 painting, offset per cell */
function pintaFundo(out, W, x0, y0, w, h, ox, oy) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = (x + ox) % fundo.info.width, sy = (y + oy) % fundo.info.height;
    const i = ((y0 + y) * W + x0 + x) * 4, j = (sy * fundo.info.width + sx) * 3;
    out[i] = fundo.data[j]; out[i + 1] = fundo.data[j + 1]; out[i + 2] = fundo.data[j + 2]; out[i + 3] = 255;
  }
}

/** a pixelfx effect drawn into a cell (w×h at x0,y0 of a W-wide RGBA canvas) at its centre */
function desenhaFx(out, W, x0, y0, w, h, fn, age, o) {
  const f = createFrame(w, h);
  clearFrame(f);
  const p = painterFor(f);
  p.reset();
  p.place(w / 2, h / 2);
  fn(p, age, o);
  const cel = new Uint8ClampedArray(w * h * 4), bg = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y0 + y) * W + x0 + x) * 4;
    bg[y * w + x] = (255 << 24) | (out[i + 2] << 16) | (out[i + 1] << 8) | out[i];
  }
  composite(f, cel, bg);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y0 + y) * W + x0 + x) * 4, j = (y * w + x) * 4;
    out[i] = cel[j]; out[i + 1] = cel[j + 1]; out[i + 2] = cel[j + 2];
  }
}

/** today's sheet frame at `age`, centred in the cell (alpha over) */
function desenhaHoje(out, W, x0, y0, w, h, t, age) {
  const fr = hojeFrames[t.nome], q = Math.floor(age * t.hoje.fps);
  if (q >= fr.length) return;
  const { data, lado } = fr[q], ox = x0 + Math.floor((w - lado) / 2), oy = y0 + Math.floor((h - lado) / 2);
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    const X = ox + x, Y = oy + y;
    if (X < x0 || Y < y0 || X >= x0 + w || Y >= y0 + h) continue;
    const j = (y * lado + x) * 4, a = data[j + 3] / 255;
    if (!a) continue;
    const i = (Y * W + X) * 4;
    for (let k = 0; k < 3; k++) out[i + k] = Math.round(data[j + k] * a + out[i + k] * (1 - a));
  }
}

async function video(nome, W, H, n, quadro, K = 2) {
  const dir = path.join(OUT, `q-${nome}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  for (let i = 0; i < n; i++) {
    const buf = quadro(i);
    await sharp(Buffer.from(buf.buffer), { raw: { width: W, height: H, channels: 4 } }).resize(W * K, H * K, { kernel: 'nearest' })
      .png().toFile(path.join(dir, `${String(i).padStart(4, '0')}.png`));
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(OUT, `${nome}.mp4`)]);
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── the grid: rows = sizes, columns = today + the concepts, looped twice with a short pause
const CICLO = 2.4;
function grade(t) {
  const out = new Uint8ClampedArray(GW * GH * 4);
  let y0 = 0;
  for (const [ri, tm] of TAMANHOS.entries()) {
    for (const [ci, c] of COLS.entries()) {
      const x0 = ci * COLW;
      pintaFundo(out, GW, x0, y0, COLW, tm.cel, 40 + ri * 70, 30 + ri * 60);
      if (c === 'hoje') desenhaHoje(out, GW, x0, y0, COLW, tm.cel, tm, t);
      else desenhaFx(out, GW, x0, y0, COLW, tm.cel, CONCEITOS[c], t, { R: tm.R, D: tm.D, seed: 3 + ri });
    }
    y0 += tm.cel;
  }
  return out;
}
await video('comparativo', GW, GH, Math.round(CICLO * 2 * FPS), (i) => grade((i / FPS) % CICLO));
{
  const g = grade(0.25);
  await sharp(Buffer.from(g.buffer), { raw: { width: GW, height: GH, channels: 4 } }).resize(GW * 2, GH * 2, { kernel: 'nearest' }).png().toFile(path.join(OUT, 'comparativo.png'));
}

// ── the cutscene 1 chain: 14 bursts every 0.15 s sweeping right → left along the deck, every 4th big (as the scene does)
const CW = 384, CH = 216;
const cadeia = Array.from({ length: 14 }, (_, i) => {
  const r = rng(77 + i, 1), k = i / 13;
  return { t: i * 0.15, x: 394 - k * 354 + r.range(-14, 14), y: 128 + r.range(-10, 26), grande: i % 4 === 3 };
});
function quadroCadeia(c, t) {
  const out = new Uint8ClampedArray(CW * CH * 4);
  pintaFundo(out, CW, 0, 0, CW, CH, 48, 27);
  for (const e of cadeia) {
    const age = t - e.t;
    if (age < 0) continue;
    const tm = e.grande ? { ...TAMANHOS[2], R: 21, D: 1.1 } : { ...TAMANHOS[1], R: 14, D: 0.8 };
    const w = e.grande ? 170 : 110, x0 = Math.round(e.x - w / 2), y0 = Math.round(e.y - w / 2 - (e.grande ? 14 : 0));
    // clip the cell to the screen
    const cx0 = Math.max(0, x0), cy0 = Math.max(0, y0), cx1 = Math.min(CW, x0 + w), cy1 = Math.min(CH, y0 + w);
    if (cx1 <= cx0 || cy1 <= cy0) continue;
    if (c === 'hoje') {
      const hj = e.grande ? { ...TAMANHOS[2], hoje: { ...TAMANHOS[2].hoje } } : TAMANHOS[1];
      desenhaHoje(out, CW, x0 < 0 ? 0 : x0, y0 < 0 ? 0 : y0, Math.min(w, cx1 - cx0), Math.min(w, cy1 - cy0), hj, age);
    } else {
      // draw in a scratch canvas then copy the visible part (the effect is centred in its own cell)
      const tmp = new Uint8ClampedArray(w * w * 4);
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
        const X = x0 + x, Y = y0 + y, j = (y * w + x) * 4;
        if (X < 0 || Y < 0 || X >= CW || Y >= CH) { tmp[j + 3] = 255; continue; }
        const i = (Y * CW + X) * 4;
        tmp[j] = out[i]; tmp[j + 1] = out[i + 1]; tmp[j + 2] = out[i + 2]; tmp[j + 3] = 255;
      }
      desenhaFx(tmp, w, 0, 0, w, w, CONCEITOS[c], age, { R: tm.R, D: tm.D, seed: 11 + Math.round(e.x) });
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
        const X = x0 + x, Y = y0 + y;
        if (X < 0 || Y < 0 || X >= CW || Y >= CH) continue;
        const i = (Y * CW + X) * 4, j = (y * w + x) * 4;
        out[i] = tmp[j]; out[i + 1] = tmp[j + 1]; out[i + 2] = tmp[j + 2];
      }
    }
  }
  return out;
}
{
  // 3 columns × 2 rows of 384×216: today, A, B / C, D, (empty)
  const W = CW * 3 + 8, Hh = CH * 2 + 4, DUR = 3.6;
  await video('cadeia', W, Hh, Math.round(DUR * FPS), (i) => {
    const t = i / FPS, out = new Uint8ClampedArray(W * Hh * 4);
    for (let k = 0; k < out.length; k += 4) out[k + 3] = 255;
    ['hoje', 'A', 'B', 'C', 'D'].forEach((c, n) => {
      const q = quadroCadeia(c, t), ox = (n % 3) * (CW + 4), oy = Math.floor(n / 3) * (CH + 4);
      for (let y = 0; y < CH; y++) out.set(q.subarray(y * CW * 4, (y + 1) * CW * 4), ((oy + y) * W + ox) * 4);
    });
    return out;
  }, 1);
}

// ── the big one frame by frame (every 3rd frame, ×3) per concept, for the pixel check
for (const c of ['A', 'B', 'C', 'D']) {
  const tm = TAMANHOS[2], n = Math.ceil((tm.D * (c === 'C' ? 1.5 : 1) * FPS) / 3) + 1, W = tm.cel;
  const comps = [];
  for (let k = 0; k < n; k++) {
    const out = new Uint8ClampedArray(W * W * 4);
    pintaFundo(out, W, 0, 0, W, W, 100, 80);
    desenhaFx(out, W, 0, 0, W, W, CONCEITOS[c], (k * 3) / FPS, { R: tm.R, D: tm.D, seed: 5 });
    const png = await sharp(Buffer.from(out.buffer), { raw: { width: W, height: W, channels: 4 } }).resize(W * 3, W * 3, { kernel: 'nearest' }).png().toBuffer();
    comps.push({ input: png, left: (k % 6) * W * 3, top: Math.floor(k / 6) * W * 3 });
  }
  await sharp({ create: { width: 6 * W * 3, height: Math.ceil(n / 6) * W * 3, channels: 4, background: '#000' } }).composite(comps).png().toFile(path.join(OUT, `quadros-${c}.png`));
}
console.log('ok', OUT);
