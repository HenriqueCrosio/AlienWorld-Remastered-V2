// Ve uma animacao PRONTA do PixelLab: folha ampliada + a caixa de conteudo quadro a quadro.
//
// Generico de proposito — o kamikaze precisou disso e o cargueiro vai precisar igual. Mede alfa a
// alfa porque `sharp.trim()` devolve a tela inteira nestes PNGs, e compara a caixa de CONTEUDO
// (nao a tela) com o sprite que vai ser substituido: a tela mente sobre o tamanho aparente.
//
// uso: node scripts/_ver-anim.mjs <object-id> <anim-id> <n-quadros> <saida.png> [sprite-atual.png]
import sharp from 'sharp';

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const [obj, anim, nRaw, saida, atual] = process.argv.slice(2);
const n = Number(nRaw);
const ZOOM = 6;

async function caixa(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width;
  let y0 = info.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const quadros = [];
for (let i = 0; i < n; i++) {
  const r = await fetch(
    `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${obj}/animations/${anim}/unknown/${i}.png`,
  );
  if (!r.ok) throw new Error(`quadro ${i}: HTTP ${r.status}`);
  quadros.push(Buffer.from(await r.arrayBuffer()));
}

console.log('quadro | caixa de conteudo | posicao');
let uni = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
for (let i = 0; i < quadros.length; i++) {
  const c = await caixa(quadros[i]);
  console.log(`  [${String(i).padStart(2)}] | ${c.w}x${c.h} | (${c.x0},${c.y0})`);
  uni = {
    x0: Math.min(uni.x0, c.x0),
    y0: Math.min(uni.y0, c.y0),
    x1: Math.max(uni.x1, c.x0 + c.w - 1),
    y1: Math.max(uni.y1, c.y0 + c.h - 1),
  };
}
const uw = uni.x1 - uni.x0 + 1;
const uh = uni.y1 - uni.y0 + 1;
const m = await sharp(quadros[0]).metadata();
console.log(`\ntela ${m.width}x${m.height} | caixa UNIAO ${uw}x${uh} | aspecto ${(uw / uh).toFixed(2)}`);

if (atual) {
  const a = await caixa(await sharp(atual).toBuffer());
  const ma = await sharp(atual).metadata();
  console.log(
    `atual (${atual}): tela ${ma.width}x${ma.height}, conteudo ${a.w}x${a.h}, aspecto ${(a.w / a.h).toFixed(2)}`,
  );
  console.log(
    `\npara casar a ALTURA de conteudo: scale ${(a.h / uh).toFixed(3)} → ${Math.round((uw * a.h) / uh)}x${a.h} em tela (atual: ${a.w}x${a.h})`,
  );
}

const cols = Math.ceil(Math.sqrt(n));
const linhas = Math.ceil(n / cols);
await sharp({
  create: {
    width: m.width * ZOOM * cols,
    height: m.height * ZOOM * linhas,
    channels: 4,
    background: { r: 12, g: 16, b: 32, alpha: 1 },
  },
})
  .composite(
    await Promise.all(
      quadros.map(async (q, i) => ({
        input: await sharp(q)
          .resize(m.width * ZOOM, m.height * ZOOM, { kernel: 'nearest' })
          .toBuffer(),
        left: (i % cols) * m.width * ZOOM,
        top: Math.floor(i / cols) * m.height * ZOOM,
      })),
    ),
  )
  .png()
  .toFile(saida);
