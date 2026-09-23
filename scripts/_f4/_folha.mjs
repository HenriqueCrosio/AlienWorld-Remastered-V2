// Folha de contato da linha de base: os quatro momentos da Fase 4 numa imagem so.
import sharp from 'sharp';

const W = 768, H = 432, PAD = 8, ROT = 26;
const tiros = [
  ['_novo-a-largos.png', 'A  t=6s   CAMARA 1 - o hangar engolido'],
  ['_novo-b-anticorpos.png', 'B  t=19s  CAMARA 1 - anticorpos'],
  ['_novo-c-aperto.png', 'C  t=47s  CAMARA 2 - a caixa toracica (trocou em t=40)'],
  ['_novo-d-pico.png', 'D  t=68s  o DUTO entra (trocou em t=68)'],
];

const svgRotulo = (txt) =>
  Buffer.from(
    `<svg width="${W}" height="${ROT}"><rect width="${W}" height="${ROT}" fill="#0b0f1a"/>` +
      `<text x="10" y="18" font-family="monospace" font-size="15" fill="#7fe3ff">${txt}</text></svg>`,
  );

const linhas = [];
for (const [arq, rotulo] of tiros) {
  linhas.push(await sharp(svgRotulo(rotulo)).png().toBuffer());
  linhas.push(await sharp(`scripts/_f4/${arq}`).resize(W, H).png().toBuffer());
}

const alturaTotal = tiros.length * (ROT + H) + PAD * (tiros.length + 1);
const comp = [];
let y = PAD;
for (let i = 0; i < linhas.length; i += 2) {
  comp.push({ input: linhas[i], top: y, left: 0 });
  comp.push({ input: linhas[i + 1], top: y + ROT, left: 0 });
  y += ROT + H + PAD;
}

await sharp({ create: { width: W, height: alturaTotal, channels: 3, background: '#0b0f1a' } })
  .composite(comp)
  .png()
  .toFile('scripts/_f4/_folha-depois.png');
console.log('scripts/_f4/_folha-depois.png pronto');
