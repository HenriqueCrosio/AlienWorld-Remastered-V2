// BLOCO D — the second half of the graft: PixelLab repaints ONLY a narrow band around the seam left by
// `_mesclar-cabeca.mjs` (the step in the outline where the bigger mandible head meets the shark's neck), with the
// rest of the creature as frozen context. The result is pasted back only inside the band and snapped to the
// palette of the two approved concepts, so nothing outside the seam changes by a pixel.
//   node scripts/_leviata/_emenda-inpaint.mjs <costura.png> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

const [SRC, outDir, ...seeds] = process.argv.slice(2);
const { seamMin, seamMax } = JSON.parse(fs.readFileSync(`${SRC}.json`, 'utf8'));
const CRU = 'docs/superpowers/folhas/2026-10-18/leviata/cru';
fs.mkdirSync(outDir, { recursive: true });

const base = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = base.info.width, H = base.info.height;

// A context window around the seam (the generator sees the neck, the gills and the back of the head).
const WX = Math.max(0, seamMin - 90), WW = Math.min(W - WX, 180);
const janela = await sharp(SRC).extract({ left: WX, top: 0, width: WW, height: H }).png().toBuffer();

// The band: from 14px before the seam to 10px after, on every row the creature (or the step) touches, ±4px.
const BX0 = seamMin - 14, BX1 = seamMax + 10;
const alfa = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? base.data[(y * W + x) * 4 + 3] : 0);
let by0 = H, by1 = 0;
for (let y = 0; y < H; y++) for (let x = BX0; x <= BX1; x++) if (alfa(x, y)) { by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
by0 = Math.max(0, by0 - 4); by1 = Math.min(H - 1, by1 + 4);
const mascara = Buffer.alloc(WW * H * 3);
for (let y = by0; y <= by1; y++) for (let x = BX0; x <= BX1; x++) mascara.fill(255, (y * WW + (x - WX)) * 3, (y * WW + (x - WX)) * 3 + 3);
const mascaraPng = await sharp(mascara, { raw: { width: WW, height: H, channels: 3 } }).png().toBuffer();
fs.writeFileSync(path.join(outDir, 'mascara.png'), mascaraPng);

// Palette of the two concepts.
const cores = new Map();
for (const f of ['tubarao-31-0', 'mandibula-31-0']) {
  const { data } = await sharp(`${CRU}/${f}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) cores.set((data[i] << 16) | (data[i + 1] << 8) | data[i + 2], [data[i], data[i + 1], data[i + 2]]);
}
const pal = [...cores.values()];
const snap = (r, g, b) => {
  let best = pal[0], d = Infinity;
  for (const c of pal) { const e = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (e < d) { d = e; best = c; } }
  return best;
};

const nome = path.basename(SRC, '.png');
for (const seed of seeds.map(Number)) {
  const [img] = await gerar('/inpaint-v3', {
    description: 'The neck of a colossal armored space leviathan, side view: the slim shark body with glowing gill ' +
      'slits flows smoothly into a massive heavier armored head with open plated mandibles. Continuous overlapping ' +
      'near-black blue-grey hull plates, clean dark outline following one smooth silhouette, a few thin glowing ' +
      'orange lava cracks. Dark sci-fi pixel art, transparent background.',
    inpainting_image: { image: b64(janela), size: { width: WW, height: H } },
    mask_image: { image: b64(mascaraPng), size: { width: WW, height: H } },
    no_background: true,
    seed,
  });
  const gen = await sharp(img).resize(WW, H, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer();
  const out = Buffer.from(base.data);
  for (let y = by0; y <= by1; y++) for (let x = BX0; x <= BX1; x++) {
    const g = (y * WW + (x - WX)) * 4, o = (y * W + x) * 4;
    if (gen[g + 3] < 110) { out[o + 3] = 0; continue; }
    const c = snap(gen[g], gen[g + 1], gen[g + 2]);
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  }
  const arq = path.join(outDir, `${nome}-e${seed}.png`);
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).trim().png().toFile(arq);
  console.log(arq);
}
