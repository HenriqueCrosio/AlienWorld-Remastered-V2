// 14/10 — HAND-DRAWN CANDIDATES for the pupa and the spore (he: "as pupas precisam parecer pupas e os esporos,
// esporos. Faça exemplos à mão e gerados"). Drawn at the REAL in-game size; each one has its frames (dark, lit).
// The generated siblings come from `_gerar-f4.mjs pupa|pupaCasulo|esporo|esporoNuvem`; the sheet is `_folha-f4b.mjs`.
import sharp from 'sharp';

/** Like `_mao-f4.mjs`'s `pixel`, but a colour may carry its own alpha (the spore haze). */
const pixel = (linhas, cores) => {
  const w = Math.max(...linhas.map((l) => l.length)), h = linhas.length, buf = Buffer.alloc(w * h * 4);
  linhas.forEach((l, y) => [...l].forEach((c, x) => {
    const cor = cores[c];
    if (cor) buf.set([cor[0], cor[1], cor[2], cor[3] ?? 255], (y * w + x) * 4);
  }));
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
};

// The elites' reds (`_mao-f4.mjs` CORES) + a gunmetal husk (the Larva's plates).
const R = { k: [20, 8, 12], d: [92, 22, 30], r: [168, 36, 44], o: [236, 72, 56], y: [255, 168, 96] };
const CASCA = { ...R, g: [38, 33, 40], G: [62, 56, 62], h: [92, 84, 88], f: [196, 180, 160, 150] };
/** Two frames from one drawing: `apaga` maps lit letters to dark ones (the seams go out). */
const duas = (linhas, cores, apaga) => Promise.all([
  pixel(linhas.map((l) => [...l].map((c) => apaga[c] ?? c).join('')), cores),
  pixel(linhas, cores),
]);

export const PUPAS = {
  // P1 — the moth chrysalis: tapered capsule, stacked ring segments, the red glowing in the SEAMS.
  'P1 crisálida em anéis': () => duas([
    '...k...',
    '..kGk..',
    '.kGhGk.',
    '.kroGk.',
    'kGhGGgk',
    'korrrok',
    'kGhGGgk',
    '.kroork',
    '.kGhGk.',
    '..kGk..',
    '..kgk..',
    '...k...',
  ], CASCA, { o: 'd', r: 'd', y: 'r' }),
  // P2 — the butterfly chrysalis: bent, a head bump on top, the WING CASE seam running down the belly.
  'P2 crisálida curva': () => duas([
    '..kk....',
    '.kGhk...',
    '.kGGk...',
    'kGhGGk..',
    'kGorGgk.',
    'kGhoGGk.',
    '.kGhrGgk',
    '.kGGhoGk',
    '..kGGrgk',
    '..kGGgk.',
    '...kgk..',
    '....k...',
  ], CASCA, { o: 'd', r: 'd' }),
  // P3 — the membrane pod: dark-red translucent skin, the curled larva visible INSIDE, lighting up as it ripens.
  'P3 bolsa com a larva dentro': () => duas([
    '..kkk..',
    '.kdrdk.',
    'kdrkkdk',
    'kdkoykk',
    'kdkyoyk',
    'kdrkoyk',
    'kdrrkdk',
    'kddrrdk',
    '.kdddk.',
    '..kkk..',
  ], R, { y: 'r', o: 'd' }),
  // P4 — P1 with the strand it was laid on: a thin pale thread trailing behind (it came out of the Larva).
  'P4 crisálida no fio': () => duas([
    '...k.....',
    '..kGk....',
    '.kGhGk...',
    '.kroGk...',
    'kGhGGgk..',
    'korrrok..',
    'kGhGGgk..',
    '.kroork..',
    '.kGhGk...',
    '..kGk....',
    '...kf....',
    '....f....',
    '.....f...',
    '......ff.',
  ], CASCA, { o: 'd', r: 'd' }),
};

// The SPORE: NOT the red of a shot (red = damage). Sickly pale yellow-green, a glow from inside, soft edges.
const VERDE = { s: [40, 54, 26], S: [98, 124, 46], L: [170, 198, 84], C: [232, 244, 160], a: [170, 198, 84, 70], b: [98, 124, 46, 110] };
const LILAS = { s: [40, 26, 54], S: [104, 66, 132], L: [176, 132, 210], C: [238, 214, 250], a: [176, 132, 210, 70], b: [104, 66, 132, 110] };
const CINZA = { s: [36, 44, 48], S: [92, 112, 116], L: [160, 188, 186], C: [226, 242, 236], a: [160, 188, 186, 70], b: [92, 112, 116, 110] };
export const CORES_ESPORO = { verde: VERDE, lilas: LILAS, cinza: CINZA };

/** Each spore: the same grain twinkling (frame 0 dim, frame 1 lit). */
const brilha = (linhas, cores) => duas(linhas, cores, { C: 'L' });
export const ESPOROS = {
  // E1 — the pollen grain: a ball with short spines all around.
  'E1 grão espinhoso': (c) => brilha([
    '.s.s.s.',
    's.SSS.s',
    '.SLLLS.',
    'sSLCLSs',
    '.SLLLS.',
    's.SSS.s',
    '.s.s.s.',
  ], c),
  // E2 — the puff: four grains of different sizes in a faint haze.
  'E2 tufo de grãos': (c) => brilha([
    '..a.aa...',
    '.aSLa.a..',
    'aSCLSa.a.',
    '.SLSab.a.',
    'a.a.bSSa.',
    '.a..SCLSa',
    '..a.aSLa.',
    '...a.aa..',
  ], c),
  // E3 — the cloud: a dithered haze with three grains floating in it (it reads as "something in the air").
  'E3 nuvem pontilhada': (c) => brilha([
    '...a.a.a...',
    '..a.b.b.a..',
    '.a.bSb.b.a.',
    'a.bSCSb.b.a',
    '.a.bSb.bSa.',
    'a.b.b.bLCa.',
    '.a.bSb.bSa.',
    'a.bSLSb.b.a',
    '.a.bSb.b.a.',
    '..a.b.b.a..',
    '...a.a.a...',
  ], c),
  // E4 — the seed: a soft round grain with a halo ring, tiny (the shot family's size, but round and haloed).
  'E4 semente com halo': (c) => brilha([
    '..aaa..',
    '.a.S.a.',
    'a.SLS.a',
    'aSLCLSa',
    'a.SLS.a',
    '.a.S.a.',
    '..aaa..',
  ], c),
};

/** A generated piece brought down to `alto` px: trimmed, reduced (lanczos), alpha snapped to 0/255. Returns a PNG buffer. */
export async function reduzir(arq, alto) {
  const t = await sharp(arq).trim().png().toBuffer();
  const { data, info } = await sharp(t).resize({ height: alto, kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 110 ? 255 : 0;
  return sharp(data, { raw: info }).png().toBuffer();
}

/** A spore GRAIN clinging to the slowed ship (§9.3), 3×3, in the spore green. */
export const graoDeEsporo = () => pixel(['.S.', 'SCS', '.S.'], VERDE);

/** Deterministic PRNG (mulberry32), so the feet come out the same on every install. */
const prng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const PE = { W: 52, H: 11, SUP: 3 };
/**
 * THE TUBE'S ROOT FOOT (§9.4): W×H, the wall's surface line at row SUP. A fleshy collar over the Tube's flat base
 * (rows 0..SUP), and six roots spreading sideways and DOWN into the border, fading from the Tube's crimson into the
 * border's own darks (sampled from the top rows of the plate `faixaPng`) — it reads as grown there, not set down.
 * Drawn for the FLOOR; the game flips it on the ceiling.
 */
export async function peDoTubo(faixaPng, seed) {
  const { data, info } = await sharp(faixaPng).extract({ left: 0, top: 0, width: 128, height: 8 }).raw().toBuffer({ resolveWithObject: true });
  const tons = [];
  for (let i = 0; i < data.length; i += info.channels) if (info.channels < 4 || data[i + 3] > 200) tons.push([data[i], data[i + 1], data[i + 2]]);
  const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  tons.sort((a, b) => lum(a) - lum(b));
  const pct = (p) => tons[Math.min(tons.length - 1, Math.floor(p * tons.length))];
  const C = { k: [20, 8, 12], d: [92, 22, 30], r: [140, 30, 40], b: pct(0.12), m: pct(0.45) };
  const { W, H, SUP } = PE;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const pinta = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  // The collar: covers the straight base line of the Tube (it is 22–24px wide at the foot).
  for (let y = 0; y <= SUP; y++) for (let x = 14 - y; x <= 37 + y; x++) pinta(x, y, y === 0 ? 'k' : y < SUP ? 'd' : 'r');
  const sorte = prng(seed);
  for (let i = 0; i < 6; i++) {
    const lado = i % 2 ? 1 : -1;
    let x = 26 + lado * (6 + Math.floor(sorte() * 8)), y = SUP;
    // Steep enough to read as DIGGING IN (not lying on top), and crimson for most of the way before the border's tones.
    const passos = 8 + Math.floor(sorte() * 9), cai = 0.5 + sorte() * 0.45;
    for (let p = 0; p < passos; p++) {
      const fundo = p / passos > 0.65;
      pinta(Math.round(x), Math.round(y), fundo ? 'm' : 'r');
      if (p < passos * 0.4) pinta(Math.round(x), Math.round(y) + 1, fundo ? 'b' : 'd');
      pinta(Math.round(x), Math.round(y) + (p < passos * 0.4 ? 2 : 1), 'b');
      x += lado;
      y = Math.min(H - 2, y + cai);
    }
  }
  return pixel(g.map((l) => l.join('')), C);
}
