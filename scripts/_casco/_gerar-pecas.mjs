// F3 HULL PROPS, REDONE (10/11) — he: "as chaminés e torres de mísseis da parte do casco [...] slopado demais [...] nem a
// torre e nem a chaminé estão no estilo do jogo". Concepts for the two props that live on the Leviathan's back, each
// described WHOLE as a different growth of the hull, with an approved hull piece as the pixel STYLE (no subject ref: a
// subject ref locks the shape — pixellab-ferramentas-testadas, 07/10).
//   node scripts/_casco/_gerar-pecas.mjs <piece|all> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [qual, outDir, ...seeds] = process.argv.slice(2);

const STYLE = 'public/sprites/casco-costela2.png';
const SIDE =
  'Seen EXACTLY from the side, a flat side-view profile sprite for a side-scrolling shoot-em-up: no 3/4 view, no ' +
  'isometric view, nothing seen from above. It stands upright on a flat ground line, the whole object inside the ' +
  'frame with an empty margin around it.';
const MATTER =
  'It is GROWN out of the armored back of a colossal biomechanical whale, made of the same matter as that hull: ' +
  'near-black blue-grey armor plates, overlapping dark scales, pale ivory bone ribs, thin copper traces and small ' +
  'copper pipes. Dark sci-fi pixel art, low contrast, dark hull, light ONLY where there is energy (small amber ' +
  'glow). Crisp pixel art, clean dark outline, transparent background.';

const PECAS = {
  // ---- the missile launcher (shoots up and to the right; the game mirrors it) ----
  torreCraca: {
    description:
      `A biomechanical BARNACLE that launches missiles: a wide armored volcano-shaped cone of overlapping dark ` +
      `plates, its top split open like a beak tilted up and to the RIGHT, and inside the open beak four round launch ` +
      `tubes with a small amber glow in each. A thin copper trace runs up the cone. ${SIDE} ${MATTER}`,
  },
  torreCostela: {
    description:
      `A missile pod held in a cradle of BONE RIBS: four curved pale ivory ribs rise from the ground like the fingers ` +
      `of a claw and grip a dark armored launcher pod, tilted up and to the RIGHT, with four round launch tubes at ` +
      `its front, a small amber glow in each. Copper pipes feed the pod from below. ${SIDE} ${MATTER}`,
  },
  torreEspinho: {
    description:
      `A tall DORSAL SPINE that launches missiles: a single thick curved horn or fin of dark armor plate leaning up ` +
      `and to the RIGHT, with a row of four launch ports along its leading edge, a small amber glow in each, dark ` +
      `scales at its root and a pale bone ridge along its back. ${SIDE} ${MATTER}`,
  },
  torreTubos: {
    description:
      `A cluster of TUBE-WORM launch tubes: four thick armored tubes of different lengths growing together from one ` +
      `scaled root like organ pipes or deep-sea tube worms, all leaning up and to the RIGHT, each open mouth ringed ` +
      `with a dark lip and a small amber glow inside. Copper bands bind the bundle. ${SIDE} ${MATTER}`,
  },
  // ---- the obstacle that replaces the chimney (taller than wide, does not shoot) ----
  ventEspiraculo: {
    description:
      `A whale BLOWHOLE turned into a tower: a tall narrow mound of thick dark armored folds rising from the ground, ` +
      `ending at the top in a closed muscular ring of plates like a sealed valve, with a faint amber seam between the ` +
      `plates. Dark scales climb its sides. Taller than wide. ${SIDE} ${MATTER}`,
  },
  ventVertebras: {
    description:
      `A tall SPINE OF VERTEBRAE breaking out of the hull: a vertical column of five stacked pale ivory bone ` +
      `vertebrae with short spiky processes, wrapped by dark armor plates and thin copper pipes, a small amber light ` +
      `between two of the vertebrae. Taller than wide. ${SIDE} ${MATTER}`,
  },
  ventCracas: {
    description:
      `A tall tower of stacked biomechanical BARNACLES: a narrow pillar built of crusty dark armored cones grown one ` +
      `on top of another, some of them open at the tip showing a small amber glow, with copper traces between them. ` +
      `Taller than wide, irregular and organic. ${SIDE} ${MATTER}`,
  },
  ventBranquias: {
    description:
      `A tall armored TUBERCLE with GILLS: a narrow rounded pillar of dark scaled armor, like a giant horn stump, ` +
      `with five horizontal gill slits on one side that glow dim amber from inside, pale bone ribs framing the gills ` +
      `and a blunt plated crown. Taller than wide. ${SIDE} ${MATTER}`,
  },
};

const nomes = qual === 'all' ? Object.keys(PECAS) : [qual];
fs.mkdirSync(outDir, { recursive: true });
const styleSize = await tamanho(STYLE);

for (const nome of nomes) {
  const p = PECAS[nome];
  if (!p) throw new Error(`piece? all | ${Object.keys(PECAS).join(' | ')}`);
  for (const seed of seeds.map(Number)) {
    try {
      const imgs = await gerar('/generate-image-v2', {
        description: p.description,
        image_size: { width: 64, height: 64 },
        no_background: true,
        seed,
        style_image: { image: b64(STYLE), size: styleSize },
        style_options: { color_palette: true, outline: true, detail: true, shading: true },
      });
      imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${nome}-${seed}-${i}.png`), buf));
      console.log(`${nome} seed ${seed}: ${imgs.length}`);
    } catch (e) {
      console.log(`${nome} seed ${seed}: FAILED — ${e.message}`);
    }
  }
}
