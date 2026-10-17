// 17/10 — CONCEPTS FOR THE F4'S OWN FOREGROUND (polish block C). Block A removed the old `derelict` silhouettes (they
// bit into the border); this replaces the lost depth with ORGANIC, NEAR-BLACK silhouettes that live in the border band
// only — between the screen edge and the border's surface line, never crossing it (measured: ≥ 26 px of band in every
// chamber after t≈8, 44–82 px in the duct). Each concept is a 256×64 strip: a row of growths rising from the BOTTOM edge
// (the ceiling uses the same pieces flipped), cut later into pieces. Style ref: the chamber A border (sinew).
//   node scripts/_polimento/_gerar-frente-f4.mjs <concept> <out dir> <seed...>
import fs from 'node:fs';
import path from 'node:path';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

// v2 (17/10): the first strips gave TALL NARROW columns (8–22 px wide once they fit the band) that vanished in the game.
// The band is ~26 px high in the chambers, so the pieces are now WIDE AND LOW: 2–3 long clumps along the edge, in the
// lower half of the image (a 320×32 canvas came back EMPTY: too thin for the generator).
//   … [width=256] [height=64] [shape: alto | baixo | solto = baixo]
// `solto` (17/10, the other reading of the report: "limited to the middle of the corridor, not crossing the border"):
// FLOATING fragments that drift past close to the camera, touching nothing.
const [conceito, outDir, W_S = '256', H_S = '64', FORMA = 'baixo', ...seeds] = process.argv.slice(2);
const W = Number(W_S), H = Number(H_S);
const STYLE = 'public/sprites/f4-faixa-a.png';

const BASE =
  'Foreground silhouettes for a side-scrolling shoot-em-up set INSIDE the body of a colossal space leviathan. ' +
  (FORMA === 'solto'
    ? 'Seven to nine SEPARATE small organic fragments FLOATING in the air, scattered across the image, each one 10 to 34 ' +
      'pixels across, none touching another or any edge of the image,'
    : FORMA === 'baixo'
    ? 'Two or three LONG, LOW, WIDE separate organic masses lying along the BOTTOM edge of the image (each one 70 to 140 ' +
      'pixels wide, with an uneven top contour: mostly LOW, in the lower HALF of the image, with a few taller tufts ' +
      'reaching at most two thirds of the height), all rooted on the bottom edge,'
    : 'A row of 5 to 7 separate organic growths of DIFFERENT heights (from very short to the full image height), all ' +
      'rooted on the BOTTOM edge of the image and growing upward,') +
  (FORMA === 'solto' ? '' : ' with empty transparent gaps between them. NONE touches the top or side edges: the tallest stops well below the top, every tip is complete.') + ' They are very ' +
  'close to the camera and out of the light: ALMOST BLACK (near-black plum and charcoal), flat dark silhouettes with ' +
  'only a faint thin dark-red rim light on the top edges. No bright colors, no background, transparent background. ' +
  'Crisp pixel art, side view.';

const CONCEITOS = {
  tendoes: 'The growths are bundles of SINEW and fibrous TENDON strands, twisted and stretched, some splitting into thin roots, a few torn strands curling at the tips.',
  ossos: 'The growths are curved BONE SPURS and cartilage hooks, like broken rib tips and thorny vertebra spines, smooth and sharp, bent toward the left.',
  polipos: 'The growths are clusters of POLYPS and barnacle-like tube growths, bulbous lumps with tiny dark pores, soft rounded silhouettes stacked on each other.',
  fragmentos: 'The fragments are torn scraps of tissue, clots, sinew knots and small spore pods, irregular shapes with ragged edges, a few trailing short strands.',
  membrana: 'The growths are torn MEMBRANE folds stretched between thin filaments, ragged sheets of tissue with holes, hanging loose like wet webbing.',
};

const desc = CONCEITOS[conceito];
if (!desc) throw new Error(`concept? ${Object.keys(CONCEITOS).join(' | ')}`);
fs.mkdirSync(outDir, { recursive: true });
for (const s of seeds) {
  const seed = Number(s);
  const imgs = await gerar('/generate-image-v2', {
    description: `${BASE} ${desc}`,
    image_size: { width: W, height: H },
    no_background: true,
    seed,
    style_image: { image: b64(STYLE), size: await tamanho(STYLE) },
    style_options: { color_palette: false, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${conceito}-${seed}-${i}.png`), buf));
  console.log(`${conceito} seed ${seed}: ${imgs.length}`);
}
