// P2 · O ESTOURO DA PAREDE (capítulo 2). Pedido dele em 24/09, depois de ver o capítulo 1 pulsando:
// *"podemos até mostrar a camara D inicialmente, mas o rasgo na estrutura tem que vir logo depois"* — e a
// cena é sobre a coisa EXPLODIR dali. Por isso o rasgo NÃO interpola do intacto ao rasgado (a v3,
// atravessando uma distância grande, inventa manchas chapadas — lição da P1): é um CORTE no impacto,
// escondido por destroços, e depois a parede JÁ RASGADA se mexe (distância pequena — o que a v3 faz bem).
//
// O rasgado é o conceito aprovado: o inpaint sobre a câmara D real (`conceito-2-rasgo-22.png`, máscara
// `mask-rasgo.png`). Aqui:
//   1. o recorte = a caixa da máscara;
//   2. a v3 anima as BORDAS do rasgo (membranas balançando, lava escorrendo) a partir do rasgado;
//   3. paleta da câmara D + a máscara como alfa.
//
//   node scripts/_f8/_gerar-rasgo.mjs <seed> [<seed> ...]  → public/sprites/f8-rasgo-<seed>.png
//                                                            + scripts/_f8/_rasgo-caixa.json
import fs from 'node:fs';
import sharp from 'sharp';
import { b64, gerar } from './_pl.mjs';
import { paletaDe, naPaleta } from './_paleta.mjs';

const F = 'docs/superpowers/folhas/2026-09-23';
const seeds = process.argv.slice(2).map(Number);
if (!seeds.length) seeds.push(7);

// 1 · a caixa da máscara (branco = rasgo), com 2px de folga
const { data: m, info: mi } = await sharp(`${F}/mask-rasgo.png`).greyscale().raw().toBuffer({ resolveWithObject: true });
let x0 = mi.width, y0 = mi.height, x1 = 0, y1 = 0;
for (let y = 0; y < mi.height; y++) for (let x = 0; x < mi.width; x++) if (m[y * mi.width + x] > 127) {
  x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
}
x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(383, x1 + 2); y1 = Math.min(215, y1 + 2);
const caixa = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
fs.writeFileSync('scripts/_f8/_rasgo-caixa.json', JSON.stringify(caixa));
console.log('caixa do rasgo', caixa);

const paleta = await paletaDe('public/sprites/paint-bg-f4-d.png', 64);
const rasgada = await naPaleta(await sharp(`${F}/conceito-2-rasgo-22.png`).extract(caixa).png().toBuffer(), paleta);
const alfa = await sharp(`${F}/mask-rasgo.png`).extract(caixa).greyscale().raw().toBuffer();

for (const seed of seeds) {
  const quadros = await gerar('/animate-with-text-v3', {
    first_frame: b64(rasgada),
    action: 'the torn edges of the ruptured organic wall flap and stretch as air rushes out, loose membrane strands whipping toward the dark opening, glowing lava dripping along the torn edges. The black space in the opening stays still. Keep the same composition and colors.',
    frame_count: 8,
    seed,
    no_background: false,
  });
  const prontos = [];
  for (const q of quadros) {
    const cor = await naPaleta(await sharp(q).resize(caixa.width, caixa.height, { kernel: 'nearest' }).png().toBuffer(), paleta);
    const { data, info } = await sharp(cor).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < alfa.length; i++) data[i * 4 + 3] = alfa[i] > 127 ? 255 : 0;
    prontos.push(await sharp(data, { raw: info }).png().toBuffer());
  }
  await sharp({ create: { width: caixa.width * prontos.length, height: caixa.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(prontos.map((input, i) => ({ input, left: i * caixa.width, top: 0 })))
    .png()
    .toFile(`public/sprites/f8-rasgo-${seed}.png`);
  console.log(`seed ${seed}: ${prontos.length} quadros de ${caixa.width}×${caixa.height}`);
}
