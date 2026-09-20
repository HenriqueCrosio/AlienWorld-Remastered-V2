// A DÚVIDA DO M4, EM UMA FOLHA. Põe lado a lado a borda que o duto VESTE hoje (f4FaixaB, 128×64)
// e a arte da câmara C que ele aprovou em 12/09 e que está parada (128×80) — com os 16px a mais
// marcados, que é o trecho inteiro da decisão.
//
//   node scripts/_f4/_ver-faixa-c-vs-b.mjs
import sharp from 'sharp';

const Z = 3;                    // zoom, nearest — arte de pixel nunca interpola
const PAD = 16;
const TOPO = 86;                // faixa dos rotulos
const B = 'public/sprites/f4-faixa-b.png';
const C = 'scripts/_f4/_faixa-C-v.png';

const artes = [
  { f: B, w: 128, h: 64, titulo: 'f4FaixaB — 128×64', sub: 'o que o duto VESTE hoje (herdada da garganta)' },
  { f: C, w: 128, h: 80, titulo: '_faixa-C-v.png — 128×80', sub: 'a arte da câmara C, aprovada em 12/09 e PARADA' },
];

const colW = 128 * Z;
const largura = PAD + colW + PAD * 3 + colW + PAD + 44;
const altura = TOPO + 80 * Z + PAD * 2 + 40;

const comps = [];
let x = PAD;
const cols = [];
for (const a of artes) {
  const buf = await sharp(a.f).resize(a.w * Z, a.h * Z, { kernel: 'nearest' }).png().toBuffer();
  comps.push({ input: buf, left: x, top: TOPO });
  cols.push({ ...a, x });
  x += colW + PAD * 3;
}

const t = (x, y, s, cor = '#e8e2d8', tam = 15, peso = 600) =>
  `<text x="${x}" y="${y}" font-family="Segoe UI, sans-serif" font-size="${tam}" font-weight="${peso}" fill="${cor}">${s}</text>`;

const c = cols[1];
const yFim64 = TOPO + 64 * Z;        // onde a peça de 64 acaba
const yFim80 = TOPO + 80 * Z;        // onde a de 80 acaba
const svg = `<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
  ${t(PAD, 24, 'A SUPERFÍCIE É O TOPO DA PEÇA. A diferença toda está EMBAIXO.', '#f0c674', 16)}
  ${cols.map((k) => t(k.x, 46, k.titulo, '#e8e2d8', 15)).join('')}
  ${cols.map((k) => t(k.x, 60, k.sub, '#9aa0a6', 12, 400)).join('')}
  <!-- a linha da superfície, nas duas -->
  ${cols.map((k) => `<line x1="${k.x - 6}" y1="${TOPO}" x2="${k.x + colW + 6}" y2="${TOPO}" stroke="#4fd1c5" stroke-width="2"/>`).join('')}
  ${t(PAD, TOPO - 7, '▼ a linha da SUPERFÍCIE — é daqui que a peça desce, nas duas', '#4fd1c5', 12, 400)}
  <!-- os 16px a mais, na C -->
  <rect x="${c.x}" y="${yFim64}" width="${colW}" height="${16 * Z}" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-dasharray="6 4"/>
  <line x1="${c.x - 6}" y1="${yFim64}" x2="${c.x + colW + 6}" y2="${yFim64}" stroke="#ff6b6b" stroke-width="2"/>
  ${t(c.x + colW + 10, yFim64 + 4, '+64', '#ff6b6b', 12, 400)}
  ${t(c.x + colW + 10, yFim80 + 4, '+80', '#ff6b6b', 12, 400)}
  ${t(c.x + 8, yFim64 + 16 * Z / 2 + 5, 'estes 16px são a dúvida', '#ff6b6b', 13)}
  ${t(PAD, altura - 26, 'a saia é ancorada em  superficie + 64  (Moldura.ts:888) — com a peça de 80 ela cai 16px DENTRO da arte', '#9aa0a6', 12, 400)}
  ${t(PAD, altura - 10, 'e a sonda cobra a dimensão  128x64  (probe-f4-moldura.mjs:181) — é ela que recusa a peça grossa', '#9aa0a6', 12, 400)}
</svg>`;

await sharp({ create: { width: largura, height: altura, channels: 4, background: { r: 22, g: 22, b: 26, alpha: 1 } } })
  .composite([...comps, { input: Buffer.from(svg), left: 0, top: 0 }])
  .png()
  .toFile('scripts/_f4/_folha-faixa-c-vs-b.png');
console.log('scripts/_f4/_folha-faixa-c-vs-b.png');
