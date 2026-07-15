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
      escolhendo: s?.escolhendo ?? null,
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
await page.waitForTimeout(500);
await foto('4-menu');
console.log('menu      ', JSON.stringify(await estado()));

await page.keyboard.press('2'); // LANÇA
await page.waitForTimeout(2200);
await foto('5-implosao');
console.log('implosão  ', JSON.stringify(await estado()));

await page.waitForTimeout(1800);
await foto('6-decolagem');
console.log('decolagem ', JSON.stringify(await estado()));

await page.waitForTimeout(3000);
console.log('FASE 2    ', JSON.stringify(await estado()));

await browser.close();
