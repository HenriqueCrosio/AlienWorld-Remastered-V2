// 26/10 — every enemy of the game on one board, at its IN-GAME size (frame × scale) and ×Z, grouped by class, with
// its name: the study sheet for the enemy deaths (`docs/DESTROCOS.md`).
//   node scripts/_inimigos/_prancha.mjs <out.png> [Z=3]
import sharp from 'sharp';
const [OUT, Z_S = '3'] = process.argv.slice(2);
const Z = Number(Z_S);
const S = 'public/sprites/';
// [name, file, scale, frame width (sheets), tint]
export const CLASSES = {
  'COMUNS (morrem dezenas por fase)': [
    ['drone · metal', 'drone-anim-0', 1], ['batedor F1 · metal', 'scout-anim-0', 0.85, 0, 0xffc8dc], ['batedor F2 · metal', 'scout-cinturao-anim-0', 0.28],
    ['canhoneira F1 · metal', 'gunship-anim-0', 1, 0, 0xbfa8f0], ['canhoneira F2 · metal', 'gunship-cinturao-anim-0', 0.72], ['kamikaze · metal', 'kamikaze-anim-0', 0.85],
    ['cargueiro · metal', 'carrier-anim-0', 1.1], ['água-viva · luz', 'agua-viva-anim-0', 0.6], ['pupa · carne', 'elite-pupa-0', 1], ['mosca · carne', 'elite-mosca-0', 1],
  ],
  'ELITES (alguns por fase)': [
    ['drone minerador · metal', 'elite-drone-minerar-0', 1], ['sentinela · metal', 'elite-sentinela-pairar-0', 1], ['lula · biomec', 'elite-cacador-idle-0', 1],
    ['larva A · biomec', 'elite-larva-a-poe-0', 1], ['larva D · biomec', 'elite-larva-d-poe-0', 1], ['tubo C · carne', 'elite-tubo-c-pulso-0', 1], ['tubo D · carne', 'elite-tubo-d-pulso-0', 1],
  ],
  'MINI CHEFÕES (um por fase)': [['aranha · metal', 'aranha-anim-0', 0.62], ['golfinho · biomec', 'golfinho-nado', 1, 80]],
  'CHEFÕES (um por fase)': [
    ['Torre F1 · metal', 'boss-idle-anim-0', 0.75], ['Capitânia F2 · metal', 'capitania-anim-0', 1], ['Serpente F3 · biomec + luz', 'serpente-anim-0', 0.55],
    ['Serpente fusão · biomec', 'serpente-fusao-anim-0', 0.63], ['Guardião F4 · carne', 'guardiao', 0.7], ['Predador F4 · carne', 'predador-urro-sheet', 0.47, 256],
  ],
};
async function retrato([nome, arq, esc, quadro = 0, tint]) {
  let img = sharp(S + arq + '.png').ensureAlpha();
  const m = await img.metadata();
  if (quadro) img = sharp(await img.extract({ left: 0, top: 0, width: quadro, height: m.height }).png().toBuffer());
  const w0 = quadro || m.width, h0 = m.height;
  let { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  if (tint) {
    const t = [(tint >> 16) & 255, (tint >> 8) & 255, tint & 255];
    for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) data[i + c] = Math.round((data[i + c] * t[c]) / 255);
  }
  const w = Math.max(1, Math.round(w0 * esc)), h = Math.max(1, Math.round(h0 * esc));
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(w, h, { kernel: 'nearest' }).resize(w * Z, h * Z, { kernel: 'nearest' }).png().toBuffer();
  return { nome, png, w: w * Z, h: h * Z, real: `${w}×${h}` };
}
const linhas = [];
for (const [classe, lista] of Object.entries(CLASSES)) linhas.push({ classe, itens: await Promise.all(lista.map(retrato)) });
const L = 1600, GAP = 14, ROT = 22;
const comp = [];
let y = 10;
const txt = (s, size, cor) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${size + 8}"><text x="0" y="${size}" font-family="Consolas, monospace" font-size="${size}" fill="${cor}">${s}</text></svg>`);
for (const { classe, itens } of linhas) {
  comp.push({ input: txt(classe, 20, '#ffb040'), left: 10, top: y });
  y += 32;
  let x = 10, alt = 0;
  for (const it of itens) {
    if (x + Math.max(it.w, Math.ceil(`${it.nome} ${it.real}`.length * 7.4)) > L - 10) { x = 10; y += alt + ROT + GAP; alt = 0; }
    comp.push({ input: it.png, left: x, top: y });
    comp.push({ input: txt(`${it.nome} ${it.real}`, 13, '#c8cdd8'), left: x, top: y + it.h + 3 });
    // the label (13 px monospace, ~7.4 px a character) is often wider than a small enemy: the column fits both
    x += Math.max(it.w, Math.ceil(`${it.nome} ${it.real}`.length * 7.4)) + GAP;
    alt = Math.max(alt, it.h);
  }
  y += alt + ROT + GAP * 2;
}
await sharp({ create: { width: L, height: y, channels: 4, background: '#141821' } }).composite(comp).png().toFile(OUT);
console.log(OUT, `${L}x${y}`);
