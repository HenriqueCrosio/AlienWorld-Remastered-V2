// Instala DUAS animações do mesmo objeto com UMA caixa de recorte compartilhada.
//
// Por que não rodar o install-anim.mjs duas vezes: ele calcula a caixa união sobre os quadros
// que recebe. Rodado duas vezes, cada animação ganha a SUA caixa — e como o clarão do disparo
// se estende para a esquerda, a caixa do "fire" nasce mais larga que a do "hover". Enquadramentos
// diferentes = centros diferentes, e o sprite SALTA no frame em que troca de animação. É o mesmo
// alerta que o Boss.ts já carrega sobre a boca do cano ("as duas animações compartilham uma
// caixa única").
//
// A limpeza (xadrez + bordas opacas) é a mesma do install-anim.mjs, e vem ANTES da caixa.
//
// uso: node scripts/install-anim-par.mjs <estatico> <nomeA> <urlA> <nA> <nomeB> <urlB> <nB>
import sharp from 'sharp';
import fs from 'fs';

const [staticName, nomeA, urlA, nARaw, nomeB, urlB, nBRaw] = process.argv.slice(2);
if (!staticName || !nomeA || !urlA || !nARaw || !nomeB || !urlB || !nBRaw) {
  console.error('uso: node scripts/install-anim-par.mjs <estatico> <nomeA> <urlA> <nA> <nomeB> <urlB> <nB>');
  process.exit(1);
}

const lotes = [
  { nome: nomeA, url: urlA, n: Number(nARaw) },
  { nome: nomeB, url: urlB, n: Number(nBRaw) },
];

let xadrezTotal = 0;
let bordasTotal = 0;

/** Baixa e LIMPA um quadro, devolvendo RAW. */
async function limpar(url, destino) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const bruto = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destino, bruto);

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

  return { data, W, H };
}

for (const lote of lotes) {
  const tmp = `assets/raw/anim-${lote.nome}`;
  fs.mkdirSync(tmp, { recursive: true });
  lote.quadros = [];
  for (let i = 0; i < lote.n; i++) {
    lote.quadros.push(await limpar(`${lote.url}/${i}.png`, `${tmp}/${i}.png`));
  }
}

// A CAIXA ÚNICA: união sobre TODOS os quadros das DUAS animações.
let minX = 1e9;
let minY = 1e9;
let maxX = -1;
let maxY = -1;

for (const lote of lotes) {
  for (const { data, W, H } of lote.quadros) {
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
}

if (maxX < 0) throw new Error('todos os quadros ficaram vazios depois da limpeza');

const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };

for (const lote of lotes) {
  for (let i = 0; i < lote.n; i++) {
    const { data, W, H } = lote.quadros[i];
    await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .extract(box)
      .png()
      .toFile(`public/sprites/${lote.nome}-${i}.png`);
  }
}

// O estático sai do quadro 0 da PRIMEIRA animação — mesmo enquadramento, então ele não salta
// no instante em que a animação começa.
fs.copyFileSync(`public/sprites/${nomeA}-0.png`, `public/sprites/${staticName}.png`);

console.log(
  `${nomeA} (${lotes[0].n}) + ${nomeB} (${lotes[1].n}): caixa ÚNICA ${box.width}x${box.height} em [${box.left},${box.top}]` +
    ` · estático: ${staticName}.png` +
    (xadrezTotal ? ` · xadrez: ${xadrezTotal}px` : '') +
    (bordasTotal ? ` · bordas removidas: ${bordasTotal}` : ''),
);
