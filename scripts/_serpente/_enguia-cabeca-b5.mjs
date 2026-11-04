// 04/11 — S2, THE COLOSSAL EEL, head round 2: he picked B5 (the gulper, `engolidora-1103-5`) — *"pode ser a B5, mas
// com a cabeça maior e mais larga"* — keeping ~3× the ship on screen. Both routes START FROM B5 (`partir-da-arte-aprovada`):
//   editar   — /edit-images-v2 edit_with_text on B5 itself (B5 right-aligned on the output canvas, so the neck keeps
//              leaving by the right edge and the skull has room to grow left/up/down);
//   conceito — /generate-image-v2 with B5 as the SUBJECT and as the STYLE, the words asking for the massive skull.
// Canvas: WxH (96x64 = today's frame; 112x76 = a slightly bigger head on screen).
//   node scripts/_serpente/_enguia-cabeca-b5.mjs <editar|conceito> <WxH> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [modo, dim, outDir, ...seeds] = process.argv.slice(2);
if (!['editar', 'conceito'].includes(modo) || !/^\d+x\d+$/.test(dim ?? '') || !outDir || !seeds.length)
  throw new Error('usage: <editar|conceito> <WxH> <outDir> <seed...>');
const [W, H] = dim.split('x').map(Number);
const B5 = 'docs/superpowers/folhas/2026-11-03/enguia-cabeca/escolhidas/engolidora-1103-5.png';

const KEEP =
  'the wide-open maw with long jagged teeth, the ember ORANGE glowing core deep in the throat, the hollow plated neck ' +
  'with ember orange light inside, the small glowing CYAN eye, the small toxic GREEN lit vents at the back of the neck, ' +
  'the oily black and gunmetal overlapping armor plates, light ONLY on those energy points';
const SIDE =
  'Seen EXACTLY from the side, a side-scrolling shoot-em-up profile: the head faces LEFT (mouth at the left), a short ' +
  'piece of the neck trails off to the RIGHT edge. No top-down view, no front view, one single creature.';
const PIXEL = 'Dark sci-fi biomechanical, crisp detailed pixel art, clean dark outline, transparent background.';

const EDIT =
  `Make the HEAD of this colossal biomechanical eel MUCH BIGGER and BROADER: a massive, tall, heavy armored skull and a ` +
  `deeper, wider lower jaw, the head filling most of the picture, the neck shorter. Keep everything else exactly as it ` +
  `is: ${KEEP}. ${SIDE} ${PIXEL}`;
const CONCEITO =
  `The head of a COLOSSAL BIOMECHANICAL GULPER EEL, this exact creature from the reference, but with a MUCH BIGGER and ` +
  `BROADER head: a massive, tall, heavy armored skull and a deep, wide lower jaw, the head taking most of the picture, ` +
  `only a short stub of neck. The same ${KEEP}. Menacing deep-sea horror. ${SIDE} ${PIXEL} Small empty margin around it.`;

// B5 on the output canvas: right-aligned (the neck on the right edge, as in B5), vertically centred
const naTela = async () => {
  const m = await sharp(B5).metadata();
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: B5, left: W - m.width, top: Math.floor((H - m.height) / 2) }]).png().toBuffer();
};

fs.mkdirSync(outDir, { recursive: true });
const base = await naTela();
const b5Size = await tamanho(B5);
for (const seed of seeds.map(Number)) {
  const imgs = modo === 'editar'
    ? await gerar('/edit-images-v2', {
      method: 'edit_with_text',
      edit_images: [{ image: b64(base), width: W, height: H }],
      image_size: { width: W, height: H },
      description: EDIT,
      no_background: true,
      seed,
    })
    : await gerar('/generate-image-v2', {
      description: CONCEITO,
      image_size: { width: W, height: H },
      no_background: true,
      seed,
      reference_images: [{
        image: b64(B5), size: b5Size,
        usage_description: 'the subject: this exact biomechanical gulper eel head — its open maw, jagged teeth, glowing orange throat, hollow plated neck, cyan eye',
      }],
      style_image: { image: b64(B5), size: b5Size },
      style_options: { color_palette: true, outline: true, detail: true, shading: true },
    });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `b5-${modo}-${W}x${H}-${seed}-${i}.png`), buf));
  console.log(`${modo} ${W}x${H} seed ${seed}: ${imgs.length}`);
}
