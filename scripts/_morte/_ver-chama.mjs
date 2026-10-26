// Debug: prints the flame mask of a ship frame as ASCII ('#' flame, 'o' hull, '.' empty) with the flagged colours.
//   node scripts/_morte/_ver-chama.mjs <png>
import sharp from 'sharp';
import { ehChama, canais } from '../../src/systems/morte/pedacos.ts';
const { data, info } = await sharp(process.argv[2]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const cor = new Uint32Array(data.buffer, data.byteOffset, info.width * info.height);
const vistas = new Map();
for (let y = 0; y < info.height; y++) {
  let l = '';
  for (let x = 0; x < info.width; x++) {
    const c = cor[y * info.width + x];
    if (c >>> 24 < 128) l += '.';
    else if (ehChama(c, x)) { l += '#'; const h = canais(c).slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join(''); vistas.set(h, (vistas.get(h) ?? 0) + 1); }
    else l += 'o';
  }
  console.log(l);
}
console.log([...vistas].map(([h, n]) => `${h} ${n}`).join('  '));
