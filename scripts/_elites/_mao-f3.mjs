// FRENTE B · FATIA F3 — the HAND-DRAWN versions (spec 2026-10-06-frente-b-fatia-f3-design.md §5: "duas criações, na
// mão e no PixelLab"). Pixel by pixel on a grid: shapes are rasterized with hard edges (no anti-aliasing), then an
// outline pass, banded shading (light from the top-left) and the energy lights placed by hand. The palette is his
// concepts': violet-black chitin, light ONLY on the red energy points (dark sci-fi).
//   node scripts/_elites/_mao-f3.mjs   → folhas/2026-10-06/elites/mao/
import fs from 'node:fs';
import sharp from 'sharp';

const OUT = 'docs/superpowers/folhas/2026-10-06/elites/mao';
fs.mkdirSync(OUT, { recursive: true });

const P = {
  K: '0a0610', // outline
  a: '1a0f1f', // shadow
  b: '281a2f', // body
  c: '3a2944', // lit
  e: '57426a', // rim light
  m: '4a0c16', // dark red (dormant vein)
  r: '9a1626', // red
  R: 'e2303c', // bright red
  h: 'ff8f86', // hot
  w: 'ffe2da', // core
};

class Tela {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Array.from({ length: h }, () => Array(w).fill(null));
  }
  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y][x] = c;
  }
  get(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y][x] : null;
  }
  /** Fills every pixel whose centre passes `dentro(x, y)`. */
  encher(dentro, c) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (dentro(x + 0.5, y + 0.5)) this.px[y][x] = c;
  }
  /** Banded shading on the body colour `b`: the top-left edge goes lit (c/e), the bottom edge goes shadow (a). */
  sombrear() {
    const corpo = new Set(['a', 'b', 'c', 'e']);
    const src = this.px.map((l) => [...l]);
    const vazio = (x, y) => !(src[y]?.[x] && src[y][x] !== 'K');
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (src[y][x] !== 'b') continue;
        if (vazio(x, y - 1) || vazio(x - 1, y)) this.px[y][x] = vazio(x, y - 1) && vazio(x - 1, y) ? 'e' : 'c';
        else if (vazio(x, y + 1) || vazio(x + 1, y + 1)) this.px[y][x] = 'a';
      }
    void corpo;
  }
  /** The dark outline: every empty pixel touching the shape (4-neighbourhood). */
  contornar() {
    const src = this.px.map((l) => [...l]);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (src[y][x]) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => src[y + dy]?.[x + dx] && src[y + dy][x + dx] !== 'K'))
          this.px[y][x] = 'K';
      }
  }
  async png(arq, escala = 1) {
    const buf = Buffer.alloc(this.w * this.h * 4);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.px[y][x];
        if (!c) continue;
        const hex = P[c] ?? c;
        const k = (y * this.w + x) * 4;
        buf[k] = parseInt(hex.slice(0, 2), 16);
        buf[k + 1] = parseInt(hex.slice(2, 4), 16);
        buf[k + 2] = parseInt(hex.slice(4, 6), 16);
        buf[k + 3] = 255;
      }
    let s = sharp(buf, { raw: { width: this.w, height: this.h, channels: 4 } });
    if (escala > 1) s = s.resize(this.w * escala, this.h * escala, { kernel: 'nearest' });
    await s.png().toFile(arq);
  }
}

// A thick arc (an annular sector) whose width tapers from `w0` to `w1` along it.
const arco = (cx, cy, r, a0, a1, w0, w1) => (x, y) => {
  const d = Math.hypot(x - cx, y - cy);
  let a = Math.atan2(y - cy, x - cx);
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  while (a < lo) a += Math.PI * 2;
  if (a > hi) return false;
  const t = (a - a0) / (a1 - a0);
  const w = w0 + (w1 - w0) * t;
  return Math.abs(d - r) <= w / 2;
};

/** A quadratic Bézier stroke p0 → p2 (control p1), width tapering w0 → w1: returns `dentro` and the spine points. */
const bezier = (p0, p1, p2, w0, w1) => {
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    pts.push([x, y, w0 + (w1 - w0) * t]);
  }
  return { pts, dentro: (x, y) => pts.some(([px, py, w]) => Math.hypot(x - px, y - py) <= w / 2) };
};

// ── THE VOID HUNTER (~34×18, facing LEFT) ── a flat spindle body (the arrowhead nose at the left) and two crescent
// blades rooted at its middle and SWEEPING BACK like a scythe or swept wings (the concept), the tips hooking down/up.
// Variant A: long blades, wide sweep. Variant B: shorter blades held closer to the body (a slimmer dart).
async function cacador(variante) {
  const t = new Tela(38, 26);
  const cy = 13;
  // The spindle: thick in the middle, a needle nose at the left, a short tail at the right.
  t.encher((x, y) => {
    if (x < 2 || x > 30) return false;
    const u = (x - 2) / 28; // 0 at the nose, 1 at the tail
    const meia = u < 0.45 ? 0.4 + 2.6 * (u / 0.45) : 3 - 2.2 * ((u - 0.45) / 0.55);
    return Math.abs(y - cy) <= meia;
  }, 'b');
  // The blades: root on the body's top/bottom edge, sweeping back and out, the tip curling back towards the body.
  const B = variante === 'B';
  // A crescent: out and back, the tip curling IN towards the tail (not two straight prongs — that read as a fork).
  const cima = bezier([11, cy - 2], B ? [22, cy - 12] : [24, cy - 15], B ? [32, cy - 3] : [35, cy - 4], 3, 1);
  const baixo = bezier([11, cy + 2], B ? [22, cy + 12] : [24, cy + 15], B ? [32, cy + 3] : [35, cy + 4], 3, 1);
  t.encher(cima.dentro, 'b');
  t.encher(baixo.dentro, 'b');
  t.sombrear();
  t.contornar();
  // The energy: the core (3×2, hot centre) and the veins along the blades — dim red, a few lit pixels near the tips.
  for (const [x, y, c] of [[14, cy - 1, 'R'], [15, cy - 1, 'w'], [16, cy - 1, 'h'], [14, cy, 'r'], [15, cy, 'R'], [16, cy, 'r']]) t.set(x, y, c);
  for (const s of [cima, baixo])
    s.pts.forEach(([x, y], i) => {
      if (i % 6 || i < 12) return;
      t.set(x, y, i > 44 ? 'r' : 'm');
    });
  for (const s of [cima, baixo]) {
    const [x, y] = s.pts[s.pts.length - 1];
    t.set(x, y, 'R'); // the blade tips glow (the concept's red claws)
  }
  // The sight on the nose: where the aim line starts.
  t.set(3, cy, 'R');
  t.set(4, cy, 'r');
  return t;
}

// ── THE TENTACLE HEAD (~20×20, maw facing LEFT) ── a round armoured head, the open maw a dark hole ringed by six red
// lights, hooked claws around the rim, a neck plate to the right.
function cabeca() {
  const t = new Tela(24, 22);
  const cx = 12;
  const cy = 11;
  // The skull: an egg, blunt at the maw (left), tapering into the neck (right).
  t.encher((x, y) => ((x - cx) / (x < cx ? 6.5 : 9)) ** 2 + ((y - cy) / 6.5) ** 2 <= 1, 'b');
  // The claws: four hooked fangs around the rim, thick at the root, curling FORWARD (to the left) at the tip.
  for (const s of [-1, 1])
    for (const [ry, cx1, tip] of [[5.5, -4, -10], [3, -7, -11]]) {
      const garra = bezier([cx - 4, cy + s * ry], [cx1 + cx - 1, cy + s * (ry + 4)], [cx + tip + 3, cy + s * (ry + 1.5)], 2.4, 1);
      t.encher(garra.dentro, 'b');
    }
  t.sombrear();
  t.contornar();
  // The maw: the rim lit (the concept's ring of red lights), the dark throat inside.
  t.encher((x, y) => ((x - (cx - 4)) / 2.6) ** 2 + ((y - cy) / 4) ** 2 <= 1, 'K');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    t.set(cx - 4 + Math.cos(a) * 3.2, cy + Math.sin(a) * 4.6, i % 2 ? 'R' : 'h');
  }
  t.set(cx - 4, cy, 'r'); // the throat glow
  // The armour bands across the skull and the neck.
  for (const x of [cx + 2, cx + 6])
    for (let y = 0; y < t.h; y++) if (t.get(x, y) && !['K', 'R', 'h', 'r'].includes(t.get(x, y))) t.set(x, y, 'a');
  t.set(cx + 4, cy - 3, 'm');
  return t;
}

// ── ONE BODY SEGMENT (~11×11) ── a dark plated ring, a ridge on top and one faint red light; it chains with itself.
function gomo(variante) {
  const t = new Tela(13, 13);
  const r = variante === 'B' ? 4.6 : 5.2;
  t.encher((x, y) => Math.hypot(x - 6.5, y - 6.5) <= r, 'b');
  t.encher((x, y) => Math.abs(x - 6.5) <= 1 && y < 6.5 - r + 1.6 && y > 6.5 - r - 1.2, 'b'); // the ridge
  t.sombrear();
  t.contornar();
  // The plate seam (a vertical dark line) and the light.
  for (let y = 3; y <= 9; y++) if (t.get(8, y) && t.get(8, y) !== 'K') t.set(8, y, 'a');
  t.set(5, 7, variante === 'B' ? 'R' : 'r');
  return t;
}

// ── THE CRACK in the hull (the warning, 3 frames: dim → bright → opening) ── on the hull's own dark, glowing red.
function rachadura(passo) {
  const t = new Tela(18, 6);
  const linha = [[1, 3], [2, 3], [3, 2], [4, 2], [5, 3], [6, 3], [7, 4], [8, 3], [9, 3], [10, 2], [11, 2], [12, 3], [13, 3], [14, 4], [15, 3], [16, 3]];
  const cor = ['m', 'r', 'R'][passo];
  for (const [x, y] of linha) t.set(x, y, cor);
  if (passo >= 1) for (const [x, y] of [[4, 1], [10, 1], [11, 4], [7, 5]]) t.set(x, y, 'm'); // the branches
  if (passo === 2) for (const [x, y] of [[8, 2], [9, 2], [8, 4], [9, 4]]) t.set(x, y, 'h'); // it opens in the middle
  return t;
}

// ── THE SHOTS (≤8px) ── the hunter's precision needle (hot magenta-red: it is not the ship's orange) and the
// tentacle's crescent pellet (the Leviathan red, round: it is not aimed).
const tiros = {
  'cacador-agulha': [['5a0f3a', 'a01a5a', 'e0306e', 'ff8ac0', 'fff0f6']],
  'tentaculo-bolinha': [
    [null, '9a1626', null],
    ['9a1626', 'ff8f86', '9a1626'],
    [null, '9a1626', null],
  ],
  'tentaculo-bolinha-B': [
    [null, '4a0c16', '9a1626', null],
    ['4a0c16', 'e2303c', 'ffe2da', '9a1626'],
    [null, '4a0c16', '9a1626', null],
  ],
};

// ── THE DISSOLVE (surge/some): an ordered 4×4 Bayer dither eats the sprite in 4 steps — pixels, not an alpha fade.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
function dissolver(t, passo) {
  const d = new Tela(t.w, t.h);
  const corte = passo * 4; // 0 = whole, 16 = gone
  for (let y = 0; y < t.h; y++)
    for (let x = 0; x < t.w; x++) if (t.px[y][x] && BAYER[y % 4][x % 4] >= corte) d.px[y][x] = t.px[y][x];
  return d;
}

for (const v of ['A', 'B']) {
  const c = await cacador(v);
  await c.png(`${OUT}/cacador-${v}.png`);
  if (v === 'A') for (const p of [1, 2, 3]) await dissolver(c, p).png(`${OUT}/cacador-A-dissolver-${p}.png`);
}
await cabeca().png(`${OUT}/tentaculo-cabeca.png`);
for (const v of ['A', 'B']) await gomo(v).png(`${OUT}/tentaculo-gomo-${v}.png`);
for (const p of [0, 1, 2]) await rachadura(p).png(`${OUT}/rachadura-${p}.png`);
for (const [n, linhas] of Object.entries(tiros)) {
  const t = new Tela(Math.max(...linhas.map((l) => l.length)), linhas.length);
  linhas.forEach((l, y) => l.forEach((c, x) => c && t.set(x, y, c)));
  await t.png(`${OUT}/tiro-${n}.png`);
}
console.log('ok', fs.readdirSync(OUT).join(' '));
