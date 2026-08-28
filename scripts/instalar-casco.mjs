// INSTALA os tiles do CASCO do Leviatã (Fase 3, Ato 2) — a arte nova de 2026-08-28.
//
// SUBSTITUI o `aparar-casco.mjs`, que servia às sete peças de 72×72 da primeira geração. Aquelas
// voltaram do gerador MARROM-OLIVA e a fase inteira teve de ser tingida de frio para escondê-lo
// (`tint 0x84c0ff`). ⚠️ ESTAS NASCEM NO CANON e por isso o tint some — medido com
// `_medir-paleta.mjs`, contra o modelo original e o rabo:
//
//   ref-leviata-armored   #0c121a / #1f2932    R−B −14 / −19
//   rabo-leviata          #19222a (39%)        R−B −17
//   casco ANTIGO          #32312b (44%)        R−B  +7   ← o intruso quente
//   casco NOVO (as seis)  #19222a / #2e3b44    R−B −17 / −22
//
// Tingir arte que já está na cor certa seria a terceira vez nesta campanha que se escurece
// arte já escura — e o tint só escurece.
//
// ─── O QUE O SCRIPT FAZ, E POR QUÊ ───
//
// ⚠️ APARA 1px DOS DOIS LADOS, NAS SEIS. O PixelLab devolveu de novo a coluna de contorno quase
// preta (medida: 0,005 contra 0,12–0,27 do miolo) — em `placa` à direita, em `duto` e
// `duto-placa` à esquerda — e mais uma coluna INTEIRAMENTE TRANSPARENTE em `escama`, `costela`
// (esquerda) e `costela-maq` (direita). As peças se sobrepõem na faixa (gap < largura), então a
// borda de quem desenha por cima fica visível: sem o aparo é um risco preto (ou um rasgo) a
// cada tile. Apara nas seis mesmo onde a borda está limpa — a LARGURA TEM QUE SER UNIFORME
// (114px), porque o `gap` da camada é escolhido contra ela.
//
// ⚠️ RECORTA 66 LINHAS A PARTIR DO TOPO OPACO DE CADA PEÇA, e o topo opaco VARIA (13 a 17). É o
// topo que vira a linha do chão: alinhar pela BASE do quadro deixaria a crista da faixa
// serrilhada de peça para peça. O quadro resultante é a faixa — sem padding, nada a compensar
// no `baseY` (a armadilha que custou os 7px de espaço aberto no rodapé da versão anterior).
//
// ⚠️ 66 E NÃO 53 (a altura da faixa antiga). As peças novas são 116² contra 72², e o desenho
// delas é uma faixa completa: em 53 linhas as COSTELAS saem decapitadas e o nó azul dos dutos
// fica de fora — medido nos recortes de 53/66/80 em `scripts/_f3/novos/`. 66 põe a crista em
// y=151 (era 165): os props da fase têm 57–62px e ainda coroam acima da faixa, que é o que os
// mantém legíveis em silhueta.
//
// ⚠️ LÊ DE `assets/raw/` E ESCREVE EM `public/sprites/`. Rodar duas vezes dá o mesmo resultado.
import sharp from 'sharp';

/** raw → sprite, com o TOPO OPACO de cada peça (medido, não estimado). */
const PECAS = [
  ['casco-placa.png', 'casco-placa.png', 13],
  ['casco-escama.png', 'casco-escama.png', 17],
  ['casco-costela.png', 'casco-costela.png', 15],
  ['casco-costela-maq.png', 'casco-costela2.png', 17],
  ['casco-duto.png', 'casco-duto.png', 14],
  ['casco-duto-placa.png', 'casco-duto2.png', 17],
];

const APARO = 1;
const LARGURA = 116 - 2 * APARO;
export const ALTURA = 66;

const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

for (const [origem, destino, topo] of PECAS) {
  const src = `assets/raw/${origem}`;
  const dst = `public/sprites/${destino}`;

  const meta = await sharp(src).metadata();
  if (meta.width !== 116 || meta.height !== 116) {
    throw new Error(`${src}: esperava 116x116, achei ${meta.width}x${meta.height}`);
  }

  await sharp(src)
    .extract({ left: APARO, top: topo, width: LARGURA, height: ALTURA })
    .toFile(dst);

  const { data } = await sharp(dst).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // A faixa é o CHÃO: um furo nela deixa passar estrela e asteroide por baixo do casco — o
  // defeito que o rodapé da versão anterior já pagou uma vez (7px de espaço aberto atravessando
  // o rodapé, medido em luminância).
  //
  // ⚠️ AS DUAS PRIMEIRAS LINHAS SÃO EXCEÇÃO, E DE PROPÓSITO. Elas são a CRISTA — a silhueta do
  // topo do casco contra o vácuo — e ela é irregular nas seis peças (20 a 70 pixels vazados de
  // 114). Uma crista reta seria uma régua: o casco vira placa de compensado. Do row 2 para
  // baixo, opacidade total e sem discussão.
  const CRISTA = 2;
  let vazados = 0;
  for (let y = CRISTA; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA; x++) if (data[(y * LARGURA + x) * 4 + 3] < 250) vazados++;
  }
  if (vazados) throw new Error(`${destino}: ${vazados} pixels não-opacos abaixo da crista — a faixa tem furo`);

  const coluna = (x) => {
    let s = 0;
    for (let y = CRISTA; y < ALTURA; y++) {
      const i = (y * LARGURA + x) * 4;
      s += lum(data[i], data[i + 1], data[i + 2]);
    }
    return s / (ALTURA - CRISTA);
  };

  const esq = coluna(0);
  const dir = coluna(LARGURA - 1);
  console.log(`${destino.padEnd(22)} ${LARGURA}x${ALTURA}  bordas ${esq.toFixed(3)}/${dir.toFixed(3)}`);

  // O contorno do gerador é preto de verdade (0,005). Depois do aparo nenhuma borda pode
  // continuar nesse patamar — se continuar, o contorno era mais grosso que 1px.
  for (const [lado, v] of [['esquerda', esq], ['direita', dir]]) {
    if (v < 0.05) throw new Error(`${destino}: a borda ${lado} continua preta (${v.toFixed(3)}) — contorno > ${APARO}px?`);
  }
}

console.log(`\nSeis peças instaladas em ${LARGURA}x${ALTURA}, opacas e sem contorno nas bordas.`);
