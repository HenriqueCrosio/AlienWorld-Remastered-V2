// BLOCO E — the menu layers, cut from HIS painting, at a given density k (1 = the game's 384×216; 4 = 1536×864, the
// "original resolution" comparison). Each layer is reduced ONCE from the original crop (the paint-bg rule).
//   node scripts/_menu/_camadas.mjs <outDir> <k>
// Writes: ceu.png (the sky behind the window), cidade.png (the cut-out city, ship removed, alpha dithered),
// apagadas.png (the "off" state of every warm light and beacon, cropped per light: only the changed pixels, the rest
// transparent),
// nave.png (the hovering ship, cut out), cachoeira.png (the waterfall loop, frames side by side), dados.json.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [OUT, K_S = '1'] = process.argv.slice(2);
const K = Number(K_S);
const W = 384 * K, H = 216 * K;
fs.mkdirSync(OUT, { recursive: true });

const ORIG_CIDADE = 'assets/raw/menu_inicial_transparente.png';
const ORIG_CEU = 'assets/raw/Cidade-Fortaleza sob a Lua Colossal (1).png';
// 16:9 at full height (890) is 1582 wide: the 186 px come off the LEFT (his window of sky grows; the citadel lands
// on the right third).
const CORTE = { left: 186, top: 0, width: 1582, height: 890 };
// The ship, in ORIGINAL pixels (a box around it), and where the clouds to patch it come from (same row, to the right).
const NAVE_CAIXA = { x0: 500, y0: 238, x1: 626, y1: 300 };
const NAVE_REMENDO_DX = 130;

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// ─── 1. The ship mask, at the original resolution ───────────────────────────────────────────────────────────────
const orig = await sharp(ORIG_CIDADE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const OW = orig.info.width, OH = orig.info.height;
const px = orig.data;
const at = (x, y) => (y * OW + x) * 4;
// Background = the median luminance of the box border.
const borda = [];
for (let x = NAVE_CAIXA.x0; x < NAVE_CAIXA.x1; x++) for (const y of [NAVE_CAIXA.y0, NAVE_CAIXA.y1 - 1]) borda.push(lum(px[at(x, y)], px[at(x, y) + 1], px[at(x, y) + 2]));
for (let y = NAVE_CAIXA.y0; y < NAVE_CAIXA.y1; y++) for (const x of [NAVE_CAIXA.x0, NAVE_CAIXA.x1 - 1]) borda.push(lum(px[at(x, y)], px[at(x, y) + 1], px[at(x, y) + 2]));
borda.sort((a, b) => a - b);
const fundoL = borda[borda.length >> 1];
const bw = NAVE_CAIXA.x1 - NAVE_CAIXA.x0, bh = NAVE_CAIXA.y1 - NAVE_CAIXA.y0;
let mask = new Uint8Array(bw * bh);
for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
  const i = at(NAVE_CAIXA.x0 + x, NAVE_CAIXA.y0 + y);
  const r = px[i], g = px[i + 1], b = px[i + 2], l = lum(r, g, b);
  const quente = r > 110 && r > b + 40;
  if (l < fundoL - 7 || quente) mask[y * bw + x] = 1;
}
// Keep the largest connected blob (the hull), then close small holes.
const rotulo = new Int32Array(bw * bh).fill(-1);
let maior = -1, maiorN = 0, nRot = 0;
for (let s = 0; s < bw * bh; s++) {
  if (!mask[s] || rotulo[s] >= 0) continue;
  const fila = [s]; rotulo[s] = nRot; let n = 0;
  while (fila.length) {
    const c = fila.pop(); n++;
    const cx = c % bw, cy = (c / bw) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
      const q = ny * bw + nx;
      if (mask[q] && rotulo[q] < 0) { rotulo[q] = nRot; fila.push(q); }
    }
  }
  if (n > maiorN) { maiorN = n; maior = nRot; }
  nRot++;
}
mask = mask.map((_, s) => (rotulo[s] === maior ? 1 : 0));
const dilatar = (m, r) => {
  const o = new Uint8Array(m.length);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    let v = 0;
    for (let dy = -r; dy <= r && !v; dy++) for (let dx = -r; dx <= r && !v; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < bw && ny < bh && m[ny * bw + nx]) v = 1;
    }
    o[y * bw + x] = v;
  }
  return o;
};
const naveMask = dilatar(mask, 1);
const remendoMask = dilatar(mask, 4);

// The ship sprite (original pixels, alpha = mask) and the city with the ship patched by clouds from the right.
const naveRGBA = Buffer.alloc(bw * bh * 4);
const semNave = Buffer.from(px);
for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
  const s = y * bw + x, i = at(NAVE_CAIXA.x0 + x, NAVE_CAIXA.y0 + y);
  if (naveMask[s]) { for (let c = 0; c < 3; c++) naveRGBA[s * 4 + c] = px[i + c]; naveRGBA[s * 4 + 3] = 255; }
  if (remendoMask[s]) {
    const j = at(NAVE_CAIXA.x0 + x + NAVE_REMENDO_DX, NAVE_CAIXA.y0 + y);
    for (let c = 0; c < 3; c++) semNave[i + c] = px[j + c];
  }
}
// Soften the patch seam: blend a ring around the patch 50/50 with the original.
const anel = dilatar(remendoMask, 2);
for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
  const s = y * bw + x;
  if (anel[s] && !remendoMask[s]) {
    const i = at(NAVE_CAIXA.x0 + x, NAVE_CAIXA.y0 + y), j = at(NAVE_CAIXA.x0 + x + NAVE_REMENDO_DX, NAVE_CAIXA.y0 + y);
    for (let c = 0; c < 3; c++) semNave[i + c] = Math.round((px[i + c] + px[j + c]) / 2);
  }
}

// ─── 2. Reduce once to the target density ───────────────────────────────────────────────────────────────────────
const reduzir = (buf, w, h, ch, corte, ow, oh) =>
  sharp(buf, { raw: { width: w, height: h, channels: ch } }).extract(corte).resize(ow, oh, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
const cidade = await reduzir(semNave, OW, OH, 4, CORTE, W, H);
// Alpha: the city was saved at ~99% opacity → solid. His cut is anti-aliased: a 2 px spire tip sits at 50–80% and the
// Leviathan, behind, showed THROUGH it (19/10). So the edge is tightened first (≥ 60% is solid, ≤ 25% is gone, a short
// ramp between — only the feathered cloud edge lives there); then at the game resolution the ramp becomes an ordered
// dither (no partial alpha in pixel art), and at 4× it stays a smooth edge, like his painting.
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  const u = Math.min(1, Math.max(0, (cidade[i + 3] / 255 - 0.25) / 0.35));
  const a = u * u * (3 - 2 * u);
  cidade[i + 3] = K === 1 ? (a > 0.86 ? 255 : a > BAYER4[(y % 4) * 4 + (x % 4)] ? 255 : 0) : Math.round(a * 255);
}
const ceuRaw = await sharp(ORIG_CEU).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// The GHOST SPIRES. The cold version is another render of the same city: its spires stand 8–20 px taller and a bit
// to the side, so their tips stick out through the window — and the Leviathan, between the layers, swam IN FRONT of
// them (19/10). In a band around his opaque spires (left of the planet's limb), the window is repainted with the
// sky of the same row, measured left of the spires where the cold version is plain sky.
{
  const FANT = { x0: 1120, x1: 1290, y0: 0, y1: 260, raio: 30, ceuX0: 1060, ceuX1: 1112 };
  const cd = ceuRaw.data, CW = ceuRaw.info.width;
  const solido = (x, y) => px[at(x, y) + 3] > 200; // his city is saved at ~99% (alpha 252)
  const perto = (x, y) => {
    for (let dy = 0; dy <= FANT.raio; dy += 2) for (let dx = -FANT.raio; dx <= FANT.raio; dx += 2) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny < OH && nx < OW && solido(nx, ny)) return true;
    }
    return false;
  };
  let h = 99;
  const ruido = () => ((h = (h * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5) * 4;
  for (let y = FANT.y0; y < FANT.y1; y++) {
    const linha = [[], [], []];
    for (let x = FANT.ceuX0; x < FANT.ceuX1; x++) for (let c = 0; c < 3; c++) linha[c].push(cd[(y * CW + x) * 4 + c]);
    const med = linha.map((v) => v.sort((a, b) => a - b)[v.length >> 1]);
    for (let x = FANT.x0; x < FANT.x1; x++) {
      if (solido(x, y) || !perto(x, y)) continue;
      const n = ruido();
      for (let c = 0; c < 3; c++) cd[(y * CW + x) * 4 + c] = Math.max(0, Math.round(med[c] + n));
    }
  }
}
const ceu = await reduzir(ceuRaw.data, ceuRaw.info.width, ceuRaw.info.height, 4, CORTE, W, H);
// The sky shows only through the window: any red beacon of the cold version that leaks there is painted over with
// its left neighbour.
for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) {
  const i = (y * W + x) * 4;
  if (cidade[i + 3] === 0 && ceu[i] > 70 && ceu[i] > ceu[i + 2] * 1.8) for (let c = 0; c < 3; c++) ceu[i + c] = ceu[i - 4 + c];
}

// The ship sprite at density k: same scale as the painting (k·216/890).
const esc = (216 * K) / 890;
const nW = Math.max(1, Math.round(bw * esc)), nH = Math.max(1, Math.round(bh * esc));
const nave = await sharp(naveRGBA, { raw: { width: bw, height: bh, channels: 4 } }).resize(nW, nH, { kernel: 'lanczos3' }).raw().toBuffer();
for (let i = 3; i < nave.length; i += 4) nave[i] = nave[i] >= 128 ? 255 : 0;
// At the game resolution the ship's windows vanish and the hull melts into the clouds (a smudge with dots). The cold
// 1 px rim of the Leviathan (`_leviata-menor.mjs aro`) gives its shape back — the sky catching its top edge. At 4× his
// drawing reads on its own and stays untouched.
if (K === 1) {
  const op = (x, y) => x >= 0 && y >= 0 && x < nW && y < nH && nave[(y * nW + x) * 4 + 3] > 0;
  const aro = [];
  for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) if (op(x, y) && (!op(x, y - 1) || !op(x + 1, y - 1))) aro.push((y * nW + x) * 4);
  for (const i of aro) { nave[i] = 74; nave[i + 1] = 88; nave[i + 2] = 114; }
}
const naveX = (NAVE_CAIXA.x0 - CORTE.left) * esc, naveY = NAVE_CAIXA.y0 * esc;

// ─── 3. The lights: warm windows and red beacons, and the "off" layer ───────────────────────────────────────────
const tipo = new Uint8Array(W * H); // 1 = warm light, 2 = red beacon
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  if (cidade[i + 3] < 255) continue;
  const r = cidade[i], g = cidade[i + 1], b = cidade[i + 2];
  // A beacon is PURE red (19/10: the old test, g < 0.5 r, also took saturated orange facades — big groups that then
  // blinked as dark squares over the city).
  if (r >= 130 && g < r * 0.36 && b < r * 0.4) tipo[y * W + x] = 2;
  else if (r >= 105 && r > b + 45 && r > g * 1.12) tipo[y * W + x] = 1;
}
// 19/10, he: the off lights left holes ("algumas sombras apagam ou escurecem demais os pixels, deixando falhas").
// Two causes. The off pixel was the lit one ×0.2: near-black, darker than the wall around it, while the warm fringe
// the threshold missed kept glowing around the hole. And the off piece was an opaque crop of the city, drawn over the
// fog. Off now means the SURFACE without its light: each light pixel, and the warm fringe within F px of it, takes the
// colour of the unlit structure around it (the per-channel median of the cool, non-light pixels within R px). Every
// other pixel of apagadas.png is transparent, so a piece only touches what changes (and it sits under the fog).
// The white-hot core of a lamp misses the warm test (its blue is high too): a warm-white pixel next to a light is one.
for (let pass = 0; pass < 2; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const s = y * W + x, i = s * 4;
  if (tipo[s] || cidade[i + 3] < 255) continue;
  const r = cidade[i], g = cidade[i + 1], b = cidade[i + 2];
  if (lum(r, g, b) < 150 || r < b) continue;
  const t = tipo[s - 1] || tipo[s + 1] || tipo[s - W] || tipo[s + W];
  if (t) tipo[s] = t;
}
// A beacon stands alone against the dark: a red point touching a warm light (within 2K px) is a red-tinted bit of a
// lit window or door, and it goes with that light (19/10, he: a 2-pixel "beacon" inside a lit doorway took the whole
// building with it when it went off — a grey blot with a white dot).
{
  // "Warm light" here is AMBER (g ≥ 0.42 r): a beacon's own red glow also passes the warm test. And the test is being
  // SURROUNDED by it (a quarter of the box within K px): the first version, any amber within 2K px, also took the
  // real beacons on tower tops with lit windows just below — they stopped blinking (19/10, he).
  const vermelhos = [];
  const ambar = (q) => tipo[q] === 1 && cidade[q * 4 + 1] >= 0.42 * cidade[q * 4];
  for (let s = 0; s < W * H; s++) if (tipo[s] === 2) vermelhos.push(s);
  for (const s of vermelhos) {
    const x = s % W, y = (s / W) | 0;
    let n = 0, total = 0;
    for (let dy = -K; dy <= K; dy++) for (let dx = -K; dx <= K; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      total++;
      if (ambar(ny * W + nx)) n++;
    }
    if (n >= total / 4) tipo[s] = 1;
  }
  // And the red dots INSIDE a lit area (the citadel's lava stairs): measured on the ring 2K–3K px around each, the real
  // beacons have ≤ 4% warm-lit pixels (lum > 55, r > b + 20), the lava dots 7–20%. They stay as fixed lights of the
  // stairs (off, they left dark smudges on the glow).
  for (const s of vermelhos) {
    if (tipo[s] !== 2) continue;
    const x = s % W, y = (s / W) | 0;
    let aceso = 0, total = 0;
    for (let dy = -3 * K; dy <= 3 * K; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 2 * K) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = (ny * W + nx) * 4;
      if (cidade[j + 3] < 255) continue;
      total++;
      if (lum(cidade[j], cidade[j + 1], cidade[j + 2]) > 55 && cidade[j] > cidade[j + 2] + 20) aceso++;
    }
    if (total && aceso / total > 0.055) tipo[s] = 0;
  }
  // A tower's other lights: a red-orange point (r ≥ 120, g < 0.5 r, b < 0.45 r) on the same tower as a beacon (≤ 3 px
  // across, ≤ 14 px up or down, game px), and standing against the dark like it, is one of its lights — it blinks
  // with it (19/10, he: two lights on one tower out of step read wrong; this one was orange enough to be a "window").
  const farolPx = [];
  for (let s = 0; s < W * H; s++) if (tipo[s] === 2) farolPx.push([s % W, (s / W) | 0]);
  const escuroEmVolta = (x, y) => {
    let aceso = 0, total = 0;
    for (let dy = -3 * K; dy <= 3 * K; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 2 * K) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = (ny * W + nx) * 4;
      if (cidade[j + 3] < 255) continue;
      total++;
      if (lum(cidade[j], cidade[j + 1], cidade[j + 2]) > 55 && cidade[j] > cidade[j + 2] + 20) aceso++;
    }
    return total > 0 && aceso / total <= 0.055;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = y * W + x, i = s * 4;
    if (tipo[s] === 2 || cidade[i + 3] < 255) continue;
    const r = cidade[i], g = cidade[i + 1], b = cidade[i + 2];
    if (!(r >= 120 && g < 0.5 * r && b < 0.45 * r)) continue;
    if (!farolPx.some(([fx, fy]) => Math.abs(fx - x) <= 3 * K && Math.abs(fy - y) <= 14 * K)) continue;
    // Not a lamp in a lit ROW (a bridge deck): a tower light has the dark at its sides (one deck lamp under a beacon
    // came in, and going off it cut a gap in the deck's line of light).
    const acesoEm = (xx) => {
      if (xx < 0 || xx >= W) return false;
      const j = (y * W + xx) * 4;
      return lum(cidade[j], cidade[j + 1], cidade[j + 2]) > 45 && cidade[j] > cidade[j + 2] + 15;
    };
    if ([2 * K, 3 * K].some((d) => acesoEm(x - d) || acesoEm(x + d))) continue;
    if (escuroEmVolta(x, y)) tipo[s] = 2;
  }
}
const F = K;
const quenteP = (i) => cidade[i] > cidade[i + 2] + 8;
const muda = new Uint8Array(W * H); // 1 = a light pixel, 2 = its warm fringe
for (let s = 0; s < W * H; s++) if (tipo[s]) muda[s] = 1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const s = y * W + x;
  if (muda[s] || cidade[s * 4 + 3] < 255 || !quenteP(s * 4)) continue;
  let viz = false;
  for (let dy = -F; dy <= F && !viz; dy++) for (let dx = -F; dx <= F; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H && tipo[ny * W + nx]) { viz = true; break; }
  }
  if (viz) muda[s] = 2;
}
// A beacon's red glow reaches farther than a window's: when it goes off, its RED halo (within 3K px) goes too — red,
// not amber (r > 1.5 g: the old test, r > g + 6, also took the amber-lit walls around).
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const s = y * W + x, i = s * 4;
  if (muda[s] || cidade[i + 3] < 255 || !(cidade[i] > cidade[i + 1] * 1.5 && cidade[i] > cidade[i + 2] * 1.3)) continue;
  let viz = false;
  for (let dy = -3 * K; dy <= 3 * K && !viz; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H && tipo[ny * W + nx] === 2) { viz = true; break; }
  }
  if (viz) muda[s] = 2;
}
// The light lifted out of the painting: the changed pixels are filled from their unchanged surroundings by diffusion
// (each one the mean of its neighbours, swept until it settles) — the sky behind a beacon, the wall behind a window.
// (Two first tries failed: the median of the neighbours took the cloud behind a deck, a grey blot; the darker third
// took the mast under a beacon, a dark disc on the sky.)
const apagadas = Buffer.alloc(W * H * 4); // transparent but for what changes
const alvo = [];
for (let s = 0; s < W * H; s++) if (muda[s] && cidade[s * 4 + 3] === 255) alvo.push(s);
const val = new Float32Array(W * H * 3);
for (let s = 0; s < W * H; s++) for (let c = 0; c < 3; c++) val[s * 3 + c] = cidade[s * 4 + c];
const vale = (q) => cidade[q * 4 + 3] === 255; // the transparent window of sky does not feed the fill
for (const s of alvo) for (let c = 0; c < 3; c++) val[s * 3 + c] = 0;
for (let volta = 0; volta < 160; volta++) {
  const ida = volta % 2 === 0;
  for (let n = 0; n < alvo.length; n++) {
    const s = alvo[ida ? n : alvo.length - 1 - n], x = s % W, y = (s / W) | 0;
    let r = 0, g = 0, b = 0, peso = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (!vale(q)) continue;
      // Settled neighbours weigh more than the ones still being filled (a faster, steadier sweep).
      const p = muda[q] ? 0.5 : 1;
      r += val[q * 3] * p; g += val[q * 3 + 1] * p; b += val[q * 3 + 2] * p; peso += p;
    }
    if (peso) { val[s * 3] = r / peso; val[s * 3 + 1] = g / peso; val[s * 3 + 2] = b / peso; }
  }
}
for (const s of alvo) {
  const i = s * 4;
  [apagadas[i], apagadas[i + 1], apagadas[i + 2], apagadas[i + 3]] = [val[s * 3], val[s * 3 + 1], val[s * 3 + 2], 255].map(Math.round);
}
// Clusters (8-connected), in game pixels (k = 1 boxes, so both densities flicker the SAME windows).
const grupos = [];
const visto = new Uint8Array(W * H);
for (let s = 0; s < W * H; s++) {
  if (!tipo[s] || visto[s]) continue;
  const t = tipo[s], fila = [s]; visto[s] = 1;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  while (fila.length) {
    const c = fila.pop(); n++;
    const cx = c % W, cy = (c / W) | 0;
    x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (tipo[q] === t && !visto[q]) { visto[q] = 1; fila.push(q); }
    }
  }
  grupos.push({ tipo: t === 2 ? 'farol' : 'janela', x: x0 / K, y: y0 / K, w: (x1 - x0 + 1) / K, h: (y1 - y0 + 1) / K, n: n / (K * K) });
}

// ─── 4. The waterfall loop ──────────────────────────────────────────────────────────────────────────────────────
// Box in game pixels (measured on the k = 1 reduction); the water = the bright pixels inside it.
const AGUA = { x: 332, y: 134, w: 15, h: 26 };
const QUADROS_AGUA = 8;
const ax = Math.round(AGUA.x * K), ay = Math.round(AGUA.y * K), aw = Math.round(AGUA.w * K), ah = Math.round(AGUA.h * K);
const periodo = QUADROS_AGUA * K; // one game pixel of fall per frame → a seamless loop
let semente = 7;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const listras = [];
for (let x = 0; x < aw; x++) {
  const col = Array.from({ length: periodo }, () => rnd());
  // smooth along the fall
  listras.push(col.map((_, y) => (col[y] + col[(y + 1) % periodo] + col[(y + periodo - 1) % periodo]) / 3));
}
const aguaFolha = Buffer.alloc(aw * QUADROS_AGUA * ah * 4);
for (let f = 0; f < QUADROS_AGUA; f++) for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
  const i = ((ay + y) * W + (ax + x)) * 4;
  const r = cidade[i], g = cidade[i + 1], b = cidade[i + 2];
  const o = (y * aw * QUADROS_AGUA + f * aw + x) * 4;
  if (cidade[i + 3] < 255 || lum(r, g, b) < 70) continue; // only the water itself
  const v = listras[x][((y - f * K) % periodo + periodo) % periodo];
  const m = 0.72 + 0.62 * v;
  aguaFolha[o] = Math.min(255, Math.round(r * m));
  aguaFolha[o + 1] = Math.min(255, Math.round(g * m));
  aguaFolha[o + 2] = Math.min(255, Math.round(b * m));
  aguaFolha[o + 3] = 255;
}

// ─── 5. Write ───────────────────────────────────────────────────────────────────────────────────────────────────
const png = (buf, w, h, f) => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(OUT, f));
await png(ceu, W, H, 'ceu.png');
await png(cidade, W, H, 'cidade.png');
await png(apagadas, W, H, 'apagadas.png');
await png(nave, nW, nH, 'nave.png');
await png(aguaFolha, aw * QUADROS_AGUA, ah, 'cachoeira.png');
fs.writeFileSync(path.join(OUT, 'dados.json'), JSON.stringify({
  k: K, w: W, h: H,
  nave: { x: naveX / K, y: naveY / K, w: nW, h: nH },
  agua: { ...AGUA, quadros: QUADROS_AGUA, fw: aw, fh: ah },
  grupos,
}, null, 1));
console.log(OUT, `k=${K}`, `${W}x${H}`, 'nave', nW, nH, 'grupos', grupos.length,
  'janelas', grupos.filter((g) => g.tipo === 'janela').length, 'faróis', grupos.filter((g) => g.tipo === 'farol').length);
