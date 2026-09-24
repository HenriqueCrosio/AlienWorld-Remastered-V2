// A FERIDA VIVA (capítulo 4) — pedido dele em 24/09: *"o que eu achei interessante da primeira cena… é animação
// do fundo (coração pulsando). Será que conseguimos animar algo do capitulo 4?"*. O fundo é o espaço (não se mexe
// de verdade); o que pulsa é o CORAÇÃO do plano: a ferida aberta com as costelas expostas.
//
// A receita que funcionou na pulsação da câmara D: a v3 anima a PRÓPRIA região, com movimento pequeno — sem quadro
// final imposto (distância grande = manchas chapadas). O corpo inteiro (359px) não cabe nos 256 da v3; a região
// da ferida e das costelas cabe.
//   1. base = o corpo com a lava ACESA (o frio + a camada de lava), recortada na REGIÃO;
//   2. a v3 anima: costelas arfando, a carne da ferida contraindo, a lava latejando;
//   3. paleta do conceito aprovado + o alfa do corpo (fora do contorno, nada).
// Na cena, a região animada cobre o corpo ali, e a camada de lava pulsante é APAGADA dentro dela (a lava da
// região já vem na animação — duas lavas desencontradas seriam fantasma).
//
//   node scripts/_f8/_gerar-ferida-viva.mjs <seed> [<seed> ...] → public/sprites/f8-ferida-<seed>.png
//                                                                + public/sprites/f8-leviata-lava-fora.png
import fs from 'node:fs';
import sharp from 'sharp';
import { b64, gerar } from './_pl.mjs';
import { paletaDe, naPaleta } from './_paleta.mjs';

const REGIAO = { left: 100, top: 0, width: 140, height: 131 };
const seeds = process.argv.slice(2).map(Number);
if (!seeds.length) seeds.push(3);

const aceso = await sharp('public/sprites/f8-leviata.png').composite([{ input: 'public/sprites/f8-leviata-lava.png' }]).png().toBuffer();
const base = await sharp(aceso).extract(REGIAO).png().toBuffer();
const { data: alfaBase } = await sharp(base).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// a v3 quer quadro opaco: o recorte vai sobre o preto do espaço do conceito (6,7,12)
const opaco = await sharp(base).flatten({ background: { r: 6, g: 7, b: 12 } }).png().toBuffer();
const paleta = await paletaDe('docs/superpowers/folhas/2026-09-23/conceito-4-ferida-11-limpo.png', 48);

for (const seed of seeds) {
  const quadros = await gerar('/animate-with-text-v3', {
    first_frame: b64(opaco),
    action: 'the dying creature breathes weakly: the exposed ribs heave slowly, the raw wound flesh contracts and throbs, the lava cracks pulse dimly, a little dark fluid oozes from the wound. Subtle motion, keep the same composition and colors.',
    frame_count: 8,
    seed,
    no_background: false,
  });
  const prontos = [];
  for (const q of quadros) {
    const cor = await naPaleta(await sharp(q).resize(REGIAO.width, REGIAO.height, { kernel: 'nearest' }).png().toBuffer(), paleta);
    const { data, info } = await sharp(cor).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let p = 0; p < REGIAO.width * REGIAO.height; p++) data[p * 4 + 3] = alfaBase[p * 4 + 3];
    prontos.push(await sharp(data, { raw: info }).png().toBuffer());
  }
  await sharp({ create: { width: REGIAO.width * prontos.length, height: REGIAO.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(prontos.map((input, i) => ({ input, left: i * REGIAO.width, top: 0 })))
    .png()
    .toFile(`public/sprites/f8-ferida-${seed}.png`);
  console.log(`seed ${seed}: ${prontos.length} quadros de ${REGIAO.width}×${REGIAO.height} em x=${REGIAO.left}`);
}

// a lava pulsante SEM a região (lá a lava vem na própria animação)
const { data: lv, info: li } = await sharp('public/sprites/f8-leviata-lava.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let y = REGIAO.top; y < REGIAO.top + REGIAO.height; y++) for (let x = REGIAO.left; x < REGIAO.left + REGIAO.width; x++) lv[(y * li.width + x) * 4 + 3] = 0;
await sharp(lv, { raw: li }).png().toFile('public/sprites/f8-leviata-lava-fora.png');
fs.writeFileSync('scripts/_f8/_ferida-regiao.json', JSON.stringify(REGIAO));
console.log('f8-leviata-lava-fora.png (a lava pulsante sem a região da ferida)');
