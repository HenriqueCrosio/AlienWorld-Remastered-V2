// BLOCO D — the menu Leviathan VANISHED in the menu (18/10): the new design is near-black, and the menu's cold tint,
// veil and mist sink it; today's armored survives on its pale ribs. So the menu art gets MOONLIGHT baked in pixel (the
// moon is to the right, high): a pale rim on every top edge (back, dorsal, tail lobes, head), a second softer row, and
// the hull lifted. Same drawing, lit for the place it lives in (`jogo-de-luz-por-normais`: the side facing the light
// lights up).
//   node scripts/_leviata/_menu-luz.mjs <menu2Dir> <nome> [<nome> ...]   → cru/<nome>-luz.png + red/ + -grande
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { iluminar, semIlhas } from './_luz-lua.mjs';

const [dir, ...nomes] = process.argv.slice(2);
const ampliar = async (buf, k) => {
  const m = await sharp(buf).metadata();
  return sharp(buf).resize(m.width * k, m.height * k, { kernel: 'nearest' }).png().toBuffer();
};
async function reduzir(buf, largura) {
  const { data, info } = await sharp(buf).trim().resize({ width: largura, kernel: 'mitchell' }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] >= 110 ? 255 : 0;
  return sharp(data, { raw: info }).png().toBuffer();
}

for (const nome of nomes) {
  const { data, info } = await sharp(path.join(dir, 'cru', `${nome}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  semIlhas(data, W, H);
  const out = iluminar(data, W, H);
  const arte = await sharp(out, { raw: info }).png().toBuffer();
  const n = `${nome}-luz`;
  fs.writeFileSync(path.join(dir, 'cru', `${n}.png`), arte);
  fs.writeFileSync(path.join(dir, `${n}-grande.png`), await ampliar(arte, 3));
  fs.writeFileSync(path.join(dir, 'red', `${n}-70.png`), await reduzir(arte, 70));
  fs.copyFileSync(path.join(dir, 'red', `${nome}-133.png`), path.join(dir, 'red', `${n}-133.png`));
  console.log(n);
}
