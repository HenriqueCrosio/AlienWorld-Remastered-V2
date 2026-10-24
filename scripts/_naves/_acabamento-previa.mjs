// 23/10 — round 2a, the FINISH PREVIEW: PixelLab paints detail over the four block silhouettes of one line in a
// single /edit-images-v2 call (so the family stays a family), keeping the shape and the colours. It only shows what
// an approved silhouette turns into; the decision on the sheet is the shape and the hull tone.
// Frames are 44×26, centred on 52×32 (the endpoint's minimum height is 32). 4 frames = 10 generations per seed.
//   node scripts/_naves/_acabamento-previa.mjs <linha> <tom> <silDir> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

const [LINHA, TOM, SIL, OUT, ...seeds] = process.argv.slice(2);
const W = 52, H = 32;

const BASE =
  'Add fine pixel-art detail to this human spaceship WITHOUT changing its silhouette, size, parts or colours: panel ' +
  'lines, layered armour plates with a light edge on top and a dark seam, small vents and rivets, a glossy highlight ' +
  'on the cockpit glass, hot engine nozzles. Keep the hull colour as it is (worn, slightly dirty, used-future ' +
  'industrial), the amber lights and the blue glass. Crisp pixel art, clean dark outline, side view, nose to the right.';
const LINHAS = {
  caca: 'A sleek jet fighter: thin panel lines along the wings, an intake under the cockpit, a sharp needle nose.',
  gotica: 'Gothic cathedral details: pointed-arch panel shapes, the amber windows as tall ogival windows, tracery ' +
    'lines on the swept fins, the two prongs of the nose as ornate gothic spires, the round cockpit as a rose window.',
  pesada: 'A heavy gunship: thick bolted armour plates, big engine pods with cooling fins, a chunky rotary gun.',
};

const centrar = async (arq) => sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: arq, left: (W - 44) / 2, top: (H - 26) / 2 }]).png().toBuffer();

fs.mkdirSync(OUT, { recursive: true });
const fontes = await Promise.all([0, 1, 2, 3].map((t) => centrar(path.join(SIL, `${LINHA}-t${t}-${TOM}.png`))));
for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/edit-images-v2', {
    method: 'edit_with_text',
    edit_images: fontes.map((buf) => ({ image: b64(buf), width: W, height: H })),
    image_size: { width: W, height: H },
    description: `${BASE} ${LINHAS[LINHA]}`,
    no_background: true,
    seed,
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(OUT, `${LINHA}-${TOM}-${seed}-t${i}.png`), buf));
  console.log(`${LINHA} ${TOM} seed ${seed}: ${imgs.length}`);
}
