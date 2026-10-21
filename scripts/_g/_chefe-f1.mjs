// BLOCO G · round 4 — the F1 boss pieces, baked in pixels (spec §7). Writes into public/sprites/f1/:
//   pluma.png           a thruster plume, 6 frames of 12×30: white-hot at the mouth → amber → dark red → cold vapor
//                       puffs at the tail (the jets of the menu's neon sign, in fire); hangs from the TOP centre;
//   explosao-chefe.png  the Leviathan crash explosion of the final cutscene (`f8-explosao-sheet.png`) at the boss's
//                       size — REDUCED from the original (never enlarged), 24 frames: the boss death (item 9: the
//                       smoke "balls" of the old sheet) and the ground dust when the tower tears off the ground;
//   chefe.json          the frame sizes.
//   node scripts/_g/_chefe-f1.mjs [outDir=public/sprites/f1] [sheetDir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada4]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { FONTE, fonteDaExplosao, quadroReduzido } from './_explosao-fonte.mjs';

const [OUT = 'public/sprites/f1', FOLHA = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada4'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FOLHA, { recursive: true });
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
let semente = 4242;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const png = (buf, w, h, f) => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(OUT, f));

// ─── 1. The plume ────────────────────────────────────────────────────────────────────────────────────────────────
// A column hanging from the mouth (top centre): the core narrows to a point at ~55% of the length, the flame around it
// a little longer, then puffs of cold vapor drift down and widen. Each frame jitters the length and the puffs.
// THREE sizes, one per bell (the mouths on screen are ~13, ~20 and ~27 px wide): pixel art is never enlarged.
const PLUMAS = [
  { arquivo: 'pluma-p.png', w: 14, h: 34 },
  { arquivo: 'pluma-m.png', w: 20, h: 46 },
  { arquivo: 'pluma-g.png', w: 26, h: 58 },
];
const QUADROS_PLUMA = 6;
const CORES = { branco: [255, 246, 222], ambar: [252, 178, 86], vermelho: [206, 82, 40], escuro: [120, 40, 30], vapor: [92, 100, 116], vaporClaro: [126, 134, 150] };
for (const PL of PLUMAS) {
  const k = PL.w / 12; // the 12-px design, scaled in the drawing (not in the pixels)
  const pluma = Buffer.alloc(PL.w * QUADROS_PLUMA * PL.h * 4);
  for (let f = 0; f < QUADROS_PLUMA; f++) {
    const nucleo = 0.42 + rnd() * 0.12; // the white-hot core's length (fraction)
    const chama = 0.62 + rnd() * 0.1;
    // Ragged sides (a straight-sided triangle read as a drawn cone, 20/10): every row its own width, and a couple of
    // 1-px flame tongues licking past the tip.
    const ruido = Array.from({ length: PL.h }, () => (rnd() - 0.5) * 1.8 * k);
    const linguas = [{ dx: (rnd() - 0.5) * 4 * k, comp: (2 + rnd() * 3) * k }, { dx: (rnd() - 0.5) * 4 * k, comp: (1 + rnd() * 2) * k }];
    const puffs = Array.from({ length: 6 }, (_, j) => ({ y: chama * PL.h + (1 + j * 2.2 + rnd() * 1.5) * k, dx: ((rnd() - 0.5) * 3 + j * 0.3) * k, r: (1.7 + j * 0.5 + rnd() * 0.6) * k }));
    for (let y = 0; y < PL.h; y++) for (let x = 0; x < PL.w; x++) {
      const u = y / PL.h; // 0 at the mouth
      const meio = Math.abs(x + 0.5 - PL.w / 2);
      const o = (y * PL.w * QUADROS_PLUMA + f * PL.w + x) * 4;
      let c = null;
      const larg = 5.2 * k * (1 - u / chama) + ruido[y] * Math.min(1, u * 3);
      const lingua = linguas.some((l) => Math.abs(x + 0.5 - PL.w / 2 - l.dx) < 0.5 && y >= chama * PL.h - 1 && y < chama * PL.h + l.comp);
      if (lingua) c = y < chama * PL.h + 1 ? CORES.ambar : CORES.vermelho;
      else if (u < chama && meio < larg) {
        const q = meio / Math.max(0.6, larg) + (u / chama) * 0.6;
        c = u < nucleo && meio < 2.4 * k * (1 - u / nucleo) ? CORES.branco : q < 0.75 ? CORES.ambar : q < 1.05 ? CORES.vermelho : CORES.escuro;
      } else {
        for (const p of puffs) {
          const d = Math.hypot(x + 0.5 - PL.w / 2 - p.dx, y - p.y) / p.r;
          if (d < 1) { c = d < 0.5 ? CORES.vaporClaro : CORES.vapor; break; }
        }
        // the vapor thins out (dithered) towards the tail
        if (c && u > 0.82 && (u - 0.82) / 0.18 > BAYER4[(y % 4) * 4 + (x % 4)]) c = null;
      }
      if (c) [pluma[o], pluma[o + 1], pluma[o + 2], pluma[o + 3]] = [...c, 255];
    }
  }
  await png(pluma, PL.w * QUADROS_PLUMA, PL.h, PL.arquivo);
}
const PL = PLUMAS[2];

// ─── 2. The crash explosion at the boss's size ───────────────────────────────────────────────────────────────────
// Round 5 (20/10): from `_explosao-fonte.mjs`, the cloud DISSOLVED before the screen edge that cut it in the cutscene
// (the "wall" he pointed at in the death; the takeoff dust is the same art).
const EXP = { passo: 2, largura: 150 };
const fonte = await fonteDaExplosao();
const { bx0, by0, bx1, by1 } = fonte.caixa;
const ew = EXP.largura, eh = Math.max(1, Math.round(((by1 - by0 + 1) * ew) / (bx1 - bx0 + 1)));
const n = Math.floor(FONTE.quadros / EXP.passo);
const exp = Buffer.alloc(ew * n * eh * 4);
for (let q = 0; q < n; q++) {
  const f = q * EXP.passo;
  const red = await quadroReduzido(fonte, f, ew, eh);
  for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) {
    const i = (y * ew + x) * 4, o = (y * ew * n + q * ew + x) * 4;
    const a = red[i + 3] / 255;
    if (!(a > 0.86 || a > BAYER4[(y % 4) * 4 + (x % 4)])) continue;
    for (let c = 0; c < 3; c++) exp[o + c] = red[i + c];
    exp[o + 3] = 255;
  }
}
await png(exp, ew * n, eh, 'explosao-chefe.png');
fs.writeFileSync(path.join(OUT, 'chefe.json'), JSON.stringify({
  plumas: PLUMAS.map((p) => ({ chave: `f1-${p.arquivo.replace('.png', '')}`, fw: p.w, fh: p.h, quadros: QUADROS_PLUMA })),
  explosao: { fw: ew, fh: eh, quadros: n },
}));

// The sheet: the big plume's frames ×4 and every 4th explosion frame ×1.
{
  const Z = 4;
  const pl = await sharp(path.join(OUT, PL.arquivo)).resize(PL.w * QUADROS_PLUMA * Z, PL.h * Z, { kernel: 'nearest' }).png().toBuffer();
  const quadros = [];
  for (let q = 0; q < n; q += 4) quadros.push(await sharp(path.join(OUT, 'explosao-chefe.png')).extract({ left: q * ew, top: 0, width: ew, height: eh }).png().toBuffer());
  const larg = Math.max(PL.w * QUADROS_PLUMA * Z, quadros.length * (ew + 6)) + 20;
  await sharp({ create: { width: larg, height: PL.h * Z + eh + 30, channels: 4, background: { r: 20, g: 26, b: 38, alpha: 1 } } })
    .composite([{ input: pl, left: 10, top: 10 }, ...quadros.map((input, j) => ({ input, left: 10 + j * (ew + 6), top: PL.h * Z + 20 }))])
    .png().toFile(path.join(FOLHA, 'pecas.png'));
}
console.log('plumas', PLUMAS.map((p) => `${p.w}x${p.h}`).join(' '), '; explosão do chefe', `${ew}x${eh}`, n, 'quadros');
