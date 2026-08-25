// A FATIA 4 — a apresentação da doca do cinturão. Entra pelo atalho [O] do menu.
// Ela ASSERTA (não só fotografa): cada achado desta fatia vira uma condição que reprova.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '✔ ' : '✘ ') + msg);
  if (!cond) falhas++;
};

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const acha = (k) =>
      s.children.list.find((o) => o.texture && o.texture.key === k) ?? null;
    const ceu = acha('paintBgCut2');
    return {
      cena: s.scene.key,
      ceu: ceu ? { x: Math.round(ceu.x), y: Math.round(ceu.y), d: ceu.depth } : null,
      temParallaxPixel: !!s.parallax,
      doca: (() => {
        const d = acha('docaCinturao');
        return d ? { x: Math.round(d.x), y: Math.round(d.y), s: d.scaleX } : null;
      })(),
      luaPartida: acha('planetShattered') !== null,
      cordilheira: s.plataforma === undefined ? 'removida' : s.plataforma.length,
      amarras: s.amarras.map((a) => ({ x: Math.round(a.ancoraX), y: Math.round(a.ancoraY) })),
    };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
await page.waitForTimeout(2500);

const e = await estado();
console.log('estado', JSON.stringify(e));

ok(e.cena === 'Interlude2', 'está na Interlude2');
ok(e.ceu !== null, 'a PINTURA do cinturão está na cena');
ok(e.ceu !== null && e.ceu.d === -110, 'a pintura está no depth -110 (atrás do starfield)');
ok(e.temParallaxPixel === false, 'o parallax pixel foi APOSENTADO (a pintura o substituiu)');
ok(e.doca !== null, 'a DOCA NOVA está na cena');
ok(e.doca !== null && Number.isInteger(e.doca.s), 'a doca está em escala INTEIRA');
ok(e.cordilheira === 'removida', 'o chão falso foi APAGADO (a doca flutua)');
ok(e.luaPartida === false, 'a lua partida (planetShattered) NÃO está na cena — três luas viraram duas');

// AS ÂNCORAS DOS CABOS: as três não podem se amontoar num só ponto — isso é o defeito medido no
// passe de correção original (18px de largura de doca, um cluster no terço esquerdo). O vão entre
// a mais à esquerda e a mais à direita tem que ser uma fração real da largura da doca (256px hoje,
// arte inteira), não um punhado de pixels. 100px é bem menos que os ~127px que a geometria atual
// entrega ((PAD_X1 − PAD_X0) × 2/3 = 191 × 2/3), mas é bem mais que os 18px do defeito — se
// alguém reintroduzir o cluster, isto acusa.
const xsAncora = e.amarras.map((a) => a.x);
const vaoAncoras = Math.max(...xsAncora) - Math.min(...xsAncora);
ok(vaoAncoras >= 100, `as âncoras dos cabos se espalham pela doca (vão=${vaoAncoras}px de 256px)`);

await page.screenshot({ path: 'probe-cut2-aproximacao.png' });

// ─── AS LUZES DA DOCA (Fatia visual: "faça as luzes piscarem, trazer volumetria") ───
//
// `criarLuzes()` põe um `colonyLight` aditivo por ponto medido, no depth DEPTH_LUZ (71, um
// degrau acima da doca em 70). A contagem tem que bater com o que `scripts/_cut2-luzes.mjs`
// mediu (~31 hoje) — nem 0 (guarda falhou / textura sumiu) nem centenas (limiar frouxo demais).
const lightAlphas = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return s.children.list
      .filter((o) => o.texture && o.texture.key === 'colonyLight' && o.depth === 71)
      .map((o) => Number(o.alpha.toFixed(4)));
  });

const alphasA = await lightAlphas();
console.log('luzes', alphasA.length, JSON.stringify(alphasA.slice(0, 6)));
ok(alphasA.length >= 10 && alphasA.length <= 40, `contagem de luzes plausível (${alphasA.length})`);

// ASSERTA ESTADO REAL, NÃO PRINT: amostra o alfa de TODA luz duas vezes, com tempo de sobra pro
// pulso mais lento (o tween mais longo dura até 2200ms + 1800ms de atraso) virar de fase.
await page.waitForTimeout(4200);
const alphasB = await lightAlphas();
console.log('luzes+4.2s', JSON.stringify(alphasB.slice(0, 6)));

const mudou = alphasA.some((a, i) => Math.abs(a - (alphasB[i] ?? a)) > 0.02);
ok(
  alphasA.length > 0 && mudou,
  'ao menos uma luz mudou de alfa entre as duas amostras (está piscando, não só desenhada)',
);

// A CENA É ESTÁTICA — "a imagem precisa estar estatica e a nave que chega" (Henrique). A doca
// costumava deslizar da direita e a pintura costumava derivar; as duas coisas foram cortadas.
// Sonda amostra a doca e a pintura duas vezes, a alguns segundos de distância, e reprova se
// QUALQUER uma das duas tiver andado um pixel — o assert é sobre estado real (x amostrado),
// não sobre print.
await page.waitForTimeout(2500);
const e2 = await estado();
console.log('estado+2.5s', JSON.stringify(e2));

ok(
  e.doca !== null && e2.doca !== null && e2.doca.x === e.doca.x,
  `a doca NÃO se move (x=${e.doca?.x} em t0, x=${e2.doca?.x} em t0+2.5s)`,
);
ok(
  e.ceu !== null && e2.ceu !== null && e2.ceu.x === e.ceu.x,
  `a pintura NÃO se move (x=${e.ceu?.x} em t0, x=${e2.ceu?.x} em t0+2.5s)`,
);

// ─── ACHADO 1 DA REVISÃO: AS LUZES TÊM QUE SUMIR JUNTO COM A DOCA ───
//
// `destruicao()` afunda e apaga `this.doca` (e a nave da vaga) num tween de alpha — mas até esta
// correção não guardava referência aos ~31 objetos de `criarLuzes()`, então a doca sumia e as
// ~31 lâmpadas continuavam piscando a alfa cheia, penduradas no vazio. Nenhuma sonda existente
// chegava a rodar a destruição inteira; esta é a primeira a provar que `this.luzes` (agora nos
// `targets` do tween de afundamento) segura essa correção.
//
// Pelo relógio da cena, o pouso já devia ter terminado: `roteiro()` chama `pouso()` em t=6200,
// e as tweens de pouso levam mais 2200ms até chamar `escolha()` — bem menos que os ~9.2s já
// esperados acima.
const painelAberto = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.panel !== null;
});
ok(painelAberto, 'o painel de escolha está aberto (pouso concluído)');

if (painelAberto) {
  // Escolhe o ARAUTO (7º e último de ROSTER_DOCA) — dispara escolher() → destruicao().
  await page.keyboard.press('7');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter'); // seleciona
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter'); // confirma → escolher(), que agenda destruicao() em +1400ms

  // Dentro de `destruicao()`: o tween de afundamento nasce em +3000ms e dura 1200ms (termina em
  // +4200ms); `avancar()` troca de cena em +4400ms. Amostra em +4180ms — o mais tarde possível
  // sem cruzar a troca de cena, com o tween a ~98% do caminho (alpha já bem perto de 0 se a
  // correção segurar; ainda em ~1 se ela não segurar, porque as luzes não fazem parte do tween).
  await page.waitForTimeout(1400 + 4180);

  const fimDestruicao = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Interlude2') return null;
    return {
      docaAlpha: s.doca ? Number(s.doca.alpha.toFixed(3)) : null,
      nLuzes: Array.isArray(s.luzes) ? s.luzes.length : -1,
      luzAlphas: Array.isArray(s.luzes)
        ? s.luzes.slice(0, 8).map((o) => Number(o.alpha.toFixed(3)))
        : [],
    };
  });
  console.log('destruição', JSON.stringify(fimDestruicao));

  ok(
    fimDestruicao !== null && fimDestruicao.nLuzes > 0,
    `o array de luzes ainda tem objetos para checar (${fimDestruicao?.nLuzes})`,
  );
  ok(
    fimDestruicao !== null && fimDestruicao.docaAlpha !== null && fimDestruicao.docaAlpha < 0.2,
    `a doca sumiu perto do fim da destruição (alpha=${fimDestruicao?.docaAlpha})`,
  );
  ok(
    fimDestruicao !== null &&
      fimDestruicao.luzAlphas.length > 0 &&
      fimDestruicao.luzAlphas.every((a) => a < 0.2),
    `as LUZES sumiram JUNTO com a doca, não ficaram piscando no vazio (alphas=${JSON.stringify(fimDestruicao?.luzAlphas)})`,
  );
} else {
  falhas++;
  console.log('✘ painel de escolha não abriu a tempo — não foi possível testar a destruição/luzes');
}

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE');
process.exit(falhas ? 1 : 0);
