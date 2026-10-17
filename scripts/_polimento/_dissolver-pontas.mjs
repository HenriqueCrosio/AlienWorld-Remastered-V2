// 15/10 — DISSOLVE THE STRAIGHT ENDS OF A SPRITE (polish item 5, the rock belt; reused for the F4 rib).
//
// The piece ends in a vertical cut on the left and/or right, and copies of it drawn over a painting read as dark
// rectangles. This erodes the ends instead of fading them: pixel art keeps binary alpha, so a smooth alpha ramp would
// smear it. A blocky value noise (cells of CELL px) is compared against a ramp that goes from 0 at the edge to 1 at
// RAMP px inside, so the matter thins out in crumbs toward the end; then specks smaller than MIN px are removed.
// Deterministic (seeded), and it always reads the ORIGINAL in assets/raw, so running it again gives the same file.
//   node scripts/_polimento/_dissolver-pontas.mjs <original png> <out png> <ramp px> [sides: any of l r b t] [cell px] [seed]
import sharp from 'sharp';

const [SRC, OUT, RAMP_S, SIDES = 'lr', CELL_S = '3', SEED_S = '7'] = process.argv.slice(2);
const RAMP = Number(RAMP_S), CELL = Number(CELL_S), MIN = 3;
let seed = Number(SEED_S);
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

// Value noise on a CELL grid, bilinear between cell corners, then quantized back to cells (blocky = pixel-honest).
const gw = Math.ceil(W / CELL) + 2, gh = Math.ceil(H / CELL) + 2;
const grid = Array.from({ length: gw * gh }, rnd);
const noise = (x, y) => {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  const g = (i, j) => grid[j * gw + i];
  // Half the weight from the cell itself, half from the neighbours: clumps, not salt.
  return 0.5 * g(cx, cy) + 0.125 * (g(cx + 1, cy) + g(cx, cy + 1) + g(Math.max(cx - 1, 0), cy) + g(cx, Math.max(cy - 1, 0)));
};

// Distance to the nearest dissolved side.
const dist = (x, y) => {
  let d = Infinity;
  if (SIDES.includes('l')) d = Math.min(d, x);
  if (SIDES.includes('r')) d = Math.min(d, W - 1 - x);
  if (SIDES.includes('b')) d = Math.min(d, H - 1 - y);
  if (SIDES.includes('t')) d = Math.min(d, y); // 17/10: a tuft of the F4 foreground that hit the top edge
  return d;
};

const out = Buffer.from(data);
let removed = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (out[i + 3] === 0) continue;
    const t = Math.min(dist(x, y) / RAMP, 1);
    // t^1.4: the last third of the ramp keeps most of the matter, the first third is almost all gone.
    if (t < 1 && noise(x, y) > Math.pow(t, 1.4) * 1.08) {
      out[i + 3] = 0;
      removed++;
    }
  }
}

// Remove specks: 4-connected opaque components smaller than MIN px, only inside the ramp (the body is untouched).
const seen = new Uint8Array(W * H);
let specks = 0;
for (let p = 0; p < W * H; p++) {
  if (seen[p] || out[p * 4 + 3] === 0) continue;
  const comp = [p];
  seen[p] = 1;
  for (let k = 0; k < comp.length; k++) {
    const q = comp[k], x = q % W, y = (q / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (!seen[n] && out[n * 4 + 3] !== 0) { seen[n] = 1; comp.push(n); }
    }
  }
  if (comp.length < MIN && comp.every((q) => dist(q % W, (q / W) | 0) < RAMP)) {
    for (const q of comp) out[q * 4 + 3] = 0;
    specks += comp.length;
  }
}

await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);
const edge = (x) => { let n = 0; for (let y = 0; y < H; y++) if (out[(y * W + x) * 4 + 3] > 40) n++; return n; };
console.log(`${OUT}: ${W}x${H}, ${removed} px eroded, ${specks} px of specks; opaque on the edge L ${edge(0)} R ${edge(W - 1)}`);
