// Throwaway: screenshot do momento de aproximação com a doca INTEIRA.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 384, height: 216 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
await page.waitForTimeout(4500); // aproximação: nave já entrou, ainda não pousou
await page.screenshot({ path: 'scripts/_cut2/t2-inteira.png' });
await browser.close();
console.log('screenshot salva em scripts/_cut2/t2-inteira.png');
