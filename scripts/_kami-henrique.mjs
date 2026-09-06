// Olha o kamikaze que o Henrique fez à mão: base + os 9 quadros da animação, ampliados,
// e a leitura no TAMANHO DE JOGO. uso: node scripts/_kami-henrique.mjs <saida.png>
import sharp from 'sharp';

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const OBJ = '31b0ea5f-8461-4973-af21-3e9e10290f9e';
const ANIM = '70850116-0e5e-47b7-b4d9-8ca5d9b582ef';
const ZOOM = 8;

async function baixar(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

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
for (let i = 0; i < 9; i++) {
  quadros.push(
    await baixar(
      `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${OBJ}/animations/${ANIM}/unknown/${i}.png`,
    ),
  );
}

// A caixa UNIÃO de todos os quadros — é ela que decide o tamanho em tela de uma animação
// (um quadro só mente quando o desenho escorrega ao longo do ciclo).
let uw = 0;
let uh = 0;
console.log('quadro | caixa de conteudo');
for (let i = 0; i < quadros.length; i++) {
  const c = await caixa(quadros[i]);
  console.log(`  [${i}]  | ${c.w}x${c.h} em (${c.x0},${c.y0})`);
  uw = Math.max(uw, c.x0 + c.w);
  uh = Math.max(uh, c.y0 + c.h);
}

const m = await sharp(quadros[0]).metadata();
console.log(`\ntela: ${m.width}x${m.height} | uniao ocupada: ate ${uw}x${uh}`);

const grandes = [];
for (const q of quadros) {
  grandes.push(
    await sharp(q)
      .resize(m.width * ZOOM, m.height * ZOOM, { kernel: 'nearest' })
      .toBuffer(),
  );
}

const cel = m.width * ZOOM;
const celA = m.height * ZOOM;
await sharp({
  create: {
    width: cel * 5,
    height: celA * 2,
    channels: 4,
    background: { r: 12, g: 16, b: 32, alpha: 1 },
  },
})
  .composite(
    grandes.map((buf, i) => ({
      input: buf,
      left: (i % 5) * cel,
      top: Math.floor(i / 5) * celA,
    })),
  )
  .png()
  .toFile(process.argv[2]);
