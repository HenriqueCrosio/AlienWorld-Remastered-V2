// 27/10 — THE SPIDER OF THE F1 CAVE, baked for the game (his pick: C, on the ceiling, pure black; his drawing: from the
// opening it looks at the ship moving its legs, turns to the camera, runs LEFT behind the opening's stalactites to the
// dark corner, looks and turns again, and leaves behind the other stalactite). Two files and a map:
// - `aranha.png`: the frames in a row (one cell size), drawn by `_aranha-silhueta.mjs` at k 0.75, seed 7 — frame 0 is
//   the approved C pixel for pixel; then OLHA (watching: the front legs rise and feel, 12), VIRA (the yaw from the side
//   to the camera, 6), ENCARA (facing the camera, the legs restless, 8), ANDA (the gait, 8);
// - `cav-aranha-frente.png`: the STALACTITES IN FRONT of her — the painting's own rock pixels where she passes behind
//   them (the opening, read by colour: what is not the cold light is rock) and the dark corner where she leaves. Drawn
//   over her, it is the painting itself: no seam;
// - `aranha.json`: the cell, the rig's origin in it, the feet's row, the frame groups, and the stride (px of screen per
//   gait cycle: the walk is driven by the distance, so the feet stay planted).
//   node scripts/_g/_aranha-caverna-f1.mjs [--previa <dir>]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { desenharAranha, pintarAranha, poseAranha, marcha, inquieta } from './_aranha-silhueta.mjs';

const args = process.argv.slice(2);
const iP = args.indexOf('--previa');
const PREVIA = iP >= 0 ? args[iP + 1] : null;
const OUT = 'public/sprites/f1';
const K = 0.75, SEMENTE = 7;
const PASSO = 10, ALTURA = 3; // the run: a long stride (rig px), the foot lifted 3

const grupos = {};
const quadros = [];
const junta = (nome, poses) => { grupos[nome] = [quadros.length, quadros.length + poses.length - 1]; quadros.push(...poses); };
junta('parada', [poseAranha(0, null)]);
junta('olha', Array.from({ length: 12 }, (_, i) => poseAranha(0, inquieta(i / 12))));
junta('vira', Array.from({ length: 6 }, (_, i) => poseAranha(((i + 1) / 6) * (Math.PI / 2), marcha((i + 1) / 6, 2.5, 1.5))));
junta('encara', Array.from({ length: 8 }, (_, i) => poseAranha(Math.PI / 2, inquieta(i / 8))));
junta('anda', Array.from({ length: 8 }, (_, i) => poseAranha(0, marcha(i / 8, PASSO, ALTURA))));

// every frame drawn, then all in one cell with the rig's origin at the same place
const desenhos = quadros.map((p) => desenharAranha(p, { k: K, semente: SEMENTE }));
const esq = Math.max(...desenhos.map((a) => a.ox)), cima = Math.max(...desenhos.map((a) => a.oy));
const W = esq + Math.max(...desenhos.map((a) => a.w - a.ox)), H = cima + Math.max(...desenhos.map((a) => a.h - a.oy));
const folha = Buffer.alloc(W * quadros.length * H * 4);
desenhos.forEach((a, q) => {
  const px = pintarAranha(a, { estilo: 'preto' });
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
    const i = (y * a.w + x) * 4;
    if (!px[i + 3]) continue;
    const X = q * W + esq - a.ox + x, Y = cima - a.oy + y;
    px.copy(folha, (Y * W * quadros.length + X) * 4, i, i + 4);
  }
});
// the feet's row: the top row of frame 0 (the approved C hangs from it)
let topo = 0;
for (; topo < H; topo++) { let algum = false; for (let x = 0; x < W; x++) if (folha[(topo * W * quadros.length + x) * 4 + 3]) algum = true; if (algum) break; }
await sharp(folha, { raw: { width: W * quadros.length, height: H, channels: 4 } }).png().toFile(path.join(OUT, 'aranha.png'));
const mapa = { w: W, h: H, ox: esq, oy: cima, topo, quadros: quadros.length, grupos, passoTela: +(2 * PASSO * K).toFixed(3) };
fs.writeFileSync(path.join(OUT, 'aranha.json'), JSON.stringify(mapa));
console.log('aranha:', mapa);

// ── the stalactites in front ───────────────────────────────────────────────────────────────────────────────────────
const { data: pin, info } = await sharp(path.join(OUT, 'cav-interior.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const PW = info.width, PH = info.height;
const frente = Buffer.alloc(PW * PH * 4);
const luz = (i) => pin[i] + pin[i + 1] + pin[i + 2];
// the opening: rock is what is not the cold light (the light: bright, and bluer than red — an ember is rock)
const ABERTURA = { x: [278, PW - 1], y: [0, 95], limiar: 120 };
// the dark corner where she leaves (his "outra estalactite"): the painting's rock there, darker than the wall below it
const CANTO = { x: [40, 112], y: [0, 46], limiar: 150 };
let n = 0;
for (const z of [ABERTURA, CANTO]) for (let y = z.y[0]; y <= z.y[1]; y++) for (let x = z.x[0]; x <= z.x[1]; x++) {
  const i = (y * PW + x) * 4;
  const claro = luz(i) > z.limiar && pin[i + 2] >= pin[i];
  if (claro) continue;
  pin.copy(frente, i, i, i + 3);
  frente[i + 3] = 255;
  n++;
}
await sharp(frente, { raw: { width: PW, height: PH, channels: 4 } }).png().toFile(path.join(OUT, 'cav-aranha-frente.png'));
console.log(`a frente: ${n} px da pintura`);

if (PREVIA) {
  fs.mkdirSync(PREVIA, { recursive: true });
  const Z = 4;
  await sharp(folha, { raw: { width: W * quadros.length, height: H, channels: 4 } })
    .resize(W * quadros.length * Z, H * Z, { kernel: 'nearest' })
    .flatten({ background: '#455869' })
    .png().toFile(path.join(PREVIA, 'quadros.png'));
  await sharp(frente, { raw: { width: PW, height: PH, channels: 4 } }).resize(PW * 3, PH * 3, { kernel: 'nearest' })
    .flatten({ background: '#ff00ff' }).png().toFile(path.join(PREVIA, 'frente.png'));
}
