// THE TENTACLE, v5 (09/10) — he: *"a cabeça ainda está com aspecto de colado no corpo, parecendo que somente o corpo
// sofreu animação… a animação está completamente travada (compare com o rodopio do golfinho) e a serpente precisa sair
// de trás do casco e descer na frente"*. The dolphin's roll is 17 drawn frames of a body TURNING ON ITS AXIS (back,
// side, belly, foreshortened). Here, without redrawing the art, the motion is built in 3D:
//   · DEPTH: the path has a z. Far (z<0) = smaller, darker, cut by the hull; near (z>0) = bigger, brighter, drawn over
//     the plates and over the ship. Pieces are depth-sorted every frame, so the body passes in front of itself.
//   · THE ROLL: every ring and the head turn on the body's long axis like a coin (narrow → mirrored → back), and the
//     twist runs down the body with a lag — the "rodopio".
//   · LIFE: a lateral swim wave growing toward the tail; the head LEADS the curve (looks ahead) instead of sitting on
//     the column like a sticker.
// Full-height window (the whole hull band shows): leaving from behind it and coming down in front of it reads.
//   node scripts/_elites/_tentaculo-v5.mjs   → folhas/2026-10-08/elites/serpente-rodopio-3d-demo.gif
import sharp from 'sharp';
import { ampliar, ler } from './_pixel-lib.mjs';
import { CABECA, CRISTA, P, colar, girar, mapa, nave, novo, px, recorte } from './_cena-casco.mjs';

const D = 'docs/superpowers/folhas/2026-10-08/elites';
const CAND = `${D}/cand`;
const FPS = 20;
// Full height (below the HUD strip of the capture): the hull band (y 150–216) shows whole.
const J = { x: 92, y: 14, w: 260, h: 202 };
const cr = CRISTA - J.y;

// ── the body: Pro 51-2 in 7px rings (the thin top cap dropped: no thin neck) + the tail fan ──
const largura = (p) => {
  let x0 = p.w, x1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.d[(y * p.w + x) * 4 + 3]) [x0, x1] = [Math.min(x0, x), Math.max(x1, x)];
  return x1 - x0 + 1;
};
const col = await ler(`${CAND}/tentaculoCorpoSerpente-51-2.png`, { trim: true });
let ANEIS = [];
for (let y = 0; y < col.h; y += 7) {
  const h = col.h - y < 14 ? col.h - y : 7;
  const p = novo(col.w, h);
  for (let yy = 0; yy < h; yy++) col.d.copy(p.d, yy * col.w * 4, ((y + yy) * col.w) * 4, ((y + yy) * col.w + col.w) * 4);
  ANEIS.push(p);
  if (h > 7) break;
}
const maxL = Math.max(...ANEIS.map(largura));
while (ANEIS.length > 4 && largura(ANEIS[0]) < maxL * 0.8) ANEIS = ANEIS.slice(1);
const CAUDA = girar(await ler(`${CAND}/tentaculoCaudaSerpente-51-7.png`, { trim: true }), Math.PI / 2);
const PECAS = [...ANEIS, CAUDA];
const DIST = [...ANEIS.map((_, i) => 8 + i * 7), 8 + ANEIS.length * 7 + 6];

/** Nearest resample with a signed x scale (negative = mirrored: the far side of the roll) and a y scale. */
function escalar(spr, sx, sy) {
  const W = Math.max(1, Math.round(spr.w * Math.abs(sx))), H = Math.max(1, Math.round(spr.h * sy));
  const out = novo(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let ix = Math.floor((x / W) * spr.w);
      if (sx < 0) ix = spr.w - 1 - ix;
      const iy = Math.min(spr.h - 1, Math.floor((y / H) * spr.h));
      spr.d.copy(out.d, (y * W + x) * 4, (iy * spr.w + ix) * 4, (iy * spr.w + ix) * 4 + 4);
    }
  return out;
}
/** Darkens (far, or edge-on in the roll): multiplies the colour; the red tissue keeps a little more of its glow. */
function luz(spr, k) {
  const out = { d: Buffer.from(spr.d), w: spr.w, h: spr.h };
  for (let i = 0; i < out.d.length; i += 4) {
    if (!out.d[i + 3]) continue;
    const vermelho = out.d[i] > out.d[i + 1] + 40;
    const kk = vermelho ? Math.min(1, k + 0.15) : k;
    for (let c = 0; c < 3; c++) out.d[i + c] = Math.min(255, Math.round(out.d[i + c] * kk));
  }
  return out;
}

// ── the 3D path (window px; z: −1 far/behind the hull … +1 near/in front of it) ──
// From deep behind the hull on the right → up the right side (coming to the play plane) → over the ship → down the
// left side growing toward the camera → over the plates, in front of the hull → out at the bottom.
const NAVE = { x: 104, y: 98 };
const PONTOS = [
  [222, 260, -1], [216, 180, -1], [212, 140, -0.75], [206, 104, -0.35], [192, 70, -0.1], [166, 44, 0.05],
  [128, 34, 0.2], [90, 42, 0.4], [60, 66, 0.65], [44, 100, 0.85], [42, 140, 1], [50, 180, 1], [62, 260, 1],
];
const cr3 = (p0, p1, p2, p3, u) => 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3);
const curva = [];
for (let i = 0; i < PONTOS.length - 1; i++) {
  const [a, b, c, d] = [PONTOS[Math.max(0, i - 1)], PONTOS[i], PONTOS[i + 1], PONTOS[Math.min(PONTOS.length - 1, i + 2)]];
  for (let k = 0; k < 80; k++) curva.push([0, 1, 2].map((j) => cr3(a[j], b[j], c[j], d[j], k / 80)));
}
curva.push(PONTOS.at(-1));
// Arc length measured on SCREEN (x, y) — the body spacing is in screen px, scaled by depth when drawn.
const S = [0];
for (let i = 1; i < curva.length; i++) S.push(S[i - 1] + Math.hypot(curva[i][0] - curva[i - 1][0], curva[i][1] - curva[i - 1][1]));
const noS = (s) => {
  s = Math.max(0, Math.min(S.at(-1), s));
  let lo = 0, hi = S.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (S[m] < s) lo = m + 1;
    else hi = m;
  }
  const a = curva[Math.max(0, lo - 3)], b = curva[Math.min(curva.length - 1, lo + 3)];
  return { x: curva[lo][0], y: curva[lo][1], z: curva[lo][2], ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
};
// Speed: a burst out of the hull, SLOW through the arc around the ship (~85 px/s), faster coming down at the camera.
const T0 = 0.4, S_PULO = 120;
const sCabeca = (t) => {
  const k = Math.max(0, t - T0);
  const pulo = Math.min(k, S_PULO / 190);
  return pulo * 190 + Math.max(0, k - S_PULO / 190) * 85 + Math.max(0, k - 3.6) * 60;
};

// The ROLL: one full turn on the long axis during the arc, the twist running down the body (0.035 rad per px).
const giro = (t, dist) => 2 * Math.PI * Math.min(1, Math.max(0, (t - T0 - 0.9) / 2.6)) - dist * 0.035;

function pecaEm(spr, t, dist, i, n) {
  const s = sCabeca(t) - dist;
  if (s < 0) return null;
  const q = noS(s);
  // The swim wave: sideways (perpendicular to the path), growing toward the tail.
  const onda = Math.sin(t * 7 - dist * 0.09) * 3 * (dist / 110);
  const px_ = q.x - Math.sin(q.ang) * onda, py_ = q.y + Math.cos(q.ang) * onda;
  const prof = 1 + 0.3 * q.z; // perspective
  // A CYLINDER does not thin out when it rolls — its surface turns. So the ring keeps most of its width (0.72–1) and
  // mirrors halfway: the spines and the red seams swap sides as the body turns over.
  const c = Math.cos(giro(t, dist));
  const lado = Math.sign(c) || 1;
  const sx = lado * (0.72 + 0.28 * Math.abs(c)) * prof;
  // Far = darker; edge-on in the roll = darker too (the side turned away from the light). The body sits a notch under
  // the head (×0.85), so the head pops.
  const k = 0.85 * (0.62 + 0.38 * (q.z + 1) / 2) * (0.7 + 0.3 * Math.abs(c));
  let img = luz(escalar(spr, sx, prof), k);
  img = girar(img, q.ang + Math.PI / 2);
  return { img, x: px_, y: py_, z: q.z, i };
}

// 09/10, he: *"a única coisa que ainda não consigo distinguir é onde está a cabeça"*. The head has to POP, without
// lighting the whole creature: it is bigger, it never darkens with depth, it gets a 1px rim of light on its silhouette,
// and its EYE — the only energy on her — glows and leaves a short trail of light: the eye leads the player's eye.
const ESCALA_CABECA = 1.25;
const OLHO = (() => {
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < CABECA.h; y++)
    for (let x = 0; x < CABECA.w; x++) {
      const k = (y * CABECA.w + x) * 4;
      if (CABECA.d[k + 3] && CABECA.d[k] > 120 && CABECA.d[k] > CABECA.d[k + 1] + 60) [sx, sy, n] = [sx + x, sy + y, n + 1];
    }
  return { x: sx / n + 0.5 - CABECA.w / 2, y: sy / n + 0.5 - CABECA.h / 2 };
})();
/**
 * The rim light, ON SCREEN (after the head is turned): only the silhouette edges facing the scene's light (up and
 * left) catch it — a uniform outline turned the head into a grey block and ate its drawing.
 */
function aro(spr, cor) {
  const out = { d: Buffer.from(spr.d), w: spr.w, h: spr.h };
  const op = (x, y) => x >= 0 && y >= 0 && x < spr.w && y < spr.h && spr.d[(y * spr.w + x) * 4 + 3] > 0;
  for (let y = 0; y < spr.h; y++)
    for (let x = 0; x < spr.w; x++)
      if (op(x, y) && (!op(x, y - 1) || !op(x - 1, y))) [out.d[(y * spr.w + x) * 4], out.d[(y * spr.w + x) * 4 + 1], out.d[(y * spr.w + x) * 4 + 2]] = cor;
  return out;
}
const RASTRO = [];

/** The head LEADS: it looks at a point ahead on the path (the anticipation), not along its own ring. */
function cabecaEm(t) {
  const s = sCabeca(t);
  if (s <= 0) return null;
  const q = noS(s), adiante = noS(s + 16);
  const ang = Math.atan2(adiante.y - q.y, adiante.x - q.x);
  const prof = (1 + 0.3 * q.z) * ESCALA_CABECA;
  const c = Math.cos(giro(t, 0));
  const sx = (Math.sign(c) || 1) * (0.72 + 0.28 * Math.abs(c)) * prof;
  const rot = ang + Math.PI / 2;
  // Where the eye lands on screen (scaled, mirrored by the roll, turned with the head).
  const ex = OLHO.x * sx, ey = OLHO.y * prof;
  const olho = { x: q.x + ex * Math.cos(rot) - ey * Math.sin(rot), y: q.y + ex * Math.sin(rot) + ey * Math.cos(rot) };
  return { img: aro(girar(escalar(CABECA, sx, prof), rot), P.H), x: q.x, y: q.y, z: q.z, i: -1, olho };
}

// ── the spines: his 3 groups of 3, released while she rises on the right through the play plane ──
const AGULHA = mapa(['.......OOO.', 'OFRMMhhsssO', '.OOOOOOOO..']);
const alturas = [NAVE.y + 30, NAVE.y, NAVE.y - 30];
const espinhos = [];
{
  let yAnt = null;
  for (let t = T0; t < 6 && alturas.length; t += 1 / 480) {
    const q = noS(sCabeca(t));
    if (yAnt !== null && yAnt > alturas[0] && q.y <= alturas[0]) {
      const yc = alturas.shift();
      for (const d of [-6, 0, 6]) espinhos.push({ t0: t, x: q.x - 14, y: yc + d });
    }
    yAnt = q.y;
  }
}

const quadros = [];
const DUR = 6.6;
for (let f = 0; f < Math.round(DUR * FPS); f++) {
  const t = f / FPS;
  const img = recorte(J);
  // Pieces sorted FAR → NEAR; the ship (z = 0) and the spines go in between.
  const pecas = PECAS.map((p, i) => pecaEm(p, t, DIST[i], i, PECAS.length)).filter(Boolean);
  const cab = cabecaEm(t);
  if (cab) pecas.push(cab);
  pecas.sort((a, b) => a.z - b.z || b.i - a.i);
  const desenha = (q) => {
    if (q.z < 0) {
      // Behind the hull plane: only what is above the crest shows.
      const tmp = novo(img.w, img.h);
      colar(tmp, q.img, q.x - q.img.w / 2, q.y - q.img.h / 2);
      for (let y = 0; y < Math.min(cr, img.h); y++)
        for (let x = 0; x < img.w; x++) {
          const k = (y * img.w + x) * 4;
          if (tmp.d[k + 3]) px(img, x, y, [tmp.d[k], tmp.d[k + 1], tmp.d[k + 2]], tmp.d[k + 3] / 255);
        }
    } else colar(img, q.img, q.x - q.img.w / 2, q.y - q.img.h / 2);
  };
  for (const q of pecas.filter((q) => q.z < 0.15)) desenha(q);
  // The ship slips into the lane between the middle and the upper group.
  const ny = NAVE.y + (NAVE.y - 15 - NAVE.y) * Math.min(1, Math.max(0, (t - 1.5) / 0.35));
  colar(img, nave, NAVE.x - nave.w / 2, ny - nave.h / 2);
  for (const e of espinhos) {
    const x = e.x - 55 * (t - e.t0);
    if (t < e.t0 || x < -12) continue;
    for (const [b, al] of [[3, 0.5], [6, 0.25]]) px(img, Math.round(x + b), e.y, P.R, al);
    const g = girar(AGULHA, Math.PI);
    colar(img, g, x - g.w / 2, e.y - g.h / 2);
  }
  for (const q of pecas.filter((q) => q.z >= 0.15)) desenha(q);
  // The EYE: a glow on it and a fading trail of where it has been (the last 6 frames).
  if (cab && (cab.z >= 0 || cab.olho.y < cr)) {
    RASTRO.unshift(cab.olho);
    RASTRO.length = Math.min(RASTRO.length, 7);
  } else RASTRO.length = 0;
  // Drawn oldest first; the live eye is a 2×2 hot core with a red halo.
  [...RASTRO].reverse().forEach((o, kk) => {
    const k = RASTRO.length - 1 - kk;
    const x = Math.round(o.x), y = Math.round(o.y);
    if (k === 0) {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3) px(img, x + dx, y + dy, P.F, 0.35);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) px(img, x + dx, y + dy, [255, 200, 180], 1);
    } else {
      const al = 0.7 * (1 - k / 7);
      px(img, x, y, P.F, al);
      px(img, x + 1, y, P.F, al * 0.6);
    }
  });
  quadros.push(await ampliar(img, 3));
}
const out = `${D}/serpente-rodopio-3d-demo.gif`;
await sharp(quadros, { join: { animated: true } }).gif({ delay: Array(quadros.length).fill(1000 / FPS), loop: 0 }).toFile(out);
console.log(out, quadros.length, 'quadros', 'espinhos', espinhos.length);
