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
      camadas: (p?.layers ?? []).map((l) => ({
        key: l.key,
        n: l.sprites.length,
        alpha: l.sprites[0] ? Number(l.sprites[0].alpha.toFixed(3)) : null,
        primeiroPlano: !!l.primeiroPlano,
        casco: !!l.casco,
      })),
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
  s.terrain.spawn = (kind) => {
    window.__nasc.push({ kind, t: Number((s.elapsed ?? 0).toFixed(2)) });
    return orig(kind);
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
  'e está INVISÍVEL na metade do Ato 1 — o casco só nasce quando o rabo afunda',
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
// ELE SE SEGURA NA DIREITA, com o corpo sangrando para fora da borda — não atravessa a tela.
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
ok(
  naVirada.topo < 0 && naVirada.base > 216,
  `SANGRANDO do quadro em cima E embaixo (y ${naVirada.topo}..${naVirada.base}, tela 0..216)`,
);
ok(naVirada.nebulaDim > 0.5, `chega AINDA DENTRO da nuvem (nebulaDim=${naVirada.nebulaDim})`);
ok(naVirada.corpo === null, 'o rabo NÃO tem corpo físico (é cenário, não inimigo)');
await page.screenshot({ path: 'scripts/_f3/probe-rabo.png' });

// ─── O TOCO: a nadadeira sai pelo rodapé e o casco NASCE dali ───
//
// ⚠️ ESTE É O ASSERT DA COSTURA, e ele existe porque a versão anterior fazia um CORTE. O
// mergulho é uma ROTAÇÃO em torno do pedúnculo: a nadadeira desce 206px e sai da tela, e o
// toco — que está no pivô — praticamente não sai do lugar. Depois dele, e só depois, o casco
// começa. Se este assert reprovar com o casco já em 1, alguém religou o casco ao relógio do
// roteiro e a costura virou corte de novo.
while ((await estado()).t < 47) {
  await page.waitForTimeout(400);
  await respirar();
}
const noToco = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const r = s.children.list.find((o) => o.texture && o.texture.key === 'raboLeviata');
  return {
    t: Number((s.elapsed ?? 0).toFixed(1)),
    cascoReveal: Number(s.parallax.cascoReveal.toFixed(2)),
    n: r ? 1 : 0,
    angulo: r ? Number(r.angle.toFixed(1)) : null,
    y: r ? Math.round(r.y) : null,
    depth: r ? r.depth : null,
  };
});
console.log('toco    ' + JSON.stringify(noToco));
ok(noToco.n === 1, `o TOCO ainda está em cena em t=${noToco.t}`);
// ⚠️ O SINAL FAZ PARTE DO ASSERT. A primeira versão pedia `angulo > 20` — só o TAMANHO do giro —
// e passou verde numa implementação que mandava a nadadeira para CIMA, atravessando o topo do
// quadro. Quem reprovou foi a captura de tela. Com y para baixo, ângulo NEGATIVO é o que desce.
ok(noToco.angulo !== null && noToco.angulo < -20, `e ele GIROU para BAIXO (${noToco.angulo}°) — a nadadeira saiu pelo rodapé`);
ok(noToco.depth === -76, `atrás da faixa do casco (depth ${noToco.depth}) — ele afunda POR BAIXO do chão novo`);
ok(noToco.cascoReveal > 0, `e o casco JÁ COMEÇOU a nascer dele (cascoReveal=${noToco.cascoReveal})`);
await page.screenshot({ path: 'scripts/_f3/probe-toco.png' });

// O ATO 2: o rabo afundou e o casco é a superfície.
//
// ⚠️ A ESPERA É t<50, E O NÚMERO IMPORTA. Ela era t<47, o que bastava quando o casco já estava
// de pé desde t=21. Agora ele NASCE do mergulho e só fecha em t=48 — amostrar em 47 pegava a
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
ok(
  casco2.some((c) => c.key === 'cascoLeviata'),
  'a BASE do casco usa a arte nova (cascoLeviata)',
);
ok(
  casco2.some((c) => c.key === 'cascoDetalhe'),
  'a PONTUAÇÃO do casco existe (cascoDetalhe)',
);
ok(
  !casco2.some((c) => c.key === 'derelict'),
  'o destroço genérico saiu da camada do casco',
);
// A base é a MAIORIA: mais sprites que a pontuação, por construção do gap.
const base = casco2.find((c) => c.key === 'cascoLeviata');
const det = casco2.find((c) => c.key === 'cascoDetalhe');
ok(
  base && det && base.n > det.n,
  `os trechos lisos são a MAIORIA da faixa (base ${base?.n} > pontuação ${det?.n})`,
);
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
// `aparar-casco.mjs` — e ele já reprova na FONTE se sobrar borda preta.
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
ok(riscos === 0, `nenhum RISCO de emenda na faixa (${riscos} colunas pretas de 1px entre vizinhos claros)`);

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


await page.screenshot({ path: 'scripts/_f3/probe-props.png' });

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE');
process.exit(falhas ? 1 : 0);
