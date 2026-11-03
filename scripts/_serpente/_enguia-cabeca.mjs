// 03/11 — S2, THE COLOSSAL EEL: PixelLab head concepts (spec `2026-11-03-serpente-grande-enguia-design.md` §1, §7.2).
// His ask: *"crie primeiro o modelo no pixellab para vermos como vai sair essa cabeça"* — and *"a enguia precisa ser
// uma enguia dark sci-fi bio mecanica bem desenhada"*. Four DISTINCT heads (not variations of one), no subject
// reference (a subject ref locks the shape — `pixellab-ferramentas-testadas`), the 3-head serpent's cyan head as the
// pixel STYLE (the material she inherits). The Pro may answer facing right: the triage mirrors.
//   node scripts/_serpente/_enguia-cabeca.mjs <concept> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [conceito, outDir, ...seeds] = process.argv.slice(2);
const STYLE = 'docs/superpowers/folhas/2026-11-03/enguia-cabeca/ref/estilo-cabeca-azul.png';

const SIDE =
  'Seen EXACTLY from the side, a side-scrolling shoot-em-up profile: the head faces LEFT (mouth at the left), and ' +
  'a short piece of the neck trails off to the RIGHT edge. Nothing seen from above, no top-down view, no front view, ' +
  'one single creature.';
const DARK =
  'Dark sci-fi BIOMECHANICAL pixel art, very well drawn: oily black and gunmetal armored hull plates that overlap ' +
  'like segments, organic shapes fused with machinery, low contrast, light ONLY on energy points (small glowing ' +
  'lights). Crisp detailed pixel art, clean dark outline, transparent background, small empty margin around it.';

const CONCEITOS = {
  moreia: {
    size: [96, 64],
    description:
      `The head of a COLOSSAL BIOMECHANICAL MORAY EEL: a long armored tapered head, the jaws slightly open with rows ` +
      `of thin needle teeth, a small sunken glowing CYAN eye, a row of gill vents behind the jaw glowing toxic GREEN, ` +
      `a ridge of short plated spines running back along the top of the neck, small ember ORANGE exhaust vents on ` +
      `the neck. Menacing and ancient. ${SIDE} ${DARK}`,
  },
  engolidora: {
    size: [96, 64],
    description:
      `The head of a COLOSSAL BIOMECHANICAL GULPER EEL: an ENORMOUS hinged lower jaw longer than the skull, the mouth ` +
      `half open showing a dark cavernous throat with an ember ORANGE glowing core deep inside, a tiny glowing CYAN ` +
      `eye at the front of a small armored skull, a slim plated neck with toxic GREEN lit vents. A deep-sea horror. ` +
      `${SIDE} ${DARK}`,
  },
  lanca: {
    size: [96, 64],
    description:
      `The head of a COLOSSAL BIOMECHANICAL RIBBON EEL: a long narrow blade-like skull like a spear tip, flared ` +
      `tubular nostrils at the snout tip, a tall crest of thin armored fin plates running along the top of the head ` +
      `and neck, two small glowing CYAN eyes, thin toxic GREEN gill slits, tiny ember ORANGE vents along the crest. ` +
      `Elegant and fast. ${SIDE} ${DARK}`,
  },
  fusao: {
    size: [96, 64],
    description:
      `The head of a COLOSSAL BIOMECHANICAL EEL born from three serpent heads FUSED into one: a broad armored eel ` +
      `skull with a visible seam of overlapping plates where the three skulls merged, a glowing CYAN eye, glowing ` +
      `toxic GREEN gill vents on the cheek, an ember ORANGE glowing cannon-like throat vent under the jaw, short swept ` +
      `back horns, the jaw slightly open with jagged teeth. ${SIDE} ${DARK}`,
  },
};

const c = CONCEITOS[conceito];
if (!c) throw new Error(`concept? ${Object.keys(CONCEITOS).join(' | ')}`);
fs.mkdirSync(outDir, { recursive: true });
const styleSize = await tamanho(STYLE);
for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: c.description,
    image_size: { width: c.size[0], height: c.size[1] },
    no_background: true,
    seed,
    style_image: { image: b64(STYLE), size: styleSize },
    style_options: { color_palette: false, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${conceito}-${seed}-${i}.png`), buf));
  console.log(`${conceito} seed ${seed}: ${imgs.length}`);
}
