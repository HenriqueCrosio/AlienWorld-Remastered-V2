// Throwaway: screenshot no momento de aproximação, para mostrar ao Henrique a cena estática.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
await page.waitForTimeout(4000); // meio da aproximação: nave em voo, doca e pintura já paradas
await page.screenshot({ path: 'scripts/_cut2/t2-estatico.png' });
await browser.close();
console.log('screenshot salvo em scripts/_cut2/t2-estatico.png');
