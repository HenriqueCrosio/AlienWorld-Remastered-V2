// Prévia ampliada de objetos PixelLab JÁ COMPLETOS (rotations/unknown.png).
// uso: node scripts/_sheet-obj.mjs <saida.png> <escala> <id:rotulo> [id:rotulo ...]
import sharp from 'sharp';

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const [out, escalaRaw, ...args] = process.argv.slice(2);
const escala = Number(escalaRaw || 8);

const celulas = [];
for (const a of args) {
  const i = a.indexOf(':');
  const [id, rot] = [a.slice(0, i), a.slice(i + 1)];
  const url = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${id}/rotations/unknown.png`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${rot}: HTTP ${res.status}`);
  celulas.push({ buf: Buffer.from(await res.arrayBuffer()), rot });
}

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
const rotuloH = 26;
const gap = 12;
const W = celulas.length * (cw + gap) + gap;
const H = ch + rotuloH + gap * 2;

const camadas = [];
for (let i = 0; i < celulas.length; i++) {
  const x = gap + i * (cw + gap);
  const img = await sharp(celulas[i].buf)
    .resize(metas[i].width * escala, metas[i].height * escala, { kernel: 'nearest' })
    .png()
    .toBuffer();
  camadas.push({ input: img, left: x + Math.round((cw - metas[i].width * escala) / 2), top: gap });
  camadas.push({
    input: Buffer.from(
      `<svg width="${cw}" height="${rotuloH}"><text x="${cw / 2}" y="18" font-family="monospace" font-size="17" fill="#fff" text-anchor="middle">${celulas[i].rot} ${metas[i].width}x${metas[i].height}</text></svg>`,
    ),
    left: x,
    top: gap + ch,
  });
}

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 24, g: 20, b: 34, alpha: 1 } } })
  .composite(camadas)
  .png()
  .toFile(out);

console.log(`${out}: ${W}x${H}`);
