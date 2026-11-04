// 04/11 — S2, the colossal eel: he picked E3 (`b5-editar-96x64-2-0`, *"me lembra a cabeça do Alien"*) with ONE fix,
// drawn by him on the in-game view: two red lines — the top contour flowing from the back of the dome DOWN to the
// screen's right edge, and the underside of the neck going on to the same edge — *"completando um pouco e formando mais
// fluidez no desenho"*. Today E3 ends in a STRAIGHT vertical cut at x 85 (10 px short of the edge) with a step behind
// the dome. Strict fix (`correcao-estrita-em-peca-aprovada`): /inpaint-v3 repaints ONLY the band between his lines,
// right of the head; every pixel outside the mask is pasted back from E3; the new pixels are snapped to E3's palette.
// His lines, mapped to native px through the eye (32,20) and the green vents (81,32): top (75,5)→(95,17), bottom
// (85,51)→(95,54). The inpaint canvas is 120 wide so the neck runs OUT of the picture (no capped end); the result is
// cut back to 96×64, the frame of the cannons' post.
//   node scripts/_serpente/_enguia-pescoco-e3.mjs <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

const [outDir, ...seeds] = process.argv.slice(2);
if (!outDir || !seeds.length) throw new Error('usage: <outDir> <seed...>');
const E3 = 'docs/superpowers/folhas/2026-11-04/enguia-b5/cru/b5-editar-96x64-2-0.png';
const W0 = 96, W = 120, H = 64;
fs.mkdirSync(outDir, { recursive: true });

const e3 = await sharp(E3).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const a0 = (x, y) => (x < W0 && y >= 0 && y < H ? e3.data[(y * W0 + x) * 4 + 3] : 0);
const topo = (x) => 5 + (x - 75) * 0.6; // his top line
const fundo = (x) => (x < 85 ? 51 : 51 + (x - 85) * 0.3); // his bottom line
const topoHoje = (x) => { for (let y = 0; y < H; y++) if (a0(x, y) > 127) return y; return H; };

// The mask: inside his two lines, x ≥ 74, and either empty today, or the right cut (x ≥ 84), or the top 3 px of
// today's contour (the step behind the dome) — the vents and the inside of the head stay E3's pixels.
const dentro = (x, y) => x >= 74 && y >= Math.floor(topo(x)) - 1 && y <= Math.ceil(fundo(x)) + 1;
const pinta = (x, y) => dentro(x, y) && (a0(x, y) < 128 || x >= 84 || y < topoHoje(x) + 3);
const mask = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (pinta(x, y)) mask.fill(255, (y * W + x) * 3, (y * W + x) * 3 + 3);
const maskPng = await sharp(mask, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
fs.writeFileSync(path.join(outDir, 'mascara.png'), maskPng);
const tela = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: E3, left: 0, top: 0 }]).png().toBuffer();

// E3's palette — the new pixels speak its colours
const cores = new Map();
for (let i = 0; i < e3.data.length; i += 4) if (e3.data[i + 3] > 127) cores.set((e3.data[i] << 16) | (e3.data[i + 1] << 8) | e3.data[i + 2], [e3.data[i], e3.data[i + 1], e3.data[i + 2]]);
const pal = [...cores.values()];
const snap = (r, g, b) => {
  let best = pal[0], d = Infinity;
  for (const c of pal) { const e = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (e < d) { d = e; best = c; } }
  return best;
};

const DESC =
  'The long thick armored NECK of a colossal biomechanical eel, side view, continuing smoothly from the back of the ' +
  'domed skull: one flowing silhouette, its top contour sloping gently down to the right, the neck running OFF the ' +
  'right edge of the picture. The same overlapping oily black and gunmetal hull plates as the head, ribbed segments, ' +
  'a few tiny ember orange lights deep inside the hollow plated neck. Dark sci-fi pixel art, clean dark outline, ' +
  'transparent background.';

for (const seed of seeds.map(Number)) {
  const [img] = await gerar('/inpaint-v3', {
    description: DESC,
    inpainting_image: { image: b64(tela), size: { width: W, height: H } },
    mask_image: { image: b64(maskPng), size: { width: W, height: H } },
    no_background: true,
    crop_to_mask: true,
    seed,
  });
  const gen = await sharp(img).resize(W, H, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer();
  fs.writeFileSync(path.join(outDir, `gerado-${seed}.png`), await sharp(gen, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
  const out = Buffer.alloc(W0 * H * 4);
  let mudou = 0, foraIgual = 0, fora = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W0; x++) {
    const o = (y * W0 + x) * 4, g = (y * W + x) * 4;
    if (!pinta(x, y)) { e3.data.copy(out, o, o, o + 4); fora++; foraIgual++; continue; }
    if (gen[g + 3] < 110) { mudou += a0(x, y) > 127 ? 1 : 0; continue; }
    const c = snap(gen[g], gen[g + 1], gen[g + 2]);
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255; mudou++;
  }
  const arq = path.join(outDir, `e3-pescoco-${seed}.png`);
  await sharp(out, { raw: { width: W0, height: H, channels: 4 } }).png().toFile(arq);
  console.log(arq, `fora da máscara: ${foraIgual}/${fora} px iguais à E3; na máscara: ${mudou} px pintados`);
}
