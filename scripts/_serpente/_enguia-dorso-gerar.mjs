// The eel's DORSAL views (7 Nov, his circle on the roll: mid-roll the back faces the camera, and the side art only has
// the back edge-on — any mapping stretches it). The cylinder needs a second texture, the back seen from above; the
// skull too. PixelLab Pro (/generate-image-v2), the approved art as the pixel style.
//   node scripts/_serpente/_enguia-dorso-gerar.mjs <peca> <seed> [<seed> ...]
//   peca: corpo | cabeca (A's dorsal view as the subject: its shape from above) | cabecaTexto (no subject)
import fs from 'node:fs';
import path from 'node:path';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const DIR = 'docs/superpowers/folhas/2026-11-07/enguia-dorso/cru';
const DARK =
  'Dark sci-fi pixel art: dark gunmetal and black armor, low contrast, light ONLY on energy points. Crisp pixel ' +
  'art, clean dark outline, transparent background.';

const PECAS = {
  corpo: {
    size: [128, 64],
    style: 'estilo-corpo.png',
    description:
      `TOP-DOWN DORSAL VIEW, seen from DIRECTLY ABOVE, of a straight horizontal segment of a colossal biomechanical ` +
      `alien eel's body, running from the left edge to the right edge of the image (it continues beyond both edges), ` +
      `about 40 pixels thick. Its armored BACK: a row of overlapping dark gunmetal armor plates, perfectly SYMMETRIC ` +
      `about a central spine ridge that runs horizontally through the middle, each plate a chevron pointing LEFT, ` +
      `thin dark-red flesh in the seams between plates, the flanks curving away and darker at the top and bottom ` +
      `edges. No head, no tail, no side view. ${DARK}`,
  },
  cabeca: {
    size: [96, 64],
    ref: 'assunto-cabeca-dorso.png',
    usage: 'the subject and its camera angle: this eel head seen from directly above, snout pointing left, symmetric',
    style: 'estilo-cabeca.png',
    description:
      `The armored skull of a colossal biomechanical alien eel seen from DIRECTLY ABOVE (top-down dorsal view), ` +
      `snout pointing LEFT, perfectly SYMMETRIC about its long horizontal axis: a narrow armored snout with the tips ` +
      `of jagged teeth at its edges, a ridged skull with layered gunmetal plates and deep dark grooves, one small ` +
      `glowing cyan eye on EACH side edge, the neck continuing to the right edge with chevron plates. ${DARK}`,
  },
  cabecaTexto: {
    size: [96, 64],
    style: 'estilo-cabeca.png',
    description:
      `The armored skull of a colossal biomechanical alien eel seen from DIRECTLY ABOVE (top-down dorsal view), ` +
      `snout pointing LEFT, perfectly SYMMETRIC about its long horizontal axis: a narrow armored snout with the tips ` +
      `of jagged teeth at its edges, a ridged skull with layered gunmetal plates and deep dark grooves, one small ` +
      `glowing cyan eye on EACH side edge, the neck continuing to the right edge with chevron plates. Nothing seen ` +
      `from the side. ${DARK}`,
  },
};

const [peca, ...seeds] = process.argv.slice(2);
const p = PECAS[peca];
if (!p) throw new Error(`peca? ${Object.keys(PECAS).join(' | ')}`);
const st = path.join(DIR, p.style), rf = p.ref && path.join(DIR, p.ref);
for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: p.description,
    image_size: { width: p.size[0], height: p.size[1] },
    no_background: true,
    seed,
    ...(rf && { reference_images: [{ image: b64(rf), size: await tamanho(rf), usage_description: p.usage }] }),
    style_image: { image: b64(st), size: await tamanho(st) },
    style_options: { color_palette: true, outline: true, detail: true, shading: true },
  });
  const out = path.join(DIR, peca);
  fs.mkdirSync(out, { recursive: true });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(out, `${seed}-${i}.png`), buf));
  console.log(`${peca} seed ${seed}: ${imgs.length}`);
}
