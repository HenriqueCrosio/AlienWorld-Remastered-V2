// BLOCO G · round 5 — the F1 boss death, BIGGER AND MORE VIOLENT (his note on round 4, 20/10: "a explosão + fumaça +
// efeitos podem ser maiores e mais violentos"). Writes into public/sprites/f1/ (round 4's chefe.json is untouched):
//   explosao-chefe-g.png   the Leviathan crash explosion (`f8-explosao-sheet.png`, 344×207 of content) at 250 px wide —
//                          still a REDUCTION — and ALL 48 frames (round 4 had every 2nd), on an 8-column grid;
//   explosao-chefe-m.png   the same at 84 px, every 2nd frame: the CHAIN that cracks the tower before the big one
//                          (it replaces the old `explosion-sheet`, whose smoke "balls" were item 9);
//   estilhacos-chefe.png   chunks cut from the tower's own art (`boss-air.png`), torn edges glowing — what flies off;
//   fumaca-chefe.png       a big smoke column (the invasion's smoke, scaled in the drawing, never in the pixels);
//   fogo-chefe.png         a big fire at its foot;
//   morte.json             the frame sizes.
//   node scripts/_g/_morte-chefe-f1.mjs [outDir=public/sprites/f1] [sheetDir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada5]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { FONTE, fonteDaExplosao, quadroReduzido } from './_explosao-fonte.mjs';

const [OUT = 'public/sprites/f1', FOLHA = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada5'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FOLHA, { recursive: true });
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
let semente = 9191;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const png = (buf, w, h, f) => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(OUT, f));
const dados = {};

// ─── 1. The crash explosion, two sizes ───────────────────────────────────────────────────────────────────────────
// From `_explosao-fonte.mjs`: the cutscene's cloud DISSOLVED before the screen edge that cut it (the "wall", 20/10), and
// `centro` = where the fireball is born, which the game uses as the sprite's origin.
const fonte = await fonteDaExplosao();
const { bx0, by0, bx1, by1 } = fonte.caixa;
async function assarExplosao(arquivo, largura, passo, colunas) {
  const ew = largura, eh = Math.round(((by1 - by0 + 1) * ew) / (bx1 - bx0 + 1));
  const n = Math.floor(FONTE.quadros / passo);
  const linhas = Math.ceil(n / colunas);
  const W = ew * colunas, H = eh * linhas;
  const buf = Buffer.alloc(W * H * 4);
  for (let q = 0; q < n; q++) {
    const f = q * passo;
    const red = await quadroReduzido(fonte, f, ew, eh);
    const cx = (q % colunas) * ew, cy = Math.floor(q / colunas) * eh;
    for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) {
      const i = (y * ew + x) * 4, o = ((cy + y) * W + cx + x) * 4;
      const a = red[i + 3] / 255;
      if (!(a > 0.86 || a > BAYER4[(y % 4) * 4 + (x % 4)])) continue;
      for (let c = 0; c < 3; c++) buf[o + c] = red[i + c];
      buf[o + 3] = 255;
    }
  }
  await png(buf, W, H, arquivo);
  return { fw: ew, fh: eh, quadros: n, colunas, centro: { x: +fonte.centro.x.toFixed(3), y: +fonte.centro.y.toFixed(3) } };
}
dados.explosaoG = await assarExplosao('explosao-chefe-g.png', 250, 1, 8);
dados.explosaoM = await assarExplosao('explosao-chefe-m.png', 84, 2, 24);

// ─── 2. The chunks: cut from the tower's own art ─────────────────────────────────────────────────────────────────
// An irregular polygon (5–7 corners, radius 4–9 px) around a random opaque pixel of `boss-air.png`; the pixels inside
// are kept (a touch darker: soot), and the edge pixels on the side facing away from the polygon's centre-of-cut get the
// hot-metal ramp (torn and glowing). One chunk per 20×20 frame, centred.
const CH = { fw: 26, fh: 26, quadros: 12 };
const boss = await sharp('public/sprites/boss-air.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const BW = boss.info.width, BH = boss.info.height;
const opacos = [];
for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (boss.data[(y * BW + x) * 4 + 3] > 200) opacos.push([x, y]);
const estilhacos = Buffer.alloc(CH.fw * CH.quadros * CH.fh * 4);
const BRASA = [[255, 214, 140], [246, 150, 64], [178, 66, 32]];
const dentro = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
for (let q = 0; q < CH.quadros; q++) {
  const [cx, cy] = opacos[Math.floor(rnd() * opacos.length)];
  // 5–11 px of radius: at 4–9 (the first bake) they read as specks next to a 197-px tower.
  const k = 5 + Math.floor(rnd() * 3), r = 5 + rnd() * 6;
  const pts = Array.from({ length: k }, (_, i) => {
    const ang = (i / k) * Math.PI * 2 + (rnd() - 0.5) * 0.7, rr = r * (0.55 + rnd() * 0.6);
    return [Math.cos(ang) * rr, Math.sin(ang) * rr];
  });
  const lado = rnd() * Math.PI * 2; // the torn side
  for (let y = 0; y < CH.fh; y++) for (let x = 0; x < CH.fw; x++) {
    const dx = x - CH.fw / 2 + 0.5, dy = y - CH.fh / 2 + 0.5;
    if (!dentro(pts, dx, dy)) continue;
    const sx = Math.round(cx + dx), sy = Math.round(cy + dy);
    if (sx < 0 || sy < 0 || sx >= BW || sy >= BH) continue;
    const i = (sy * BW + sx) * 4;
    if (boss.data[i + 3] < 128) continue;
    const o = (y * CH.fw * CH.quadros + q * CH.fw + x) * 4;
    const borda = !dentro(pts, dx + 1.2, dy) || !dentro(pts, dx - 1.2, dy) || !dentro(pts, dx, dy + 1.2) || !dentro(pts, dx, dy - 1.2);
    const voltado = Math.cos(Math.atan2(dy, dx) - lado) > 0.3;
    let c;
    if (borda && voltado) c = BRASA[Math.min(2, Math.floor(rnd() * 2.4))];
    else c = [boss.data[i] * 0.78, boss.data[i + 1] * 0.74, boss.data[i + 2] * 0.74];
    for (let n = 0; n < 3; n++) estilhacos[o + n] = Math.round(c[n]);
    estilhacos[o + 3] = 255;
  }
}
await png(estilhacos, CH.fw * CH.quadros, CH.fh, 'estilhacos-chefe.png');
dados.estilhacos = CH;

// ─── 3. The smoke column, big ────────────────────────────────────────────────────────────────────────────────────
// The invasion's smoke (`_invasao-f1.mjs` §3) with every size scaled by k: puffs rising one period over the loop and
// widening with height, solid where thick, dithered only on the fringe, three tones, the base lit by the fire.
const FUM = { w: 30, h: 104, quadros: 8, puffs: 16 };
const kf = FUM.w / 12;
const puffs = Array.from({ length: FUM.puffs }, (_, i) => ({ y0: (i / FUM.puffs) * FUM.h, dx: (rnd() - 0.5) * 3 * kf, r: (2.4 + rnd() * 2.2) * kf, d: 0.7 + rnd() * 0.5 }));
const fumaca = Buffer.alloc(FUM.w * FUM.quadros * FUM.h * 4);
for (let f = 0; f < FUM.quadros; f++) {
  const dens = new Float32Array(FUM.w * FUM.h);
  for (const p of puffs) {
    const y = (((p.y0 - (f * FUM.h) / FUM.quadros) % FUM.h) + FUM.h) % FUM.h;
    const sobe = 1 - y / FUM.h;
    const cx = FUM.w / 2 + p.dx + sobe * 2.5 * kf;
    const r = p.r * (0.7 + sobe * 0.9);
    for (let yy = 0; yy < FUM.h; yy++) for (let xx = 0; xx < FUM.w; xx++) {
      const d = Math.hypot(xx - cx, (yy - y) * 0.8) / r;
      if (d < 1) dens[yy * FUM.w + xx] += p.d * (1 - d * d) * (1 - sobe * 0.7);
    }
  }
  for (let y = 0; y < FUM.h; y++) for (let x = 0; x < FUM.w; x++) {
    const v = Math.min(1.4, dens[y * FUM.w + x]) * Math.min(1, y / (FUM.h * 0.33));
    if (!(v > 0.5 || (v > 0.15 && (v - 0.15) / 0.35 > BAYER4[(y % 4) * 4 + (x % 4)]))) continue;
    const o = (y * FUM.w * FUM.quadros + f * FUM.w + x) * 4;
    const baixo = y / FUM.h;
    const tom = v > 1 ? 1 : v > 0.7 ? 0.55 : 0;
    const c = [28 + 22 * tom + 30 * baixo * baixo * baixo, 29 + 20 * tom + 10 * baixo * baixo * baixo, 35 + 20 * tom + 2 * baixo];
    for (let n = 0; n < 3; n++) fumaca[o + n] = Math.round(c[n]);
    fumaca[o + 3] = 255;
  }
}
await png(fumaca, FUM.w * FUM.quadros, FUM.h, 'fumaca-chefe.png');
dados.fumaca = { fw: FUM.w, fh: FUM.h, quadros: FUM.quadros };

// ─── 4. The fire at its foot, big ────────────────────────────────────────────────────────────────────────────────
// ⚠️ THREE TONGUES, NOT ONE CONE: the invasion's 5×7 fire scaled up read as a row of clean triangles (20/10 — the
// plume's "geometric" defect of round 4 again). Each frame: three tongues of their own height and width, each one
// WOBBLING sideways as it rises (a sine with its own phase) and with ragged sides; the hottest tongue wins per pixel.
const FOGO = { w: 16, h: 22, quadros: 6 };
const fogo = Buffer.alloc(FOGO.w * FOGO.quadros * FOGO.h * 4);
const CORES_FOGO = [[255, 236, 186], [246, 168, 76], [196, 92, 40], [118, 44, 28]];
for (let f = 0; f < FOGO.quadros; f++) {
  const linguas = Array.from({ length: 3 }, (_, j) => ({
    dx: (j - 1) * FOGO.w * 0.2 + (rnd() - 0.5) * 2,
    alto: (j === 1 ? 0.75 : 0.45) * FOGO.h + rnd() * 0.25 * FOGO.h,
    larg: (0.2 + rnd() * 0.1) * FOGO.w,
    fase: rnd() * Math.PI * 2,
    amp: 0.8 + rnd() * 1.4,
  }));
  const ruido = Array.from({ length: FOGO.h }, () => (rnd() - 0.5) * 1.4);
  for (let y = 0; y < FOGO.h; y++) for (let x = 0; x < FOGO.w; x++) {
    const doChao = FOGO.h - 1 - y;
    let quente = -1;
    for (const l of linguas) {
      const u = doChao / l.alto; // 0 at the foot, 1 at the tip
      if (u > 1) continue;
      const cx = FOGO.w / 2 + l.dx + Math.sin(u * Math.PI * 1.6 + l.fase) * l.amp * u;
      const larg = l.larg * Math.pow(1 - u, 0.75) + ruido[y] * (0.3 + u);
      const meio = Math.abs(x + 0.5 - cx);
      if (meio > larg) continue;
      quente = Math.max(quente, 1 - (meio / Math.max(0.5, larg)) * 0.45 - u * 0.65);
    }
    if (quente < 0) continue;
    const c = CORES_FOGO[quente > 0.72 ? 0 : quente > 0.48 ? 1 : quente > 0.25 ? 2 : 3];
    const o = (y * FOGO.w * FOGO.quadros + f * FOGO.w + x) * 4;
    [fogo[o], fogo[o + 1], fogo[o + 2], fogo[o + 3]] = [...c, 255];
  }
}
await png(fogo, FOGO.w * FOGO.quadros, FOGO.h, 'fogo-chefe.png');
dados.fogo = { fw: FOGO.w, fh: FOGO.h, quadros: FOGO.quadros };

fs.writeFileSync(path.join(OUT, 'morte.json'), JSON.stringify(dados));

// The sheet: every 6th big-explosion frame, the chunks ×4, the smoke and the fire ×2, on the stage's night blue.
{
  const g = dados.explosaoG;
  const quadros = [];
  for (let q = 0; q < g.quadros; q += 6) {
    quadros.push(await sharp(path.join(OUT, 'explosao-chefe-g.png')).extract({ left: (q % g.colunas) * g.fw, top: Math.floor(q / g.colunas) * g.fh, width: g.fw, height: g.fh }).png().toBuffer());
  }
  const ch = await sharp(path.join(OUT, 'estilhacos-chefe.png')).resize(CH.fw * CH.quadros * 4, CH.fh * 4, { kernel: 'nearest' }).png().toBuffer();
  const fu = await sharp(path.join(OUT, 'fumaca-chefe.png')).resize(FUM.w * FUM.quadros * 2, FUM.h * 2, { kernel: 'nearest' }).png().toBuffer();
  const fo = await sharp(path.join(OUT, 'fogo-chefe.png')).resize(FOGO.w * FOGO.quadros * 4, FOGO.h * 4, { kernel: 'nearest' }).png().toBuffer();
  const larg = Math.max(4 * (g.fw + 6), CH.fw * CH.quadros * 4, FUM.w * FUM.quadros * 2 + FOGO.w * FOGO.quadros * 4 + 20) + 20;
  const alt = 2 * (g.fh + 6) + CH.fh * 4 + FUM.h * 2 + 50;
  await sharp({ create: { width: larg, height: alt, channels: 4, background: { r: 20, g: 26, b: 38, alpha: 1 } } })
    .composite([
      ...quadros.map((input, j) => ({ input, left: 10 + (j % 4) * (g.fw + 6), top: 10 + Math.floor(j / 4) * (g.fh + 6) })),
      { input: ch, left: 10, top: 2 * (g.fh + 6) + 20 },
      { input: fu, left: 10, top: 2 * (g.fh + 6) + CH.fh * 4 + 30 },
      { input: fo, left: 30 + FUM.w * FUM.quadros * 2, top: 2 * (g.fh + 6) + CH.fh * 4 + 30 },
    ])
    .png().toFile(path.join(FOLHA, 'morte-pecas.png'));
}
console.log('morte', JSON.stringify(dados));
