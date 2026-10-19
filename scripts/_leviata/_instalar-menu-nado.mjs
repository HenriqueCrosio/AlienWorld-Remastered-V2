// BLOCO D — installs the menu swim he picked (18/10: "o do PixMiniMax 92, como silhueta ele mascara as imperfeições e
// deixa o movimento mais fluido e natural"): the 16 frames of `cenas/nado/gera-92-m/quadros` (176×80, moonlight baked;
// the 17th is dropped — it is the 1st again, 5% apart, so the loop closes) side by side in
// `public/sprites/leviathan-swim-sheet.png`. The old armored sheet goes to `assets/raw/leviathan-swim-sheet-original.png`.
//   node scripts/_leviata/_instalar-menu-nado.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-10-18/leviata/cenas/nado/gera-92-m/quadros';
const OUT = 'public/sprites/leviathan-swim-sheet.png';
const BAK = 'assets/raw/leviathan-swim-sheet-original.png';
const N = 16, W = 176, H = 80;
if (!fs.existsSync(BAK)) fs.copyFileSync(OUT, BAK);
await sharp({ create: { width: W * N, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(Array.from({ length: N }, (_, i) => ({ input: `${DIR}/${i}.png`, left: i * W, top: 0 })))
  .png().toFile(OUT);
console.log(OUT, `${N} × ${W}×${H}`);
