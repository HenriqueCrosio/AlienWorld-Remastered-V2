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
import sharp from 'sharp';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

// ─── A TINTA CUMPRE O CONTRATO DA LINHA DE IMPACTO ───────────────────────────
//
// ⚠️ ESTE ASSERT É A LIÇÃO MAIS CARA DE 22/09. O `Esfincter` promete que a linha 4 da arte é a que
// encosta na parede; a sonda media a ÂNCORA contra a superfície, achava 1px de desvio e aprovava —
// enquanto a massa da mancha nascia 12 a 18px dentro do corredor, porque a arte tinha margem vazia
// em cima. **A régua estava certa e a peça estava errada: eu media o ponto de origem, não o sangue.**
//
// Aqui a régua é a TINTA: a linha mais cheia de cada quadro tem de cair na linha do contrato.
const IMPACTO = 4;
for (const [arte, cel] of [
  ['public/sprites/f4-respingo-sheet.png', 44],
  ['public/sprites/f4-poca.png', 80],
]) {
  const { data, info } = await sharp(arte).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const quadros = Math.round(info.width / cel);
  let piorTopo = 0;
  let piorMassa = 0;
  for (let q = 0; q < quadros; q++) {
    const linhas = [];
    for (let y = 0; y < info.height; y++) {
      let n = 0;
      for (let x = q * cel; x < (q + 1) * cel; x++) if (data[(y * info.width + x) * 4 + 3] > 40) n++;
      linhas.push(n);
    }
    // ⚠️ DUAS RÉGUAS, E A PRIMEIRA É A QUE IMPORTA. A tinta tem de COMEÇAR na linha do impacto ou
    // acima dela — é isso que faz a mancha tocar a parede em vez de pairar. A 2ª só impede que o
    // corpo desça demais: as escorridas podem ir longe, o BORRÃO não.
    piorTopo = Math.max(piorTopo, linhas.findIndex((n) => n > 0) - IMPACTO);
    piorMassa = Math.max(piorMassa, linhas.indexOf(Math.max(...linhas)) - IMPACTO);
  }
  const nome = arte.split('/').pop();
  ok(piorTopo <= 0, `⭐ a tinta de ${nome} ALCANÇA a linha do impacto (sobra ${piorTopo}px em ${quadros} quadros)`);
  ok(piorMassa <= 6, `e o borrão não desce para longe dela (${piorMassa}px abaixo)`);
}

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
      // ⚠️ O TETO NA COLUNA DELA, NÃO NA DA CRIATURA. A 1ª versão media o teto em `p.x` e acusava
      // 13px de enterro numa peça posta a 5 — as mangueiras ficam 62px à frente, e a parede é uma
      // ESCADA de placas de 128px: duas colunas distantes têm superfícies diferentes.
      canoTetoY: cano ? Math.round(s.moldura.superficieTetoEm(cano.x)) : null,
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
  ok(viva.gas === 1, 'a nuvem de gás está plantada');
  // ⚠️ AS MANGUEIRAS PENDURAM NA PAREDE, não no topo da criatura. Deduzi-las do sprite dela as
  // fazia flutuar a meio corredor — o defeito das passarelas de 13/09.
  //
  // ⚠️ E A PLACA FICA ENTERRADA, NÃO ENCOSTADA. Pedido dele em 21/09; encostada na linha da
  // superfície ela lia como POUSADA. O assert cobre os dois erros de uma vez: flutuar (y maior que
  // o teto) e encostar (y igual ao teto). Só o intervalo enterrado passa.
  ok(
    viva.canoY !== null && viva.canoTetoY - viva.canoY >= 2 && viva.canoTetoY - viva.canoY <= 10,
    `as mangueiras ficam ENTERRADAS no teto, nem flutuando nem pousadas ` +
      `(${viva.canoTetoY - viva.canoY}px dentro da parede, medido na coluna DELAS)`,
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

  // ⚠️ A COBERTURA É MEDIDA AO LONGO DO TRECHO, NÃO NUM INSTANTE — e a 1ª versão media num
// instante e mentia nos dois sentidos.
//
// A parede é uma ESCADA de placas de 128px: num degrau, 1px de `x` faz a superfície saltar
// vários px de uma vez, então o seguimento da criatura chega sempre um quadro atrasado na
// costura. Um instante sorteado pode pegar ela no pior degrau (e reprovar uma peça boa) ou entre
// dois (e aprovar uma que abre fresta meio segundo depois). O que a peça promete é *nunca abrir
// fresta*, e isso só se mede varrendo.
const varredura = await page.evaluate(async () => {
  const s = window.__game.scene.getScenes(true)[0];
  let piorCima = 999, piorBaixo = 999, amostras = 0;
  for (let i = 0; i < 40; i++) {
    const p = s.terrain.props.getChildren().find((o) => o.active && o.getData('kind') === 'garganta');
    if (p) {
      // ⚠️ MESMO SINAL DO ASSERT DO INSTANTE, e a 1ª versão inverteu um dos dois: positivo =
      // a peça INVADE a parede (bom, ela está enterrada); negativo = sobra corredor descoberto
      // (fresta). Com os sinais trocados a varredura reprovava uma peça que cobria perfeitamente.
      const cima = Math.round(s.moldura.superficieTetoEm(p.x) - (p.y - p.displayHeight / 2));
      const baixo = Math.round((p.y + p.displayHeight / 2) - s.moldura.superficieChaoEm(p.x));
      if (cima < piorCima) piorCima = cima;
      if (baixo < piorBaixo) piorBaixo = baixo;
      amostras++;
    }
    await new Promise((r) => setTimeout(r, 40));
  }
  return { piorCima, piorBaixo, amostras };
});
console.log('varredura', JSON.stringify(varredura));
ok(varredura.amostras >= 20, `⭐ a varredura pegou a criatura viva (${varredura.amostras} amostras)`);
ok(
  varredura.piorCima >= 0 && varredura.piorBaixo >= 0,
  `ela NUNCA abre fresta ao longo do trecho (pior caso: ${varredura.piorCima}px em cima, ` +
    `${varredura.piorBaixo}px embaixo)`,
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
    anim: p?.anims?.isPlaying ? p.anims.currentAnim?.key : null,
    tex: p?.texture.key ?? null,
    dims: p ? `${p.width}x${p.height}` : null,
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
// ⚠️ TEXTURA, NÃO ANIMAÇÃO. A morte deixou de ser os 11 quadros de amolecer e virou uma troca
// seca para a carcaça arrombada, como a `portaLasca`. Se este assert voltar a cobrar uma `anim`,
// a morte lenta voltou junto — e com ela a leitura *ela morreu* no lugar de *eu rompi isto*.
ok(
  aceso.tex === 'gargantaDestroco',
  `a criatura vira o DESTROÇO no mesmo quadro do estouro (tex=${aceso.tex})`,
);
ok(aceso.anim === null, `e não toca animação de morte nenhuma (anim=${aceso.anim})`);
// ⭐ O DISCRIMINADOR: o destroço tem de ocupar o MESMO quadro da viva, senão a peça salta de
// lugar e de tamanho na ignição. É a lei da `portaLasca` (64×112, os mesmos da porta).
ok(
  aceso.dims === '97x171',
  `⭐ e o destroço nasce no MESMO quadro da viva, sem saltar (${aceso.dims})`,
);
ok(aceso.ponto === 400, `o ponto é agora, não no fim da animação (${aceso.ponto})`);
ok(aceso.cone === 1, 'o cone entrou');
ok(aceso.gore === 25, `o gore partiu (${aceso.gore} pedaços: 14 placas de casco + 11 vísceras)`);
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
ok(dobro.gore <= 25, `nem cospe gore duas vezes (${dobro.gore})`);

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


// ─── O GORE COMPLETO (22/09) ─────────────────────────────────────────────────
//
// ⚠️ NUMA PÁGINA NOVA, e isso não é zelo: a cena acima já acendeu. Depois da ignição a criatura é
// carcaça, a nuvem morreu e o `acender()` devolve `false` — reaproveitar a página mediria o mesmo
// nada e PASSARIA, que é a pior falha possível numa sonda.
const p2 = await browser.newPage();
p2.on('pageerror', (e) => console.log(`[ERRO gore] ${e.message}`));
await p2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p2.waitForTimeout(1500);
await p2.keyboard.press('L');
await p2.waitForTimeout(1200);
await p2.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.elapsed = 107;
  s.director.skipTo(107);
  s.aplicaCorredorEMoldura(107);
});
await p2.waitForFunction(() => window.__game.scene.getScenes(true)[0].esfincter?.denso === true, null, {
  timeout: 40000,
  polling: 40,
});
// ⚠️ O DEPTH DA MANGUEIRA É LIDO ANTES DO TIRO, porque depois dele o cano ainda existe mas a cena
// está cheia — e o que se quer provar é onde ela mora em relação à PAREDE, não se ela sobreviveu.
const camadas = await p2.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const cano = s.children.list.find((o) => o.name === 'f4Cano');
  const faixa = s.children.list.find((o) => o.name === 'faixaTeto');
  return { cano: cano?.depth ?? null, faixa: faixa?.depth ?? null };
});
console.log('camadas  ', JSON.stringify(camadas));
// ⭐ MEDIDO CONTRA A FAIXA DE VERDADE, não contra o literal −0,6. Se a `Moldura` mudar de camada, é
// a mangueira que tem de acompanhar — e um assert cravado no número não avisaria.
ok(
  camadas.cano !== null && camadas.faixa !== null && camadas.cano < camadas.faixa,
  `⭐ a mangueira fica ATRÁS da borda (cano ${camadas.cano} < faixa ${camadas.faixa}) — cravada, não colada`,
);

const g = await p2.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.matarGarganta();
  const dos = (nome) => s.children.list.filter((o) => o.name === nome);
  const gore = dos('f4Gore');
  const resp = dos('f4Respingo');
  // ⭐ OS RESPINGOS PROMETEM ESTAR ENCOSTADOS NA PAREDE, e a promessa é medida contra a `Moldura` —
  // quem DESENHA a parede —, nunca contra o número que a própria peça usou para se posicionar. A
  // linha de base `[110,110,110]` do M1 é o aviso: assert alimentado pela mesma conta que posiciona
  // a peça tem os termos cancelados e é cego por construção.
  // ⚠️ MEDIDO NA LINHA DO IMPACTO, não no `y` do sprite. A peça de teto é ancorada pelo topo (o
  // impacto está 4px ABAIXO da âncora) e a de chão pela base, espelhada (4px ACIMA). Medir a âncora
  // é o erro que deixou o sangue flutuando passar por uma sonda verde.
  const impacto = (m) => (m.originY === 0 ? m.y + 4 : m.y - 4);
  const fora = resp.filter((m) => {
    const teto = s.moldura.superficieTetoEm(m.x);
    const chao = s.moldura.superficieChaoEm(m.x);
    return Math.min(Math.abs(impacto(m) - teto), Math.abs(impacto(m) - chao)) > 2;
  }).length;
  const poca = dos('f4Poca')[0];
  return {
    placas: gore.filter((o) => o.texture.key === 'f4GoreSheet').length,
    visceras: gore.filter((o) => o.texture.key === 'f4VisceraSheet').length,
    sangue: dos('f4Sangue').length,
    respingo: resp.length,
    respingoFora: fora,
    poca: poca ? 1 : 0,
    // ⭐ O DISCRIMINADOR DA POÇA. O `Esfincter` não recebe o chão: ele DEDUZ, `chão = 2·meio −
    // teto`. Se a `Moldura` um dia mudar o que `meioEm` significa, a poça afunda ou flutua e só
    // este assert avisa.
    pocaNoChao: poca ? Math.abs(impacto(poca) - s.moldura.superficieChaoEm(poca.x)) <= 2 : null,
    tela: dos('f4SangueTela').length,
  };
});
console.log('gore     ', JSON.stringify(g));
// ⚠️ AS DUAS FOLHAS SAEM JUNTAS — escolha dele em 22/09 (*"gostei das gerações de pedaços e
// sangue"*). Se um destes dois cair para zero, o estouro perdeu metade da matéria sem ninguém ver:
// 25 pedaços continuam saindo e a contagem total não denuncia nada.
ok(g.placas === 14, `as 14 placas de casco continuam saindo (${g.placas})`);
ok(g.visceras === 11, `⭐ e as 11 vísceras saem JUNTO, da outra folha (${g.visceras})`);
ok(g.sangue >= 60, `o esguicho dela sai (${g.sangue} gotas e caudas)`);
ok(g.respingo === 5, `5 respingos grudam nas duas bandas (${g.respingo})`);
ok(g.respingoFora === 0, `⭐ e os 5 nascem ENCOSTADOS na superfície da Moldura (${g.respingoFora} fora)`);
ok(g.poca === 1 && g.pocaNoChao === true, `⭐ a poça cai no CHÃO da Moldura, e o chão deduzido bate`);
ok(g.tela === 5, `e o vidro suja (${g.tela} manchas, que somem antes do chefão)`);

// ─── A CÂMERA LENTA ──────────────────────────────────────────────────────────
// ⚠️ MEDIDA DEPOIS DE UM QUADRO, nunca no mesmo. O `matarGarganta` só arma a rampa; quem aplica as
// escalas é o `update`. Ler no mesmo `evaluate` devolveria 1 em tudo e o assert passaria ao contrário.
await p2.waitForTimeout(120);
const lenta = await p2.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return {
    tweens: s.tweens.timeScale,
    relogio: s.time.timeScale,
    anims: s.anims.globalTimeScale,
    fisica: s.physics.world.timeScale,
  };
});
console.log('lenta    ', JSON.stringify(lenta));
ok(lenta.tweens < 0.8, `o mundo entra em câmera lenta no estouro (tweens ${lenta.tweens.toFixed(2)})`);
ok(lenta.relogio < 0.8 && lenta.anims < 0.8, `o relógio e as animações vão junto (${lenta.relogio.toFixed(2)} / ${lenta.anims.toFixed(2)})`);
// ⭐ O DISCRIMINADOR DA INVERSÃO. O Arcade conta `msPerFrame = _frameTimeMS * timeScale`, então
// devagar é MAIOR que 1. Se um dia alguém "consertar" isto para acompanhar os outros três, a física
// acelera enquanto o resto desacelera — e nenhum assert de "está lento" pegaria.
ok(lenta.fisica > 1.2, `⭐ e a física vai no INVERSO, como o Arcade exige (${lenta.fisica.toFixed(2)})`);

// ⚠️ E O FIM DA RAMPA É METADE DO PEDIDO — *"e o final normal"*. Sem este assert, uma rampa que
// travasse no piso deixaria o jogo inteiro em 30% até o fim da fase, e o teste acima passaria igual.
await p2.waitForTimeout(1100);
const voltou = await p2.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return [s.tweens.timeScale, s.time.timeScale, s.anims.globalTimeScale, s.physics.world.timeScale];
});
ok(
  voltou.every((v) => v === 1),
  `⭐ e o tempo VOLTA sozinho ao normal (${voltou.join(' / ')})`,
);

// ─── O RESPINGO CONTINUA GRUDADO — A VARREDURA ───────────────────────────────
//
// ⚠️ ESTE É O ASSERT QUE FALTAVA, E A FALTA DELE CUSTOU UM TESTE JOGADO. O assert de instante logo
// acima (`respingoFora === 0`) passava com o defeito de pé: no quadro do nascimento a peça ESTÁ
// colada — ela descola depois, quando a parede muda de espessura em t=114,5 e a superfície sobe
// 10px de uma vez. Ele fotografou o sangue flutuando no vazio.
//
// ⚠️ É A TERCEIRA VEZ NESTA FATIA que medir num ponto só engana (a fresta de 14px, a respiração do
// guardião, e agora isto). **Peça que promete ficar colada se mede VARRENDO.**
const VARRIDAS = 18;
let piorDesvio = 0;
let amostras = 0;
for (let i = 0; i < VARRIDAS; i++) {
  await p2.waitForTimeout(250);
  const d = await p2.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const alvos = s.children.list.filter(
      (o) => (o.name === 'f4Respingo' || o.name === 'f4Poca') && o.x > 0 && o.x < 384,
    );
    if (alvos.length === 0) return null;
    let pior = 0;
    for (const m of alvos) {
      const teto = s.moldura.superficieTetoEm(m.x);
      const chao = s.moldura.superficieChaoEm(m.x);
      const imp = m.originY === 0 ? m.y + 4 : m.y - 4;
      pior = Math.max(pior, Math.min(Math.abs(imp - teto), Math.abs(imp - chao)));
    }
    return { pior, n: alvos.length, t: Math.round(s.elapsed * 10) / 10 };
  });
  if (!d) continue;
  amostras++;
  piorDesvio = Math.max(piorDesvio, d.pior);
}
console.log(`varredura  ${amostras} amostras · pior desvio ${piorDesvio.toFixed(1)}px`);
ok(amostras >= 8, `a varredura pegou o sangue vivo em ${amostras} instantes`);
// ⭐ 2px de tolerância: é o `+1` / `−1` com que a peça encosta na superfície, mais o arredondamento.
ok(
  piorDesvio <= 2,
  `⭐ e ele NUNCA descola da borda, nem quando a câmara abre (pior desvio ${piorDesvio.toFixed(1)}px)`,
);

await p2.close();

await browser.close();
console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
