// O PREDADOR — as rotações "lisas" contra as editadas com a S original como referência de estilo.
// Linha 1: a S original (a régua). Linha 2: a W lisa, editada com a S de referência e editada só por texto.
//
//   node scripts/_f4/_folha-predador-estilo.mjs <saida.png>
import sharp from 'sharp';

const [saida] = process.argv.slice(2);
const DIR = 'assets/raw/furia-predador-8dir';
const Q = 256, PAD = 8, TXT = 22;
const itens = [
  ['S original (a régua)', `${DIR}/south.png`],
  ['W rotação (lisa)', `${DIR}/west.png`],
  ['W editada (referência)', `${DIR}/west-sujo.png`],
  ['W editada (texto)', `${DIR}/west-texto.png`],
];
const rot = (s) => Buffer.from(`<svg width="${Q}" height="${TXT}"><text x="0" y="16" fill="#eee" font-size="15" font-family="monospace">${s}</text></svg>`);
const comp = [];
for (const [i, [r, f]] of itens.entries()) {
  const x = PAD + i * (Q + PAD);
  comp.push({ input: rot(r), left: x, top: PAD });
  comp.push({ input: f, left: x, top: PAD + TXT });
}
await sharp({ create: { width: PAD + itens.length * (Q + PAD), height: PAD + TXT + Q + PAD, channels: 4, background: '#231c24' } })
  .composite(comp).png().toFile(saida);
console.log(saida);
