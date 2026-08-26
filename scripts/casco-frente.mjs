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
// A Fase 3 nunca ganhou o equivalente: a faixa do casco vive em `depth −75/−74`, muito atrás dos
// props, então não havia nada entre o pé deles e o olho. Este script corta o tile que faltava.
//
// ⚠️ O TILE É [arte | arte ESPELHADA], como o `groundTile`. Espelhar garante emenda invisível
// nos dois lados sem depender de a arte ser emendável — e a arte do casco NÃO é (foi o que
// custou o `aparar-casco.mjs`).
//
// ⚠️ Lê de `assets/raw/` e escreve em `public/sprites/`: rodar duas vezes dá o mesmo resultado.
import sharp from 'sharp';

const ORIGEM = 'assets/raw/casco-leviata-5.png'; // a peça LISA da base (ver BootScene)
const DESTINO = 'public/sprites/casco-frente.png';

// As linhas 40..57 do quadro: a metade de baixo do desenho opaco, onde estão as placas grandes.
// Acima disso a arte tem a silhueta irregular do topo da faixa, que numa tira repetida viraria
// um serrilhado.
//
// ⚠️ A LINHA 58 FICA DE FORA, E ESSE É O PONTO. Ela é a linha de CONTORNO da arte (luminância
// 0,009 contra 0,12 do miolo) — o mesmo defeito que o `aparar-casco.mjs` corrige nas laterais,
// aqui na horizontal. Incluída, ela viraria um risco preto atravessando a tela a cada repetição
// do tile. Medido: com ela dentro, a última linha do rodapé caía para 0,005.
const TOPO = 40;
const BASE = 57;

const meta = await sharp(ORIGEM).metadata();
if (meta.width !== 72 || meta.height !== 72) {
  throw new Error(`${ORIGEM}: esperava 72x72, achei ${meta.width}x${meta.height}`);
}

// Apara 1px de cada lado, a mesma conta do `aparar-casco.mjs` — a coluna de contorno preta da
// borda viraria um risco vertical a cada repetição do tile.
const tira = await sharp(ORIGEM)
  .extract({ left: 1, top: TOPO, width: 70, height: BASE - TOPO + 1 })
  .toBuffer();

const espelhada = await sharp(tira).flop().toBuffer();
const alturaTira = BASE - TOPO + 1;

await sharp({
  create: { width: 140, height: alturaTira, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    { input: tira, left: 0, top: 0 },
    { input: espelhada, left: 70, top: 0 },
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
