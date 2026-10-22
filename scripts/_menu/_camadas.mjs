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
import { lum, detectarLuzes, marcarMuda, apagarPorDifusao, apagarFarolPelaTinta, gruposDeLuz } from '../_cenario/luzes.mjs';

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

// ─── 3. The lights: warm windows and red beacons, and the "off" layer (rules in scripts/_cenario/luzes.mjs) ──────
const tipo = detectarLuzes(cidade, W, H, K);
const muda = marcarMuda(cidade, W, H, K, tipo);
const apagadas = apagarPorDifusao(cidade, W, H, muda);
const grupos = gruposDeLuz(tipo, W, H, K);

// ─── 3b. 22/10, he: three lights that went off wrong. The rest of the menu is approved ("impecável"), so the fix is
// HERE, only for them, and only in their off pieces: the detection, the groups and so the lights the game picks to
// blink do not change. Boxes in game px; the margins are the game's crop (`FAROIS.margem` / `JANELAS.margem` and the
// `areaMax` of `src/menu/numerosMenu.ts`).
const CORRECOES = {
  // The antenna tower, far left: its beacons took the red-lit mast and the beige corner of the top with them (sky
  // by diffusion) — "the tower vanishes". They go off by losing their red (`apagarFarolPelaTinta`).
  torreDaAntena: [34, 44, 44, 57],
  // Two "windows" that are the beige light of a tower corner (the left tower; the citadel, by the title): off, the
  // fill had only the dark side to feed on and cut a black notch in the corner. They are not lights: they don't go off.
  quinas: [[41, 65, 44, 72], [250, 45, 254, 52]],
};
{
  const centroEm = (g, [x0, y0, x1, y1]) => g.x + g.w / 2 > x0 && g.x + g.w / 2 < x1 && g.y + g.h / 2 > y0 && g.y + g.h / 2 < y1;
  const recorte = (g, m, cada) => {
    const x0 = Math.floor((g.x - m) * K), y0 = Math.floor((g.y - m) * K);
    const x1 = x0 + Math.ceil((g.w + 2 * m) * K), y1 = y0 + Math.ceil((g.h + 2 * m) * K);
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) cada(y * W + x);
  };
  const dentro = new Uint8Array(W * H);
  for (const g of grupos) if (g.tipo === 'farol' && g.n <= 4 && centroEm(g, CORRECOES.torreDaAntena)) recorte(g, 3, (s) => (dentro[s] = 1));
  for (let s = 0; s < W * H; s++) if (dentro[s]) apagadas[s * 4 + 3] = 0; // only what changes is in the piece
  for (const [s, r, g, b] of apagarFarolPelaTinta(cidade, W, H, tipo, dentro)) {
    apagadas[s * 4] = r; apagadas[s * 4 + 1] = g; apagadas[s * 4 + 2] = b; apagadas[s * 4 + 3] = 255;
  }
  for (const caixa of CORRECOES.quinas) {
    for (const g of grupos) if (g.tipo === 'janela' && g.n <= 6 && centroEm(g, caixa)) recorte(g, 1, (s) => (apagadas[s * 4 + 3] = 0));
  }
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
