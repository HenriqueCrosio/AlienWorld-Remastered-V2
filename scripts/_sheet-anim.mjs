// Tira de quadros de uma animação PixelLab (url-base + n) para revisão a olho.
// uso: node _sheet-anim.mjs <saida.png> <escala> <url-base> <n>
import sharp from 'sharp';

const [out, escalaRaw, base, nRaw] = process.argv.slice(2);
const escala = Number(escalaRaw || 3);
// <n> = contagem (0..n-1) OU uma lista de índices separada por vírgula ("0,3,6,7").
const idx = nRaw.includes(',')
  ? nRaw.split(',').map(Number)
  : Array.from({ length: Number(nRaw) }, (_, i) => i);
const n = idx.length;

const bufs = [];
for (const i of idx) {
  const res = await fetch(`${base}/${i}.png`);
  if (!res.ok) throw new Error(`quadro ${i}: HTTP ${res.status}`);
  bufs.push(Buffer.from(await res.arrayBuffer()));
}

const metas = [];
let maxW = 0;
let maxH = 0;
for (const b of bufs) {
  const m = await sharp(b).metadata();
  metas.push(m);
  maxW = Math.max(maxW, m.width);
  maxH = Math.max(maxH, m.height);
}

const cw = maxW * escala;
const ch = maxH * escala;
const gap = 8;
const rot = 22;
const W = n * (cw + gap) + gap;
const H = ch + rot + gap * 2;

const camadas = [];
for (let i = 0; i < n; i++) {
  const x = gap + i * (cw + gap);
  const img = await sharp(bufs[i])
    .resize(metas[i].width * escala, metas[i].height * escala, { kernel: 'nearest' })
    .png()
    .toBuffer();
  camadas.push({ input: img, left: x, top: gap });
  camadas.push({
    input: Buffer.from(
      `<svg width="${cw}" height="${rot}"><text x="${cw / 2}" y="16" font-family="monospace" font-size="15" fill="#fff" text-anchor="middle">${idx[i]}</text></svg>`,
    ),
    left: x,
    top: gap + ch,
  });
}

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 24, g: 20, b: 34, alpha: 1 } } })
  .composite(camadas)
  .png()
  .toFile(out);

console.log(`${out}: ${W}x${H} (${n} quadros de ${maxW}x${maxH})`);
