// Throwaway: captura aproximação e destruição da doca2 para mostrar ao Henrique.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');

// Aproximação: nave a caminho, doca visível.
await page.waitForTimeout(5000);
await page.screenshot({ path: 'scripts/_cut2/doca2-aprox.png' });
console.log('aprox capturado');

// Avança até a escolha e a destruição.
await page.waitForTimeout(5000); // pouso + painel abre
await page.keyboard.press('7');
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.press('Enter');
await page.waitForTimeout(1400 + 2200); // destruicao() começa, cadeia de explosões

await page.screenshot({ path: 'scripts/_cut2/doca2-destr.png' });
console.log('destr capturado');

await browser.close();
