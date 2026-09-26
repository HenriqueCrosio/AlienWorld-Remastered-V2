// A folha da Task 5: cada cutscene em duas linhas (ORIGINAL em cima, ATMOSFERA embaixo), os mesmos instantes lado a lado.
//   node scripts/_f8/_folha-cenas.mjs <pasta-quadros> <saida.png>
import fs from 'node:fs';
import sharp from 'sharp';
const [pasta, saida] = process.argv.slice(2);
const CENAS = [['c1', 'CUTSCENE 1 · AURORA'], ['c2', 'CUTSCENE 2 · DOCA'], ['c3', 'CUTSCENE 3 · HANGAR']];
const ordem = (a, b) => (a[0] === b[0] ? +a.slice(1) - +b.slice(1) : a < b ? -1 : 1);
const W = 384, H = 216, G = 4, L = 6;
const rot = (t) => Buffer.from(`<svg width="${W}" height="20"><rect width="${t.length * 8 + 10}" height="18" fill="#000"/><text x="5" y="13" font-family="monospace" font-size="12" fill="#fc6">${t}</text></svg>`);
const pecas = [];
let linha = 0;
for (const [c, nome] of CENAS) {
  const inst = fs.readdirSync(pasta).filter((f) => f.startsWith(`${c}-orig-`)).map((f) => f.slice(`${c}-orig-`.length, -4)).sort(ordem);
  for (const [tipo, tag] of [['orig', 'ORIGINAL'], ['atm', 'ATMOSFERA']]) {
    inst.forEach((i, k) => {
      pecas.push({ input: `${pasta}/${c}-${tipo}-${i}.png`, left: k * (W + G), top: linha * (H + G) });
      pecas.push({ input: rot(`${k === 0 ? nome + ' · ' : ''}${tag} ${i[0] === 'a' ? 'chegada' : 'saída'} ${i.slice(1)}ms`), left: k * (W + G), top: linha * (H + G) });
    });
    linha++;
  }
}
await sharp({ create: { width: L * (W + G) - G, height: linha * (H + G) - G, channels: 3, background: '#000' } }).composite(pecas).png().toFile(saida);
console.log('folha:', saida);
