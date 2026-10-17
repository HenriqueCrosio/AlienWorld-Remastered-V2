// 17/10 — THE HAND-DRAWN ROOT KIT, shared by `_raizes-esfincter.mjs` (15/10) and `_raizes-porta.mjs` (17/10): a
// seeded PRNG, a pixel grid that knows its palette (letters → colours), tendrils and the fleshy lip. Moved here
// verbatim from the sphincter script (its output is byte-identical); only the palette became a parameter.
import sharp from 'sharp';
export const prng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export class Grade {
  constructor(w, h, cores) { this.cores = cores; this.w = w; this.h = h; this.g = Array.from({ length: h }, () => Array(w).fill('.')); }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.g[y][x] : '#'; }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = c; }
  /** An outline pass: every empty pixel touching tissue (4-neighbour) becomes `k` — only where `onde` allows. */
  contorno(onde = () => true) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.g[y][x] !== '.' || !onde(x, y)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => 'bBhvVmf'.includes(this.get(x + dx, y + dy)) && this.get(x + dx, y + dy) !== '#')) add.push([x, y]);
    }
    for (const [x, y] of add) this.g[y][x] = 'k';
  }
  async png(arq, flip = false) {
    const buf = Buffer.alloc(this.w * this.h * 4);
    this.g.forEach((l, y) => l.forEach((c, x) => {
      const cor = this.cores[c];
      if (cor) buf.set([...cor, 255], ((flip ? this.h - 1 - y : y) * this.w + x) * 4);
    }));
    await sharp(buf, { raw: { width: this.w, height: this.h, channels: 4 } }).png().toFile(arq);
  }
}

/**
 * A tendril: from (x, y), heading `ang` (radians, 0 = right, π/2 = down), `len` steps. The thickness falls FAST from
 * t0 (a root is thick where it leaves the body and a thread for most of its length), the heading wanders smoothly and
 * `puxa` bends it (gravity, or the wall drawing it in). Body near the start, sinking into the wall's tones past
 * `afunda` of its length; a vein down the thick part when `veia`; `galho` = the chance of a side branch.
 */
export function gavinha(G, rnd, x, y, ang, len, t0, { afunda = 0.55, veia = false, curva = 0.12, puxa = 0, galho = 0 } = {}) {
  let a = ang, va = 0;
  for (let p = 0; p < len; p++) {
    const k = p / len;
    const t = 1 + (t0 - 1) * Math.pow(1 - k, 1.7);
    const r = (t - 1) / 2;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      if (dx * dx + dy * dy > r * r + 0.35) continue;
      const px = Math.round(x + dx), py = Math.round(y + dy);
      const atual = G.get(px, py);
      if (atual === '#' || 'hvV'.includes(atual)) continue;
      const fundo = k > afunda;
      const topo = dy <= -r + 0.5 && t >= 2.2;
      G.set(px, py, fundo ? (k > afunda + (1 - afunda) / 2 ? 'f' : 'm') : topo ? 'B' : 'b');
    }
    if (veia && t >= 2.6 && k < afunda) G.set(Math.round(x), Math.round(y), p % 4 === 1 ? 'V' : 'v');
    if (galho && t >= 2 && k > 0.2 && k < 0.6 && rnd() < galho) {
      const lado = rnd() < 0.5 ? -1 : 1;
      gavinha(G, rnd, x, y, a + lado * (0.5 + rnd() * 0.4), (len - p) * (0.4 + rnd() * 0.3), Math.max(1.6, t * 0.7), { afunda, curva, puxa });
      galho = 0;
    }
    va = va * 0.8 + (rnd() - 0.5) * curva;
    a += va + puxa;
    x += Math.cos(a);
    y += Math.sin(a);
  }
}

/**
 * The lip: a fleshy band over the surface line from x0 to x1. Its height is a HUMP (thick where the body crosses,
 * thin at the ends) plus a few slow lumps, never a ruler line; the rim light is broken, and creases cut the mass.
 */
export function labio(G, rnd, x0, x1, sup, alto, baixo, comVeias = true) {
  const lumps = Array.from({ length: 4 }, () => ({ c: x0 + rnd() * (x1 - x0), w: 5 + rnd() * 8, a: 0.4 + rnd() * 0.8 }));
  const vincos = Array.from({ length: 3 }, () => Math.round(x0 + 8 + rnd() * (x1 - x0 - 16)));
  const veiasDoLabio = comVeias ? Array.from({ length: 4 }, () => Math.round(x0 + 6 + rnd() * (x1 - x0 - 12))) : [];
  for (let x = x0; x <= x1; x++) {
    const u = (x - x0) / (x1 - x0);
    // Pointed, not flat-topped: at ** 0.6 the lip read in the game as a PLANK laid on the wall.
    const corcova = Math.sin(Math.PI * u) ** 1.3;
    const caroco = lumps.reduce((acc, l) => acc + l.a * Math.exp(-(((x - l.c) / l.w) ** 2)), 0);
    const cima = Math.max(1, Math.round(alto * corcova + caroco - 0.6));
    const fundo = Math.max(1, Math.round(baixo * corcova + caroco * 0.5));
    const luz = rnd() < 0.35;
    for (let y = sup - cima; y <= sup + fundo; y++) {
      const d = y - (sup - cima);
      G.set(x, y, d === 0 ? (luz ? 'h' : 'B') : 'b');
    }
    if (vincos.includes(x)) for (let y = sup - cima + 2; y <= sup + fundo - 1; y++) G.set(x, y, 'k');
    if (veiasDoLabio.includes(x)) for (let y = sup - cima + 1; y <= sup + fundo; y++) G.set(x + ((y >> 1) & 1), y, y === sup ? 'V' : 'v');
  }
}
