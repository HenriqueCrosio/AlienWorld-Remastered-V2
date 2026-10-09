// THE STRETCHED SERPENT (09/10, his drawing): she does NOT spin in her coiled idle pose — she comes out of the hull on
// the right UNCOILING into a long straight body, crosses over the hull, ROLLS on her long axis while stretched, and
// stretches out diving into the hull on the left. Every body motion is DRAWN frames (PixMiniMax), pinned on real poses:
//   desenrola-b            coiled → stretched (the leap out of the hull)
//   rola-dorso (yoyo 0–4)  the swim while crossing (a small undulation, never a frozen sprite)
//   giro esticado          stretched → back to the camera → upside down → belly → stretched (4 pinned stretches)
// The code only carries the sprite along the path, POINTED at its heading with a smoothed turn (the dolphin's
// SUAVE_GIRO), brakes it over the hull while it rolls (the dolphin's GIRO_FREIO), scales it with depth (behind the
// hull at the start, in front of it at the end). His 3 groups of 3 spines leave at the roll's quarter turns.
//   node scripts/_elites/_serpente-esticada-demo.mjs   → folhas/2026-10-09/elites/serpente-esticada-demo.gif
import fs from 'node:fs';
import sharp from 'sharp';
import { ampliar, colar, girar, ler, novo } from './_pixel-lib.mjs';
import { CRISTA, mapa, nave, px, recorte } from './_cena-casco.mjs';

const D = 'docs/superpowers/folhas/2026-10-09/elites';
const E = `${D}/esticada`;
const quadros = async (dir, de = 0) => {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
  return Promise.all([...Array(n).keys()].slice(de).map((i) => ler(`${dir}/${i}.png`)));
};
// The frames are 256×128 with the creature wherever the generator left it: re-centre each on its own body, so the
// code (not the drawing) decides where she is.
function centrar(q) {
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (q.d[(y * q.w + x) * 4 + 3] > 64) [sx, sy, n] = [sx + x, sy + y, n + 1];
  const dx = Math.round(q.w / 2 - sx / n), dy = Math.round(q.h / 2 - sy / n);
  const out = novo(q.w, q.h);
  colar(out, q, dx, dy);
  return out;
}
const DESENROLA = (await quadros(`${E}/desenrola-b`)).map(centrar);
const NADO = (await quadros(`${E}/rola-dorso`)).slice(0, 5).map(centrar);
const reverso = (a) => [...a].reverse();
// The roll: stretched → back to the camera → (over the top, the generator's own way) → belly → stretched. The
// upside-down keyframe made by flipping (lit from below) broke the generator (12 jumps, up to 43%) and is out; the
// single pinned back→belly stretch in 12 frames is clean (≤23%, no jump). The 8-frame take came out as grey smears.
const GIRO = [
  ...(await quadros(`${E}/rola-dorso`)),
  ...(await quadros(`${E}/rola-dorso-barriga-12`, 1)),
  ...reverso(await quadros(`${E}/rola-barriga`)).slice(1),
].map(centrar);

const FPS = 20, J = { x: 92, y: 14, w: 260, h: 202 }, cr = CRISTA - J.y;
const NAVE = { x: 64, y: 62 };
// His drawing: up out of the hull on the right → a long low arc to the left over the hull (where she rolls) → down
// into the hull on the left. (x, y, z): z<0 behind the hull, z>0 in front of it.
// The dive runs far below the window: stretched, she is ~130px long, and the tail must leave the screen too.
const PONTOS = [[250, 260, -1], [236, 150, -0.6], [214, 112, -0.25], [180, 96, 0], [140, 92, 0.2], [100, 100, 0.45], [70, 124, 0.75], [52, 160, 1], [42, 260, 1], [36, 420, 1]];
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

// Timeline: the LEAP (uncoiling, fast) → the CROSSING (swimming) → the ROLL (braked over the hull) → the DIVE.
const T0 = 0.3;
const S_GIRO = [S[3 * 60] + 10, S[4 * 60] + 10];
const T_DESENROLA = DESENROLA.length / 16; // the uncoil plays during the leap, ~1s
const T_GIRO = GIRO.length / 14;
const vel = (s) => (s < S_GIRO[0] ? 120 : s < S_GIRO[1] ? (S_GIRO[1] - S_GIRO[0]) / T_GIRO : 150);
const dt = 1 / 240;
const posS = [0];
for (let t = dt; t < 9; t += dt) posS.push(posS.at(-1) + vel(posS.at(-1)) * dt);
const sEm = (t) => posS[Math.min(posS.length - 1, Math.max(0, Math.round(t / dt)))];
const tDe = (s) => posS.findIndex((x) => x >= s) * dt;
const tGiro0 = tDe(S_GIRO[0]), tGiro1 = tDe(S_GIRO[1]);

function quadroEm(t) {
  if (t < T_DESENROLA) return DESENROLA[Math.min(DESENROLA.length - 1, Math.floor(t * 16))];
  if (t >= tGiro0 && t < tGiro1) return GIRO[Math.min(GIRO.length - 1, Math.floor((t - tGiro0) * 14))];
  // The swim: the first frames of the back-roll, played back and forth (the dolphin's yoyo).
  const k = Math.floor(t * 10) % (2 * (NADO.length - 1));
  return NADO[k < NADO.length ? k : 2 * (NADO.length - 1) - k];
}

// His spines: at the roll's quarter turns (back up, upside down, belly), 3 groups of 3 aimed at the ship, flying on
// PARALLEL lines (one heading, groups offset across it): the lanes between them stay open.
const AGULHA = mapa(['.......OOO.', 'OFRMMhhsssO', '.OOOOOOOO..']);
const espinhos = [];
for (const [k, frac] of [0.25, 0.5, 0.75].entries()) {
  const t = T0 + tGiro0 + (tGiro1 - tGiro0) * frac;
  const q = noS(sEm(t - T0));
  const ang = Math.atan2(NAVE.y - q.y, NAVE.x - q.x);
  const off = (k - 1) * 22; // the three groups across the heading
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  for (const d of [-6, 0, 6]) espinhos.push({ t0: t, x: q.x + nx * (off + d) - 30 * Math.cos(ang), y: q.y + ny * (off + d) - 30 * Math.sin(ang), ang });
}

const out = [];
let rumo = Math.PI; // smoothed heading (the sprite's head points LEFT = π)
for (let f = 0; f < Math.round(8.2 * FPS); f++) {
  const t = f / FPS;
  const img = recorte(J);
  const tt = t - T0;
  const q = tt >= 0 ? noS(sEm(tt)) : null;
  const desenhar = () => {
    if (!q) return;
    // The body POINTS where it goes, the turn smoothed (≈10/s): the sprite faces left (π) → rotate by heading − π.
    const d = Math.atan2(Math.sin(q.ang - rumo), Math.cos(q.ang - rumo));
    rumo += d * Math.min(1, 10 / FPS);
    // Stretched, the drawing is ~230px long: at 1:1 she would span the whole screen. ~0.55–0.75 → ~130–170px.
    const prof = 0.55 + 0.2 * (q.z + 1) / 2;
    const luz = 0.72 + 0.28 * (q.z + 1) / 2;
    const src = quadroEm(tt);
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
  // The ship holds above-left, then slips into a lane of the spine formation.
  colar(img, nave, NAVE.x - nave.w / 2, NAVE.y - nave.h / 2 + Math.min(1, Math.max(0, (t - (T0 + tGiro0) - 0.3) / 0.4)) * 11);
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
await sharp(out, { join: { animated: true } }).gif({ delay: Array(out.length).fill(1000 / FPS), loop: 0 }).toFile(`${D}/serpente-esticada-demo.gif`);
// The roll alone (12 fps, magnified) for judging the motion itself.
const so = [];
for (let i = 0; i < GIRO.length * 2; i++) so.push(await ampliar(GIRO[i % GIRO.length], 2));
await sharp(so, { join: { animated: true } }).gif({ delay: Array(so.length).fill(Math.round(1000 / 12)), loop: 0 }).toFile(`${D}/serpente-esticada-giro-sozinho.gif`);
console.log('demo', out.length, 'quadros; giro', GIRO.length, 'quadros; T_GIRO', T_GIRO.toFixed(2));
