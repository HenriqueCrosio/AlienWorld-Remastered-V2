// AS CANDIDATAS DA SERRA, cruas e NA ESCALA DO JOGO, sobre a pintura da arena do chefão — julgar arte de
// 96² ampliada mente: no jogo ela tem ~44px de diâmetro contra um fundo escuro.
//
//   node scripts/_f4/_folha-serra.mjs <saida.png> <escala> <png...>
import path from 'node:path';
import sharp from 'sharp';

const [saida, esc0, ...arqs] = process.argv.slice(2);
const ESC = Number(esc0); // 0.46 → 96*0.46 ≈ 44px de tela
const Z = 3;              // a tira "em jogo" é ampliada em bloco DEPOIS de montada, como o jogo faz
const CRU = 192, PAD = 8, LAB = 20;
const W = 130, H = 116;   // o pedaço de cena por candidata, em px de tela

// O fundo é a PINTURA da arena do chefão (a câmara D), não a faixa do chão: é contra ela que a serra vai voar.
const FUNDO = 'public/sprites/paint-bg-f4-d.png';
const fundo = await sharp(FUNDO).metadata().catch(() => null);
const comp = [];
for (const [i, a] of arqs.entries()) {
  const nome = path.basename(a, '.png');
  const left = PAD + i * (CRU + PAD);
  comp.push({ input: Buffer.from(`<svg width="${CRU}" height="${LAB}"><text x="0" y="15" fill="#ffd166" font-size="15" font-family="monospace">${nome}</text></svg>`), left, top: PAD });
  comp.push({ input: await sharp(a).resize(CRU, CRU, { kernel: 'nearest' }).toBuffer(), left, top: PAD + LAB });
  // Em jogo: a serra no tamanho real sobre um pedaço escuro da arena, e só então ampliada.
  const cena = await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } })
    .composite([
      ...(fundo ? [{ input: await sharp(FUNDO).extract({ left: Math.min(30 + i * 70, (fundo.width ?? W) - W), top: Math.max(0, Math.min(20, (fundo.height ?? H) - H)), width: W, height: H }).toBuffer(), left: 0, top: 0 }] : []),
      { input: await sharp(a).resize(Math.round(96 * ESC), Math.round(96 * ESC), { kernel: 'nearest' }).toBuffer(), left: Math.round((W - 96 * ESC) / 2), top: Math.round((H - 96 * ESC) / 2) },
    ]).png().toBuffer();
  comp.push({ input: await sharp(cena).resize(W * Z, H * Z, { kernel: 'nearest' }).toBuffer(), left, top: PAD + LAB + CRU + PAD });
}
await sharp({ create: { width: PAD + arqs.length * (CRU + PAD), height: PAD + LAB + CRU + PAD + H * Z + PAD, channels: 4, background: '#241d28' } })
  .composite(comp).png().toFile(saida);
console.log(saida);
