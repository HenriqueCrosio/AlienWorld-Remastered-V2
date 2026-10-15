// 15/10 — RETRACT THE CABLES THAT RUN INTO THE FRAME EDGE (the F4 rib, `costela.png`).
//
// The cables/tendrils of the piece hit the left and right edges of the canvas and end in the same vertical cut, so
// every copy in the game shows a column of sliced cables (his screenshot of 15/10). Eroding them with noise (the belt
// recipe) would turn a 5px cable into a dashed line, so here the cables are RETRACTED instead: every opaque piece that
// touches the edge, taken inside an edge band of BAND px, is cut back by a length that varies smoothly along y (so
// the ends never line up), and the new ends are painted with the piece's own darkest colour (its outline, closing
// the end). Pieces inside the band that do not touch the edge (the skull's nose) are left alone.
// Deterministic, and it reads the ORIGINAL in assets/raw.
//   node scripts/_polimento/_retrair-cabos.mjs <original png> <out png> [band px] [seed]
import sharp from 'sharp';

const [SRC, OUT, BAND_S = '22', SEED_S = '11'] = process.argv.slice(2);
const BAND = Number(BAND_S);
let seed = Number(SEED_S);
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const px = Buffer.from(data);
const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : px[(y * W + x) * 4 + 3]);
const lum = (i) => px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;

let cut = 0, capped = 0;
const KNOT = 9, TAPER = 3;
const knots = { l: [], r: [] };
for (const k of ['l', 'r']) for (let j = 0; j <= Math.ceil(H / KNOT) + 1; j++) knots[k].push(0.35 + 0.65 * rnd());
const corte = (lado, y) => {
  const j = Math.floor(y / KNOT), f = (y % KNOT) / KNOT, s = f * f * (3 - 2 * f);
  return Math.round(BAND * (knots[lado][j] * (1 - s) + knots[lado][j + 1] * s));
};
for (const lado of ['l', 'r']) {
  // Distance to this side; the band is where pieces get split into cables.
  const dist = (x) => (lado === 'l' ? x : W - 1 - x);
  const inBand = (x, y) => dist(x) < BAND && A(x, y) > 0;
  const seen = new Uint8Array(W * H);
  for (let y0 = 0; y0 < H; y0++) {
    const x0 = lado === 'l' ? 0 : W - 1;
    if (!inBand(x0, y0) || seen[y0 * W + x0]) continue;
    // The piece of cable inside the band that touches the edge at (x0, y0) — 8-connected, so diagonal cables hold.
    const comp = [[x0, y0]];
    seen[y0 * W + x0] = 1;
    for (let k = 0; k < comp.length; k++) {
      const [x, y] = comp[k];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((dx || dy) && inBand(nx, ny) && !seen[ny * W + nx]) { seen[ny * W + nx] = 1; comp.push([nx, ny]); }
      }
    }
    // Its outline colour: the darkest opaque pixel of the piece.
    let dark = null;
    for (const [x, y] of comp) {
      const i = (y * W + x) * 4;
      if (!dark || lum(i) < lum(dark)) dark = i;
    }
    const cor = [px[dark], px[dark + 1], px[dark + 2]];
    // The retraction varies along y (a smooth noise with knots every KNOT rows, between 35% and 100% of the band):
    // the cables of one side often merge into a single piece inside the band, and ONE cut length for the piece gave
    // them all the same end column — the straight cut again, only moved inward.
    for (const [x, y] of comp) {
      if (dist(x) < corte(lado, y)) { px[(y * W + x) * 4 + 3] = 0; cut++; }
    }
    // Taper the last TAPER px: two passes peel the cable's top and bottom sides near the end (the first pass over the
    // last 3 px, the second over the last 1), so a 5px cable ends in a point instead of a square peg.
    const resto = comp.filter(([x, y]) => A(x, y) > 0);
    const aPonta = ([x, y]) => dist(x) - corte(lado, y);
    for (const alcance of [TAPER, 1]) {
      const sai = resto.filter((p) => aPonta(p) < alcance && A(p[0], p[1]) > 0 && (A(p[0], p[1] - 1) === 0 || A(p[0], p[1] + 1) === 0));
      // Never peel a cable down to nothing: a piece 1–2px tall is already a point.
      for (const [x, y] of sai) if (A(x, y - 1) > 0 || A(x, y + 1) > 0) { px[(y * W + x) * 4 + 3] = 0; cut++; }
    }
    // Close the new ends: in the tapered zone, a surviving pixel that now touches the outside (toward the edge, above
    // or below) where the original was opaque takes the cable's outline colour.
    const passo = lado === 'l' ? -1 : 1;
    const eraCheio = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] > 0;
    for (const p of resto) {
      const [x, y] = p;
      if (A(x, y) === 0 || aPonta(p) >= TAPER + 1) continue;
      const exposto = [[x + passo, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => eraCheio(nx, ny) && A(nx, ny) === 0);
      if (exposto) {
        const i = (y * W + x) * 4;
        px[i] = cor[0]; px[i + 1] = cor[1]; px[i + 2] = cor[2];
        capped++;
      }
    }
  }
}

await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);
const edge = (x) => { let n = 0; for (let y = 0; y < H; y++) if (A(x, y) > 40) n++; return n; };
console.log(`${OUT}: ${cut} px retracted, ${capped} capped; opaque on the edge L ${edge(0)} R ${edge(W - 1)}`);
