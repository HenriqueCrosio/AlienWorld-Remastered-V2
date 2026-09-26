// A folha real da Fatia 9: cada momento em par — ORIGINAL (a captura da prévia, sem tratamento) | ATMOSFERA (o jogo
// com o shader). Pares pela ordem dentro de cada prefixo (f1, f1boss, …), dois pares por linha.
//   node scripts/_f9/_folha-real.mjs <pasta-original> <pasta-real> <saida.png>
import fs from 'node:fs';
import sharp from 'sharp';
const [orig, real, saida] = process.argv.slice(2);
const W = 384, H = 216, G = 4;
const grupo = (pasta) => {
  const g = {};
  for (const f of fs.readdirSync(pasta).filter((f) => f.endsWith('.png'))) {
    const [pre, ms] = f.replace('.png', '').split('-');
    (g[pre] ??= []).push({ f: `${pasta}/${f}`, ms: +ms });
  }
  for (const k in g) g[k].sort((a, b) => a.ms - b.ms);
  return g;
};
const go = grupo(orig), gr = grupo(real);
const pares = [];
for (const pre of ['f1', 'f1boss', 'f2', 'f2boss', 'f3', 'f3boss', 'f4', 'f4boss']) {
  (gr[pre] ?? []).forEach((r, i) => pares.push({ o: go[pre]?.[i]?.f, r: r.f, rot: `${pre} ${r.ms}ms` }));
}
const rot = (t) => Buffer.from(`<svg width="${W}" height="${H}"><rect y="196" width="${t.length * 8 + 10}" height="18" fill="#000"/><text x="5" y="209" font-family="monospace" font-size="12" fill="#fc6">${t}</text></svg>`);
const pecas = [];
pares.forEach((p, k) => {
  const x0 = (k % 2) * 2 * (W + G), y = Math.floor(k / 2) * (H + G);
  if (p.o) pecas.push({ input: p.o, left: x0, top: y }, { input: rot(`${p.rot} · ORIGINAL`), left: x0, top: y });
  pecas.push({ input: p.r, left: x0 + W + G, top: y }, { input: rot(`${p.rot} · ATMOSFERA`), left: x0 + W + G, top: y });
});
await sharp({ create: { width: 4 * (W + G) - G, height: Math.ceil(pares.length / 2) * (H + G) - G, channels: 3, background: '#000' } }).composite(pecas).png().toFile(saida);
console.log('folha:', saida, `(${pares.length} pares)`);
