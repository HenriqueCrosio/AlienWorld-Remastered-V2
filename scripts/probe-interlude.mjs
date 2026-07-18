// A CUTSCENE: placar → o casco da AURORA sobe e vira o horizonte → a nave arqueia e POUSA no
// convés → escolha de nave → o casco implode → ela decola → Fase 2.
//
// ⚠️ O ESPAÇO é a tecla de PULAR aqui. Uma sonda que continua flapando depois de matar a Torre
// atravessa a cena inteira num frame. Rompida a atmosfera não há gravidade: pare de flapar.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return {
      cena: s?.scene.key,
      fase: s?.stage?.id ?? null,
      arma: s?.weapons?.current?.name ?? null,
      naveX: s?.ship ? Number(s.ship.x.toFixed(0)) : null,
      naveY: s?.ship ? Number(s.ship.y.toFixed(0)) : null,
      naveTex: s?.ship?.texture?.key ?? null,
      painel: s?.panel ? 'aberto' : null,
      roster: s?.panel?.naves ?? null,
    };
  });

const foto = (n) => page.screenshot({ path: `probe-cut-${n}.png` });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Entra direto na cutscene: o que se testa aqui é a CENA, não a Fase 1.
//
// PARA o Menu antes. `SceneManager.start()` NÃO encerra a cena que já estava no ar (só
// `scene.start()` de DENTRO de uma cena faz isso) — as duas ficavam ativas, e o `2` da escolha
// de nave era lido pelo menu também, que iniciava a Fase 1 por baixo da cutscene.
await page.evaluate(() => {
  window.__game.scene.stop('Menu');
  window.__game.scene.start('Interlude', { score: 4820, handling: 'diegetico' });
});

await page.waitForTimeout(1200);
await foto('1-placar');
console.log('placar    ', JSON.stringify(await estado()));

await page.waitForTimeout(4200);
await foto('2-aproximacao');
console.log('aproxima  ', JSON.stringify(await estado()));

await page.waitForTimeout(3400);
await foto('3-pouso');
console.log('pouso     ', JSON.stringify(await estado()));

// A escolha: sem ela a cena PARA de propósito.
await page.waitForTimeout(1600);
await foto('4-menu');
const menu = await estado();
console.log('menu      ', JSON.stringify(menu));
if (menu.painel !== 'aberto') {
  console.error('✘ ABORTADO: o painel de escolha NÃO abriu — nada abaixo mede coisa alguma.');
  await browser.close();
  process.exit(1);
}
console.log(
  Array.isArray(menu.roster) && menu.roster.length === 4 && menu.roster.includes('verde')
    ? `✔ róster da Aurora: ${JSON.stringify(menu.roster)}`
    : `✘ róster errado: ${JSON.stringify(menu.roster)} (esperava 4 naves do v2)`,
);

// Escolhe a BOMBARDEIRA (tecla 2) e confirma — ENTER seleciona, ENTER confirma.
await page.keyboard.press('2');
await page.waitForTimeout(300);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.press('Enter');
await page.waitForTimeout(600);

// ⚠️ A armadilha 26: a IMAGEM tem que trocar junto com a escolha (anims.stop antes do setTexture).
const armada = await estado();
console.log('armada    ', JSON.stringify(armada));
console.log(
  armada.naveTex === 'shipVerde'
    ? '✔ a nave da cena VIROU a Bombardeira (a imagem não mente)'
    : `✘ escolheu a Bombardeira mas a cena mostra '${armada.naveTex}'`,
);

await page.waitForTimeout(2200);
await foto('5-implosao');
console.log('implosão  ', JSON.stringify(await estado()));

await page.waitForTimeout(1800);
await foto('6-decolagem');
console.log('decolagem ', JSON.stringify(await estado()));

await page.waitForTimeout(4000);
const fim = await estado();
console.log('FASE 2    ', JSON.stringify(fim));
console.log(
  fim.cena === 'Game' && fim.arma === 'OBUS'
    ? '✔ caiu na Fase 2 com a arma da nave escolhida (OBUS)'
    : `✘ esperava GameScene com OBUS; veio ${fim.cena}/${fim.arma}`,
);

await browser.close();
