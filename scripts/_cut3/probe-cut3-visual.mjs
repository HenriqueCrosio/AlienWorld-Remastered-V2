// A FATIA 6 na tela. Cobre a pintura, a fronteira com a Fase 4, a nadadeira, as carcaças e o
// portão. Roda UMA POR VEZ (três browsers no mesmo Vite quebram).
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
    ? { tex: g.texture.key, x: Math.round(g.x), topo: Math.round(g.y),
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
  ok(garg.x === 330, `centrada em x=330, cobrindo as janelas #4 e #5 (x=${garg.x})`);
  ok(garg.topo === 8, `ancorada pelo TOPO em y=8 (y=${garg.topo})`);
  // ⚠️ 1px de arte = 1px de jogo. Escala != 1 aqui e a peça inteira sai da grade.
  ok(garg.sx === 1 && garg.sy === 1, `desenhada em tamanho NATIVO (escala ${garg.sx}x${garg.sy})`);
  ok(garg.w >= 170 && garg.h >= 170, `no enquadramento aprovado, altura inteira (${garg.w}x${garg.h})`);
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

// ─── O PORTÃO: a saída morre, e a cicatriz FICA ───
//
// ⚠️ O COLAPSO NÃO ACONTECE SOZINHO. Ele só dispara depois de o jogador ESCOLHER uma nave no
// painel — uma sonda que apenas espera nunca vê o portão, e o assert ficaria falhando para
// sempre por um motivo que não é o defeito. A sonda tem de JOGAR a cena.
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

let port = null;
for (let i = 0; i < 40 && !port; i++) {
  port = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const p = s.children.list.filter((o) => o.name === 'portaoCut3')[0];
    return p ? { x: Math.round(p.x), alpha: +p.alpha.toFixed(2), depth: p.depth,
                 topo: Math.round(p.y - p.displayHeight), depthParede: 70 } : null;
  });
  if (!port) await page.waitForTimeout(300);
}
// ⚠️ ELE NASCE EM alpha=0 E ENTRA POR TWEEN de 260ms. Ler o alpha no instante em que o objeto
// aparece pega o portão NO MEIO DO FADE (0,32 numa execução) e reprova uma cena correta — o
// assert julga o estado FINAL, então a sonda espera o tween fechar.
if (port) {
  await page.waitForTimeout(500);
  port = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const p = s.children.list.filter((o) => o.name === 'portaoCut3')[0];
    return p ? { x: Math.round(p.x), alpha: +p.alpha.toFixed(2), depth: p.depth,
                 topo: Math.round(p.y - p.displayHeight), depthParede: 70 } : null;
  });
}
console.log('portao  ', JSON.stringify(port));
ok(!!port, 'o portao selou a saida');
if (port) {
  ok(port.x < 160, `e ele fecha a metade ESQUERDA, que e a boca (x=${port.x})`);
  ok(port.alpha === 1, 'ele esta solido, nao meio transparente');
  ok(port.depth > port.depthParede, `ele fica NA FRENTE da pintura (${port.depth} > ${port.depthParede}) — e a vista para fora que ele apaga`);
}

console.log('');
console.log(falhas ? `${falhas} FALHA(S)` : '✔ A FATIA 6 ESTA DE PE');
await browser.close();
process.exit(falhas ? 1 : 0);
