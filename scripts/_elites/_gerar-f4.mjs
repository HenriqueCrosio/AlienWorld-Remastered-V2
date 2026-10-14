// FRENTE B · FATIA F4 — PixelLab candidates for the F4 elites (spec 2026-10-12-frente-b-fatia-f4-design.md §5).
// The F3 recipe (`_gerar-f3.mjs`): Henrique's concept crop = SUBJECT reference; the approved squid = pixel STYLE.
// The concept as subject LOCKS the shape (07/10), and the Larva's concept is a LONG body — so every piece has a
// text-only sibling (no subject ref) that asks for the compact creature in words.
//   node scripts/_elites/_gerar-f4.mjs <piece> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [peca, outDir, ...seeds] = process.argv.slice(2);
const REF = 'docs/superpowers/folhas/2026-10-13/elites/f4/ref';
const ESTILO = 'public/sprites/elite-cacador.png';

const SIDE =
  'Seen EXACTLY from the side (side-scrolling shoot-em-up profile), facing LEFT, like a side-view sprite: ' +
  'nothing seen from above, no top-down view, no front view.';
const DARK =
  'Dark sci-fi pixel art: near-black gunmetal armor plates over dark crimson living tissue, low contrast, light ONLY ' +
  'on energy points (small glowing red lights). Crisp pixel art, clean dark outline, transparent background, empty ' +
  'margin around it.';

const LARVA_CORPO =
  'a big armored head with ONE large red glowing eye and two curved horn-like mandibles, then only THREE or FOUR ' +
  'thick ribbed armored segments, and a small pointed DRILL at the tip of the tail';
const TUBO_CORPO =
  'a short, fat, ribbed stump of dark crimson tissue rooted to the ground, with dark armored rings around the trunk ' +
  'and a few small red glowing nodules';

const PECAS = {
  // The concept as subject: faithful, but watch the length.
  larva: {
    size: 40,
    ref: 'larva.png',
    usage: 'the subject: this mechanical larva — armored head with a red eye and horns, ribbed segments, drill tail — but SHORT and curled up',
    description:
      `A MECHANICAL LARVA of a living leviathan, COMPACT and curled up: ${LARVA_CORPO}. The body is SHORT and curled ` +
      `under the head like a shrimp, almost as tall as it is wide. NOT a long worm, NOT a snake. ${SIDE} ${DARK}`,
  },
  // Text only — the curled grub.
  larvaGrub: {
    size: 40,
    description:
      `A BIOMECHANICAL GRUB, fat and compact: ${LARVA_CORPO}. The body is curled in a tight C like a beetle grub or a ` +
      `shrimp, the drill tail tucked under and pointing forward. Almost as tall as it is wide. NOT a long worm, NOT a ` +
      `snake. ${SIDE} ${DARK}`,
  },
  // Text only — the armored borer (straighter, a drill bug).
  larvaBroca: {
    size: 40,
    description:
      `A BIOMECHANICAL BORER, a stubby armored maggot built to drill through walls: ${LARVA_CORPO}. The body is short ` +
      `and thick, slightly arched like a pill bug, the head low at the front and the spiral drill raised at the rear. ` +
      `Wider than tall, stocky. NOT a long worm, NOT a snake. ${SIDE} ${DARK}`,
  },
  // The Tube, closed, sitting on the floor: the flat base at the bottom edge.
  tubo: {
    size: [40, 32],
    ref: 'tubo.png',
    usage: 'the subject: this living tube with a round toothed mouth — but SHORT, standing upright on the ground, mouth closed',
    description:
      `A PULSING TUBE, a living organ of a leviathan: ${TUBO_CORPO}. It stands UPRIGHT on the ground like a barnacle ` +
      `or a closed sea anemone; the round mouth on TOP is CLOSED, a puckered ring of small dark teeth. Swollen, ` +
      `wider than tall, with a wide FLAT BASE along the bottom. Seen from the side. ${DARK}`,
  },
  tuboCraca: {
    size: [40, 32],
    description:
      `A LIVING TURRET growing out of a wall of living tissue, like a giant barnacle: ${TUBO_CORPO}. A low volcano ` +
      `shape, the mouth on TOP closed tight like a sphincter with a ring of small dark teeth, thick root-like ` +
      `tendons spreading at its wide FLAT BASE along the bottom. Swollen, wider than tall. Seen from the side. ${DARK}`,
  },
  // 14/10 — he: "as pupas precisam parecer pupas e os esporos, esporos". Generated BIG (the canvas floor), then
  // reduced to the in-game size on the sheet; the hand-drawn ones (`_mao-f4b.mjs`) are drawn at the real size.
  pupa: {
    size: 32,
    style: 'public/sprites/elite-larva-a-poe-0.png',
    description:
      'An INSECT PUPA, a chrysalis: an elongated capsule, tapered at both ends, the hard dark shell divided into ' +
      'stacked RING SEGMENTS like a moth cocoon, the folded outline of a creature pressed under the shell, a dim red ' +
      'glow seeping through the cracks between segments. Floating alone, tilted slightly. Biomechanical: dark gunmetal ' +
      'husk over crimson tissue. ' + DARK,
  },
  pupaCasulo: {
    size: 32,
    style: 'public/sprites/elite-larva-a-poe-0.png',
    description:
      'A small biomechanical COCOON, egg-sac like a spider egg case: an oval pod of dark leathery membrane wrapped in ' +
      'a few thin fibrous strands, slightly translucent at its middle where a curled red larva glows faintly inside. ' +
      'Floating alone, vertical. ' + DARK,
  },
  esporo: {
    size: 32,
    style: 'public/sprites/elite-tubo-c-pulso-0.png',
    description:
      'A single floating FUNGAL SPORE, like a pollen grain under a microscope: a small round ball with a bumpy, ' +
      'spiky coat of tiny short spines, glowing pale sickly yellow-green from inside, soft and organic, NOT a bullet, ' +
      'NOT metallic. Pixel art, dark outline, transparent background, empty margin around it.',
  },
  esporoNuvem: {
    size: 32,
    style: 'public/sprites/elite-tubo-c-pulso-0.png',
    description:
      'A small drifting PUFF OF SPORES: a loose cluster of five to eight tiny round pale yellow-green glowing grains ' +
      'of different sizes inside a faint hazy dust cloud, soft and organic, NOT a bullet, NOT fire. Pixel art, ' +
      'transparent background, empty margin around it.',
  },
};

const p = PECAS[peca];
if (!p) throw new Error(`piece? ${Object.keys(PECAS).join(' | ')}`);
fs.mkdirSync(outDir, { recursive: true });
const refArq = p.ref && path.join(REF, p.ref);
const estilo = p.style ?? ESTILO;
const styleSize = await tamanho(estilo);

for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: p.description,
    image_size: Array.isArray(p.size) ? { width: p.size[0], height: p.size[1] } : { width: p.size, height: p.size },
    no_background: true,
    seed,
    ...(refArq && {
      reference_images: [{ image: b64(refArq), size: await tamanho(refArq), usage_description: p.usage }],
    }),
    style_image: { image: b64(estilo), size: styleSize },
    style_options: { color_palette: false, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => {
    const f = path.join(outDir, `${peca}-${seed}-${i}.png`);
    fs.writeFileSync(f, buf);
  });
  console.log(`${peca} seed ${seed}: ${imgs.length}`);
}
