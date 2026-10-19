// BLOCO D · the IMPACT (his ask, 18/10: "a queda ... sempre achei muito pobre ... crie um demo ou a cena como você
// imaginou"). The close shot of the impact is the SAME FRAMING as chapter 6 — the colony seen from the ground — BEFORE
// the body lands: the chapter-6 frame (the new carcass with the base dorsal) with the carcass and the fires painted out
// by /inpaint-v3. The body then falls exactly where the carcass will lie in chapter 6.
//   mask = the carcass (ellipse 212,132 · 128×62, plus the dorsal wedge) ∪ the warm pixels (fires, lava) grown by 3.
//   node scripts/_leviata/_colonia-sem-carcaca.mjs <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

const [outDir, ...seeds] = process.argv.slice(2);
const SRC = 'docs/superpowers/folhas/2026-10-18/leviata/cenas/dorsal3/dorsal-base-192-102-0.3-0.9-r1.png';
const W = 384, H = 216;
fs.mkdirSync(outDir, { recursive: true });

const { data } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const m = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
  const carcaca = ((x - 212) / 128) ** 2 + ((y - 132) / 62) ** 2 <= 1 || (x >= 178 && x <= 262 && y >= 60 && y <= 104);
  const quente = r > 120 && r > b + 50 && g < r * 0.8;
  if (carcaca || quente) m[y * W + x] = 1;
}
const mascara = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let v = 0;
  for (let dy = -3; dy <= 3 && !v; dy++) for (let dx = -3; dx <= 3 && !v; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < W && yy < H && m[yy * W + xx]) v = 255;
  }
  const o = (y * W + x) * 4;
  mascara[o] = mascara[o + 1] = mascara[o + 2] = v; mascara[o + 3] = 255;
}
const mPng = await sharp(mascara, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
fs.writeFileSync(path.join(outDir, 'mascara.png'), mPng);

for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/inpaint-v3', {
    description: 'A ruined small colony on a dark moon at night, seen from the ground: empty rocky cratered ground in the ' +
      'middle, dark jagged mountains behind, low dark clouds, metal domed habitats with a few small lit windows. No ' +
      'creature, no fire, no lava. Dark sci-fi pixel art, desaturated blue-grey, same palette as the rest of the image.',
    inpainting_image: { image: b64(SRC), size: { width: W, height: H } },
    mask_image: { image: b64(mPng), size: { width: W, height: H } },
    crop_to_mask: false,
    seed,
  });
  imgs.forEach((b, i) => fs.writeFileSync(path.join(outDir, `colonia-${seed}-${i}.png`), b));
  console.log(seed, imgs.length);
}
