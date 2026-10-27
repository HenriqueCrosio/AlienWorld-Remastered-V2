// 27/10 — A SPIDER'S SILHOUETTE for the back of the F1 cave (his ask: "a silhueta precisa ser preta, aparente apenas o
// contorno e forma dela"), drawn by code at the game's own resolution — no generator, no reduction: two ovals for the
// body and eight legs of three joints each, rasterised pixel by pixel. The thick parts (body, the femur near the body)
// are filled by coverage of the pixel's centre; the thin parts (1 px) are Bresenham lines cleaned of L-corners (the
// "pixel-perfect" rule: a 1 px line never doubles at a step). Every pose is a rig in px at k = 1; `k` scales it.
//   node scripts/_g/_aranha-silhueta.mjs <outDir>      → one PNG per pose × {preto, aro}, at 1× and 4×
// (the module also exports `desenharAranha` for the in-game mock-up)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/** mulberry32: the same spider for the same seed */
function sorte(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── the poses (px at k = 1; x right, y down; the body near the origin) ──────────────────────────────────────────────
// a leg: [base, knee, ankle, tip] and the femur's width at the base and at the knee
const P = (...xy) => xy.reduce((a, v, i) => (i % 2 ? (a[a.length - 1].push(v), a) : (a.push([v]), a)), []);

/** side view, crawling to the LEFT on a ledge (feet on y 9): high knees over the body, the classic arachnid arch */
// (1st pass: the legs came out nearly parallel — a comb — and the thick femurs knotted over the body. Now they FAN: the
// front pair reaches far forward and the back pair far back, the middle ones stand; the tibia runs out flat from the
// knee and the metatarsus drops steep to the foot, so each leg is an arch and not a slash; the femurs are thinner.)
const PERFIL = {
  corpo: [
    { c: [0, -0.6], r: [4.4, 2.9], rot: 0.12 }, // cephalothorax, the head a little raised
    { c: [11.5, -2.4], r: [7, 5.4], rot: -0.22 }, // abdomen, tilted up behind
    { c: [18, -4.2], r: [1.4, 1.1], rot: -0.3 }, // spinnerets
  ],
  tracos: [
    { p: P(4, -0.9, 5.2, -1.6), w: [1.6, 1.6] }, // the waist (thinner than both halves: the notch reads)
    { p: P(-3.8, 0.4, -5, 2.8), w: [1.7, 1.2] }, // chelicera
  ],
  finos: [P(-3.4, -0.4, -6.4, -2.2, -8.2, 1.2)], // pedipalp
  pernas: [
    { p: P(-3, 0.8, -10, -9, -18, -6, -25, 10), w: [1.4, 1] },
    { p: P(-1.5, 1, -5.5, -12, -11.5, -8, -15, 10), w: [1.4, 1] },
    { p: P(0, 1, 3.5, -12, 8, -8, 8, 10), w: [1.4, 1] },
    { p: P(1.5, 0.8, 10.5, -10, 19, -6, 27, 10), w: [1.4, 1] },
    // the far side: 1 px, lower knees, feet between the near ones (they are behind)
    { p: P(-2.5, 0, -7.5, -7, -14, -4, -20, 10), w: [1, 1] },
    { p: P(-1, 0, -1.5, -9, -6, -5, -9, 10), w: [1, 1] },
    { p: P(0.5, 0, 6.5, -9, 12.5, -5, 14, 10), w: [1, 1] },
    { p: P(2, 0, 15, -8, 23, -3, 32, 10), w: [1, 1] },
  ],
};

/** hanging head down from one thread (from the spinnerets), legs half folded */
const PENDURADA = {
  fio: { de: [0, -12.5], comprimento: 34 },
  corpo: [
    { c: [0, -6], r: [4.4, 6], rot: 0.04 },
    { c: [0, 3.4], r: [3.1, 3.4], rot: 0 },
    { c: [0, -12], r: [1.2, 1.2], rot: 0 },
  ],
  tracos: [{ p: P(0, -0.6, 0, 0.8), w: [1.8, 1.8] }],
  finos: [P(-1, 6.4, -1.4, 8.6), P(1, 6.4, 1.6, 8.4)],
  pernas: [
    { p: P(-1.5, 5, -5.5, 8.5, -7, 13.5, -4.5, 18), w: [1.7, 1.2] },
    { p: P(-2.4, 3.6, -8.5, 4.6, -11.5, 9.5, -11, 14), w: [1.7, 1.2] },
    { p: P(-2.6, 2, -8.5, -0.5, -11.5, -4, -10.5, -8), w: [1.7, 1.2] },
    { p: P(-2, 1, -6.5, -4.5, -8, -9.5, -6, -14), w: [1.7, 1.2] },
    { p: P(1.5, 5, 5, 9, 6, 14, 3.5, 17.5), w: [1.7, 1.2] },
    { p: P(2.4, 3.6, 9, 5.5, 12, 10.5, 11, 15), w: [1.7, 1.2] },
    { p: P(2.6, 2, 9, 0, 12.5, -3.5, 12, -7.5), w: [1.7, 1.2] },
    { p: P(2, 1, 7, -4, 8.5, -9, 7, -13.5), w: [1.7, 1.2] },
  ],
};

/** from the front, on the ground (feet on y 11): the abdomen above the head, the legs an arch on each side */
// (1st pass: the abdomen and the head merged into one shield, and the femurs into its corners. Now the abdomen sits
// higher and wider than the head, so the waist notches in at the sides; the femurs leave from the head's flanks.)
const FRENTE = (() => {
  const lado = [
    { p: P(4, 2.6, 10, -5, 15.5, 1, 16.5, 12), w: [1.7, 1.1] },
    { p: P(4.8, 1, 14, -10, 22, -4.5, 25.5, 12), w: [1.7, 1.1] },
    { p: P(5, -0.6, 16, -13, 27.5, -8.5, 33, 12), w: [1.7, 1.1] },
    { p: P(4.4, -2.2, 14, -16, 27.5, -13.5, 40, 10), w: [1.6, 1.1] },
  ];
  const espelho = (l) => ({ ...l, p: l.p.map(([x, y]) => [-x, y]) });
  return {
    corpo: [
      { c: [0, -8], r: [7.6, 5.6], rot: 0 }, // abdomen, behind and above
      { c: [0, 1], r: [5.4, 4], rot: 0 }, // the head
    ],
    tracos: [
      { p: P(-1.7, 4, -1.9, 7.4), w: [1.8, 1.1] },
      { p: P(1.7, 4, 1.9, 7.4), w: [1.8, 1.1] },
    ],
    finos: [P(-3.6, 3.4, -6, 6.4, -5.4, 9.4), P(3.6, 3.4, 6, 6.4, 5.4, 9.4)],
    pernas: [...lado, ...lado.map(espelho)],
  };
})();

/** upside down on the ceiling: the side view mirrored top to bottom (feet up on y −9) */
const TETO = (() => {
  const vira = (pts) => pts.map(([x, y]) => [x, -y]);
  return {
    corpo: PERFIL.corpo.map((e) => ({ ...e, c: [e.c[0], -e.c[1]], rot: -e.rot })),
    tracos: PERFIL.tracos.map((t) => ({ ...t, p: vira(t.p) })),
    finos: PERFIL.finos.map(vira),
    pernas: PERFIL.pernas.map((l) => ({ ...l, p: vira(l.p) })),
  };
})();

export const POSES = { perfil: PERFIL, pendurada: PENDURADA, frente: FRENTE, teto: TETO };

// ── the movement (27/10, his pick: C, the ceiling, pure black — "olhando para a direção da nave, mexendo as pernas e
// virando para 'frente' e sair andando e sumir atrás do layer da estalactite") ────────────────────────────────────────
// A pseudo-3D turn: every joint has its SIDE place (PERFIL: x along the body, the head at −x) and its FRONT place
// (FRENTE: x across the body); at yaw θ it sits at x = x_side·cosθ + x_front·sinθ, y = y_side·cos²θ + y_front·sin²θ.
// θ = 0 is the side view (the approved C, pixel for pixel), θ = π/2 faces the camera, θ = π is the side view mirrored
// (walking right — the stage's "frente"). The near legs are FRENTE's right side, the far legs its left side. A foot keeps
// the side's height (the floor line does not move in the turn).

/**
 * The legs' offsets for a walk at `fase` (0–1 of a cycle): the alternating tetrapod gait of a spider — legs 1 and 3 of
 * one side with 2 and 4 of the other (indices 0, 2, 5, 7) against the rest, half a cycle apart. In the stance the foot
 * slides back along the body by `passo` (planted, while the body goes forward); in the swing it lifts `altura` and comes
 * forward. In the side frame (the head at −x, the floor at +y): [dx, lift].
 */
export function marcha(fase, passo = 5, altura = 2.5) {
  const A = new Set([0, 2, 5, 7]);
  return Array.from({ length: 8 }, (_, i) => {
    const f = (((fase + (A.has(i) ? 0 : 0.5)) % 1) + 1) % 1;
    if (f < 0.5) return [-passo / 2 + passo * (f / 0.5), 0];
    const u = (f - 0.5) / 0.5;
    return [passo / 2 - passo * u, Math.sin(Math.PI * u) * altura];
  });
}

/** The legs while it WATCHES (0–1 of a loop): the front pair rise and feel forward in turn, the second pair taps. */
export function inquieta(fase) {
  const o = Array.from({ length: 8 }, () => [0, 0]);
  const s = (a) => Math.max(0, Math.sin(2 * Math.PI * (fase + a)));
  o[0] = [-1.6 * s(0), 3.2 * s(0)];
  o[4] = [-1.6 * s(0.5), 3.2 * s(0.5)];
  o[1] = [0, 1.2 * s(0.25) ** 4];
  o[5] = [0, 1.2 * s(0.75) ** 4];
  return o;
}

/** The pose at yaw `theta` with the legs' offsets (`marcha`/`inquieta`), on the ceiling (`teto`: mirrored top to bottom). */
export function poseAranha(theta = 0, desvios = null, { teto = true } = {}) {
  const c = Math.cos(theta), s = Math.sin(theta), c2 = c * c, s2 = s * s;
  const vy = teto ? -1 : 1;
  const pt = ([xs, ys], [xf, yf], pe = false) => [xs * c + xf * s, vy * (pe ? ys : ys * c2 + yf * s2)];
  const pernas = PERFIL.pernas.map((l, i) => {
    const f = FRENTE.pernas[i];
    const [dx, lift] = desvios?.[i] ?? [0, 0];
    // the step: the foot fully, the ankle 2/3, the knee a third (the femur barely moves)
    const peso = [0, 0.3, 0.65, 1];
    const p = l.p.map((ps, j) => pt([ps[0] + dx * peso[j], ps[1] - lift * peso[j]], [f.p[j][0], f.p[j][1] - lift * peso[j]], j === 3));
    return { p, w: [l.w[0] * c2 + f.w[0] * s2, l.w[1] * c2 + f.w[1] * s2] };
  });
  // the bodies: the head ↔ FRENTE's head, the abdomen ↔ FRENTE's abdomen; the spinnerets hide behind it from the front
  const par = [[PERFIL.corpo[0], FRENTE.corpo[1]], [PERFIL.corpo[1], FRENTE.corpo[0]], [PERFIL.corpo[2], { c: [0, -8], r: [0, 0], rot: 0 }]];
  const corpo = par.map(([a, b]) => ({
    c: [a.c[0] * c, vy * (a.c[1] * c2 + b.c[1] * s2)],
    r: [Math.hypot(a.r[0] * c, b.r[0] * s), a.r[1] * c2 + b.r[1] * s2],
    rot: vy * a.rot * c,
  })).filter((e) => e.r[0] > 0.3 && e.r[1] > 0.3);
  const de = (lado) => Math.abs(s) > 0.25 || lado === 1; // the far fang and palp only once they leave the near one's shadow
  const tracos = [
    // (the waist goes INTO the head from the front — at [0, −3] it poked out of the body mid-turn as a spike)
    { p: PERFIL.tracos[0].p.map((q, j) => pt(q, [0, j ? -1 : 1])), w: PERFIL.tracos[0].w },
    ...[1, 0].filter(de).map((lado) => ({ p: PERFIL.tracos[1].p.map((q, j) => pt(q, FRENTE.tracos[lado].p[j])), w: PERFIL.tracos[1].w })),
  ];
  const finos = [1, 0].filter(de).map((lado) => PERFIL.finos[0].map((q, j) => pt(q, FRENTE.finos[lado][j])));
  return { corpo, tracos, finos, pernas };
}

// ── the raster ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** a body/leg map: 1 = the spider, 2 = the thread. Returns { w, h, ox, oy, m } (ox, oy: where the rig's origin fell) */
export function desenharAranha(nome, { k = 1, semente = 1, tremor = 0.35, fio = true } = {}) {
  const pose = typeof nome === 'string' ? POSES[nome] : nome;
  const rnd = sorte(semente);
  const j = () => (rnd() - 0.5) * 2 * tremor * k; // a little life in each joint: never two legs alike
  const esc = (pt, mexe = true) => [pt[0] * k + (mexe ? j() : 0), pt[1] * k + (mexe ? j() : 0)];
  const pernas = pose.pernas.map((l) => ({ p: l.p.map((pt, i) => esc(pt, i > 0)), w: l.w }));
  const corpo = pose.corpo.map((e) => ({ c: esc(e.c, false), r: [e.r[0] * k, e.r[1] * k], rot: e.rot }));
  const tracos = pose.tracos.map((t) => ({ p: t.p.map((pt) => esc(pt, false)), w: t.w }));
  const finos = pose.finos.map((f) => f.map((pt, i) => esc(pt, i > 0)));
  const fioDe = pose.fio && fio ? esc(pose.fio.de, false) : null;
  const fioAte = fioDe ? [fioDe[0], fioDe[1] - pose.fio.comprimento * k] : null;

  // the bounds, with a margin
  const xs = [], ys = [];
  for (const e of corpo) xs.push(e.c[0] - e.r[0] - 1, e.c[0] + e.r[0] + 1), ys.push(e.c[1] - e.r[1] - 1, e.c[1] + e.r[1] + 1);
  for (const l of [...pernas.map((p) => p.p), ...tracos.map((t) => t.p), ...finos]) for (const [x, y] of l) xs.push(x), ys.push(y);
  if (fioAte) ys.push(fioAte[1]);
  const x0 = Math.floor(Math.min(...xs)) - 2, y0 = Math.floor(Math.min(...ys)) - 2;
  const w = Math.ceil(Math.max(...xs)) - x0 + 3, h = Math.ceil(Math.max(...ys)) - y0 + 3;
  const m = new Uint8Array(w * h);
  const pinta = (x, y, v = 1) => { if (x >= 0 && y >= 0 && x < w && y < h && (v === 1 || !m[y * w + x])) m[y * w + x] = v; };

  // an oval: the pixel's centre inside
  for (const e of corpo) {
    const [cx, cy] = [e.c[0] - x0, e.c[1] - y0], cs = Math.cos(e.rot), sn = Math.sin(e.rot);
    const R = Math.max(e.r[0], e.r[1]) + 1;
    for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = dx * cs + dy * sn, v = -dx * sn + dy * cs;
      if ((u / e.r[0]) ** 2 + (v / e.r[1]) ** 2 <= 1) pinta(x, y);
    }
  }
  // a tapered stroke: the pixel's centre within r(t) of the segment
  const cone = (a, b, r0, r1) => {
    const [ax, ay] = [a[0] - x0, a[1] - y0], [bx, by] = [b[0] - x0, b[1] - y0];
    const R = Math.max(r0, r1) + 1;
    const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
    for (let y = Math.floor(Math.min(ay, by) - R); y <= Math.max(ay, by) + R; y++) for (let x = Math.floor(Math.min(ax, bx) - R); x <= Math.max(ax, bx) + R; x++) {
      const px = x + 0.5 - ax, py = y + 0.5 - ay;
      const t = Math.max(0, Math.min(1, (px * vx + py * vy) / L2));
      const d = Math.hypot(px - t * vx, py - t * vy);
      if (d <= r0 + (r1 - r0) * t) pinta(x, y);
    }
  };
  // a 1 px polyline: Bresenham through every joint, then no L-corners
  const fina = (pts, v = 1) => {
    const out = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      let [xa, ya] = pts[i].map(Math.floor), [xb, yb] = pts[i + 1].map(Math.floor);
      xa -= x0; ya -= y0; xb -= x0; yb -= y0;
      const dx = Math.abs(xb - xa), dy = -Math.abs(yb - ya), sx = xa < xb ? 1 : -1, sy = ya < yb ? 1 : -1;
      let e = dx + dy;
      for (;;) {
        const u = out[out.length - 1];
        if (!u || u[0] !== xa || u[1] !== ya) out.push([xa, ya]);
        if (xa === xb && ya === yb) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; xa += sx; }
        if (e2 <= dx) { e += dx; ya += sy; }
      }
    }
    const limpo = [];
    for (let i = 0; i < out.length; i++) {
      const a = limpo[limpo.length - 1], b = out[i], c = out[i + 1];
      // b is the corner of an L when a and c touch diagonally and b touches both straight
      if (a && c && Math.abs(a[0] - c[0]) === 1 && Math.abs(a[1] - c[1]) === 1 && (a[0] === b[0] || a[1] === b[1]) && (c[0] === b[0] || c[1] === b[1])) continue;
      limpo.push(b);
    }
    for (const [x, y] of limpo) pinta(x, y, v);
  };

  for (const t of tracos) cone(t.p[0], t.p[1], t.w[0] / 2, t.w[1] / 2);
  const kw = Math.sqrt(k);
  for (const l of pernas) {
    // the femur thick (it tapers to the knee), the rest a 1 px line (above k ≈ 1.6 the tibia thickens too)
    cone(l.p[0], l.p[1], (l.w[0] * kw) / 2, (l.w[1] * kw) / 2);
    if (k >= 1.6) cone(l.p[1], l.p[2], (l.w[1] * kw) / 2, 0.6);
    fina(k >= 1.6 ? l.p.slice(2) : l.p.slice(1));
  }
  for (const f of finos) fina(f);
  if (fioDe) fina([fioDe, fioAte], 2);
  return { w, h, ox: -x0, oy: -y0, m };
}

/**
 * The colours: `preto` = the spider one flat black (the painting's own darkest); `aro` = the same black with a 1 px rim
 * where the body is at least 2 px thick (the light coming round its edge — the legs stay black, a rim on a 1 px leg
 * would light the whole leg). `luz`: where the light comes from ('volta' = from behind: the rim all round).
 */
export function pintarAranha(a, { estilo = 'preto', cor = 0x000000, aro = 0x7890ab, fioCor = 0x0e141b, luz = 'volta' } = {}) {
  const { w, h, m } = a;
  const px = Buffer.alloc(w * h * 4);
  const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  const dirs = luz === 'volta' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : luz === 'direita' ? [[1, 0], [0, -1]] : [[-1, 0], [0, -1]];
  const em = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  // the CORE: a pixel whose eight neighbours are all spider — only a part ≥ 3 px thick has one. The rim goes only on an
  // edge pixel touching the core (1st pass: the test along one axis lit every step of a steep 1 px leg — a dotted leg)
  const nucleo = (x, y) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (!em(x + a, y + b)) return false; return true; };
  const pertoDoNucleo = (x, y) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (nucleo(x + a, y + b)) return true; return false; };
  // the OUTSIDE: the empty pixels reached from the border (a gap between the fangs is not outside — 1st pass, the rim
  // lit those gaps and the front view grew two eyes)
  const fora = new Uint8Array(w * h);
  const fila = [];
  for (let x = 0; x < w; x++) fila.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) fila.push(y * w, y * w + w - 1);
  while (fila.length) {
    const k = fila.pop();
    if (fora[k] || m[k] === 1) continue;
    fora[k] = 1;
    const x = k % w, y = (k / w) | 0;
    if (x > 0) fila.push(k - 1);
    if (x < w - 1) fila.push(k + 1);
    if (y > 0) fila.push(k - w);
    if (y < h - 1) fila.push(k + w);
  }
  const vazioFora = (x, y) => x < 0 || y < 0 || x >= w || y >= h || fora[y * w + x] === 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = m[y * w + x];
    if (!v) continue;
    let c = v === 2 ? fioCor : cor;
    if (v === 1 && estilo === 'aro' && dirs.some(([dx, dy]) => vazioFora(x + dx, y + dy)) && pertoDoNucleo(x, y)) c = aro;
    px.set([...rgb(c), 255], (y * w + x) * 4);
  }
  return px;
}

// the CLI: every pose, both styles, at 1× (the game) and 4× (to look at)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [OUT = 'tmp-aranha'] = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  const TAMANHOS = { perfil: 1.15, pendurada: 1, frente: 1.25, teto: 1.1 };
  for (const nome of Object.keys(POSES)) {
    const a = desenharAranha(nome, { k: TAMANHOS[nome], semente: 7 });
    for (const estilo of ['preto', 'aro']) {
      const buf = pintarAranha(a, { estilo });
      const img = sharp(buf, { raw: { width: a.w, height: a.h, channels: 4 } });
      await img.clone().png().toFile(path.join(OUT, `${nome}-${estilo}.png`));
      await img.clone().resize(a.w * 4, a.h * 4, { kernel: 'nearest' }).png().toFile(path.join(OUT, `${nome}-${estilo}-x4.png`));
    }
    console.log(`${nome}: ${a.w}×${a.h} px`);
  }
}
