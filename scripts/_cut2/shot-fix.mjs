// Throwaway: screenshot do momento em que a doca está inteira em quadro, pós-fix dos cabos/risca.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
// Doca assentada (entrada terminada), nave já pousada, painel ainda não escolhido — cabos e
// risca bem visíveis, nada tapando.
await page.waitForTimeout(7500);

await page.screenshot({ path: 'scripts/_cut2/t2-fix.png' });
await browser.close();
console.log('screenshot salvo em scripts/_cut2/t2-fix.png');
