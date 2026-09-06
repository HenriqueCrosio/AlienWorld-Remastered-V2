// Contact sheet dos candidatos de um objeto em review do PixelLab.
// uso: node sheet-cand.mjs <object_id> <n> <saida.png> [escala] [extra.png:rotulo]
import sharp from 'sharp';
import fs from 'fs';

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const [objId, nRaw, out, escalaRaw, ...extras] = process.argv.slice(2);
const n = Number(nRaw);
const escala = Number(escalaRaw || 4);

const celulas = [];

for (let i = 0; i < n; i++) {
  const url = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${objId}/rotations/frame_${i}.png`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`frame ${i}: HTTP ${res.status}`);
  celulas.push({ buf: Buffer.from(await res.arrayBuffer()), rot: String(i) });
}

for (const e of extras) {
  const [caminho, rot] = e.split(':');
  celulas.push({ buf: fs.readFileSync(caminho), rot: rot || caminho });
}

// Normaliza tudo para o maior tamanho, ampliado sem suavizar.
let maxW = 0;
let maxH = 0;
const metas = [];
for (const c of celulas) {
  const m = await sharp(c.buf).metadata();
  metas.push(m);
  maxW = Math.max(maxW, m.width);
  maxH = Math.max(maxH, m.height);
}

const cw = maxW * escala;
const ch = maxH * escala;
const rotuloH = 22;
const gap = 8;
const cols = Number(process.env.COLS || 4);
const rows = Math.ceil(celulas.length / cols);
const W = cols * (cw + gap) + gap;
const H = rows * (ch + rotuloH + gap) + gap;

const camadas = [];
for (let i = 0; i < celulas.length; i++) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x = gap + col * (cw + gap);
  const y = gap + row * (ch + rotuloH + gap);

  const img = await sharp(celulas[i].buf)
    .resize(metas[i].width * escala, metas[i].height * escala, { kernel: 'nearest' })
    .png()
    .toBuffer();

  camadas.push({ input: img, left: x + Math.round((cw - metas[i].width * escala) / 2), top: y });
  camadas.push({
    input: Buffer.from(
      `<svg width="${cw}" height="${rotuloH}"><text x="${cw / 2}" y="16" font-family="monospace" font-size="16" fill="#fff" text-anchor="middle">[${celulas[i].rot}]</text></svg>`,
    ),
    left: x,
    top: y + ch,
  });
}

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 24, g: 20, b: 34, alpha: 1 } } })
  .composite(camadas)
  .png()
  .toFile(out);

console.log(`${out}: ${W}x${H} · ${celulas.length} celulas · quadro base ${maxW}x${maxH}`);
