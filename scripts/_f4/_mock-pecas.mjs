// FATIA 7 · as peças novas NO ENQUADRAMENTO REAL, com o tint da camada, sobre a pintura da câmara.
// ⚠️ É a única forma de julgar tint sem rodar o jogo: o Phaser multiplica a textura pelo tint, e
// uma peça que parece ótima no PNG cru pode sumir ou gritar depois dessa multiplicação.
import sharp from 'sharp';

const tint = async (arq, cor, escala) => {
  const [tr, tg, tb] = [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255];
  const img = sharp(arq).ensureAlpha();
  const { width: W, height: H } = await img.metadata();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (data[i] * tr) / 255;
    data[i + 1] = (data[i + 1] * tg) / 255;
    data[i + 2] = (data[i + 2] * tb) / 255;
  }
  return sharp(data, { raw: info })
    .resize(Math.round(W * escala), Math.round(H * escala), { kernel: 'nearest' })
    .png().toBuffer();
};

const CASOS = [
  // peça, tint da camada, escala, pintura, ancoragem
  ['f4-passarela.png',  0x6d788f, 0.8,  'a', 'chao'],
  ['f4-passarela2.png', 0x6d788f, 1.05, 'a', 'chao'],
  ['f4-passarela3.png', 0x6d788f, 0.95, 'a', 'chao'],
  ['f4-ganglio.png',    0x9aa2b8, 0.7,  'b', 'teto'],
  ['f4-ganglio2.png',   0x9aa2b8, 0.85, 'b', 'teto'],
  ['f4-ganglio.png',    0x9aa2b8, 0.85, 'c', 'teto'],
];

const Z = 3, W = 384, H = 216;
const celulas = [];
for (let i = 0; i < CASOS.length; i++) {
  const [arq, cor, esc, camara, onde] = CASOS[i];
  const peca = await tint(`public/sprites/${arq}`, cor, esc);
  const m = await sharp(peca).metadata();
  const left = Math.round(W / 2 - m.width / 2);
  const top = onde === 'chao' ? H + 6 - m.height : -20;
  const quadro = await sharp(`public/sprites/paint-bg-f4-${camara}.png`)
    .composite([{ input: peca, left, top: Math.max(-m.height + 1, top) }])
    .resize(W * Z, H * Z, { kernel: 'nearest' })
    .png().toBuffer();
  celulas.push({ input: quadro, left: (i % 2) * W * Z, top: Math.floor(i / 2) * H * Z });
}

await sharp({ create: { width: W * Z * 2, height: H * Z * 3, channels: 3, background: { r: 0, g: 0, b: 0 } } })
  .composite(celulas).png().toFile('scripts/_f4/_mock-pecas.png');
console.log('✔ scripts/_f4/_mock-pecas.png — cada peça no enquadramento real, com o tint aplicado');
