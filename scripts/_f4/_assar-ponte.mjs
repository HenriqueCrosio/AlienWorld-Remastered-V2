// FATIA 7 · A PONTE — prolonga a passarela de forma procedural (12/09, 3ª rodada).
//
// ⚠️ O PEDIDO É DELE, e o diagnóstico também: *"sobre o asset da ponte, eu achei, é que ele está
// pequeno e as mesas e bordas tampam ele. O que pensei: hoje nós temos o que seria o início de uma
// ponte ou passarela, podemos criar uma continuação desse jeito: Ponte atual ___(continuação)___
// Ponte atual invertida."* Ou seja: a peça de 71px não era pequena por acidente — ela é a PONTA de
// uma ponte, e uma ponta sozinha não lê como ponte.
//
// A MONTAGEM: [pilar esquerdo] + [vão procedural] + [pilar direito espelhado]. Os pilares são a
// peça que já existe (convés + guarda-corpo + as veias do bicho subindo por baixo); o vão é só
// convés e guarda-corpo, porque carne no meio de um vão suspenso não faz sentido nenhum.
//
// ⚠️ O VÃO NÃO É UMA FATIA REPETIDA, É DESENHADO COLUNA A COLUNA — e a diferença é a emenda.
// Repetir um pedaço de 18px de arte pintada denuncia a costura a cada 18px (é a mesma doença do
// "papel de parede" que a spec de 08/09 já discutiu para as faixas). Aqui o vão nasce de DUAS
// colunas do próprio original: uma de VÃO (x=13, entre montantes) esticada para preencher, e uma
// de MONTANTE (x=25–26) carimbada a cada 18px. Sem emenda por construção, e com a paleta e o
// sombreado verticais do original de graça.
//
// A anatomia, medida (`cobertura por linha`): linhas 0–1 são a barra do corrimão (72%), 2–14 são
// os montantes (11–34%), 15–31 são o CONVÉS (90–100%), e de 32 para baixo é a carne (52–93%).
// O vão leva só 0–31.
import sharp from 'sharp';

const PASSO = 18;        // o espaçamento dos montantes no original (medido: x 9, 25, 45, 64)
const ALTURA_VAO = 32;   // linhas 0–31: corrimão + convés, sem carne

/**
 * Acha a coluna que vai ser esticada pelo vão inteiro, e a coluna do montante.
 *
 * ⚠️ A COLUNA DO VÃO NÃO PODE TER LUZ, e isto foi um defeito real: a 1ª versão cravou x=13 à mão e
 * essa coluna atravessa a LÂMPADA ÂMBAR da peça — o vão saiu com a lâmpada esticada de ponta a
 * ponta, quebrada em três pedaços pelos montantes. Três lâmpadas em fila leem como padrão, e a
 * lâmpada é justamente o que deve marcar o PILAR, não se espalhar pelo vão.
 *
 * A régua: a coluna tem o convés cheio (linhas 15–31), o guarda-corpo vazio (3–13) e **nenhum
 * pixel quente** — quente = vermelho alto e claramente acima do azul, que é o que a tarja âmbar é
 * e o aço frio não é.
 */
function acharColunas(px, W) {
  const quente = ([r, , b, a]) => a >= 24 && r > 120 && r - b > 60;
  const vaos = [];
  const montantes = [];
  for (let x = 0; x < W; x++) {
    let posts = 0, deck = 0, luz = 0;
    for (let y = 3; y <= 13; y++) if (px(x, y)[3] >= 24) posts++;
    for (let y = 15; y <= 31; y++) if (px(x, y)[3] >= 24) deck++;
    for (let y = 0; y < ALTURA_VAO; y++) if (quente(px(x, y))) luz++;
    if (deck >= 16 && posts >= 8 && luz === 0) montantes.push(x);
    if (deck >= 17 && posts === 0 && luz === 0) vaos.push(x);
  }
  if (!vaos.length || !montantes.length) return null;
  // O vão do MEIO da lista: as colunas das pontas encostam no corte lateral da peça.
  return { vao: vaos[Math.floor(vaos.length / 2)], montante: montantes[Math.floor(montantes.length / 2)] };
}

/** Quantos montantes de vão entre os dois pilares, por variante. */
const PONTES = [
  { de: 'f4-passarela.png', para: 'f4-ponte.png', montantes: 2 },
  { de: 'f4-passarela2.png', para: 'f4-ponte2.png', montantes: 3 },
  { de: 'f4-passarela3.png', para: 'f4-ponte3.png', montantes: 3 },
];

for (const { de, para, montantes } of PONTES) {
  const src = sharp(`public/sprites/${de}`).ensureAlpha();
  const { width: W, height: H } = await src.metadata();
  const { data } = await src.raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * W + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  const col = acharColunas(px, W);
  if (!col) { console.log(`✘ ${para}: nenhuma coluna limpa em ${de}`); continue; }
  const { vao: X_VAO, montante: X_MONT } = col;

  const vaoW = montantes * PASSO;
  const total = W + vaoW + W;
  const buf = Buffer.alloc(total * H * 4, 0);
  const por = (x, y, [r, g, b, a]) => {
    const i = (y * total + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };

  // 1. O PILAR ESQUERDO: a peça como ela é.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) por(x, y, px(x, y));

  // 2. O VÃO: a coluna de vão esticada, e os montantes carimbados por cima.
  for (let i = 0; i < vaoW; i++) {
    const x = W + i;
    for (let y = 0; y < ALTURA_VAO; y++) por(x, y, px(X_VAO, y));
  }
  for (let m = 0; m < montantes; m++) {
    // Meio passo de deslocamento: o 1º montante do vão não pode colar no último do pilar.
    const base = W + Math.round(PASSO / 2) + m * PASSO;
    for (let d = 0; d < 2; d++) {
      for (let y = 0; y < ALTURA_VAO; y++) {
        const p = px(X_MONT + d, y);
        if (p[3] >= 24) por(base + d, y, p);
      }
    }
  }

  // 3. O PILAR DIREITO: a mesma peça, ESPELHADA. ⚠️ Espelhar e não repetir — dois pilares
  // idênticos apontando para o mesmo lado leem como a peça colada duas vezes, que é exatamente o
  // defeito que ele apontou em 10/09 sobre as costelas ("alguns se repetem em outros tamanhos").
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) por(total - 1 - x, y, px(x, y));
  }

  await sharp(buf, { raw: { width: total, height: H, channels: 4 } }).png().toFile(`public/sprites/${para}`);
  console.log(
    `✔ ${para}  ${total}x${H}  (pilar ${W} + vão ${vaoW} + pilar ${W}, ${montantes} montantes; ` +
      `coluna de vão x=${X_VAO}, montante x=${X_MONT})`,
  );
}
