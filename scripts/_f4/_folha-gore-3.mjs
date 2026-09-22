// AS TRÊS VERSÕES DO GORE, LADO A LADO — uma linha por variação, quatro instantes por linha.
//
// ⚠️ A FOLHA É UMA SÓ, DE PROPÓSITO. Três arquivos separados fazem ele comparar de memória, e o
// que está em julgamento aqui é diferença, não qualidade absoluta: qual das três diz melhor
// *arrombei um bicho*. Lado a lado, a resposta aparece em um olhar; em três abas, não aparece.
//
// ⚠️ E OS QUATRO INSTANTES SÃO OS MESMOS NAS TRÊS. Ele já aprovou a VELOCIDADE do estouro (*"a
// explosão é rápida... eles voam para frente e servem para o propósito"*), então mudar o relógio
// de uma linha para ela "aparecer melhor" seria trapacear o teste.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_folha-gore-3.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'scripts/_f4/_folha-gore-3.png';

const VARIACOES = [
  ['jorro', 'A · O JORRO — o sangue no AR'],
  ['viscera', 'B · A VÍSCERA — o sangue na MATÉRIA'],
  ['estrago', 'C · O ESTRAGO — o sangue na CENA'],
];
// ⚠️ SEIS INSTANTES CAPTURADOS, QUATRO EM CADA FOLHA, E AS DUAS ESCOLHAS SÃO DIFERENTES. A folha
// cheia precisa da IGNIÇÃO, porque é lá que ele sente o baque. A folha com zoom não: a bola de fogo
// do `fx.explode` toma a janela inteira até ~0,45s, e um zoom no clarão não mostra gore nenhum —
// mostra fogo. O que a folha com zoom tem de responder só existe DEPOIS que o clarão sai.
const INSTANTES = [
  [90, 'a ignição'],
  [300, '+0,3s'],
  [550, '+0,55s'],
  [800, '+0,8s'],
  [1200, '+1,2s'],
  [1600, '+1,6s'],
];
const NA_CHEIA = [0, 1, 3, 5];
const NO_ZOOM = [1, 2, 3, 4];

const L = 768,
  A = 432;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const linhas = [];
for (const [chave, rotulo] of VARIACOES) {
  // ⚠️ UMA PÁGINA NOVA POR VARIAÇÃO, e não um `restart` da cena. O estouro deixa tweens vivos,
  // texturas em cache e a parede num outro ponto da curva; reaproveitar a página faria a 3ª linha
  // ser julgada num corredor diferente do da 1ª. Página nova é o único jeito de as três verem a
  // MESMA parede.
  const page = await browser.newPage({ viewport: { width: L, height: A } });
  page.on('pageerror', (e) => console.log(`[ERRO ${chave}] ${e.message}`));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.keyboard.press('L');
  await page.waitForTimeout(900);

  const blindar = () =>
    page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      s.lives = 999;
      s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    });

  await blindar();
  await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.elapsed = 107;
    s.director.skipTo(107);
    s.aplicaCorredorEMoldura(107);
  });
  await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].elapsed >= 110.2, null, {
    timeout: 120000,
    polling: 16,
  });
  await blindar();

  // A variação entra ANTES do tiro: ela só é lida na ignição.
  await page.evaluate((v) => {
    window.__game.scene.getScenes(true)[0].esfincter.variante = v;
  }, chave);

  // Espera o gás ficar denso de verdade, em vez de chutar um instante.
  await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].esfincter?.denso === true, null, {
    timeout: 20000,
    polling: 40,
  });

  // Onde a criatura está no instante do tiro — é o centro do recorte com zoom. Lido do jogo, nunca
  // chutado: a parede é uma escada e ela persegue o meio das duas superfícies.
  const foco = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const p = s.terrain.props.getChildren().find((o) => o.active && o.getData('kind') === 'garganta');
    return p ? { x: p.x, y: p.y } : { x: 250, y: 108 };
  });

  await page.evaluate(() => window.__game.scene.getScenes(true)[0].matarGarganta());

  // ⚠️ A CONTAGEM É POR INSTANTE, e isto foi conserto: medida só no fim, ela dava zero em tudo e
  // parecia que o jorro nem existia — quando na verdade ele já tinha morrido. Um assert de instante
  // mente sobre uma coisa que passa. É a mesma lição da fresta, medida varrendo.
  const tiras = [];
  const contagens = [];
  let decorrido = 0;
  for (const [ms] of INSTANTES) {
    await page.waitForTimeout(ms - decorrido);
    decorrido = ms;
    tiras.push(await page.screenshot());
    contagens.push(
      await page.evaluate(() => {
        const s = window.__game.scene.getScenes(true)[0];
        const n = (nome) => s.children.list.filter((o) => o.name === nome).length;
        return `${n('f4Gore')}c/${n('f4Sangue')}g/${n('f4Respingo')}r/${n('f4Poca')}p`;
      }),
    );
  }
  console.log(rotulo.padEnd(38), contagens.join('  '));
  linhas.push({ rotulo, tiras, foco });
  await page.close();
}
await browser.close();

// ─── A MONTAGEM ─────────────────────────────────────────────────────────────
const PAD = 6;
const CABECA = 30;
const LARG = PAD + NA_CHEIA.length * (L + PAD);
const ALT = PAD + linhas.length * (CABECA + A + PAD);

const rotulo = (texto, tamanho, cor) =>
  Buffer.from(
    `<svg width="${LARG}" height="${CABECA}"><text x="8" y="21" font-family="monospace" font-size="${tamanho}" fill="${cor}">${texto}</text></svg>`,
  );

const pecas = [];
linhas.forEach((linha, li) => {
  const topo = PAD + li * (CABECA + A + PAD);
  const legenda = NA_CHEIA.map((k) => INSTANTES[k][1]).join('        ·        ');
  pecas.push({ input: rotulo(`${linha.rotulo}        ${legenda}`, 17, '#e8d6e4'), left: 0, top: topo });
  NA_CHEIA.forEach((k, i) => {
    pecas.push({ input: linha.tiras[k], left: PAD + i * (L + PAD), top: topo + CABECA });
  });
});

await sharp({
  create: { width: LARG, height: ALT, channels: 4, background: { r: 18, g: 14, b: 22, alpha: 1 } },
})
  .composite(pecas)
  .png()
  .toFile(saida);
console.log(saida);

// ─── A 2ª FOLHA: O ZOOM NA FERIDA ───────────────────────────────────────────
// ⚠️ A FOLHA CHEIA E A FOLHA COM ZOOM RESPONDEM PERGUNTAS DIFERENTES, e por isso são duas. A cheia
// diz se o estouro LÊ no quadro do jogo, que é onde ele joga; a com zoom diz se o pedaço tem forma,
// que é o que ele pediu para julgar (*"não se nota tanto os detalhes dos cacos"*). Julgar detalhe na
// folha cheia é julgar com a régua errada — e julgar leitura no zoom é pior ainda: tudo lê a 4x.
// ⚠️ A JANELA É DESLOCADA PARA A FRENTE (`ADIANTE`), não centrada na criatura. Tudo — cone, cacos e
// jorro — sai para a DIREITA, para dentro do núcleo; uma janela centrada no corpo gasta metade da
// largura mostrando a parede vazia de onde o estouro já saiu.
const ZOOM = 3;
const JAN_L = 330,
  JAN_A = 196,
  ADIANTE = 70;
const zoomSaida = saida.replace(/\.png$/, '-zoom.png');
const ZL = PAD + NO_ZOOM.length * (JAN_L * ZOOM + PAD);
const ZA = PAD + linhas.length * (CABECA + JAN_A * ZOOM + PAD);
const zpecas = [];
const zrotulo = (texto) =>
  Buffer.from(
    `<svg width="${ZL}" height="${CABECA}"><text x="8" y="21" font-family="monospace" font-size="17" fill="#e8d6e4">${texto}</text></svg>`,
  );
for (let li = 0; li < linhas.length; li++) {
  const linha = linhas[li];
  const topo = PAD + li * (CABECA + JAN_A * ZOOM + PAD);
  zpecas.push({ input: zrotulo(`${linha.rotulo}        ${NO_ZOOM.map((k) => INSTANTES[k][1]).join('            ·            ')}`), left: 0, top: topo });
  for (let i = 0; i < NO_ZOOM.length; i++) {
    // As tiras vêm em 768x432 (2x a resolução nativa); o foco vem em px de JOGO.
    const cx = Math.round((linha.foco.x + ADIANTE) * 2);
    const cy = Math.round(linha.foco.y * 2);
    const left = Math.max(0, Math.min(L - JAN_L, cx - Math.round(JAN_L / 2)));
    const top = Math.max(0, Math.min(A - JAN_A, cy - Math.round(JAN_A / 2)));
    zpecas.push({
      input: await sharp(linha.tiras[NO_ZOOM[i]])
        .extract({ left, top, width: JAN_L, height: JAN_A })
        .resize(JAN_L * ZOOM, JAN_A * ZOOM, { kernel: 'nearest' })
        .png()
        .toBuffer(),
      left: PAD + i * (JAN_L * ZOOM + PAD),
      top: topo + CABECA,
    });
  }
}
await sharp({ create: { width: ZL, height: ZA, channels: 4, background: { r: 18, g: 14, b: 22, alpha: 1 } } })
  .composite(zpecas)
  .png()
  .toFile(zoomSaida);
console.log(zoomSaida);
