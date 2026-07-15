// A 2ª CUTSCENE: a doca no cinturão (pouso → escolha com 4 naves → a doca explode).
//
// O que só se vê rodando: se a nave POUSA NA PISTA (e não no vazio, como a Aurora fazia antes de
// a linha do convés ser medida), se os cabos ligam a doca às rochas, e se a nave ALIENÍGENA está
// no róster — e só neste.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') console.log(`[console:error] ${m.text()}`);
});

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Interlude2') return { cena: s?.scene.key ?? '?' };

    return {
      cena: s.scene.key,
      nave: { x: Math.round(s.ship.x), y: Math.round(s.ship.y), tex: s.ship.texture.key },
      doca: { x: Math.round(s.doca.x), y: Math.round(s.doca.y), tex: s.doca.texture.key },
      // A PISTA: onde ela está de verdade na tela (é aí que a nave TEM que pousar).
      pistaY: 150,
      rochasAmarradas: s.amarras.length,
      painel: s.panel ? 'aberto' : null,
    };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('O'); // atalho: a 2ª cutscene
await page.waitForTimeout(1500);

console.log('placar   ', JSON.stringify(await estado()));
await page.waitForTimeout(4000);
await page.screenshot({ path: 'probe-doca-aproximacao.png' });
console.log('aproxima ', JSON.stringify(await estado()));

// O pouso acontece por volta de t=8.4s.
await page.waitForTimeout(4500);
const pousada = await estado();
console.log('pousou   ', JSON.stringify(pousada));
await page.screenshot({ path: 'probe-doca-pouso.png' });

// A nave pousou NA PISTA? (a pista está em y=150; a nave assenta 6px acima dela)
const naPista = pousada.nave && Math.abs(pousada.nave.y - (150 - 6)) < 4;
console.log(naPista ? '✔ pousou NA PISTA' : `✘ pousou FORA da pista (y=${pousada.nave?.y}, esperado ~144)`);

// ─── O painel: 4 naves, e a ALIENÍGENA entre elas ───
const roster = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.panel ? s.panel.naves : null;
});
console.log('róster   ', JSON.stringify(roster));
console.log(roster?.includes('alien') ? '✔ o ARAUTO está na doca' : '✘ a nave alienígena NÃO apareceu');

// Escolhe a alienígena (tecla 4) e confirma.
await page.keyboard.press('4');
await page.waitForTimeout(400);
await page.screenshot({ path: 'probe-doca-painel.png' });
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.press('Enter');
await page.waitForTimeout(1500);

console.log('armada   ', JSON.stringify(await estado()));

// A destruição.
await page.waitForTimeout(2200);
await page.screenshot({ path: 'probe-doca-explosao.png' });
console.log('explosão ', JSON.stringify(await estado()));

await page.waitForTimeout(3200);
const fim = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { cena: s?.scene.key };
});
console.log('fim      ', JSON.stringify(fim));

await browser.close();
