// Contact sheet: every PNG matching a prefix, nearest-neighbour scaled, numbered, on a dark F2-like ground.
//   node scripts/_elites/_folha.mjs <dir> <prefix> <out.png> [scale=4] [cols=8]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [dir, prefixo, saida, escalaArg = '4', colsArg = '8'] = process.argv.slice(2);
const E = Number(escalaArg);
const COLS = Number(colsArg);
const arqs = fs
  .readdirSync(dir)
  .filter((f) => f.startsWith(prefixo) && f.endsWith('.png'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const metas = await Promise.all(arqs.map((f) => sharp(path.join(dir, f)).metadata()));
const CW = Math.max(...metas.map((m) => m.width)) * E + 16;
const CH = Math.max(...metas.map((m) => m.height)) * E + 28;
const linhas = Math.ceil(arqs.length / COLS);
const comp = [];
for (const [i, f] of arqs.entries()) {
  const m = metas[i];
  const x = (i % COLS) * CW;
  const y = Math.floor(i / COLS) * CH;
  const img = await sharp(path.join(dir, f)).resize({ width: m.width * E, kernel: 'nearest' }).toBuffer();
  comp.push({ input: img, left: x + 8, top: y + 20 });
  const rotulo = Buffer.from(
    `<svg width="${CW}" height="18"><text x="8" y="14" font-family="monospace" font-size="13" fill="#9aa">${f.replace('.png', '')}</text></svg>`,
  );
  comp.push({ input: rotulo, left: x, top: y });
}
await sharp({ create: { width: CW * Math.min(COLS, arqs.length), height: CH * linhas, channels: 4, background: '#1a1d24' } })
  .composite(comp)
  .png()
  .toFile(saida);
console.log(saida, arqs.length);
