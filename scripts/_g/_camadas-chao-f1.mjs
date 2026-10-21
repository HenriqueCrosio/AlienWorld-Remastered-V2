// BLOCO G · round 5 — THE GROUND from his two paintings (20/10, both 1768×890, in the painting's own frame):
//   "Valle Industrial Devastado sob Céu Transparente.png"  → chao-vale.png     the FAR ground (hazy hills, ruined towers,
//                                                                             smoke), behind the Paisagem;
//   "Paisagem Montanhosa Sombria com Brasas.png"          → chao-paisagem.png the NEAR ground (near-black mountains, embers),
//                                                                             the floor the structures stand on;
//   the Valle's own foot (hidden behind the Paisagem, so it repeats nowhere) → chao-frente.png, the low near-black rubble
//                                                                             strip IN FRONT of the structures' feet;
//   that strip mirrored, lower and darker                                   → chao-perto.png, the foreground in front of
//                                                                             the ship (only its stubs show).
// ⚠️ Run `_luzes-chao-f1.mjs` AFTER this one: it adds the embers (`brasas`) and the smoking fires to `chao.json`.
// Each one is the WHOLE painting reduced to the game (429×216 — his rule: the painting's original frame, never a zoom),
// cropped to its content rows, and made SEAMLESS horizontally by image quilting: the strip's end overlaps its start by
// `SOBRA` px and a minimum-error vertical seam (dynamic programming, ±1 px per row) decides, row by row, where the end
// hands over to the start. The tile is `429 − SOBRA` wide and repeats with no visible joint.
//   node scripts/_g/_camadas-chao-f1.mjs [outDir=public/sprites/f1] [sheetDir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada5]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [OUT = 'public/sprites/f1', FOLHA = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada5'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FOLHA, { recursive: true });
const RAW = 'assets/raw/';
const VALE = RAW + 'Valle Industrial Devastado sob Céu Transparente.png';
const PAIS = RAW + 'Paisagem Montanhosa Sombria com Brasas.png';
const W = 429, H = 216;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// ─── 1. The Paisagem's sky is a PAINTED checkerboard (no alpha channel) ────────────────────────────────────────────
// Flood the sky from the top edge through light pixels (L > 150: the checker is 232/254, the rock ≤ 90); the flood is
// alpha 0. Pixels touching it get a partial alpha by darkness, and every partial pixel takes the colour of the nearest
// fully opaque one, so no light halo survives the reduction.
async function chaveXadrez(src) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = lum(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  const ceu = new Uint8Array(w * h);
  const fila = [];
  for (let x = 0; x < w; x++) if (L[x] > 150) { ceu[x] = 1; fila.push(x); }
  while (fila.length) {
    const i = fila.pop(); const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (ceu[j] || L[j] <= 150) continue; ceu[j] = 1; fila.push(j);
    }
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let a = 255;
    if (ceu[i]) a = 0;
    else {
      const x = i % w, y = (i / w) | 0;
      let borda = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && ceu[ny * w + nx]) borda = true; }
      if (borda) a = Math.max(0, Math.min(255, Math.round(((235 - L[i]) / (235 - 40)) * 255)));
    }
    rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = a;
  }
  return descontaminar(rgba, w, h);
}

/** Every partial-alpha pixel takes the colour of the nearest fully opaque pixel (up to 6 px away). */
function descontaminar(rgba, w, h) {
  const cor = Buffer.from(rgba);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; const a = rgba[i * 4 + 3]; if (a === 255 || a === 0) continue;
    let melhor = -1, dm = 1e9;
    for (let r = 1; r <= 6 && melhor < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (rgba[j * 4 + 3] !== 255) continue; const d = dx * dx + dy * dy; if (d < dm) { dm = d; melhor = j; }
    }
    if (melhor >= 0) for (let c = 0; c < 3; c++) cor[i * 4 + c] = rgba[melhor * 4 + c];
  }
  return { buf: cor, w, h };
}

// ─── 2. Reduce like the painting (lanczos3 → 429×216, premultiplied) and make the alpha pixel art ──────────────────
// Binary alpha at 50%. ⚠️ The Valle's semi-transparent smoke columns are DROPPED here, not dithered: dithered at 1 px
// they read as a checkerboard over the towers (20/10). The smoke comes back animated, rising from the fires, in the game.
async function reduzir({ buf, w, h }) {
  const red = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).resize(W, H, { kernel: 'lanczos3', premultiplied: true }).raw().toBuffer();
  for (let i = 0; i < W * H; i++) red[i * 4 + 3] = red[i * 4 + 3] >= 200 ? 255 : 0;
  return red;
}

// ─── 3. Seamless by quilting ─────────────────────────────────────────────────────────────────────────────────────
// The strip's last SOBRA columns and its first SOBRA columns are the SAME place once the tile repeats. Per row, the seam
// column s(y) ∈ [0, SOBRA): left of it the pixel comes from the end (A[P + c]), right of it from the start (A[c]).
function emendar(A, w, h, sobra) {
  const P = w - sobra;
  const custo = (y, c) => {
    const i = (y * w + P + c) * 4, j = (y * w + c) * 4;
    const ai = A[i + 3] > 0, aj = A[j + 3] > 0;
    if (!ai && !aj) return 0;
    if (ai !== aj) return 3000; // a skyline step is the worst joint there is
    return Math.abs(A[i] - A[j]) + Math.abs(A[i + 1] - A[j + 1]) + Math.abs(A[i + 2] - A[j + 2]);
  };
  // also forbid the very edges of the overlap (a seam at c = 0 would leave the end/start joint as it was)
  const borda = 3;
  const D = new Float64Array(h * sobra), V = new Int16Array(h * sobra);
  for (let c = 0; c < sobra; c++) D[c] = c < borda || c >= sobra - borda ? 1e12 : custo(0, c);
  for (let y = 1; y < h; y++) for (let c = 0; c < sobra; c++) {
    let best = 1e18, bc = c;
    for (const dc of [-1, 0, 1]) { const cc = c + dc; if (cc < 0 || cc >= sobra) continue; const v = D[(y - 1) * sobra + cc]; if (v < best) { best = v; bc = cc; } }
    D[y * sobra + c] = best + (c < borda || c >= sobra - borda ? 1e12 : custo(y, c));
    V[y * sobra + c] = bc;
  }
  let c = 0, best = 1e18;
  for (let k = 0; k < sobra; k++) if (D[(h - 1) * sobra + k] < best) { best = D[(h - 1) * sobra + k]; c = k; }
  const seam = new Int16Array(h);
  for (let y = h - 1; y >= 0; y--) { seam[y] = c; c = V[y * sobra + c]; }
  const T = Buffer.alloc(P * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < P; x++) {
    const src = x < sobra && x < seam[y] ? P + x : x;
    A.copy(T, (y * P + x) * 4, (y * w + src) * 4, (y * w + src) * 4 + 4);
  }
  return { T, P, custoTotal: Math.round(best) };
}

/** The first row with anything opaque (minus a 1-px margin): the strip is stored from there down. */
function topoDoConteudo(A, w, h) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (A[(y * w + x) * 4 + 3] > 0) return Math.max(0, y - 1);
  return h;
}
const cortar = (A, w, y0, y1) => A.subarray(y0 * w * 4, y1 * w * 4);

// ─── 4. The front rubble strip, from the Valle ───────────────────────────────────────────────────────────────────
// ⚠️ NOT BY A DARKNESS THRESHOLD: thresholding the Valle's foot gave rectangles with vertical walls (the cordilheira's
// failure again, 20/10). The CONTOUR is his: the Valle's own skyline (from the seamless tile, so it is already
// periodic), MIRRORED (it must not echo the layer behind) and FLATTENED from ~60 px of relief to `relevo` — mountains
// squashed to rubble keep their jagged small-scale edge, and the towers become broken stubs. The FILL is the Valle's foot
// (the rows the Paisagem hides, so the texture repeats nowhere), darkened: the nearest plane is the darkest. A 1-px rim
// of the rock's lit edge on top separates it from the floor behind.
// ⚠️ LOCAL relief, not global: normalised over the whole skyline, the towers at the Valle's ends (60 px) flattened
// everything else to 2–3 px (a flat strip with two blocks, 20/10). So the skyline is split into its slow swell (a
// circular moving average, ±RAIO px) and its jagged detail (skyline − swell); each is normalised by its own 95th
// percentile and they add up: `ondula` px of swell plus `relevo` px of jag.
const FRENTE = { y0: 188, alturaMin: 13, raio: 22, ondula: 4, relevo: 9, gama: 1.2, escurece: 0.55, aro: [18, 21, 28] };
function faixaDaFrente(tile, P, hTile, yTile, ceuDe = tile, PCeu = P, hCeu = hTile) {
  const ceu = new Float32Array(P);
  for (let x = 0; x < P; x++) {
    const xs = Math.round(((P - 1 - x) * PCeu) / P); // mirrored
    let y = 0; while (y < hCeu && ceuDe[(y * PCeu + xs) * 4 + 3] === 0) y++; ceu[x] = -y; // higher = bigger
  }
  const swell = new Float32Array(P);
  for (let x = 0; x < P; x++) { let s = 0; for (let d = -FRENTE.raio; d <= FRENTE.raio; d++) s += ceu[(x + d + P) % P]; swell[x] = s / (2 * FRENTE.raio + 1); }
  const jag = ceu.map((v, x) => Math.max(0, v - swell[x]));
  const p95 = (a) => { const s = Array.from(a).sort((p, q) => p - q); return s[Math.floor(s.length * 0.95)] || 1; };
  const sMin = Math.min(...swell);
  const sw = swell.map((v) => v - sMin);
  const nSw = p95(sw), nJag = p95(jag);
  const y0 = FRENTE.y0, h = H - y0;
  const F = Buffer.alloc(P * h * 4);
  let cobreDe = 0; // the LOWEST top of the strip (screen y): every foot planted below it stays hidden
  for (let x = 0; x < P; x++) {
    const a = Math.min(1, sw[x] / nSw), b = Math.pow(Math.min(1, jag[x] / nJag), FRENTE.gama);
    const topo = H - FRENTE.alturaMin - Math.round(FRENTE.ondula * a + FRENTE.relevo * b);
    cobreDe = Math.max(cobreDe, topo);
    for (let y = Math.max(y0, topo); y < H; y++) {
      const ty = y - yTile; // the same screen row of the Valle tile (its foot)
      const i = (ty * P + x) * 4, o = ((y - y0) * P + x) * 4;
      const aro = y === topo;
      for (let c = 0; c < 3; c++) F[o + c] = aro ? FRENTE.aro[c] : Math.round(tile[i + c] * FRENTE.escurece);
      F[o + 3] = 255;
    }
  }
  return { F, h, y0, P, cobreDe };
}

// ─── run ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const pais = await reduzir(await chaveXadrez(PAIS));
const valeRaw = await sharp(VALE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const vale = await reduzir(descontaminar(valeRaw.data, valeRaw.info.width, valeRaw.info.height));

// ─── 6. THE TONE CADENCE ─────────────────────────────────────────────────────────────────────────────────────────
// 20/10, he: "algumas camadas estão com um cinza claro muito forte e estão entre camadas escuras … não respeita o padrão
// de uso em parallax da cadência de tons". Measured on screen (`_cadencia-chao.mjs`): the painting behind p50 17 / p90 42,
// the Valle 24 / 75, the Paisagem 31 / 51 — the two NEARER planes lighter than the far one. Each plane is re-toned with
// L' = a·L^γ (γ and a fitted so that its VISIBLE part lands on the target p50/p90; the hue kept, RGB scaled by L'/L), one
// step darker per plane. The warm lights (embers, fires) are left as they are: they are light, not rock.
const CADENCIA = { vale: { p50: 14, p90: 32 }, paisagem: { p50: 10, p90: 22 } };
const quente = (r, g, b) => r >= 90 && r > b + 40 && r > g * 1.1;
function graduar(A, visivel, alvo) {
  const ls = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (A[i + 3] === 0 || !visivel(x, y) || quente(A[i], A[i + 1], A[i + 2])) continue;
    ls.push(lum(A[i], A[i + 1], A[i + 2]));
  }
  ls.sort((p, q) => p - q);
  const p50 = ls[Math.floor(ls.length * 0.5)], p90 = ls[Math.floor(ls.length * 0.9)];
  const gama = Math.log(alvo.p90 / alvo.p50) / Math.log(p90 / p50);
  const a = alvo.p50 / Math.pow(p50, gama);
  for (let s = 0; s < W * H; s++) {
    const i = s * 4;
    if (A[i + 3] === 0 || quente(A[i], A[i + 1], A[i + 2])) continue;
    const L = lum(A[i], A[i + 1], A[i + 2]);
    if (L < 0.5) continue;
    const k = (a * Math.pow(L, gama)) / L;
    for (let c = 0; c < 3; c++) A[i + c] = Math.min(255, Math.round(A[i + c] * k));
  }
  return `p50 ${Math.round(p50)}→${alvo.p50}, p90 ${Math.round(p90)}→${alvo.p90} (γ ${gama.toFixed(2)})`;
}
// The Valle shows where the Paisagem (same frame) does not cover it; the Paisagem shows above the front strip.
console.log('vale', graduar(vale, (x, y) => pais[(y * W + x) * 4 + 3] === 0, CADENCIA.vale));
console.log('paisagem', graduar(pais, (x, y) => y < 200, CADENCIA.paisagem));

const SOBRA = 48;
const dados = {};
const tiles = {};
for (const [nome, A] of [['vale', vale], ['paisagem', pais]]) {
  const y0 = topoDoConteudo(A, W, H);
  const faixa = Buffer.from(cortar(A, W, y0, H));
  const { T, P, custoTotal } = emendar(faixa, W, H - y0, SOBRA);
  await sharp(T, { raw: { width: P, height: H - y0, channels: 4 } }).png().toFile(path.join(OUT, `chao-${nome}.png`));
  dados[nome] = { chave: `f1-chao-${nome}`, w: P, h: H - y0, y: y0 };
  tiles[nome] = { T, P, h: H - y0, y: y0 };
  console.log(nome, `${P}×${H - y0} from y ${y0}; seam cost ${custoTotal}`);
}
{
  // the fill from the Valle's foot; the contour from the PAISAGEM's skyline (mountain-jagged, no towers), mirrored
  const v = tiles.vale, p = tiles.paisagem;
  const { F, h, y0, P, cobreDe } = faixaDaFrente(v.T, v.P, v.h, v.y, p.T, p.P, p.h);
  await sharp(F, { raw: { width: P, height: h, channels: 4 } }).png().toFile(path.join(OUT, 'chao-frente.png'));
  dados.frente = { chave: 'f1-chao-frente', w: P, h, y: y0, cobreDe };
  console.log('frente', `${P}×${h} from y ${y0} (periodic by construction)`);

  // ─── 5. The NEAREST plane (the foreground, in front of the ship): the front strip MIRRORED, pushed down so only its
  // stubs show at the very bottom, and darker still. It replaces the ice spire tinted blue (blue blots on the new ground,
  // 20/10). Cut rocks were tried first: an envelope gave smooth cones and bells, and the painting's inner detail read as a
  // tiny distant landscape, not a rock passing close (20/10).
  const PERTO = { desce: 10, escurece: 0.5, aro: [12, 14, 19] };
  const hp = h - PERTO.desce;
  const Pp = Buffer.alloc(P * hp * 4);
  for (let y = 0; y < hp; y++) for (let x = 0; x < P; x++) {
    const i = (y * P + (P - 1 - x)) * 4, o = (y * P + x) * 4;
    if (F[i + 3] === 0) continue;
    const aro = y === 0 || F[i - P * 4 + 3] === 0;
    for (let c = 0; c < 3; c++) Pp[o + c] = aro ? PERTO.aro[c] : Math.round(F[i + c] * PERTO.escurece);
    Pp[o + 3] = 255;
  }
  await sharp(Pp, { raw: { width: P, height: hp, channels: 4 } }).png().toFile(path.join(OUT, 'chao-perto.png'));
  dados.perto = { chave: 'f1-chao-perto', w: P, h: hp, y: y0 + PERTO.desce };
  console.log('perto', `${P}×${hp} from y ${y0 + PERTO.desce}`);
}
fs.writeFileSync(path.join(OUT, 'chao.json'), JSON.stringify(dados));

// The sheet: each strip tiled ×2 (the joint in the middle, marked by a tick under it) at ×3, on magenta.
for (const nome of ['vale', 'paisagem', 'frente']) {
  const d = dados[nome];
  const tile = await sharp(path.join(OUT, `chao-${nome}.png`)).png().toBuffer();
  const duas = await sharp({ create: { width: d.w * 2, height: d.h + 3, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } } })
    .composite([{ input: tile, left: 0, top: 0 }, { input: tile, left: d.w, top: 0 },
      { input: { create: { width: 1, height: 3, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }, left: d.w, top: d.h }])
    .png().toBuffer();
  await sharp(duas).resize(d.w * 2 * 3, (d.h + 3) * 3, { kernel: 'nearest' }).toFile(path.join(FOLHA, `emenda-${nome}.png`));
}
