// A SONDA DO ESFÍNCTER (Fatia 7 · M4, a última peça da fatia).
//
// O que só se vê rodando: se a criatura nasce com a ARTE dela (e não a textura de erro do
// Phaser), se ela tapa o vão, se o gás VAZANDO não acende e o DENSO acende, e se a passagem fica
// aberta depois.
//
// ⚠️ CADA "NÃO ACONTECEU NADA" LEVA O PAR QUE PROVA QUE O TESTE SABE FALHAR. Foi o aviso mais
// caro da sessão das portas: o assert *"a nave atravessa a lasca sem dano"* passou sozinho
// (50 → 50) e quase foi dado como prova; com o discriminador do lado ele começou a FALHAR
// (50 → 49), porque a nave parada no meio do duto leva de onda, de bala e de parede.
//
// ⚠️ Exige `npm run dev` rodando. UMA sonda por vez: dois browsers headless no mesmo Vite quebram.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(1200);

const blindar = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 99;
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  });
const salta = (t) =>
  page.evaluate((t) => {
    const s = window.__game.scene.getScenes(true)[0];
    s.elapsed = t;
    s.director.skipTo(t);
    s.aplicaCorredorEMoldura(t);
  }, t);
const ate = (t) =>
  page.waitForFunction((a) => window.__game.scene.getScenes(true)[0].elapsed >= a, t, {
    timeout: 120000,
    polling: 16,
  });

const ler = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const p = s.terrain.props
      .getChildren()
      .find((o) => o.active && o.getData('kind') === 'garganta');
    if (!p) return null;
    const faixa = s.children.list.find((o) => o.name === 'faixaChao' || o.name === 'faixaTeto');
    const vao = s.moldura.vaoEm(p.x);
    const chao = s.moldura.superficieChaoEm(p.x);
    const teto = s.moldura.superficieTetoEm(p.x);
    const cano = s.children.list.find((o) => o.name === 'f4Cano');
    return {
      tex: p.texture.key,
      anim: p.anims?.currentAnim?.key ?? null,
      escala: p.scaleX,
      dims: `${p.width}x${p.height}`,
      hpInfinito: p.getData('hp') === Infinity,
      inerte: p.getData('inerte') === true,
      solido: s.terrain.constructor.solido(p),
      depth: p.depth,
      faixaDepth: faixa?.depth ?? null,
      // Sobra = quanto da peça passa da borda do corredor. Negativo = FRESTA por onde contornar.
      sobraCima: Math.round(p.y - p.displayHeight / 2 - teto) * -1,
      sobraBaixo: Math.round(chao - (p.y + p.displayHeight / 2)) * -1,
      // ⚠️ CENTRADA ENTRE AS DUAS SUPERFÍCIES, NÃO NO `vaoEm`. O corredor é assimétrico em volta
      // da linha nominal (a `Moldura` soma relevos diferentes às duas bandas), e esta peça não tem
      // folga para absorver isso. Ver o `meioEm` do `Esfincter`.
      centrada: Math.abs(Math.round(p.y - (teto + chao) / 2)) <= 1,
      desvioDoNominal: Math.round(p.y - vao),
      gas: s.children.list.filter((o) => o.name === 'f4Gas').length,
      canoY: cano ? Math.round(cano.y) : null,
      canoDims: cano ? `${cano.width}x${cano.height}` : null,
      canoEscala: cano ? cano.scaleX : null,
      tetoY: Math.round(teto),
      denso: s.esfincter?.denso === true,
    };
  });

await blindar();
await salta(107);
await ate(110.5);
await blindar();

const viva = await ler();
console.log('garganta ', JSON.stringify(viva));
ok(viva !== null, 'a garganta nasce na soleira');

if (viva) {
  // ⚠️ DUAS CHAVES VÁLIDAS: ela RESPIRA, e um sprite tocando animação reporta a textura da FOLHA,
  // não a da peça parada. É a mesma frouxidão medida que a porta levou em 20/09.
  ok(
    viva.tex === 'garganta' || viva.tex === 'gargantaVivaSheet',
    `a garganta não usa a textura de erro — carrega a arte dela (${viva.tex})`,
  );
  // ⚠️ `garganta-viva`, NÃO `garganta-idle`: a folha com o teto de brilho. Se este assert virar
  // `garganta-idle`, o estouro de branco do gerador voltou para dentro do duto.
  ok(viva.anim === 'garganta-viva', `ela RESPIRA, na folha corrigida (anim=${viva.anim})`);
  ok(viva.escala === 1, `entra em escala 1, nunca esticada (${viva.escala})`);
  ok(viva.dims === '97x171', `as dimensões batem com a arte — 97×171 (${viva.dims})`);
  // ⚠️ `=== Infinity` LIDO DENTRO DA PÁGINA, não `!isFinite` do lado de cá: `Infinity` vira `null`
  // ao cruzar o JSON, e `null` também não é finito — o assert antigo passaria com o `hp` AUSENTE.
  ok(viva.hpInfinito, 'bala não a fere: o hp dela é Infinity');
  ok(
    viva.centrada,
    `ela fica centrada ENTRE AS DUAS SUPERFÍCIES (${viva.desvioDoNominal}px longe da linha nominal)`,
  );
  // ⭐ O DISCRIMINADOR DESTE PAR, e ele precisou de DUAS voltas para ficar honesto.
  //
  // Sem ele, o assert acima passaria de graça mesmo usando o `vaoEm` — e o defeito que ele existe
  // para pegar (7px de fresta em cima) voltaria sem ninguém notar.
  //
  // ⚠️ A 1ª versão media UM ponto e falhou dizendo "1px de diferença": a assimetria NÃO é
  // constante, ela varia placa a placa com o relevo. Um ponto não prova nada sobre uma curva.
  // Agora ele varre o duto e cobra o PIOR ponto.
  const assimetria = await page.evaluate(() => {
    const m = window.__game.scene.getScenes(true)[0].moldura;
    let pior = 0;
    for (let x = 0; x <= 384; x += 8) {
      const d = Math.abs(m.vaoEm(x) - (m.superficieTetoEm(x) + m.superficieChaoEm(x)) / 2);
      if (d > pior) pior = d;
    }
    return Math.round(pior);
  });
  ok(
    assimetria >= 3,
    `⭐ e os dois centros REALMENTE não são o mesmo ponto: o corredor chega a ${assimetria}px de ` +
      `assimetria ao longo da tela (medido nas 49 colunas)`,
  );
  ok(
    viva.faixaDepth !== null && viva.depth < viva.faixaDepth,
    `⭐ as pontas dela ficam ATRÁS da borda (peça ${viva.depth} < faixa ${viva.faixaDepth})`,
  );
  ok(
    viva.sobraCima >= 0 && viva.sobraBaixo >= 0,
    `ela TAPA o vão, sem fresta (sobra ${viva.sobraCima}px em cima, ${viva.sobraBaixo}px embaixo)`,
  );
  ok(viva.gas === 1, 'a nuvem de gás está plantada');
  // ⚠️ AS MANGUEIRAS PENDURAM NA PAREDE, não no topo da criatura. Deduzi-las do sprite dela as
  // fazia flutuar a meio corredor — o defeito das passarelas de 13/09.
  //
  // ⚠️ E A PLACA FICA ENTERRADA, NÃO ENCOSTADA. Pedido dele em 21/09; encostada na linha da
  // superfície ela lia como POUSADA. O assert cobre os dois erros de uma vez: flutuar (y maior que
  // o teto) e encostar (y igual ao teto). Só o intervalo enterrado passa.
  ok(
    viva.canoY !== null && viva.tetoY - viva.canoY >= 2 && viva.tetoY - viva.canoY <= 10,
    `as mangueiras ficam ENTERRADAS no teto, nem flutuando nem pousadas ` +
      `(${viva.tetoY - viva.canoY}px dentro da parede)`,
  );
  ok(
    viva.canoDims === '32x44',
    `as mangueiras são a peça REDUZIDA pela metade, em escala 1 (${viva.canoDims})`,
  );
  ok(!viva.solido || !viva.inerte, 'ela nasce SÓLIDA — quem não atira, bate nela');
}

// ─── PAR 1: tiro na nuvem VAZANDO não acende · tiro na DENSA acende ───
const vazando = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { denso: s.esfincter?.denso === true, acendeu: s.esfincter?.acender() === true };
});
ok(
  !vazando.denso && !vazando.acendeu,
  'tiro na nuvem VAZANDO não acende — a espera existe de verdade',
);

// ⭐ O DISCRIMINADOR. Sem ele o assert acima passaria mesmo se a zona nunca ficasse densa, ou se
// `acender()` estivesse quebrado e devolvesse `false` para sempre.
await page.waitForFunction(
  () => window.__game.scene.getScenes(true)[0].esfincter?.denso === true,
  null,
  { timeout: 20000, polling: 40 },
);
ok(true, '⭐ DISCRIMINADOR: a nuvem CHEGA a densa — o `false` acima era a espera, não um defeito');

const aceso = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const antes = s.score;
  s.matarGarganta();
  const p = s.terrain.props.getChildren().find((o) => o.getData('kind') === 'garganta');
  return {
    inerte: p?.getData('inerte') === true,
    solido: s.terrain.constructor.solido(p),
    anim: p?.anims?.currentAnim?.key ?? null,
    ponto: s.score - antes,
    cone: s.children.list.filter((o) => o.name === 'f4Cone').length,
    gore: s.children.list.filter((o) => o.name === 'f4Gore').length,
    gas: s.children.list.filter((o) => o.name === 'f4Gas').length,
    cano: s.children.list.filter((o) => o.name === 'f4Cano').length,
  };
});
console.log('ignição  ', JSON.stringify(aceso));
ok(aceso.inerte, 'a ignição abre a passagem NA HORA — a criatura vira inerte');
ok(!aceso.solido, '⭐ e o `solido` concorda: a nave atravessa a carcaça');
ok(aceso.anim === 'garganta-morta', `ela toca a morte CORRIGIDA (anim=${aceso.anim})`);
ok(aceso.ponto === 400, `o ponto é agora, não no fim da animação (${aceso.ponto})`);
ok(aceso.cone === 1, 'o cone entrou');
ok(aceso.gore === 14, `o gore partiu (${aceso.gore} pedaços)`);
ok(aceso.gas === 0, 'a nuvem SOME na ignição — gás que segue vazando é gás que não pegou fogo');
ok(aceso.cano === 1, 'o cano FICA: ele não estourou, o que queimou foi o gás que saiu dele');

// ─── PAR 2: acender duas vezes não dobra o estouro ───
const dobro = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const antes = s.score;
  s.matarGarganta();
  return { ponto: s.score - antes, gore: s.children.list.filter((o) => o.name === 'f4Gore').length };
});
ok(dobro.ponto === 0, `a 2ª ignição não pontua de novo (${dobro.ponto})`);
ok(dobro.gore <= 14, `nem cospe gore duas vezes (${dobro.gore})`);

// ─── O CHEFÃO ESPERA ───
const roteiro = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const script = s.director.stage?.script ?? s.director.script ?? [];
  const boss = script.find((e) => e.type === 'boss');
  const garganta = script.find((e) => e.type === 'garganta');
  return { boss: boss?.t ?? null, garganta: garganta?.t ?? null };
});
console.log('roteiro  ', JSON.stringify(roteiro));
ok(roteiro.garganta === 110, `o esfíncter chega em t=110 (${roteiro.garganta})`);
ok(
  roteiro.boss !== null && roteiro.boss - roteiro.garganta >= 5,
  `⭐ o chefão espera a cena: ${roteiro.boss} − ${roteiro.garganta} = ${roteiro.boss - roteiro.garganta}s`,
);

await browser.close();
console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
