// As animações do predador lado a lado, quadro a quadro, a meia escala (uma linha por clipe).
//
//   node scripts/_f4/_folha-predador-anims.mjs <saida.png> <dir-clipe> [dir-clipe ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [saida, ...dirs] = process.argv.slice(2);
const Q = 128, P = 4, T = 18;
const linhas = dirs.map((d) => ({
  nome: path.basename(d),
  quadros: fs.readdirSync(d).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b)).map((f) => path.join(d, f)),
}));
const cols = Math.max(...linhas.map((l) => l.quadros.length));
const comp = [];
for (const [j, l] of linhas.entries()) {
  const top = P + j * (T + Q + P);
  comp.push({ input: Buffer.from(`<svg width="300" height="${T}"><text x="0" y="14" fill="#eee" font-size="13" font-family="monospace">${l.nome}</text></svg>`), left: P, top });
  for (const [i, q] of l.quadros.entries()) {
    comp.push({ input: await sharp(q).resize(Q, Q, { kernel: 'nearest' }).toBuffer(), left: P + i * (Q + P), top: top + T });
  }
}
await sharp({ create: { width: P + cols * (Q + P), height: P + linhas.length * (T + Q + P), channels: 4, background: '#231c24' } })
  .composite(comp).png().toFile(saida);
console.log(saida);
