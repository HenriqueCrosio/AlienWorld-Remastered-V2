// P1 · A CONVULSÃO, 3ª ABORDAGEM — a v3 ANIMA a própria parede, sem quadro final imposto.
//
// ⚠️ A 2ª (inpaint de um final muito diferente + v3 interpolando até ele) saiu com manchas chapadas cor de
// salmão nos quadros do meio e um OVAL recortado no final: pedir para a v3 atravessar uma distância grande
// faz ela inventar formas lisas. Aqui a distância é pequena: o mesmo recorte, pulsando e acendendo.
// A emenda com a pintura é a borda esquerda da região, desfeita num pontilhado ordenado de 24px.
//
//   node scripts/_f8/_gerar-pulso.mjs <seed> [<seed> ...]  → public/sprites/f8-pulso-<seed>.png
import sharp from 'sharp';
import { b64, gerar } from './_pl.mjs';
import { paletaDe, naPaleta } from './_paleta.mjs';

const D = 'public/sprites/paint-bg-f4-d.png';
const R = { left: 128, top: 0, width: 256, height: 216 };
const PONTILHADO = 24;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const seeds = process.argv.slice(2).map(Number);
const paleta = await paletaDe(D, 64);
const intacta = await sharp(D).extract(R).png().toBuffer();

for (const seed of seeds) {
  const quadros = await gerar('/animate-with-text-v3', {
    first_frame: b64(intacta),
    action: 'the organic wall of a dying creature convulses: it swells and heaves, the veins bulge and slowly fill with dim glowing lava light, dark fluid beads and drips, the whole tissue trembles. Keep the same composition and colors.',
    frame_count: 8,
    seed,
    no_background: false,
  });
  const prontos = [];
  for (const q of quadros) {
    const cor = await naPaleta(await sharp(q).resize(R.width, R.height, { kernel: 'nearest' }).png().toBuffer(), paleta);
    const { data, info } = await sharp(cor).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < R.height; y++) for (let x = 0; x < PONTILHADO; x++) {
      if (x / PONTILHADO * 16 <= BAYER[y % 4][x % 4]) data[(y * R.width + x) * 4 + 3] = 0;
    }
    prontos.push(await sharp(data, { raw: info }).png().toBuffer());
  }
  await sharp({ create: { width: R.width * prontos.length, height: R.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(prontos.map((input, i) => ({ input, left: i * R.width, top: 0 })))
    .png()
    .toFile(`public/sprites/f8-pulso-${seed}.png`);
  console.log(`seed ${seed}: ${prontos.length} quadros`);
}
