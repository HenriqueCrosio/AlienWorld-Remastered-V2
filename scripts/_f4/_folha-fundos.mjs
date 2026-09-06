// Os quatro fundos reduzidos para 384x216 (a resolucao do jogo), mostrados em 2x para conferir
// o que sobrou do detalhe. O que se ve aqui e EXATAMENTE o que o jogo desenha, so ampliado.
import sharp from 'sharp';

const W = 768, H = 432, ROT = 30, PAD = 8;
const nomes = [
  ['1', 'BG 1 — o hangar engolido (carne + passarelas industriais)'],
  ['2', 'BG 2 — a caixa toracica (azul frio, o vao mais aberto)'],
  ['3', 'BG 3 — o duto (o mais escuro: L media 11,7)'],
  ['4', 'BG 4 — a camara do nucleo (simetrica, o coracao no centro)'],
];

const rotulo = (t) =>
  Buffer.from(
    `<svg width="${W}" height="${ROT}"><rect width="${W}" height="${ROT}" fill="#0b0f1a"/>` +
      `<text x="10" y="20" font-family="monospace" font-size="15" fill="#7fe3ff">${t}</text></svg>`,
  );

const comp = [];
let y = PAD;
for (const [n, txt] of nomes) {
  comp.push({ input: await sharp(rotulo(txt)).png().toBuffer(), top: y, left: 0 });
  comp.push({
    input: await sharp(`scripts/_f4/_bg${n}-384.png`)
      .resize(W, H, { kernel: 'nearest' })
      .png()
      .toBuffer(),
    top: y + ROT,
    left: 0,
  });
  y += ROT + H + PAD;
}

await sharp({ create: { width: W, height: y, channels: 3, background: '#0b0f1a' } })
  .composite(comp)
  .png()
  .toFile('scripts/_f4/_folha-fundos.png');
console.log('pronto');
