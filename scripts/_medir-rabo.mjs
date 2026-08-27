// Mede a arte do rabo do Leviatã e imprime o que a escala faz com ela na tela.
//
// Existe porque "colossal" virou um número de duas mãos: a sessão de 26/08 travou em 2,4 pela
// regra "o arco inteiro tem que caber", e o teste jogado derrubou a regra (agora ele DEVE
// sangrar). Sem régua, a escala nova é chute — e foi chute ampliado que aprovou um míssil que
// no tamanho do jogo era uma lasca vazia.
import sharp from 'sharp';

const GAME_H = 216;
const ORIGIN_X = 0.92;
const X = 368;
const Y = 104;

const img = sharp('public/sprites/rabo-leviata.png');
const { width, height } = await img.metadata();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

// Perfil por coluna: quantos pixels opacos ela tem.
const alturaDaColuna = [];
for (let x = 0; x < info.width; x++) {
  let n = 0;
  for (let y = 0; y < info.height; y++) {
    if (data[(y * info.width + x) * info.channels + 3] > 24) n++;
  }
  alturaDaColuna.push(n);
}

const maisAlta = Math.max(...alturaDaColuna);

console.log(`arte              ${width}x${height}`);
console.log(`coluna mais alta  ${maisAlta}px`);

// ⚠️ NÃO EXISTE UMA COLUNA ONDE "A NADADEIRA ACABA E O TOCO COMEÇA".
//
// A primeira versão desta régua procurava essa fronteira (a última coluna com ≥55% da altura
// máxima) e respondeu x=106 de 107 — ou seja, o perfil é alto de ponta a ponta e o "toco" teria
// 1px. A fronteira não existe: a arte é uma cunha contínua, não duas peças.
//
// Isso não é um detalhe de medição, é a razão de o mergulho ser uma ROTAÇÃO. Descer a peça em
// linha reta deixaria à mostra a borda de cima do desenho INTEIRO — nadadeira junto. Só girando
// em torno do pedúnculo a ponta longa sai da tela enquanto a raiz fica.
const passo = Math.ceil(width / 12);
const perfil = [];
for (let x = 0; x < width; x += passo) {
  const fatia = alturaDaColuna.slice(x, x + passo);
  perfil.push(`${x}:${Math.round(fatia.reduce((a, b) => a + b, 0) / fatia.length)}`);
}
console.log(`perfil (x:altura) ${perfil.join('  ')}`);
console.log('');

for (const escala of [2.4, 3.0, 3.4, 3.8]) {
  const w = width * escala;
  const h = height * escala;
  const esq = X - ORIGIN_X * w;
  const dir = X + (1 - ORIGIN_X) * w;
  const topo = Y - h / 2;
  const base = Y + h / 2;
  // A ponta da nadadeira, medida do pivô: é ela que limita o arco.
  const braco = ORIGIN_X * w;
  const varre = (a) => 2 * braco * Math.sin((a * Math.PI) / 180);
  console.log(
    `escala ${escala}  tela ${w.toFixed(0)}x${h.toFixed(0)}  ` +
      `x ${esq.toFixed(0)}..${dir.toFixed(0)}  y ${topo.toFixed(0)}..${base.toFixed(0)}  ` +
      `sangra ${topo < 0 ? `${(-topo).toFixed(0)}px topo` : 'NAO'} / ` +
      `${base > GAME_H ? `${(base - GAME_H).toFixed(0)}px base` : 'NAO'}  ` +
      `braco ${braco.toFixed(0)}px  varredura +-6=${varre(6).toFixed(0)}px +-8=${varre(8).toFixed(0)}px`,
  );
}

// O MERGULHO é uma ROTAÇÃO em torno do pedúnculo (ver GameScene.raboDoLeviata): girar
// positivo manda a nadadeira para baixo e deixa o TOCO praticamente no lugar.
console.log('');
const braco34 = ORIGIN_X * width * 3.4;
const meiaAltura = (height * 3.4) / 2;
for (const a of [26, 32, 38, 44]) {
  const queda = braco34 * Math.sin((a * Math.PI) / 180);
  const recuo = braco34 * (1 - Math.cos((a * Math.PI) / 180));
  // A BORDA DE CIMA da nadadeira é o que denuncia: se ela ainda estiver acima de 216, sobra
  // nadadeira na tela e o "só o toco" não aconteceu.
  const bordaDeCima = 200 + queda - meiaAltura;
  console.log(
    `mergulho ${a}graus  a nadadeira cai ${queda.toFixed(0)}px e recua ${recuo.toFixed(0)}px  ` +
      `(pivo em y=200 -> centro dela em y=${(200 + queda).toFixed(0)}, borda de cima em ` +
      `y=${bordaDeCima.toFixed(0)} — ${bordaDeCima > GAME_H ? 'FORA da tela, so o toco' : 'ainda APARECE'})`,
  );
}
