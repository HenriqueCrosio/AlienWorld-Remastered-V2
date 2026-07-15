// A CORRENTE DA CAMPANHA: Fase 1 → matar a Torre → romper a atmosfera → Fase 2, sem passar
// pela tela de fim. É a transição mais fácil de quebrar e a que nenhum teste de unidade pega.
//
// A sonda não sabe jogar: no flap, PARAR de flapar é cair no chão e morrer. Toda espera aqui
// é feita flapando, e as vidas são forçadas para cima — o que se testa é a TRANSIÇÃO, não a
// habilidade de quem está no controle.
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
      fase: s?.stage?.id,
      nome: s?.stage?.name,
      zona: s?.zone,
      conducao: s?.controller?.id,
      chefao: s?.boss ? 'vivo' : null,
    };
  });

/** Espera flapando e imortal. Sem isto a nave cai, morre, e o teste vira um teste do GameOver. */
async function voar(ms) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    await page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      if (s?.lives !== undefined) s.lives = 9;
    });
    await page.keyboard.press('Space');
    await page.waitForTimeout(110);
  }
}

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.keyboard.press('1'); // menu: diegético -> Fase 1
await voar(800);
console.log('início    ', JSON.stringify(await estado()));

await page.keyboard.press('G'); // dev: pula direto para o chefão
await voar(5000);
console.log('no chefão ', JSON.stringify(await estado()));

// Deixa a Torre quase morta e o tiro automático do flap termina o serviço.
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (s?.boss) s.boss.hp = 2;
});
await voar(3000);
console.log('morta     ', JSON.stringify(await estado()));

// Rompe a atmosfera: a física muda EM PLENO VOO e a zero-G é a recompensa.
await voar(4000);
await page.screenshot({ path: 'probe-chain-zerog.png' });
console.log('zero-G    ', JSON.stringify(await estado()));

// ...e só DEPOIS a Fase 2 entra.
await voar(6000);
console.log('entrega   ', JSON.stringify(await estado()));
await page.screenshot({ path: 'probe-chain-fase2.png' });

await browser.close();
