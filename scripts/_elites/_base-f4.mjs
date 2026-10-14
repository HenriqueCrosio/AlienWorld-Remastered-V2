// The F4 candidates' ANIMATION BASES (the `_lula-base.mjs` recipe): each finalist trimmed and centred in an 80×80
// transparent frame, so the PixMiniMax gestures have room. The Tubes sit lower: they swell UP from the base.
//   node scripts/_elites/_base-f4.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const D = 'docs/superpowers/folhas/2026-10-13/elites/f4';
const LADO = 80;
const BASES = {
  'larva-A': { id: 'larva-31-16' },
  'larva-D': { id: 'larvaBroca-31-6' },
  'tubo-C': { id: 'tuboCraca-31-0', pe: 60 },
  'tubo-D': { id: 'tuboCraca-31-21', pe: 60 },
};
fs.mkdirSync(`${D}/anim`, { recursive: true });
for (const [nome, { id, pe }] of Object.entries(BASES)) {
  const t = await sharp(`${D}/cand/${id}.png`).trim().png().toBuffer({ resolveWithObject: true });
  const left = Math.round((LADO - t.info.width) / 2);
  const top = pe ? pe - t.info.height : Math.round((LADO - t.info.height) / 2);
  await sharp({ create: { width: LADO, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: t.data, left, top }])
    .png()
    .toFile(`${D}/anim/base-${nome}.png`);
  console.log(nome, `${t.info.width}×${t.info.height} at (${left},${top})`);
}
