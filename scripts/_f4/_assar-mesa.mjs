// FATIA 7 · M2 · assa a MESA da Fase 4 — o obstáculo que colide.
//
// ⚠️ A ESTRUTURA FOI DECIDIDA COM ELE EM 12/09: aço ENGOLIDO, não carne. A mesa é a única coisa da
// fase que mata por ser TERRENO — todo o resto ou é fundo (tingido escuro, depth negativo) ou é
// inimigo (se move, atira). Por isso ela é a única peça da F4 que nasce SEM tint. Se ela fosse
// biomecânica seria feita da mesma matéria da faixa, das costelas e da parede de onde cresce:
// camuflagem, que é o defeito que a arte provisória já tem documentado ("a mesa lê mais clara que
// a parede, inverte a leitura de plano").
//
// ⚠️ E TOPO CHATO NÃO É ESTILO, É GEOMETRIA. A hitbox é retângulo de altura cheia com 60% da
// LARGURA DA TEXTURA (`TerrainSystem.ts:386`), então o desenho tem de alcançar a hitbox lá em cima,
// onde o jogador passa. Aço tem topo chato de graça — contêiner, chapa de convés, anteparo. Carne
// afunila, que foi como a lâmina morreu em 08/09: larga na base, fina na ponta, 46px de morte
// invisível.
//
// ⚠️ O APARO LATERAL É O QUE PRESERVA A DIFICULDADE, e é o passo que não se vê. A mesa nasce em
// ESCALA 1 e é enterrada pelo topo (`bordaVao`), então **a largura da TEXTURA é a pegada horizontal
// do obstáculo**. As candidaturas nascem quase quadradas (101–112 de largura) contra os 94 da
// provisória — instalar assim engordaria o obstáculo em até 19%, esticando o tempo que o jogador
// passa DENTRO do aperto. O vão (126/112/120) é dele, calibrado jogando em 12/09; uma peça de arte
// não pode mexer em dificuldade de lado.
//
// ⚠️ E A LARGURA É FIXA, NÃO O ASPECTO — foi assim que a primeira versão errou. Aparar ao aspecto
// da provisória (94/110) dá larguras diferentes quando as candidaturas têm alturas diferentes:
// saíram 94, 91 e 89, ou seja, **o obstáculo mudava de grossura conforme o sorteio do
// `pickVariant`**. Quem pegou foi o assert novo da `probe-f4-moldura`, não o olho. A altura pode
// variar à vontade (ela só precisa ser grande o bastante para enterrar o pé); a largura, não.
import sharp from 'sharp';

/** A pegada horizontal da provisória, medida. ⚠️ É a dificuldade, não a estética. */
const LARGURA = 94;

const ESCOLHIDAS = {
  'cont-1': 'f4-mesa.png',   // contêineres empilhados, hera leve — a mais "intacta"
  'cont-3': 'f4-mesa2.png',  // contêineres com as veias TREPANDO pelos cantos
  'slab-3': 'f4-mesa3.png',  // anteparo rachado, as veias entrando pelas fendas
};

const media = async (buf) => {
  const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let s = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; n++;
  }
  return s / n;
};

for (const [cand, nome] of Object.entries(ESCOLHIDAS)) {
  const aparado = await sharp(`scripts/_f4/_mesa/${cand}.png`).trim({ threshold: 1 }).png().toBuffer();
  const m = await sharp(aparado).metadata();

  // Recorte CENTRADO até a largura da provisória. Centrado porque a tarja âmbar e as veias moram
  // no miolo; cortar de um lado só jogaria a peça fora de prumo.
  const alvoW = LARGURA;
  const corte = Math.max(0, m.width - alvoW);
  const final = corte === 0
    ? aparado
    : await sharp(aparado)
        .extract({ left: Math.floor(corte / 2), top: 0, width: alvoW, height: m.height })
        .png().toBuffer();

  const saida = `public/sprites/${nome}`;
  await sharp(final).png().toFile(saida);
  console.log(
    `✔ ${nome}  ${m.width}x${m.height} -> ${Math.min(m.width, alvoW)}x${m.height}  ` +
      `(aparou ${corte}px)  luminância ${(await media(final)).toFixed(1)} = ${((await media(final)) / 16.4).toFixed(2)}x a pintura`,
  );
}
