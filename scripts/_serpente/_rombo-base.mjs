// 28/10 — THE BREACH'S BASE (S1, spec `2026-10-28-serpente-luta-s1-design.md` §1): a strip of the PROW's approved hull
// pieces as the band lays them (duto2 | duto | placa, 102 px apart, each 114×66), with 34 px of open sky above for the
// torn plates to bend into; and the masks of the four concepts (white = what the inpaint redraws, the hull around stays
// pixel-identical). Output in <dir>: base.png and mascara-<A..D>.png.
//   node scripts/_serpente/_rombo-base.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [DIR] = process.argv.slice(2);
fs.mkdirSync(DIR, { recursive: true });
const W = 318, H = 100, CEU = 34, PASSO = 102;
const pecas = ['casco-duto2', 'casco-duto', 'casco-placa'];
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(pecas.map((p, i) => ({ input: `public/sprites/${p}.png`, left: i * PASSO, top: CEU })))
  .png()
  .toFile(path.join(DIR, 'base.png'));

// the masks: jagged polygons (the hole's outline is the generator's to draw; the mask only bounds it)
const MASCARAS = {
  // A — the tear: wide at the crest (plates bending up into the sky), narrowing to the band's foot
  A: [[78, 4], [104, 0], [130, 8], [158, 2], [186, 9], [214, 1], [242, 6], [238, 40], [222, 72], [206, 99], [112, 99], [96, 70], [82, 40]],
  // B — the crater: round, deep
  B: [[96, 14], [124, 2], [160, 0], [196, 3], [224, 16], [238, 44], [232, 76], [214, 96], [104, 96], [86, 76], [80, 44]],
  // C — the long split: wide and shallow, deepest in the middle
  C: [[52, 16], [90, 8], [130, 12], [160, 6], [196, 12], [232, 8], [268, 16], [262, 46], [222, 60], [190, 84], [128, 84], [96, 60], [58, 46]],
  // D — the plating torn off: the same bounds as A, a little taller in the middle
  D: [[80, 2], [110, 6], [140, 0], [176, 4], [206, 0], [240, 6], [236, 46], [220, 80], [204, 99], [114, 99], [98, 80], [84, 46]],
};
for (const [nome, pts] of Object.entries(MASCARAS)) {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#000"/><polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="#fff" shape-rendering="crispEdges"/></svg>`;
  await sharp(Buffer.from(svg)).flatten({ background: '#000' }).png().toFile(path.join(DIR, `mascara-${nome}.png`));
}
console.log('base e máscaras em', DIR);
