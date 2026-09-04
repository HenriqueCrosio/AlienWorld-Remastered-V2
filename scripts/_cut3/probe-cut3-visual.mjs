// A FATIA 6 na tela. Cobre a pintura, a fronteira com a Fase 4, a GARGANTA, a nadadeira, as
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
        esq: Math.round(g.x - g.displayWidth / 2), dir: Math.round(g.x + g.displayWidth / 2),
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
  ok(garg.x === 330, `centrada em x=330 (x=${garg.x})`);
  // ⚠️ ANCORADA PELO PÉ na linha do convés. DECK_Y=171 é MEDIDO na pintura; a altura da criatura é
  // o que o arquivo tiver. Cobrar o topo seria cobrar a altura do PNG, não a posição da peça.
  ok(garg.pe === 171, `pisando no conves, ancorada pelo PE em DECK_Y=171 (y=${garg.pe})`);
  // ⚠️ 1px de arte = 1px de jogo. Escala != 1 aqui e a peça inteira sai da grade — e é ESTE assert
  // que impede alguém de "resolver" o enquadramento com um setScale.
  ok(garg.sx === 1 && garg.sy === 1, `desenhada em tamanho NATIVO (escala ${garg.sx}x${garg.sy})`);
  // Ela tem que OCLUIR a janela #5 (336..376) — é isso que a põe DENTRO do hangar, na frente da
  // parede, em vez de colada nela.
  ok(garg.esq < 336 && garg.dir > 376, `oclui a janela #5 por inteiro (cobre x ${garg.esq}..${garg.dir})`);
  ok(garg.topo < 132, `e sobe ate a faixa das janelas (topo y=${garg.topo} < 132)`);
  ok(garg.depth > garg.depthParede, `ela e um CORPO na frente da parede (${garg.depth} > ${garg.depthParede})`);
  ok(garg.depth < 80, `e atras da nave (${garg.depth} < 80)`);
  ok(garg.anim === 'garganta-idle' && garg.tocando, `ela RESPIRA desde o comeco (${garg.anim}, tocando=${garg.tocando})`);
}

// ─── A NADADEIRA: uma remada só, da DIREITA para a ESQUERDA, e só o `x` se mexe ───
//
// ⚠️ O ASSERT COBRA A DIREÇÃO QUE O DESENHO EXIGE, NÃO A QUE O CÓDIGO ESCOLHEU. O assert do rabo
// cobrava `x2 < x1` e ficou VERDE em cima da versão que o Henrique reprovou, porque media a
// escolha de quem o escreveu. Aqui a direita→esquerda foi derivada da Fase 3 (o corpo do Leviatã
// está fora do quadro à direita, ele nada para a direita, a remada de força varre para trás) e
// CONFIRMADA por ele antes de uma linha ser escrita.
const nad = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const n = s.children.list.filter((o) => o.name === 'nadadeiraCut3')[0];
    const p = s.children.list.filter((o) => o.name === 'paredeCut3')[0];
    return n
      ? { x: Math.round(n.x), y: Math.round(n.y), ang: Math.round(n.angle),
          alpha: +n.alpha.toFixed(2), depth: n.depth, depthParede: p ? p.depth : null }
      : null;
  });

let a = null;
for (let i = 0; i < 60 && !a; i++) { a = await nad(); if (!a) await page.waitForTimeout(200); }
ok(!!a, 'a nadadeira entra em cena');
if (a) {
  await page.waitForTimeout(1500);
  const b = await nad();
  console.log('nadadeira', JSON.stringify(a), '->', JSON.stringify(b));
  ok(!!b, 'ela ainda esta na tela 1,5s depois (a remada e lenta)');
  if (b) {
    ok(b.x < a.x, `ela varre da DIREITA para a ESQUERDA (${a.x} -> ${b.x})`);
    ok(b.y === a.y, `sem eixo Y — a saida e uma linha so (${a.y} -> ${b.y})`);
    ok(b.ang === a.ang, `sem giro (${a.ang}deg)`);
    ok(b.alpha === a.alpha && b.alpha === 1, `sem fade: alpha fica em 1 (${a.alpha} -> ${b.alpha})`);
    ok(b.depth < b.depthParede, `ela fica ATRAS da pintura (${b.depth} < ${b.depthParede}), entao so aparece pelas janelas`);
  }
}

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
  ok(cad[0] > 300, `ela NASCE na garganta, a direita (x=${cad[0]})`);
  ok(cad[cad.length - 1] < 20, `e morre na boca por onde a nave entrou, a esquerda (x=${cad[cad.length - 1]})`);
  ok(cad.every((x, i) => i === 0 || x < cad[i - 1]), `e corre sempre para a ESQUERDA (${cad.join(',')})`);
}

// 4. A NAVE SOME DENTRO DA BOCA. ⚠️ Ela não escapa pela borda — ela vai MAIS PARA DENTRO, que é a
// história desta cutscene, e a Fase 4 começa exatamente onde ela sumiu.
await page.waitForTimeout(2400);
const fim = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.ship
    ? { x: Math.round(s.ship.x), y: Math.round(s.ship.y),
        escala: +s.ship.scaleX.toFixed(2), alpha: +s.ship.alpha.toFixed(2) }
    : null;
});
console.log('nave-fim', JSON.stringify(fim));
ok(!!fim, 'a nave ainda existe no fim do beat');
if (fim) {
  ok(Math.abs(fim.x - 330) < 12, `ela some DENTRO da boca (x=${fim.x}, boca em 330), nao pela borda da tela`);
  ok(fim.escala <= 0.3, `encolhendo (escala ${fim.escala})`);
  ok(fim.alpha <= 0.1, `e apagando (alpha ${fim.alpha})`);
}

console.log('');
console.log(falhas ? `${falhas} FALHA(S)` : '✔ A FATIA 6 ESTA DE PE');
await browser.close();
process.exit(falhas ? 1 : 0);
