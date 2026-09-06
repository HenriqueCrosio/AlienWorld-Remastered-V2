// VAZA regiões de um PNG por PREENCHIMENTO A PARTIR DE SEMENTES.
//
// ⚠️ POR QUE NÃO UM KEY GLOBAL POR COR. Medido na pintura do hangar: as janelas são cinza neutro
// (luminância 73, saturação 0,8) e 100% delas casa com o teste — mas 20,5% da PAREDE cai na mesma
// faixa. Um key global abriria buracos nas vísceras. Pixel de parede que por acaso casa não está
// CONECTADO a janela nenhuma, então o preenchimento não o alcança.
//
// ⚠️ E APERTAR O LIMIAR NÃO É A SAÍDA: apertar até a parede sobreviver comeria a BORDA das
// janelas — e é na borda que a nadadeira aparece recortada.
//
// uso: node scripts/vazar-por-sementes.mjs <entrada.png> <saida.png> <x,y> [<x,y> ...]
import sharp from 'sharp';

const [entrada, saida, ...sementes] = process.argv.slice(2);
if (!entrada || !saida || !sementes.length) {
  console.error('uso: node scripts/vazar-por-sementes.mjs <in.png> <out.png> <x,y> [<x,y> ...]');
  process.exit(1);
}

const { data, info } = await sharp(entrada)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** O cinza do xadrez: NEUTRO e de luminância média. Medido: janelas 73/0,8; convés 44/13,2. */
const casa = (i) => {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  const L = lum(r, g, b);
  return sat <= 12 && L >= 45 && L <= 105;
};

const visto = new Uint8Array(W * H);
const fila = [];
for (const s of sementes) {
  const [sx, sy] = s.split(',').map(Number);
  const i = sy * W + sx;
  if (!casa(i)) {
    console.error(`semente ${sx},${sy} NAO casa com o cinza do xadrez — confira a coordenada`);
    process.exit(1);
  }
  fila.push(i);
  visto[i] = 1;
}

let n = 0;
while (fila.length) {
  const i = fila.pop();
  n++;
  data[i * 4 + 3] = 0;
  const x = i % W, y = (i / W) | 0;
  const vizinhos = [];
  if (x > 0) vizinhos.push(i - 1);
  if (x < W - 1) vizinhos.push(i + 1);
  if (y > 0) vizinhos.push(i - W);
  if (y < H - 1) vizinhos.push(i + W);
  for (const v of vizinhos) if (!visto[v] && casa(v)) { visto[v] = 1; fila.push(v); }
}

await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(saida);
console.log(`${saida}: ${n}px vazados de ${W}x${H} (${(n / (W * H) * 100).toFixed(1)}%)`);
