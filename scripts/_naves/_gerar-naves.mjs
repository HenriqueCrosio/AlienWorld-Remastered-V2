// 22/10 — THE NEW HUMAN SHIPS, round 1: three design directions, each a family T0 → T3 (spec in the 22/10 sheet,
// `folhas/2026-10-22/menu.html` §4). PixelLab Pro (/generate-image-v2) at the FINAL size, side profile, graphite hull,
// amber only where there is energy. Style = `ship-cinza.png` (the old roster's dark gunmetal profile, 30×16; its
// palette is NOT forced, so the accent can be amber). The family tiers use the chosen anchor as SUBJECT reference
// (the Pro locks the form to it: that is what an evolution needs).
//   node scripts/_naves/_gerar-naves.mjs <direction> <tier> <outDir> <seed> [<seed> ...] [--ancora=<png>]
import fs from 'node:fs';
import path from 'node:path';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const args = process.argv.slice(2);
const ancora = args.find((a) => a.startsWith('--ancora='))?.slice(9);
const [direcao, tierS, outDir, ...seeds] = args.filter((a) => !a.startsWith('--'));
const tier = Number(tierS);

const STYLE = 'public/sprites/ship-cinza.png';
const SIDE =
  'Seen EXACTLY from the side like an airplane silhouette in a side-scrolling shoot-em-up: the nose points RIGHT, ' +
  'belly at the bottom, cockpit on top, wings seen edge-on. Nothing seen from above: no top-down view, not ' +
  'symmetric top-to-bottom. Much wider than tall.';
const DARK =
  'Dark sci-fi pixel art: the hull is dark graphite and gunmetal, desaturated, low contrast; warm AMBER-ORANGE light ' +
  'ONLY on the engine exhaust glow, the small cockpit window and one thin running-light line. No orange paint on ' +
  'the hull. Crisp pixel art, clean dark outline, transparent background, small empty margin around it.';

// The size of each tier: the drawing grows with the tier, in a narrow band (T3 ≈ 36×15). The canvas is a bit larger
// than the drawing, because the Pro fills the frame.
// (The T2 anchors at 38×18 came out ~35×16; the others are sized around them. The Pro's minimum is 16 px.)
const TAMANHO = { 0: [30, 16], 1: [34, 16], 2: [38, 18], 3: [39, 18] };

// The FAMILY: what each tier adds, the same words for every direction.
const EVOLUCAO = {
  // (The first T0 wording, "the simplest version… very light", gave the lance a blurry flat wedge, 22/10: the T0 asks
  // for the same crisp details, only fewer and smaller.)
  0: 'TIER 0, the first and smallest form: the same crisp design with fewer parts — one small engine, the tail fin, ' +
    'the cockpit — short and compact.',
  1: 'TIER 1: the same ship a little bigger, cleaner and faster-looking, one engine, a small tail fin.',
  2: 'TIER 2: the same ship upgraded: a bigger engine, an extra armor plate, a gun under the nose.',
  3: 'TIER 3, the final form: the same ship at its strongest, twin engines, heavier armor plates and a second gun — ' +
    'compact, NOT bulky, still a fighter.',
};

const DIRECOES = {
  // A — the interceptor: long, thin, fast.
  lanca:
    'A SLEEK INTERCEPTOR FIGHTER: a long needle nose, a slim fuselage, a small canopy near the front, one swept wing ' +
    'seen edge-on under the body, a single engine nozzle at the rear, a short tail fin on top.',
  // B — the armored gunship: a short, angular flying wedge.
  couraca:
    'A COMPACT ARMORED GUNSHIP: a thick angular wedge hull with sloped armor plates like a flying tank, a short blunt ' +
    'cannon nose, a narrow slit cockpit window, small stub wings, chunky engine nozzles at the rear.',
  // C — the gothic warship: the colony's own architecture (his gothic citadel paintings) as a fighter. (A first C, the
  // "colony patrol craft" with a rounded ribbed hull, came out as a capsule — a tube with a ring, no fighter — 22/10.)
  gotica:
    'A GOTHIC WARSHIP FIGHTER: a long dagger-like hull with two or three sharp pointed spires rising from its back like ' +
    'the towers of a gothic cathedral, pointed-arch armor plates along the side, a narrow cockpit slit near the front, ' +
    'a blade wing curving down under the body, a single engine at the rear.',
};

const desc = DIRECOES[direcao];
if (!desc || !(tier in TAMANHO)) throw new Error(`direction? ${Object.keys(DIRECOES).join(' | ')} · tier 0–3`);
fs.mkdirSync(outDir, { recursive: true });
const [w, h] = TAMANHO[tier];
const styleSize = await tamanho(STYLE);

for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: `${desc} ${EVOLUCAO[tier]} ${SIDE} ${DARK}`,
    image_size: { width: w, height: h },
    no_background: true,
    seed,
    ...(ancora && {
      reference_images: [{
        image: b64(ancora),
        size: await tamanho(ancora),
        usage_description: 'the subject: THIS exact ship design (same shapes, same hull, same palette) — draw its ' +
          `${tier === 3 ? 'stronger, final' : tier === 0 ? 'smaller, simpler first' : 'next'} form`,
      }],
    }),
    style_image: { image: b64(STYLE), size: styleSize },
    style_options: { color_palette: false, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${direcao}-t${tier}-${seed}-${i}.png`), buf));
  console.log(`${direcao} T${tier} seed ${seed}: ${imgs.length}`);
}
