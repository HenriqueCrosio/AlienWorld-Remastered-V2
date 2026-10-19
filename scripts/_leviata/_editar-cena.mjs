// BLOCO D — the method that got there in chapter 4 (edit-73, his pick of 18/10), for the remaining scenes: each
// scene's APPROVED art of today is the image edited (`/edit-images-v2`, edit_with_reference) and the approved base
// (mandible head 0.7 + shark body, seam 42) is the reference. Angle, composition and state stay; the design changes.
//   reentrada — chapter 5: the approved concept 5★ (the body falling in flames, seen from above and behind);
//   carcaca   — chapters 6/7: today's flyover frame (`f8-sobrevoo.png`); only the carcass ellipse of the 24/09
//               install (centre 214,132, radii 130×58) is kept from the edit — outside it, today's pixels;
//   menu      — today's armored Leviathan (`ref-leviata-armored.png`, 116²: alive and strong, no wound); <escala> 2
//               edits it at 232² and reduces it back.
//   node scripts/_leviata/_editar-cena.mjs <cena> <outDir> <escala> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

const [cena, outDir, ESC_S, ...seeds] = process.argv.slice(2);
const ESC = Number(ESC_S);
const BASE = 'docs/superpowers/folhas/2026-10-18/leviata/aprovado/leviata-base.png';
const SO_DESENHO =
  'Only redesign the creature to match the reference: overlapping near-black blue-grey armor hull plates instead of ' +
  'whale skin, the reference armored head with plated mandibles and fangs, the reference shark fins.';

const CENAS = {
  reentrada: {
    src: 'docs/superpowers/folhas/2026-09-23/conceito-5-queda-11-limpo.png',
    desc: 'The same image: same composition, same camera angle seen from above and behind, the creature falling ' +
      'diagonally toward the moon head first, the same fiery re-entry glow wrapping its front, the same exposed ribs on ' +
      'its back, the same lava cracks, the same moon and dark sky. ' + SO_DESENHO,
  },
  carcaca: {
    src: 'public/sprites/f8-sobrevoo.png',
    desc: 'The same image: same composition, same ruined colony domes, mountains, smoke, sky and ground, same camera ' +
      'angle. The fallen colossal creature lies in the same place and pose, torn open in the middle with exposed ' +
      'biomechanical insides and snapped pale ribs, glowing lava veins. ' + SO_DESENHO,
    elipse: [214, 132, 130, 58],
  },
  menu: {
    src: 'assets/raw/ref-leviata-armored.png',
    desc: 'The same image: same pose, same side view seen slightly from above, same swimming silhouette, same size ' +
      'and placement, the same pale ribs showing on the flank. A living, strong creature. ' + SO_DESENHO +
      ' Dark sci-fi pixel art, transparent background.',
    semFundo: true,
  },
};
const c = CENAS[cena];
if (!c) throw new Error(`cena? ${Object.keys(CENAS).join(' | ')}`);
fs.mkdirSync(outDir, { recursive: true });
const m = await sharp(c.src).metadata();
const W = m.width * ESC, H = m.height * ESC;
const fonte = ESC === 1 ? fs.readFileSync(c.src) : await sharp(c.src).resize(W, H, { kernel: 'nearest' }).png().toBuffer();
const mb = await sharp(BASE).metadata();

for (const seed of seeds.map(Number)) {
  const [img] = await gerar('/edit-images-v2', {
    method: 'edit_with_reference',
    edit_images: [{ image: b64(fonte), width: W, height: H }],
    image_size: { width: W, height: H },
    description: c.desc,
    reference_image: { image: b64(BASE), width: mb.width, height: mb.height },
    ...(c.semFundo && { no_background: true }),
    seed,
  });
  let out = await sharp(img).resize(W, H, { kernel: 'nearest' }).png().toBuffer();
  if (ESC !== 1) out = await sharp(out).resize(m.width, m.height, { kernel: 'mitchell' }).png().toBuffer();
  const nome = `${cena}-x${ESC}-${seed}`;
  fs.writeFileSync(path.join(outDir, `${nome}.png`), out);
  if (c.elipse) {
    // Only the carcass comes from the edit; the world around it stays today's, pixel for pixel.
    const [cx, cy, rx, ry] = c.elipse;
    const novo = await sharp(out).ensureAlpha().raw().toBuffer();
    const { data: velho, info } = await sharp(c.src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) continue;
      const i = (y * info.width + x) * 4;
      novo[i] = velho[i]; novo[i + 1] = velho[i + 1]; novo[i + 2] = velho[i + 2]; novo[i + 3] = velho[i + 3];
    }
    await sharp(novo, { raw: info }).png().toFile(path.join(outDir, `${nome}-so-carcaca.png`));
  }
  console.log(nome);
}
