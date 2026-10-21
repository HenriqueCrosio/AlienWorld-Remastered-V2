// BLOCO G · round 6 — the F1 ground structures REDONE DARK (his notes on round 3, 20/10: "as gerações estão muito
// claras, nem parece um dark sci-fi… o meu dark sci-fi é mais puxado pra obscuro"; and the design he picked: MIX the two
// — the colony's DOME habitats at the base with GOTHIC towers and pinnacles growing out of them, the citadel of his
// painting taking over the old dome colony).
// What changed from round 3 (`_gerar-pecas-f1.mjs`):
//   - the STYLE image is HIS painting: the citadel crop of `public/sprites/f1/pintura.png` (dark gothic towers, dim amber
//     windows), and EVERY style option is taken from it (palette, outline = none, detail, shading) — round 3 took the
//     style from the final cutscene's lit domes and asked for "a clean dark outline": that was the brightness and the
//     sticker look;
//   - the dome crop of the cutscene stays only as a SUBJECT reference (the shape of the domes), for the dome pieces;
//   - the prompt asks for no outline and the painting's darkness; every candidate is then MEASURED (`_medir-pecas.mjs`).
// Side view (the game is a profile). Candidates go to <outDir>/<piece>/.
//   node scripts/_g/_gerar-pecas-escuras-f1.mjs <piece> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

const [peca, outDir, ...seeds] = process.argv.slice(2);
const PINTURA = 'public/sprites/f1/pintura.png';
const SOBREVOO = 'public/sprites/f8-sobrevoo.png';
// The citadel of his painting (game px of the 429×216 painting): the gothic towers and their lit windows.
const CIDADELA = { left: 258, top: 36, width: 108, height: 90 };
// The two domes of the final cutscene (1× px of the flyover): only the SHAPE of a dome.
const CUPULAS = { left: 25, top: 140, width: 115, height: 60 };

const SIDE =
  'Seen EXACTLY from the side, as a prop of a side-scrolling game: a straight horizontal base along the bottom edge, ' +
  'nothing seen from above, no top-down view, no isometric view.';
const DARK =
  'In the style of the reference painting: a very DARK night, dark-fantasy sci-fi, painterly pixel art with NO outline. ' +
  'Near-black slate, soot and gunmetal, very low contrast, details only hinted in darker and lighter near-blacks, a faint ' +
  'cold blue-grey rim light only on the top edges. Light ONLY where there is energy: a few dim amber windows. ' +
  'Transparent background, empty margin around it.';
const MISTO =
  'A building of a human mountain colony where an old DOME habitat was later crowned by GOTHIC architecture: the round ' +
  'dome at the base, and slender gothic spires, pointed arches, buttresses and pinnacles rising out of it.';
const TOMADA =
  'It has been TAKEN by an alien biomechanical invasion: dark violet-black organic growth with thin tendrils clings to ' +
  'it and pierces its plating, with one or two small glowing MAGENTA pods.';

const PECAS = {
  predio: {
    size: [64, 64],
    ref: CUPULAS,
    usage: 'the subject: the small dome habitat of this colony, only its rounded shape',
    description: `A small colony building. ${MISTO} A low round dome with a hatch door, and ONE narrow gothic spire with a lancet window rising from its top. ${TOMADA} ${SIDE} ${DARK}`,
  },
  predioTexto: {
    size: [64, 64],
    description: `A small two-storey colony BUNKER with a half-dome roof, crowned by two small gothic pinnacles; thick armored walls, a pointed-arch hatch, narrow lancet windows. ${TOMADA} ${SIDE} ${DARK}`,
  },
  silo: {
    size: [64, 64],
    description: `A tall cylindrical FUEL TANK of the colony with a rounded dome cap crowned by a small gothic pinnacle, iron buttress ribs down its sides, pipes running to the ground, a service ladder. ${TOMADA} ${SIDE} ${DARK}`,
  },
  radar: {
    size: [64, 64],
    description: `A slender GOTHIC IRON SPIRE used as an antenna mast: open pointed-arch tracery, a small radar dish near the top, a tiny red warning light on the tip, on a small dome foot. ${TOMADA} The violet-black growth climbs the spire. ${SIDE} ${DARK}`,
  },
  base: {
    size: [128, 128],
    ref: CUPULAS,
    usage: 'the subject: the dome of this colony, but LARGE — the central dome of the colony',
    description: `The big central DOME of the colony: a large half-sphere of dark armored panels on a thick ring wall, ringed by gothic buttresses and pinnacles, with a tall pointed-arch gate and a ring of narrow lancet windows. ${TOMADA} A large magenta-lit organic mass has broken through the top of the dome. ${SIDE} ${DARK}`,
  },
  torre: {
    size: [48, 48],
    description:
      'An ALIEN BIOMECHANICAL TURRET rooted into rocky ground: a squat bulb of dark violet-black armored tissue with ' +
      'thick root-like tendrils gripping the ground, ONE glowing MAGENTA eye, and a short curved organic cannon barrel ' +
      'pointing UP and to the RIGHT. Small and stocky, wider than tall. ' + `${SIDE} ${DARK}`,
  },
  pilar: {
    size: [48, 64],
    description:
      'A tall jagged PEAK OF DARK ROCK like the mountains of the reference: a broken rock spire with sharp facets, cracks ' +
      'and ledges, rubble at its foot. No buildings, no lights. ' + `${SIDE} ${DARK}`,
  },
  // The TALL rock (21/10): the game's rock goes up to 76 px and pixel art is never enlarged — the tall heights are baked
  // from these.
  pilarAlto: {
    size: [64, 96],
    description:
      'A very tall jagged SPIRE OF DARK ROCK like the mountains of the reference: a narrow broken rock needle with sharp ' +
      'facets, cracks and small ledges, much taller than wide, rubble at its foot. No buildings, no lights. ' + `${SIDE} ${DARK}`,
  },
  // THE CLUSTERS (21/10, his idea: "pode criar novos tipos de edifícios ou aglomerados"): decoration for a plane BEHIND
  // the structures — a stretch of the colony perimeter in one piece, so the colony reads as a place and not as props.
  aglomerado: {
    size: [192, 96],
    ref: CUPULAS,
    usage: 'the subject: the domes of this colony, several of them grouped',
    description: `A CLUSTER of colony buildings on a low rocky ledge, a stretch of a ruined colony perimeter seen from the side: two or three domes of different sizes with slender gothic spires and pinnacles rising from them, a cylindrical tank, a thin iron antenna, pipes and a walkway joining them, some parts broken. ${TOMADA} A few dim amber windows. ${SIDE} ${DARK}`,
  },
  destroco: {
    size: [64, 40],
    ref: CUPULAS,
    usage: 'the subject: a dome of this colony — but COLLAPSED and broken',
    description: 'The WRECKAGE of a colony dome lying on the ground: a collapsed, split dome shell with bent ribs and a fallen broken gothic spire across it, rubble and broken plates. No lights, no alien growth. ' + `${SIDE} ${DARK}`,
  },
};

const p = PECAS[peca];
if (!p) throw new Error(`piece? ${Object.keys(PECAS).join(' | ')}`);
const dir = path.join(outDir, peca);
fs.mkdirSync(dir, { recursive: true });
const recorte = async (src, c) => ({ buf: await sharp(src).extract(c).png().toBuffer(), size: { width: c.width, height: c.height } });
const estilo = await recorte(PINTURA, CIDADELA);
const ref = p.ref ? await recorte(SOBREVOO, p.ref) : null;

for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: p.description,
    image_size: { width: p.size[0], height: p.size[1] },
    no_background: true,
    seed,
    ...(ref && { reference_images: [{ image: b64(ref.buf), size: ref.size, usage_description: p.usage }] }),
    style_image: { image: b64(estilo.buf), size: estilo.size },
    style_options: { color_palette: true, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(dir, `${peca}-${seed}-${i}.png`), buf));
  console.log(`${peca} seed ${seed}: ${imgs.length}`);
}
