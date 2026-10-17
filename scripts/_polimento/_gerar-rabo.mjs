// POLIMENTO · BLOCO C · ITEM 6 — the colossal Leviathan tail, generated at SCREEN size (scale 1, no setScale).
// Today `rabo-leviata.png` is 107×73 drawn at 3.4× (364×248). The new art is born at ~368×248.
// The code pivots the beat at origin (0.92, 0.5): the peduncle (where the tail meets the body) must sit on the
// RIGHT edge, cut by the frame, and the fluke on the LEFT.
//   node scripts/_polimento/_gerar-rabo.mjs <concept> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [conceito, outDir, ...seeds] = process.argv.slice(2);
const W = 368;
const H = 248;

const RABO = 'public/sprites/rabo-leviata.png';
// The approved tail, upscaled nearest ×3 so the reference reads at the target size.
const raboRef = await sharp(RABO).resize(321, 219, { kernel: 'nearest' }).png().toBuffer();

const SIDE =
  'Seen EXACTLY from the side (side-scrolling shoot-em-up background), a profile view: the thick tail stalk ' +
  'enters from the RIGHT edge of the image and is CUT by the right border (the body continues off-frame), it ' +
  'tapers and curves to the LEFT and ends in a huge fluke on the left side. Nothing seen from above.';
const DARK =
  'Dark sci-fi pixel art: near-black blue-grey armor, desaturated, low contrast, light ONLY in the energy: thin ' +
  'glowing orange-amber lava cracks in the seams. Crisp pixel art, clean dark outline, transparent background.';
const COLOSSAL =
  'COLOSSAL scale: a space leviathan so big a starfighter could fly inside it — many small armor plates, fine ' +
  'seams and rivet-like details so it reads as enormous, not as a small creature.';

const CONCEITOS = {
  // A — faithful: the same silhouette and cracks as the approved tail, just drawn at screen size.
  fiel: {
    ref: raboRef,
    usage: 'the subject: this exact tail — same silhouette, same plates, same glowing orange cracks',
    description:
      `The armored tail of a giant space leviathan. ${SIDE} Segmented overlapping armor plates, a tall vertical ` +
      `fin-shaped fluke, glowing orange lava cracks between the big plates near the stalk. ${COLOSSAL} ${DARK}`,
  },
  // B — the tail as a piece of hull: plates like a ship's, tiny lights and floating debris give the scale.
  casco: {
    style: RABO,
    description:
      `The tail of a living space leviathan the size of a capital ship. ${SIDE} Its armor is a hull of hundreds of ` +
      `small overlapping plates like a battleship, with rows of tiny dim amber vents, barnacle-like growths and ` +
      `small chunks of debris drifting along it to show the immense scale. A tall fluke like a sail. ${DARK}`,
  },
  // C — cetacean flukes: both lobes of a whale tail visible, seen from the side and slightly below.
  baleia: {
    style: RABO,
    description:
      `The tail of a colossal armored space whale. ${SIDE} The fluke is a WHALE fluke with two wide pointed lobes, ` +
      `seen from the side and slightly below so both lobes show, mid-beat. Armored ridged skin with plates along ` +
      `the top of the stalk, glowing orange lava cracks in the seams. ${COLOSSAL} ${DARK}`,
  },
  // D — the ribbed one: vertebra ridges and exposed rib segments along the stalk (the armored canonical).
  costelas: {
    style: RABO,
    description:
      `The armored tail of a biomechanical space leviathan. ${SIDE} Along the stalk, a row of big curved vertebra ` +
      `ridges and rib-like armor bands, with glowing orange lava light leaking between them; a long spined fin ` +
      `fluke at the end, torn edges. ${COLOSSAL} ${DARK}`,
  },
};

// 16/10 — his pick: the fluke STYLE of D, the body as a blend of A and B. Two silhouettes, because the Leviathan
// also appears in the menu (`leviathan-swim-sheet`) and the final cutscene (`f8-leviata`), both with a two-lobed
// WHALE fluke: the fan of D as it came, and D's style on the two lobes (keeps the creature the same everywhere).
const CRU = 'docs/superpowers/folhas/2026-10-16/rabo/cru';
const BODY_AB =
  `The stalk is armored like a capital ship's hull: many overlapping dark plates with fine seams and tiny dim amber ` +
  `vents, a few barnacle-like growths, small debris drifting along it, and glowing orange lava cracks branching in ` +
  `the seams between the big plates near the right edge (a few cracks, not a web over everything).`;
const MARGEM = 'The whole fluke is INSIDE the image with an empty transparent margin on the left, top and bottom.';
const REFS_AB = [
  { arq: `${CRU}/casco-11-0.png`, usage: 'the BODY armor: these hull plates, vents and drifting debris' },
  { arq: `${CRU}/fiel-11-0.png`, usage: 'the BODY lava: these glowing orange cracks in the plate seams' },
];
Object.assign(CONCEITOS, {
  mescla: {
    refs: [{ arq: `${CRU}/costelas-11-0.png`, usage: 'the FLUKE: this torn fan fin with long spined rays' }, ...REFS_AB],
    style: `${CRU}/casco-11-0.png`,
    description:
      `The armored tail of a colossal space leviathan. ${SIDE} ${BODY_AB} It ends in a huge torn FAN FIN made of ` +
      `long dark spined rays with ragged membrane between them, spread wide up and down. ${MARGEM} ${COLOSSAL} ${DARK}`,
  },
  mesclaBaleia: {
    refs: [{ arq: `${CRU}/costelas-11-0.png`, usage: 'the FLUKE texture: spined rays and torn ragged membrane' }, ...REFS_AB],
    style: `${CRU}/casco-11-0.png`,
    description:
      `The armored tail of a colossal space whale. ${SIDE} ${BODY_AB} It ends in a WHALE fluke with two wide pointed ` +
      `lobes, one up and one down, seen from the side mid-beat; the lobes are made of long dark spined rays with ` +
      `ragged torn membrane between them. ${MARGEM} ${COLOSSAL} ${DARK}`,
  },
});

const c = CONCEITOS[conceito];
if (!c) throw new Error(`concept? ${Object.keys(CONCEITOS).join(' | ')}`);
fs.mkdirSync(outDir, { recursive: true });
const style = c.style ?? RABO;

for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: c.description,
    image_size: { width: W, height: H },
    no_background: true,
    seed,
    ...(c.ref && {
      reference_images: [{ image: b64(c.ref), size: await tamanho(c.ref), usage_description: c.usage }],
    }),
    ...(c.refs && {
      reference_images: await Promise.all(
        c.refs.map(async (r) => ({ image: b64(r.arq), size: await tamanho(r.arq), usage_description: r.usage })),
      ),
    }),
    style_image: { image: b64(style), size: await tamanho(style) },
    style_options: { color_palette: true, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${conceito}-${seed}-${i}.png`), buf));
  console.log(`${conceito} seed ${seed}: ${imgs.length}`);
}
