import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const R = 'C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/public/sprites/';
const cont = new Map();
for (let f = 0; f < 9; f++) {
  const { data, info } = await sharp(`${R}serpente-anim-${f}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (f === 0) console.log('size', info.width, info.height);
  for (let i = 0; i < info.width * info.height; i++) {
    if (data[i * 4 + 3] < 128) continue;
    const h = [0, 1, 2].map((k) => data[i * 4 + k].toString(16).padStart(2, '0')).join('');
    cont.set(h, (cont.get(h) ?? 0) + 1);
  }
}
console.log('colours', cont.size);
const { data, info } = await sharp(process.argv[2]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const c2 = new Set();
for (let i = 0; i < info.width * info.height; i++) if (data[i*4+3] >= 128) c2.add([0,1,2].map((k) => data[i*4+k]).join(','));
console.log('frame0-256 colours', c2.size, info.width, info.height);
