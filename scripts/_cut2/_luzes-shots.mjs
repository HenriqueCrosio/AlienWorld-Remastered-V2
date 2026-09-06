import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 384 * 3, height: 216 * 3 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
// janela ANTES do painel abrir (~8.4s depois do keypress): a nave já pousou, a doca visível
// inteira, e ainda dá tempo de amostrar 3 fases de pulso bem espaçadas.
await page.waitForTimeout(4000);
await page.screenshot({ path: 'scripts/_cut2/luz-a.png' });
await page.waitForTimeout(1600);
await page.screenshot({ path: 'scripts/_cut2/luz-b.png' });
await page.waitForTimeout(1600);
await page.screenshot({ path: 'scripts/_cut2/luz-c.png' });

await browser.close();
console.log('ok');
