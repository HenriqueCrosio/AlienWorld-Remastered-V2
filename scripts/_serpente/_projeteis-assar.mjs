// 02/11 — THE THREE-HEAD SERPENT'S PROJECTILES, PIXEL-DRAWN (round 14; his "pode seguir para os projéteis"). The normal
// shots and the rain's missiles were still placeholders in the mock (a 3 px dot, a 7×2 strip). Pieces this small are
// drawn by hand, not generated (the PixelLab fills its 16² minimum and reads too big next to the ship): each sprite is
// a text grid, authored pointing RIGHT (the game turns it with `setRotation`) and symmetric top to bottom (a heading to
// the left turns it upside down). The palette per head is the game's own drop (`BootScene.makeShotsChefes`): a
// near-black rim and a near-white core, so a shot never depends on its colour to be seen — not even over her body, the
// worst background there is. The cyan head shoots a DEEP blue (~230°): the art's cyan is the player's own shot colour.
//   node scripts/_serpente/_projeteis-assar.mjs <out-dir>
// Out: <out>/<conceito>/<cor>-<i>.png + meta.json (fps, the trail it leaves), and <out>/vitrine-{tiro,missil}.png (×10).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT = process.argv[2];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

// the drop's palette per head (BootScene: borda, meio, corpo, cauda, nucleo)
const BASE = {
  ciano: { k: '#070a1c', d: '#2a3c9c', c: '#5878ff', t: '#4660d0', n: '#e8ecff' },
  verde: { k: '#07120c', d: '#2f7a52', c: '#60f088', t: '#50b080', n: '#e8fff0' },
  laranja: { k: '#160c04', d: '#8a4a14', c: '#ffa040', t: '#d08030', n: '#fff2dc' },
};
// her plates (sampled from the approved frame): the missiles' bodies are HER armour, so they read as hers and not as
// the hull's launcher (gunmetal, cold flame) or the Leviathan's (bone, amber flame)
const PLACA = { o: '#090a0d', p: '#252a35', q: '#3b4351', r: '#66747a', s: '#88a4b1', m: '#46505e' };
function paleta(cor, extra = {}) {
  const b = Object.fromEntries(Object.entries({ ...BASE[cor], ...extra }).map(([k, v]) => [k, hex(v)]));
  const P = {
    k: [b.k, 1], d: [b.d, 1], c: [b.c, 1], t: [b.t, 0.85], u: [b.t, 0.45], n: [b.n, 1], w: [[255, 255, 255], 1],
    l: [mix(b.c, b.n, 0.5), 1], g: [b.c, 0.3], h: [b.c, 0.55], v: [b.d, 0.75], y: [[106, 98, 94], 0.55],
  };
  for (const [k, v] of Object.entries(PLACA)) P[k] = [hex(v), 1];
  return P;
}
// the orange's ember runs hotter than its drop: a red rim, red-orange, orange, yellow, white
const BRASA = { k: '#1c0904', d: '#a8380c', c: '#ff8a2c', t: '#c85a1c', n: '#fff4d0' };

// ─── a procedural blob (the venom, the ember, the orb): an ellipse in pixel centres, a 1 px near-black rim, then the
// colour rings by distance from a core pushed toward the front ───
function blob(W, H, cx, cy, rx, ry, { frente = 1, nucleo = 0.34, luz = 0.62, cor = 0.86, branco = true, rxTras = rx } = {}) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  // (`rxTras`: a longer back than front — an egg, the ember's shape)
  const dentro = (x, y) => ((x + 0.5 - cx) / (x + 0.5 < cx ? rxTras : rx)) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!dentro(x, y)) continue;
    if (!dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1)) { g[y][x] = 'k'; continue; }
    const d = Math.hypot((x + 0.5 - cx - frente) / rx, (y + 0.5 - cy) / ry);
    g[y][x] = d < nucleo ? 'n' : d < luz ? 'l' : d < cor ? 'c' : 'd';
  }
  if (branco) { // one white pixel (two, on an even height) in the core's centre
    const x = Math.floor(cx + frente), y0 = Math.floor(cy - 0.01), y1 = Math.ceil(cy - 0.99);
    for (const y of new Set([y0, y1])) if (g[y]?.[x] === 'n') g[y][x] = 'w';
  }
  return g;
}
const txt = (g) => g.map((r) => r.join(''));
const poe = (g, x, y, ch) => { if (g[y] && x >= 0 && x < g[y].length && g[y][x] === '.') g[y][x] = ch; };

// ─── THE NORMAL SHOTS ───
const TIROS = {};

// A — today's drop, baked into pixels (the game draws it with vector ellipses): the same 13×9, the tail flickering
TIROS.A = {
  nome: 'A gota de hoje', fps: 8,
  quadros: () => [
    ['......kkkk...', '....kkddddkk.', '...kdccccccdk', '.tkdcclnnlcdk', 'tttcclnwwnlck', '.tkdcclnnlcdk', '...kdccccccdk', '....kkddddkk.', '......kkkk...'],
    ['......kkkk...', '....kkddddkk.', '...kdccccccdk', '..kdcclnnlcdk', 'uttcclnnwnlck', '..kdcclnnlcdk', '...kdccccccdk', '....kkddddkk.', '......kkkk...'],
  ],
};

// B — one weapon per head, each the echo of its skill: the cyan's electric bolt (its beam), the green's venom glob (its
// gas: it wobbles and drips), the orange's ember (its spark: smoke and sparks behind)
const AGULHA = [
  ['......h......', '....kkckkk...', '..kkddcccllk.', 'uudcllnnnwwwn', '..kkddcccllk.', '....kkkkkk...', '.............'],
  ['.............', '....kkkkkk...', '..kkddcccllk.', 'uudcllnnnwwwn', '..kkddcccllk.', '....kkkckk...', '........h....'],
  ['.........h...', '....kkkkkc...', '..kkddcccllk.', 'uudcllnnwwwwn', '..kkddcccllk.', '...ckkkkkk...', '..h..........'],
];
function veneno() {
  // the glob squashes and stretches (the jelly's language, small), and its thread thins, snaps and grows back
  const forma = [[4.1, 4.1], [4.6, 3.6], [4.1, 4.1], [3.7, 4.5]];
  const fio = [['v', 'v', 'u'], ['v', 'u', '.', 'u'], ['.', 'u', '.', '.'], ['v', 'u']];
  return forma.map(([rx, ry], i) => {
    const g = blob(13, 9, 8.2, 4.5, rx, ry, { frente: 0.9 });
    const x0 = g[4].indexOf('k');
    if (x0 > 0) g[4][x0] = 'd'; // the thread leaves the glob's back without a rim
    fio[i].forEach((ch, j) => { if (ch !== '.') poe(g, x0 - 1 - j, 4, ch); });
    return txt(g);
  });
}
function brasa() {
  const a = blob(13, 7, 8.6, 3.5, 3.4, 3.2, { rxTras: 6.2, frente: 1.0, nucleo: 0.32, luz: 0.56, cor: 0.8 });
  const b = blob(13, 7, 8.6, 3.5, 3.4, 3.2, { rxTras: 6.2, frente: 1.0, nucleo: 0.38, luz: 0.62, cor: 0.84 });
  for (const g of [a, b]) { const x0 = g[3].indexOf('k'); if (x0 > 0) g[3][x0] = 'd'; }
  poe(a, a[3].indexOf('d') - 1, 3, 't'); poe(a, a[3].indexOf('d') - 2, 3, 'u');
  poe(b, b[3].indexOf('d') - 1, 3, 'u');
  return [txt(a), txt(b)];
}
TIROS.B = {
  nome: 'Uma arma por cabeça', porCor: true,
  quadros: (cor) => (cor === 'ciano' ? AGULHA : cor === 'verde' ? veneno() : brasa()),
  fps: { ciano: 15, verde: 10, laranja: 12 },
  rastro: { verde: 'pinga', laranja: 'fumaca' },
  paleta: { laranja: BRASA },
};

// C — the classic shmup orb: round (so it never turns ragged when it rotates), its halo breathing
function orbe() {
  const q = [];
  for (const halo of [0, 1]) {
    const g = blob(11, 11, 5.5, 5.5, 4.45, 4.45, { frente: 0, nucleo: 0.36, luz: 0.6, cor: 0.86 });
    if (halo) for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
      const d = Math.hypot(x + 0.5 - 5.5, y + 0.5 - 5.5);
      if (g[y][x] === '.' && d <= 5.3) g[y][x] = 'g';
    }
    q.push(txt(g));
  }
  return [q[0], q[1]];
}
TIROS.C = { nome: 'Orbe pulsante', fps: 8, quadros: orbe };

// D — the thin tracer ("menores e mais finos como um '-'", his note on the drones' shots): 5 rows, a white line
TIROS.D = {
  nome: 'Traçante fino', fps: 12,
  quadros: () => [
    ['.....kkkkkk..', '...kkddcccllk', 'uutdcclnnwwwn', '...kkddcccllk', '.....kkkkkk..'],
    ['.....kkkkkk..', '...kkddcccllk', 'u.tdcclnnnwwn', '...kkddcccllk', '.....kkkkkk..'],
  ],
};

// ─── THE MISSILES (pointing right; the flame is drawn by the mock at the tail, in the head's colour) ───
const MISSEIS = {};
// A — a spine of her armour with a glowing channel to a lit stinger (organic)
MISSEIS.A = {
  nome: 'Ferrão', fps: 6, cauda: 0,
  quadros: () => [
    ['.oooo.......', 'opqpqrrsoo..', 'odcccllllnww', 'opqpqrrsoo..', '.oooo.......'],
    ['.oooo.......', 'opqpqrrsoo..', 'odccclllnnww', 'opqpqrrsoo..', '.oooo.......'],
  ],
};
// B — a seed pod whose seam glows, split along its length (organic, rounder)
MISSEIS.B = {
  nome: 'Casulo', fps: 6, cauda: 0,
  quadros: () => [
    ['...ooooo...', '.oopqqrrso.', 'oopdccllsro', 'mpqclnnwlso', 'oopdccllsro', '.oopqqrrso.', '...ooooo...'],
    ['...ooooo...', '.oopqqrrso.', 'oopdcclllro', 'mpqclnwwlso', 'oopdcclllro', '.oopqqrrso.', '...ooooo...'],
  ],
};
// C — a small torpedo in her plate colours, a lit band and nose (mechanical, the orange head's family)
MISSEIS.C = {
  nome: 'Torpedo', fps: 6, cauda: 0,
  quadros: () => [
    ['.oooooooooo.', 'omqqrrrrqcdo', 'omssssssqcnw', 'omqqrrrrqcdo', '.oooooooooo.'],
    ['.oooooooooo.', 'omqqrrrrqclo', 'omssssssqlnw', 'omqqrrrrqclo', '.oooooooooo.'],
  ],
};

// C, short: the same torpedo, 9 px instead of 12 (he tends to want it smaller than the first guess)
MISSEIS.Ccurto = {
  nome: 'Torpedo curto', fps: 6, cauda: 0,
  quadros: () => [
    ['.ooooooo.', 'omqqrqcdo', 'omsssqcnw', 'omqqrqcdo', '.ooooooo.'],
    ['.ooooooo.', 'omqqrqclo', 'omsssqlnw', 'omqqrqclo', '.ooooooo.'],
  ],
};

// ─── bake ───
const CORES = ['ciano', 'verde', 'laranja'];
async function png(grade, P, arq) {
  const H = grade.length, W = Math.max(...grade.map((r) => r.length));
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = grade[y][x] ?? '.';
    if (ch === '.') continue;
    if (!P[ch]) throw new Error(`${arq}: unknown pixel '${ch}'`);
    const [c, a] = P[ch], i = (y * W + x) * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = Math.round(a * 255);
  }
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(arq);
  return { W, H, buf };
}
const vitrine = [];
for (const [grupo, lista] of [['tiro', TIROS], ['missil', MISSEIS]]) for (const [id, def] of Object.entries(lista)) {
  const dir = path.join(OUT, `${grupo}-${id}`);
  fs.mkdirSync(dir, { recursive: true });
  const meta = { nome: def.nome, quadros: {}, fps: {}, rastro: def.rastro ?? {}, cauda: def.cauda ?? 0 };
  for (const cor of CORES) {
    const P = paleta(cor, def.paleta?.[cor]);
    const qs = def.quadros(cor);
    meta.quadros[cor] = qs.length;
    meta.fps[cor] = typeof def.fps === 'object' ? def.fps[cor] : def.fps;
    for (let i = 0; i < qs.length; i++) {
      const r = await png(qs[i], P, path.join(dir, `${cor}-${i}.png`));
      vitrine.push({ grupo, id, cor, i, ...r });
    }
  }
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
}

// the showcases (one for the shots, one for the missiles): every sprite ×10 on her darkest plate colour, a row per
// concept and head
const Z = 10, PAD = 6;
for (const grupo of ['tiro', 'missil']) {
const linhas = [];
for (const v of vitrine.filter((x) => x.grupo === grupo)) {
  const chave = `${v.grupo}-${v.id}-${v.cor}`;
  let l = linhas.find((x) => x.chave === chave);
  if (!l) linhas.push((l = { chave, itens: [] }));
  l.itens.push(v);
}
const celW = 13 * Z + PAD, celH = 11 * Z + PAD, LW = 140;
const larg = LW + Math.max(...linhas.map((l) => l.itens.length)) * celW, alt = linhas.length * celH;
const comp = [];
for (let j = 0; j < linhas.length; j++) {
  const l = linhas[j];
  const svg = `<svg width="${LW}" height="${celH}" xmlns="http://www.w3.org/2000/svg"><text x="6" y="${celH / 2 + 5}" font-size="15" fill="#d9dde6" font-family="monospace">${l.chave}</text></svg>`;
  comp.push({ input: Buffer.from(svg), left: 0, top: j * celH });
  for (let i = 0; i < l.itens.length; i++) {
    const v = l.itens[i];
    const img = await sharp(v.buf, { raw: { width: v.W, height: v.H, channels: 4 } }).resize(v.W * Z, v.H * Z, { kernel: 'nearest' }).png().toBuffer();
    comp.push({ input: img, left: LW + i * celW + Math.round((13 - v.W) * Z / 2), top: j * celH + Math.round((11 - v.H) * Z / 2) });
  }
}
await sharp({ create: { width: larg, height: alt, channels: 4, background: '#252434' } }).composite(comp).png().toFile(path.join(OUT, `vitrine-${grupo}.png`));
}
console.log(vitrine.length, 'sprites →', OUT);
