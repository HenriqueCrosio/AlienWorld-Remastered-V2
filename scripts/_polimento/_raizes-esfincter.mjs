// 15/10 — THE SPHINCTER'S ROOTS, BY HAND (polish block B; he: "raízes como as do pé do Tubo, para deixar claro que
// ele vive no tecido/colado no tecido").
//
// Two pieces, both drawn for the FLOOR (the wall's surface line at row SUP; the game flips them on the ceiling):
//   raiz       — the creature's own roots: a fleshy LIP over the line where its body disappears behind the border
//                (it crosses the surface over ~62px), and roots digging DOWN into the border, sideways only a little —
//                the piece must stay on the first plate of chamber D (the pillar on the left, a step on the right).
//   trepadeira — the same tissue grown over the END of the junction pillar (the stone/metal pillar that stood alone,
//                polish item 4): a mat over its end, tendrils draping down its face and a few reaching right, toward
//                the creature's roots, so the pillar and the creature read as ONE threshold.
// Colours: the creature's body ramp (sampled: its outline 16,16,32, teal 24,48,64 — the SAME teal as the border D
// tiles) and its violet veins, fading at the root tips into the border's darks, so they read as grown in, not set down.
// Deterministic (seeded). Writes the candidates into <out dir>:
//   node scripts/_polimento/_raizes-esfincter.mjs <out dir>
import fs from 'node:fs';
import sharp from 'sharp';

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

// ⚠️ DARK, NOT TEAL. The 1st take used the body's teal — and the body's teal IS the border D tile (24,48,64): in the
// game the roots vanished into the wall, and the lit rim read as a pale SHELF. What already reads on these walls is
// the pillar's red cracks: dark lines with a glow inside. So the roots are the creature's dark violet (its shadow
// side) with its magenta running in the veins — the colour of its mouth, pumping into the wall.
const C = {
  k: [14, 8, 22], // outline
  b: [32, 18, 42], // body
  B: [50, 28, 60], // body, the side facing the corridor
  h: [72, 40, 84], // a lump catching light (sparse)
  v: [110, 44, 112], // vein
  V: [186, 74, 170], // vein lit (the mouth's magenta)
  m: [22, 14, 34], // sinking into the wall
  f: [12, 10, 24], // the wall's dark
};

const prng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

class Grade {
  constructor(w, h) { this.w = w; this.h = h; this.g = Array.from({ length: h }, () => Array(w).fill('.')); }
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
      const cor = C[c];
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
function gavinha(G, rnd, x, y, ang, len, t0, { afunda = 0.55, veia = false, curva = 0.12, puxa = 0, galho = 0 } = {}) {
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
function labio(G, rnd, x0, x1, sup, alto, baixo, comVeias = true) {
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

async function raiz(nome, seed, { gavinhas = 9, grossura = 3.4, veias = true } = {}) {
  // Anchor column AX = the creature's centre: −40 … +47 (the pillar's flank is at −40.5 with the creature at +80).
  const W = 88, H = 28, SUP = 7, AX = 40;
  for (const [lado, s] of [['chao', seed], ['teto', seed + 101]]) {
    const rnd = prng(s);
    const G = new Grade(W, H);
    labio(G, rnd, AX - 36, AX + 36, SUP, 6, 4, veias);
    // A FAN, not a comb: evenly spaced roots all digging straight down read in the game as the teeth of a comb. They
    // leave from the middle of the lip and open outwards; the outer ones are the longest and bend to hug the wall.
    for (let i = 0; i < gavinhas; i++) {
      const u = (i + 0.5) / gavinhas;
      const fora = (u - 0.5) * 2;
      const x = AX + fora * 26 + (rnd() - 0.5) * 4;
      const ang = Math.PI / 2 - fora * (1.0 + rnd() * 0.45);
      const len = 10 + Math.abs(fora) * 12 + rnd() * 8;
      gavinha(G, rnd, x, SUP + 2, ang, len, grossura * (0.8 + rnd() * 0.4), {
        veia: veias && rnd() < 0.6, galho: 0.3, puxa: fora * 0.03, curva: 0.16,
      });
    }
    G.contorno((x, y) => y >= SUP - 7);
    await G.png(`${OUT}/raiz-${nome}-${lado}.png`, lado === 'teto');
  }
}

async function trepadeira(nome, seed, { pendentes = 6, ponte = 3 } = {}) {
  // Anchor column AX = the pillar's centre (it is 75px wide at its 0.8 scale: −37.6 … +37.6). The pillar's END is row
  // SUP; on the right the chamber D surface sits ~18px further in (the pillar sticks out past the thinner wall).
  const W = 104, H = 34, SUP = 4, AX = 48;
  for (const [lado, s] of [['chao', seed], ['teto', seed + 101]]) {
    const rnd = prng(s);
    const G = new Grade(W, H);
    // The mat over the pillar's end — not across all of it: the stone still shows on the left.
    labio(G, rnd, AX - 18, AX + 37, SUP, 3, 2);
    // Draping down the pillar's face (straight down, a little sway).
    for (let i = 0; i < pendentes; i++) {
      const x = AX - 14 + ((i + 0.5) / pendentes) * 48 + (rnd() - 0.5) * 5;
      gavinha(G, rnd, x, SUP + 1, Math.PI / 2 + (rnd() - 0.5) * 0.3, 8 + rnd() * 16, 2.6 + rnd() * 1, { afunda: 0.75, curva: 0.08 });
    }
    // The bridge: off the pillar's right flank, down the 18px drop and along to where the creature's roots start.
    for (let i = 0; i < ponte; i++) {
      // Steep first (down the pillar's flank), then bending flat along the wall: a straight diagonal read as a ROD.
      gavinha(G, rnd, AX + 35 + rnd() * 3, SUP + 1 + i * 2, 1.3 + rnd() * 0.2, 22 + rnd() * 8, 3.4 - i * 0.5, { afunda: 0.8, veia: i === 0, curva: 0.1, puxa: -0.045 });
    }
    G.contorno((x, y) => y >= SUP - 4);
    await G.png(`${OUT}/trepadeira-${nome}-${lado}.png`, lado === 'teto');
  }
}

// The candidates: A = few thick roots, B = more and thinner, C = A's shape with no veins (only the dark body).
await raiz('A', 11, { gavinhas: 6, grossura: 5.5 });
await raiz('B', 23, { gavinhas: 8, grossura: 4.5 });
await raiz('C', 37, { gavinhas: 6, grossura: 5.5, veias: false });
await trepadeira('A', 5, { pendentes: 5, ponte: 3 });
await trepadeira('B', 19, { pendentes: 8, ponte: 2 });
console.log('ok', OUT);
