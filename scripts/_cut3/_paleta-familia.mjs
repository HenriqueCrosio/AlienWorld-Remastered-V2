// Puxa um sprite do PixelLab para a FAMÍLIA DE LUMINÂNCIA da Cutscene 3, assando a cor NO ARQUIVO.
//
// ⚠️ A LEI mora em `_paleta.mjs` — este arquivo é só a linha de comando. Duas cópias da lei é uma
// cópia envelhecendo.
//
//   node scripts/_cut3/_paleta-familia.mjs <entrada.png> <saida.png>
//
// Aferido na criatura da garganta: 31,8/207 → 30,6/132.

import sharp from 'sharp';
import { corrigirPaleta, estatistica } from './_paleta.mjs';

const [, , ENTRADA, SAIDA] = process.argv;
if (!ENTRADA || !SAIDA) {
  console.error('uso: node scripts/_cut3/_paleta-familia.mjs <entrada.png> <saida.png>');
  process.exit(1);
}

const { data, info } = await sharp(ENTRADA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const antes = estatistica(data, info.channels);
const saida = corrigirPaleta(data, info.channels);

await sharp(saida, { raw: { width: info.width, height: info.height, channels: info.channels } })
  .png()
  .toFile(SAIDA);

const depois = estatistica(saida, info.channels);
console.log(`${ENTRADA}  ->  ${SAIDA}   (${info.width}x${info.height})`);
console.log(`  antes:   média ${antes.media.toFixed(1)}   pico ${antes.pico.toFixed(0)}`);
console.log(`  depois:  média ${depois.media.toFixed(1)}   pico ${depois.pico.toFixed(0)}`);
console.log(`  a pintura do hangar: média 13,1  ·  teto prático ~110`);
if (depois.pico > 140) console.log('  ⚠️  o pico ainda passa de 140 — essa peça vai gritar no quadro escuro.');
