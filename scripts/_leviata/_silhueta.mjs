// BLOCO D · the DISTANT SILHOUETTE of the new Leviathan (F1 end, F2, F3 — `Parallax.leviathan`), from the menu swim he
// approved (PixMiniMax 92, *"como silhueta ele mascara as imperfeições e deixa o movimento mais fluido"*) and his
// answer of 18/10: the WHOLE body far away. The raw unlit frames (`cenas/nado/gera-92`, 176×80) are snapped to the
// base palette and reduced to 133×60 — the largest it is ever drawn (F2 at the boss = 116 × 1.15; the game draws it
// at ≤ 1, `fundos-pintados-resolucao-nativa`) — and only THEN lit for distance, so the rim stays 1 px.
// Today's tint (0x2a3352, far = dark) sinks the near-black new body: at the start of F2 it was invisible. The
// treatments differ in how the distance is baked:
//   menu   — the menu moonlight (`_luz-lua.mjs`) as is; the game keeps today's tint and alpha (the reference);
//   arolava — the hull sunk toward the night of space, a cold 1 px rim on the top edges, the lava kept (light only
//             where there is energy);
//   aro    — a flat dark silhouette with only the cold rim;
//   lava   — a flat dark silhouette with only the lava cracks glowing (like the colony lights from orbit).
// Writes `<outDir>/<trat>/sheet.png` (16 × 133×60) and `<outDir>/<trat>/q0.png`, plus a ×4 strip of frame 0.
//   node scripts/_leviata/_silhueta.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { iluminar, semIlhas } from './_luz-lua.mjs';

const [outDir = 'docs/superpowers/folhas/2026-10-19/leviata/silhueta'] = process.argv.slice(2);
const CRU = 'docs/superpowers/folhas/2026-10-18/leviata/cenas/nado/gera-92';
const BASE = 'docs/superpowers/folhas/2026-10-18/leviata/aprovado/leviata-base.png';
const N = 16, W = 133, H = 60;

const { data: bd, info: bi } = await sharp(BASE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const PAL = [...new Set(Array.from({ length: bi.width * bi.height }, (_, p) => p * 4).filter((i) => bd[i + 3] > 200)
  .map((i) => (bd[i] << 16) | (bd[i + 1] << 8) | bd[i + 2]))].map((c) => [c >> 16, (c >> 8) & 255, c & 255]);
const cache = new Map();
const snap = (r, g, b) => {
  const k = (r << 16) | (g << 8) | b;
  if (cache.has(k)) return cache.get(k);
  let m = PAL[0], d0 = Infinity;
  for (const c of PAL) { const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (d < d0) { d0 = d; m = c; } }
  cache.set(k, m);
  return m;
};

/** One raw frame → w×h (133×60 by default), alpha 0/255, base palette, no specks. The whole frame is resized (never
 *  trimmed): the 16 frames stay registered on each other. The buffer carries its own size (`d.w`, `d.h`). */
const reduzir = (i) => reduzirPara(i, W, H);
async function reduzirPara(i, W, H) {
  const src = await sharp(path.join(CRU, `${i}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let k = 0; k < src.data.length; k += 4) {
    src.data[k + 3] = src.data[k + 3] >= 128 ? 255 : 0;
    if (src.data[k + 3]) [src.data[k], src.data[k + 1], src.data[k + 2]] = snap(src.data[k], src.data[k + 1], src.data[k + 2]);
  }
  const { data } = await sharp(src.data, { raw: src.info }).resize(W, H, { fit: 'fill', kernel: 'mitchell' }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  for (let k = 0; k < data.length; k += 4) {
    data[k + 3] = data[k + 3] >= 110 ? 255 : 0;
    if (data[k + 3]) [data[k], data[k + 1], data[k + 2]] = snap(data[k], data[k + 1], data[k + 2]);
  }
  semIlhas(data, W, H, W < 80 ? 3 : 4);
  data.w = W;
  data.h = H;
  // The LAVA is sampled from the source at the pixel's CENTRE (nearest): the resize blended the thin cracks into the
  // hull and left a few specks, and taking "any" lava under the pixel fattened them into camouflage blotches.
  const SX = src.info.width / W, SY = src.info.height / H;
  const lava = new Array(W * H).fill(null);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!data[(y * W + x) * 4 + 3]) continue;
    const i = (Math.floor((y + 0.5) * SY) * src.info.width + Math.floor((x + 0.5) * SX)) * 4;
    if (src.data[i + 3] && ehLava(src.data, i)) lava[y * W + x] = [src.data[i], src.data[i + 1], src.data[i + 2]];
  }
  data.lava = lava;
  return data;
}

function ehLava(d, i) { return d[i] > 110 && d[i] > d[i + 2] * 1.8; }
const opaco = (d, x, y) => x >= 0 && y >= 0 && x < d.w && y < d.h && d[(y * d.w + x) * 4 + 3] > 0;
const borda = (d, x, y) => !opaco(d, x, y - 1) || !opaco(d, x + 1, y - 1);

// The distance palette: the night of space the body sinks into, and the cold light that still catches its back.
const NOITE = [12, 15, 26];
// A flat silhouette, and a step lighter in the 2 rows under the rim. ⚠️ 19/10: it was (13,16,27) — luminance ≈16, the
// SAME as the F1/F2 sky behind it (10–30): in the game the body vanished and only the rim was left, a loose squiggle.
// A shadow reads only if it is darker than what is behind it: near-black now.
const CHAPADO = [[5, 6, 11], [10, 12, 20]];
const ARO = [92, 108, 138];

const TRATAMENTOS = {
  menu: (d) => iluminar(d, W, H),
  arolava: (d) => {
    const o = Buffer.from(d);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!d[i + 3]) continue;
      let c;
      const lv = d.lava[y * W + x];
      if (borda(d, x, y)) c = ARO;
      else if (lv) c = [Math.round(lv[0] * 0.85), Math.round(lv[1] * 0.8), Math.round(lv[2] * 0.8)];
      else c = [0, 1, 2].map((k) => Math.round(d[i + k] * 0.55 + NOITE[k] * 0.45));
      [o[i], o[i + 1], o[i + 2]] = c;
    }
    return o;
  },
  aro: (d) => {
    const o = Buffer.from(d);
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      const i = (y * d.w + x) * 4;
      if (!d[i + 3]) continue;
      [o[i], o[i + 1], o[i + 2]] = borda(d, x, y) ? ARO : CHAPADO[opaco(d, x, y - 2) ? 0 : 1];
    }
    return o;
  },
  lava: (d) => {
    const o = Buffer.from(d);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!d[i + 3]) continue;
      const lv = d.lava[y * W + x];
      [o[i], o[i + 1], o[i + 2]] = lv ? [lv[0], Math.round(lv[1] * 0.9), lv[2]] : CHAPADO[0];
    }
    return o;
  },
};

// ─── LONGE (19/10, his pick): the `aro` treatment baked at EVERY width the game draws, 1 px apart. His notes: a
// colossus drawn big reads small (*"dependendo do tamanho que ele aparece no fundo, vai parecer que ele é menor do
// que é"*), far away it is only a shadow (*"é apenas uma sombra que mostra que ele está distante"*), and it barely
// moves. Drawn small, the 133 px art reduced by the engine broke the 1 px rim into dots — so each width is reduced
// from the raw frame and lit at its own size. One sheet, a row per width (WMIN…WMAX), 16 swim frames per row, every
// cell FW×FH with the body centred: frame = (w − WMIN) × 16 + swim frame.
//   node scripts/_leviata/_silhueta.mjs longe [out=public/sprites/leviathan-longe-sheet.png]
if (outDir === 'longe') {
  const OUT = process.argv[3] ?? 'public/sprites/leviathan-longe-sheet.png';
  const WMIN = 28, WMAX = 72, FW = WMAX, FH = Math.ceil((WMAX * 80) / 176);
  const linhas = WMAX - WMIN + 1;
  const comps = [];
  for (let w = WMIN; w <= WMAX; w++) {
    const h = Math.round((w * 80) / 176);
    for (let i = 0; i < N; i++) {
      const d = await reduzirPara(i, w, h);
      const png = await sharp(TRATAMENTOS.aro(d), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
      comps.push({ input: png, left: i * FW + Math.floor((FW - w) / 2), top: (w - WMIN) * FH + Math.floor((FH - h) / 2) });
    }
  }
  await sharp({ create: { width: FW * N, height: FH * linhas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comps).png().toFile(OUT);
  console.log(OUT, `${linhas} larguras (${WMIN}–${WMAX}) × ${N} quadros, células de ${FW}×${FH}`);
  process.exit(0);
}

const quadros = [];
for (let i = 0; i < N; i++) quadros.push(await reduzir(i));
const tiras = [];
for (const [nome, f] of Object.entries(TRATAMENTOS)) {
  const dir = path.join(outDir, nome);
  fs.mkdirSync(dir, { recursive: true });
  const pngs = [];
  for (const q of quadros) pngs.push(await sharp(f(q), { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
  await sharp({ create: { width: W * N, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(pngs.map((input, k) => ({ input, left: k * W, top: 0 }))).png().toFile(path.join(dir, 'sheet.png'));
  fs.writeFileSync(path.join(dir, 'q0.png'), pngs[0]);
  tiras.push(await sharp(pngs[0]).resize(W * 4, H * 4, { kernel: 'nearest' }).png().toBuffer());
  console.log(nome);
}
await sharp({ create: { width: W * 4 * 2 + 16, height: H * 4 * 2 + 16, channels: 4, background: '#1a1630' } })
  .composite(tiras.map((input, k) => ({ input, left: (k % 2) * (W * 4 + 16), top: Math.floor(k / 2) * (H * 4 + 16) })))
  .png().toFile(path.join(outDir, 'tratamentos-x4.png'));
