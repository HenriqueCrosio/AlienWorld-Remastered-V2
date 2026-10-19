// BLOCO D · passo 2, 3ª rodada (18/10) — "gere novamente, ainda não ficou bom quanto a original". The source is now
// the APPROVED CONCEPT itself (`conceito-4-ferida-11-limpo.png`, 384×216 on black starry space — the frame
// `f8-leviata` was cut from), not the cut: more context, the lava still lit. The result then goes through the same
// pipeline as today (`_recortar-novo.mjs`), so it reaches the game exactly the way the old one did.
//   edit    — /edit-images-v2 edit_with_reference: the concept is the image edited, the approved base the reference.
//   gera    — /generate-image-v2: the concept = composition/angle/damage reference, the base = design reference.
//   inpaint — /inpaint-v3 on the concept: ONLY the head and the skin are repainted; the hole, the ribs and the
//             debris cloud stay the approved pixels (the mask leaves them out).
//   node scripts/_leviata/_final-conceito.mjs <edit|gera|inpaint|mascara> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [modo, outDir, ...seeds] = process.argv.slice(2);
const CONCEITO = 'docs/superpowers/folhas/2026-09-23/conceito-4-ferida-11-limpo.png';
const BASE = 'docs/superpowers/folhas/2026-10-18/leviata/aprovado/leviata-base.png';
const W = 384, H = 216;
fs.mkdirSync(outDir, { recursive: true });

// The inpaint mask: the creature (not space: flood from the borders through lum < 11, as `_recortar-leviata`),
// left of the cloud (a crooked edge around x≈230), minus the warm pixels (bone, crimson, the hole's glow) of the hole-and-ribs zone,
// grown by 2px so their rims stay too.
async function mascara() {
  const { data } = await sharp(CONCEITO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const lum = (p) => 0.3 * data[p * 4] + 0.59 * data[p * 4 + 1] + 0.11 * data[p * 4 + 2];
  const espaco = new Uint8Array(W * H);
  const fila = [];
  for (let x = 0; x < W; x++) fila.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) fila.push(y * W, y * W + W - 1);
  fila.forEach((p) => (espaco[p] = 1));
  for (let k = 0; k < fila.length; k++) {
    const p = fila[k], x = p % W, y = (p / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, q = yy * W + xx;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || espaco[q]) continue;
      if (lum(q) < 11) { espaco[q] = 1; fila.push(q); }
    }
  }
  const quente = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const x = p % W, y = (p / W) | 0, i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const naZona = x >= 132 && x <= 262 && y >= 38 && y <= 160;
    if (naZona && r > b + 18 && r > 45) quente[p] = 1;
  }
  const m = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    // A crooked right edge into the cloud, never a straight cut.
    const limite = 230 + 12 * Math.sin(y * 0.37) + 7 * Math.sin(y * 0.11 + 1);
    if (espaco[p] || x >= limite) continue;
    let perto = false;
    for (let dy = -2; dy <= 2 && !perto; dy++) for (let dx = -2; dx <= 2 && !perto; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && quente[yy * W + xx]) perto = true;
    }
    if (!perto) m.fill(255, p * 3, p * 3 + 3);
  }
  return sharp(m, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}

if (modo === 'mascara') {
  fs.writeFileSync(path.join(outDir, 'mascara.png'), await mascara());
  process.exit(0);
}

const EDIT =
  'The same image: same composition, same camera angle, same pose, same torn hole in the middle of the body with ' +
  'its bone-edged flaps, same exposed ribs on the back, same debris cloud, same lava cracks, same black starry space. ' +
  'Only redesign the creature to match the reference: overlapping near-black blue-grey armor hull plates instead of ' +
  'whale skin, the reference armored head with open plated mandibles and fangs, the reference shark fins.';
const GERA =
  'A colossal wounded armored space leviathan drifting in black starry space, three-quarter view from above, the ' +
  'head on the left turned toward the camera, the body receding to the right into a dark cloud of debris. Exposed ' +
  'pale rib bones on its back, a huge torn hole in the middle of its body with bone-edged flaps spilling debris, a ' +
  'web of thin glowing orange lava cracks over near-black blue-grey armor plates, an armored head with open plated ' +
  'mandibles, torn shark fins. Dark sci-fi pixel art, dull desaturated colours, light only in the lava.';
const INPAINT =
  'A colossal armored space leviathan seen in three-quarter view from above: on the left a massive armored head ' +
  'with open plated mandibles and fangs turned toward the camera; the body covered with overlapping near-black ' +
  'blue-grey armor plates with a web of thin glowing orange lava cracks; torn shark-like pectoral fins below. Dark ' +
  'sci-fi pixel art, dull desaturated colours, black starry space around.';

for (const seed of seeds.map(Number)) {
  let imgs;
  if (modo === 'edit') {
    imgs = await gerar('/edit-images-v2', {
      method: 'edit_with_reference',
      edit_images: [{ image: b64(CONCEITO), width: W, height: H }],
      image_size: { width: W, height: H },
      description: EDIT,
      reference_image: { image: b64(BASE), width: 363, height: 160 },
      seed,
    });
  } else if (modo === 'gera') {
    imgs = await gerar('/generate-image-v2', {
      description: GERA,
      image_size: { width: W, height: H },
      seed,
      reference_images: [
        { image: b64(CONCEITO), size: await tamanho(CONCEITO), usage_description: 'the COMPOSITION, camera angle, pose and damage: this exact view, the torn hole in the middle, the ribs on the back, the debris cloud, the lava cracks' },
        { image: b64(BASE), size: await tamanho(BASE), usage_description: 'the creature DESIGN: these armor plates, this mandible head, these shark fins' },
      ],
      style_image: { image: b64(CONCEITO), size: await tamanho(CONCEITO) },
      style_options: { color_palette: true, outline: true, detail: true, shading: true },
    });
  } else if (modo === 'inpaint') {
    imgs = await gerar('/inpaint-v3', {
      description: INPAINT,
      inpainting_image: { image: b64(CONCEITO), size: { width: W, height: H } },
      mask_image: { image: b64(await mascara()), size: { width: W, height: H } },
      crop_to_mask: false,
      seed,
    });
  } else throw new Error('modo? edit | gera | inpaint | mascara');
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${modo}-${seed}-${i}.png`), buf));
  console.log(`${modo} ${seed}: ${imgs.length}`);
}
