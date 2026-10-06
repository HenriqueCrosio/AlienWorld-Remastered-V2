// FRENTE B · FATIA F3 — PixelLab candidates for the F3 elites (spec 2026-10-06-frente-b-fatia-f3-design.md §5).
// Henrique's concept crop = SUBJECT reference; an approved sprite = pixel STYLE reference (the F2 recipe).
//   node scripts/_elites/_gerar-f3.mjs <piece> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [peca, outDir, ...seeds] = process.argv.slice(2);
const REF = 'docs/superpowers/folhas/2026-10-06/elites/ref';

const SIDE =
  'Seen EXACTLY from the side (side-scrolling shoot-em-up profile), facing LEFT, like a side-view sprite: ' +
  'nothing seen from above, no top-down view, no front view.';
const DARK =
  'Dark sci-fi pixel art: dark violet-black chitin and gunmetal, low contrast, light ONLY on energy points (small ' +
  'glowing red lights). Crisp pixel art, clean dark outline, transparent background, empty margin around it.';

const PECAS = {
  cacador: {
    size: 48,
    ref: 'cacador.png',
    usage: 'the subject: this void hunter — dark curved crescent blades swept back, red glowing veins and core',
    style: 'public/sprites/elite-sentinela.png',
    description:
      `A VOID HUNTER, a sleek predator of dark matter: a long, FLAT, blade-like body like a spindle or a stretched ` +
      `arrowhead, with two curved crescent blades sweeping back from it like a scythe, a single red glowing core in ` +
      `the middle and thin red veins along the blades. ${SIDE} Slim and fast-looking, wider than tall. ${DARK}`,
  },
  tentaculoCabeca: {
    size: 32,
    ref: 'tentaculo-cabeca.png',
    usage: 'the subject: this worm head — a round open maw ringed with red glowing lights and hooked claws around it',
    style: 'public/sprites/lanca-misseis.png',
    description:
      `The HEAD of an armored biomechanical worm-tentacle, seen from the side, its round open MAW facing LEFT: a ring ` +
      `of small red glowing lights inside the mouth and short hooked claws around its rim, a thick armored neck plate ` +
      `behind it. ${DARK}`,
  },
  tentaculoGomo: {
    size: 16,
    ref: 'tentaculo.png',
    usage: 'the material: the dark armored segmented body of this worm, one segment with a faint red light',
    style: 'public/sprites/lanca-misseis.png',
    description:
      `ONE round armored SEGMENT of a biomechanical worm body, seen from the side: a dark plated ring with a ridge ` +
      `and one tiny faint red light, made to be chained with copies of itself. ${DARK}`,
  },
  // The first segment batch came out as generic balls: the segment is cut from the chosen HEAD's own neck plates.
  tentaculoGomo2: {
    size: 16,
    ref: '../cand/pro/tentaculoCabeca-11-8.png',
    usage: 'match this worm exactly: the same dark armored plates of its neck, the same palette and outline',
    style: 'docs/superpowers/folhas/2026-10-06/elites/cand/pro/tentaculoCabeca-11-8.png',
    description:
      `ONE armored body SEGMENT of this same worm, seen from the side: a thick curved dark armor plate like one ring ` +
      `of its neck, slightly wider than tall, overlapping edges, one tiny dim red light. Made to be chained with copies ` +
      `of itself into a long body. ${DARK}`,
  },
};

const p = PECAS[peca];
if (!p) throw new Error(`piece? ${Object.keys(PECAS).join(' | ')}`);
fs.mkdirSync(outDir, { recursive: true });
const refArq = path.join(REF, p.ref);
const styleSize = await tamanho(p.style);

for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: p.description,
    image_size: { width: p.size, height: p.size },
    no_background: true,
    seed,
    reference_images: [{ image: b64(refArq), size: await tamanho(refArq), usage_description: p.usage }],
    style_image: { image: b64(p.style), size: styleSize },
    style_options: { color_palette: false, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => {
    const f = path.join(outDir, `${peca}-${seed}-${i}.png`);
    fs.writeFileSync(f, buf);
  });
  console.log(`${peca} seed ${seed}: ${imgs.length}`);
}
