// F3 HULL LAUNCHER (10/11) — THE NEW MISSILE, drawn in pixel (a piece this small is drawn, not generated). Him: "hoje é um
// míssil de osso. Mas quero algo mais parecido com míssil, talvez com linhas verdes ou de bronze [...] com efeito de
// propulsor e rastro".
//   - the body: a steel rocket pointing RIGHT (the flight turns it), nose cone, two bands, four fins; 24×9 per frame;
//   - the thruster: 4 frames of flame out of the tail (white-hot at the nozzle → yellow → orange → a red tip), each a
//     different length, so it flickers;
//   - the trail: 6 frames of 5×5, an ember that cools into the hull's own grey vapour and thins out — played once per
//     particle, at scale 1 (no scaled squares, no alpha fade).
// Two liveries, bronze and green: `missil-casco-<bronze|verde>.png`; the trail is shared.
//   node scripts/_casco/_missil-assar.mjs [--instalar bronze|verde]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-11-10/casco-pecas/missil';
const args = process.argv.slice(2);
const INSTALAR = args.includes('--instalar') ? args[args.indexOf('--instalar') + 1] : null;
fs.mkdirSync(DIR, { recursive: true });

export const QUADRO = { w: 24, h: 9, n: 4 };
export const RASTRO = { cel: 5, n: 6 };

// k outline · h highlight · m mid · s shade · n nose · f fin · B band (lit) · D band (in shade)
const CORPO = [
  '.......kk...............',
  '.......kfk..............',
  '........kfkkkkkkkkkk....',
  '.......kmhhBhhhhBhhnk...',
  '.......kmmmBmmmmBmmnnnk.',
  '.......ksssDssssDssmk...',
  '........kfkkkkkkkkkk....',
  '.......kfk..............',
  '.......kk...............',
];
const ACO = { k: [2, 1, 2], h: [136, 150, 154], m: [88, 102, 108], s: [50, 62, 70], n: [176, 186, 184], f: [61, 74, 78] };
const LIBRE = {
  bronze: { B: [226, 160, 88], D: [150, 98, 56] },
  verde: { B: [130, 236, 136], D: [58, 150, 84] },
};
// the flame, per frame: rows 3..5 of the frame, columns 0..6 (the nozzle is at x = 7). w white-hot, y yellow, o orange, r red
const CHAMA = [
  ['...oyyw', 'rooyyww', '...oyyw'],
  ['.....oy', '..royyw', '....oyw'],
  ['....oyw', '.rooyww', '...ooyw'],
  ['.....yw', '...oyyw', '.....oy'],
];
const FOGO = { w: [255, 246, 214], y: [255, 206, 96], o: [240, 124, 44], r: [168, 52, 32] };

function folhaMissil(libre) {
  const W = QUADRO.w * QUADRO.n, H = QUADRO.h;
  const d = Buffer.alloc(W * H * 4);
  const poe = (x, y, c) => { const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  for (let q = 0; q < QUADRO.n; q++) {
    CORPO.forEach((linha, y) => [...linha].forEach((ch, x) => {
      if (ch === '.') return;
      poe(q * QUADRO.w + x, y, ACO[ch] ?? LIBRE[libre][ch]);
    }));
    CHAMA[q].forEach((linha, r) => [...linha].forEach((ch, x) => { if (ch !== '.') poe(q * QUADRO.w + x, 3 + r, FOGO[ch]); }));
  }
  return sharp(d, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

// the trail: an ember, then the vapour ramp of the hull (`VAPOR_PARTICULA.rampa` in numerosCascoF3), thinning out
const BRASA = [
  [['..y..', '.ywy.', '..y..'], { w: FOGO.w, y: FOGO.y }],
  [['.oo.', 'oyyo', '.oo.'], { y: FOGO.y, o: FOGO.o }],
  [['.rg.', 'gorg', '.gr.'], { o: FOGO.o, r: FOGO.r, g: [112, 120, 134] }],
  [['.gg..', 'ggagg', 'gaggg', '.ggg.'], { g: [112, 120, 134], a: [150, 158, 170] }],
  [['.g.g.', 'g.gg.', '.gg.g', 'g.g..', '..g.g'], { g: [84, 92, 106] }],
  [['..g..', 'g...g', '..g..', '.g...', '...g.'], { g: [60, 66, 78] }],
];
function folhaRastro() {
  const C = RASTRO.cel, W = C * RASTRO.n;
  const d = Buffer.alloc(W * C * 4);
  BRASA.forEach(([linhas, cores], q) => {
    const oy = Math.floor((C - linhas.length) / 2), ox = Math.floor((C - linhas[0].length) / 2);
    linhas.forEach((linha, y) => [...linha].forEach((ch, x) => {
      if (ch === '.') return;
      const i = ((oy + y) * W + q * C + ox + x) * 4, c = cores[ch];
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }));
  });
  return sharp(d, { raw: { width: W, height: C, channels: 4 } }).png().toBuffer();
}

const amplia = async (buf, z, arq) => {
  const m = await sharp(buf).metadata();
  await sharp(buf).resize(m.width * z, m.height * z, { kernel: 'nearest' }).flatten({ background: '#181428' }).png().toFile(arq);
};
for (const libre of Object.keys(LIBRE)) {
  const png = await folhaMissil(libre);
  fs.writeFileSync(path.join(DIR, `missil-casco-${libre}.png`), png);
  await amplia(png, 10, path.join(DIR, `missil-casco-${libre}-x10.png`));
  if (INSTALAR === libre) fs.writeFileSync('public/sprites/missil-casco.png', png);
}
const rastro = await folhaRastro();
fs.writeFileSync(path.join(DIR, 'rastro-missil.png'), rastro);
await amplia(rastro, 10, path.join(DIR, 'rastro-missil-x10.png'));
if (INSTALAR) fs.writeFileSync('public/sprites/rastro-missil.png', rastro);
console.log(`missile ${QUADRO.w}x${QUADRO.h} × ${QUADRO.n}, trail ${RASTRO.cel}² × ${RASTRO.n}${INSTALAR ? ` — installed: ${INSTALAR}` : ''}`);
