// Tira de contato das duas animacoes do guardiao novo: 9 quadros cada, lado a lado, 2x.
import sharp from 'sharp';

const N = 9, S = 128, Z = 2, ROT = 26, PAD = 6;
const W = N * (S * Z + PAD) + PAD;

const rotulo = (t, w) =>
  Buffer.from(
    `<svg width="${w}" height="${ROT}"><rect width="${w}" height="${ROT}" fill="#0b0f1a"/>` +
      `<text x="8" y="18" font-family="monospace" font-size="14" fill="#7fe3ff">${t}</text></svg>`,
  );

const linhas = [
  ['idle', 'IDLE — a massa vermelha pulsa (9 quadros)'],
  ['morte', 'MORTE NOVA — a que quebra a silhueta (9 quadros)'],
];

const comp = [];
let y = PAD;
for (const [pref, txt] of linhas) {
  comp.push({ input: await sharp(rotulo(txt, W)).png().toBuffer(), top: y, left: 0 });
  for (let i = 0; i < N; i++) {
    comp.push({
      input: await sharp(`assets/raw/anim-guardiao-novo/${pref}-${i}.png`)
        .resize(S * Z, S * Z, { kernel: 'nearest', fit: 'contain', background: '#0b0f1a' })
        .flatten({ background: '#0b0f1a' })
        .png()
        .toBuffer(),
      top: y + ROT,
      left: PAD + i * (S * Z + PAD),
    });
  }
  y += ROT + S * Z + PAD * 3;
}

await sharp({ create: { width: W, height: y, channels: 3, background: '#0b0f1a' } })
  .composite(comp)
  .png()
  .toFile('scripts/_f4/_tira-guardiao-nova.png');
console.log('pronto', W, y);
