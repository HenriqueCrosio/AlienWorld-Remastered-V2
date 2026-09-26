import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F');
const t0 = Date.now();
let ultimo = '';
for (let i = 0; i < 70; i++) {
  const e = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return s.scene.key === 'Interlude4' ? `cap ${s.estado.capitulo} · relógio da cena ${(s.time.now / 1000).toFixed(1)}s` : s.scene.key;
  });
  if (e.split('·')[0] !== ultimo.split('·')[0]) console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s (parede): ${e}`);
  ultimo = e;
  if (e === 'GameOver') break;
  await page.waitForTimeout(1000);
}
await browser.close();
