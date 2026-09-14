// FATIA 7 · assa a MESA DO MAR — a mesa da câmara alagada do golfinho.
//
// O pedido dele (14/09): *"quando o mapa encher de água, quero que utilize novas mesas (use as mesas
// que usamos como referência para construir um visual de 'fundo do mar' mas não perdendo o estilo
// dark sci-fi, bio mecânico)"*. Dois objetos no PixelLab, com as mesas instaladas como referência de
// estilo — `f4-mesa.png` para os contêineres, `f4-mesa3.png` para o anteparo:
//
//   5eff6d47-0e7c-4e90-8d6c-7e9b5af6c383  contêineres afundados   → escolhida a [1] (coral ciano)
//   84f4a25c-b89d-4ca4-8ace-d6c7c7b10f89  anteparo alagado        → escolhida a [0] (anêmonas e costela)
//
// As candidaturas não escolhidas CONTINUAM na fila de review do PixelLab — a fila é a biblioteca dele.
//
// ⚠️ A MESMA LEI DA `_assar-mesa.mjs`, e pelo mesmo motivo: a largura da TEXTURA é a pegada horizontal
// do obstáculo (a mesa nasce em escala 1), então as duas saem com os MESMOS 94px das mesas de aço.
// Trocar a arte não pode trocar a dificuldade de lado.
//
//   node scripts/_f4/_assar-mesa-mar.mjs
import sharp from 'sharp';

const LARGURA = 94;

// `topo`: quantas linhas cortar do ALTO da peça. ⚠️ ELE EXISTE POR UM VEREDICTO JOGADO (14/09): o
// anteparo *"fica cortado e não aparece a parte mais chamativa e bonita"*. A mesa é ENTERRADA pela
// borda do vão, então na tela só aparecem os ~50px de CIMA da textura — e no anteparo isso é laje
// lisa; as anêmonas e a costela moram da linha ~33 para baixo. Cortando 30, a janela que o jogo
// mostra passa a ser a delas. A altura que sobra (82) ainda cobre o pior caso do vão da arena: com
// `gap` 120 a borda do vão do chão SOBE no máximo até y=154, e 154 + 82 passa da base da tela.
const ESCOLHIDAS = {
  'cont-1': { nome: 'f4-mesa-mar.png', topo: 0 },
  'slab-0': { nome: 'f4-mesa-mar2.png', topo: 30 },
};

for (const [cand, { nome, topo }] of Object.entries(ESCOLHIDAS)) {
  const inteiro = await sharp(`scripts/_f4/_mesa-mar/${cand}.png`).trim({ threshold: 1 }).png().toBuffer();
  const mi = await sharp(inteiro).metadata();
  const aparado = topo === 0 ? inteiro : await sharp(inteiro)
    .extract({ left: 0, top: topo, width: mi.width, height: mi.height - topo }).png().toBuffer();
  const m = await sharp(aparado).metadata();
  const corte = Math.max(0, m.width - LARGURA);
  const final = corte === 0
    ? aparado
    : await sharp(aparado)
        .extract({ left: Math.floor(corte / 2), top: 0, width: LARGURA, height: m.height })
        .png().toBuffer();
  await sharp(final).png().toFile(`public/sprites/${nome}`);
  console.log(`✔ ${nome}  ${m.width}x${m.height} -> ${Math.min(m.width, LARGURA)}x${m.height}  (aparou ${corte}px)`);
}
