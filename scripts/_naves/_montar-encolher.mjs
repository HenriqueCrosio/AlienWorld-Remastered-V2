// 23/10 — the ladder sheet of the SHRUNK T2 (the T3 is out): one row per paint (today's, the black of family A),
// columns T0 · T1 · T2 today's size · T2 38×20 · T2 36×18, at ×Z, with a flat silhouette strip under each row so the
// size difference reads at a glance. Uses one thrust frame per tier (what the player sees).
// --t0: the follow-up — T1 and T2 keep today's size ("a humana T2 está ok com o tamanho") and the T0 shrinks lightly
// instead: columns T0 today · T0 33×15 · T0 32×14 · T1 · T2.
//   node scripts/_naves/_montar-encolher.mjs <encolherDir> <out.png> [--t0]
import path from 'node:path';
import sharp from 'sharp';

const [DIR, OUT] = process.argv.slice(2);
const T0 = process.argv.includes('--t0');
const P = 'public/sprites/naves';
const Z = 6, FW = 52, FH = 26, CW = FW * Z, CH = FH * Z, M = 14, LAB = 24, SIL = CH;
const COLS = T0
  ? ['T0 · hoje 35×16', 'T0 · leve 33×15', 'T0 · 32×14', 'T1 · 38×20', 'T2 · 41×22']
  : ['T0', 'T1', 'T2 · hoje 41×22', 'T2 · leve 38×20', 'T2 · médio 36×18'];
const LINHAS = T0 ? [
  ['PINTURA LARANJA (a original)', [`${P}/humana-t0-anim-2.png`, `${DIR}/t0-33x15/humana-t0-anim-2.png`, `${DIR}/t0-32x14/humana-t0-anim-2.png`, 'public/sprites/ship-jato-anim-4.png', `${P}/humana-t2-anim-3.png`]],
  ['PINTURA PRETA (o extra)', [`${DIR}/preta/humana-t0-anim-2.png`, `${DIR}/preta-t0-33x15/humana-t0-anim-2.png`, `${DIR}/preta-t0-32x14/humana-t0-anim-2.png`, `${DIR}/preta/ship-jato-anim-4.png`, `${DIR}/preta/humana-t2-anim-3.png`]],
] : [
  ['PINTURA DE HOJE', [`${P}/humana-t0-anim-2.png`, 'public/sprites/ship-jato-anim-4.png', `${P}/humana-t2-anim-3.png`, `${DIR}/leve/humana-t2-anim-3.png`, `${DIR}/medio/humana-t2-anim-3.png`]],
  ['PINTURA PRETA (a da família A)', [`${DIR}/preta/humana-t0-anim-2.png`, `${DIR}/preta/ship-jato-anim-4.png`, `${DIR}/preta/humana-t2-anim-3.png`, `${DIR}/preta-leve/humana-t2-anim-3.png`, `${DIR}/preta-medio/humana-t2-anim-3.png`]],
];

const texto = (t, w, size = 16, cor = '#d9dde6') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${LAB}"><text x="2" y="17" font-family="monospace" font-size="${size}" fill="${cor}">${t}</text></svg>`);
// Frames are 44×26, except the T0 (52×26, its flame reaches the left edge): every cell is 52 wide, the 44 ones centred.
const celula = async (f) => {
  const m = await sharp(f).metadata();
  const pad = (FW - m.width) / 2;
  const cheio = await sharp(f).extend({ left: Math.floor(pad), right: Math.ceil(pad), top: 0, bottom: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp(cheio).resize({ width: CW, kernel: 'nearest' }).png().toBuffer();
};
const silhueta = async (buf) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) { const on = data[i + 3] > 40; data[i] = data[i + 1] = data[i + 2] = on ? 18 : 205; data[i + 3] = 255; }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const tiles = [];
let top = M;
for (const [rot, arqs] of LINHAS) {
  tiles.push({ input: texto(rot, COLS.length * (CW + M), 17), left: M, top });
  top += LAB;
  for (const [c, f] of arqs.entries()) {
    const buf = await celula(f);
    tiles.push({ input: texto(COLS[c], CW, 14, '#9aa3b5'), left: M + c * (CW + M), top });
    tiles.push({ input: buf, left: M + c * (CW + M), top: top + LAB });
    tiles.push({ input: await silhueta(buf), left: M + c * (CW + M), top: top + LAB + CH + 4 });
  }
  top += LAB + CH + 4 + SIL + M * 2;
}
await sharp({ create: { width: M + COLS.length * (CW + M), height: top, channels: 4, background: '#14161d' } })
  .composite(tiles).png().toFile(OUT);
console.log(path.basename(OUT));
