// BLOCO G · round 3 — PixelLab concepts for the F1 ground pieces (spec §6): the colony of DOMES of the final cutscene
// (`f8-sobrevoo.png`, the same colony, ruined there) as the DRAWING reference, now alive and TAKEN by the invaders;
// the invader turret; the rock; the wreck. The /generate-image-v2 (Pro) recipe of the elites: a subject crop when
// there is one (it locks the shape — so every piece also has a text-only sibling), a style crop for the pixel style.
// Side view (the game is a profile). Candidates go to <outDir>/<piece>/; the sheet picks 3–4 per piece.
//   node scripts/_g/_gerar-pecas-f1.mjs <piece> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

const [peca, outDir, ...seeds] = process.argv.slice(2);
const SOBREVOO = 'public/sprites/f8-sobrevoo.png';
// The crops (1× px of the flyover): the two domes on the left, and the lattice tower behind them.
const CUPULAS = { left: 25, top: 140, width: 115, height: 60 };
const TRELICA = { left: 22, top: 95, width: 28, height: 55 };

const SIDE =
  'Seen EXACTLY from the side, as a prop of a side-scrolling game standing on flat ground: a straight horizontal base ' +
  'along the bottom edge, nothing seen from above, no top-down view, no isometric view.';
const DARK =
  'Dark sci-fi pixel art at night: near-black gunmetal and dark slate armor, low contrast, a thin cold blue-grey rim ' +
  'light on the top edges, light ONLY where there is energy. Crisp pixel art, clean dark outline, transparent ' +
  'background, empty margin around it.';
const TOMADA =
  'It has been TAKEN by an alien biomechanical invasion: dark violet-black organic growth with thin tendrils clings to ' +
  'it and pierces its plating, with one or two small glowing MAGENTA pods. Most of its windows are dark; one or two ' +
  'still glow dim amber.';

const PECAS = {
  predio: {
    size: [64, 64],
    ref: CUPULAS,
    usage: 'the subject: the small dome habitat of this colony — a low ring wall with a rounded dome roof',
    description: `A small DOME HABITAT MODULE of a human mountain colony: a low cylindrical base with a rounded dome roof, a hatch door, a few small round windows, a short antenna on top. ${TOMADA} ${SIDE} ${DARK}`,
  },
  predioTexto: {
    size: [64, 64],
    description: `A small two-storey COLONY BUNKER with a half-dome roof: thick armored walls, a hatch, slit windows, a vent stack. ${TOMADA} ${SIDE} ${DARK}`,
  },
  silo: {
    size: [64, 64],
    description: `A tall cylindrical FUEL TANK of a human colony: a rounded armored tank on four short legs, pipes running down to the ground, a service ladder, a valve wheel. ${TOMADA} ${SIDE} ${DARK}`,
  },
  radar: {
    size: [64, 64],
    ref: TRELICA,
    usage: 'the subject: this thin steel lattice tower of the colony',
    description: `A thin steel LATTICE ANTENNA TOWER of a human colony: an open truss mast on a concrete foot, a small radar dish near the top, a red warning light on the tip. ${TOMADA} The violet-black growth climbs the truss. ${SIDE} ${DARK}`,
  },
  base: {
    size: [128, 128],
    ref: CUPULAS,
    usage: 'the subject: the dome of this colony, but LARGE — the central dome of the colony perimeter',
    description: `The big central DOME of a human mountain colony: a large half-sphere dome of dark armored panels on a thick ring wall, a big closed gate, a ring of small windows, antennas and pipes around it. ${TOMADA} A large magenta-lit organic mass has broken through the top of the dome. ${SIDE} ${DARK}`,
  },
  torre: {
    size: [48, 48],
    description:
      'An ALIEN BIOMECHANICAL TURRET rooted into rocky ground: a squat bulb of dark violet-black armored tissue with ' +
      'thick root-like tendrils spreading at its base and gripping the ground, ONE large glowing MAGENTA eye, and a ' +
      'short curved organic cannon barrel pointing UP and to the RIGHT. Small and stocky, wider than tall. ' + `${SIDE} ${DARK}`,
  },
  pilar: {
    size: [48, 64],
    description:
      'A tall jagged PEAK OF DARK ROCK: a broken rock spire with sharp facets and cracks, thin streaks of snow on its ' +
      'ledges, rubble at its foot. No buildings, no lights. ' + `${SIDE} ${DARK}`,
  },
  destroco: {
    size: [64, 40],
    ref: CUPULAS,
    usage: 'the subject: a dome of this colony — but COLLAPSED and broken',
    description: 'The WRECKAGE of a colony dome lying on the ground: a collapsed, split dome shell with bent ribs, a fallen antenna mast, rubble and broken plates. No lights, no alien growth. ' + `${SIDE} ${DARK}`,
  },
};

const p = PECAS[peca];
if (!p) throw new Error(`piece? ${Object.keys(PECAS).join(' | ')}`);
const dir = path.join(outDir, peca);
fs.mkdirSync(dir, { recursive: true });
const recorte = async (c) => {
  const buf = await sharp(SOBREVOO).extract(c).png().toBuffer();
  return { buf, size: { width: c.width, height: c.height } };
};
const estilo = await recorte(CUPULAS);
const ref = p.ref ? await recorte(p.ref) : null;

for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: p.description,
    image_size: { width: p.size[0], height: p.size[1] },
    no_background: true,
    seed,
    ...(ref && { reference_images: [{ image: b64(ref.buf), size: ref.size, usage_description: p.usage }] }),
    style_image: { image: b64(estilo.buf), size: estilo.size },
    style_options: { color_palette: false, outline: true, detail: true, shading: true },
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(dir, `${peca}-${seed}-${i}.png`), buf));
  console.log(`${peca} seed ${seed}: ${imgs.length}`);
}
