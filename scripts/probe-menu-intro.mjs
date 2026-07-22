// Sonda da ABERTURA do menu: fotografa um frame NO MEIO da cinemática e prova que ela existe
// (o menu ainda NÃO está montado) e que a tecla PULA para o estado montado.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘ FALHOU'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

// 700ms: dentro da janela da abertura (~3–4s), longe do fim. O menu NÃO deve estar montado.
await page.waitForTimeout(700);
await page.screenshot({ path: 'probe-menu-intro.png' });
const meio = await page.evaluate(() => window.__game.scene.getScene('Menu').settled);
ok(meio === false, 'a 700ms a cinemática ainda ESTÁ rodando (settled=false)');

// Uma tecla PULA a abertura: em seguida o menu tem que estar montado.
await page.keyboard.press('X');
await page.waitForTimeout(150);
const depois = await page.evaluate(() => window.__game.scene.getScene('Menu').settled);
ok(depois === true, 'qualquer tecla PULA a abertura (settled=true após a tecla)');

console.log('screenshot: probe-menu-intro.png');
console.log(falhas === 0 ? '\n✔ ABERTURA OK' : `\n✘ ${falhas} FALHAS`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
