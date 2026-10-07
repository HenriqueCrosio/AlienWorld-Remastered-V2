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
  // 07/10 — he liked none of the crescent hunters: new SILHOUETTES, no subject ref (the concept crop forced the
  // crescent every time); the approved sentinel stays as the pixel style.
  cacadorLula: {
    size: 48,
    style: 'public/sprites/elite-sentinela.png',
    description:
      `A VOID HUNTER like a deep-sea predator squid: a long pointed armored mantle at the FRONT, one red glowing eye, ` +
      `and a bundle of long hooked tendrils trailing straight BEHIND it to the right, tips curled like hooks. ${SIDE} ` +
      `Wider than tall, fast and sinister. ${DARK}`,
  },
  cacadorVespa: {
    size: 48,
    style: 'public/sprites/elite-sentinela.png',
    description:
      `A VOID HUNTER like a giant armored wasp: a long thin NEEDLE STINGER pointing FORWARD as its gun, a narrow ` +
      `segmented thorax, two thin translucent dark wings folded back along the body, a ridged abdomen at the rear ` +
      `with a red glowing core. ${SIDE} Wider than tall, sleek and fast. ${DARK}`,
  },
  cacadorArraia: {
    size: 48,
    style: 'public/sprites/elite-sentinela.png',
    description:
      `A VOID HUNTER like a phantom manta ray with spikes: a flat wedge body with a sharp nose at the FRONT, wing ` +
      `edges serrated with small spikes, a long whip tail with a barb trailing behind to the right, red glowing gill ` +
      `slits and one red core. ${SIDE} Much wider than tall, a gliding silhouette. ${DARK}`,
  },
  cacadorLouva: {
    size: 48,
    style: 'public/sprites/elite-sentinela.png',
    description:
      `A VOID HUNTER like a biomechanical praying mantis: a hunched armored body with two big raptorial SCYTHE ` +
      `forelimbs folded in FRONT of it ready to strike, a small angular head with red glowing eyes, a long tapered ` +
      `abdomen behind with red veins. ${SIDE} An ambush predator, wider than tall. ${DARK}`,
  },
  // 07/10 — the tentacle, new round: four new HEAD species (no subject ref) + the WHOLE worm as one straight column,
  // so the segments are sliced from its own body (a lone segment never chains well — lesson of 06/10).
  tentaculoLampreia: {
    size: 32,
    style: 'public/sprites/elite-sentinela.png',
    description:
      `The HEAD of a biomechanical lamprey-worm bursting up from a hull, its round SUCKER MAW facing LEFT and slightly ` +
      `up: concentric rings of small hooked teeth inside, red glowing throat, thick armored ring plates behind the ` +
      `head. ${SIDE} ${DARK}`,
  },
  tentaculoMoreia: {
    size: 32,
    style: 'public/sprites/elite-sentinela.png',
    description:
      `The HEAD of an armored moray-eel worm, its long JAWS open facing LEFT showing curved fangs, a small red ` +
      `glowing eye, ridged dark armor plates on the skull and a thick neck going down. ${SIDE} ${DARK}`,
  },
  tentaculoPinca: {
    size: 32,
    style: 'public/sprites/elite-sentinela.png',
    description:
      `The HEAD of a biomechanical centipede-worm: two big curved MANDIBLE pincers open facing LEFT, a cluster of ` +
      `small red glowing eyes, a segmented armored head capsule and a thick neck going down. ${SIDE} ${DARK}`,
  },
  tentaculoFlor: {
    size: 32,
    style: 'public/sprites/elite-sentinela.png',
    description:
      `The HEAD of a giant sandworm-like tentacle whose tip OPENS LIKE A FLOWER: four armored jaw petals spread ` +
      `open toward the LEFT, rows of thin teeth and a red glowing throat inside, a thick ringed armored neck going ` +
      `down. ${SIDE} ${DARK}`,
  },
  tentaculoInteiro: {
    size: [32, 96],
    ref: 'tentaculo.png',
    usage: 'the subject: this armored segmented worm-tentacle with a round maw ringed with red lights and hooked claws',
    style: 'public/sprites/elite-sentinela.png',
    description:
      `This WHOLE armored worm-tentacle standing STRAIGHT UP like a column rising from the ground: its round maw at ` +
      `the TOP facing LEFT, ringed with red glowing lights and hooked claws, and below it a long body of IDENTICAL ` +
      `overlapping armored ring segments all the way down, each with one tiny dim red light. ${SIDE} Tall and thin. ` +
      `${DARK}`,
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
const refArq = p.ref && path.join(REF, p.ref);
const styleSize = await tamanho(p.style);

for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: p.description,
    image_size: Array.isArray(p.size) ? { width: p.size[0], height: p.size[1] } : { width: p.size, height: p.size },
    no_background: true,
    seed,
    ...(refArq && {
      reference_images: [{ image: b64(refArq), size: await tamanho(refArq), usage_description: p.usage }],
    }),
    style_image: { image: b64(p.style), size: styleSize },
    style_options: { color_palette: false, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => {
    const f = path.join(outDir, `${peca}-${seed}-${i}.png`);
    fs.writeFileSync(f, buf);
  });
  console.log(`${peca} seed ${seed}: ${imgs.length}`);
}
