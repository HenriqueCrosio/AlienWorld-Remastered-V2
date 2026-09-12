// A SONDA DA MOLDURA (Fatia 7 · M1).
//
// O que só se vê rodando: se a linha do vão virou CURVA (placas vizinhas se relacionam) em vez de
// sorteio por batida, se a faixa existe e é DECORAÇÃO (sem corpo físico, escala 1), se a trava dos
// 8px segura, se o PERFIL da espessura é o de 10/09 (margem fina → duto → reabertura), e se a
// MORDIDA do duto cobra só onde a parede está desenhada, sem alcançar o vão.
//
// ⚠️ Exige `npm run dev` rodando. UMA sonda por vez: três browsers headless no mesmo Vite quebram.
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
page.on('console', (m) => { if (m.type() === 'error') console.log(`[console:error] ${m.text()}`); });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L'); // atalho: direto na Fase 4
await page.waitForTimeout(1500);

// A sonda não sabe jogar: vidas e invulnerabilidade para cima — testa-se a MOLDURA.
const blindar = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s || s.scene.key !== 'Game') return;
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
});
await blindar();

// ─── A ESPESSURA CRAVA NO PRIMEIRO VALOR (checada AQUI, antes da curva e da trava) ───
//
// ⚠️ Por que este assert mora aqui e não junto com o resto dos asserts de espessura, no fim do
// arquivo: os laços da CURVA (que amostra até `s.elapsed >= 32`) e da TRAVA (60 leituras) logo
// abaixo consomem o relógio DA FASE antes da primeira leitura de lá — medido: o bloco de
// espessura do fim do arquivo já encontra a fase em t≈42s na primeira consulta, mesmo esperando
// por ESTADO. Checar "abre fina" (t=1, 16px) só é possível ANTES desses dois laços rodarem —
// depois, o relógio já passou do instante que se queria medir, e não tem como voltar.
const cravaInicial = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { t: Math.round((s.elapsed ?? 0) * 10) / 10, e: Math.round(s.moldura?.espessura ?? -1) };
});
console.log('espessuraInicial', JSON.stringify(cravaInicial));
ok(
  cravaInicial.e >= 15 && cravaInicial.e <= 17,
  `a fase abre com a faixa fina, já cravada (${cravaInicial.e}px, esperado 16)`,
);

// ─── A CURVA: placas vizinhas se relacionam ───
//
// ⚠️ Amostra o vão na BOCA DE CENA (x = 414, onde o corredor nasce) e guarda só as MUDANÇAS. É a
// medida direta do defeito diagnosticado em `GameScene.ts:859`: hoje cada par sorteia um `vaoY`
// novo no alcance inteiro (saltos de até 38px); a curva anda no máximo `PASSO_MAX`.
//
// ⚠️ Espera por ESTADO (o relógio do JOGO), nunca por relógio de parede — este laço era a exceção
// que faltava: contava 120 iterações de `waitForTimeout(200)` (~24s de PAREDE) e achava que isso
// cobria a fase. Não cobre: o Chromium headless com swiftshader engasga, o Phaser limita o
// `delta`, e o relógio do JOGO andava só ~15s nesse tempo — ~10 placas (a placa muda a cada
// 1,52s). Simulado 20.000× por cenário: 10 placas reprovam `serie.length >= 6` em 41,9% das vezes
// — bate com o "1 em 3" medido em produção. 19 placas (~29s de jogo) derrubam isso para ~0,5%. O
// limiar 6 estava certo; a unidade da espera é que estava errada.
const PASSO_MAX = 14;
const ALVO_ELAPSED = 32; // ~29s de jogo a partir do t≈3 em que a sonda começa aqui → ~19 placas.
const TETO_ITERACOES = 400; // rede de segurança: nunca deixa a sonda pendurar se algo travar.
const serie = [];
let elapsedAlcancado = 0;
let iteracoesUsadas = 0;
let janelaAlcancada = false;
for (; iteracoesUsadas < TETO_ITERACOES; iteracoesUsadas++) {
  await blindar();
  const leitura = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || !s.moldura) return null;
    return { v: Math.round(s.moldura.vaoEm(414)), t: s.elapsed ?? 0 };
  });
  if (leitura !== null) {
    elapsedAlcancado = leitura.t;
    if (leitura.v !== serie[serie.length - 1]) serie.push(leitura.v);
    if (leitura.t >= ALVO_ELAPSED) {
      janelaAlcancada = true;
      iteracoesUsadas++;
      break;
    }
  }
  await page.waitForTimeout(200);
}
const saltos = serie.slice(1).map((v, i) => Math.abs(v - serie[i]));
const maior = saltos.length ? Math.max(...saltos) : 0;
console.log(
  'curva    ',
  JSON.stringify({ degraus: serie.length, serie, maior, elapsed: elapsedAlcancado }),
);
ok(
  janelaAlcancada,
  `a janela do relógio do JOGO foi alcançada (elapsed=${elapsedAlcancado}, alvo=${ALVO_ELAPSED}, ${iteracoesUsadas}/${TETO_ITERACOES} iterações) — sem isso os dois asserts abaixo mediriam menos jogo do que precisam`,
);
ok(serie.length >= 6, `a curva ANDOU ao longo da fase (${serie.length} degraus distintos)`);
ok(maior <= PASSO_MAX + 1, `o degrau nunca salta mais que ${PASSO_MAX}px (maior=${maior})`);

// ─── A FAIXA: ela existe, é DECORAÇÃO, está em escala 1, e é a TEXTURA/DIMENSÃO certas ───
//
// ⚠️ A LIÇÃO DA TASK 5 (ver os dois asserts da MESA logo abaixo) vale IGUAL para a faixa: são as
// 14 peças do M2–M5 que vão trocar exatamente esta arte. `texturas` cobra que nenhum segmento
// caiu na textura de erro do motor (`__MISSING`/`__DEFAULT`); `dims` cobra 128×64 exatos — a
// LARGURA é o que faz `cobre` fechar sem buraco entre segmentos, e a ALTURA é de quem
// `Moldura.ESPESSURA_MAX = 54` depende (a peça tem 64px e é ancorada pela superfície, sem crop
// nem escala — ver o comentário do construtor).
const faixa = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const pega = (nome) => s.children.list.filter((o) => o.name === nome);
  const chao = pega('faixaChao');
  const teto = pega('faixaTeto');
  const todos = [...chao, ...teto];
  return {
    chao: chao.length,
    teto: teto.length,
    comCorpo: todos.filter((o) => o.body).length,
    escalas: [...new Set(todos.flatMap((o) => [o.scaleX, o.scaleY]))],
    // ⚠️ `o.displayWidth`, NUNCA o literal 128. Uma peça de faixa com largura errada
    // posicionaria os segmentos a 128px mesmo assim (é o `LARGURA` da GRADE do mundo, não da
    // arte) e deixaria buracos entre eles — um `cobre` medido com o literal passaria do mesmo
    // jeito, cego para exatamente o defeito que existe para pegar.
    cobre: chao.length
      ? Math.min(...chao.map((o) => o.x)) <= 0 &&
        Math.max(...chao.map((o) => o.x + o.displayWidth)) >= 384
      : false,
    texturas: [...new Set(todos.map((o) => o.texture.key))],
    dims: [...new Set(todos.map((o) => `${o.displayWidth}x${o.displayHeight}`))],
    // ⚠️ I3 — O QUE ESTÁ DESENHADO CONTRA O QUE A PLACA DIZ, não dois lados da mesma fonte
    // interna. Os outros asserts desta sonda só leem `moldura.placaEm`/`vaoEm`/`espessura` —
    // dados INTERNOS — e nunca comparam com a posição de tela do sprite. O Critical da Task 2
    // (o segmento desenhando a altura da placa VIZINHA, por causa do `x` arredondado)
    // continuaria invisível aqui: a trava mede a placa, a placa estaria certa, só o desenho
    // estaria errado — a mesma classe do incidente da mesa invisível: os números fecham, a
    // coisa não está na tela.
    //
    // ⚠️ AMOSTRA NO MEIO DO SEGMENTO (`x + 64`), NUNCA NA BORDA. O `x` do sprite é arredondado
    // para a grade de pixel; amostrar na borda reintroduz a mesma ambiguidade de placa que
    // causou o Critical. Tolerância 0: os dois têm de bater exatamente.
    desviosChao: chao.map((o) => o.y - s.moldura.superficieChaoEm(o.x + 64)),
    desviosTeto: teto.map((o) => o.y - s.moldura.superficieTetoEm(o.x + 64)),
  };
});
console.log('faixa    ', JSON.stringify(faixa));
ok(faixa.chao === 4, `a faixa do CHÃO tem os 4 segmentos (${faixa.chao})`);
ok(faixa.teto === 4, `a faixa do TETO tem os 4 segmentos (${faixa.teto})`);
// ⚠️ O assert mais importante desta sonda: a faixa é DECORAÇÃO. Um corpo físico aqui seria a
// física nova que a spec proibiu, e ele apareceria como morte invisível no meio do vão.
ok(faixa.comCorpo === 0, `a faixa NÃO tem corpo físico — é decoração (${faixa.comCorpo} com corpo)`);
ok(
  faixa.escalas.length === 1 && faixa.escalas[0] === 1,
  `a faixa é desenhada em escala 1 (${JSON.stringify(faixa.escalas)})`,
);
ok(faixa.cobre, 'os 4 segmentos cobrem a largura da tela sem buraco');
ok(
  faixa.texturas.length === 1 && faixa.texturas[0] === 'f4Faixa',
  `nenhum segmento da faixa usa a textura de erro — todos carregam 'f4Faixa' (${JSON.stringify(faixa.texturas)})`,
);
ok(
  faixa.dims.length === 1 && faixa.dims[0] === '128x64',
  `as dimensões da faixa batem com a arte — 128×64, sem esticar nem encolher (${JSON.stringify(faixa.dims)})`,
);
ok(
  faixa.desviosChao.every((d) => d === 0),
  `o chão da faixa está EXATAMENTE onde a placa manda (desvios=${JSON.stringify(faixa.desviosChao)})`,
);
ok(
  faixa.desviosTeto.every((d) => d === 0),
  `o teto da faixa está EXATAMENTE onde a placa manda (desvios=${JSON.stringify(faixa.desviosTeto)})`,
);

// ─── A TRAVA DOS 8px: a superfície nunca entra no corredor ───
//
// ⚠️ Mede a tela inteira, coluna a coluna, e durante um trecho longo — a trava só MORDE quando a
// espessura cresce, então uma amostra curta passaria sem testar nada.
//
// ⚠️ CADA PLACA CONTRA O SEU PRÓPRIO `gap`, NUNCA CONTRA O `gap` CORRENTE (`s.corredorGap`). A
// trava é aplicada dentro de `Moldura.gerar()` com o `gap` vigente NA HORA em que a placa nasce;
// quando o roteiro alarga o corredor (t=37: 96→104, t=63,5: 76→84), as placas ainda na tela
// nasceram sob o vão antigo. Medi-las contra o `gap` corrente é medir a régua errada — dá 4px
// onde a trava garantiu 8, e o defeito seria da medida, não da parede. A `Moldura` expõe os fatos
// crus (cada placa carrega o `gap` sob o qual nasceu); quem faz a aritmética é a sonda.
// ⚠️ ESPERA POR ESTADO E ATRAVESSA A ARENA. Até 11/09 eram 60 leituras fixas; com o corredor
// parando em t=38,5 (a arena do golfinho) e voltando em t=50, leituras cegas cairiam quase todas
// fora da janela de corredor. O laço segue até ter amostras dos DOIS lados da arena e para em
// t≈54 — antes de a parede engrossar em t=55, que o assert de espessura logo abaixo lê como 16. E
// é também em t≈54 que o corredor de 76 (rate 1,9s, desde t=50) já tem os dois pares que o bloco
// da MESA precisa na tela.
let pior = Infinity;
let amostras = 0;
for (let i = 0; i < 600; i++) {
  await blindar();
  const f = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || !s.moldura) return null;
    if (s.golfinho) s.matarGolfinho(); // a arena segura o relógio; esta sonda mede a MOLDURA
    const t = s.elapsed ?? 0;
    if (s.corredorRate <= 0) return { t, min: null };
    let min = Infinity;
    for (let x = 0; x <= 384; x += 10) {
      const p = s.moldura.placaEm(x);
      if (p.gap <= 0) continue; // sem corredor nesta placa, não há o que proteger
      const meio = p.gap / 2;
      min = Math.min(min, p.superficieChao - (p.vaoY + meio), (p.vaoY - meio) - p.superficieTeto);
    }
    return { t, min: min === Infinity ? null : min };
  });
  if (f && f.min !== null) {
    pior = Math.min(pior, f.min);
    amostras++;
  }
  if (f && f.t >= 54 && amostras >= 10) break;
  await page.waitForTimeout(250);
}
console.log('trava    ', JSON.stringify({ folgaMinima: pior, amostras }));
// ⚠️ O `amostras` NÃO É ENFEITE. Sem ele o assert passa quando NUNCA MEDIU: `pior` fica em
// `Infinity` se toda iteração cair fora da janela de corredor, e `Infinity >= 8` é verdadeiro —
// o guard-rail que protege o vão ficaria verde justamente no caso em que perdeu a capacidade de
// testar. Um assert que não distingue "sempre teve folga" de "nunca olhou" não é um assert.
ok(
  amostras >= 10 && pior >= 8,
  `a superfície da faixa nunca entra no corredor (${amostras} amostras, folga mínima ${pior}px, mínimo 8)`,
);

// ─── A MESA: escala 1, enterrada na faixa, topo na borda do vão ───
//
// ⚠️ `alturaPx` ESTICAVA a peça. Uma mesa de 112px espremida em 30 vira mingau, e ampliar é
// proibido pela lei da resolução. A mesa nasce em escala 1 e é ENTERRADA: o que varia é quanto
// dela sobra para fora, nunca o tamanho do desenho.
// ⚠️ A ESPESSURA "DE t=50" É LIDA AQUI, ANTES DA MESA (11/09). A mesa agora espera por estado (logo
// abaixo) e pode empurrar o relógio para perto de t=55, quando a parede começa a engrossar; lida
// depois dela, a margem de 16 viraria rampa. A trava acabou de parar em t≈54, então esta leitura
// cai direto na margem. (Lida direto, e não por `espessuraEm`: aquela função é declarada mais abaixo.)
const e50 = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { t: Math.round((s.elapsed ?? 0) * 10) / 10, e: Math.round(s.moldura?.espessura ?? -1) };
});

// ⚠️ A MESA ESPERA POR ESTADO: DOIS PARES NA TELA. Depois da arena do golfinho o corredor volta em
// t=50, mas o cronômetro dele ficou congelado no meio da contagem quando parou em t=38,5 — o
// primeiro par chega em t≈51,x, e em t≈54 pode haver um só. Um vão só não prova o "exato".
const lerMesas = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const ps = s.terrain.props.getChildren().filter((p) => p.active);
  const chao = ps.filter((p) => !p.flipY);
  const teto = ps.filter((p) => p.flipY);

  // ⚠️ MEDE O PAR, NUNCA O PROP CONTRA A CURVA. O prop anda pela FÍSICA (`setVelocityX`) e a curva
  // anda pelo `xMundo`: as duas correm a 84px/s, mas um prop pousado em cima de uma fronteira de
  // placa pode cair do outro lado por meio pixel de deriva, e o assert piscaria. O par é imune —
  // as duas mesas nasceram do MESMO `vaoY`, e a distância entre elas é o `gap` do roteiro, exato.
  const vaos = [];
  for (const t of teto) {
    const par = chao.find((c) => Math.abs(c.x - t.x) < 8);
    if (par) vaos.push(Math.round(par.y - par.displayHeight - (t.y + t.displayHeight)));
  }
  return {
    total: ps.length,
    gap: s.corredorGap,
    kinds: [...new Set(ps.map((p) => p.getData('kind')))],
    escalas: [...new Set(ps.flatMap((p) => [p.scaleX, p.scaleY]))],
    vaos,
    texturas: [...new Set(ps.map((p) => p.texture.key))],
    dims: [...new Set(ps.map((p) => `${p.displayWidth}x${p.displayHeight}`))],
    larguras: [...new Set(ps.map((p) => Math.round(p.displayWidth)))],
    alturas: [...new Set(ps.map((p) => Math.round(p.displayHeight)))],
  };
});
let mesas = await lerMesas();
for (let i = 0; i < 60 && mesas.vaos.length < 2; i++) {
  await blindar();
  await page.waitForTimeout(150);
  mesas = await lerMesas();
}
console.log('mesa     ', JSON.stringify(mesas));
ok(mesas.total > 0, `há corredor na tela para medir (${mesas.total} props)`);
ok(mesas.kinds.length === 1 && mesas.kinds[0] === 'mesa', `o corredor é feito de MESA (${mesas.kinds})`);
ok(
  mesas.escalas.length === 1 && mesas.escalas[0] === 1,
  `a mesa entra em escala 1, nunca esticada (${JSON.stringify(mesas.escalas)})`,
);
// ⚠️ EXATO, não uma janela. O `bordaVao` crava o topo em `vaoY ± gap/2` sem escalar nada, então o
// vão medido é o número do roteiro sem arredondamento — é a prova de que a mesa não come o vão.
ok(
  mesas.vaos.length >= 2 && mesas.vaos.every((v) => v === mesas.gap),
  `o vão medido é o do roteiro, EXATO (gap=${mesas.gap}, medidos=[${mesas.vaos}])`,
);
// ⚠️ ESTES DOIS ASSERTS SÃO O REMENDO DO BURACO DA TASK 5. A chave da arte da mesa (`f4Mesa`) e o
// nome do `PropKind` (`mesa`) nasceram desalinhados: `pickVariant(scene, kind)` procurava `mesa`,
// não achava, e o Phaser devolvia a textura de erro do motor (`__MISSING`, 32×32). O obstáculo
// ficou INVISÍVEL e com a hitbox errada, e as QUATRO sondas existentes passaram assim mesmo — os
// asserts acima checam `kind` (o dado que o jogo ATRIBUI ao prop, não o que ele CARREGOU), a
// escala e o vão do par, e o vão sai do MESMO número que posiciona a peça (`bordaVao`), então ele
// não tem como flagrar textura errada por construção. Só olhar a textura de verdade pega isto.
// ⚠️ A FAMÍLIA, E NÃO UMA CHAVE SÓ. Até 12/09 este assert cobrava `texturas[0] === 'mesa'`, o que
// era certo enquanto existia uma arte só. Com a arte de verdade entraram `mesa2` e `mesa3` (o
// `pickVariant` sorteia entre elas de graça, pela convenção de nomes), e cravar uma chave passaria
// a reprovar o funcionamento normal. O que ele tem de pegar continua sendo o mesmo: a textura de
// ERRO do motor (`__MISSING`/`__DEFAULT`), que não casa com o padrão.
ok(
  mesas.texturas.length > 0 && mesas.texturas.every((k) => /^mesa[0-9]*$/.test(k)),
  `nenhum prop do corredor usa a textura de erro — todos são da família 'mesa' (${JSON.stringify(mesas.texturas)})`,
);

// ⚠️ O ASSERT DE DIMENSÃO VIROU UM ASSERT DE RODAPÉ, e a troca é o ponto. Ele cravava `96x112`
// porque havia uma arte só; três variantes têm três dimensões de PNG diferentes (94×110, 91×107,
// 89×104) e isso é legítimo. O que NÃO é legítimo é a largura em TELA variar: o prop nasce em
// escala 1, então a largura da textura É a pegada horizontal do obstáculo, e uma variante mais
// gorda que a outra faria a dificuldade mudar conforme o sorteio. As três foram aparadas ao mesmo
// aspecto por isso (scripts/_f4/_assar-mesa.mjs), e é isto que o assert protege.
ok(
  mesas.larguras.length >= 1 && mesas.larguras.every((w) => Math.abs(w - 94) <= 2),
  `todas as variantes da mesa têm a MESMA pegada horizontal (~94px): ${JSON.stringify(mesas.larguras)}`,
);
// ⚠️ E ALTURA SUFICIENTE PARA ENTERRAR. A mesa é cravada pelo TOPO (`bordaVao`) e desce o resto da
// própria altura; se a peça for baixa demais, o pé dela aparece no meio da tela em vez de sumir na
// faixa. O pior caso é a borda do vão mais alta que o roteiro produz (~182 com gap 126), e dali à
// base da tela são 34px. 32×32 (a textura de erro) reprova aqui também, por sorte e por desenho.
ok(
  mesas.alturas.every((h) => h >= 100),
  `a mesa é alta o bastante para enterrar o pé (${JSON.stringify(mesas.alturas)}, mínimo 100)`,
);

// ─── O PERFIL DA ESPESSURA: margem fina → o duto fecha → o núcleo reabre ───
//
// ⚠️ Espera por ESTADO (o relógio da fase), nunca por relógio de parede: um assert novo que gaste
// tempo faria a espera cega derivar. Foi assim que quatro quadros de conferência da Fatia 7
// saíram todos já no chefão, em 06/09.
//
// ⚠️ NENHUM INSTANTE ANTES DE t≈42 É ALCANÇÁVEL DAQUI: a essa altura da sonda (depois da curva e
// da trava) o relógio da fase já passa de 42s na primeira leitura, e um assert cravado antes disso
// mediria uma amostra que já ficou para trás — dois instantes precoces colapsavam na MESMA leitura
// (medido: {"t":42.1,...} duas vezes seguidas). O bug não era da `Moldura` nem do roteiro, era dos
// instantes do assert não sobreviverem ao próprio custo da sonda. A abertura fina (16px em t=1) já
// foi provada lá em cima, antes de a curva consumir o relógio.
const espessuraEm = async (ate) => {
  for (let i = 0; i < 900; i++) {
    const e = await page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      if (!s || s.scene.key !== 'Game') return null;
      s.lives = 99;
      s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
      if (s.golfinho) s.matarGolfinho(); // a arena segura o relógio; esta sonda mede a MOLDURA
      return { t: Math.round((s.elapsed ?? 0) * 10) / 10, e: Math.round(s.moldura?.espessura ?? -1) };
    });
    if (!e) return null;
    if (e.t >= ate) return e;
    await page.waitForTimeout(100);
  }
  return null;
};

// ⚠️ ESTES INSTANTES SÃO AMOSTRADOS DEPOIS DO FIM DE CADA RAMPA, NUNCA NO INSTANTE DO EVENTO. A
// espessura persegue o alvo a `RAMPA` px/s (8), então em t=55 ela ainda é 16 e subindo: um assert
// cravado ali mediria a rampa, não o alvo, e piscaria conforme a velocidade do headless. As
// janelas usadas, com o fim da rampa entre parênteses:
//   t≈54 → 16 (a margem; a sonda chega aqui depois da trava, que para em 54)   t=60 → 32 (rampa fecha em ~57)
//   t=66 → 44 (fecha em ~65)                  t=74 → 54 (fecha em ~69,25)
//   t=84 → 16 (a reabertura fecha em ~83,75)
const e60 = await espessuraEm(60);
const e66 = await espessuraEm(66);
console.log('espessura', JSON.stringify([e50, e60, e66]));
// ⚠️ O ASSERT MAIS IMPORTANTE DOS CINCO, e é o que reprova a volta do desenho antigo: em t=50 a
// fase já passou pelo vão mais estreito dela (76px, t=43) e a BORDA CONTINUA FINA. Até 10/09 aqui
// havia 36px. O aperto do miolo é do VÃO; a parede só fecha no duto.
ok(e50 && e50.e === 16, `t=50s: a borda ainda margeia, mesmo no aperto (${e50 && e50.e}px, esperado 16)`);
ok(e60 && e60.e === 32, `t=60s: a parede ganha corpo (${e60 && e60.e}px, esperado 32)`);
ok(e66 && e66.e === 44, `t=66s: não é mais câmara (${e66 && e66.e}px, esperado 44)`);

// ─── A MORDIDA: a parede do duto cobra o encosto, e SÓ o duto ───
//
// ⚠️ Sonda a `morde` DIRETO, com caixas fabricadas — não espera a nave bater. A sonda voa blindada
// (`invulnerableUntil` no máximo) justamente para poder medir a fase inteira; esperar uma colisão
// real aqui seria trocar um assert determinístico por um sorteio.
const caixas = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  const m = s.moldura;
  const x = Math.round(s.ship.x);
  const chao = m.superficieChaoEm(x);
  const teto = m.superficieTetoEm(x);
  const vao = m.vaoEm(x);
  return {
    t: Math.round((s.elapsed ?? 0) * 10) / 10,
    duto: m.duto,
    chao,
    teto,
    // ENTERRADA no chão: 10px abaixo da superfície, bem além da mordida de 3px.
    dentroChao: m.morde(x - 10, x + 10, chao - 6, chao + 10),
    // ENTERRADA no teto, o espelho da de cima.
    dentroTeto: m.morde(x - 10, x + 10, teto - 10, teto + 6),
    // NO MEIO DO VÃO: é aqui que o jogo acontece, e a parede não pode encostar nele NUNCA.
    noVao: m.morde(x - 10, x + 10, vao - 8, vao + 8),
    // O RASPÃO de 1px, que a mordida de 3px tem de perdoar.
    raspao: m.morde(x - 10, x + 10, chao - 20, chao + 1),
  };
});

const antes = await caixas();
console.log('mordida  ', JSON.stringify(antes));
ok(antes.duto === false, `t=${antes.t}s: antes do duto a parede NÃO é letal (duto=${antes.duto})`);
ok(
  antes.dentroChao === false && antes.dentroTeto === false,
  `t=${antes.t}s: antes do duto a parede é atravessável — é cenário (chão=${antes.dentroChao}, teto=${antes.dentroTeto})`,
);
const fioAntes = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.children.list.filter((o) => (o.name === 'fioChao' || o.name === 'fioTeto') && o.visible).length;
});
// ⚠️ Parede acesa fora do duto seria pior que a mordida sem aviso: prometeria perigo onde não há,
// e o jogador que aprendesse a desviar dela desaprenderia a regra no instante em que ela vale.
ok(fioAntes === 0, `t=${antes.t}s: o fio está APAGADO fora do duto (${fioAntes} acesos)`);

const e74 = await espessuraEm(74);
const duto = await caixas();
console.log('espessura', JSON.stringify(e74));
console.log('mordida  ', JSON.stringify(duto));
ok(e74 && e74.e === 54, `t=74s: o duto — a faixa cheia (${e74 && e74.e}px, esperado 54)`);
ok(duto.duto === true, `t=${duto.t}s: no duto a parede é letal (duto=${duto.duto})`);
ok(
  duto.dentroChao === true && duto.dentroTeto === true,
  `t=${duto.t}s: a parede do duto MORDE nos dois lados (chão=${duto.dentroChao}, teto=${duto.dentroTeto})`,
);
// ⚠️ O ASSERT QUE PROTEGE A FASE DE FICAR IMPOSSÍVEL. A trava dos 8px garante que a superfície
// nunca entra no corredor; se este ficar vermelho, a parede letal invadiu o vão e a fase virou
// roubo — e nenhum outro assert desta sonda pegaria isso, porque todos os outros medem a parede,
// não o espaço jogável dentro dela.
ok(duto.noVao === false, `t=${duto.t}s: a mordida NÃO alcança o meio do vão (noVao=${duto.noVao})`);
// ⚠️ Sem este, `MORDIDA` poderia cair para 0 e a sonda continuaria verde: o assert `dentroChao`
// passa com qualquer folga, porque ele enterra a caixa 10px. Este é o único que mede a folga.
ok(duto.raspao === false, `t=${duto.t}s: o raspão de 1px é perdoado (a mordida é de 3px) (raspao=${duto.raspao})`);

// ⚠️ O QUE MATA É O QUE DESENHA, e este assert é o motivo de a mordida não ser um corpo físico. A
// superfície que a `morde` consulta tem de ser a MESMA que posiciona o sprite da faixa na tela —
// se as duas divergirem, a parede mata onde não está desenhada, que é a definição de morte
// invisível. É a lição do `679f7f3` (a mesa com a textura de erro) aplicada à parede.
const desenho = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const m = s.moldura;
  const segs = s.children.list.filter((o) => o.name === 'faixaChao');
  const fora = [];
  for (const seg of segs) {
    // O centro do segmento: longe das fronteiras de placa, onde `placaEm` pode discordar em 1px.
    const x = Math.round(seg.x + 64);
    if (x < 0 || x > 384) continue;
    const medido = m.superficieChaoEm(x);
    if (medido !== seg.y) fora.push({ x, sprite: seg.y, medido });
  }
  // O FIO: a linha acesa na superfície. Só existe quando a parede morde, e tem de cair EXATAMENTE
  // na linha que cobra — luz meio pixel fora da hitbox ensina a coisa errada.
  const fios = s.children.list.filter((o) => o.name === 'fioChao' || o.name === 'fioTeto');
  const acesos = fios.filter((f) => f.visible);
  const desalinhados = acesos.filter((f) => {
    const x = Math.round(f.x + 64);
    if (x < 0 || x > 384) return false;
    const alvo = f.name === 'fioChao' ? m.superficieChaoEm(x) : m.superficieTetoEm(x) - 2;
    return f.y !== alvo;
  }).length;
  return {
    segmentos: segs.length,
    fora,
    tint: segs.length ? segs[0].tintTopLeft : null,
    fios: fios.length,
    acesos: acesos.length,
    desalinhados,
  };
});
console.log('desenho  ', JSON.stringify(desenho));
ok(desenho.segmentos > 0, `há segmentos de faixa na tela para conferir (${desenho.segmentos})`);
ok(
  desenho.fora.length === 0,
  `a superfície que MORDE é a mesma que DESENHA (${desenho.fora.length} divergências: ${JSON.stringify(desenho.fora)})`,
);
// O TELÉGRAFO. Sem ele a mordida é sonegação — a mesma lei que faz a fase abrir com corredor largo
// para o jogador descobrir que o teto mata antes de o vão apertar.
//
// ⚠️ O ASSERT QUE VALE É O DO FIO, NÃO O DO TINT. O tint foi a primeira tentativa e ele NÃO LÊ:
// medido em t=74, o delta de luminância entre inerte e letal deu −1,5 (tint no Phaser é
// multiplicativo, e a faixa é quase preta na banda que importa). O tint fica porque esquenta o que
// tem luz; quem anuncia a parede é a linha acesa.
ok(
  desenho.tint === 0xff8a6a,
  `a faixa esquenta ao morder (tint=0x${(desenho.tint ?? 0).toString(16)}, esperado 0xff8a6a)`,
);
ok(
  desenho.acesos === desenho.fios && desenho.fios > 0,
  `o FIO está ACESO nos dois lados enquanto a parede morde (${desenho.acesos}/${desenho.fios})`,
);
// ⚠️ A luz tem de cair na MESMA linha que cobra o encosto. Um fio deslocado ensinaria o jogador a
// mirar numa borda que não é a que mata — pior que não ter telégrafo nenhum.
ok(
  desenho.desalinhados === 0,
  `o fio cai EXATAMENTE na linha que morde (${desenho.desalinhados} desalinhados)`,
);

// ─── A PAREDE COLA NO CORREDOR: é isto que faz o duto ser um DUTO ───
//
// ⚠️ ESTE BLOCO EXISTE POR UMA MEDIÇÃO, não por precaução. Em 09/09 a superfície do duto saía da
// espessura com a trava como TETO (`max`/`min`), e o resultado medido foi: parede de teto com
// **16,6px de média** onde o roteiro pedia 54, e **127px de banda aberta** para um corredor de 84.
// Os 43px sobrando não eram nem corredor nem parede — e era exatamente isso que fazia o duto ler
// como "passagem estreita" em vez de duto. Se estes asserts caírem, o defeito voltou.
const colada = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  const m = s.moldura;
  const gap = s.corredorGap;
  const bandas = [];
  const folgas = [];
  for (const x of [64, 192, 320]) {
    const c = m.superficieChaoEm(x), t = m.superficieTetoEm(x), v = m.vaoEm(x);
    bandas.push(c - t);
    folgas.push(c - (v + gap / 2), (v - gap / 2) - t);
  }
  // A peça tem 64px; onde a parede passa disso, quem fecha até a borda é o ENCHIMENTO.
  const ench = s.children.list.filter((o) => o.name === 'enchimentoChao' || o.name === 'enchimentoTeto');
  const buracos = [];
  for (const seg of s.children.list.filter((o) => o.name === 'faixaChao')) {
    const x = Math.round(seg.x + 64);
    if (x < 0 || x > 384) continue;
    const fim = seg.y + 64;                     // onde a peça do chão termina
    const e = ench.find((o) => o.name === 'enchimentoChao' && Math.abs(o.x - seg.x) < 1);
    if (fim < 216 && (!e || !e.visible || e.y > fim || e.y + e.height < 216)) buracos.push({ x, fim });
  }
  return { gap, bandas, folgas, enchimentos: ench.length, acesos: ench.filter((o) => o.visible).length, buracos };
});
console.log('colada   ', JSON.stringify(colada));
// A banda aberta é o vão MAIS as duas folgas da trava, e nada além disso. Antes: 127 para gap 84.
const esperado = colada.gap + 2 * 8;
ok(
  colada.bandas.every((b) => b === esperado),
  `a banda aberta do duto é o vão + as duas folgas, EXATO (${colada.bandas} contra ${esperado} = ${colada.gap}+8+8)`,
);
// ⚠️ E a folga continua sendo 8 dos dois lados — colar a parede APERTA contra o corredor, nunca
// dentro dele. Se este cair, a parede letal invadiu o vão e a fase virou roubo.
ok(
  colada.folgas.every((f) => f === 8),
  `a folga da trava continua exata dos dois lados (${colada.folgas})`,
);
// ⚠️ O ENCHIMENTO. A peça tem 64px e no duto a parede passa disso — sem ele apareceria uma tira de
// FUNDO no rodapé e no topo, ou seja, um buraco no meio da parede que acabou de virar letal.
ok(
  colada.acesos === colada.enchimentos && colada.enchimentos > 0,
  `o enchimento está aceso nos dois lados dentro do duto (${colada.acesos}/${colada.enchimentos})`,
);
ok(
  colada.buracos.length === 0,
  `a parede vai da superfície até a borda da tela, sem fresta (${colada.buracos.length} buracos: ${JSON.stringify(colada.buracos)})`,
);

// ─── AS PORTAS: o duto deixa de ser uma passagem estreita ───
//
// ⚠️ A PORTA TEM DE TAPAR O VÃO INTEIRO. Uma comporta desalinhada com o corredor deixa passagem
// por cima ou por baixo, e porta que dá para contornar não é porta — o jogador aprenderia a
// ignorar o núcleo aceso, que é a única coisa que a peça existe para ensinar.
const porta = await (async () => {
  for (let i = 0; i < 900; i++) {
    const r = await page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      if (!s || s.scene.key !== 'Game') return null;
      s.lives = 99; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
      if (s.golfinho) s.matarGolfinho(); // a arena segura o relógio; esta sonda mede a MOLDURA
      const p = s.terrain.props.getChildren().find((o) => o.active && o.getData('kind') === 'porta');
      if (!p) return { achou: false, t: Math.round((s.elapsed ?? 0) * 10) / 10 };
      const m = s.moldura;
      const x = Math.round(p.x);
      const vao = m.vaoEm(Math.max(0, Math.min(383, x)));
      const gap = s.corredorGap;
      return {
        achou: true,
        t: Math.round((s.elapsed ?? 0) * 10) / 10,
        hp: p.getData('hp'),
        tex: p.texture.key,
        dims: `${Math.round(p.displayWidth)}x${Math.round(p.displayHeight)}`,
        escala: p.scaleX,
        // as bordas da peça contra as bordas do corredor, na coluna dela
        sobraCima: Math.round(vao - gap / 2 - (p.y - p.displayHeight / 2)),
        sobraBaixo: Math.round(p.y + p.displayHeight / 2 - (vao + gap / 2)),
      };
    });
    if (r && r.achou) return r;
    await page.waitForTimeout(100);
  }
  return null;
})();
console.log('porta    ', JSON.stringify(porta));
ok(porta !== null, 'a porta do duto nasce');
if (porta) {
  ok(porta.tex === 'porta', `a porta não usa a textura de erro — carrega 'porta' (${porta.tex})`);
  ok(porta.escala === 1, `a porta entra em escala 1, nunca esticada (${porta.escala})`);
  ok(porta.dims === '64x112', `as dimensões batem com a arte — 64×112 (${porta.dims})`);
  ok(porta.hp === 6 || porta.hp === 8 || porta.hp === 10, `o HP vem do ROTEIRO, porta a porta (hp=${porta.hp})`);
  // ⚠️ OS DOIS ASSERTS QUE IMPORTAM. A peça de 112px contra um vão de 84, 76 ou 68 tem de sobrar
  // dos DOIS lados. Sobra negativa = fresta = porta contornável.
  ok(
    porta.sobraCima >= 0 && porta.sobraBaixo >= 0,
    `a porta TAPA o vão inteiro, sem fresta (sobra ${porta.sobraCima}px em cima, ${porta.sobraBaixo}px embaixo)`,
  );
}

// ⚠️ NO DUTO NÃO NASCE MESA. Desde que a parede colou no corredor, uma mesa nasceria como uma
// protuberância de 8px invisível contra a parede — 8px de vão comido sem ninguém ver de onde.
const mesaNoDuto = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  return s.terrain.props.getChildren().filter((o) => o.active && o.getData('kind') === 'mesa').length;
});
ok(mesaNoDuto === 0, `no duto não nasce mesa — quem fecha o caminho são as portas (${mesaNoDuto} mesas)`);

// ─── A REABERTURA: a parede recua no silêncio, e o chefão luta numa arena emoldurada ───
const e112 = await espessuraEm(112);
const arena = await caixas();
console.log('espessura', JSON.stringify(e112));
console.log('mordida  ', JSON.stringify(arena));
ok(e112 && e112.e <= 20, `t=112s: a parede recuou antes do chefão (${e112 && e112.e}px, esperado ~16)`);
ok(arena.duto === false, `t=${arena.t}s: a arena do núcleo não morde (duto=${arena.duto})`);

console.log(falhas === 0 ? '\n✔ A MOLDURA ESTÁ DE PÉ' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
