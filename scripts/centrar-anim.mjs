// Tira a DERIVA de um bloco de quadros: realinha todos por um ponto comum e recorta todos pela
// MESMA caixa união, NO DISCO.
//
// O problema que ele resolve: o PixelLab anima redesenhando cada quadro do zero, sem âncora. Num
// objeto que deveria só pulsar no lugar, o desenho escorrega alguns pixels ao longo do ciclo
// (a bola de energia da canhoneira andava 5.6px para a esquerda e 2.9px para cima em 7 quadros).
// Num sprite que voa, essa deriva soma à velocidade e vira um solavanco a cada volta da animação.
//
// A ÂNCORA é a bbox do CORPO, não o centroide nem a bbox crua:
//   - a bbox crua é puxada por fagulhas soltas de um quadro só (o f3 da bola tinha um espeto);
//   - o centroide é puxado pelo NÚCLEO quente, que se move de propósito dentro da bola.
// Por isso as linhas/colunas com menos de `MIN_PX` pixels opacos não contam — fagulha fina é
// descartada, corpo é mantido.
//
// Em BLOCO e com caixa ÚNICA pelo mesmo motivo do `espelhar.mjs`: quadros recortados por caixas
// próprias tremem entre si, que é justamente o defeito que este script existe para tirar.
//
// uso: node scripts/centrar-anim.mjs <arquivo.png> [arquivo.png ...]
//      (reescreve os arquivos no lugar; passe o estático JUNTO dos quadros de animação)
import sharp from 'sharp';
import fs from 'fs';

/** Alpha a partir do qual o pixel conta como CORPO (e não como fagulha/antialias). */
const SOLIDO = 140;
/** Mínimo de pixels de corpo numa linha/coluna para ela contar na âncora. */
const MIN_PX = 4;
/** Alpha a partir do qual o pixel conta para a caixa união (aqui a fagulha CONTA — não pode ser cortada). */
const VISIVEL = 8;
/** Folga para o quadro não encostar na borda ao ser deslocado. */
const PAD = 24;

const arquivos = process.argv.slice(2);
if (!arquivos.length) {
  console.error('uso: node scripts/centrar-anim.mjs <arquivo.png> [...]');
  process.exit(1);
}

/** Centro do CORPO do desenho, em pixels do PNG. `null` se o quadro estiver vazio. */
function centroDoCorpo(data, w, h) {
  const linhas = new Array(h).fill(0);
  const colunas = new Array(w).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > SOLIDO) {
        linhas[y]++;
        colunas[x]++;
      }
    }
  }
  const faixa = (arr) => {
    let a = -1;
    let b = -1;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] >= MIN_PX) {
        if (a < 0) a = i;
        b = i;
      }
    }
    return a < 0 ? null : [a, b];
  };
  const fx = faixa(colunas);
  const fy = faixa(linhas);
  if (!fx || !fy) return null;
  return { x: (fx[0] + fx[1]) / 2, y: (fy[0] + fy[1]) / 2 };
}

// ─── 1. Medir todo mundo ───
const quadros = [];
for (const f of arquivos) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const centro = centroDoCorpo(data, info.width, info.height);
  if (!centro) {
    console.error(`${f}: quadro vazio (nenhum pixel com alpha > ${SOLIDO}) — abortando`);
    process.exit(1);
  }
  quadros.push({ arquivo: f, info, centro });
}

// O alvo é a MÉDIA dos centros: assim o deslocamento se reparte entre os quadros em vez de
// empurrar o ciclo todo para o lado de um quadro escolhido a dedo.
const alvoX = quadros.reduce((s, q) => s + q.centro.x, 0) / quadros.length;
const alvoY = quadros.reduce((s, q) => s + q.centro.y, 0) / quadros.length;

// ─── 2. Deslocar (em inteiros — meio pixel não existe em pixel art) ───
const maxW = Math.max(...quadros.map((q) => q.info.width));
const maxH = Math.max(...quadros.map((q) => q.info.height));
const telaW = maxW + PAD * 2;
const telaH = maxH + PAD * 2;

for (const q of quadros) {
  q.dx = Math.round(alvoX - q.centro.x);
  q.dy = Math.round(alvoY - q.centro.y);
  q.tela = await sharp({
    create: { width: telaW, height: telaH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: q.arquivo, left: PAD + q.dx, top: PAD + q.dy }])
    .png()
    .toBuffer();
}

// ─── 3. Caixa UNIÃO de todos os quadros já deslocados ───
let x0 = Infinity;
let y0 = Infinity;
let x1 = -1;
let y1 = -1;
for (const q of quadros) {
  const { data } = await sharp(q.tela).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < telaH; y++) {
    for (let x = 0; x < telaW; x++) {
      if (data[(y * telaW + x) * 4 + 3] > VISIVEL) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
}

// ─── 4. Recortar todo mundo pela mesma caixa e reescrever ───
const largura = x1 - x0 + 1;
const altura = y1 - y0 + 1;
for (const q of quadros) {
  const buf = await sharp(q.tela)
    .extract({ left: x0, top: y0, width: largura, height: altura })
    .png()
    .toBuffer();
  fs.writeFileSync(q.arquivo, buf);
  console.log(
    `${q.arquivo}: deslocado (${q.dx >= 0 ? '+' : ''}${q.dx}, ${q.dy >= 0 ? '+' : ''}${q.dy}) → ${largura}x${altura}`,
  );
}
console.log(`\ncaixa união: ${largura}x${altura} (era até ${maxW}x${maxH})`);
