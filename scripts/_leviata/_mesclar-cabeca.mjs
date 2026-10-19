// BLOCO D — his pick of 18/10: the HEAD of `mandibula-31` on the BODY of `tubarao-31` (shark 32 kept as the
// fallback). Both concepts are approved art, so the graft is a cut-and-sew, never a straight cut: the head is
// scaled (down only), anchored on the body's axis just behind the shark's gills, and the two meet on a
// minimum-error seam — a crooked line through the overlap where they look most alike. The shark's own snout,
// right of the seam, goes away. Colours from a reduction snap back to the two concepts' palette.
//   node scripts/_leviata/_mesclar-cabeca.mjs <out.png> <escala> [seamX0=286] [seamX1=316] [dy=0]
import sharp from 'sharp';

const [OUT, S_S, X0_S = '286', X1_S = '316', DY_S = '0'] = process.argv.slice(2);
const S = Number(S_S), X0 = Number(X0_S), X1 = Number(X1_S), DY = Number(DY_S);
const CRU = 'docs/superpowers/folhas/2026-10-18/leviata/cru';
const W = 432, H = 184, OY = 12; // a wider canvas: the head may grow past the shark's frame

const raw = async (f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const tub = await raw(`${CRU}/tubarao-31-0.png`);
const man = await raw(`${CRU}/mandibula-31-0.png`);

// Anchors: the mandible head starts at x=262 (the brow), its axis at that column; the shark's axis at the gills.
const extent = (img, x) => {
  let t = -1, b = -1;
  for (let y = 0; y < img.info.height; y++) if (img.data[(y * img.info.width + x) * 4 + 3]) { if (t < 0) t = y; b = y; }
  return [t, b];
};
const MX = 262;
const [mt, mb] = extent(man, MX);
const [tt, tb] = extent(tub, 300);
const myAxis = (mt + mb) / 2, tyAxis = (tt + tb) / 2 + OY;

// The head piece, scaled down with a smooth kernel, then alpha snapped.
const mw = man.info.width - MX;
const head = await sharp(`${CRU}/mandibula-31-0.png`).extract({ left: MX, top: 0, width: mw, height: man.info.height })
  .resize(Math.round(mw * S), Math.round(man.info.height * S), { kernel: S === 1 ? 'nearest' : 'mitchell' })
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 3; i < head.data.length; i += 4) head.data[i] = head.data[i] >= 110 ? 255 : 0;

// Palette of both concepts, for snapping the resampled head back to real colours.
const pal = new Map();
for (const img of [tub, man]) for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3])
  pal.set((img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2], [img.data[i], img.data[i + 1], img.data[i + 2]]);
const cores = [...pal.values()];
const snap = (r, g, b) => {
  let best = cores[0], d = Infinity;
  for (const c of cores) { const e = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (e < d) { d = e; best = c; } }
  return best;
};
if (S !== 1) for (let i = 0; i < head.data.length; i += 4) if (head.data[i + 3]) {
  const c = snap(head.data[i], head.data[i + 1], head.data[i + 2]);
  head.data[i] = c[0]; head.data[i + 1] = c[1]; head.data[i + 2] = c[2];
}

// Placement on the canvas: head column 0 at x=X0-ish so it overlaps the seam zone, axes aligned.
const HX = X0 - 6; // the brow lands just inside the seam zone
const HY = Math.round(tyAxis - myAxis * S) + DY;
const px = (img, x, y) => {
  if (x < 0 || y < 0 || x >= img.info.width || y >= img.info.height) return [0, 0, 0, 0];
  const i = (y * img.info.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
};
const T = (x, y) => px(tub, x, y - OY);
const Hd = (x, y) => px(head, x - HX, y - HY);

// Minimum-error seam (dynamic programming, one column per row, moves at most 1px per row) in [X0, X1].
const cost = (x, y) => {
  const a = T(x, y), b = Hd(x, y);
  if (!a[3] && !b[3]) return 0;
  if (a[3] !== b[3]) return 300;
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
};
const n = X1 - X0 + 1;
const acc = Array.from({ length: H }, () => new Float64Array(n));
const from = Array.from({ length: H }, () => new Int8Array(n));
for (let y = 0; y < H; y++) for (let k = 0; k < n; k++) {
  const c = cost(X0 + k, y);
  if (y === 0) { acc[y][k] = c; continue; }
  let best = acc[y - 1][k], m = 0;
  if (k > 0 && acc[y - 1][k - 1] < best) { best = acc[y - 1][k - 1]; m = -1; }
  if (k < n - 1 && acc[y - 1][k + 1] < best) { best = acc[y - 1][k + 1]; m = 1; }
  acc[y][k] = c + best; from[y][k] = m;
}
const seam = new Int32Array(H);
let k = 0;
for (let j = 1; j < n; j++) if (acc[H - 1][j] < acc[H - 1][k]) k = j;
for (let y = H - 1; y >= 0; y--) { seam[y] = X0 + k; k += from[y][k]; }

const out = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  // Only the head right of the seam: its own left edge is a straight cut of the concept, never shown. The step
  // this leaves in the outline is painted by `_emenda-inpaint.mjs`.
  const p = x < seam[y] ? T(x, y) : Hd(x, y);
  p.forEach((v, c) => (out[(y * W + x) * 4 + c] = v));
}
// Untrimmed, so the seam's columns (the .json beside it) stay valid for the inpaint step.
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);
const fs = await import('node:fs');
fs.writeFileSync(`${OUT}.json`, JSON.stringify({ seamMin: Math.min(...seam), seamMax: Math.max(...seam), escala: S }));
let e = 0, m = 0;
for (let y = 0; y < H; y++) { const c = cost(seam[y], y); if (c) { e += c; m++; } }
console.log(`${OUT}: escala ${S}, cabeça em (${HX}, ${HY}), costura x ${Math.min(...seam)}–${Math.max(...seam)}, erro médio ${(e / Math.max(m, 1)).toFixed(1)}`);
