// A FATIA 6 na tela. Cobre a pintura, a fronteira com a Fase 4, a GARGANTA, as
// carcaças, o beat final e o entulho. Roda UMA POR VEZ (três browsers no mesmo Vite quebram).
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PAGINA] ${e.message}`));

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__game.scene.stop('Menu');
  window.__game.scene.start('Interlude3', { score: 4200, handling: 'diegetico', naveId: 'arauto' });
});
await page.waitForTimeout(1500);

const cena = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const acha = (n) => s.children.list.filter((o) => o.name === n);
    const p = acha('paredeCut3')[0];
    return {
      key: s.scene.key,
      parede: p ? { tex: p.texture.key, x: Math.round(p.x), y: Math.round(p.y), w: p.width, h: p.height } : null,
      // Quantas imagens ainda usam a arte da FASE 4 nesta cena.
      usamHangar: s.children.list.filter((o) => o.texture && o.texture.key === 'hangar').length,
    };
  });

const c = await cena();
console.log('cena  ', JSON.stringify(c));
ok(c.key === 'Interlude3', 'a cutscene 3 abriu');
ok(!!c.parede, 'a parede da cena existe e tem nome (paredeCut3)');
if (c.parede) {
  ok(c.parede.tex === 'paintBgCut3', `a parede e a PINTURA (${c.parede.tex})`);
  ok(c.parede.w === 384 && c.parede.h === 216, `em 384x216 (${c.parede.w}x${c.parede.h})`);
  ok(c.parede.x === 0 && c.parede.y === 0, `ancorada em 0,0 (${c.parede.x},${c.parede.y})`);
}
ok(c.usamHangar === 0, `nenhuma imagem da cena usa mais o 'hangar' da Fase 4 (${c.usamHangar})`);

// ─── A GARGANTA: ela EXISTE DESDE O PRIMEIRO QUADRO, e é um corpo na frente da parede ───
//
// ⚠️ O ASSERT DE "DESDE O PRIMEIRO QUADRO" É O CORAÇÃO DESTE BLOCO. O portão foi reprovado por
// SURGIR ("apenas surge um asset sem relação nenhuma com a arte"). A leitura acontece 1,5s depois
// do start da cena — antes da queda, antes da derrapagem, antes do painel. Se ela só nascesse no
// colapso, este assert seria o que pegaria.
const garg = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const g = s.children.list.filter((o) => o.name === 'gargantaCut3')[0];
  const p = s.children.list.filter((o) => o.name === 'paredeCut3')[0];
  return g
    ? { tex: g.texture.key, x: Math.round(g.x), pe: Math.round(g.y),
        topo: Math.round(g.y - g.displayHeight),
        esq: Math.round(g.x - g.displayWidth), dir: Math.round(g.x),
        w: g.width, h: g.height, sx: g.scaleX, sy: g.scaleY,
        depth: g.depth, depthParede: p ? p.depth : null,
        anim: g.anims && g.anims.currentAnim ? g.anims.currentAnim.key : null,
        tocando: !!(g.anims && g.anims.isPlaying) }
    : null;
});
console.log('garganta', JSON.stringify(garg));
ok(!!garg, 'a garganta esta em cena DESDE o comeco (nao surge no colapso, como o portao surgia)');
if (garg) {
  // ⚠️ A TEXTURA LIDA É A DO QUADRO CORRENTE, não a chave estática: ela está TOCANDO desde o
  // primeiro quadro, então o Phaser devolve `gargantaIdleAnim<n>`. O que este assert prova é que
  // a arte desenhada é da família da garganta — não um asteroide, não um portão.
  ok(/^garganta/.test(garg.tex), `ela usa a arte propria (${garg.tex})`);
  // ⚠️ A TRASEIRA ENCOSTA E É CORTADA pela borda direita — pedido do Henrique, 05/09: "não quero
  // sobras atrás" da boca por onde a nave passa. O centro é DERIVADO (384 − 122/2 + 14 = 337), então
  // o assert cobra o EFEITO (a peça passa da borda), não o número.
  ok(garg.dir > 384, `a traseira sai pela borda direita (vai ate x=${garg.dir}, a tela acaba em 384)`);
  ok(garg.dir - 384 < 25, `mas so LIGEIRAMENTE cortada (${garg.dir - 384}px fora da tela)`);
  // ⚠️ ELA VOLTOU A PISAR NO CONVES. Chegou a ir ate o fundo da tela (122x216) num teste, e o
  // Henrique preferiu a versao menor: 97x171, do topo da tela ao conves, com menos esticao.
  ok(garg.pe === 171, `ancorada pelo PE na linha do conves, DECK_Y=171 (y=${garg.pe})`);
  ok(garg.topo <= 0, `e sobe ate o topo do quadro (topo y=${garg.topo})`);
  // ⚠️ 1px de arte = 1px de jogo. Escala != 1 aqui e a peça inteira sai da grade — e é ESTE assert
  // que impede alguém de "resolver" o enquadramento com um setScale.
  ok(garg.sx === 1 && garg.sy === 1, `desenhada em tamanho NATIVO (escala ${garg.sx}x${garg.sy})`);
  // Ela tem que OCLUIR a janela #5 (336..376) — é isso que a põe DENTRO do hangar, na frente da
  // parede, em vez de colada nela.
  ok(garg.esq < 336 && garg.dir > 376, `oclui a janela #5 por inteiro (cobre x ${garg.esq}..${garg.dir})`);
  ok(garg.depth > garg.depthParede, `ela e um CORPO na frente da parede (${garg.depth} > ${garg.depthParede})`);
  ok(garg.depth < 80, `e atras da nave (${garg.depth} < 80)`);
  ok(garg.anim === 'garganta-idle' && garg.tocando, `ela RESPIRA desde o comeco (${garg.anim}, tocando=${garg.tocando})`);
}

// ⚠️ A NADADEIRA SAIU DA CENA EM 2026-09-05, e o bloco de assert dela saiu junto. Ela passou por
// três versões (arte original, arte refeita com o leviathan-swim-sheet, movimento por pivô) e as
// três foram reprovadas pelo Henrique jogando. O veredicto foi de ESCOPO: uma peça que só aparece
// por um buraco de 116x89 durante 4s não paga três idas ao gerador.

// ─── AS 17 LÂMPADAS: elas JÁ ESTÃO PINTADAS, e o que entra é intensidade ───
//
// ⚠️ "Fazer as luzes piscarem" não é arte nova nesta cena. As 17 estão dentro do
// `paint-bg-cut3.png` (186 pixels no total, medidos por `_medir-lampadas.mjs`): o código só põe
// brilho ADITIVO em cima delas, cada um na COR PRÓPRIA daquela lâmpada. Nada muda de cor.
const luz1 = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const ls = s.children.list.filter((o) => o.name === 'lampadaCut3');
  const p = s.children.list.filter((o) => o.name === 'paredeCut3')[0];
  const g = s.children.list.filter((o) => o.name === 'gargantaCut3')[0];
  return {
    n: ls.length,
    cores: [...new Set(ls.map((o) => o.fillColor))].length,
    depth: ls.length ? ls[0].depth : null,
    depthParede: p ? p.depth : null,
    depthGarganta: g ? g.depth : null,
    alphas: ls.map((o) => +o.alpha.toFixed(3)),
    faiscas: s.children.list.filter((o) => o.name === 'faiscaCut3').length,
  };
});
console.log('luzes   ', JSON.stringify({ ...luz1, alphas: `${luz1.alphas.length} valores` }));
ok(luz1.n === 17, `as 17 lampadas pintadas ganharam brilho (${luz1.n})`);
ok(luz1.cores >= 10, `cada uma na COR PROPRIA dela, nao numa cor so (${luz1.cores} cores distintas)`);
ok(luz1.depth > luz1.depthParede, `o brilho fica acima da pintura (${luz1.depth} > ${luz1.depthParede})`);
ok(luz1.depth < luz1.depthGarganta,
   `e ABAIXO da garganta (${luz1.depth} < ${luz1.depthGarganta}) — as que caem atras dela somem sozinhas`);
ok(new Set(luz1.alphas).size > 6, `elas respiram fora de fase umas das outras (${new Set(luz1.alphas).size} alphas distintos)`);
ok(luz1.faiscas === 3, `os 3 emissores de faisca estao nas juncoes (${luz1.faiscas})`);

// ⚠️ O DETERMINISMO, PROVADO. Fase e semente são derivadas do índice; um `Math.random()` por
// quadro faria a sonda comparar duas cenas diferentes. Chamando `pulsarLampadas()` de novo no
// MESMO tick (o `this.t` não avançou), a lista de alphas tem que sair idêntica.
const det = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const ler = () => s.children.list.filter((o) => o.name === 'lampadaCut3').map((o) => +o.alpha.toFixed(6));
  const a = ler();
  s.pulsarLampadas();
  const b = ler();
  return { igual: a.length === b.length && a.every((v, i) => v === b[i]) };
});
ok(det.igual, 'o pulso e DERIVADO do tempo, nunca sorteado (duas leituras no mesmo tick batem)');

// ─── AS CARCAÇAS: plantadas, não enfileiradas, e fora do vão onde a nave para ───
const carc = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const cs = s.children.list.filter((o) => o.name === 'carcacaCut3');
  const so = s.children.list.filter((o) => o.name === 'sombraCarcaca');
  return {
    n: cs.length,
    sombras: so.length,
    pes: cs.map((o) => Math.round(o.y)),
    xs: cs.map((o) => Math.round(o.x)),
    depths: cs.map((o) => +o.depth.toFixed(3)),
    topos: cs.map((o) => Math.round(o.y - o.displayHeight)),
  };
});
console.log('carcacas', JSON.stringify(carc));
// ⚠️ DUAS, NÃO TRÊS, DESDE 2026-09-04. A terceira ficava atrás da garganta — ver o comentário em
// Interlude3Scene.plantarCarcacas().
ok(carc.n >= 2, `ha carcacas no conves (${carc.n})`);
ok(carc.sombras === carc.n, `uma sombra por carcaca (${carc.sombras}/${carc.n})`);
ok(new Set(carc.pes).size > 1, `elas NAO estao todas no mesmo y (${carc.pes.join(',')})`);
// ⚠️ A nave derrapa e PARA em x≈258, um vão escolhido a dedo na revisão de 2026-07-19 para ela
// não sumir dentro do metal cinza. Plantar uma carcaça ali refaria aquele defeito.
ok(carc.xs.every((x) => Math.abs(x - 258) > 40), `nenhuma carcaca no vao de parada da nave (${carc.xs.join(',')})`);
// ⚠️ E NENHUMA PODE SUBIR ATE AS JANELAS (o alpha da pintura acaba em y=132). Elas taparem a
// faixa das janelas apagaria a NADADEIRA, que so existe na tela pelo que as janelas deixam ver.
ok(carc.topos.every((t) => t > 132), `nenhuma carcaca invade a faixa das janelas (topos ${carc.topos.join(',')} > 132)`);

// ─── A SONDA TEM DE JOGAR A CENA ───
//
// ⚠️ O COLAPSO NÃO ACONTECE SOZINHO. Ele só dispara depois de o jogador ESCOLHER uma nave no
// painel — uma sonda que apenas espera nunca chega ao beat final, e os asserts ficariam falhando
// para sempre por um motivo que não é o defeito.
//
// ⚠️ E A ESPERA É PELO ESTADO, NÃO PELO RELÓGIO. O painel abre por volta de t≈10,5s, mas isso
// depende da derrapagem; espera cega em sonda é a receita de falha intermitente.
let painel = false;
for (let i = 0; i < 60 && !painel; i++) {
  painel = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return s.panel ? 'aberto' : false;
  });
  if (!painel) await page.waitForTimeout(400);
}
ok(!!painel, 'o painel de naves abriu (a sonda precisa dele para chegar ao colapso)');

await page.keyboard.press('8');
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.press('Enter');

// ─── O BEAT FINAL: o tiro, a morte, a cadeia invertida e a nave engolida ───
//
// ⚠️ A CORRENTE CAUSAL É O QUE ESTÁ SENDO PROVADO AQUI. O portão falhou por não ter causa: o
// entulho caía porque um banner dizia que estava caindo. Agora o jogador ATIRA, a criatura
// EXPLODE, e é a explosão dela que derruba o teto. Cada assert abaixo é um elo dessa corrente.

// 1. O TORPEDO. ⚠️ Ele NÃO pode ser o `bolt2` tingido — é o padrão que o Henrique já reprovou
// duas vezes ("um tiro magenta igual, sem característica nenhuma"), o mesmo defeito anotado em
// BossCapitania.ts:578. O assert cobra a TEXTURA PRÓPRIA, que é o que estava faltando.
let torp = null;
for (let i = 0; i < 60 && !torp; i++) {
  torp = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const t = s.children.list.filter((o) => o.name === 'torpedoCut3')[0];
    return t ? { tex: t.texture.key, x: Math.round(t.x) } : null;
  });
  if (!torp) await page.waitForTimeout(100);
}
console.log('torpedo ', JSON.stringify(torp));
ok(!!torp, 'a nave DISPARA no beat final');
if (torp) ok(torp.tex === 'torpedoCut3', `e o projetil tem forma PROPRIA, nao e o bolt2 tingido (${torp.tex})`);

// 2. A MORTE. A criatura reage ao tiro — é ela a causa do colapso.
let morte = null;
for (let i = 0; i < 40 && !morte; i++) {
  morte = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const g = s.children.list.filter((o) => o.name === 'gargantaCut3')[0];
    return g && g.anims && g.anims.currentAnim && g.anims.currentAnim.key === 'garganta-morte'
      ? { anim: g.anims.currentAnim.key }
      : null;
  });
  if (!morte) await page.waitForTimeout(120);
}
ok(!!morte, 'a garganta entra em garganta-morte quando o torpedo acerta');

// 3. A CADEIA NASCE NELA E CORRE PARA A ESQUERDA. ⚠️ A 1ª volta sorteava o x de cada estouro
// (`Phaser.Math.Between(8, 130)`) — uma cena que não se reproduz não se fotografa. Agora os 10 x
// são DERIVADOS do índice, e a sonda lê a lista inteira.
const cad = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.cadeiaX && s.cadeiaX.length ? s.cadeiaX : null;
});
console.log('cadeia  ', JSON.stringify(cad));
ok(Array.isArray(cad) && cad.length === 10, `a cadeia tem 10 estouros (${cad ? cad.length : 'nenhum'})`);
if (Array.isArray(cad) && cad.length === 10) {
  ok(cad[0] > 300, `ela NASCE na BOCA da garganta, a direita (x=${cad[0]})`);
  ok(cad[cad.length - 1] < 20, `e morre na boca por onde a nave entrou, a esquerda (x=${cad[cad.length - 1]})`);
  ok(cad.every((x, i) => i === 0 || x < cad[i - 1]), `e corre sempre para a ESQUERDA (${cad.join(',')})`);
}

// 4. A NAVE SOME DENTRO DA BOCA. ⚠️ Ela não escapa pela borda — ela vai MAIS PARA DENTRO, que é a
// história desta cutscene, e a Fase 4 começa exatamente onde ela sumiu.
//
// ⚠️ E ELA VIAJA EM TAMANHO CHEIO — REGRA DA CENA (Henrique, 05/09): "ela precisa entrar na boca da
// criatura com o MESMO TAMANHO e somente ficar pequena nos milissegundos finais". A versão antiga
// levava posição, escala e alpha no MESMO tween de 1.400ms, e ela encolhia a viagem inteira: o que
// se lia era uma nave se AFASTANDO, não sendo engolida. Este assert amostra o MEIO do caminho —
// se alguém juntar os dois tweens de novo, ele cai.
let meio = null;
for (let i = 0; i < 80 && !meio; i++) {
  meio = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    // o meio da viagem: já saiu do ponto de tiro (200) e ainda não chegou na boca (330)
    return s.ship && s.ship.x > 240 && s.ship.x < 310
      ? { x: Math.round(s.ship.x), escala: +s.ship.scaleX.toFixed(2), alpha: +s.ship.alpha.toFixed(2) }
      : null;
  });
  if (!meio) await page.waitForTimeout(30);
}
console.log('nave-meio', JSON.stringify(meio));
ok(!!meio, 'a nave e vista a caminho da boca');
if (meio) {
  ok(meio.escala === 1, `no MEIO do caminho ela ainda esta em tamanho CHEIO (x=${meio.x}, escala ${meio.escala})`);
  ok(meio.alpha === 1, `e ainda opaca (alpha ${meio.alpha})`);
}

// ⚠️ A ESPERA É PELO ESTADO, NÃO PELO RELÓGIO — e isto custou uma execução em 05/09. O bloco do
// entulho esperava 1.800ms cegos depois de 2.400ms cegos; quando os asserts do meio da viagem
// entraram e gastaram mais relógio, a soma passou dos 5.600ms do `avancar()`, a cena virou a Fase
// 4 e o entulho leu ZERO. Não era defeito da cena, era a sonda chegando atrasada.
let fim = null;
for (let i = 0; i < 80 && !fim; i++) {
  fim = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.scene.key !== 'Interlude3' || !s.ship) return null;
    return s.ship.alpha <= 0.1
      ? { x: Math.round(s.ship.x), y: Math.round(s.ship.y),
          escala: +s.ship.scaleX.toFixed(2), alpha: +s.ship.alpha.toFixed(2) }
      : null;
  });
  if (!fim) await page.waitForTimeout(60);
}
console.log('nave-fim', JSON.stringify(fim));
ok(!!fim, 'a nave ainda existe no fim do beat');

// ⚠️ E ELA PASSOU COM A BOCA AINDA ABERTA — pedido do Henrique, 05/09: "quero que a nave passe
// antes da criatura fechar a boca". A abertura da goela mede 84px de altura nos quadros 1-3 da
// morte e despenca para 28px no quadro 8: é ali que ela fecha. A leitura acima acontece no
// instante em que a nave apaga, e este assert diz em que quadro da morte isso caiu.
if (fim) {
  const q = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const g = s.children.list.filter((o) => o.name === 'gargantaCut3')[0];
    return g && g.anims && g.anims.currentFrame ? g.anims.currentFrame.index : null;
  });
  console.log('quadro-da-morte-quando-a-nave-some', q);
  ok(q !== null && q < 9, `ela passou com a boca ABERTA (quadro ${q} da morte; a boca fecha no 8, indice 9)`);
}
if (fim) {
  ok(Math.abs(fim.x - 333) < 12, `ela some DENTRO da BOCA (x=${fim.x}, boca em 333), nao pela borda da tela`);
  ok(fim.escala <= 0.3, `encolhendo (escala ${fim.escala})`);
  ok(fim.alpha <= 0.1, `e apagando (alpha ${fim.alpha})`);
}

// ─── OS DESTROÇOS: peças da frota, não pedras genéricas, nas 9 posições MEDIDAS ───
//
// ⚠️ AS 9 POSIÇÕES NÃO MUDAM. Elas foram medidas na 1ª volta e a sonda fotografa a cena: posição
// sorteada quebra a reprodutibilidade. O que inverteu foi a ORDEM DE QUEDA.
// ⚠️ E ELES NÃO PODEM MAIS SER `asteroid` TINGIDO. A cor mora no ARQUIVO (ver _paleta.mjs) —
// `setTint` multiplicaria a peça inteira por uma cor só e apagaria a única luz que ela tem.
// ⚠️ Espera pelas 9 PEÇAS, não por um relógio (ver o comentário do bloco da nave).
const lerEnt = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.scene.key !== 'Interlude3') return { n: -1, texs: [], tingidos: 0, escalas: [], xs: [] };
    const es = s.children.list.filter((o) => o.name === 'entulhoCut3');
    return {
      n: es.length,
      texs: [...new Set(es.map((o) => o.texture.key))].sort(),
      tingidos: es.filter((o) => o.isTinted).length,
      escalas: [...new Set(es.map((o) => +o.scaleX.toFixed(2)))],
      xs: es.map((o) => Math.round(o.x)),
    };
  });

let ent = await lerEnt();
for (let i = 0; i < 80 && ent.n !== 9; i++) {
  await page.waitForTimeout(60);
  ent = await lerEnt();
}
if (ent.n === -1) console.log('[AVISO] a cena ja avancou para a Fase 4 antes de o entulho ser lido');
console.log('entulho ', JSON.stringify(ent));
ok(ent.n === 9, `as 9 pecas de entulho cairam (${ent.n})`);
ok(ent.texs.length === 4 && ent.texs.every((t) => t.startsWith('entulho')),
   `as 4 pecas biomecanicas novas entraram, nenhum asteroide (${ent.texs.join(',')})`);
ok(ent.tingidos === 0, `nenhuma peca depende de setTint — a cor esta no arquivo (${ent.tingidos} tingidas)`);
ok(ent.escalas.length === 1 && ent.escalas[0] === 1, `desenhadas em tamanho NATIVO (escalas ${ent.escalas.join(',')})`);
ok(ent.xs.every((x) => x < 140), `e todas muram a metade ESQUERDA, que e a boca (${ent.xs.join(',')})`);

console.log('');
console.log(falhas ? `${falhas} FALHA(S)` : '✔ A FATIA 6 ESTA DE PE');
await browser.close();
process.exit(falhas ? 1 : 0);
