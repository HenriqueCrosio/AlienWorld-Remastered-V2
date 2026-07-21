// Foto do INTERIOR com as camadas orgânicas: corredor largo (t≈7s) e o APERTO (t≈46s).
import { chromium } from 'playwright';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.keyboard.press('L');
await page.waitForTimeout(2000);
const cena = await page.evaluate(() => window.__game.scene.getScenes(true)[0]?.scene.key);
if (cena !== 'Game') { console.error('ABORTADO em ' + cena); await browser.close(); process.exit(1); }
await page.evaluate(() => { const s = window.__game.scene.getScenes(true)[0]; s.lives = 99; s.invulnerableUntil = 1e15; });
await page.waitForTimeout(6000);
await page.screenshot({ path: 'probe-f4-anatomia-1.png' });
await page.evaluate(() => { const s = window.__game.scene.getScenes(true)[0]; s.elapsed = 44; });
await page.waitForTimeout(4000);
await page.screenshot({ path: 'probe-f4-anatomia-2.png' });
await browser.close();
console.log('fotos ok');
