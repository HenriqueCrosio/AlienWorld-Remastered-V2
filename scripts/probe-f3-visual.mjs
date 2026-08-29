// A FATIA 5 — a apresentação da Fase 3. Entra pelo atalho [M] do menu.
// Ela ASSERTA (não só fotografa): cada achado desta fatia vira uma condição que reprova.
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '✔ ' : '✘ ') + msg);
  if (!cond) falhas++;
};

/** Mantém a nave viva: a sonda não sabe jogar, e uma sonda morta testa o GameOver. */
const respirar = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.lives !== undefined) s.lives = 9;
  });

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const p = s.parallax;
    const acha = (k) => s.children.list.filter((o) => o.texture && o.texture.key === k);
    const pint = acha('paintBgF3');
    return {
      cena: s.scene.key,
      t: Number((s.elapsed ?? 0).toFixed(1)),
      nebulaDim: p ? Number(p.nebulaDim.toFixed(2)) : null,
      cascoReveal: p ? Number(p.cascoReveal.toFixed(2)) : null,
      frente: p?.cascoFrente
        ? { y: p.cascoFrente.y, d: p.cascoFrente.depth, a: Number(p.cascoFrente.alpha.toFixed(2)) }
        : null,
      pintura: pint.length
        ? { n: pint.length, y: Math.round(pint[0].y), d: pint[0].depth, a: Number(pint[0].alpha.toFixed(2)), w: pint[0].width, h: pint[0].height }
        : null,
      // As camadas do Parallax, por chave: quantos sprites e o alpha do primeiro.
      //
      // ⚠️ `texturas` EXISTE PORQUE `key` DEIXOU DE BASTAR. A faixa do casco é UMA camada só
      // desde 28/08, e a peça de cada sprite é escolhida pela DISTÂNCIA já percorrida sobre o
      // bicho (`Parallax.familiaDoCasco`). Contar a camada diria sempre "cascoPlaca" e o assert
      // da composição mediria o nome do config, não o que está na tela.
      camadas: (p?.layers ?? []).map((l) => ({
        key: l.key,
        n: l.sprites.length,
        alpha: l.sprites[0] ? Number(l.sprites[0].alpha.toFixed(3)) : null,
        primeiroPlano: !!l.primeiroPlano,
        casco: !!l.casco,
        texturas: l.casco ? [...new Set(l.sprites.map((sp) => sp.texture.key))].sort() : undefined,
        baseY: l.baseY,
      })),
      cascoDist: p ? Math.round(p.cascoDist) : null,
    };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
await page.waitForTimeout(4000);
await respirar();

// O GANCHO DOS PROPS: registra cada NASCIMENTO com o instante. Montado agora, antes de o Ato 2
// existir, porque props reciclam — contar sprites vivos mede quantos couberam na tela, não
// quantos nasceram. Lido lá embaixo, no bloco dos respiradouros.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__nasc = [];
  const orig = s.terrain.spawn.bind(s.terrain);
  s.terrain.spawn = (kind, opts) => {
    // ⚠️ O `opts` PASSA ADIANTE. O gancho antigo chamava `orig(kind)` e engolia o segundo
    // argumento — na Fase 3 ninguém passa `opts`, então nada quebrava, mas uma sonda que altera
    // a chamada que está medindo mede outra coisa.
    const r = orig(kind, opts);
    // O PLANTIO se lê AQUI, no nascimento, e não depois: props reciclam e morrem, e uma
    // varredura tardia só acha quem sobreviveu até a foto.
    const p = s.terrain.props.getChildren().at(-1);
    const som = p ? p.getData('sombra') : null;
    window.__nasc.push({
      kind,
      t: Number((s.elapsed ?? 0).toFixed(2)),
      pe: p ? Math.round(p.y) : null,
      coroa: p ? 150 - Math.round(p.y - p.displayHeight) : null,
      depth: p ? Number(p.depth.toFixed(3)) : null,
      propW: p ? Math.round(p.displayWidth) : null,
      somW: som ? Math.round(som.width) : null,
    });
    return r;
  };
});

const e = await estado();
console.log('t=' + e.t, JSON.stringify(e.camadas.map((c) => c.key)));

ok(e.cena === 'Game', 'está na fase');
ok(e.pintura !== null, 'a PINTURA da nebulosa está na cena');
ok(e.pintura !== null && e.pintura.n === 2, 'a pintura entra em DUAS cópias (rolagem sem buraco)');

// ⚠️ A PINTURA EM RESOLUÇÃO REAL. Ela era 480×270 em y=−27 — a receita que o projeto repetia
// desde a Fase 1 e que o Henrique reclamou três vezes. Numa janela de 384×216, uma placa de
// 480×270 mostra 80% de cada eixo: 64% da pintura, com zoom de 1,25×. Este assert existe para
// que a receita errada não volte por hábito em nenhuma fase futura.
ok(
  e.pintura !== null && e.pintura.w === 384 && e.pintura.h === 216,
  `a pintura está na RESOLUÇÃO REAL do jogo (${e.pintura?.w}×${e.pintura?.h}, não ampliada)`,
);
ok(e.pintura !== null && e.pintura.y === 0, `e em y=0, sem recorte de sobra (y=${e.pintura?.y})`);

// A camada procedural mais profunda da nuvem saiu; a do meio ficou.
const nebulas = e.camadas.filter((c) => c.key === 'nebula3');
ok(nebulas.length === 2, `restam 2 camadas de nebula3 procedural (achei ${nebulas.length})`);
ok(nebulas.some((c) => c.primeiroPlano), 'os VÉUS (primeiroPlano) continuam existindo');

await page.screenshot({ path: 'scripts/_f3/probe-ato1.png' });

// ─── A ÁGUA-VIVA: existe, deriva, e some antes do rabo ───
while ((await estado()).t < 22) {
  await page.waitForTimeout(800);
  await respirar();
}
const vivas = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const l = s.enemies.enemies.getChildren().filter((o) => o.active && o.getData('kind') === 'aguaViva');
  return {
    n: l.length,
    vys: l.map((o) => Math.round(o.body.velocity.y)),
    flips: l.map((o) => o.flipY),
    sobe: l.map((o) => o.getData('sobe')),
    anim: l[0]?.anims?.currentAnim?.key ?? null,
  };
});
console.log('agua-viva ' + JSON.stringify(vivas));
ok(vivas.n > 0, `a ÁGUA-VIVA está no Ato 1 (achei ${vivas.n})`);
ok(vivas.anim === 'aguaviva-drift', `e o sino está PULSANDO (anim=${vivas.anim})`);

// ⚠️ ELA ESTÁ DE PASSAGEM, E O ASSERT MEDE O EIXO. A primeira versão derivava da direita para a
// esquerda em senóide, e o Henrique reprovou o movimento: ele quer que ela ATRAVESSE, entrando
// por uma borda horizontal e saindo pela oposta. O assert antigo media `vx > -40`, que continua
// verdadeiro num bicho parado — não separava "deriva" de "atravessa".
ok(
  vivas.vys.length > 0 && vivas.vys.every((v) => Math.abs(v) > 20),
  `e ela ATRAVESSA na vertical, não fica bobeando (vy=${JSON.stringify(vivas.vys)})`,
);
// ⚠️ E O SENTIDO TEM QUE CASAR COM O FLIP. Quem desce entra DE PONTA-CABEÇA (pedido literal);
// quem sobe entra de pé. Um assert que só olhasse "existe flip" passaria com todas viradas.
ok(
  vivas.sobe.every((s, i) => vivas.flips[i] === !s),
  `e quem DESCE vem de ponta-cabeça (sobe=${JSON.stringify(vivas.sobe)}, flipY=${JSON.stringify(vivas.flips)})`,
);
await page.screenshot({ path: 'scripts/_f3/probe-agua-viva.png' });

// ─── O CHOQUE: ela ESTALA viva e DESCARREGA ao morrer ───
//
// Pedido do Henrique no 3º teste: *"só preciso do efeito de choque que não vi ainda... ao morrer
// o efeito de explosão de choque."*
//
// ⚠️ O ASSERT DA MORTE ENVELOPA `Fx.choque` E `Fx.explode` E COBRA OS DOIS. Perguntar só "o
// choque foi chamado?" passaria numa implementação que chamasse os DOIS — a criatura morreria em
// eletricidade E em fogo, e no tamanho do jogo a bola de fogo esconderia os arcos. O que se está
// medindo é que a morte dela NÃO É de fogo.
//
// ⚠️ E ELE MATA PELA MESMA PORTA QUE O JOGO (`hitEnemy`, via hp), não chamando `destroy`. Havia
// DOIS caminhos de morte no arquivo (a bala e a BOMBA) com a cópia das mesmas quatro linhas;
// medir o caminho da bala é o que garante que quem passou a decidir o efeito foi o `matarInimigo`
// de verdade, e não um `if` colado num deles.
const morte = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  // Os contadores vivem no `window` para o bloco do ESTALO poder lê-los mais tarde.
  window.__fx = { choque: 0, explode: 0, estalo: 0 };
  for (const nome of ['choque', 'explode', 'estalo']) {
    const orig = s.fx[nome].bind(s.fx);
    s.fx[nome] = (...a) => { window.__fx[nome]++; return orig(...a); };
  }

  const av = s.enemies.enemies.getChildren().find((o) => o.active && o.getData('kind') === 'aguaViva');
  if (!av) return { ...window.__fx, achou: false };
  const temTimer = typeof av.getData('estalo') === 'number';

  // Uma bala do jogador com dano suficiente, entregue pela porta de sempre. O `release` do
  // pool é desligado durante a chamada: a bala é falsa e devolvê-la ao pool faria o
  // `WeaponSystem` mexer no corpo físico de um objeto que não tem nenhum. O que se está medindo
  // é o caminho da MORTE, não o do projétil.
  const b = { x: av.x, y: av.y, active: true, getData: (k) => (k === 'damage' ? 99 : undefined) };
  const rel = s.weapons.release.bind(s.weapons);
  s.weapons.release = () => {};
  try {
    s.bulletHitEnemy(b, av);
  } finally {
    s.weapons.release = rel;
  }
  return { ...window.__fx, achou: true, temTimer, vivo: av.active };
});
console.log('morte da água-viva ' + JSON.stringify(morte));
ok(morte.achou, 'havia uma água-viva para matar');
ok(morte.temTimer, 'ela carrega o cronômetro do ESTALO (o arco de quem está viva)');
ok(morte.vivo === false, 'ela morreu com o dano');
ok(morte.choque === 1, `e morreu em CHOQUE (Fx.choque chamado ${morte.choque}×)`);
ok(morte.explode === 0, `e NÃO em fogo (Fx.explode chamado ${morte.explode}×)`);

// O ESTALO acontece SOZINHO, sem ninguém pedir: 1,1–2,3s entre arcos. 5s de espera cobre
// qualquer sorteio com folga — e contar a CHAMADA é o único jeito de medir um efeito de 90ms
// sem depender de fotografá-lo no instante certo (a lição do assert do rodapé, que amostrava um
// instante e media o instante).
await page.waitForTimeout(5000);
await respirar();
const nEstalos = await page.evaluate(() => window.__fx.estalo);
console.log('estalos em 5s: ' + nEstalos);
ok(nEstalos >= 2, `o ESTALO dispara sozinho enquanto ela vive (${nEstalos} em 5s)`);

// ⚠️ O CASCO NÃO SE ANUNCIA MAIS, E A INVERSÃO É DELIBERADA (2026-08-27).
//
// Até aqui este assert exigia o contrário: `alpha > 0.05` em t≈25, a "insinuação" que o
// HANDOFF pedia desde sempre ("na metade do tempo, o Leviatã começa a aparecer"). Ela foi
// implementada na sessão de 26/08, foi JOGADA, e foi reprovada pelo Henrique — o que se via
// era uma estrutura meio apagada pairando 20s antes de ter motivo.
//
// O TESTE JOGADO VENCE O DOCUMENTO. O casco agora nasce quando o RABO afunda, e não antes.
while ((await estado()).t < 25) {
  await page.waitForTimeout(1500);
  await respirar();
}
const meio = await estado();
const cascoMeio = meio.camadas.filter((c) => c.casco);
console.log('t=' + meio.t, 'nebulaDim=' + meio.nebulaDim, 'cascoReveal=' + meio.cascoReveal, JSON.stringify(cascoMeio));

ok(cascoMeio.length > 0, 'a camada do casco existe');
ok(
  cascoMeio.every((c) => c.alpha === null || c.alpha === 0),
  'e está INVISÍVEL na metade do Ato 1 — o casco só nasce quando o rabo SAI',
);
ok(meio.cascoReveal === 0, `cascoReveal=0 em t=${meio.t} (era 1 − nebulaDim = 0.25)`);
// ⚠️ E A NUVEM CONTINUA AFINANDO. É o par que prova o DESACOPLAMENTO: se este assert
// reprovar junto com os de cima, alguém consertou o casco desligando o t=21 inteiro.
ok(
  meio.nebulaDim > 0.6 && meio.nebulaDim < 0.9,
  `mas a NUVEM afinou mesmo assim (nebulaDim=${meio.nebulaDim}) — os dois estão separados`,
);
await page.screenshot({ path: 'scripts/_f3/probe-anuncio.png' });

// ─── A TRANSIÇÃO: o RABO do Leviatã atravessa a tela ───
//
// Ele entra em t=38 — ANTES da nuvem abrir em t=42 — e leva ~11s até sumir. A ordem é o
// desenho todo: primeiro o jogador vê O QUE alcançou, e só depois o casco se revela como o
// corpo daquilo. Um assert que só perguntasse "o rabo existe" passaria com ele entrando DEPOIS
// da virada, que é a versão sem sentido — por isso este mede o nebulaDim junto.
// ⚠️ O QUADRO TEM QUE ESTAR VAZIO QUANDO O RABO CHEGA. A água-viva demora ~13,7s para atravessar
// — é o inimigo mais lento do jogo, e o único capaz de sobrar para dentro da virada. O vazio é o
// que faz a chegada do rabo pesar; se alguém empurrar as ondas dela para a frente, reprova aqui.
while ((await estado()).t < 38) {
  await page.waitForTimeout(500);
  await respirar();
}
const naEntrada = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  return s.enemies.enemies.getChildren().filter((o) => o.active && o.getData('kind') === 'aguaViva').length;
});
ok(naEntrada === 0, `a água-viva LIMPOU a tela antes do rabo entrar (achei ${naEntrada} em t=38)`);

while ((await estado()).t < 39.5) {
  await page.waitForTimeout(800);
  await respirar();
}
const naVirada = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  const r = s.children.list.find((o) => o.texture && o.texture.key === 'raboLeviata');
  if (!r) return { n: 0 };
  // A BATIDA é rotação em torno do pedúnculo, feita em código. Amostra o ângulo duas vezes:
  // se ele não se move, o rabo está pregado; se passar de |90|, virou hélice de novo.
  const a1 = r.angle;
  await new Promise((res) => setTimeout(res, 700));
  const a2 = r.angle;
  return {
    t: Number((s.elapsed ?? 0).toFixed(1)),
    nebulaDim: Number(s.parallax.nebulaDim.toFixed(2)),
    n: 1,
    x: Math.round(r.x),
    depth: r.depth,
    escala: r.scaleX,
    alturaTela: Math.round(r.displayHeight),
    topo: Math.round(r.y - r.displayHeight / 2),
    base: Math.round(r.y + r.displayHeight / 2),
    a1: Number(a1.toFixed(1)),
    a2: Number(a2.toFixed(1)),
    corpo: r.body ?? null,
  };
});
console.log('rabo    ' + JSON.stringify(naVirada));
ok(naVirada.n === 1, `o RABO está na tela na virada (achei ${naVirada.n})`);
ok(naVirada.a1 !== naVirada.a2, `a nadadeira está BATENDO (ângulo ${naVirada.a1}° → ${naVirada.a2}°)`);
// ⚠️ O ASSERT QUE PAGA A LIÇÃO DA HÉLICE. A animação gerada pelo PixelLab rodava a nadadeira em
// torno do próprio eixo, e "o rabo existe e se move" passava numa versão que estava errada. A
// batida de uma baleia é um ARCO CURTO — nunca uma volta.
ok(
  Math.abs(naVirada.a1) <= 20 && Math.abs(naVirada.a2) <= 20,
  `e o arco é CURTO, não um giro (|${naVirada.a1}| e |${naVirada.a2}| ≤ 20°)`,
);
// ELE SE SEGURA NA DIREITA, com o corpo sangrando para fora da borda. ⚠️ ISTO É O *HOLD*, e ele
// continua valendo depois da travessia nova (2026-08-29): o rabo chega, PARA na quina, e só
// muito depois sai pela esquerda. Amostrar aqui em t=39,5 é amostrar a chegada, não a saída.
ok(naVirada.x > 300, `ele se SEGURA na direita, com o corpo saindo do quadro (x=${naVirada.x})`);
// ⚠️ O CRITÉRIO DE "COLOSSAL" MUDOU, E MUDOU PARA MAIS EXIGENTE (2026-08-27).
//
// A versão anterior pedia `alturaTela > 150` e o comentário do código dizia que 2,4 era o teto
// "porque o arco inteiro tem que caber na tela". O Henrique jogou e derrubou a regra: ele QUER
// que o rabo saia do frame — é assim que a coisa lê como grande demais para o quadro.
//
// Então o assert deixa de medir "cabe" e passa a medir "NÃO cabe". Não é afrouxar: é a mesma
// pergunta com a resposta invertida, e ela reprova tanto o pequeno demais quanto o que voltou
// a caber por acidente.
ok(
  naVirada.alturaTela > 240,
  `e é COLOSSAL: ${naVirada.alturaTela}px de altura numa tela de 216 (escala ${naVirada.escala})`,
);
// ⚠️ SANGRA PELO RODAPÉ, E NÃO MAIS PELO TOPO (2026-08-28). Este assert pedia os DOIS, o que
// era a leitura certa enquanto o rabo estava centrado na tela. O Henrique jogou de novo e mandou
// o contrário, com desenho: *"o rabo precisa ficar mais encostado na quina inferior direita da
// tela, para que ao abaixar o rabo no movimento de nado para baixo, o toco fique alinhado com o
// chão."* Um rabo centrado deixava uma faixa de vazio de ~50px entre a barriga dele e a borda de
// baixo — e era nesse vazio que o chão aparecia DEPOIS, que é a costura que ele reclamou.
//
// NÃO É AFROUXAR: o teste ficou mais exigente. Antes bastava sangrar 20px de cada lado; agora o
// topo tem que estar DENTRO do quadro (a peça está deitada na quina, não centrada) e o rodapé
// tem que sangrar 40px ou mais. Um rabo centrado reprova aqui, e um rabo que encolheu também.
ok(
  naVirada.topo > 0 && naVirada.base > 216 + 40,
  `DEITADO NA QUINA DE BAIXO: topo dentro do quadro (${naVirada.topo}) e ${naVirada.base - 216}px sangrando pelo rodapé`,
);
ok(naVirada.nebulaDim > 0.5, `chega AINDA DENTRO da nuvem (nebulaDim=${naVirada.nebulaDim})`);
ok(naVirada.corpo === null, 'o rabo NÃO tem corpo físico (é cenário, não inimigo)');
await page.screenshot({ path: 'scripts/_f3/probe-rabo.png' });

// ─── A TRAVESSIA: ele ATRAVESSA e SAI, e o casco nasce do quadro vazio ───
//
// ⚠️ ESTE BLOCO SUBSTITUIU O DO TOCO (2026-08-29), E ELE NÃO AFROUXOU: INVERTEU. Os asserts
// antigos cobravam um mergulho (`angulo < -20`, `depth === -76`, o toco ainda em cena em t=47,
// o casco nascendo dele). O Henrique jogou três vezes e reprovou o mergulho: um corpo rígido que
// gira, desce e apaga no lugar lê como PEÇA QUE SE SOLTOU. A coreografia nova é uma travessia —
// e o teste agora cobra principalmente O QUE NÃO PODE ACONTECER, que é a lição que esta fatia já
// pagou duas vezes (o `+38` invertido e a água-viva medida por `vx > -40`).
//
// Rodando a versão ANTIGA, este bloco reprova em quatro pontos: o `x` subiria em vez de descer
// (o mergulho não translada), o `alpha` cairia a 0, o `angulo` iria a −38, e o rabo ainda
// estaria em cena depois do reveal. É o critério de "o assert novo reprova MAIS do que o velho".

// A amostra do MEIO da saída (t≈46,5; ela corre de 45,8 a 47,6). O passo é curto de propósito:
// passar de 47,6 pegaria o sprite já destruído e o teste mediria a coisa errada.
while ((await estado()).t < 46.5) {
  await page.waitForTimeout(200);
  await respirar();
}
const naTravessia = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  const acha = () => s.children.list.find((o) => o.texture && o.texture.key === 'raboLeviata');
  const r = acha();
  if (!r) return { n: 0 };
  // DUAS amostras de x, porque DIREÇÃO não se mede numa foto só.
  const x1 = r.x;
  const alpha1 = r.alpha;
  await new Promise((res) => setTimeout(res, 700));
  const d = acha();
  return {
    t: Number((s.elapsed ?? 0).toFixed(1)),
    cascoReveal: Number(s.parallax.cascoReveal.toFixed(2)),
    n: 1,
    x1: Math.round(x1),
    x2: d ? Math.round(d.x) : null,
    y: d ? Math.round(d.y) : null,
    alpha1: Number(alpha1.toFixed(2)),
    alpha2: d ? Number(d.alpha.toFixed(2)) : null,
    angulo: d ? Number(d.angle.toFixed(1)) : null,
    depth: d ? d.depth : null,
  };
});
console.log('travessia ' + JSON.stringify(naTravessia));
ok(naTravessia.n === 1, `o rabo está SAINDO em t=${naTravessia.t}`);
// ⚠️⚠️ O ASSERT MAIS CARO DESTA FATIA: ELE VAI PARA A DIREITA, E O SINAL É A COISA TODA.
//
// O corpo do Leviãtã está fora do quadro à DIREITA (origem 0.92), e num sidescroller "estar
// atrás dele" é lateral: `player =)----> Leviãtã`. Uma saída para a esquerda é o rabo se
// afastando do próprio corpo e vindo na direção do jogador — e foi assim que a 4ª tentativa
// foi reprovada: *"como se o rabo tivesse se partido"*. A versão anterior desta sonda cobrava
// `x2 < x1` e ficava VERDE em cima desse defeito, porque media a direção que eu tinha escolhido
// em vez da direção que o desenho exige. Um assert só protege a decisão que ele codifica.
ok(
  naTravessia.x2 !== null && naTravessia.x2 > naTravessia.x1,
  `e ele é PUXADO PARA A DIREITA, atrás do corpo dele (x ${naTravessia.x1} → ${naTravessia.x2})`,
);
// ⚠️ O ASSERT DO `alpha` É O CORAÇÃO DA RECLAMAÇÃO. Sair de opacidade lê como "desapareceu"; ele
// tem que sair por GEOMETRIA, cruzando a borda. Um `alpha: 0` na saída reprova exatamente aqui.
ok(
  naTravessia.alpha1 === 1 && naTravessia.alpha2 === 1,
  `SEM FADE: o alpha fica em 1 durante a saída inteira (${naTravessia.alpha1} → ${naTravessia.alpha2})`,
);
// ⚠️ E O CORPO NÃO RODA. Só a ponta bate (±6°); a folga de 8° é a margem da batida, não licença.
// O mergulho velho ia a −38° e reprovaria.
ok(
  naTravessia.angulo !== null && Math.abs(naTravessia.angulo) <= 8,
  `e o CORPO não roda — só a ponta bate (${naTravessia.angulo}°, teto 8°)`,
);
ok(naTravessia.depth === -70, `depth −70 sem troca durante a saída (${naTravessia.depth})`);
// ⚠️ A SAÍDA É UMA LINHA SÓ: O `x`. Cada eixo extra que entrou nas tentativas anteriores foi
// lido como o corpo se deformando ou se soltando — a 4ª descia 38px enquanto andava. O `y` tem
// que ser o MESMO do hold, não "parecido".
ok(
  naTravessia.y === 158,
  `e a pose não muda: mesmo y do hold, sem descer nada (y=${naTravessia.y})`,
);
ok(
  naTravessia.cascoReveal === 0,
  `e o casco AINDA NÃO nasceu enquanto ele passa (cascoReveal=${naTravessia.cascoReveal})`,
);
await page.screenshot({ path: 'scripts/_f3/probe-travessia.png' });

// ─── O ESCURECIMENTO: ele saiu, a tela ficou preta, e o casco veio PRONTO de trás dela ───
//
// ⚠️ NÃO HÁ MAIS "REVELAÇÃO" DO CASCO PARA MEDIR, e isso é a mudança inteira. Por quatro
// rodadas o chão subiu num fade de 1500ms na frente do jogador, e cada uma delas gastou uma
// sessão discutindo em que instante o fade podia começar sem virar corte. O Henrique trocou o
// problema por um escurecimento: atrás do preto não existe "meio transparente". Então o assert
// deixa de perguntar "o casco está no meio do caminho?" e passa a cobrar que ele esteja
// INTEIRO já na primeira amostra depois do escuro.
//
// A conta: destroy em 47,6 → preto cheio em 47,95 → casco em 1 e nome na tela → preto segura
// até 48,37 → clareia até 48,72.
while ((await estado()).t < 48.2) {
  await page.waitForTimeout(150);
  await respirar();
}
const noEscuro = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const r = s.children.list.find((o) => o.texture && o.texture.key === 'raboLeviata');
  const preto = s.children.list.find((o) => o.name === 'pretoDoCasco');
  return {
    t: Number((s.elapsed ?? 0).toFixed(1)),
    cascoReveal: Number(s.parallax.cascoReveal.toFixed(2)),
    rabo: r ? 1 : 0,
    preto: preto ? Number(preto.alpha.toFixed(2)) : null,
    pretoDepth: preto ? preto.depth : null,
    banner: s.banner ? s.banner.text : null,
    bannerAlpha: s.banner ? Number(s.banner.alpha.toFixed(2)) : null,
    bannerDepth: s.banner ? s.banner.depth : null,
  };
});
console.log('escuro  ' + JSON.stringify(noEscuro));
// ⚠️ NADA FICA. "O toco fica e o casco nasce dele" foi construído, jogado e REPROVADO. Se algum
// dia este assert reprovar com rabo=1, alguém reimplementou o toco — ou a saída ficou lenta
// demais e o bicho está sendo apagado pelo preto em vez de sair andando, que é o defeito de
// novo, só que escondido.
ok(noEscuro.rabo === 0, `o rabo JÁ SAIU antes de a tela escurecer (t=${noEscuro.t})`);
ok(noEscuro.preto === 1, `a tela está PRETA (alpha=${noEscuro.preto})`);
// ⚠️ O CASCO VEM PRONTO. Qualquer valor entre 0 e 1 aqui significa que alguém devolveu o fade
// e o jogador vai ver o chão se materializando — que é exatamente o que o escurecimento existe
// para esconder.
ok(noEscuro.cascoReveal === 1, `e o casco veio INTEIRO de trás do preto (cascoReveal=${noEscuro.cascoReveal})`);
// ⚠️ O NOME SE LÊ SOBRE O PRETO, e é por isso que o preto é depth 90 e não 200. O pedido foi
// que a tela escurecesse *o suficiente para aparecer o nome*: um preto por cima do banner
// apagaria justamente a coisa que ele veio mostrar.
ok(
  noEscuro.banner === 'O CASCO DO LEVIATÃ' && noEscuro.bannerAlpha > 0.5,
  `e o NOME está na tela durante o escuro ("${noEscuro.banner}", alpha ${noEscuro.bannerAlpha})`,
);
ok(
  noEscuro.pretoDepth < noEscuro.bannerDepth,
  `com o preto ATRÁS do nome (preto ${noEscuro.pretoDepth} < banner ${noEscuro.bannerDepth})`,
);
await page.screenshot({ path: 'scripts/_f3/probe-escuro.png' });

// E A TELA VOLTA. Um escurecimento que não clareia é uma fase preta, e o retângulo tem de ser
// DESTRUÍDO: deixado em alpha 0 ele fica de pé para sempre em cima do Ato 2 inteiro.
while ((await estado()).t < 49.4) {
  await page.waitForTimeout(200);
  await respirar();
}
const clareou = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  return {
    t: Number((s.elapsed ?? 0).toFixed(1)),
    preto: s.children.list.filter((o) => o.name === 'pretoDoCasco').length,
    cascoReveal: Number(s.parallax.cascoReveal.toFixed(2)),
  };
});
console.log('clareou ' + JSON.stringify(clareou));
ok(clareou.preto === 0, `a tela CLAREOU e o preto foi destruído, não só zerado (t=${clareou.t})`);
ok(clareou.cascoReveal === 1, `e o casco continua inteiro (${clareou.cascoReveal})`);
await page.screenshot({ path: 'scripts/_f3/probe-saiu.png' });

// O ATO 2: o rabo afundou e o casco é a superfície.
//
// ⚠️ A ESPERA É t<50, E O NÚMERO IMPORTA. Ela era t<47, o que bastava quando o casco já estava
// de pé desde t=21. Agora ele NASCE da SAÍDA do rabo e só fecha em t=48 — amostrar em 47 pegava a
// revelação no meio (cascoReveal=0,38) e reprovava um casco que estava correto, só inacabado.
// O assert media a coisa certa na hora errada; quem mudou foi a hora.
while ((await estado()).t < 50) {
  await page.waitForTimeout(1500);
  await respirar();
}
const ato2 = await estado();
const casco2 = ato2.camadas.filter((c) => c.casco);
console.log('t=' + ato2.t, JSON.stringify(casco2));

ok(ato2.cascoReveal === 1, `o casco está INTEIRO no Ato 2 (cascoReveal=${ato2.cascoReveal})`);
ok(casco2.length === 1, `a faixa do casco é UMA camada só (achei ${casco2.length})`);

const texCauda = casco2[0]?.texturas ?? [];
ok(
  texCauda.length > 0 && texCauda.every((k) => k.startsWith('casco')),
  `a faixa usa a arte nova do casco (${texCauda.join(', ')})`,
);
ok(
  !texCauda.includes('derelict'),
  'o destroço genérico saiu da camada do casco',
);
// ⚠️ A COMPOSIÇÃO É POSICIONAL, E ESTE É O ASSERT QUE COBRA ISSO. O pedido do Henrique foi uma
// MÉTRICA: costela no MEIO do bicho, para o jogador saber onde está. Na entrada — a cauda, onde
// o toco acabou de afundar — não pode haver costela nem duto na tela.
ok(
  ato2.cascoDist !== null && ato2.cascoDist < 900,
  `na entrada do Ato 2 o percurso sobre o bicho ainda é curto (${ato2.cascoDist}px)`,
);
ok(
  !texCauda.some((k) => k.startsWith('cascoCostela') || k.startsWith('cascoDuto')),
  `a CAUDA é blindagem e couro, sem costela nem duto (${texCauda.join(', ')})`,
);
// ⚠️ E O QUADRO NÃO É A FAIXA — a armadilha que custou 7px de rodapé aberto na versão anterior.
// As peças novas são recortadas NA faixa (`instalar-casco.mjs`), sem padding: `baseY` pode ser
// `GAME_HEIGHT` cravado. Se alguém voltar a somar margem aqui, o chão descola da borda.
ok(casco2[0]?.baseY === 216, `a faixa ancora na borda de baixo sem margem (baseY=${casco2[0]?.baseY})`);
await page.screenshot({ path: 'scripts/_f3/probe-ato2.png' });

// ─── O RODAPÉ: a faixa do casco ENCOSTA na borda de baixo? ───
//
// Achado da revisão: o `baseY` ancora a BORDA DO QUADRO, e o quadro tem 14px de padding
// transparente embaixo. Em `GAME_HEIGHT + 6` sobrava uma tira de 7px de espaço aberto no rodapé
// (dava para ver estrela passando POR BAIXO do chão) — e NENHUM assert de contagem de sprites
// pega isso, porque os sprites estavam todos lá, no lugar errado.
//
// ⚠️ Isto mede PIXEL, não estado. O limiar sai da medição: o casco fica em ~0,11–0,13 de
// luminância e o vazio em ~0,028 — 0,06 passa no meio dos dois, longe do piso de ruído.
const tiro = await page.screenshot();
const { data, info } = await sharp(tiro).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const linha = (y) => {
  let l = 0;
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    l += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  return l / info.width;
};
// ⚠️ A MÉDIA DAS ÚLTIMAS 6 LINHAS, NÃO UMA LINHA SOLTA.
//
// A primeira versão deste assert amostrava as linhas 213 e 215 e reprovou por um motivo falso:
// a faixa da frente repete um tile de 18px, e a linha 213 caía numa JUNTA DE PLACA — arte
// legítima, escura de propósito. Um assert que depende de qual linha ele calhou de sortear não
// mede o que diz medir. A média das 6 últimas sobrevive a uma junta e ainda assim despenca se
// houver um vazio de verdade: com os 7px de espaço aberto do bug original, ela media ~0,03.
let somaRodape = 0;
for (let y = info.height - 6; y < info.height; y++) somaRodape += linha(y);
const rodape = somaRodape / 6;
console.log(`rodapé   média das 6 últimas linhas = ${rodape.toFixed(3)}`);
ok(
  rodape > 0.055,
  `a faixa do casco ENCOSTA no rodapé (média ${rodape.toFixed(3)} > 0.055 — vazio mediria ~0.03)`,
);

// ─── AS EMENDAS: nenhum RISCO preto vertical atravessando a faixa ───
//
// As peças vinham do PixelLab com uma coluna de contorno preta (0,008) na borda; a peça da
// direita desenha por cima, então o contorno dela virava um risco a cada ~60px. Quem apara é o
// `instalar-casco.mjs` — e ele já reprova na FONTE se sobrar borda preta.
//
// ⚠️ AQUI O ASSERT PRECISA DISTINGUIR UM RISCO DE UM PROP, e a primeira versão não distinguia:
// ela contava toda coluna escura e reprovou com 11, que eram as SILHUETAS dos respiradouros
// plantados na faixa. A diferença é a LARGURA. Um risco de emenda é uma coluna de 1px com
// vizinhos claros dos dois lados; um prop é uma mancha escura de dezenas de colunas seguidas.
// Então: só conta como risco a coluna quase-preta cujos vizinhos a 3px são nitidamente mais
// claros — o que um prop nunca é, e um contorno de 1px sempre é.
const faixaY = [info.height - 24, info.height - 2];
const coluna = (x) => {
  let l = 0;
  let n = 0;
  for (let y = faixaY[0]; y <= faixaY[1]; y++) {
    const i = (y * info.width + x) * 4;
    l += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    n++;
  }
  return l / n;
};
let riscos = 0;
for (let x = 3; x < info.width - 3; x++) {
  if (coluna(x) < 0.035 && coluna(x - 3) > 0.06 && coluna(x + 3) > 0.06) riscos++;
}
// ⚠️ ESTE ASSERT É RUIDOSO — O TERCEIRO DA SONDA, e ele não estava na lista até 2026-08-29.
// Reprova com `riscos = 1` em torno de uma execução em quatro. MEDIDO no código de `HEAD`, sem
// o plantio dos props, justamente porque o plantio pôs sombras dentro da janela que ele amostra
// (y = altura−24 .. altura−2) e a primeira suspeita foi essa. NÃO era: o ruído já existia.
//
// A causa é a mesma dos outros dois: ele fotografa UM instante de uma fase que rola, e o que cai
// sob a janela muda a cada execução. RODE DE NOVO ANTES DE CONCLUIR — e nunca afrouxe o 0.035
// para calar: o dia em que um risco de emenda voltar de verdade, é este número que o pega.
ok(riscos === 0, `nenhum RISCO de emenda na faixa (${riscos} colunas pretas de 1px entre vizinhos claros)`);

// ─── A MÉTRICA DO CASCO: onde no bicho o jogador está ───
//
// O pedido do Henrique (28/08): *"o cenário do casco tem X blocos, então no meio da composição
// você pode colocar tiles que têm a costela, para 'parecer' que o jogador está +- no meio do
// leviatã."* A cauda já foi conferida lá em cima; aqui se cobra o MEIO e a PROA.
//
// ⚠️ ISTO NÃO É UM ASSERT DE TEXTURA, É UM ASSERT DE PERCURSO. Ele passa se, e só se, a mesma
// faixa mostrar coisas DIFERENTES em lugares diferentes do corpo — que é a coisa toda. Um
// sorteio uniforme (o `pickVariant` cru) reprovaria aqui: ele poria costela na cauda.
while ((await estado()).t < 68) {
  await page.waitForTimeout(1500);
  await respirar();
}
const meioCorpo = await estado();
const texMeio = meioCorpo.camadas.find((c) => c.casco)?.texturas ?? [];
console.log(`meio     t=${meioCorpo.t} dist=${meioCorpo.cascoDist}px ${JSON.stringify(texMeio)}`);
ok(
  texMeio.some((k) => k.startsWith('cascoCostela')),
  `no MEIO do bicho a CAIXA TORÁCICA está na tela (${texMeio.join(', ')})`,
);
ok(
  !texMeio.some((k) => k.startsWith('cascoDuto')),
  'e o maquinário da proa ainda não chegou',
);

// ─── OS RESPIRADOUROS SÃO RAROS, E O ESPAÇAMENTO NÃO DEPENDE DE SORTE ───
//
// ⚠️ ISTO CONTA AO LONGO DO TEMPO, NÃO NUMA AMOSTRA. É a lição do assert do rodapé, paga nesta
// mesma fatia: um assert que olha um instante só mede o instante, não a regra. Aqui a regra é
// "nenhum par a menos de 5s", e ela só existe no tempo.
//
// O trinco é uma CARÊNCIA no spawn, não uma proporção no sorteio: `GetRandom` é uniforme e pode
// dar dois seguidos por acaso. É a mesma lição do `pickVariant` — proporção que importa vem da
// geometria, nunca do dado.
// A janela de props do Ato 2 fecha em t=82 (o silêncio que telegrafa a serpente). Esperar até lá
// é o que torna a contagem uma contagem, e não uma amostra.
while ((await estado()).t < 82) {
  await page.waitForTimeout(1500);
  await respirar();
}

// ⚠️ ELE ENVELOPA `terrain.spawn` EM VEZ DE CONTAR SPRITES NA TELA. Os props RECICLAM e saem
// pela esquerda; contar o que está vivo num instante mede quantos couberam na tela, não quantos
// nasceram. O envelope mede a CHAMADA, que é o evento que a regra governa. (O gancho é montado
// lá em cima, logo depois de a fase abrir.)
const proa = await estado();
const texProa = proa.camadas.find((c) => c.casco)?.texturas ?? [];
console.log(`proa     t=${proa.t} dist=${proa.cascoDist}px ${JSON.stringify(texProa)}`);
ok(
  texProa.some((k) => k.startsWith('cascoDuto')),
  `perto da CABEÇA a faixa vira maquinário (${texProa.join(', ')})`,
);

const nasc = await page.evaluate(() => window.__nasc);
const respiradouros = nasc.filter((n) => n.kind === 'respiradouro').map((n) => n.t);
const lancas = nasc.filter((n) => n.kind === 'lancaMisseis');
const pares = respiradouros.slice(1).map((t, i) => Number((t - respiradouros[i]).toFixed(2)));
console.log('respiradouros nasceram em ' + JSON.stringify(respiradouros));
console.log('intervalos ' + JSON.stringify(pares));
console.log('lanca-misseis: ' + lancas.length);
ok(
  respiradouros.length > 0 && respiradouros.length <= 6,
  `POUCOS respiradouros no Ato 2 (${respiradouros.length} — eram ~13 antes da carência)`,
);
ok(
  pares.every((d) => d >= 5),
  `e BEM ESPAÇADOS: nenhum par a menos de 5s (o menor foi ${pares.length ? Math.min(...pares) : 'n/a'}s)`,
);
// ⚠️ O ASSERT QUE PROTEGE O BALANCEAMENTO. O corte no respiradouro foi desenhado para NÃO mexer
// no volume de tiro do Ato 2 (a cadência caiu pela metade e a mistura dobrou a favor do lança,
// e os dois se cancelam). Se alguém "melhorar" a mistura depois, é aqui que reprova.
ok(
  lancas.length >= 3 && lancas.length <= 6,
  `e os ATIRADORES não mudaram: ${lancas.length} lança-mísseis (a conta antiga dava ~4,2)`,
);

// ─── A MUNIÇÃO DA ARANHA: ela não cospe mais o tiro da NAVE DO JOGADOR ───
//
// ⚠️ ATÉ 2026-08-29 A ARANHA E A SERPENTE ATIRAVAM O MESMO OBJETO: `bolt2` — que é o traço do
// próprio jogador — tingido de `0xff3a78`. *"É um tiro magenta igual, sem característica
// nenhuma."* O assert cobra as três coisas que estavam erradas de uma vez: que NÃO é mais o
// `bolt2`, que NÃO tem tint (a arte já nasce na cor), e que a CAIXA não se mexeu — trocar arte
// de inimigo balanceado sem reabrir o balanceamento só é seguro assim.
const municao = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  for (let i = 0; i < 900; i++) {
    const b = s.enemies.enemyBullets.getChildren().find(
      (o) => o.active && o.texture.key !== 'bolt2' && o.getData('missile') !== true,
    );
    const bolt2 = s.textures.getFrame('bolt2');
    if (b) {
      return {
        tex: b.texture.key,
        tint: b.tintTopLeft.toString(16),
        blend: b.blendMode,
        w: Math.round(b.displayWidth),
        h: Math.round(b.displayHeight),
        quadro: [b.texture.getSourceImage().width, b.texture.getSourceImage().height],
        bolt2: [bolt2.realWidth, bolt2.realHeight],
      };
    }
    await new Promise((res) => requestAnimationFrame(res));
  }
  return null;
});
console.log('municao ' + JSON.stringify(municao));
ok(municao !== null, 'a ARANHA atirou durante o mini-boss');
ok(
  municao?.tex === 'shotAranha',
  `e a munição é a DELA, não o traço da nave do jogador (${municao?.tex}, era 'bolt2')`,
);
// ⚠️ SEM TINT. A arte nasce na cor de cobre medida no casco; tingir por cima só a escureceria.
// `ffffff` é o valor de "sem tint" — qualquer outra coisa aqui significa que alguém repintou.
ok(municao?.tint === 'ffffff', `sem tint por cima da arte (tint=${municao?.tint})`);
// ⚠️ E A CAIXA É A DE ANTES. O quadro tem que ser o MESMO do `bolt2` que ela substituiu — é
// dele que o `release` do pool reconstrói o corpo. Um quadro maior aqui daria hitbox de graça, e
// pior: uma hitbox que depende de quem usou o slot antes (o `Body` do Arcade aplica a escala do
// frame anterior). Foi medido acontecendo com uma versão 16×12 desta arte.
ok(
  municao !== null && municao.quadro[0] === municao.bolt2[0] && municao.quadro[1] === municao.bolt2[1],
  `e nasce no MESMO quadro do bolt2 (${municao?.quadro?.join('×')} contra ${municao?.bolt2?.join('×')}), então a hitbox não se mexeu`,
);
await page.screenshot({ path: 'scripts/_f3/probe-municao.png' });

// ─── O PLANTIO: os props de casco NÃO SÃO UMA FILA ───
//
// ⚠️ ESTE BLOCO É A RESPOSTA AO "COLADOS" (Henrique, 4º teste jogado). Todo prop nascia com o
// pé em GROUND_Y=206, contra uma faixa de casco que vai de y=150 a 216: 90% de sobreposição e
// 6px coroando, todos no mesmo `y`. Uma tira de adesivos. Agora o pé é sorteado dentro da faixa
// (ver `TerrainSystem.PLANTIO`) e cada um quebra a linha da crista numa altura diferente.
const casco = nasc.filter((n) => n.kind === 'respiradouro' || n.kind === 'lancaMisseis');
const pes = casco.map((n) => n.pe);
console.log('plantio ' + JSON.stringify(casco.map((n) => ({ k: n.kind[0], pe: n.pe, coroa: n.coroa, d: n.depth }))));
ok(casco.length >= 3, `há props de casco para medir (${casco.length})`);
// ⚠️ O ASSERT DA FILA. `every(dentro da faixa)` sozinho passaria numa versão que plantasse
// TODOS em 195 — o defeito original com outro número. O que se está medindo é a VARIAÇÃO.
ok(new Set(pes).size > 1, `e eles NÃO estão todos no mesmo y (${new Set(pes).size} plantios distintos em ${pes.length})`);
ok(
  pes.every((y) => y >= 186 && y <= 199),
  `e todo pé cai DENTRO da faixa do casco, nunca na crista nem abaixo dela (${JSON.stringify(pes)})`,
);
// ⚠️ COROAR É O PONTO, E O PIOR CASO É O PROP MAIS BAIXO. 6px era o número do defeito. O
// `lancaMisseis` tem 59px e é ele quem define o teto do PLANTIO: em 199 ele coroa 10px, e o
// respiradouro (62px) no fundo da faixa coroa 26. Este assert JÁ REPROVOU uma vez — o teto
// nasceu 204, calculado sobre o prop mais ALTO, e o lança coroava 5px, pior que o defeito.
ok(
  casco.every((n) => n.coroa >= 10),
  `e todo prop QUEBRA a linha da crista (coroa mínima ${Math.min(...casco.map((n) => n.coroa))}px, o defeito eram 6)`,
);
// ⚠️ A PROFUNDIDADE ACOMPANHA O PLANTIO, senão quem fica na frente é decidido pela ordem de
// criação — empate de profundidade renderiza certo por acidente.
const ordenado = [...casco].sort((a, b) => a.pe - b.pe);
ok(
  ordenado.every((n, i) => i === 0 || n.depth >= ordenado[i - 1].depth),
  'e quem está plantado mais à FRENTE desenha por cima (depth cresce com o pé)',
);
// ⚠️ A SOMBRA TEM QUE TRANSBORDAR O PROP, E ESTE ASSERT EXISTE PORQUE A PRIMEIRA VERSÃO NÃO
// TRANSBORDAVA. Ela nasceu com 0,9 da largura e centrada ACIMA da linha do pé: desenhava inteira
// atrás do dono e não sobrava um pixel dela na tela. "A sombra existe" passaria verde nessa
// versão invisível; o que se mede é que ela ESCAPA da silhueta.
// ⚠️ E VIZINHOS NÃO REPETEM ALTURA. O olho compara um prop com o SEGUINTE, não com a média da
// faixa — e o sorteio uniforme puro entregou, na primeira execução desta sonda, oito props entre
// 191 e 199. Quem garante o espaçamento é `TerrainSystem.sortearPlantio`, nunca a distribuição.
//
// ⚠️ ESTE ASSERT NÃO PISCA, e isso foi comprado de propósito. A primeira versão do sorteio era
// um laço de até 8 tentativas, que estoura em ~3% das vezes; agora o salto é garantia de
// construção (o sorteio é uniforme sobre as faixas que SOBRAM). 400 mil sorteios: menor salto
// 5, sempre. Se alguém voltar ao laço com teto, este assert começa a piscar — e a resposta é
// consertar o sorteio, nunca afrouxar o piso.
const saltos = pes.slice(1).map((y, i) => Math.abs(y - pes[i]));
ok(
  saltos.every((d) => d >= 5),
  `e nenhum vizinho repete a altura do anterior (menor salto ${saltos.length ? Math.min(...saltos) : 'n/a'}px, piso 5)`,
);
ok(
  casco.every((n) => n.somW !== null && n.somW > n.propW),
  `e cada um tem SOMBRA DE CONTATO mais larga que ele (${JSON.stringify(casco.map((n) => n.somW + '>' + n.propW))})`,
);

// ⚠️ E NENHUMA SOMBRA ÓRFÃ. A sombra não é filha do prop: é um objeto solto que ALGUÉM tem de
// matar. O prop morre por dois caminhos — o culling em `x < −40` e o tiro do jogador, em
// arquivos diferentes — e a limpeza está pendurada no `once('destroy')` do dono justamente para
// cobrir os dois. Uma sombra vazada não quebra nada e não aparece jogando: ela só desliza pela
// fase para sempre. É a lição dos dois caminhos de morte da água-viva, num caso novo.
//
// A contagem é EXATA, e não "<=": sobra significa vazamento, e falta significa que alguma
// sombra morreu antes do dono e há um prop de casco sem base.
const vazamento = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const vivos = s.terrain.props.getChildren().filter(
    (o) => o.active && (o.getData('kind') === 'respiradouro' || o.getData('kind') === 'lancaMisseis'),
  ).length;
  const sombras = s.children.list.filter((o) => o.name === 'sombraCasco').length;
  return { vivos, sombras };
});
console.log('sombras ' + JSON.stringify(vazamento));
ok(
  vazamento.sombras === vazamento.vivos,
  `uma sombra por prop de casco vivo, nem mais nem menos (${vazamento.sombras} sombras / ${vazamento.vivos} props)`,
);


await page.screenshot({ path: 'scripts/_f3/probe-props.png' });

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE');
process.exit(falhas ? 1 : 0);
