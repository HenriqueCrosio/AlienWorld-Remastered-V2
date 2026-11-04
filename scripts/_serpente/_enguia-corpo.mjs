// 04/11 — S2, THE COLOSSAL EEL: the WHOLE eel from the approved head (spec §1.3, §7.2). He approved E3 with the neck
// fix (`escolhidas/e3-pescoco-11.png`) — *"Boa, gostei. Pode seguir para o corpo"*. The head is FROZEN
// (`partir-da-arte-aprovada`): it sits at the left of a wide canvas and /inpaint-v3 paints only the body and the tail to
// its right (the mask starts 6 px inside the neck, so the seam blends); every head pixel is pasted back, and the new
// pixels are snapped to the head's palette (the same material). Four DISTINCT body concepts. The body comes out
// stretched almost straight (the rings are cut from it later and follow the head's path in the game).
//   node scripts/_serpente/_enguia-corpo.mjs <concept> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

const [conceito, outDir, ...seeds] = process.argv.slice(2);
const HEAD = 'docs/superpowers/folhas/2026-11-04/enguia-b5/escolhidas/e3-pescoco-11.png';
const W = 384, H = 80, HX = 0, HY = 8, MX = 90; // canvas; the head's place; the mask's first column

const BASE =
  'The long BODY of the colossal biomechanical eel whose head is at the left: the thick armored neck coming out of the ' +
  'head continues to the RIGHT as one long, smooth, almost straight eel body, the same thickness as the neck at first, ' +
  'then slowly tapering all the way to the TAIL tip near the right edge of the picture. Seen EXACTLY from the side ' +
  '(side-scrolling profile), no top-down view. The same oily black and gunmetal overlapping hull plates as the head, ' +
  'segmented like rings that overlap and hide the joints. Light ONLY on small energy points. Dark sci-fi pixel art, ' +
  'crisp, clean dark outline, transparent background.';
const CONCEITOS = {
  costelas: 'The hollow RIBBED neck goes on along the whole body: a row of curved armored ribs like a ribcage, with a ' +
    'faint ember ORANGE glow deep inside between the ribs, heavy dark plates over the back, the tail ending in a thin ' +
    'pointed armored tip.',
  barbatana: 'A long low RIBBON FIN runs along the top of the back and another along the belly, made of thin dark ' +
    'armored fin plates with tiny CYAN lit tips, both fins joining at the end into a pointed eel tail fin.',
  canos: 'Along the flank run armored PIPES and conduits between the plates, with a few small lit vents in three ' +
    'colors spread along the body: CYAN, toxic GREEN and ember ORANGE; one wider segment near the neck carries a row ' +
    'of short exhaust pipes; the tail ends in a narrow armored tip.',
  espinhos: 'A row of swept-back armored SPINES and blade plates runs along the top of the back, getting smaller ' +
    'toward the tail; the belly is segmented in pale gunmetal bands; small toxic GREEN lit vents along the flank; the ' +
    'tail ends in a long sharp blade.',
};
if (!CONCEITOS[conceito]) throw new Error(`concept? ${Object.keys(CONCEITOS).join(' | ')}`);
fs.mkdirSync(outDir, { recursive: true });

const head = await sharp(HEAD).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const tela = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: HEAD, left: HX, top: HY }]).png().toBuffer();
const telaRaw = await sharp(tela).raw().toBuffer();
const mask = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) for (let x = MX; x < W; x++) mask.fill(255, (y * W + x) * 3, (y * W + x) * 3 + 3);
const maskPng = await sharp(mask, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();

const cores = new Map();
for (let i = 0; i < head.data.length; i += 4) if (head.data[i + 3] > 127) cores.set((head.data[i] << 16) | (head.data[i + 1] << 8) | head.data[i + 2], [head.data[i], head.data[i + 1], head.data[i + 2]]);
const pal = [...cores.values()];
const snap = (r, g, b) => {
  let best = pal[0], d = Infinity;
  for (const c of pal) { const e = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (e < d) { d = e; best = c; } }
  return best;
};

for (const seed of seeds.map(Number)) {
  const [img] = await gerar('/inpaint-v3', {
    description: `${BASE} ${CONCEITOS[conceito]}`,
    inpainting_image: { image: b64(tela), size: { width: W, height: H } },
    mask_image: { image: b64(maskPng), size: { width: W, height: H } },
    no_background: true,
    crop_to_mask: true,
    seed,
  });
  const gen = await sharp(img).resize(W, H, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer();
  fs.writeFileSync(path.join(outDir, `cru-${conceito}-${seed}.png`), await sharp(gen, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
  const out = Buffer.from(telaRaw);
  for (let y = 0; y < H; y++) for (let x = MX; x < W; x++) {
    const o = (y * W + x) * 4;
    if (gen[o + 3] < 110) { out[o + 3] = 0; continue; }
    const c = snap(gen[o], gen[o + 1], gen[o + 2]);
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  }
  const arq = path.join(outDir, `${conceito}-${seed}.png`);
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(arq);
  console.log(arq);
}
