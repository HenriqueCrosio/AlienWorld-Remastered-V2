// BLOCO G · diagnosis: a small window of the F1 horizon, lit | every light off, side by side, ×16.
//   node scripts/_g/_zoom-f1.mjs <x> <y> <out.png> [raio=6] [layersDir=public/sprites/f1]
import path from 'node:path';
import sharp from 'sharp';

const [X, Y, OUT, R = '6', S = 'public/sprites/f1'] = process.argv.slice(2);
const r = Number(R), L = 2 * r + 1, Z = 16;
const caixa = { left: Math.max(0, Number(X) - r), top: Math.max(0, Number(Y) - r), width: L, height: L };
const pintura = path.join(S, 'pintura.png');
const apagada = await sharp(pintura).composite([{ input: path.join(S, 'apagadas.png') }]).png().toBuffer();
const a = await sharp(pintura).extract(caixa).resize(L * Z, L * Z, { kernel: 'nearest' }).png().toBuffer();
const b = await sharp(apagada).extract(caixa).resize(L * Z, L * Z, { kernel: 'nearest' }).png().toBuffer();
await sharp({ create: { width: 2 * L * Z + 8, height: L * Z, channels: 4, background: '#401010' } })
  .composite([{ input: a, left: 0, top: 0 }, { input: b, left: L * Z + 8, top: 0 }]).png().toFile(OUT);
console.log(OUT);
