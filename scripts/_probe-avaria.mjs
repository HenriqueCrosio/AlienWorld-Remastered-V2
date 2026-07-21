// Foto da nave AVARIADA (última vida): fumaça seguindo o casco + motor tossindo.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.keyboard.press('3');
await page.waitForTimeout(1600);
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 1; // última vida: a avaria tem que aparecer
  s.invulnerableUntil = 0; // sem piscar na foto
});
await page.waitForTimeout(1500);
const estado = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { fumaca: s.fumaca.emitting, timeScale: Number(s.ship.anims.timeScale.toFixed(2)) };
});
console.log('avaria', JSON.stringify(estado));
await page.screenshot({ path: 'probe-avaria.png' });
await page.waitForTimeout(600);
await page.screenshot({ path: 'probe-avaria-2.png' });
await browser.close();
