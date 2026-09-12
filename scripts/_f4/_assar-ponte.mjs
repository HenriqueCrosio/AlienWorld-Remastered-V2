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

/**
 * ⚠️ AS TORRES DE AMARRAÇÃO — o conserto do print dele (12/09).
 *
 * Veredicto: *"as passarelas de metal ficaram realmente boas, só que algumas começam do nada e
 * ficam com aparência de cortadas"*, com a ponta circulada em vermelho. A causa, ampliada: o
 * corrimão do original atravessa o quadro e é FATIADO pelos 72px da peça; montando a ponte, os
 * cortes internos somem (encontram o vão) mas os dois EXTERNOS ficam expostos — um convés
 * terminando numa parede vertical, no ar.
 *
 * ⚠️ A PRIMEIRA TENTATIVA FOI ERODIR A PONTA e ela foi descartada por ele: *"você pode criar uma
 * estrutura que feche a ponte no PixelLab... ou mais de uma para ter troca"*. Ele está certo —
 * esfarelar disfarça o corte; uma TORRE o resolve. Ponte de verdade termina em encontro, não em
 * desvanecimento.
 *
 * A montagem passou a ser: **[torre][pilar][vão][pilar espelhado][torre espelhada]**.
 */
const TORRES = ['p-05', 'p-11', 'p-13'];

/**
 * ⚠️ A TORRE É RECORTADA A 34px DE LARGURA, e o número sai de uma conta de TELA, não de gosto. A
 * peça já tinha 198px e a escala tem PISO em 1,41 (abaixo disso a mesa tapa o convés — ver a
 * camada no Parallax). Somar duas torres de 43px levaria a ponte a 284px, ou 400px em tela no piso
 * da escala: mais larga que os 384 da tela, e as duas pontas nunca apareceriam juntas. Recortando
 * a 34 e encurtando o vão para 2 montantes em todas, a peça fecha em 248px = 350px em tela.
 *
 * O recorte é pela face EXTERNA: é ela que fecha a ponte, e a interna encosta no convés.
 */
const TORRE_W = 34;
/** O alvo de valor das torres: a banda da decoração da fase, a mesma da passarela e do cano. */
const TORRE_ALVO = 16.4 * 2.2;

/** Quantos montantes de vão entre os dois pilares, por variante. */
const PONTES = [
  { de: 'f4-passarela.png', para: 'f4-ponte.png', montantes: 2, torre: 'p-05' },
  { de: 'f4-passarela2.png', para: 'f4-ponte2.png', montantes: 2, torre: 'p-11' },
  { de: 'f4-passarela3.png', para: 'f4-ponte3.png', montantes: 2, torre: 'p-13' },
];

/** Apara, escurece ao alvo e recorta a torre pela face externa. Devolve os pixels crus. */
async function prepararTorre(nome) {
  const t = await sharp(`scripts/_f4/_ponta/${nome}.png`).trim({ threshold: 1 }).png().toBuffer();
  const { data, info } = await sharp(t).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let soma = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    soma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; n++;
  }
  const g = TORRE_ALVO / (soma / n);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    // Contraste preservado em 1,25: a lâmpada âmbar é o motivo de a peça existir.
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.max(0, Math.min(255, TORRE_ALVO + (data[i + c] * g - TORRE_ALVO) * 1.25));
    }
  }
  return { data, W: info.width, H: info.height };
}

for (const { de, para, montantes, torre } of PONTES) {
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

  // ─── 4. AS TORRES, uma em cada ponta, ESPELHADAS entre si ───
  //
  // ⚠️ TUDO É ALINHADO PELA BASE, e isso não é arrumação: o convés mora a 28–44px do rodapé da
  // peça, e a camada no Parallax ancora a ponte por `baseY` com a conta da escala presa nesse
  // número (`222 − 44·escala`). Alinhar pelo topo faria a torre empurrar o convés para baixo e a
  // mesa voltaria a tapá-lo — o defeito que a escala 1,45 tinha acabado de consertar.
  const t = await prepararTorre(torre);
  const larguraTorre = Math.min(TORRE_W, t.W);
  const finalW = larguraTorre + total + larguraTorre;
  const finalH = Math.max(H, t.H);
  const saida = Buffer.alloc(finalW * finalH * 4, 0);
  const porFinal = (x, y, r, g, b, a) => {
    if (x < 0 || x >= finalW || y < 0 || y >= finalH) return;
    const i = (y * finalW + x) * 4;
    saida[i] = r; saida[i + 1] = g; saida[i + 2] = b; saida[i + 3] = a;
  };

  // a ponte, encostada no rodapé
  const dyPonte = finalH - H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < total; x++) {
      const i = (y * total + x) * 4;
      if (buf[i + 3] === 0) continue;
      porFinal(larguraTorre + x, dyPonte + y, buf[i], buf[i + 1], buf[i + 2], buf[i + 3]);
    }
  }

  // as torres, também no rodapé. A ESQUERDA leva as N primeiras colunas da peça (a
  // face externa dela); a DIREITA é a mesma coisa espelhada, para as duas fecharem para fora.
  const dyTorre = finalH - t.H;
  for (let y = 0; y < t.H; y++) {
    for (let x = 0; x < larguraTorre; x++) {
      const i = (y * t.W + x) * 4;
      if (t.data[i + 3] === 0) continue;
      porFinal(x, dyTorre + y, t.data[i], t.data[i + 1], t.data[i + 2], t.data[i + 3]);
      porFinal(finalW - 1 - x, dyTorre + y, t.data[i], t.data[i + 1], t.data[i + 2], t.data[i + 3]);
    }
  }

  await sharp(saida, { raw: { width: finalW, height: finalH, channels: 4 } })
    .png().toFile(`public/sprites/${para}`);
  console.log(
    `✔ ${para}  ${finalW}x${finalH}  (torre ${larguraTorre} + pilar ${W} + vão ${vaoW} + pilar ${W} + ` +
      `torre ${larguraTorre}; torre ${torre}, coluna de vão x=${X_VAO}, montante x=${X_MONT})`,
  );
}
