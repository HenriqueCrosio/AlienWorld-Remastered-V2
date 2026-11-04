// 04/11 — S2, the colossal eel: he picked A2 (`costelas-22`) with TWO fixes, circled on the sheet:
//   N1 — "na junção da cabeça com o pescoço existe um desnível, é só subir um pouco para cima e encaixar a peça": the
//        body (painted from x 90, the inpaint mask's edge) came out 4–6 px LOWER than the frozen neck. The whole body
//        (x ≥ 90) moves up as ONE piece, nothing redrawn; 6 px measured best (top contour equal, lowest colour step).
//   N2 — "a ponta da cauda, onde eu quero que as ranhuras e painéis sejam azuis. Assim traz mais da serpente de cabeça
//        azul": /inpaint-v3 repaints ONLY the tail tip (x ≥ TX), the SILHOUETTE kept (the new colours only inside
//        A2's own alpha), snapped to the palette of A2 + the blue head (its cyan lines).
// Strict fix (`correcao-estrita-em-peca-aprovada`): every pixel outside the two fixes is A2's.
//   node scripts/_serpente/_enguia-corpo-ajuste.mjs <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

if (process.argv[2] === '--painel') {
  console.log(`${await painel(process.argv[3], process.argv[4])} px do painel acesos → ${process.argv[4]}`);
  process.exit(0);
}
const [outDir, ...seeds] = process.argv.slice(2);
if (!outDir || !seeds.length) throw new Error('usage: <outDir> <seed...>  |  --painel <in.png> <out.png>');
const A2 = 'docs/superpowers/folhas/2026-11-04/enguia-corpo/escolhidas/costelas-22.png';
const AZUL = 'docs/superpowers/folhas/2026-11-03/enguia-cabeca/ref/estilo-cabeca-azul.png';
const W = 384, H = 80, MX = 90, SOBE = 6, TX = 322;
fs.mkdirSync(outDir, { recursive: true });

// N1: the body up by SOBE, as one piece
const a2 = await sharp(A2).ensureAlpha().raw().toBuffer();
const n1 = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const sy = x >= MX ? y + SOBE : y;
  if (sy < H) a2.copy(n1, (y * W + x) * 4, (sy * W + x) * 4, (sy * W + x) * 4 + 4);
}
fs.writeFileSync(path.join(outDir, 'n1.png'), await sharp(n1, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());

// N2: the tail tip, inside its own silhouette
const alfa = (x, y) => n1[(y * W + x) * 4 + 3] > 127;
const pinta = (x, y) => x >= TX && alfa(x, y);
const mask = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (pinta(x, y)) mask.fill(255, (y * W + x) * 3, (y * W + x) * 3 + 3);
const maskPng = await sharp(mask, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
const n1Png = await sharp(n1, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();

const cores = new Map();
const junta = (data) => { for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 127) cores.set((data[i] << 16) | (data[i + 1] << 8) | data[i + 2], [data[i], data[i + 1], data[i + 2]]); };
junta(n1);
junta(await sharp(AZUL).ensureAlpha().raw().toBuffer());
const pal = [...cores.values()];
const snap = (r, g, b) => {
  let best = pal[0], d = Infinity;
  for (const c of pal) { const e = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (e < d) { d = e; best = c; } }
  return best;
};

const DESC =
  'The armored TAIL TIP of a colossal biomechanical eel, side view, the same shape and the same overlapping oily black ' +
  'and gunmetal plates: thin glowing CYAN neon energy lines run inside the grooves between the plates and along the ' +
  'inset panels, like the glowing blue seams of a cyan-lit biomechanical serpent; light ONLY on those cyan lines, the ' +
  'plates stay dark. Dark sci-fi pixel art, crisp, clean dark outline.';

for (const seed of seeds.map(Number)) {
  const [img] = await gerar('/inpaint-v3', {
    description: DESC,
    inpainting_image: { image: b64(n1Png), size: { width: W, height: H } },
    mask_image: { image: b64(maskPng), size: { width: W, height: H } },
    no_background: true,
    crop_to_mask: true,
    seed,
  });
  const gen = await sharp(img).resize(W, H, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer();
  const out = Buffer.from(n1);
  for (let y = 0; y < H; y++) for (let x = TX; x < W; x++) {
    if (!pinta(x, y)) continue;
    const o = (y * W + x) * 4;
    if (gen[o + 3] < 110) continue; // the generator left it empty: keep A2's pixel (the silhouette never changes)
    const c = snap(gen[o], gen[o + 1], gen[o + 2]);
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2];
  }
  const arq = path.join(outDir, `a2-ajuste-${seed}.png`);
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(arq);
  console.log(arq);
}

// N2, the PANEL: the generator lit the grooves but left the tail's inset panel (the black slot with light-grey notches,
// x 330–350, y 37–43) grey in every seed. Its notches are lit by hand in the generator's own cyans: the light greys →
// the bright cyan, the mid greys → the dark cyan. Only light, unsaturated pixels inside the slot change.
//   node scripts/_serpente/_enguia-corpo-ajuste.mjs --painel <in.png> <out.png>
export async function painel(entra, sai) {
  const { data, info } = await sharp(entra).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let y = 37; y <= 43; y++) for (let x = 330; x <= 350; x++) {
    const i = (y * info.width + x) * 4, [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (data[i + 3] < 128 || b > 150) continue;
    const lum = 0.3 * r + 0.59 * g + 0.11 * b, sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (sat > 30 || lum < 64) continue;
    const c = lum >= 88 ? [76, 233, 245] : [38, 177, 191];
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; n++;
  }
  await sharp(data, { raw: info }).png().toFile(sai);
  return n;
}
