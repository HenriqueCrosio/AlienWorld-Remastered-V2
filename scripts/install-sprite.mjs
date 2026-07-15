// Baixa um sprite ESTÁTICO do PixelLab e instala em public/sprites/.
//
// Faz de uma vez as três limpezas que TODO quadro do gerador precisa (docs/HANDOFF.md):
//
//  1. RECORTE. O PNG vem num canvas quadrado com transparência de sobra — `mtn-far` era 128×128
//     com a arte ocupando 128×39. Todo sprite ancorado precisa da caixa real.
//  2. XADREZ. Às vezes o gerador DESENHA o xadrez de transparência dentro do PNG (quadrados
//     cinza opacos). Some por cor.
//  3. COLUNAS DE BORDA OPACAS. Vêm de vez em quando e viram um RISCO VERTICAL na tela. Voltam a
//     cada instalação nova, porque o quadro vem do gerador, não do disco já corrigido.
//
// `frame` é o índice do candidato NO LOTE de review. Um objeto já PROMOVIDO (via
// select_object_frames) não tem mais lote: ele guarda um quadro só, em `rotations/unknown.png`.
// Passe `-` como frame nesse caso.
//
// uso: node scripts/install-sprite.mjs <object-id> <frame|-> <nome-de-saida> [--flip]
import sharp from 'sharp';

const [objId, frame, nome, ...flags] = process.argv.slice(2);
const flip = flags.includes('--flip');

if (!objId || frame === undefined || !nome) {
  console.error('uso: node scripts/install-sprite.mjs <object-id> <frame|-> <nome> [--flip]');
  process.exit(1);
}

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const base = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${objId}/rotations`;
const url = frame === '-' ? `${base}/unknown.png` : `${base}/frame_${frame}.png`;

const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);

let { data, info } = await sharp(Buffer.from(await res.arrayBuffer()))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: W, height: H } = info;
const A = (x, y) => data[(y * W + x) * 4 + 3];

// 2. XADREZ: cinzas neutros opacos são o padrão de transparência desenhado por engano.
let xadrez = 0;
for (let i = 0; i < W * H; i++) {
  const [r, g, b, a] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];
  const neutro = Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && Math.abs(r - b) < 6;
  const claro = r > 140 && r < 215;
  if (a > 10 && neutro && claro) {
    data[i * 4 + 3] = 0;
    xadrez++;
  }
}

// 3. COLUNAS/LINHAS DE BORDA 100% OPACAS: se a borda inteira é opaca, é moldura, não arte.
const colunaCheia = (x) => {
  for (let y = 0; y < H; y++) if (A(x, y) < 250) return false;
  return true;
};
const linhaCheia = (y) => {
  for (let x = 0; x < W; x++) if (A(x, y) < 250) return false;
  return true;
};

let bordas = 0;
for (const x of [0, W - 1]) {
  if (colunaCheia(x)) {
    for (let y = 0; y < H; y++) data[(y * W + x) * 4 + 3] = 0;
    bordas++;
  }
}
for (const y of [0, H - 1]) {
  if (linhaCheia(y)) {
    for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;
    bordas++;
  }
}

// 4. DUAS ARTES NO MESMO QUADRO.
//
// Às vezes o gerador desenha DOIS objetos empilhados num quadro só (a Aurora veio com duas naves
// separadas por 10 linhas vazias). Sem isto, o sprite instalado é o par — e o jogo mostra dois
// navios onde devia haver um.
//
// `--banda alta|baixa` corta na maior faixa horizontal VAZIA e fica com a metade pedida.
const banda = flags.includes('--banda') ? flags[flags.indexOf('--banda') + 1] : null;

if (banda) {
  const vazia = (y) => {
    for (let x = 0; x < W; x++) if (A(x, y) > 10) return false;
    return true;
  };

  // Uma faixa vazia só SEPARA se houver arte dos DOIS lados dela. A maior faixa de um quadro é
  // quase sempre a sobra do canvas embaixo — pegar "a maior" cortava a nave no lugar errado.
  const temArte = (de, ate) => {
    for (let y = de; y < ate; y++) if (!vazia(y)) return true;
    return false;
  };

  const bandas = [];
  let ini = -1;

  for (let y = 0; y <= H; y++) {
    if (y < H && vazia(y)) {
      if (ini < 0) ini = y;
    } else if (ini >= 0) {
      bandas.push({ ini, len: y - ini });
      ini = -1;
    }
  }

  const separadoras = bandas.filter(
    (b) => temArte(0, b.ini) && temArte(b.ini + b.len, H),
  );

  const melhor = separadoras.sort((a, b) => b.len - a.len)[0];

  if (melhor) {
    const de = banda === 'alta' ? 0 : melhor.ini + melhor.len;
    const ate = banda === 'alta' ? melhor.ini : H;

    for (let y = 0; y < H; y++) {
      if (y >= de && y < ate) continue;
      for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;
    }
    console.log(`  banda '${banda}': corte na faixa vazia y=${melhor.ini}..${melhor.ini + melhor.len - 1}`);
  } else {
    console.log(`  banda '${banda}': nenhuma faixa vazia no meio — quadro tem uma arte só.`);
  }
}

// 1. RECORTE pela caixa de conteúdo real.
let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (A(x, y) > 10) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
if (maxX < 0) throw new Error('quadro vazio depois da limpeza');

const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };

let img = sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract(box);
// Os sprites vêm apontando para a DIREITA. Um chefão que VEM na sua direção precisa do PNG
// espelhado em disco — espelhar em jogo (setFlipX) manteria as baterias do lado errado, porque
// os offsets das bocas de canhão são medidos a partir do centro e não acompanham o flip.
if (flip) img = img.flop();

await img.png().toFile(`public/sprites/${nome}.png`);

console.log(
  `${nome}.png ${box.width}x${box.height} (de ${W}x${H})` +
    (xadrez ? ` · xadrez: ${xadrez}px` : '') +
    (bordas ? ` · bordas removidas: ${bordas}` : '') +
    (flip ? ' · ESPELHADO' : ''),
);
