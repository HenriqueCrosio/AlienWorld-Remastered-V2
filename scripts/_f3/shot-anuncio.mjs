// Throwaway: captura o Ato 1 em t≈25 COM a arte nova do casco, para o Henrique comparar
// lado a lado com scripts/_f3/probe-ato2.png (a virada em t≈48). Não faz parte da suíte.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

const respirar = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.lives !== undefined) s.lives = 9;
  });
const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return { t: Number((s.elapsed ?? 0).toFixed(1)) };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
await page.waitForTimeout(4000);
await respirar();

while ((await estado()).t < 25) {
  await page.waitForTimeout(1500);
  await respirar();
}
console.log('t=' + (await estado()).t);
await page.screenshot({ path: 'scripts/_f3/anuncio-com-arte-nova.png' });

await browser.close();
