// Puxa um sprite do PixelLab para a FAMÍLIA DE LUMINÂNCIA da Cutscene 3, assando a cor NO ARQUIVO.
//
// ⚠️ Por que no arquivo e não em `setTint()`: a mesma lei que fez `reduzir-sprite.mjs` existir.
// `setTint` multiplica a textura inteira por uma cor só — ele não sabe separar o casco do miolo, e
// some com a única luz que a peça tem direito de ter. E o que o jogo desenha tem que ser o que o
// arquivo tem: 1px de arte = 1px de jogo, 1 cor de arte = 1 cor de jogo.
//
// O QUE A PINTURA DO HANGAR EXIGE (medido em 2026-09-03):
//   luminância média 13,1   ·   só 31 pixels da tela inteira passam de 110 (0,05%)
// Ou seja: o teto prático do quadro é ~110. Uma peça com pico 207 grita.
//
// AS TRÊS OPERAÇÕES, e o motivo de cada uma:
//   1. o casco TEAL (matiz 140°–215°) gira para a FERRUGEM do hangar (~18°).
//      Teal é `player 0x17a6bd` — a cor do JOGADOR. Um inimigo vestido da cor do jogador mente.
//   2. o miolo ROSA/MAGENTA (matiz ≥280° ou ≤15°) MANTÉM o matiz.
//      Rosa é `enemyBright 0xe8306b` — paleta de inimigo. Ele está certo, e é a energia da peça.
//   3. COMPRESSÃO DE REALCE acima de L=90: a curva achata em 0,36, teto vira ~132.
//      É isso que tira o grito sem escurecer o corpo — a média mal se move.
//
//   node scripts/_cut3/_paleta-familia.mjs <entrada.png> <saida.png>
//
// Aferido na criatura da garganta: 31,8/207 → 30,6/132.

import sharp from 'sharp';

const [, , ENTRADA, SAIDA] = process.argv;
if (!ENTRADA || !SAIDA) {
  console.error('uso: node scripts/_cut3/_paleta-familia.mjs <entrada.png> <saida.png>');
  process.exit(1);
}

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return [h, s, l];
}

function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

const estatistica = (buf, ch) => {
  let soma = 0, n = 0, pico = 0;
  for (let i = 0; i < buf.length; i += ch) {
    if (buf[i + 3] < 200) continue;
    const L = lum(buf[i], buf[i + 1], buf[i + 2]);
    soma += L; n++;
    if (L > pico) pico = L;
  }
  return { media: soma / n, pico };
};

const { data, info } = await sharp(ENTRADA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const antes = estatistica(data, info.channels);
const saida = Buffer.from(data);

for (let i = 0; i < saida.length; i += info.channels) {
  if (saida[i + 3] < 8) continue;

  let [h, s, l] = rgb2hsl(saida[i], saida[i + 1], saida[i + 2]);

  if (h >= 140 && h <= 215) {
    // 1. o casco: teal → ferrugem
    h = 18 + (h - 140) * 0.10;
    s *= 0.55;
    l *= 0.80;
  } else if (h >= 280 || h <= 15) {
    // 2. o miolo: fica rosa, cede um fio de saturação
    s *= 0.92;
  }

  let [r, g, b] = hsl2rgb(h, s, l);

  // 3. compressão de realce
  const L = lum(r, g, b);
  if (L > 90) {
    const k = (90 + (L - 90) * 0.36) / L;
    r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k);
  }

  saida[i] = Math.min(255, r);
  saida[i + 1] = Math.min(255, g);
  saida[i + 2] = Math.min(255, b);
}

await sharp(saida, { raw: { width: info.width, height: info.height, channels: info.channels } })
  .png()
  .toFile(SAIDA);

const depois = estatistica(saida, info.channels);
console.log(`${ENTRADA}  ->  ${SAIDA}   (${info.width}x${info.height})`);
console.log(`  antes:   média ${antes.media.toFixed(1)}   pico ${antes.pico.toFixed(0)}`);
console.log(`  depois:  média ${depois.media.toFixed(1)}   pico ${depois.pico.toFixed(0)}`);
console.log(`  a pintura do hangar: média 13,1  ·  teto prático ~110`);
if (depois.pico > 140) console.log('  ⚠️  o pico ainda passa de 140 — essa peça vai gritar no quadro escuro.');
