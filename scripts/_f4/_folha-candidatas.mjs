// MONTA UMA FOLHA DE CONTATO a partir de URLs do PixelLab (ou arquivos locais).
//
// ⚠️ SOBRE O FUNDO DA FOLHA, e isso não é enfeite: as candidatas são julgadas CONTRA O VIZINHO
// que elas vão ter na tela, nunca contra branco. Uma peça escura sobre fundo claro sempre parece
// legível; foi assim que a mesa provisória passou por quatro sondas lendo mais clara que a
// parede. O padrão aqui é o AZUL do núcleo, que é o vizinho do esfíncter.
//
//   node scripts/_f4/_folha-candidatas.mjs saida.png [--zoom 2] [--fundo duto|nucleo] url_ou_arquivo...
import sharp from 'sharp';

const argv = process.argv.slice(2);
const saida = argv.shift();
let zoom = 2;
let fundo = { r: 16, g: 24, b: 42 }; // o azul do núcleo
const fontes = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--zoom') zoom = Number(argv[++i]);
  else if (argv[i] === '--fundo') fundo = argv[++i] === 'duto' ? { r: 38, g: 14, b: 12 } : fundo;
  else fontes.push(argv[i]);
}
if (!saida || fontes.length === 0) {
  console.error('uso: node scripts/_f4/_folha-candidatas.mjs saida.png [--zoom N] [--fundo duto|nucleo] <url|arquivo>...');
  process.exit(1);
}

const pegar = async (f) => {
  if (!/^https?:/.test(f)) return sharp(f);
  const r = await fetch(f);
  if (!r.ok) throw new Error(`${r.status} em ${f}`);
  return sharp(Buffer.from(await r.arrayBuffer()));
};

const pecas = [];
for (const f of fontes) {
  const img = await pegar(f);
  const m = await img.metadata();
  pecas.push({
    buf: await img
      .resize({ width: m.width * zoom, height: m.height * zoom, kernel: 'nearest' })
      .toBuffer(),
    w: m.width * zoom,
    h: m.height * zoom,
    rotulo: f.split('/').slice(-3).join('/'),
  });
  console.log(`${m.width}x${m.height}  ${f}`);
}

const PAD = 10;
const H = Math.max(...pecas.map((p) => p.h)) + PAD * 2;
const W = pecas.reduce((a, p) => a + p.w + PAD, PAD);
let x = PAD;
await sharp({ create: { width: W, height: H, channels: 4, background: { ...fundo, alpha: 1 } } })
  .composite(
    pecas.map((p) => {
      const item = { input: p.buf, left: x, top: Math.round((H - p.h) / 2) };
      x += p.w + PAD;
      return item;
    }),
  )
  .png()
  .toFile(saida);
console.log(saida);
