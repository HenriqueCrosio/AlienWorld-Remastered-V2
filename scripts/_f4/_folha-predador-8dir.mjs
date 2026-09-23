// O PREDADOR (a fúria escolhida, candidata B) em 8 direções, rotações do PixelLab em 256×256.
// Monta duas partes:
//   1. as 8 vistas em escala 1, em grade 4×2, na ordem da rosa (S, SW, W, NW / N, NE, E, SE);
//   2. em JOGO: a S (o surgimento) e a W (a luta) sobre a pintura do núcleo, nas escalas 0,7 (a do
//      guardião) e 0,47 (a que cabe a mobilidade, ~120px de altura).
//
//   node scripts/_f4/_folha-predador-8dir.mjs <saida.png>
import sharp from 'sharp';

const [saida] = process.argv.slice(2);
const DIR = 'assets/raw/furia-predador-8dir';
const ORDEM = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];

const Q = 256, PAD = 8, TXT = 22;
const COLS = 4;
const W = PAD + COLS * (Q + PAD);
const rotulo = (s, w) =>
  Buffer.from(`<svg width="${w}" height="${TXT}"><text x="0" y="16" fill="#eee" font-size="15" font-family="monospace">${s}</text></svg>`);

const comp = [];
for (const [i, d] of ORDEM.entries()) {
  const x = PAD + (i % COLS) * (Q + PAD);
  const y = PAD + Math.floor(i / COLS) * (TXT + Q + PAD);
  comp.push({ input: rotulo(d, Q), left: x, top: y });
  comp.push({ input: `${DIR}/${d}.png`, left: x, top: y + TXT });
}

// A linha em jogo: 4 telas de 384×216 não cabem na largura de 4 quadros de 256 — vão em 2×2 abaixo.
const pintura = await sharp('public/sprites/paint-bg-f4-d.png').png().toBuffer();
const TELAS = [
  ['south', 0.7], ['west', 0.7],
  ['south', 0.47], ['west', 0.47],
];
const topoJogo = PAD + 2 * (TXT + Q + PAD);
const TW = 384;
for (const [i, [d, e]] of TELAS.entries()) {
  const lado = Math.round(256 * e);
  const sprite = await sharp(`${DIR}/${d}.png`).resize(lado, lado, { kernel: 'nearest' }).toBuffer();
  // Estaciona onde o guardião estaciona: GAME_WIDTH − 86, y = 104.
  const tela = await sharp(pintura)
    .composite([{ input: sprite, left: Math.round(384 - 86 - lado / 2), top: Math.round(104 - lado / 2) }])
    .png()
    .toBuffer();
  const x = PAD + (i % 2) * (TW + PAD);
  const y = topoJogo + Math.floor(i / 2) * (TXT + 216 + PAD);
  comp.push({ input: rotulo(`em jogo · ${d} · escala ${e}`, TW), left: x, top: y });
  comp.push({ input: tela, left: x, top: y + TXT });
}

const H = topoJogo + 2 * (TXT + 216 + PAD);
await sharp({ create: { width: Math.max(W, PAD + 2 * (TW + PAD)), height: H, channels: 4, background: '#231c24' } })
  .composite(comp)
  .png()
  .toFile(saida);
console.log(saida);
