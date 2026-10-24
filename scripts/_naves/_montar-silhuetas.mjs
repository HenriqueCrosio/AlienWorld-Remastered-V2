// 23/10 — round 2a sheet image: one row per line (T0→T3), each ship ×Z in the given tone, the flat silhouette under
// it, and (with --caixa) the fixed 21×9 hitbox and the shot origin drawn over the frame, so the body can be read
// against where the ship is actually hit and where the shot leaves.
//   node scripts/_naves/_montar-silhuetas.mjs <dir> <tom> <out.png> [--caixa] [--linhas=caca,gotica,pesada] [--rotulos=a|b|c]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const [DIR, TOM, OUT] = args.filter((a) => !a.startsWith('--'));
const CAIXA = args.includes('--caixa');
const LINHAS = (args.find((a) => a.startsWith('--linhas='))?.slice(9) ?? 'caca,gotica,pesada').split(',');
const ROT = args.find((a) => a.startsWith('--rotulos='))?.slice(10).split('|') ?? LINHAS;
const W = 44, H = 26, Z = 6, CW = W * Z, CH = H * Z, LAB = 24, M = 12, SIL = CH;
const ALT = LAB + CH + SIL + M;

async function silhueta(arq) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 40) { data[i] = 20; data[i + 1] = 22; data[i + 2] = 29; data[i + 3] = 255; } else data[i + 3] = 0;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
const grande = (buf) => sharp(buf).resize(CW, CH, { kernel: 'nearest' }).png().toBuffer();
// hitbox: centred 21×9 → x 11.5..32.5, y 8.5..17.5; the shot leaves at (ship.x + 10, ship.y) = (32, 13)
const caixa = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}">
  <rect x="${11.5 * Z}" y="${8.5 * Z}" width="${21 * Z}" height="${9 * Z}" fill="none" stroke="#6fcf97" stroke-width="2" stroke-dasharray="6 4"/>
  <circle cx="${32 * Z}" cy="${13 * Z}" r="5" fill="none" stroke="#ff5d5d" stroke-width="2"/></svg>`);

const tiles = [];
for (const [r, linha] of LINHAS.entries()) {
  const top = r * ALT;
  tiles.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${4 * (CW + M)}" height="${LAB}"><text x="4" y="18" font-family="monospace" font-size="17" fill="#d9dde6">${ROT[r]}</text></svg>`), left: M, top });
  tiles.push({ input: { create: { width: 4 * (CW + M) - M, height: SIL, channels: 4, background: '#c9ccd3' } }, left: M, top: top + LAB + CH });
  for (let t = 0; t < 4; t++) {
    const arq = path.join(DIR, `${linha}-t${t}-${TOM}.png`);
    const left = M + t * (CW + M);
    tiles.push({ input: await grande(fs.readFileSync(arq)), left, top: top + LAB });
    if (CAIXA) tiles.push({ input: caixa, left, top: top + LAB });
    tiles.push({ input: await grande(await silhueta(arq)), left, top: top + LAB + CH + Math.round((SIL - CH) / 2) });
  }
}
await sharp({ create: { width: M + 4 * (CW + M), height: LINHAS.length * ALT, channels: 4, background: '#14161d' } })
  .composite(tiles).png().toFile(OUT);
console.log(OUT);
