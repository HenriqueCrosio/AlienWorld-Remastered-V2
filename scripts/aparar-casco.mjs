// APARA a coluna de CONTORNO das artes do casco do Leviatã (Fase 3, Ato 2).
//
// O PROBLEMA MEDIDO (revisão da Fatia 5): o PixelLab devolveu as sete peças com uma coluna de
// contorno QUASE PRETA na borda — luminância 0,008–0,012 contra 0,13–0,19 do miolo, exatamente
// 1px de largura. Quais bordas variam por peça:
//
//   casco-leviata-1 (detalhe)   AS DUAS      casco-leviata-5 (base)      direita
//   casco-leviata-2 (detalhe2)  direita      casco-leviata-6 (detalhe5)  nenhuma
//   casco-leviata-3 (detalhe3)  AS DUAS      casco-leviata-7 (base2)     esquerda
//   casco-leviata-4 (detalhe4)  direita
//
// A faixa é montada com `gap` MENOR que a largura da peça (sobreposta, como as montanhas do
// parallax), e o comentário do `buildNebula()` afirmava que a emenda vertical sumia nisso. NÃO
// SUMIA: a peça da direita desenha por cima, então a coluna preta da BORDA ESQUERDA dela fica
// visível, e o `setFlipX` aleatório do `emit()` ainda sorteia qual das duas bordas cai ali. O
// resultado é um risco preto a cada ~60px atravessando a faixa — medido e fotografado.
//
// ⚠️ APARA 1px DOS DOIS LADOS, EM TODAS AS SETE, mesmo nas que só têm contorno de um lado. A
// largura tem que ficar UNIFORME (70px): o `gap` das camadas é escolhido contra ela, e peças de
// larguras diferentes fariam a sobreposição variar sem ninguém saber por quê. O 1px perdido de
// arte real nas bordas limpas é invisível numa peça de 72px.
//
// ⚠️ LÊ DE `assets/raw/` E ESCREVE EM `public/sprites/` — nunca reescreve o destino em cima de
// si mesmo. Rodar duas vezes tem que dar o mesmo resultado; um script que aparasse o próprio
// destino iria de 72 → 70 → 68 a cada rodada.
import sharp from 'sharp';

/** raw → sprite. A ordem dos nomes NÃO segue a numeração: ver `BootScene.ts` (ART). */
const PECAS = [
  ['casco-leviata-5.png', 'casco-leviata.png'],
  ['casco-leviata-7.png', 'casco-leviata2.png'],
  ['casco-leviata-1.png', 'casco-detalhe.png'],
  ['casco-leviata-2.png', 'casco-detalhe2.png'],
  ['casco-leviata-3.png', 'casco-detalhe3.png'],
  ['casco-leviata-4.png', 'casco-detalhe4.png'],
  ['casco-leviata-6.png', 'casco-detalhe5.png'],
];

const APARO = 1; // px de cada lado

/** Luminância média da coluna `x`, contando só o que é opaco (o transparente não tem cor). */
const coluna = (data, W, H, x) => {
  let soma = 0;
  let n = 0;
  for (let y = 0; y < H; y++) {
    const i = (y * W + x) * 4;
    if (data[i + 3] > 128) {
      soma += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      n++;
    }
  }
  return n ? soma / n : null;
};

for (const [origem, destino] of PECAS) {
  const src = `assets/raw/${origem}`;
  const dst = `public/sprites/${destino}`;

  const meta = await sharp(src).metadata();
  if (meta.width !== 72 || meta.height !== 72) {
    throw new Error(`${src}: esperava 72x72, achei ${meta.width}x${meta.height}`);
  }

  const antes = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const lEsq = coluna(antes.data, 72, 72, 0);
  const lDir = coluna(antes.data, 72, 72, 71);

  await sharp(src)
    .extract({ left: APARO, top: 0, width: 72 - 2 * APARO, height: 72 })
    .toFile(dst);

  const depois = await sharp(dst).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = 72 - 2 * APARO;
  const dEsq = coluna(depois.data, W, 72, 0);
  const dDir = coluna(depois.data, W, 72, W - 1);

  const fmt = (v) => (v === null ? ' --  ' : v.toFixed(3));
  console.log(
    `${destino.padEnd(20)} ${W}px  bordas ${fmt(lEsq)}/${fmt(lDir)} → ${fmt(dEsq)}/${fmt(dDir)}`,
  );

  // O contorno é preto de verdade (0,008–0,012). Depois do aparo nenhuma borda pode continuar
  // nesse patamar — se continuar, o contorno era mais grosso que 1px e o APARO está errado.
  for (const [lado, v] of [
    ['esquerda', dEsq],
    ['direita', dDir],
  ]) {
    if (v !== null && v < 0.05) {
      throw new Error(`${destino}: a borda ${lado} continua preta (${v.toFixed(3)}) — contorno > ${APARO}px?`);
    }
  }
}

console.log('\nSete peças aparadas para 70px, sem contorno nas bordas.');
