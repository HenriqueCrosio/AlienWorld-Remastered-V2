// BLOCO D · passo 2, 2ª rodada (18/10) — his correction: the final Leviathan must arrive AT THE SAME ANGLE and with
// the same damage as the approved one (`f8-leviata.png`): 3/4 from above and in front, head to the LEFT coming at
// the camera, the body receding to the right into the debris cloud, the exposed ribs on the back seen from above,
// the HUGE torn hole in the middle of the body (bone-lipped flaps, spilling debris), the lava-crack web all over,
// dull colours. Only the creature's DESIGN changes, to the approved base (mandible head 0.7 + shark body, seam 42):
// a plated hull instead of whale skin, the mandible head, shark fins.
//   edit — /edit-images-v2, edit_with_reference: the old art IS the image edited; the base is the reference.
//   text — /edit-images-v2, edit_with_text: the same, the new design only in words.
//   gera — /generate-image-v2: the old art as the composition/angle/damage reference, the base as the design one.
//   node scripts/_leviata/_final-angulo.mjs <edit|text|gera> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [modo, outDir, ...seeds] = process.argv.slice(2);
const ANTIGO = 'public/sprites/f8-leviata.png'; // 359×131, the cut of the approved concept
const BASE = 'docs/superpowers/folhas/2026-10-18/leviata/aprovado/leviata-base.png'; // 363×160
const W = 359, H = 131;
fs.mkdirSync(outDir, { recursive: true });

const MANTER =
  'Keep EXACTLY the same composition, camera angle and pose: a three-quarter view from above and in front, the head ' +
  'on the LEFT closest to the camera, the body receding to the right into a cloud of debris, the exposed rib bones ' +
  'on the back seen from above, the HUGE torn hole in the middle of the body with bone-edged flaps and debris ' +
  'spilling out, the web of thin glowing lava cracks all over, dull weakened colours. It is dying.';
const NOVO =
  'Change only the creature design: its skin becomes a hull of overlapping near-black blue-grey armor plates with ' +
  'fine seams, the head becomes a massive armored head with open plated mandibles and fangs, the fins become ' +
  'shark-like spined fins with torn ragged membrane.';
const DARK = 'Dark sci-fi pixel art, light only in the lava. Transparent background.';

for (const seed of seeds.map(Number)) {
  let imgs;
  if (modo === 'gera') {
    imgs = await gerar('/generate-image-v2', {
      description: `A colossal wounded space leviathan, dying. ${MANTER} ${NOVO} ${DARK}`,
      image_size: { width: W, height: H },
      no_background: true,
      seed,
      reference_images: [
        { image: b64(ANTIGO), size: await tamanho(ANTIGO), usage_description: 'the COMPOSITION, camera angle, pose and damage: this exact view, the torn hole in the middle, the ribs, the lava cracks' },
        { image: b64(BASE), size: await tamanho(BASE), usage_description: 'the creature DESIGN: these armor plates, this mandible head, these shark fins' },
      ],
      style_image: { image: b64(ANTIGO), size: await tamanho(ANTIGO) },
      style_options: { color_palette: true, outline: true, detail: true, shading: true },
    });
  } else {
    imgs = await gerar('/edit-images-v2', {
      method: modo === 'edit' ? 'edit_with_reference' : 'edit_with_text',
      edit_images: [{ image: b64(ANTIGO), width: W, height: H }],
      image_size: { width: W, height: H },
      description: `${MANTER} ${NOVO} ${DARK}`,
      ...(modo === 'edit' && { reference_image: { image: b64(BASE), width: 363, height: 160 } }),
      no_background: true,
      seed,
    });
  }
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${modo}-${seed}-${i}.png`), buf));
  console.log(`${modo} ${seed}: ${imgs.length}`);
}
