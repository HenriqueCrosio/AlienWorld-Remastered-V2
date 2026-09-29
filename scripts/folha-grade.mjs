// Sheet builder: node scripts/folha-grade.mjs <indir> <out.png> <cols> <title> <footer> "file|label|color" ...
// Cells go in 1:1 (sharpness is judged at real size). Label color optional.
import sharp from 'sharp';
const [IN, OUT, colsArg, titulo, rodape, ...cels] = process.argv.slice(2);
const cols = +colsArg;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const metas = await Promise.all(cels.map((c) => sharp(`${IN}/${c.split('|')[0]}.png`).metadata()));
const cw = Math.max(...metas.map((m) => m.width)), ch = Math.max(...metas.map((m) => m.height));
const M = 16, GAP = 16, TOP = 56, LAB = 34;
const rows = Math.ceil(cels.length / cols);
const W = M * 2 + cols * cw + (cols - 1) * GAP;
const H = TOP + rows * (ch + LAB) + (rows - 1) * GAP + 44;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><style>text{font-family:Consolas,monospace;fill:#e6e8ee}</style>`;
svg += `<text x="${M}" y="36" font-size="24" font-weight="bold">${esc(titulo)}</text>`;
const comps = [];
cels.forEach((c, i) => {
  const [arq, rot, cor = '#f0a040'] = c.split('|');
  const x = M + (i % cols) * (cw + GAP), y = TOP + Math.floor(i / cols) * (ch + LAB + GAP);
  svg += `<text x="${x}" y="${y + 24}" font-size="18" style="fill:${cor}">${esc(rot)}</text>`;
  comps.push({ input: `${IN}/${arq}.png`, left: x, top: y + LAB });
});
svg += `<text x="${M}" y="${H - 16}" font-size="17" style="fill:#9aa3b5">${esc(rodape)}</text></svg>`;
await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } })
  .composite([{ input: Buffer.from(svg), left: 0, top: 0 }, ...comps]).png().toFile(OUT);
console.log(OUT, W, H);
