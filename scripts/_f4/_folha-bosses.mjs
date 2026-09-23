// As duas formas do chefao final, lado a lado, na mesma escala de tela.
import sharp from 'sharp';

const W = 768, H = 432, ROT = 28, PAD = 8;
const linhas = [
  ['_boss1-guardiao.png', 'FORMA 1 — o GUARDIAO   (256x227 a escala 0,7 = 179x159 na tela)'],
  ['_boss2-coracao-fechado.png', 'FORMA 2 — o CORACAO, fechado   (122x122 a escala 1,2 = 146x146)'],
  ['_boss2-coracao-aberto.png', 'FORMA 2 — o CORACAO, ABERTO (a unica janela de dano)'],
];

const rotulo = (t) =>
  Buffer.from(
    `<svg width="${W}" height="${ROT}"><rect width="${W}" height="${ROT}" fill="#0b0f1a"/>` +
      `<text x="10" y="19" font-family="monospace" font-size="14" fill="#7fe3ff">${t}</text></svg>`,
  );

const comp = [];
let y = PAD;
for (const [arq, txt] of linhas) {
  comp.push({ input: await sharp(rotulo(txt)).png().toBuffer(), top: y, left: 0 });
  comp.push({ input: await sharp(`scripts/_f4/${arq}`).resize(W, H).png().toBuffer(), top: y + ROT, left: 0 });
  y += ROT + H + PAD;
}

await sharp({ create: { width: W, height: y, channels: 3, background: '#0b0f1a' } })
  .composite(comp).png().toFile('scripts/_f4/_folha-bosses.png');
console.log('pronto');
