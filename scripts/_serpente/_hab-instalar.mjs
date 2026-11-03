// 02/11 — THE SKILLS' ART INSTALLED (spec `2026-11-02-serpente-habilidades-instalacao-design.md` §4, plan Task 4): every
// set of the fight (the shot clips, the rain's, the encirclement's, the beam's head, the gas heads of the A and the B)
// as one sheet per set (8 columns of 256² frames) in `public/sprites/serpente-hab/`, with, per frame:
//   - the living MOUTHS, the cyan's EYE, the VULNERABLE head's SKULL (art px from the art's centre, like `ERGUER`);
//   - the LIGHT masks (white where a head's lights power up — the mock's own colour tests, `quadro`'s `acende`, on its
//     graded colour), for the beam's cyan and the gas' green and orange; the idles get them too;
//   - the live head's VEINS and the other heads' SHADOW (as `_erguer-instalar.mjs`: the accent hue near the live skull;
//     the others' above the cut, 55% darker).
// Also the projectiles' pixels (`src/entities/serpente/projeteisHab.ts`), `src/entities/serpente/gestosHab.ts` and a
// zoomed check sheet per set (`<folha>/conferencia-<set>.png`): the art dimmed, the veins in colour, the shadow grey,
// the light masks magenta, each mouth a dot in its head's colour, the eye white, the skull a ring.
// Where the points come from:
//   - the beam's sets: the round-11 `pontos.json` (eye, mouth; the skull = the eye + the approved pose's eye→skull);
//   - the A's gas sets: the round-13 `pontos.json`, by the mock's own rule (the idle's hand-measured mouth + the
//     frame's shift from the approved frame); the cyan's skull follows the cyan's mouth the same way;
//   - the B's gas sets: the green mouth = its throat's glow, the orange's = its muzzle's glow, each shifted so the
//     approved frame gives the measured mouth (the round-13 method); the green's skull read by eye (`CRANIO`);
//   - the clips: the cyan's skull read by eye at key frames (`CRANIO`; block matching failed — see there); a mouth
//     follows its skull, and at the ACTION frame it is the one measured by hand (`mao`: the 14th round's shot mouths;
//     the rain's and the encirclement's, from the throat's glow).
// A frame pixel-identical to an approved frame or to an earlier set's frame gets that frame's points (the sets meet
// at shared poses without a jump).
//   node scripts/_serpente/_hab-instalar.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const M = 'docs/superpowers/folhas/2026-10-31/serpente-habilidades';
const F = 'docs/superpowers/folhas/2026-11-02/serpente-instalacao';
const OUT = 'public/sprites/serpente-hab';
const { ERGUER } = await import('../../src/entities/gestoSerpente.ts');
const L = 256, COLS = 8;
/** the art's centre in the 256² frame (`ERGUER[F].origem` × 256) */
const CENTRO = { A: { x: 137, y: 133 }, B: { x: 137, y: 134.5 } };
/** the A's idle mouths (art px, measured on the grid 29/10) and their per-frame shift in the idle (the mock's 94, 101–105) */
const BOCAS = { ciano: [-97, -58], verde: [-20, -73], laranja: [35, -53] };
const BOCA_IDLE = {
  ciano: [[0, 0], [0, 3], [0, 4], [0, 4], [0, 2], [-1, -1], [-2, -3], [-4, -5], [-5, -7]],
  verde: [[0, 0], [0, 4], [0, 6], [0, 7], [1, 6], [2, 4], [2, 1], [3, -3], [4, -5]],
  laranja: [[0, 0], [0, 3], [-1, 4], [-2, 4], [-2, 3], [-2, 0], [-1, -2], [0, -6], [2, -8]],
};
const VIVAS = { A: ['ciano', 'verde', 'laranja'], B: ['verde', 'laranja'] };
const VULNERAVEL = { A: 'ciano', B: 'verde' };

const seq = (dir, idx) => idx.map((i) => path.join(dir, `${i}.png`));
const de = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const K = `${M}/cru2/tirosK-limpo`, R = `${M}/cru3/cabeca-raio`, G = `${M}/cru3/cabeca-gas`, GB = `${F}/cru/gasB`;
const n = (dir) => fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
/** every set: its form, its frames, how its points are made; `mao` = the hand-measured mouths (canvas px) per frame */
const FONTES = {
  tiroA: { forma: 'A', tipo: 'clipe', arqs: seq(K, de(0, 7)), acao: 2, mao: { 2: { ciano: [26, 84] } } },
  tiroC: { forma: 'A', tipo: 'clipe', arqs: seq(K, [0, ...de(8, 14)]), acao: 2, mao: { 2: { laranja: [106, 98] } } },
  tiroB: { forma: 'A', tipo: 'clipe', arqs: seq(K, [0, ...de(15, 21)]), acao: 2, mao: { 2: { verde: [64, 85] } } },
  // (03/11, his answer at the 3rd pause: the generator's painted spit off — frames 10–11, `ferramentas/cuspe-chuva.mjs`)
  chuvaA: { forma: 'A', tipo: 'clipe', arqs: seq(`${F}/cru/chuvaA-limpo`, de(0, 15)), acao: 9, mao: { 9: { ciano: [47.4, 53.2], verde: [118.6, 42.7], laranja: [188.4, 58.0] } } },
  cercoCV: { forma: 'A', tipo: 'clipe', arqs: seq(`${F}/cru/cerco-cv`, de(0, 9)), acao: 3, mao: { 3: { ciano: [34, 67], verde: [104, 65] } } },
  cercoVL: { forma: 'A', tipo: 'clipe', arqs: seq(`${F}/cru/cerco-vl`, de(0, 9)), acao: 3, mao: { 3: { verde: [111, 63], laranja: [167, 81] } } },
  cercoCL: { forma: 'A', tipo: 'clipe', arqs: seq(`${F}/cru/cerco-cl`, de(0, 9)), acao: 3, mao: { 3: { ciano: [36, 70], laranja: [170, 82] } } },
  raioFechada: { forma: 'A', tipo: 'raio', nome: 'fechada', arqs: seq(`${R}/fechada`, de(0, n(`${R}/fechada`) - 1)) },
  raioAberta: { forma: 'A', tipo: 'raio', nome: 'aberta', arqs: seq(`${R}/aberta`, de(0, n(`${R}/aberta`) - 1)) },
  raioAbre: { forma: 'A', tipo: 'raio', nome: 'abre', arqs: seq(`${R}/abre`, de(0, n(`${R}/abre`) - 1)) },
  raioRecupera: { forma: 'A', tipo: 'raio', nome: 'recupera', arqs: seq(`${R}/recupera`, de(0, n(`${R}/recupera`) - 1)) },
  ...Object.fromEntries(['abre', 'sopra', 'carga', 'bote', 'fecha', 'encolhe'].flatMap((c) => {
    const C = c[0].toUpperCase() + c.slice(1);
    return [
      [`gas${C}A`, { forma: 'A', tipo: 'gasA', nome: c, arqs: seq(`${G}/${c}`, de(0, n(`${G}/${c}`) - 1)) }],
      [`gas${C}B`, { forma: 'B', tipo: 'gasB', nome: c, arqs: seq(`${GB}/${c}`, de(0, n(`${GB}/${c}`) - 1)) }],
    ];
  })),
};

// ─── the frames ───
const lidos = new Map();
async function ler(arq) {
  if (!lidos.has(arq)) {
    const d = await sharp(arq).ensureAlpha().raw().toBuffer();
    lidos.set(arq, { d, hash: crypto.createHash('sha1').update(d).digest('hex') });
  }
  return lidos.get(arq);
}
const px = (d, x, y) => (x < 0 || y < 0 || x >= L || y >= L ? -1 : (y * L + x) * 4);
/** how many pixels differ (opacity, or colour where opaque) */
async function diferenca(a, b) {
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const oa = a[i + 3] >= 128, ob = b[i + 3] >= 128;
    if (oa !== ob || (oa && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]))) n++;
  }
  return n;
}

/**
 * THE VULNERABLE HEAD'S SKULL, read by eye on the 2× grid (02/11) at key frames, canvas px; between two key frames it
 * moves linearly, before the first and after the last it holds. Block matching failed on these gestures (the head
 * turns and its jaws open between two frames: no patch looks like the next; the rise had the same problem, and
 * `_erguer-instalar.mjs` read its heads by eye too). Read off a rigid mark of the head: the cyan's "ear" ring (the skull
 * is 11 px in front of it, as in the approved frame), the green's gills (the stripes behind its eye: the approved
 * frame's skull). The sets not listed hold the frame they start on (the cyan does not move in the orange's and the
 * green's shot clips, nor in the green + orange encirclement; the green holds the B pose while the orange charges and
 * recoils).
 */
const CRANIO = {
  tiroA: { 0: [53, 55], 2: [37, 65], 4: [38, 65], 7: [53, 55] },
  chuvaA: { 0: [53, 55], 4: [55, 76], 6: [51.5, 80], 7: [77, 63], 8: [80, 40], 9: [52, 38], 12: [62, 45], 15: [52, 55] },
  cercoCV: { 0: [53, 55], 1: [44, 57], 2: [33, 66], 5: [33, 66], 6: [37, 63], 7: [52, 55], 8: [51, 54], 9: [53, 55] },
  cercoCL: { 0: [53, 55], 1: [47.5, 59], 3: [33, 65.5], 5: [33, 65.5], 6: [37.5, 63.5], 7: [52, 56], 8: [52, 55], 9: [53, 55] },
  gasAbreB: { 0: [138, 43], 1: [138, 43], 2: [129, 37], 4: [118.5, 34], 8: [118, 33] },
  gasSopraB: { 0: [118, 33], 2: [114.5, 30.5], 4: [124, 24], 6: [116, 28], 8: [117, 32] },
  gasFechaB: { 0: [118, 33], 2: [114, 31], 4: [114, 31], 5: [123.5, 35.5], 6: [138, 43], 8: [138, 43] },
  // (02/11, the flinch redone — v9, both ends fixed: the green cringes back to the right, then settles; 9 frames)
  gasEncolheB: { 0: [118, 33], 1: [126.5, 37.5], 2: [142, 43], 3: [148, 43], 4: [148.5, 43], 5: [146, 43], 6: [144.5, 43], 7: [139.5, 43], 8: [138, 43] },
};
/** the key frames' value at frame i (linear between them, held outside) */
function interpola(chaves, i) {
  const ks = Object.keys(chaves).map(Number).sort((a, b) => a - b);
  if (i <= ks[0]) return { x: chaves[ks[0]][0], y: chaves[ks[0]][1] };
  for (let j = 1; j < ks.length; j++) if (i <= ks[j]) {
    const a = chaves[ks[j - 1]], b = chaves[ks[j]], u = (i - ks[j - 1]) / (ks[j] - ks[j - 1]);
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u };
  }
  const z = chaves[ks[ks.length - 1]];
  return { x: z[0], y: z[1] };
}

/** the centroid of the pixels passing `teste` inside the box [x0, y0, x1, y1) — a throat's or a muzzle's glow */
function brilho(d, teste, [x0, y0, x1, y1]) {
  let sx = 0, sy = 0, c = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * L + x) * 4;
    if (d[i + 3] >= 128 && teste(d[i], d[i + 1], d[i + 2])) { sx += x; sy += y; c++; }
  }
  return c ? { x: sx / c, y: sy / c, n: c } : null;
}
const GARGANTA = { verde: (r, g, b) => g > 170 && g > r + 60 && g > b + 30 };
// the muzzle's lens: pale and hot (its body stripes are a deeper orange, g ≤ ~165)
const CANO = (r, g, b) => r > 225 && g > 168 && b < 170;

// ─── the colour tests (the mock's `quadro`: `acende`, on the colour it grades r·0.91, g·0.99) and the regions ───
const LUZ = {
  ciano: (c) => c[2] > c[1] && c[1] > c[0] + 40 && c[2] > 150,
  verde: (c) => c[1] > 130 && c[1] > c[0] + 45 && c[1] > c[2] + 15,
  laranja: (c) => c[0] > 170 && c[0] > c[1] + 45 && c[1] > c[2] + 15,
};
/** each head's head-and-neck region, canvas px (the A's from the mock; the B's measured on its frames 02/11: the
 * green rises over the stump in its gas sets, the orange stays on the right) */
const REGIAO = {
  A: { ciano: (x, y) => x < 90 && y < 140, verde: (x, y) => x > 80 && x < 165 && y < 160, laranja: (x, y) => x > 135 && y < 150 },
  B: { verde: (x, y) => x > 45 && x < 168 && y < 165, laranja: (x, y) => x > 140 && y < 150 },
};
/** the B's orange lights are paler than the A's (218,156,118 against 224,144,96: r−g 44 on the graded colour, one under
 * the mock's 45), so its test is a notch looser; the stump's sparks share that colour but lie outside its region */
const LUZ_FORMA = { B: { laranja: (c) => c[0] > 150 && c[0] > c[1] + 40 && c[1] > c[2] + 15 } };
function mascaraLuz(d, w, h, forma, cor, ox = 0, oy = 0) {
  const out = Buffer.alloc(w * h * 4), teste = LUZ_FORMA[forma]?.[cor] ?? LUZ[cor];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 128 || !REGIAO[forma][cor](x + ox, y + oy)) continue;
    if (!teste([d[i] * 0.91, d[i + 1] * 0.99, d[i + 2]])) continue;
    out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 255;
  }
  return out;
}

// ─── the veins and the shadow (`_erguer-instalar.mjs` 50–108) ───
const MATIZ = {
  ciano: { h: [168, 206], s: 0.35, v: 0.45 },
  verde: { h: [88, 166], s: 0.3, v: 0.4 },
  laranja: { h: [8, 50], s: 0.45, v: 0.4, quente: { s: 0.1, v: 0.82 } },
};
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn;
  let hh = 0;
  if (dd) hh = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
  return [(hh * 60 + 360) % 360, mx ? dd / mx : 0, mx / 255];
};
const doMatiz = (r, g, b, m) => {
  const [hh, s, v] = hsv(r, g, b);
  return hh >= m.h[0] && hh <= m.h[1] && ((s >= m.s && v >= m.v) || (m.quente && s >= m.quente.s && v >= m.quente.v));
};
const RAIO = 40, CORTE = 20;
function veiasESombra(d, forma, cab) {
  const viva = VULNERAVEL[forma], outras = VIVAS[forma].filter((c) => c !== viva), corteY = CENTRO[forma].y + CORTE;
  const veias = Buffer.alloc(d.length), sombra = Buffer.alloc(d.length);
  for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
    const k = (y * L + x) * 4;
    if (d[k + 3] < 128 || y > corteY) continue;
    const [r, g, b] = [d[k], d[k + 1], d[k + 2]];
    if (Math.hypot(x - cab.x, y - cab.y) <= RAIO && doMatiz(r, g, b, MATIZ[viva])) {
      veias[k] = r; veias[k + 1] = g; veias[k + 2] = b; veias[k + 3] = 255;
      continue;
    }
    if (Math.hypot(x - cab.x, y - cab.y) > RAIO * 0.6 && outras.some((o) => doMatiz(r, g, b, MATIZ[o]))) {
      sombra[k] = Math.round(r * 0.45); sombra[k + 1] = Math.round(g * 0.45); sombra[k + 2] = Math.round(b * 0.45); sombra[k + 3] = 255;
    }
  }
  return { veias, sombra };
}

// ─── the points ───
const canvasDe = (forma, p) => ({ x: p[0] + CENTRO[forma].x, y: p[1] + CENTRO[forma].y });
const arte = (forma, p) => (p ? { x: +(p.x - CENTRO[forma].x).toFixed(1), y: +(p.y - CENTRO[forma].y).toFixed(1) } : null);
/** the points of a frame already measured, by its pixels (the approved frames and the poses the sets meet at) */
const porHash = new Map();
const PONTOS = { raio: JSON.parse(fs.readFileSync(`${R}/pontos.json`, 'utf8')), gas: JSON.parse(fs.readFileSync(`${G}/pontos.json`, 'utf8')) };
for (const forma of ['A', 'B']) {
  const { hash } = await ler(`public/sprites/serpente-erguer-${forma}-0.png`);
  const e = ERGUER[forma].inicio;
  porHash.set(hash, {
    bocas: Object.fromEntries(Object.entries(e.bocas).map(([c, par]) => [c, canvasDe(forma, par[0])])),
    cabecas: Object.fromEntries(Object.entries(e.cabecas).map(([c, par]) => [c, canvasDe(forma, par[0])])),
    olho: null,
  });
}
/** the B's glows on its approved frame: a mouth = the measured one + the glow's shift from there */
const apB = (await ler('public/sprites/serpente-erguer-B-0.png')).d;
const GLOW0 = {
  verde: brilho(apB, GARGANTA.verde, [30, 0, 172, 135]),
  laranja: brilho(apB, CANO, [140, 20, 256, 130]),
};

async function pontosDe(chave, f) {
  const quadros = [], hashes = [];
  for (const a of f.arqs) { const q = await ler(a); quadros.push(q.d); hashes.push(q.hash); }
  const N = quadros.length, forma = f.forma, P = [];
  if (f.tipo === 'raio') {
    const pt = PONTOS.raio[f.nome];
    for (let i = 0; i < N; i++) {
      const o = pt.olho[i], b = pt.boca?.[i];
      P.push({ bocas: { ciano: b ? { x: b[0], y: b[1] } : null }, olho: { x: o[0], y: o[1] }, cabecas: { ciano: { x: o[0] + 17, y: o[1] + 3.5 } } });
    }
    return { P, quadros, hashes, faixa: pt.faixa };
  }
  if (f.tipo === 'gasA') {
    const pt = PONTOS.gas[f.nome], p0 = PONTOS.gas.abre, c0 = ERGUER.A.inicio.cabecas.ciano[0];
    for (let i = 0; i < N; i++) {
      const bocas = {};
      for (const c of VIVAS.A) {
        let p = pt[c][i];
        for (let j = i; !p && j >= 0; j--) p = pt[c][j];
        bocas[c] = canvasDe('A', [BOCAS[c][0] + (p[0] - p0[c][0][0]), BOCAS[c][1] + (p[1] - p0[c][0][1])]);
      }
      const pc = pt.ciano[i] ?? pt.ciano[0];
      P.push({ bocas, olho: null, cabecas: { ciano: canvasDe('A', [c0[0] + (pc[0] - p0.ciano[0][0]), c0[1] + (pc[1] - p0.ciano[0][1])]) } });
    }
    return { P, quadros, hashes };
  }
  // the B's gas sets and the clips: skulls tracked, from the points of the frame each set starts on
  let inicio = porHash.get(hashes[0]);
  if (!inicio) {
    // (the round-2 clips start on the approved frame as it was then: the same pose, not the same bytes)
    const dif = await diferenca(quadros[0], (await ler(`public/sprites/serpente-erguer-${forma}-0.png`)).d);
    console.log(`  ${chave}: o 1º quadro não é byte a byte o aprovado (${dif} px diferentes) — parte dos pontos do aprovado`);
    if (dif > 400) throw new Error(`${chave}: its first frame is not the approved pose (${dif} px differ)`);
    inicio = porHash.get((await ler(`public/sprites/serpente-erguer-${forma}-0.png`)).hash);
  }
  // the vulnerable head's skull from the key frames (or held); the other heads hold the frame the set starts on. A
  // mouth moves with its head's skull; the B's mouths come from their glows; the action frame's are measured by hand
  const viva = VULNERAVEL[forma];
  for (let i = 0; i < N; i++) {
    const cabs = Object.fromEntries(VIVAS[forma].map((c) => [c, { ...inicio.cabecas[c] }]));
    if (CRANIO[chave]) cabs[viva] = interpola(CRANIO[chave], i);
    const bocas = {};
    for (const c of VIVAS[forma]) {
      const segueCab = { x: inicio.bocas[c].x + cabs[c].x - inicio.cabecas[c].x, y: inicio.bocas[c].y + cabs[c].y - inicio.cabecas[c].y };
      if (f.tipo === 'gasB') {
        // the green's glow is its THROAT only with the jaws open (> 400 px: 450–600 open, 190–334 shut, when its neck
        // stripes dominate it — even on the approved frame); shut, the mouth follows the skull as on the approved frame.
        // The orange's muzzle glows in every frame
        const gl = c === 'verde' ? brilho(quadros[i], GARGANTA.verde, [30, 0, 172, 135]) : brilho(quadros[i], CANO, [140, 20, 256, 130]);
        const ap = porHash.get((await ler('public/sprites/serpente-erguer-B-0.png')).hash), m0 = ap.bocas[c];
        const aberta = c === 'laranja' || (gl && gl.n > 400);
        bocas[c] = gl && GLOW0[c] && aberta ? { x: m0.x + gl.x - GLOW0[c].x, y: m0.y + gl.y - GLOW0[c].y }
          : { x: cabs[c].x + m0.x - ap.cabecas[c].x, y: cabs[c].y + m0.y - ap.cabecas[c].y };
      } else bocas[c] = segueCab;
    }
    const m = f.mao?.[i];
    if (m) for (const [c, p] of Object.entries(m)) bocas[c] = { x: p[0], y: p[1] };
    P.push({ bocas, olho: null, cabecas: cabs });
  }
  return { P, quadros, hashes };
}

// ─── the sheet of a set: 8 columns of 256² frames ───
async function folha(bufs, w, h, arq) {
  const linhas = Math.ceil(bufs.length / COLS);
  const comp = await Promise.all(bufs.map(async (b, i) => ({ input: await sharp(b, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer(), left: (i % COLS) * w, top: Math.floor(i / COLS) * h })));
  await sharp({ create: { width: COLS * w, height: linhas * h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp).png().toFile(arq);
}

// ─── the run ───
fs.mkdirSync(OUT, { recursive: true });
const CONJ = {};
const COR_PONTO = { ciano: [80, 200, 255], verde: [90, 255, 140], laranja: [255, 170, 60] };
for (const [chave, f] of Object.entries(FONTES)) {
  const { P, quadros, hashes, faixa } = await pontosDe(chave, f);
  const forma = f.forma, viva = VULNERAVEL[forma], N = quadros.length;
  // the meeting poses: this set's last frame (and every frame) can be where another set starts
  for (let i = 0; i < N; i++) if (!porHash.has(hashes[i]) && f.tipo !== 'raio' && f.tipo !== 'gasA') porHash.set(hashes[i], { bocas: P[i].bocas, cabecas: P[i].cabecas, olho: P[i].olho });
  const luzes = f.tipo === 'raio' ? ['ciano'] : f.tipo.startsWith('gas') ? ['verde', 'laranja'] : [];
  const veias = [], sombras = [], masc = Object.fromEntries(luzes.map((c) => [c, []]));
  for (let i = 0; i < N; i++) {
    const vs = veiasESombra(quadros[i], forma, P[i].cabecas[viva]);
    veias.push(vs.veias); sombras.push(vs.sombra);
    for (const c of luzes) masc[c].push(mascaraLuz(quadros[i], L, L, forma, c));
  }
  await folha(quadros, L, L, `${OUT}/${chave}.png`);
  await folha(veias, L, L, `${OUT}/${chave}-veias.png`);
  await folha(sombras, L, L, `${OUT}/${chave}-sombra.png`);
  for (const c of luzes) await folha(masc[c], L, L, `${OUT}/${chave}-luz-${c}.png`);
  CONJ[chave] = {
    forma,
    quadros: N,
    origem: { x: +(CENTRO[forma].x / L).toFixed(4), y: +(CENTRO[forma].y / L).toFixed(4) },
    bocas: Object.fromEntries(VIVAS[forma].map((c) => [c, P.map((p) => arte(forma, p.bocas[c]))])),
    ...(P.some((p) => p.olho) ? { olho: P.map((p) => arte(forma, p.olho)) } : {}),
    cranio: P.map((p) => arte(forma, p.cabecas[viva])),
    ...(faixa ? { faixa } : {}),
    ...(f.acao != null ? { acao: f.acao } : {}),
    luzes,
    sombra: true,
  };
  // the check sheet: the heads' band of each frame ×2
  const paineis = [];
  for (let i = 0; i < N; i++) {
    const d = quadros[i], o = Buffer.alloc(L * 170 * 4);
    for (let y = 0; y < 170; y++) for (let x = 0; x < L; x++) {
      const k = (y * L + x) * 4;
      let c = d[k + 3] >= 128 ? [d[k] * 0.4, d[k + 1] * 0.4, d[k + 2] * 0.4] : [16, 18, 26];
      if (sombras[i][k + 3]) c = [110, 110, 110];
      if (veias[i][k + 3]) c = [veias[i][k], veias[i][k + 1], veias[i][k + 2]];
      for (const cc of luzes) if (masc[cc][i][k + 3]) c = [255, 60, 220];
      o[k] = c[0]; o[k + 1] = c[1]; o[k + 2] = c[2]; o[k + 3] = 255;
    }
    const marca = (p, cor, r) => {
      if (!p) return;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = Math.round(p.x) + dx, y = Math.round(p.y) + dy;
        if (x < 0 || y < 0 || x >= L || y >= 170) continue;
        const k = (y * L + x) * 4;
        o[k] = cor[0]; o[k + 1] = cor[1]; o[k + 2] = cor[2];
      }
    };
    const anel = (p) => {
      for (let a = 0; a < 64; a++) { const x = Math.round(p.x + Math.cos(a / 10.2) * 6), y = Math.round(p.y + Math.sin(a / 10.2) * 6); if (x >= 0 && y >= 0 && x < L && y < 170) { const k = (y * L + x) * 4; o[k] = 255; o[k + 1] = 255; o[k + 2] = 0; } }
    };
    anel(P[i].cabecas[viva]);
    for (const [c, p] of Object.entries(P[i].bocas)) marca(p, COR_PONTO[c], f.mao?.[i]?.[c] ? 2 : 1);
    marca(P[i].olho, [255, 255, 255], 1);
    paineis.push(await sharp(o, { raw: { width: L, height: 170, channels: 4 } }).resize(L * 2, 340, { kernel: 'nearest' }).png().toBuffer());
  }
  const lin = Math.ceil(N / COLS);
  await sharp({ create: { width: COLS * 516, height: lin * 344, channels: 3, background: '#05060a' } })
    .composite(paineis.map((b, i) => ({ input: b, left: (i % COLS) * 516, top: Math.floor(i / COLS) * 344 }))).png().toFile(`${F}/conferencia-${chave}.png`);
  console.log(`${chave}: ${N} quadros, luzes ${luzes.join(',') || '—'}`);
}

// ─── the idles' light masks (at the idle's own frame size; the regions are the 256² canvas', so shifted) ───
const IDLE = {
  A: { arq: 'serpente-anim', anim: 'serpente-idle', w: 238, h: 246 },
  B: { arq: 'serpente-2c-anim', anim: 'serpente-2c-idle', w: 238, h: 243 },
};
for (const [forma, I] of Object.entries(IDLE)) {
  const ox = CENTRO[forma].x - I.w / 2, oy = CENTRO[forma].y - I.h / 2;
  const cores = forma === 'A' ? ['ciano', 'verde', 'laranja'] : ['verde', 'laranja'];
  for (const c of cores) {
    const masc = [];
    for (let i = 0; i < 9; i++) masc.push(mascaraLuz(await sharp(`public/sprites/${I.arq}-${i}.png`).ensureAlpha().raw().toBuffer(), I.w, I.h, forma, c, ox, oy));
    await folha(masc, I.w, I.h, `${OUT}/idle${forma}-luz-${c}.png`);
  }
}
const IDLE_HAB = {
  A: {
    anim: IDLE.A.anim,
    bocas: Object.fromEntries(Object.entries(BOCAS).map(([c, p]) => [c, { x: p[0], y: p[1] }])),
    desvio: Object.fromEntries(Object.entries(BOCA_IDLE).map(([c, l]) => [c, l.map(([x, y]) => ({ x, y }))])),
    luzes: ['ciano', 'verde', 'laranja'],
    quadro: { w: IDLE.A.w, h: IDLE.A.h },
  },
  B: {
    anim: IDLE.B.anim,
    bocas: Object.fromEntries(Object.entries(ERGUER.B.inicio.bocas).map(([c, par]) => [c, { x: par[0][0], y: par[0][1] }])),
    desvio: Object.fromEntries(VIVAS.B.map((c) => [c, Array.from({ length: 9 }, () => ({ x: 0, y: 0 }))])),
    luzes: ['verde', 'laranja'],
    quadro: { w: IDLE.B.w, h: IDLE.B.h },
  },
};

// ─── gestosHab.ts ───
const ts = `/**
 * THE SKILLS' SETS (02/11 — generated by \`scripts/_serpente/_hab-instalar.mjs\`, do not edit by hand). One sheet per set
 * in \`public/sprites/serpente-hab/\` (8 columns of 256² frames; \`serpenteHab_<chave>\`), with its veins, shadow and light
 * masks. Per frame, in ART px from the art's centre (like \`ERGUER\`): the living heads' mouths, the cyan's eye (the beam's
 * sets), the vulnerable head's skull (the hit circle and the veins follow it).
 */
import type { Cor, Ponto } from './tipos';

export type ChaveConjunto = ${Object.keys(CONJ).map((k) => `'${k}'`).join(' | ')};

export interface ConjuntoHab {
  forma: 'A' | 'B';
  quadros: number;
  /** the art's centre in the 256² frame, as a fraction (the sprite's origin while the set plays) */
  origem: Ponto;
  /** art px from the art's centre, per frame (null: that frame has none — the jaws shut) */
  bocas: Partial<Record<Cor, (Ponto | null)[]>>;
  olho?: (Ponto | null)[];
  /** the VULNERABLE head's skull per frame (the hit circle and the veins follow it) */
  cranio: Ponto[];
  /** the beam sets: which frames are raised / middle / lowered */
  faixa?: { cima: number; meio: number; baixo: number };
  /** the clips' action frame (the shot or the salvo leaves there) */
  acao?: number;
  /** which heads' light masks this set has (\`serpenteHabLuz_<cor>_<chave>\`) */
  luzes: Cor[];
  /** the other living heads' shadow sheet exists (\`serpenteHabSombra_<chave>\`) */
  sombra: boolean;
}

export const CONJUNTOS: Record<ChaveConjunto, ConjuntoHab> = ${JSON.stringify(CONJ, null, 2)};

/** the idle per form: its mouths (art px, the frame-0 ones) and their per-frame shift (the A's measured; the B's zero) */
export const IDLE_HAB: Record<'A' | 'B', { anim: string; bocas: Partial<Record<Cor, Ponto>>; desvio: Partial<Record<Cor, Ponto[]>>; luzes: Cor[]; quadro: { w: number; h: number } }> = ${JSON.stringify(IDLE_HAB, null, 2)};
`;
fs.writeFileSync('src/entities/serpente/gestosHab.ts', ts);

// ─── projeteisHab.ts ───
async function projeteis(dir) {
  const meta = JSON.parse(fs.readFileSync(`${dir}/meta.json`, 'utf8'));
  const o = {};
  for (const c of ['ciano', 'verde', 'laranja']) {
    const quadros = [];
    for (let i = 0; i < meta.quadros[c]; i++) {
      const { data, info } = await sharp(`${dir}/${c}-${i}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      quadros.push({ w: info.width, h: info.height, px: [...data] });
    }
    o[c] = { fps: meta.fps[c], rastro: meta.rastro?.[c] ?? null, quadros };
  }
  return o;
}
const tiros = await projeteis(`${M}/projeteis/tiro-B`), casulos = await projeteis(`${M}/projeteis/missil-B`);
for (const c of Object.keys(casulos)) delete casulos[c].rastro;
const linhaPx = (o) => JSON.stringify(o).replace(/"px":\[/g, '\n      "px":[');
fs.writeFileSync('src/entities/serpente/projeteisHab.ts', `/**
 * THE PROJECTILES' PIXELS (02/11 — generated by \`scripts/_serpente/_hab-instalar.mjs\` from the 14th round's chosen
 * concepts, do not edit by hand): the normal shots B (the cyan's needle, the green's venom, the orange's ember) and the
 * rain's cocoon, RGBA rows authored pointing right. The pixel layer draws them turned to their flight (\`projetil.ts\`).
 */
import type { Cor } from './tipos';

export interface SpriteRGBA {
  w: number;
  h: number;
  px: readonly number[];
}

export const TIROS: Record<Cor, { fps: number; rastro: 'pinga' | 'fumaca' | null; quadros: SpriteRGBA[] }> = ${linhaPx(tiros)};

export const CASULOS: Record<Cor, { fps: number; quadros: SpriteRGBA[] }> = ${linhaPx(casulos)};
`);
console.log('gestosHab.ts, projeteisHab.ts escritos;', Object.keys(CONJ).length, 'conjuntos');
