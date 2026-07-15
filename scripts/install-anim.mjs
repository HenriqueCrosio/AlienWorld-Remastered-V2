// Baixa os quadros de uma animação do PixelLab e instala em public/sprites/.
//
// Recorta TODOS os quadros pela mesma caixa (a UNIÃO das caixas de conteúdo). Recortar cada
// quadro pela sua própria caixa daria um enquadramento diferente a cada frame — e o sprite
// tremeria na tela. O sprite estático recebe o mesmo enquadramento, senão ele salta no instante
// em que a animação começa.
//
// ⚠️ A LIMPEZA VEM ANTES DA CAIXA, e a ordem não é negociável.
//
// Os quadros de animação vêm do mesmo gerador que os estáticos, então herdam os mesmos dois
// defeitos (docs/HANDOFF.md, lições 16-17): o xadrez de transparência desenhado dentro do PNG, e
// colunas/linhas de borda 100% opacas. Este script não os limpava — só o install-sprite.mjs
// limpava — e uma borda opaca aqui é PIOR do que num sprite estático: além do risco vertical na
// tela, ela é opaca em TODOS os quadros, então entra na caixa UNIÃO e infla o recorte do sprite
// inteiro. O sprite ganharia uma margem morta que nenhuma inspeção do quadro explicaria.
//
// uso: node scripts/install-anim.mjs <nome-arquivo> <url-base> <n-quadros> [png-estatico]
import sharp from 'sharp';
import fs from 'fs';

const [file, baseUrl, countRaw, staticName] = process.argv.slice(2);
const count = Number(countRaw);

if (!file || !baseUrl || !count) {
  console.error('uso: node scripts/install-anim.mjs <nome> <url-base> <n> [estatico]');
  process.exit(1);
}

const tmp = `assets/raw/anim-${file}`;
fs.mkdirSync(tmp, { recursive: true });

/** Os quadros já limpos, em RAW — a caixa união é medida sobre ELES. */
const quadros = [];
let xadrezTotal = 0;
let bordasTotal = 0;

for (let i = 0; i < count; i++) {
  const res = await fetch(`${baseUrl}/${i}.png`);
  if (!res.ok) throw new Error(`quadro ${i}: HTTP ${res.status}`);

  const bruto = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(`${tmp}/${i}.png`, bruto);

  const { data, info } = await sharp(bruto).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const A = (x, y) => data[(y * W + x) * 4 + 3];

  // XADREZ: cinzas neutros e claros opacos são o padrão de transparência desenhado por engano.
  for (let p = 0; p < W * H; p++) {
    const [r, g, b, a] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2], data[p * 4 + 3]];
    const neutro = Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && Math.abs(r - b) < 6;
    const claro = r > 140 && r < 215;
    if (a > 10 && neutro && claro) {
      data[p * 4 + 3] = 0;
      xadrezTotal++;
    }
  }

  // BORDAS 100% OPACAS: se a borda inteira é opaca, é moldura, não arte.
  const colunaCheia = (x) => {
    for (let y = 0; y < H; y++) if (A(x, y) < 250) return false;
    return true;
  };
  const linhaCheia = (y) => {
    for (let x = 0; x < W; x++) if (A(x, y) < 250) return false;
    return true;
  };

  for (const x of [0, W - 1]) {
    if (colunaCheia(x)) {
      for (let y = 0; y < H; y++) data[(y * W + x) * 4 + 3] = 0;
      bordasTotal++;
    }
  }
  for (const y of [0, H - 1]) {
    if (linhaCheia(y)) {
      for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;
      bordasTotal++;
    }
  }

  quadros.push({ data, W, H });
}

// A CAIXA UNIÃO, medida sobre os quadros JÁ LIMPOS.
let minX = 1e9;
let minY = 1e9;
let maxX = -1;
let maxY = -1;

for (const { data, W, H } of quadros) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
}

if (maxX < 0) throw new Error('todos os quadros ficaram vazios depois da limpeza');

const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };

for (let i = 0; i < count; i++) {
  const { data, W, H } = quadros[i];
  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract(box)
    .png()
    .toFile(`public/sprites/${file}-${i}.png`);
}

if (staticName) {
  fs.copyFileSync(`public/sprites/${file}-0.png`, `public/sprites/${staticName}.png`);
}

console.log(
  `${file}: ${count} quadros em ${box.width}x${box.height}` +
    (staticName ? ` (estático: ${staticName}.png)` : '') +
    (xadrezTotal ? ` · xadrez: ${xadrezTotal}px` : '') +
    (bordasTotal ? ` · bordas removidas: ${bordasTotal}` : ''),
);
