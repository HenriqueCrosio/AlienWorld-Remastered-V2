// A 2ª FORMA — as candidatas da "fúria" (o que sai de dentro do guardião) contra o guardião novo.
// Baixa cada objeto do PixelLab para `scripts/_f4/_furia/<rotulo>.png` e monta duas linhas:
//   1. em escala 1, contra o fundo escuro da folha (a arte crua);
//   2. em JOGO: sobre a pintura do núcleo, na escala 0,7 do guardião, no lugar onde ele estaciona.
//
//   node scripts/_f4/_folha-furia.mjs <saida.png> rotulo=object_id [rotulo=object_id ...]
import fs from 'node:fs';
import sharp from 'sharp';

const [saida, ...pares] = process.argv.slice(2);
const DIR = 'scripts/_f4/_furia';
fs.mkdirSync(DIR, { recursive: true });

const url = (id) =>
  `https://backblaze.pixellab.ai/file/pixellab-characters/objects/f7282f36-b779-4f64-832a-4693ca4cc628/${id}/rotations/unknown.png`;

const itens = [{ rotulo: 'guardiao', arquivo: 'public/sprites/guardiao.png' }];
for (const par of pares) {
  const [rotulo, id] = par.split('=');
  const r = await fetch(url(id));
  if (!r.ok) throw new Error(`${rotulo}: HTTP ${r.status}`);
  const arquivo = `${DIR}/${rotulo}.png`;
  fs.writeFileSync(arquivo, Buffer.from(await r.arrayBuffer()));
  itens.push({ rotulo, arquivo });
}

const Q = 256, PAD = 8, TXT = 22;
const W = PAD + itens.length * (384 + PAD);
const H = PAD + TXT + Q + PAD + 216 + PAD;
const pintura = await sharp('public/sprites/paint-bg-f4-d.png').png().toBuffer();

const comp = [];
for (const [i, it] of itens.entries()) {
  const x = PAD + i * (384 + PAD);
  const m = await sharp(it.arquivo).metadata();
  comp.push({
    input: Buffer.from(`<svg width="384" height="${TXT}"><text x="0" y="16" fill="#eee" font-size="15" font-family="monospace">${it.rotulo} ${m.width}x${m.height}</text></svg>`),
    left: x, top: PAD,
  });
  comp.push({ input: it.arquivo, left: x + (384 - m.width) / 2 | 0, top: PAD + TXT });
  // Em jogo: a pintura 384×216 e a criatura a 0,7, centrada onde o guardião estaciona (298,104).
  const w = Math.round(m.width * 0.7), h = Math.round(m.height * 0.7);
  const bicho = await sharp(it.arquivo).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
  const cena = await sharp(pintura)
    .composite([{ input: bicho, left: Math.round(298 - w / 2), top: Math.round(104 - h / 2) }])
    .png()
    .toBuffer();
  // `extract` depois do composite corta o que sai da tela, como o jogo.
  comp.push({ input: await sharp(cena).extract({ left: 0, top: 0, width: 384, height: 216 }).png().toBuffer(), left: x, top: PAD + TXT + Q + PAD });
}

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 34, g: 22, b: 30, alpha: 1 } } })
  .composite(comp)
  .png()
  .toFile(saida);
console.log(saida);
