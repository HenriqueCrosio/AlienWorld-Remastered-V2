// 02/11 — a zoomed contact sheet: every frame of each dir side by side (one row per dir), nearest-neighbour, on the
// fight's dark background, the frame number under each. To look at generated clips AMPLIADOS before showing them.
//   node contato.mjs <out.png> <escala> <dir> [<dir> ...]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [OUT, ESC, ...DIRS] = process.argv.slice(2);
const k = Number(ESC);
const linhas = DIRS.map((d) => fs.readdirSync(d).filter((f) => /^\d+\.png$/.test(f)).map((f) => Number(f.slice(0, -4))).sort((a, b) => a - b).map((i) => path.join(d, `${i}.png`)));
const L = 256 * k, G = 4, TXT = 14;
const cols = Math.max(...linhas.map((l) => l.length));
const comp = [];
for (let r = 0; r < linhas.length; r++) for (let c = 0; c < linhas[r].length; c++) {
  comp.push({ input: await sharp(linhas[r][c]).resize(L, L, { kernel: 'nearest' }).png().toBuffer(), left: c * (L + G), top: r * (L + G + TXT) });
  const svg = `<svg width="${L}" height="${TXT}"><text x="2" y="11" font-size="11" fill="#9aa3b5" font-family="monospace">${path.basename(path.dirname(linhas[r][c]))} ${c}</text></svg>`;
  comp.push({ input: Buffer.from(svg), left: c * (L + G), top: r * (L + G + TXT) + L });
}
await sharp({ create: { width: cols * (L + G), height: linhas.length * (L + G + TXT), channels: 4, background: '#1a1d26' } }).composite(comp).png().toFile(OUT);
console.log(OUT, `${linhas.length} linhas × ${cols}`);
