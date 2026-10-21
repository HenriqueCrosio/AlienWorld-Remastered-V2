// BLOCO G · round 2 — the pieces of the invasion of the F1 horizon, all baked in pixels in HIS painting's palette
// (the "scene effects are baked" rule). Writes into public/sprites/f1/:
//   nave-invasora{,-2}.png  the stage's own enemies (gunship, carrier) reduced and darkened to far silhouettes, one
//                    magenta eye pixel;
//   explosao.png     the Leviathan crash explosion of the final cutscene (`f8-explosao-sheet.png`), cropped to its
//                    fireball and smoke, reduced to a far blast (his pick, 20/10: that explosion "pode servir de
//                    complemento para as explosões do jogo"), 24 frames side by side;
//   fumaca.png       a rising smoke column, 8 frames (looping), dithered;
//   fogo.png         a small fire, 6 frames;
//   tracante.png     an anti-aircraft tracer (5×1, bright head); flak.png a flak puff, 5 frames of 7×7;
//   invasao.json     the frame sizes.
// (No cut-out of the hills: a per-column ridge against the clouds was tried at 1× (20/10) and jumped between stray
// points — clouds and hills differ by a few levels in this painting. The ships fade into the haze as they come down
// instead, which reads as landing far away; see `src/f1/invasao.ts`.)
//   node scripts/_g/_invasao-f1.mjs [outDir=public/sprites/f1] [sheetDir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada2]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [OUT = 'public/sprites/f1', FOLHA = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada2'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FOLHA, { recursive: true });
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
let semente = 911;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const png = (buf, w, h, f) => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(OUT, f));
// ─── 1. The invader ships: the stage's enemies, far away ─────────────────────────────────────────────────────────
// Reduced (the "back layer shrinks" rule), pushed toward the night sky (they are far, in the haze), the cold rim of
// the top edge kept, and ONE magenta eye pixel where the sprite's own magenta is.
const NAVES = [
  { src: 'public/sprites/enemy-gunship.png', largura: 14, arquivo: 'nave-invasora.png' },
  { src: 'public/sprites/enemy-carrier.png', largura: 18, arquivo: 'nave-invasora-2.png' },
];
const NOITE = [14, 18, 27];
const naves = [];
for (const n of NAVES) {
  const m = await sharp(n.src).metadata();
  const h = Math.max(1, Math.round((m.height * n.largura) / m.width));
  const orig = await sharp(n.src).ensureAlpha().raw().toBuffer();
  // the magenta eye in the original: the most magenta pixel
  let olho = 0, melhor = -1e9;
  for (let s = 0; s < m.width * m.height; s++) {
    const i = s * 4;
    if (orig[i + 3] < 128) continue;
    const v = orig[i] + orig[i + 2] - 2 * orig[i + 1];
    if (v > melhor) { melhor = v; olho = s; }
  }
  const ox = Math.min(n.largura - 1, Math.round(((olho % m.width) * n.largura) / m.width));
  const oy = Math.min(h - 1, Math.round((((olho / m.width) | 0) * h) / m.height));
  const red = await sharp(n.src).resize(n.largura, h, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  for (let s = 0; s < n.largura * h; s++) {
    const i = s * 4;
    red[i + 3] = red[i + 3] >= 110 ? 255 : 0;
    for (let c = 0; c < 3; c++) red[i + c] = Math.round(red[i + c] * 0.25 + NOITE[c] * 0.75);
  }
  for (let x = 0; x < n.largura; x++) for (let y = 0; y < h; y++) {
    const i = (y * n.largura + x) * 4;
    if (red[i + 3]) { red[i] = 52; red[i + 1] = 62; red[i + 2] = 82; break; } // the cold rim on the top edge
  }
  const io = (oy * n.largura + ox) * 4;
  [red[io], red[io + 1], red[io + 2], red[io + 3]] = [176, 52, 118, 255];
  await png(red, n.largura, h, n.arquivo);
  naves.push({ w: n.largura, h });
}

// ─── 2. The far blast: the crash explosion of the final cutscene, reduced ────────────────────────────────────────
const EXP = { src: 'public/sprites/f8-explosao-sheet.png', fw: 384, fh: 216, cols: 6, quadros: 48, passo: 2, largura: 34 };
const folhaExp = await sharp(EXP.src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const FW = folhaExp.info.width;
let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
for (let f = 0; f < EXP.quadros; f++) {
  const ox = (f % EXP.cols) * EXP.fw, oy = Math.floor(f / EXP.cols) * EXP.fh;
  for (let y = 0; y < EXP.fh; y++) for (let x = 0; x < EXP.fw; x++) {
    if (folhaExp.data[((oy + y) * FW + ox + x) * 4 + 3] > 40) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
  }
}
const ew = EXP.largura, eh = Math.max(1, Math.round(((by1 - by0 + 1) * ew) / (bx1 - bx0 + 1)));
const nExp = Math.floor(EXP.quadros / EXP.passo);
const expFolha = Buffer.alloc(ew * nExp * eh * 4);
for (let q = 0; q < nExp; q++) {
  const f = q * EXP.passo;
  const ox = (f % EXP.cols) * EXP.fw, oy = Math.floor(f / EXP.cols) * EXP.fh;
  const red = await sharp(EXP.src).extract({ left: ox + bx0, top: oy + by0, width: bx1 - bx0 + 1, height: by1 - by0 + 1 })
    .resize(ew, eh, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) {
    const i = (y * ew + x) * 4, o = (y * ew * nExp + q * ew + x) * 4;
    const a = red[i + 3] / 255;
    if (!(a > 0.86 || a > BAYER4[(y % 4) * 4 + (x % 4)])) continue;
    // far: the smoke takes a little of the night haze; the fire keeps its heat
    const quente = red[i] > red[i + 2] + 40;
    for (let c = 0; c < 3; c++) expFolha[o + c] = quente ? red[i + c] : Math.round(red[i + c] * 0.8 + [33, 41, 58][c] * 0.2);
    expFolha[o + 3] = 255;
  }
}
await png(expFolha, ew * nExp, eh, 'explosao.png');

// ─── 3. Smoke: a rising column, 8 frames ─────────────────────────────────────────────────────────────────────────
// Puffs that rise PERIOD px over the loop and widen with height, each lit a little on its left (the colony fire below
// lights it from beneath); density dithered (no partial alpha).
const FUM = { w: 12, h: 44, quadros: 8, puffs: 11 };
const puffs = Array.from({ length: FUM.puffs }, (_, k) => ({ y0: (k / FUM.puffs) * FUM.h, dx: (rnd() - 0.5) * 3, r: 2.4 + rnd() * 2.2, d: 0.7 + rnd() * 0.5 }));
const fumaca = Buffer.alloc(FUM.w * FUM.quadros * FUM.h * 4);
for (let f = 0; f < FUM.quadros; f++) {
  const dens = new Float32Array(FUM.w * FUM.h);
  for (const p of puffs) {
    const y = (((p.y0 - (f * FUM.h) / FUM.quadros) % FUM.h) + FUM.h) % FUM.h; // rising, wrapping
    const sobe = 1 - y / FUM.h; // 0 at the base, 1 at the top
    const cx = FUM.w / 2 + p.dx + sobe * 2.5; // the wind leans it right
    const r = p.r * (0.7 + sobe * 0.9);
    for (let yy = 0; yy < FUM.h; yy++) for (let xx = 0; xx < FUM.w; xx++) {
      const d = Math.hypot(xx - cx, (yy - y) * 0.8) / r;
      if (d < 1) dens[yy * FUM.w + xx] += p.d * (1 - d * d) * (1 - sobe * 0.7);
    }
  }
  for (let y = 0; y < FUM.h; y++) for (let x = 0; x < FUM.w; x++) {
    // Solid where it is thick; the ordered dither only on the thin fringe (a dithered core read as static, 20/10). The
    // tone follows the density in three steps (the puffs' cores lighter, their rims darker: a solid single tone read as
    // a pillar, 20/10), and the base catches the fire's light.
    // ...and it thins out over the top third instead of ending in a flat cut.
    const v = Math.min(1.4, dens[y * FUM.w + x]) * Math.min(1, y / (FUM.h * 0.33));
    if (!(v > 0.5 || (v > 0.15 && (v - 0.15) / 0.35 > BAYER4[(y % 4) * 4 + (x % 4)]))) continue;
    const o = (y * FUM.w * FUM.quadros + f * FUM.w + x) * 4;
    const baixo = y / FUM.h;
    const tom = v > 1 ? 1 : v > 0.7 ? 0.55 : 0;
    const c = [28 + 22 * tom + 20 * baixo * baixo, 29 + 20 * tom + 8 * baixo * baixo, 35 + 20 * tom + 2 * baixo];
    for (let k = 0; k < 3; k++) fumaca[o + k] = Math.round(c[k]);
    fumaca[o + 3] = 255;
  }
}
await png(fumaca, FUM.w * FUM.quadros, FUM.h, 'fumaca.png');

// ─── 4. Fire: 6 frames, 5×7 ─────────────────────────────────────────────────────────────────────────────────────
const FOGO = { w: 5, h: 7, quadros: 6 };
const fogo = Buffer.alloc(FOGO.w * FOGO.quadros * FOGO.h * 4);
const CORES_FOGO = [[255, 236, 186], [246, 168, 76], [196, 92, 40], [118, 44, 28]];
for (let f = 0; f < FOGO.quadros; f++) {
  const alto = 3 + Math.round(rnd() * 3);
  for (let y = 0; y < FOGO.h; y++) for (let x = 0; x < FOGO.w; x++) {
    const doChao = FOGO.h - 1 - y; // 0 at the base
    const meio = Math.abs(x - 2);
    const largura = Math.max(0, 2.6 - doChao * (2.4 / alto)) + (rnd() - 0.5) * 0.8;
    if (meio > largura || doChao > alto) continue;
    const quente = 1 - (meio / Math.max(0.5, largura)) * 0.5 - doChao / (alto + 1) * 0.6;
    const k = quente > 0.75 ? 0 : quente > 0.5 ? 1 : quente > 0.28 ? 2 : 3;
    const o = (y * FOGO.w * FOGO.quadros + f * FOGO.w + x) * 4;
    [fogo[o], fogo[o + 1], fogo[o + 2], fogo[o + 3]] = [...CORES_FOGO[k], 255];
  }
}
await png(fogo, FOGO.w * FOGO.quadros, FOGO.h, 'fogo.png');

// ─── 5. The tracer and the flak puff ─────────────────────────────────────────────────────────────────────────────
const tracante = Buffer.alloc(5 * 1 * 4);
[[120, 70, 40, 140], [170, 100, 50, 190], [220, 150, 80, 230], [255, 210, 140, 255], [255, 244, 214, 255]]
  .forEach((c, x) => c.forEach((v, k) => { tracante[x * 4 + k] = v; }));
await png(tracante, 5, 1, 'tracante.png');
const FLAK = { w: 7, quadros: 5 };
const flak = Buffer.alloc(FLAK.w * FLAK.quadros * FLAK.w * 4);
for (let f = 0; f < FLAK.quadros; f++) {
  const r = 1 + f * 0.75;
  for (let y = 0; y < FLAK.w; y++) for (let x = 0; x < FLAK.w; x++) {
    const d = Math.hypot(x - 3, y - 3);
    if (d > r + 0.3) continue;
    const borda = d > r - 1;
    if (f >= 3 && !borda && (x + y + f) % 2) continue; // the puff thins out
    const c = f === 0 ? [255, 236, 190] : f === 1 ? [236, 168, 96] : [70, 68, 72];
    const o = (y * FLAK.w * FLAK.quadros + f * FLAK.w + x) * 4;
    [flak[o], flak[o + 1], flak[o + 2], flak[o + 3]] = [...c, 255];
  }
}
await png(flak, FLAK.w * FLAK.quadros, FLAK.w, 'flak.png');

fs.writeFileSync(path.join(OUT, 'invasao.json'), JSON.stringify({
  naves,
  explosao: { fw: ew, fh: eh, quadros: nExp },
  fumaca: { fw: FUM.w, fh: FUM.h, quadros: FUM.quadros },
  fogo: { fw: FOGO.w, fh: FOGO.h, quadros: FOGO.quadros },
  flak: { fw: FLAK.w, fh: FLAK.w, quadros: FLAK.quadros },
}));

// The pieces sheet, ×6 on the night sky.
{
  const Z = 6, PAD = 10;
  const pecas = ['nave-invasora.png', 'nave-invasora-2.png', 'fogo.png', 'fumaca.png', 'flak.png', 'tracante.png'];
  const bufs = [];
  for (const p of pecas) { const m = await sharp(path.join(OUT, p)).metadata(); bufs.push({ b: await sharp(path.join(OUT, p)).resize(m.width * Z, m.height * Z, { kernel: 'nearest' }).png().toBuffer(), w: m.width * Z, h: m.height * Z }); }
  const expM = await sharp(path.join(OUT, 'explosao.png')).metadata();
  const exp = await sharp(path.join(OUT, 'explosao.png')).extract({ left: 0, top: 0, width: ew * 12, height: eh }).resize(ew * 12 * 3, eh * 3, { kernel: 'nearest' }).png().toBuffer();
  const larg = Math.max(bufs.reduce((a, b) => a + b.w + PAD, PAD), ew * 12 * 3 + 2 * PAD);
  const alt = Math.max(...bufs.map((b) => b.h)) + eh * 3 + 3 * PAD;
  let x = PAD;
  const comp = bufs.map((b) => { const c = { input: b.b, left: x, top: PAD }; x += b.w + PAD; return c; });
  comp.push({ input: exp, left: PAD, top: Math.max(...bufs.map((b) => b.h)) + 2 * PAD });
  await sharp({ create: { width: larg, height: alt, channels: 4, background: { r: 14, g: 18, b: 27, alpha: 1 } } }).composite(comp).png().toFile(path.join(FOLHA, 'pecas.png'));
  console.log('explosão', `${ew}x${eh}`, nExp, 'quadros (a folha tem', expM.width, 'px)');
}
console.log('naves', JSON.stringify(naves));
