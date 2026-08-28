// A FAIXA DE CASCO DA FRENTE (Fase 3, Ato 2) — o tile que esconde o PÉ dos props.
//
// O PROBLEMA (relatado pelo Henrique, e é o MESMO da Fase 1): um prop ancorado na linha do solo
// termina numa borda reta, e sem nada na frente dele essa borda fica à mostra. O respiradouro
// parecia "um asset colado no outro", sem base.
//
// A Fase 1 resolve isso desde sempre com o `groundFront`: a MESMA arte do chão, começando um
// pouco acima da linha do solo, num tom mais escuro, em `depth −0.2` — à frente dos props
// (−0.5) e atrás da nave (0). O pé some atrás dela e o prop passa a estar PLANTADO.
//
// A Fase 3 nunca ganhou o equivalente: a faixa do casco vive em `depth −75`, muito atrás dos
// props, então não havia nada entre o pé deles e o olho. Este script corta o tile que faltava.
//
// ⚠️ O TILE É [arte | arte ESPELHADA], como o `groundTile`. Espelhar garante emenda invisível
// nos dois lados sem depender de a arte ser emendável — e a arte do casco NÃO é (foi o que
// custou o aparo de 1px em `instalar-casco.mjs`).
//
// ⚠️ LÊ DE `public/sprites/casco-placa.png` — a peça JÁ INSTALADA, não o raw. É a peça lisa
// (blindagem sem costela nem duto): a tira da frente é sombra do material, não um segundo
// assunto competindo com o que passa atrás dela. Rode o `instalar-casco.mjs` primeiro.
//
// ⚠️ AS LINHAS 44..61, E ELAS FORAM ESCOLHIDAS POR MEDIÇÃO, NÃO PELA ALTURA.
//
// O recorte "natural" seria 48..65 — as linhas que, com a faixa ancorada em `baseY = 216`,
// caem exatamente onde a tira vai ser desenhada (y=198..215), material do mesmo lugar do casco.
// Ele foi tentado e REPROVOU na sonda: a blindagem hexagonal tem SULCOS entre as placas, e
// nessa altura quatro deles são colunas de 1px quase pretas (0,010–0,021). Numa tira que repete
// a cada 228px isso vira um risco preto atravessando o chão da fase inteira — exatamente o
// defeito que o aparo das bordas existe para evitar, agora vindo do miolo do desenho.
//
// 44..61 é a janela de 18 linhas MAIS BAIXA da peça sem nenhuma coluna dessas (varridas todas,
// de 2 em 2: 48 → 4 riscos, 46 → 1, 44 → 0). O desalinho de 4px contra a faixa de trás não se
// vê — a tira está na frente, em sombra, e é o mesmo material. O risco preto se veria.
import sharp from 'sharp';

const ORIGEM = 'public/sprites/casco-placa.png';
const DESTINO = 'public/sprites/casco-frente.png';

const TOPO = 44;
const BASE = 61;
const LARGURA = 114;

const meta = await sharp(ORIGEM).metadata();
if (meta.width !== LARGURA || meta.height !== 66) {
  throw new Error(`${ORIGEM}: esperava ${LARGURA}x66, achei ${meta.width}x${meta.height} — rode o instalar-casco.mjs`);
}

const altura = BASE - TOPO + 1;
const tira = await sharp(ORIGEM).extract({ left: 0, top: TOPO, width: LARGURA, height: altura }).toBuffer();
const espelhada = await sharp(tira).flop().toBuffer();

await sharp({
  create: { width: LARGURA * 2, height: altura, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    { input: tira, left: 0, top: 0 },
    { input: espelhada, left: LARGURA, top: 0 },
  ])
  .png()
  .toFile(DESTINO);

// Confere o que interessa: a tira tem que ser 100% OPACA (é o que a torna capaz de esconder o
// pé de um prop) e não pode ter coluna preta nas bordas do tile.
const { data, info } = await sharp(DESTINO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let opacos = 0;
const coluna = (x) => {
  let l = 0;
  for (let y = 0; y < info.height; y++) {
    const i = (y * info.width + x) * 4;
    l += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  return l / info.height;
};
for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 250) opacos++;

const total = info.width * info.height;
console.log(
  `${DESTINO}: ${info.width}x${info.height} — opaco ${((100 * opacos) / total).toFixed(0)}%, ` +
    `bordas ${coluna(0).toFixed(3)}/${coluna(info.width - 1).toFixed(3)}`,
);

if (opacos < total) throw new Error('a tira tem pixel transparente — ela não esconderia o pé dos props');
if (coluna(0) < 0.05 || coluna(info.width - 1) < 0.05) throw new Error('borda preta no tile');

// ⚠️ E OS SULCOS DO MIOLO, que é o motivo de TOPO/BASE serem 44/61 e não 48/65 (ver acima).
// Uma coluna quase preta entre vizinhas claras, num tile que repete, é um risco atravessando o
// chão. O critério é o mesmo da sonda `probe-f3-visual`: escura de verdade E com vizinhas
// nitidamente claras — o que uma sombra larga de desenho nunca é.
const riscos = [];
for (let x = 1; x < info.width - 1; x++) {
  if (coluna(x) < 0.05 && coluna(x - 1) > 0.08 && coluna(x + 1) > 0.08) riscos.push(x);
}
if (riscos.length) {
  throw new Error(`sulco quase preto de 1px em x=${riscos.join(',')} — vira risco repetido no chão`);
}
console.log('sem sulcos de 1px no miolo: a tira pode repetir sem virar risco.');
