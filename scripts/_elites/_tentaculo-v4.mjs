// THE TENTACLE, v4 (08/10, 3rd round) — he: *"você está se baseando em um sprite parado para criar uma nova skill,
// pense mais longe… qual movimento dessa serpente poderia intrigar o player?"*. Here the MOTION leads: the head
// follows a path, the whole body (Pro 51-0 + the tail fan) rides that same path turning with it, the spines are born
// from the movement. Two offline demos at real speed, on the real hull:
//   A. A ESPIRAL (his): she LEAPS from behind the hull and crosses it in a corkscrew of loops; at each turn of the loop
//      she sheds spines that fly STRAIGHT — a trail the ship has to thread through.
//   B. A JAULA (mine): she leaps and CIRCLES the ship, planting spines in the void as she passes — a crown with ONE
//      gap; she dives; the crown tells, then closes inward. Leave by the gap, or slip between them.
//   node scripts/_elites/_tentaculo-v4.mjs   → folhas/2026-10-08/elites/serpente-espiral-demo.gif, serpente-jaula-demo.gif
import sharp from 'sharp';
import { ampliar, ler } from './_pixel-lib.mjs';
import { CABECA, CRISTA, P, colarAcima, girar, mapa, nave, novo, px, recorte, colar } from './_cena-casco.mjs';

const D = 'docs/superpowers/folhas/2026-10-08/elites';
const CAND = `${D}/cand`;
const FPS = 20;
const J = { x: 92, y: 30, w: 260, h: 150 };
const cr = CRISTA - J.y; // the crest in the window (120)

// ── the body: a Pro column sliced in 7px bands + the tail fan 51-7 turned to point down ──
/** Opaque width of a slice (to find the column's thin rounded TOP). */
const largura = (p) => {
  let x0 = p.w, x1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.d[(y * p.w + x) * 4 + 3]) [x0, x1] = [Math.min(x0, x), Math.max(x1, x)];
  return x1 - x0 + 1;
};
async function corpo(n) {
  const col = await ler(`${CAND}/tentaculoCorpoSerpente-${n}.png`, { trim: true });
  let pecas = [];
  for (let y = 0; y < col.h; y += 7) {
    const h = col.h - y < 14 ? col.h - y : 7;
    const p = novo(col.w, h);
    for (let yy = 0; yy < h; yy++) col.d.copy(p.d, yy * col.w * 4, ((y + yy) * col.w) * 4, ((y + yy) * col.w + col.w) * 4);
    pecas.push(p);
    if (h > 7) break;
  }
  // 08/10, he: *"da cabeça sai um pescoço fino e depois cresce, fica estranho"* — the column's top is its rounded END
  // cap. Drop the thin leading slices: the body starts FULL width, its first ring tucked under the neck.
  const max = Math.max(...pecas.map(largura));
  while (pecas.length > 4 && largura(pecas[0]) < max * 0.8) pecas = pecas.slice(1);
  const dist = pecas.map((_, i) => 7 + i * 7);
  pecas.push(girar(await ler(`${CAND}/tentaculoCaudaSerpente-51-7.png`, { trim: true }), Math.PI / 2));
  dist.push(dist[dist.length - 1] + 12);
  return { pecas, dist };
}
const CORPOS = { '51-2': await corpo('51-2'), '51-1': await corpo('51-1') };
let CORPO = CORPOS['51-2'];

// The spines (≤10px, by hand): a glowing base torn from the lit tissue, a pale bone tip; they point RIGHT.
const ESPINHO = mapa(['......OO.', 'OFRRhsO..', '.OOOOO...']);
/** The NEEDLE of the spiral (11×3): long and straight, so a column of them reads as parallel lines with lanes. */
const AGULHA = mapa(['.......OOO.', 'OFRMMhhsssO', '.OOOOOOOO..']);

/**
 * A creature on a PATH: `f(t)` gives the head at time t (defined from before it leaves the hull). Dense samples with
 * their arc length let every body piece sit `dist` px BEHIND the head along the same path — the chain of the game.
 */
function trajeto(f, t0, t1) {
  const pts = [];
  let s = 0;
  for (let t = t0; t <= t1 + 1e-9; t += 1 / 480) {
    const p = f(t);
    if (pts.length) s += Math.hypot(p.x - pts[pts.length - 1].x, p.y - pts[pts.length - 1].y);
    pts.push({ ...p, t, s });
  }
  const idx = (t) => Math.max(0, Math.min(pts.length - 1, Math.round((t - t0) * 480)));
  const porS = (s) => {
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (pts[m].s < s) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  return {
    cabeca: (t) => pts[idx(t)],
    /** Position and MOTION heading of the point `d` px behind the head at time t. */
    atras(t, d) {
      const k = porS(pts[idx(t)].s - d);
      const a = pts[Math.max(0, k - 2)], b = pts[Math.min(pts.length - 1, k + 2)];
      return { x: pts[k].x, y: pts[k].y, ang: Math.atan2(b.y - a.y, b.x - a.x) };
    },
  };
}

/** Draws the serpent at time t: everything below the crest is hidden (she is BEHIND the plates when low). */
function serpente(img, tr, t) {
  for (let i = CORPO.pecas.length - 1; i >= 0; i--) {
    const q = tr.atras(t, CORPO.dist[i]);
    colarAcima(img, girar(CORPO.pecas[i], q.ang + Math.PI / 2), q.x, q.y, cr);
  }
  const h = tr.atras(t, 0);
  colarAcima(img, girar(CABECA, h.ang + Math.PI / 2), h.x, h.y, cr);
}

function espinho(img, e, t) {
  const k = t - e.t0;
  if (k < 0) return;
  const x = e.x + Math.cos(e.ang) * e.vel * k, y = e.y + Math.sin(e.ang) * e.vel * k;
  if (x < -10 || y < -10 || x > J.w + 10 || y > cr) return;
  // A short ember trail, so a moving line of spines reads as a line.
  if (e.vel > 0) for (const [b, al] of [[3, 0.5], [6, 0.25]]) px(img, Math.round(x - Math.cos(e.ang) * b), Math.round(y - Math.sin(e.ang) * b), P.R, al);
  const g = girar(e.spr ?? ESPINHO, e.ang);
  colar(img, g, x - g.w / 2, y - g.h / 2);
}

async function gif(nome, dur, desenhar) {
  const quadros = [];
  for (let i = 0; i < Math.round(dur * FPS); i++) {
    const img = recorte(J);
    desenhar(img, i / FPS, i);
    quadros.push(await ampliar(img, 3));
  }
  const out = `${D}/${nome}`;
  await sharp(quadros, { join: { animated: true } }).gif({ delay: Array(quadros.length).fill(1000 / FPS), loop: 0 }).toFile(out);
  console.log(out, quadros.length, 'quadros');
}

// ── A. A ESPIRAL — his drawing (08/10): she rises from behind the hull on the right, CURLS one loop in the air (the
// "6"), then sweeps a long arc down into the hull, left of where she came out. Along the loop she sheds spines
// STRAIGHT TO THE LEFT, parallel: they cross the screen as COLUMNS of horizontal spines with lanes between them —
// the ship flies INTO a lane (his arrow). The loop passes each height twice: two columns.
{
  CORPO = CORPOS['51-2'];
  // The path through his drawing (window px), a Catmull-Rom spline: behind the hull → up the right side of the loop →
  // over the top → down its left side → across its bottom → the long arc down-left into the hull.
  // The loop is BIG (r≈36, ~225px around) so a ~100px body visibly COILS in it instead of smearing.
  const pontos = [
    [252, 178], [240, 132], [224, 100], [214, 70], [205, 42], [187, 28], [164, 30], [147, 46], [140, 67], [148, 88],
    [168, 99], [194, 94], [206, 78], [198, 62], [178, 62], [156, 74], [136, 94], [122, 120], [116, 150], [114, 182],
  ];
  const cr2 = (p0, p1, p2, p3, u) => 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3);
  const curva = [];
  for (let i = 0; i < pontos.length - 1; i++) {
    const [a, b, c, d] = [pontos[Math.max(0, i - 1)], pontos[i], pontos[i + 1], pontos[Math.min(pontos.length - 1, i + 2)]];
    for (let k = 0; k < 40; k++) {
      const u = k / 40;
      curva.push({ x: cr2(a[0], b[0], c[0], d[0], u), y: cr2(a[1], b[1], c[1], d[1], u) });
    }
  }
  const S = [0];
  for (let i = 1; i < curva.length; i++) S.push(S[i - 1] + Math.hypot(curva[i].x - curva[i - 1].x, curva[i].y - curva[i - 1].y));
  const total = S[S.length - 1];
  // Speed along the path: a burst out of the hull, a touch slower through the loop (she shows off), fast into the dive.
  const VEL = (s) => (s < 70 ? 230 : s < total - 110 ? 165 : 210);
  const tempos = [0];
  for (let i = 1; i < curva.length; i++) tempos.push(tempos[i - 1] + (S[i] - S[i - 1]) / VEL(S[i]));
  const T_FIM = tempos[tempos.length - 1];
  const f = (t) => {
    if (t <= 0) return { x: curva[0].x + 4 * t, y: curva[0].y - 160 * t }; // still deep behind the hull
    if (t >= T_FIM) return { x: curva.at(-1).x, y: curva.at(-1).y + 160 * (t - T_FIM) };
    let k = tempos.findIndex((x) => x >= t);
    const u = (t - tempos[k - 1]) / (tempos[k] - tempos[k - 1]);
    return { x: curva[k - 1].x + (curva[k].x - curva[k - 1].x) * u, y: curva[k - 1].y + (curva[k].y - curva[k - 1].y) * u };
  };
  const T0 = 0.5; // she leaps at 0.5s
  const tr = trajeto((t) => f(t - T0), -2, 6);
  // The spines: in the LOOP, wherever she is going UP or DOWN (its two sides), one long needle every 0.055s STRAIGHT
  // LEFT — each side of the loop lays a COLUMN of parallel needles with lanes between them; two sides, two columns.
  // The needles sit on a LANE GRID (every 18px): the rising side of the loop fires on the lines 30, 48, 66…, the falling
  // side on the lines in between (39, 57, 75…). Two columns, OUT OF PHASE: the gap of one is a needle of the other —
  // whoever slips through the first column has to change lane before the second. The trail is a zig-zag.
  // …and TWO SPEEDS: the rising side's column flies fast, the falling side's slow — the second column (launched nearer
  // the ship) would otherwise arrive glued to the first; slow, it comes ~0.6s after: the window to change lane.
  const PASSO = 14, BASE = 30, VEL_COL = { A: 58, B: 20 };
  // Each column belongs to ONE stretch of the path: A = the right side of the loop going up (points 1–5), B = its left
  // side coming down (points 6–10). (The inner curl of the "6" also rises — it sheds nothing.)
  const TRECHO = { A: [S[1 * 40], S[5 * 40]], B: [S[6 * 40], S[10 * 40]] };
  const espinhos = [];
  let yAnt = null;
  for (let t = 0; t < T_FIM; t += 1 / 480) {
    const k = tempos.findIndex((x) => x >= t);
    const p = f(t);
    const col = S[k] >= TRECHO.A[0] && S[k] <= TRECHO.A[1] ? 'A' : S[k] >= TRECHO.B[0] && S[k] <= TRECHO.B[1] ? 'B' : null;
    if (!col || p.y > cr - 8) {
      yAnt = p.y;
      continue;
    }
    const q = f(t + 0.01);
    const sobe = col === 'A';
    const fase = sobe ? 0 : PASSO / 2;
    // Crossed a line of this side's grid since the last sample?
    if (yAnt !== null && Math.abs(q.y - p.y) > Math.abs(q.x - p.x) * 0.6) {
      const a = Math.floor((yAnt - BASE - fase) / PASSO), b = Math.floor((p.y - BASE - fase) / PASSO);
      if (a !== b) {
        const linha = BASE + fase + Math.max(a, b) * PASSO;
        espinhos.push({ t0: t + T0, x: p.x - 10, y: linha, ang: Math.PI, vel: VEL_COL[sobe ? 'A' : 'B'], spr: AGULHA, coluna: sobe ? 'A' : 'B' });
      }
    }
    yAnt = p.y;
  }
  // The ship (his arrow, then the zig-zag): in a gap of column A (= a line of B), it lets A pass, then steps half a
  // lane into a line of A (= a gap of B) before B arrives.
  const NX = 30;
  const chega = (col) => Math.min(...espinhos.filter((e) => e.coluna === col).map((e) => e.t0 + (e.x - NX - nave.w) / e.vel));
  const passa = (col) => Math.max(...espinhos.filter((e) => e.coluna === col).map((e) => e.t0 + (e.x - NX + 12) / e.vel));
  const yA = BASE + PASSO / 2 + 2 * PASSO; // a gap of A (= a line of B)
  const yB = BASE + 2 * PASSO; // a gap of B (= a line of A)
  const troca = passa('A') + 0.05;
  const faixa = { chegaA: chega('A'), passaA: passa('A'), chegaB: chega('B'), troca };
  const naveEm = (t) => {
    const y = t < troca ? 64 + (yA - 64) * Math.min(1, Math.max(0, (t - 1.0) / 0.5)) : yA + (yB - yA) * Math.min(1, (t - troca) / 0.2);
    return { x: NX, y: y - nave.h / 2 + nave.h / 2 };
  };
  await gif('serpente-espiral-demo.gif', 8.6, (img, t) => {
    const n = naveEm(t);
    colar(img, nave, n.x, n.y - nave.h / 2);
    for (const e of espinhos) espinho(img, e, t);
    serpente(img, tr, t);
  });
  console.log('espinhos', espinhos.length, 'faixa', faixa);
}

// ── B. A JAULA (mine) ──
{
  CORPO = CORPOS['51-1'];
  const C = { x: 112, y: 70 }; // where the ship is when she leaps
  const r = 46; // the body (~24px wide) must stay inside the screen at the top of the circle
  const ARCO = 2 * Math.PI * 0.84; // she circles 84%: the rest is the GAP (bottom-right, where she leaves)
  const T_PULO = 0.45, T_VOLTA = 1.7, T_MERGULHO = 0.6;
  const inicio = { x: C.x + r, y: C.y };
  const fim = { x: C.x + r * Math.cos(ARCO), y: C.y - r * Math.sin(ARCO) };
  const f = (t) => {
    if (t < T_PULO) {
      // The leap from behind the hull up to the circle (a quadratic arc).
      const u = Math.max(-4, t) / T_PULO;
      const a = { x: 240, y: cr + 50 }, c = { x: 236, y: C.y - 10 };
      const k = Math.max(0, u);
      const b = { x: (1 - k) ** 2 * a.x + 2 * (1 - k) * k * c.x + k * k * inicio.x, y: (1 - k) ** 2 * a.y + 2 * (1 - k) * k * c.y + k * k * inicio.y };
      return u < 0 ? { x: a.x, y: a.y - u * 60 } : b;
    }
    if (t < T_PULO + T_VOLTA) {
      // Counter-clockwise around the ship (up first), leaving the gap behind her start.
      const th = ((t - T_PULO) / T_VOLTA) * ARCO;
      return { x: C.x + r * Math.cos(th), y: C.y - r * Math.sin(th) };
    }
    // The dive keeps going down (u past 1): the whole body, tail fan last, sinks behind the plates.
    const u = (t - T_PULO - T_VOLTA) / T_MERGULHO;
    return { x: fim.x + 30 * Math.min(1, u), y: fim.y + (cr + 60 - fim.y) * u * u };
  };
  const tr = trajeto(f, -2, 5);
  // The crown: a spine PLANTED in the void every ~26px of the circle, pointing at the centre; it hangs still.
  const N = 14;
  const T_FECHA = T_PULO + T_VOLTA + T_MERGULHO + 0.5;
  const coroa = Array.from({ length: N }, (_, i) => {
    const th = ((i + 0.5) / N) * ARCO;
    return { t0: T_PULO + ((i + 0.5) / N) * T_VOLTA, x: C.x + (r - 4) * Math.cos(th), y: C.y - (r - 4) * Math.sin(th), ang: Math.atan2(Math.sin(th), -Math.cos(th)), spr: AGULHA };
  });
  // The ship: still while she circles, then out by the gap (right-down) before the crown closes.
  const naveEm = (t) => (t < 2.2 ? { x: C.x - 10, y: C.y } : { x: C.x - 10 + Math.min(1, (t - 2.2) / 0.7) * 70, y: C.y + Math.min(1, (t - 2.2) / 0.7) * 30 });
  await gif('serpente-jaula-demo.gif', 5.0, (img, t, i) => {
    const n = naveEm(t);
    colar(img, nave, n.x, n.y - nave.h / 2);
    for (const e of coroa) {
      if (t < e.t0) continue;
      // Planted: still. The tell before closing: the crown pulses (the bases flare), then all close inward together.
      if (t < T_FECHA) {
        const pisca = t > T_FECHA - 0.5 && i % 2 === 0;
        const g = girar(e.spr, e.ang);
        colar(img, g, e.x - g.w / 2, e.y - g.h / 2);
        if (pisca) px(img, Math.round(e.x), Math.round(e.y), P.F, 1);
      } else espinho(img, { ...e, t0: T_FECHA, vel: 60 }, t);
    }
    serpente(img, tr, t);
  });
}
