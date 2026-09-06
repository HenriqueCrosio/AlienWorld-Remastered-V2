// REDUZ um sprite já instalado para o tamanho em que ele vai ser DESENHADO.
//
// ⚠️ POR QUE NÃO `setScale()` NO PHASER. A lei do projeto é 1px de arte = 1px de jogo (é a mesma
// do `paint-bg.mjs`). Um `setScale(0,36)` mantém 128px de arte sendo espremidos em 41px a cada
// quadro: a grade de pixel do sprite deixa de casar com a da tela, e o resultado briga com o
// resto do jogo, que é pixel perfeito. Assar o tamanho no arquivo devolve escala 1.
//
// ⚠️ E A REDUÇÃO SAI DO QUADRO DO GERADOR (128px), nunca de uma versão já reduzida — a lição do
// Zero-G: um passo de reamostragem a mais custa detalhe.
//
// O alpha é RELIMIARIZADO depois do lanczos: reduzir cria uma franja de alpha parcial na borda,
// e franja em sprite ancorado vira contorno fantasma sobre o fundo escuro.
//
// uso: node scripts/reduzir-sprite.mjs <arquivo.png> <altura-alvo>
import sharp from 'sharp';

const [arq, alturaRaw] = process.argv.slice(2);
if (!arq || !alturaRaw) {
  console.error('uso: node scripts/reduzir-sprite.mjs <arquivo.png> <altura-alvo>');
  process.exit(1);
}
const alvo = Number(alturaRaw);

const meta = await sharp(arq).metadata();
const larg = Math.max(1, Math.round((meta.width * alvo) / meta.height));

const { data, info } = await sharp(arq)
  .ensureAlpha()
  .resize(larg, alvo, { kernel: 'lanczos3' })
  .raw()
  .toBuffer({ resolveWithObject: true });

let franja = 0;
for (let i = 0; i < info.width * info.height; i++) {
  const a = data[i * 4 + 3];
  if (a > 0 && a < 255) franja++;
  data[i * 4 + 3] = a >= 128 ? 255 : 0;
}
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile(arq);
console.log(`${arq}: ${meta.width}x${meta.height} -> ${info.width}x${alvo} (${franja}px de franja relimiarizados)`);
