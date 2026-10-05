// FRENTE B — candidates for the F2 elites (spec 2026-10-05-frente-b-elites-design.md §3.6).
// Henrique's concept crop = SUBJECT reference; an approved F2 sprite = pixel STYLE reference.
//
//   node scripts/_elites/_gerar.mjs <piece> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [peca, outDir, ...seeds] = process.argv.slice(2);
const REF = process.env.ELITES_REF; // the concept crops (scratchpad)
if (!REF) throw new Error('set ELITES_REF to the concept crops folder');

const SIDE =
  'Seen EXACTLY from the side (side-scrolling shoot-em-up profile), facing LEFT, like a side-view sprite: ' +
  'nothing seen from above, no top-down view, no front view.';
const DARK =
  'Dark sci-fi pixel art: dark gunmetal hull, low contrast, light ONLY on energy points (small glowing lights). ' +
  'Crisp pixel art, clean dark outline, transparent background.';

const PECAS = {
  drone: {
    size: 48,
    ref: 'drone-mineracao.png',
    usage: 'the subject: this mining robot design — its armored segmented body, claw legs, orange energy lights',
    style: 'public/sprites/enemy-gunship-cinturao.png',
    description:
      `A small hovering MINING DRONE robot, a crab-like mining automaton with a compact armored body, short claw legs ` +
      `tucked under it and a DRILL arm pointing forward-left. ${SIDE} Orange-amber glowing lights on the joints and one ` +
      `orange eye. ${DARK}`,
  },
  asteroide: {
    size: 48,
    ref: 'touro.png',
    usage: 'the material: dark rock with glowing orange-amber crystal veins and spiky crystal shards',
    style: 'public/sprites/asteroid-2.png',
    description:
      `A large dark ASTEROID rock, roughly round and lumpy, with veins of glowing orange-amber mineral CRYSTAL breaking ` +
      `through its surface and a few short crystal shards sticking out; on its LEFT side a carved mining notch where a ` +
      `machine has been drilling. Grey-blue dark stone like the style reference, the crystal is the only light. ` +
      `Crisp pixel art, clean dark outline, transparent background.`,
  },
  sentinelaAberta: {
    size: 48,
    ref: 'sentinela.png',
    usage: 'the subject: this ring-shaped orbital sentinel — dark segmented ring hull with red glowing eye-turrets',
    style: 'public/sprites/enemy-gunship-cinturao.png',
    description:
      `An ORBITAL SENTINEL war machine UNFOLDED in combat stance, like a droideka from Star Wars: a dark armored ring ` +
      `hull split open into a hunched body with three thin spider legs braced below and two twin blaster arms aimed ` +
      `forward-left, a red glowing eye-sensor in the center. ${SIDE} Red glowing lights only on the eye and gun tips. ${DARK}`,
  },
  drone2: {
    size: 48,
    ref: 'drone-mineracao.png',
    usage: 'the subject: copy this heavy mining mech closely — stacked cylindrical armor segments, big hooked claws, orange lights',
    style: 'public/sprites/enemy-gunship-cinturao.png',
    description:
      `A HEAVY MINING MECH drone: a bulky body of stacked cylindrical armor segments like an industrial machine, ` +
      `two BIG HOOKED CLAWS hanging below it like a crab, a heavy rotary drill at its front. ${SIDE} Orange-amber ` +
      `glowing vents and one orange eye lamp. ${DARK}`,
  },
  asteroide2: {
    size: 64,
    ref: 'touro.png',
    usage: 'the material: dark rock studded with glowing orange-amber crystal clusters and spiky crystal shards',
    style: 'public/sprites/asteroid-2.png',
    description:
      `A LARGE dark ASTEROID, lumpy and irregular, filling most of the frame, with CLUSTERS of glowing orange-amber ` +
      `mineral CRYSTALS growing out of it (angular faceted shards, not cracks), concentrated on its left half where it ` +
      `has been mined. Grey-blue dark stone like the style reference; the crystal is the only light. ` +
      `Crisp pixel art, clean dark outline, transparent background.`,
  },
  sentinelaAberta2: {
    size: 48,
    ref: 'sentinela.png',
    usage: 'the subject: this sentinel ring hull — keep the thick dark segmented RING arcing around its body, red eye-turrets on it',
    style: 'public/sprites/enemy-gunship-cinturao.png',
    description:
      `An ORBITAL SENTINEL war machine standing UNFOLDED: its thick dark segmented RING hull opens into a C-shaped arc ` +
      `that curves over and around its small core like a shield frame, three thin spider legs braced below, a twin ` +
      `blaster aimed forward-left from the core, small red glowing turret-eyes along the ring. ${SIDE} Like a droideka ` +
      `from Star Wars, but built from a ring. ${DARK}`,
  },
  sentinelaRoda: {
    size: 32,
    ref: 'sentinela.png',
    usage: 'the subject: this ring-shaped orbital sentinel — dark segmented ring hull with red glowing eye-turrets',
    style: 'public/sprites/enemy-gunship-cinturao.png',
    description:
      `A war machine CURLED UP into a closed armored WHEEL / ball for rolling, like a rolled-up droideka from Star Wars: ` +
      `a round dark segmented armor shell seen from the side, armor plates overlapping, a few small red glowing lights ` +
      `between the plates. ${DARK}`,
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
    console.log(f);
  });
}
