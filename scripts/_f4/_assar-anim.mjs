// ASSA UMA ANIMAÇÃO DE CENÁRIO DA F4: prende o estouro e monta a folha de sprites.
//
// ⚠️ ELE EXISTE PORQUE O GERADOR NÃO OBEDECE LIMITE DE COR. Duas rodadas pediram "nunca branco,
// nunca pálido" com todas as letras, e as duas voltaram com o núcleo estourado — o modelo tem um
// viés forte de "pulsar = clarear". Pedir uma terceira vez é gastar geração para tirar o mesmo
// número. O limite se impõe aqui, onde é determinístico.
//
// ⚠️ A ÂNCORA É O SPRITE ESTÁTICO QUE JÁ ESTÁ NO JOGO, não um número escolhido. Ele foi aprovado
// jogando, e o quadro 0 de cada animação saiu idêntico a ele (média 42,5 nos dois) — então a
// pergunta não é "que brilho é bonito", é "quanto esta peça pode passear em volta do que já foi
// aprovado". Duas travas:
//   • o p99 de cada quadro não passa do p99 do estático — mata a mancha branca
//   • a média de cada quadro não passa de PICO× a do estático — mata o pisca-pisca
//
// ⚠️ A ORDEM DOS QUADROS NÃO É MEXIDA. Ordenar por brilho fecharia o loop mais bonito no papel e
// embaralharia o desenho da carne, que muda de forma quadro a quadro. Quem fecha o loop é o YOYO
// na hora de tocar (0→8→0), e ele fecha por construção, sem tocar na arte.
//
//   node scripts/_f4/_assar-anim.mjs <pasta> <estatico.png> <saida.png> [pico=1.20] [teto=1] [forca=1]
import sharp from 'sharp';
import { readdirSync } from 'fs';

const [pasta, estatico, saida, picoArg, tetoArg, forcaArg] = process.argv.slice(2);
const PICO = Number(picoArg ?? 1.20);
// ⚠️ O TETO SAI DO p99 DO ESTÁTICO, MAS NEM SEMPRE O p99 É DA PARTE QUE ACENDE. No coração os
// pixels mais claros da peça são o BRILHO DO LATÃO da gaiola, não a carne — usar 183 como teto da
// carne devolve uma brasa creme, que foi exatamente o defeito da 1ª assada. Este fator baixa o
// teto para a faixa da parte que respira. 1 = o p99 cru; no órgão, 0,72.
const TETO_F = Number(tetoArg ?? 1);
// A amplitude inteira, em fração. Ver o passo 3, lá embaixo.
const FORCA = Number(forcaArg ?? 1);

const L = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

async function medir(f) {
  const { data } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const vs = [];
  let s = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const v = L(data, i); vs.push(v); s += v;
  }
  vs.sort((a, b) => a - b);
  return { media: s / vs.length, p99: vs[Math.floor(vs.length * 0.99)] };
}

const alvo = await medir(estatico);
console.log(`estático: média ${alvo.media.toFixed(1)}  p99 ${alvo.p99.toFixed(0)}`);
console.log(`travas:   média ≤ ${(alvo.media * PICO).toFixed(1)}   teto ≤ ${(alvo.p99 * TETO_F).toFixed(0)}`);

/**
 * O MATIZ QUENTE DA PEÇA, colhido do ESTÁTICO — a brasa que ela já tem quando ninguém mexeu.
 *
 * ⚠️ ELE EXISTE PORQUE COMPRIMIR BRILHO NÃO DEVOLVE COR. Onde o gerador estourou, o pixel é
 * branco puro (255,255,255): escalar branco por qualquer ganho devolve CINZA, e cinza no meio de
 * uma brasa não lê como brasa mais fraca, lê como cinza morta — um buraco na peça. O valor sai da
 * arte aprovada em vez de ser escolhido, pela mesma razão que a `Moldura.corDoFundo` mede a cor
 * do enchimento em vez de cravá-la: a peça pode ser repintada, e um literal envelheceria mal.
 */
async function matizQuente(f) {
  const { data } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const quentes = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    // SÓ os pixels SATURADOS entram: os já estourados do próprio estático são justamente os que
    // não têm matiz para emprestar.
    if (mx < 90 || (mx - mn) / mx < 0.35) continue;
    // ⚠️ E SÓ OS VERMELHOS DE VERDADE — esta linha é o mesmo conserto que o teto levou, um andar
    // abaixo. No coração os pixels saturados MAIS CLAROS são o brilho dourado do LATÃO da gaiola,
    // não a carne, e sem este filtro a "brasa" da peça saía tan pálido (1,28/0,94/0,56): o retint
    // então pintava o estouro de bege e a mancha continuava lá, só com outro nome. A brasa tem
    // vermelho dominante e pouco azul; o latão tem b/r ≈ 0,55 e cai fora aqui.
    if (r !== mx || b / r > 0.5) continue;
    quentes.push([r, g, b, L(data, i)]);
  }
  quentes.sort((a, b) => b[3] - a[3]);
  const top = quentes.slice(0, Math.max(1, Math.floor(quentes.length * 0.1)));
  const soma = top.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
  const m = soma.map((v) => v / top.length);
  const lm = 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2];
  return m.map((v) => v / lm); // normalizado: multiplicar por uma luminância devolve a cor
}

const QUENTE = await matizQuente(estatico);
console.log(`matiz quente da peça: ${QUENTE.map((v) => v.toFixed(2)).join(' / ')} (r/g/b por luminância)`);

const arqs = readdirSync(pasta).filter((f) => f.endsWith('.png'))
  .sort((a, b) => parseInt(a) - parseInt(b)).map((f) => `${pasta}/${f}`);

const quadros = [];
for (const f of arqs) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // 1 · O JOELHO. Acima do joelho o valor derrete para o teto em vez de bater nele — uma
  // saturação dura desenharia uma borda chapada em volta do núcleo, que é pior que o estouro.
  // O HUE É PRESERVADO: escala-se o RGB inteiro pelo fator do brilho, nunca canal a canal.
  const TETO = alvo.p99 * TETO_F, JOELHO = TETO * 0.65;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const v = L(data, i);
    if (v <= JOELHO) continue;
    const vNovo = JOELHO + (TETO - JOELHO) * (1 - Math.exp(-(v - JOELHO) / (TETO - JOELHO)));

    // ⚠️ E A COR DE VOLTA NO QUE ESTOUROU — MEDIDA POR MATIZ, NÃO POR SATURAÇÃO. A 1ª versão
    // perguntava "este pixel está lavado?" e deixava passar a mancha creme do coração: creme
    // (230,215,150) tem saturação 0,35, suficiente para escapar do filtro. O estouro do gerador
    // não vira cinza, vira CREME AMARELO — o defeito é de matiz, e é assim que se mede.
    //
    // A régua é `azul ÷ vermelho`: a brasa da peça tem uma razão baixa (0,44 no coração, 0,22 no
    // maquinário) e tudo que desbota em direção ao branco sobe essa razão. Um vermelho de verdade
    // fica com `desvio` 0 e não é tocado.
    const r = data[i], b = data[i + 2];
    const razao = b / Math.max(r, 1);
    const razaoQuente = QUENTE[2] / QUENTE[0];
    const desvio = Math.max(0, Math.min(1, (razao - razaoQuente) / (1 - razaoQuente)));
    const lavagem = desvio * Math.min(1, (v - JOELHO) / (TETO - JOELHO));

    for (let c = 0; c < 3; c++) {
      const proprio = data[i + c] * (vNovo / v);      // ele mesmo, só rebaixado
      const brasa = QUENTE[c] * vNovo;                // a cor da peça, na mesma luminância
      data[i + c] = Math.max(0, Math.min(255, Math.round(proprio * (1 - lavagem) + brasa * lavagem)));
    }
  }

  // 2 · A MÉDIA. Só CORTA: um quadro mais escuro que o estático fica como está — o fundo da
  // respiração é dele, e levantá-lo apagaria a metade dim da batida.
  let s = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 8) continue; s += L(data, i); n++; }
  const media = s / n, limite = alvo.media * PICO;
  if (media > limite) {
    const g = limite / media;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, Math.round(data[i + c] * g));
    }
  }
  quadros.push({ data, info });
}

// 3 · A FORÇA — cada quadro misturado de volta no QUADRO 0, que é o sprite estático aprovado.
//
// ⚠️ ISTO É O KNOB DA AMPLITUDE, e ele é separado das travas de cima de propósito. As travas
// dizem "não passe daqui" e agem quadro a quadro; a força diz "quanto disto tudo", e age na
// animação inteira sem mexer em ONDE a sombra cai nem em QUE FORMA ela tem. Sem ele, a única
// maneira de amansar um movimento exagerado seria repintar quadro a quadro.
//
// ⚠️ FOI O CORAÇÃO QUE PEDIU. O prompt de "só escurece" acertou a cor de primeira, mas a sombra
// afundava até a carne quase sumir (média 34 contra os 42,6 do estático): a gaiola continuava
// acesa e o miolo apagava, o que lê como o órgão PISCANDO, não batendo. Com força 0,55 a sombra
// cai no mesmo lugar, com pouco mais da metade da profundidade.
if (FORCA < 1) {
  const q0 = quadros[0].data;
  for (const q of quadros) {
    for (let i = 0; i < q.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        q.data[i + c] = Math.round(q0[i + c] + (q.data[i + c] - q0[i + c]) * FORCA);
      }
    }
  }
}

const { width: W, height: H } = quadros[0].info;
const comps = [];
for (let i = 0; i < quadros.length; i++) {
  comps.push({
    input: await sharp(quadros[i].data, { raw: quadros[i].info }).png().toBuffer(),
    left: i * W, top: 0,
  });
}
await sharp({ create: { width: W * quadros.length, height: H, channels: 4,
  background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toFile(saida);

console.log(`\ndepois:`);
const tmp = `${saida}.tmp.png`;
for (let i = 0; i < quadros.length; i++) {
  await sharp(quadros[i].data, { raw: quadros[i].info }).png().toFile(tmp);
  const m = await medir(tmp);
  console.log(`  q${i}  média ${m.media.toFixed(1)}  p99 ${m.p99.toFixed(0)}`);
}
await sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .png().toFile(tmp);
console.log(`\n${saida}  ${W * quadros.length}x${H}  (${quadros.length} quadros de ${W}x${H})`);
