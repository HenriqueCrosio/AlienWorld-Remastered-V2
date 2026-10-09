// THE STRIKE THAT TWISTS (09/10, his 3rd drawing — "o melhor dos dois: como uma serpente dando um bote e girando"):
// out of the hull on the right UNCOILING into the strike (stretched), up in an arc; at the top a short LOOP where the
// body coils as it rolls (drawn frames: `bote/torce-*`); then stretched again down a long arc into the hull on the left.
//   node scripts/_elites/_serpente-bote-demo.mjs <torce-dir> [tail-dir-reversed]   → folhas/2026-10-09/elites/
// All the body motion is DRAWN frames (PixMiniMax); the code carries the sprite, points it along its heading (smoothed)
// OUTSIDE the twist — inside it the rotation is frozen at the loop's entry: the drawn frames do the turning, not the
// code (a rigid stretched sprite spun by code is exactly what read wrong).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ampliar, colar, girar, ler, novo } from './_pixel-lib.mjs';
import { CRISTA, mapa, nave, px, recorte } from './_cena-casco.mjs';

const D = 'docs/superpowers/folhas/2026-10-09/elites';
const [TORCE, VOLTA] = process.argv.slice(2);
const quadros = async (dir, de = 0) => {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
  return Promise.all([...Array(n).keys()].slice(de).map((i) => ler(`${dir}/${i}.png`)));
};
/** Re-centre each frame on its own body and pad to a common square canvas (frames come from 256×128 and 256×256). */
function centrar(q, L = 256) {
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (q.d[(y * q.w + x) * 4 + 3] > 64) [sx, sy, n] = [sx + x, sy + y, n + 1];
  const out = novo(L, L);
  colar(out, q, Math.round(L / 2 - sx / n), Math.round(L / 2 - sy / n));
  return out;
}
const DESENROLA = (await quadros(`${D}/esticada/desenrola-b`)).map((q) => centrar(q));
const TORCAO = (await quadros(TORCE, 1)).map((q) => centrar(q));
// After a twist pinned to the BELLY view, the clean belly→side roll (reversed) brings her back to the side pose.
const VOLTA_Q = VOLTA ? (await quadros(VOLTA)).reverse().slice(1).map((q) => centrar(q)) : [];
const NADO = (await quadros(`${D}/esticada/rola-dorso`)).slice(0, 4).map((q) => centrar(q));

const FPS = 20, J = { x: 92, y: 14, w: 260, h: 202 }, cr = CRISTA - J.y;
const NAVE = { x: 64, y: 70 };
// His drawing (window px = his screenshot / 3): up from the hull on the right → over the top → the small loop at
// (172, 88) → a long arc down-left → into the hull at x≈120. z: behind the hull while rising, in front after the loop.
const PONTOS = [
  [232, 230, -1], [228, 128, -0.6], [218, 96, -0.35], [200, 80, -0.15], [182, 78, 0],
  [170, 82, 0.05], [164, 92, 0.1], [172, 100, 0.15], [180, 92, 0.2], [174, 82, 0.25],
  [150, 80, 0.35], [124, 88, 0.5], [108, 108, 0.7], [104, 138, 0.9], [112, 170, 1], [120, 230, 1], [124, 420, 1],
];
const LACO = [4, 10]; // the loop runs between these points
const cr3 = (p0, p1, p2, p3, u) => 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3);
const curva = [];
for (let i = 0; i < PONTOS.length - 1; i++) {
  const [a, b, c, d] = [PONTOS[Math.max(0, i - 1)], PONTOS[i], PONTOS[i + 1], PONTOS[Math.min(PONTOS.length - 1, i + 2)]];
  for (let k = 0; k < 60; k++) curva.push([0, 1, 2].map((j) => cr3(a[j], b[j], c[j], d[j], k / 60)));
}
curva.push(PONTOS.at(-1));
const S = [0];
for (let i = 1; i < curva.length; i++) S.push(S[i - 1] + Math.hypot(curva[i][0] - curva[i - 1][0], curva[i][1] - curva[i - 1][1]));
const noS = (s) => {
  s = Math.max(0, Math.min(S.at(-1), s));
  const k = Math.max(1, S.findIndex((x) => x >= s));
  const a = curva[Math.max(0, k - 4)], b = curva[Math.min(curva.length - 1, k + 4)];
  return { x: curva[k][0], y: curva[k][1], z: curva[k][2], ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
};
const S_LACO = [S[LACO[0] * 60], S[LACO[1] * 60]];
const T_TORCE = (TORCAO.length + VOLTA_Q.length) / 14;
// The strike: FAST out of the hull (a lunge), the loop braked to the twist's length, fast down into the hull.
const vel = (s) => (s < S_LACO[0] ? 200 : s < S_LACO[1] ? (S_LACO[1] - S_LACO[0]) / T_TORCE : 160);
const dt = 1 / 240;
const posS = [0];
for (let t = dt; t < 9; t += dt) posS.push(posS.at(-1) + vel(posS.at(-1)) * dt);
const sEm = (t) => posS[Math.min(posS.length - 1, Math.max(0, Math.round(t / dt)))];
const tDe = (s) => posS.findIndex((x) => x >= s) * dt;
const tL0 = tDe(S_LACO[0]), tL1 = tDe(S_LACO[1]);
const TORCE_TODA = [...TORCAO, ...VOLTA_Q];

function quadroEm(t) {
  if (t >= tL0 && t < tL1) return { q: TORCE_TODA[Math.min(TORCE_TODA.length - 1, Math.floor((t - tL0) * 14))], laco: true };
  if (t < tL0) return { q: DESENROLA[Math.min(DESENROLA.length - 1, Math.floor(t * 20))], laco: false };
  const k = Math.floor(t * 10) % (2 * (NADO.length - 1));
  return { q: NADO[k < NADO.length ? k : 2 * (NADO.length - 1) - k], laco: false };
}

// His spines: 3 groups of 3, out of the twist at its 1/4, 1/2, 3/4 — straight at where the ship is, on parallel lines.
const AGULHA = mapa(['.......OOO.', 'OFRMMhhsssO', '.OOOOOOOO..']);
const espinhos = [];
const T0 = 0.3;
for (const [k, frac] of [0.25, 0.5, 0.75].entries()) {
  const t = T0 + tL0 + (tL1 - tL0) * frac;
  const q = noS(sEm(t - T0));
  const ang = Math.atan2(NAVE.y - q.y, NAVE.x - q.x);
  const nx = -Math.sin(ang), ny = Math.cos(ang), off = (k - 1) * 22;
  for (const d of [-6, 0, 6]) espinhos.push({ t0: t, x: q.x + nx * (off + d), y: q.y + ny * (off + d), ang });
}

const out = [];
let rumo = -Math.PI / 2; // the strike starts pointing UP
for (let f = 0; f < Math.round(7 * FPS); f++) {
  const t = f / FPS;
  const tt = t - T0;
  const img = recorte(J);
  const q = tt >= 0 ? noS(sEm(tt)) : null;
  const desenhar = () => {
    if (!q) return;
    const { q: src, laco } = quadroEm(tt);
    // Outside the loop the body points where it goes (smoothed); inside it, the drawn twist turns her.
    if (!laco) rumo += Math.atan2(Math.sin(q.ang - rumo), Math.cos(q.ang - rumo)) * Math.min(1, 10 / FPS);
    const prof = 0.55 + 0.2 * (q.z + 1) / 2, luz = 0.72 + 0.28 * (q.z + 1) / 2;
    const W = Math.round(src.w * prof), H = Math.round(src.h * prof);
    const esc = novo(W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const k = (Math.floor((y / H) * src.h) * src.w + Math.floor((x / W) * src.w)) * 4, o = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) esc.d[o + c] = Math.round(src.d[k + c] * luz);
        esc.d[o + 3] = src.d[k + 3];
      }
    const g = girar(esc, rumo - Math.PI);
    if (q.z < 0) {
      const tmp = novo(img.w, img.h);
      colar(tmp, g, q.x - g.w / 2, q.y - g.h / 2);
      for (let y = 0; y < Math.min(cr, img.h); y++)
        for (let x = 0; x < img.w; x++) {
          const k = (y * img.w + x) * 4;
          if (tmp.d[k + 3]) px(img, x, y, [tmp.d[k], tmp.d[k + 1], tmp.d[k + 2]], tmp.d[k + 3] / 255);
        }
    } else colar(img, g, q.x - g.w / 2, q.y - g.h / 2);
  };
  if (!q || q.z < 0.3) desenhar();
  colar(img, nave, NAVE.x - nave.w / 2, NAVE.y - nave.h / 2 + Math.min(1, Math.max(0, (t - (T0 + tL0) - 0.3) / 0.4)) * 11);
  for (const e of espinhos) {
    const k = t - e.t0;
    if (k < 0) continue;
    const x = e.x + Math.cos(e.ang) * 60 * k, y = e.y + Math.sin(e.ang) * 60 * k;
    if (x < -12 || y < -12) continue;
    const g = girar(AGULHA, e.ang);
    colar(img, g, x - g.w / 2, y - g.h / 2);
  }
  if (q && q.z >= 0.3) desenhar();
  out.push(await ampliar(img, 3));
}
const nome = `serpente-bote-${path.basename(TORCE)}-demo.gif`;
await sharp(out, { join: { animated: true } }).gif({ delay: Array(out.length).fill(1000 / FPS), loop: 0 }).toFile(`${D}/${nome}`);
console.log(nome, out.length, 'quadros; torção', TORCE_TODA.length, 'quadros em', T_TORCE.toFixed(2), 's');
