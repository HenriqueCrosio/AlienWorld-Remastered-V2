// 23/10 — THE GOTHIC SHIP, round 1b: he liked the gothic direction, but "there is almost no change between the tiers".
// Cause: round 1 drew T0/T1/T3 with the T2 as SUBJECT reference, and the Pro locks the form to its subject. Here every
// tier is described IN FULL (the same base words) plus what it has, counted part by part, with NO subject reference —
// only a style image. The ladder (each tier adds something you see in the silhouette):
//   T0 Chapel     one spire, no wing (a tail fin), one small engine, only the cockpit lit
//   T1 Church     two spires, the curved blade wing, two lit lancet windows
//   T2 Abbey      three spires (the middle one tallest), a gun under the nose, a bigger engine, a row of lit windows
//   T3 Cathedral  spires joined by flying-buttress arches, TWIN engines (two flames), two guns, a glowing rose window
// The lit windows tie the ship to the colony's lit windows (the menu): more tier, more energy, more light.
//   node scripts/_naves/_gerar-goticas.mjs <tier> <outDir> <seed> [<seed> ...] [--estilo=<png>]
import fs from 'node:fs';
import path from 'node:path';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const args = process.argv.slice(2);
const STYLE = args.find((a) => a.startsWith('--estilo='))?.slice(9) ?? 'public/sprites/ship-cinza.png';
// 23/10 (round 1c): he rejected 1b as far less detailed than today's ship. --detalhe swaps the "low contrast" dark
// text (it flattened the hull) for plates with lit edges and asks for the detail; --tamanho=WxH overrides the canvas.
const DETALHE = args.includes('--detalhe');
const TAM = args.find((a) => a.startsWith('--tamanho='))?.slice(10).split('x').map(Number);
const [tierS, outDir, ...seeds] = args.filter((a) => !a.startsWith('--'));
const tier = Number(tierS);

const BASE =
  'A GOTHIC WARSHIP FIGHTER, the gothic cathedral architecture of a dark space colony turned into a small fighter: ' +
  'a dagger-like dark hull with pointed-arch armor plates along the side and a narrow cockpit slit near the nose.';
const SIDE =
  'Seen EXACTLY from the side like an airplane silhouette in a side-scrolling shoot-em-up: the nose points RIGHT, ' +
  'belly at the bottom, spires on top. Nothing seen from above: no top-down view, not symmetric top-to-bottom. ' +
  'Much wider than tall.';
const DARK =
  'Dark sci-fi pixel art: the hull is dark graphite and gunmetal, desaturated, low contrast; warm AMBER-ORANGE light ' +
  'ONLY on the engine exhaust flame, the cockpit slit and the small lit windows. No orange paint on the hull. Crisp ' +
  'pixel art, clean dark outline, transparent background, small empty margin around it.';
const DARK_DETALHE =
  'Dark sci-fi pixel art, HIGHLY DETAILED for its size: a dark graphite and gunmetal hull built of layered armor ' +
  'plates, each plate with a thin lighter-grey edge highlight and a dark seam (three tones of grey, clearly readable ' +
  'planes), panel lines, vents, intakes, a glass cockpit canopy. Warm AMBER-ORANGE light ONLY on the engine flames, ' +
  'the cockpit and the small lit windows. No orange paint on the hull. Crisp pixel art, clean dark outline, ' +
  'transparent background, small empty margin around it.';

// The canvas of each tier (the Pro fills it; the drawing lands ~1–2 px smaller). The Pro's minimum height is 16.
// (23/10: the T1 at 34×16 came out WRAPPED — the ship longer than the canvas, its nose touching its own flame across
// the edge; 36×16 gives it room.)
const TAMANHO = { 0: [30, 16], 1: [36, 16], 2: [38, 18], 3: [40, 18] };

const ESCADA = {
  0: 'TIER 0, THE CHAPEL, the first and smallest form: a SHORT compact hull with only ONE small pointed spire on its ' +
    'back, NO wing (just a small tail fin), ONE small engine with a small flame. Only the cockpit slit is lit. Plain ' +
    'and simple, few parts.',
  1: 'TIER 1, THE CHURCH: a longer hull with TWO pointed spires on its back, a curved BLADE WING sweeping down under ' +
    'the body, one engine, and TWO small lit pointed-arch windows on the side.',
  2: 'TIER 2, THE ABBEY: THREE pointed spires on its back, the middle one the tallest, a big curved blade wing under ' +
    'the body, a long GUN BARREL under the nose, one BIGGER engine with a bigger flame, and a ROW of small lit ' +
    'pointed-arch windows along the side.',
  3: 'TIER 3, THE CATHEDRAL, the final and strongest form: a tall central spire flanked by smaller pinnacles, joined ' +
    'by FLYING-BUTTRESS ARCHES, a big curved blade wing, TWIN ENGINES stacked one above the other with TWO flames, ' +
    'TWO gun barrels under the nose, a small glowing ROUND ROSE WINDOW and a row of lit windows. Still a sleek ' +
    'fighter, NOT bulky.',
};

if (!(tier in TAMANHO) || !outDir || !seeds.length) throw new Error('usage: <tier 0–3> <outDir> <seed...> [--estilo=png]');
fs.mkdirSync(outDir, { recursive: true });
const [w, h] = TAM ?? TAMANHO[tier];
const styleSize = await tamanho(STYLE);
const rotulo = path.basename(STYLE, '.png');

for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: `${BASE} ${ESCADA[tier]} ${SIDE} ${DETALHE ? DARK_DETALHE : DARK}`,
    image_size: { width: w, height: h },
    no_background: true,
    seed,
    style_image: { image: b64(STYLE), size: styleSize },
    style_options: { color_palette: false, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `gotica-t${tier}-${seed}-${i}.png`), buf));
  console.log(`gotica T${tier} seed ${seed} (style ${rotulo}): ${imgs.length}`);
}
