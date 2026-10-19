// BLOCO D — the carcass he picked (edit 82, 18/10) lacks the DORSAL FIN, which is the new Leviathan's identity
// (him: "precisa aparecer, mesmo que torta ou rasgada"). Two routes, both on top of `carcaca-x1-82-so-carcaca.png`:
//   inpaint — /inpaint-v3 only inside a fin-shaped zone on the back, right of the ribs (a leaning wedge, x≈232–286,
//             y≈66–114); everything else stays the 82 pixels;
//   edit    — edit_with_reference again on the 82 (base as reference) asking for the fin; only the 24/09 ellipse grown
//             UPWARD (where the fin passes) is kept from it.
//   node scripts/_leviata/_carcaca-dorsal.mjs <inpaint|inpaint-curva|edit|mascara> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

const [modo, outDir, ...seeds] = process.argv.slice(2);
const SRC = 'docs/superpowers/folhas/2026-10-18/leviata/cenas/cru/carcaca-x1-82-so-carcaca.png';
const HOJE = 'public/sprites/f8-sobrevoo.png';
const BASE = 'docs/superpowers/folhas/2026-10-18/leviata/aprovado/leviata-base.png';
const W = 384, H = 216;
fs.mkdirSync(outDir, { recursive: true });

const FIN = 'A tall torn dorsal shark fin of the fallen colossal creature, bent and leaning back, rising from its armored ' +
  'back: overlapping near-black blue-grey armor plates, a ragged ripped edge, a thin glowing lava crack. Dark sci-fi ' +
  'pixel art, the same palette as the surrounding carcass.';
const EDIT = 'The same image: same composition, same ruined colony, mountains, smoke, sky, same camera angle, the fallen ' +
  'creature in the same place and pose with the same snapped pale ribs and the same torn open middle. Add the ' +
  "reference's tall dorsal shark fin rising from its back just right of the ribs, bent and torn but clearly a fin. " +
  'Keep everything else.';

// The fin zone: a wedge whose base sits on the back line (y≈112) and whose top leans toward the tail (left).
// `inpaint-curva` uses a shark-fin outline instead: a convex leading edge (right, toward the head) sweeping back to a
// tip over the ribs' end, and a concave trailing edge.
const CURVA = modo === 'inpaint-curva';
function naCunha(x, y) {
  if (y < 64 || y > 114) return false;
  const t = (114 - y) / (CURVA ? 50 : 48); // 0 at the base, 1 at the top
  if (CURVA) return x >= 254 - 18 * t ** 2 && x <= 294 - 58 * t ** 0.75;
  const esq = 240 - 10 * t, dir = 288 - 30 * t;
  return x >= esq && x <= dir;
}
async function mascara() {
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = naCunha(x, y) ? 255 : 0, i = (y * W + x) * 4;
    buf[i] = buf[i + 1] = buf[i + 2] = v; buf[i + 3] = 255;
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

// Composite: `dentro(x,y)` comes from the new image; the rest from `fora`.
async function compor(novoBuf, foraPath, dentro) {
  const novo = await sharp(novoBuf).resize(W, H, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer();
  const { data: velho, info } = await sharp(foraPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (dentro(x, y)) continue;
    const i = (y * W + x) * 4;
    for (let k = 0; k < 4; k++) novo[i + k] = velho[i + k];
  }
  return sharp(novo, { raw: info }).png().toBuffer();
}

if (modo === 'mascara') {
  fs.writeFileSync(path.join(outDir, 'mascara.png'), await mascara());
  process.exit(0);
}
const mb = await sharp(BASE).metadata();
for (const seed of seeds.map(Number)) {
  let imgs;
  if (modo === 'inpaint' || CURVA) {
    imgs = await gerar('/inpaint-v3', {
      description: FIN,
      inpainting_image: { image: b64(fs.readFileSync(SRC)), size: { width: W, height: H } },
      mask_image: { image: b64(await mascara()), size: { width: W, height: H } },
      crop_to_mask: false,
      seed,
    });
    imgs = await Promise.all(imgs.map((b) => compor(b, SRC, naCunha)));
  } else if (modo === 'edit') {
    imgs = await gerar('/edit-images-v2', {
      method: 'edit_with_reference',
      edit_images: [{ image: b64(fs.readFileSync(SRC)), width: W, height: H }],
      image_size: { width: W, height: H },
      description: EDIT,
      reference_image: { image: b64(BASE), width: mb.width, height: mb.height },
      seed,
    });
    // The 24/09 ellipse (214,132 · 130×58), grown upward to y≈62 where the fin passes; today's world outside it.
    const dentro = (x, y) => ((x - 214) / 130) ** 2 + ((y - 132) / 58) ** 2 <= 1 || naCunha(x, y);
    imgs = await Promise.all(imgs.map((b) => compor(b, HOJE, dentro)));
  } else throw new Error('modo? inpaint | edit | mascara');
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `dorsal-${modo}-${seed}-${i}.png`), buf));
  console.log(`${modo} ${seed}: ${imgs.length}`);
}
