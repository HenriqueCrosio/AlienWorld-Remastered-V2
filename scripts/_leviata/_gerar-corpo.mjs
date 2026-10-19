// BLOCO D — the new Leviathan: the WHOLE body in profile, grown from the approved tail (M2, frame 0 of
// `rabo-leviata-sheet.png`). Same plates, same lava, same shark fan fin; the head and mouth are the new part,
// so each concept varies only the head. The fluke on the LEFT, the head on the RIGHT (the menu swims to the
// right and the final cutscene's wound sits on the right half, like today).
//   node scripts/_leviata/_gerar-corpo.mjs <concept> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [conceito, outDir, ...seeds] = process.argv.slice(2);
const W = 384;
const H = 160;

// The approved tail at native size (368×248), cut from the installed sheet.
const RABO = await sharp('public/sprites/rabo-leviata-sheet.png')
  .extract({ left: 0, top: 0, width: 368, height: 248 })
  .png()
  .toBuffer();

const SIDE =
  'Seen EXACTLY from the side, a flat profile view for a side-scrolling shoot-em-up: the WHOLE creature fits ' +
  'inside the image with an empty transparent margin all around, the tail fan fin on the LEFT, the head on the ' +
  'RIGHT, swimming to the right. Long and horizontal. Nothing seen from above, not symmetrical.';
const BODY =
  'The body is armored like a capital ship hull: many overlapping near-black blue-grey plates with fine seams, ' +
  'tiny dim amber vents and a few barnacle-like growths, and glowing orange lava cracks branching in the seams ' +
  'between the big plates along the flank (a few cracks, not a web over everything). It tapers to the left into ' +
  'the tail, which ends in a tall torn FAN FIN of long dark spined rays with ragged membrane (a shark-like fin, ' +
  'not a whale fluke).';
const DARK =
  'Dark sci-fi pixel art: desaturated, low contrast, light ONLY in the energy (the orange lava). Crisp pixel art, ' +
  'clean dark outline, transparent background.';
const COLOSSAL = 'COLOSSAL scale: a space leviathan big enough for a starfighter to fly inside it.';

const REF = { usage: 'the TAIL and the ARMOR: this exact fan fin, these hull plates, vents and glowing orange cracks' };

const CONCEITOS = {
  // A — the armored whale head: blunt, heavy, a small eye and a long closed mouth line (closest to today's menu).
  baleia: `A blunt, heavy armored head like a sperm whale's, made of thick overlapping plates, a small deep-set ` +
    `glowing amber eye and a long closed mouth line along the lower jaw.`,
  // B — the shark head: pointed snout, gill slits leaking lava light, a dorsal fin that matches the tail fin.
  tubarao: `A long pointed shark-like armored snout, a row of gill slits behind the head leaking orange lava light, ` +
    `a tall torn dorsal fin of the same spined rays as the tail, and swept-back pectoral fins.`,
  // C — the split jaw: plated mandibles slightly open with a lava glow inside (the mouth of the final scene).
  mandibula: `A massive armored head whose lower jaw splits into two heavy plated mandibles, slightly open, with ` +
    `rows of dark fangs and a dim orange lava glow deep inside the mouth, small glowing eyes under a brow ridge.`,
  // D — the ram/prow: the head is a plated ram like a battleship's bow, eye slits instead of eyes.
  proa: `A head shaped like the armored ram of a battleship's bow, a long wedge of layered plates, narrow glowing ` +
    `amber eye slits on the side instead of eyes, and a seam of lava where the jaw meets the skull.`,
};

const cabeca = CONCEITOS[conceito];
if (!cabeca) throw new Error(`concept? ${Object.keys(CONCEITOS).join(' | ')}`);
fs.mkdirSync(outDir, { recursive: true });
const description = `The whole body of a colossal armored space leviathan. ${SIDE} ${cabeca} ${BODY} ${COLOSSAL} ${DARK}`;

for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description,
    image_size: { width: W, height: H },
    no_background: true,
    seed,
    reference_images: [{ image: b64(RABO), size: await tamanho(RABO), usage_description: REF.usage }],
    style_image: { image: b64(RABO), size: await tamanho(RABO) },
    style_options: { color_palette: true, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${conceito}-${seed}-${i}.png`), buf));
  console.log(`${conceito} seed ${seed}: ${imgs.length}`);
}
