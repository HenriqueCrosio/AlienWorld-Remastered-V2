// THE TENTACLE, v2 (08/10) — his pick: the PINÇA 49 head (*"uma pegada de Alien"*). What he asked next:
//   1. the BODY with more detail and a TAIL → by hand: ribbed vertebrae in the head's own palette with a dorsal spike,
//      tapering to a xenomorph-like tail BLADE (and the Pro version, from `_gerar-f3.mjs tentaculoCorpoPinca`);
//   2. what the tower SPITS UP "related to the stage" → 4 concepts (acid, hull shard, Leviathan spore, egg);
//   3. ONE MORE SKILL in the same concept line → the INNER JAW (o Alien): a prototype animation, offline.
//   node scripts/_elites/_tentaculo-v2.mjs [pro-body.png ...]   → folhas/2026-10-08/elites/
import fs from 'node:fs';
import sharp from 'sharp';
import { hex, px } from './_tinta-lib.mjs';
import { ampliar, colar, colarCentro, girar, gravar, ler, novo, png } from './_pixel-lib.mjs';

const D = 'docs/superpowers/folhas/2026-10-08/elites';
const MAO = `${D}/mao`;
fs.mkdirSync(MAO, { recursive: true });
const PRO_CORPOS = process.argv.slice(2);
const FUNDO = 'docs/superpowers/folhas/2026-10-06/elites/ref/fundo-casco.png';
const CRISTA = 150;

// The head's own palette (measured on the Pro 49: 22 colours, these carry it).
const P = {
  O: hex('#050609'), o: hex('#0c0b0f'), d: hex('#141219'), D: hex('#1a1820'), m: hex('#24212b'), M: hex('#2d2835'),
  l: hex('#36313c'), L: hex('#3d3744'), h: hex('#45414a'), H: hex('#4b4c4f'), s: hex('#635d62'), r: hex('#923639'),
  R: hex('#b31a1d'),
};

/** A drawing from a char map (`.` = transparent), with a palette. */
function mapa(linhas, pal) {
  const img = novo(linhas[0].length, linhas.length);
  linhas.forEach((l, y) => [...l].forEach((c, x) => c !== '.' && px(img, x, y, pal[c], 1)));
  return img;
}

// ── 1. THE BODY BY HAND ──
/**
 * One VERTEBRA, with the chain axis VERTICAL (head up, tail down) — in game each segment turns with the chain. An oval
 * plate lit from the top-left, a rib groove, a rim light, and a dorsal SPIKE on the right (the back: it faces left).
 */
function vertebra(rx, ry, espinho) {
  const W = Math.ceil(2 * rx) + espinho + 3, H = Math.ceil(2 * ry) + 3;
  const cx = rx + 1, cy = ry + 1.5;
  const img = novo(W, H);
  const dentro = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!dentro(x, y)) continue;
      const borda = !dentro(x + 1, y) || !dentro(x - 1, y) || !dentro(x, y + 1) || !dentro(x, y - 1);
      if (borda) {
        px(img, x, y, P.O, 1);
        continue;
      }
      const n = -((x + 0.5 - cx) / rx) * 0.6 - ((y + 0.5 - cy) / ry) * 0.8;
      let c = n > 0.75 ? P.L : n > 0.35 ? P.M : n > -0.1 ? P.m : n > -0.55 ? P.D : P.d;
      if (y === Math.round(cy + ry * 0.35)) c = P.o; // the rib groove
      if (n > 0.85 && y < cy) c = P.H; // the rim light
      px(img, x, y, c, 1);
    }
  px(img, Math.round(cx - rx * 0.35), Math.round(cy - ry * 0.45), P.s, 1);
  // The dorsal spike, from the right side, pointing back and a little down (toward the tail).
  for (let t = 0; t <= espinho; t++) {
    const x = Math.round(cx + rx - 1 + t), y = Math.round(cy - 1 + t * 0.4);
    const grosso = t < espinho / 2;
    px(img, x, y - 1, P.O, 1);
    px(img, x, y, t === 0 ? P.l : P.M, 1);
    if (grosso) px(img, x, y + 1, P.D, 1);
    px(img, x, y + (grosso ? 2 : 1), P.O, 1);
  }
  px(img, Math.round(cx + rx - 1 + espinho + 1), Math.round(cy - 1 + espinho * 0.4), P.O, 1);
  return img;
}

/** The TAIL BLADE (the xenomorph spade), pointing DOWN, axis vertical. */
const LAMINA = mapa(
  [
    '...OO....',
    '...OlO...',
    '...OMO...',
    '..OHMDO..',
    '.OHlMDDO.',
    'OHlMMDDdO',
    'OHlMMDDdO',
    '.OHMMDdO.',
    '.OHMDDdO.',
    '..OHMdO..',
    '..OHDdO..',
    '...OHO...',
    '...OO....',
    '....O....',
  ],
  P,
);

const CORPO_MAO = [
  ...Array.from({ length: 5 }, () => vertebra(5.5, 4.5, 3)),
  vertebra(4.8, 4, 3),
  vertebra(4, 3.4, 2),
  vertebra(3.3, 2.8, 2),
  LAMINA,
];
await gravar(CORPO_MAO[0], `${MAO}/tentaculo-vertebra.png`);
for (const [i, k] of [[1, 5], [2, 6], [3, 7]]) await gravar(CORPO_MAO[k], `${MAO}/tentaculo-cauda-${i}.png`);
await gravar(LAMINA, `${MAO}/tentaculo-lamina.png`);

// The head: Pro 49, flopped (it came out facing right). Its neck leaves at the BOTTOM-RIGHT.
const CABECA = await ler('docs/superpowers/folhas/2026-10-07/elites/cand/tentaculoPinca-31-49.png', { flop: true, trim: true });
await gravar(CABECA, `${MAO}/tentaculo-cabeca-49.png`);
/** Where the neck joins the body, from the head's centre (measured on the 30×27 art). */
const NUCA = { x: 6, y: 12 };
/** The mouth (between the pincers), from the head's centre. */
const BOCA = { x: -9, y: 2 };

// ── a scene to pose things on: the real hull, the ship for scale ──
const fundo = await ler(FUNDO);
const nave = await ler('public/sprites/ship-jato.png');
const recorte = (J) => {
  const img = novo(J.w, J.h);
  for (let y = 0; y < J.h; y++) fundo.d.copy(img.d, y * J.w * 4, ((J.y + y) * fundo.w + J.x) * 4, ((J.y + y) * fundo.w + J.x + J.w) * 4);
  return img;
};
/** Pastes only the part ABOVE the crest (the hull hides the rest) — the front-of-hull pieces. */
function colarAcima(img, spr, cx, cy, crista) {
  const tmp = novo(img.w, img.h);
  colarCentro(tmp, spr, cx, cy);
  for (let y = 0; y < Math.min(crista, img.h); y++)
    for (let x = 0; x < img.w; x++) {
      const k = (y * img.w + x) * 4;
      if (tmp.d[k + 3]) px(img, x, y, [tmp.d[k], tmp.d[k + 1], tmp.d[k + 2]], tmp.d[k + 3] / 255);
    }
}

/**
 * Poses the CHAIN along a path (head first): each piece turns with the path — the art's "up" points to the head.
 * `caminho(u)` gives the point at arc-parameter u∈[0,1] (0 = head). `pecas` = the body (vertebrae … blade).
 */
function corrente(img, caminho, pecas, crista, espacos) {
  const pts = Array.from({ length: 400 }, (_, i) => caminho(i / 399));
  const ao = (dist) => {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (acc + seg >= dist) {
        const u = (dist - acc) / seg;
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u, ang: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x) };
      }
      acc += seg;
    }
    return null;
  };
  const posicoes = [];
  let dist = espacos[0];
  pecas.forEach((p, i) => {
    const q = ao(dist);
    if (q) posicoes.push([p, q]);
    dist += espacos[Math.min(i + 1, espacos.length - 1)];
  });
  // Drawn tail first, so each vertebra overlaps the next one (the one nearer the head on top).
  for (const [p, q] of posicoes.reverse()) {
    // The path runs FROM the head; the art's up (−y) must point back to the head: rot = ang − π/2.
    const g = girar(p, q.ang - Math.PI / 2);
    if (crista !== null) colarAcima(img, g, q.x, q.y, crista);
    else colarCentro(img, g, q.x, q.y);
  }
}
const ESPACOS = [0, 7, 7, 7, 7, 7, 6, 5, 5, 6];

/** The head at (x, y) turned `rot`; returns the neck point (where the body starts). */
function cabeca(img, x, y, rot, crista = null) {
  const g = girar(CABECA, rot);
  if (crista !== null) colarAcima(img, g, x, y, crista);
  else colarCentro(img, g, x, y);
  const c = Math.cos(rot), s = Math.sin(rot);
  return { x: x + NUCA.x * c - NUCA.y * s, y: y + NUCA.x * s + NUCA.y * c };
}

async function painel(J, desenhar, titulo, Z = 4) {
  const img = recorte(J);
  colar(img, nave, 6, Math.round(J.h * 0.38 - nave.h / 2));
  desenhar(img);
  const rot = await sharp(Buffer.from(`<svg width="${J.w * Z}" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="17" font-family="Consolas, monospace" font-size="15" fill="#ffb040">${titulo}</text></svg>`)).png().toBuffer();
  return { rot, img: await ampliar(img, Z), w: J.w * Z, h: J.h * Z + 24 };
}
async function folha(paineis, cols, arq) {
  const PW = paineis[0].w, PH = paineis[0].h;
  const comp = paineis.flatMap((p, k) => {
    const left = (k % cols) * (PW + 6), top = Math.floor(k / cols) * (PH + 8);
    return [{ input: p.rot, left, top }, { input: p.img, left, top: top + 24 }];
  });
  await sharp({ create: { width: cols * (PW + 6), height: Math.ceil(paineis.length / cols) * (PH + 8), channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(arq);
  console.log(arq);
}

// ── the BODY sheet: the three poses (tower, the bite in flight, the dive), by hand and by the Pro ──
const J = { x: 100, y: 30, w: 200, h: 150 };
const crestaJ = CRISTA - J.y;
const poses = (pecas) => [
  [
    'TORRE (de pé, a raiz no casco)',
    (img) => {
      const n = cabeca(img, 130, crestaJ - 52, 0);
      corrente(img, (u) => ({ x: n.x, y: n.y + u * 120 }), pecas, crestaJ, ESPACOS);
      cabeca(img, 130, crestaJ - 52, 0);
    },
  ],
  [
    'BOTE (no ar: o corpo inteiro e o RABO saem)',
    (img) => {
      // The head leads up-left; the body trails along a parabola from the hole.
      const curva = (u) => ({ x: 110 + u * 70, y: 40 + 90 * u * u + 10 * u });
      const rot = Math.atan2(-1, -0.6) + Math.PI / 2;
      const n = cabeca(img, 110, 40, rot);
      corrente(img, (u) => ({ x: n.x + u * 70, y: n.y + 95 * u * u + 6 * u }), pecas, null, ESPACOS);
      cabeca(img, 110, 40, rot);
      void curva;
    },
  ],
  [
    'MERGULHO (cai por trás das placas)',
    (img) => {
      const rot = Math.atan2(1, -0.7) + Math.PI / 2;
      const n = cabeca(img, 92, crestaJ - 6, rot, crestaJ);
      // The body trails back along the arc it fell through: up, then curving away to the right.
      corrente(img, (u) => ({ x: n.x + 80 * u, y: n.y - 100 * u * (1 - 0.6 * u) }), pecas, null, ESPACOS);
      // The plates hide what is behind them: redraw the hull band over everything below the crest.
      const base = recorte(J);
      for (let y = crestaJ; y < J.h; y++) base.d.copy(img.d, y * J.w * 4, y * J.w * 4, (y + 1) * J.w * 4);
      cabeca(img, 92, crestaJ - 6, rot, crestaJ);
    },
  ],
];

const paineisCorpo = [];
for (const [nome, f] of poses(CORPO_MAO)) paineisCorpo.push(await painel(J, f, `MÃO · ${nome}`, 3));
// The Pro body columns: sliced into segments by their own rings (top = neck), when given.
for (const arq of PRO_CORPOS) {
  const col = await ler(arq, { trim: true });
  // Slice the column into ~7px bands, the last one is the tail tip; each band is a piece.
  const pecas = [];
  for (let y = 0; y + 4 <= col.h; y += 7) {
    const h = Math.min(col.h - y, y + 14 > col.h ? col.h - y : 7);
    const p = novo(col.w, h);
    for (let yy = 0; yy < h; yy++) col.d.copy(p.d, yy * col.w * 4, ((y + yy) * col.w) * 4, ((y + yy) * col.w + col.w) * 4);
    pecas.push(p);
    if (y + 14 > col.h) break;
  }
  const nome = arq.split('/').pop().replace('.png', '');
  for (const [pose, f] of poses(pecas)) paineisCorpo.push(await painel(J, f, `PRO ${nome} · ${pose}`, 3));
}
await folha(paineisCorpo, 3, `${D}/folha-tentaculo-corpo.png`);

// ── 2. WHAT THE TOWER SPITS (≤8px: by hand) — related to the stage: the Leviathan's hull and the Alien line ──
const TIROS = {
  'ÁCIDO (o Alien: gota que chia)': mapa(['..GAA.', 'GAAYYA', '.GAAA.'], { G: hex('#4f7a14'), A: hex('#a6d235'), Y: hex('#efff7a') }),
  'LASCA DO CASCO (placa arrancada, borda em brasa)': mapa(['..KHO', 'KHLHO', '.KKO.'], { K: hex('#1c2433'), H: hex('#3b4a66'), L: hex('#62759a'), O: hex('#e8913f') }),
  'ESPORO DO LEVIATÃ (o vermelho do bicho)': mapa(['.rr.', 'rPCr', 'rPPr', '.rr.'], { r: hex('#3a0c10'), P: hex('#8a1a20'), C: hex('#ff5a40') }),
  'OVO (a fenda acesa em cruz)': mapa(['.ee.', 'eRRe', 'eMLe', 'eMMe', '.ee.'], { e: P.O, R: hex('#ff4a3a'), M: P.M, L: P.L }),
};
const JT = { x: 120, y: 40, w: 150, h: 130 };
const crestaT = CRISTA - JT.y;
const paineisTiro = [];
for (const [nome, t] of Object.entries(TIROS)) {
  await gravar(t, `${MAO}/tiro-${nome.split(' ')[0].normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase()}.png`);
  paineisTiro.push(
    await painel(JT, (img) => {
      const hx = 96, hy = crestaT - 52;
      const n = cabeca(img, hx, hy, 0);
      corrente(img, (u) => ({ x: n.x, y: n.y + u * 120 }), CORPO_MAO, crestaT, ESPACOS);
      cabeca(img, hx, hy, 0);
      // The crescent: 6 shots on a 140° arc opening UP from the mouth, at two moments of their flight.
      const arco = (140 * Math.PI) / 180;
      for (const r of [16, 34]) {
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 - arco / 2 + (arco * i) / 5;
          colarCentro(img, girar(t, a), hx + BOCA.x + Math.cos(a) * r, hy + BOCA.y - 6 + Math.sin(a) * r);
        }
      }
      // The piece itself, magnified, in the corner.
      const z = novo(t.w * 6, t.h * 6);
      for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) t.d.copy(z.d, (y * z.w + x) * 4, (Math.floor(y / 6) * t.w + Math.floor(x / 6)) * 4, (Math.floor(y / 6) * t.w + Math.floor(x / 6)) * 4 + 4);
      colar(img, z, JT.w - z.w - 4, 4);
    }, `TIRO · ${nome}`, 4),
  );
}
await folha(paineisTiro, 2, `${D}/folha-tentaculo-tiros.png`);

// ── 3. THE NEW SKILL — A MANDÍBULA INTERNA (the Alien's second mouth), an offline prototype at real speed ──
// From the TOWER: the head turns to the ship and the throat glows (the tell, 0.5s) → the inner jaw SHOOTS on the
// locked line (0.15s, ~110px) → holds (0.2s) → pulls back (0.35s). Reach is short: outside it, the ship is safe.
const MANDIBULA = mapa(['..OOOO.', '.OTHMDO', 'ORRMMDO', '.OTDDDO', '..OOOO.'], { ...P, T: hex('#9a929e') });
await gravar(MANDIBULA, `${MAO}/tentaculo-mandibula.png`);
// x ≥ 90: the background is a game capture, and its own ship sits at x≈45–85.
const JG = { x: 92, y: 30, w: 240, h: 150 };
const crestaG = CRISTA - JG.y;
const FPS = 20, DUR = 2.6, ALCANCE = 100;
const quadros = [];
for (let i = 0; i < Math.round(DUR * FPS); i++) {
  const t = i / FPS;
  const img = recorte(JG);
  // The ship: still, then it steps OUT of the line when the tell ends (the dodge the tell makes possible).
  const naveY = t < 0.85 ? 66 : Math.max(40, 66 - (t - 0.85) * 160);
  colar(img, nave, 30, naveY - nave.h / 2);
  const hx0 = 180, hy = crestaG - 52;
  const alvo = { x: 30 + nave.w / 2, y: 66 };
  // The tell: the head REARS BACK (4px, like a snake loading), shakes, and turns a little toward the ship.
  const carga = t < 0.4 ? 0 : t < 0.9 ? Math.min(1, (t - 0.4) / 0.2) : t < 1.6 ? 1 - Math.min(1, (t - 1.25) / 0.35) * (t >= 1.25 ? 1 : 0) : 0;
  const tremor = t >= 0.5 && t < 0.9 ? (i % 2 ? 1 : -1) : 0;
  const hx = hx0 + 4 * (t < 0.9 ? carga : 0) + tremor;
  const ang = Math.atan2(alvo.y - (hy + BOCA.y), alvo.x - (hx0 + BOCA.x));
  // The turn from facing left (π) to the aim, WRAPPED (atan2 lands on −π just as well as on π).
  const giro = carga * Math.atan2(Math.sin(ang - Math.PI), Math.cos(ang - Math.PI)) * 0.7;
  const n = cabeca(img, hx, hy, giro);
  corrente(img, (u) => ({ x: n.x, y: n.y + u * 120 }), CORPO_MAO, crestaG, ESPACOS);
  cabeca(img, hx, hy, giro);
  const c = Math.cos(giro), s = Math.sin(giro);
  const bx = hx + BOCA.x * c - BOCA.y * s, by = hy + BOCA.x * s + BOCA.y * c;
  // The tell (2): the INNER JAW PEEKS between the pincers and the throat GLOWS around it (the only light: energy),
  // pulsing faster as the strike nears.
  if (t >= 0.4 && t < 0.9) {
    const pulso = Math.floor(t * (8 + (t - 0.4) * 30)) % 2;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [2, -1], [2, 1]]) px(img, Math.round(bx) + dx, Math.round(by) + dy, pulso ? hex('#ff6a50') : P.R, pulso ? 1 : 0.7);
    colarCentro(img, girar(MANDIBULA, ang - Math.PI), bx + 3, by);
  }
  // The strike: the inner jaw on its tongue, out to ALCANCE on the angle locked at the end of the tell.
  let L = 0;
  if (t >= 0.9 && t < 1.05) L = ((t - 0.9) / 0.15) * ALCANCE;
  else if (t >= 1.05 && t < 1.25) L = ALCANCE;
  else if (t >= 1.25 && t < 1.6) L = ALCANCE * (1 - (t - 1.25) / 0.35);
  if (L > 2) {
    const ux = Math.cos(ang), uy = Math.sin(ang);
    // The stalk: 4px, RIBBED (a ring every 4px, the Alien's inner-jaw neck), outlined.
    for (let d = 0; d < L; d++) {
      const x = Math.round(bx + ux * d), y = Math.round(by + uy * d);
      const anel = d % 4 === 0;
      px(img, x, y - 2, P.O, 1);
      px(img, x, y - 1, anel ? P.H : P.l, 1);
      px(img, x, y, anel ? P.L : P.m, 1);
      px(img, x, y + 1, P.D, 1);
      px(img, x, y + 2, P.O, 1);
    }
    colarCentro(img, girar(MANDIBULA, ang - Math.PI), bx + ux * L, by + uy * L);
  }
  quadros.push(await ampliar(img, 3));
}
await sharp(quadros, { join: { animated: true } }).gif({ delay: Array(quadros.length).fill(1000 / FPS), loop: 0 }).toFile(`${D}/tentaculo-mandibula-prototipo.gif`);
console.log(`${D}/tentaculo-mandibula-prototipo.gif`, quadros.length, 'quadros');
void png;
