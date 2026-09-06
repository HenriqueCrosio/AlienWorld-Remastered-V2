import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 768, height: 432 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
await page.waitForTimeout(5200);

const n = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.plataforma.forEach((p) => p.setTint(0xff2d6f));
  return s.plataforma.length;
});
await page.screenshot({ path: 'scripts/_cut2/cord-marcada.png' });

await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.plataforma.forEach((p) => p.setVisible(false));
});
await page.screenshot({ path: 'scripts/_cut2/cord-sem.png' });

await browser.close();

const a = await sharp('scripts/_cut2/cord-marcada.png').toBuffer();
const b = await sharp('scripts/_cut2/cord-sem.png').toBuffer();
await sharp({ create: { width: 768, height: 882, channels: 4, background: { r: 18, g: 18, b: 24, alpha: 1 } } })
  .composite([{ input: a, top: 0, left: 0 }, { input: b, top: 450, left: 0 }])
  .png().toFile('scripts/_cut2/cord-cmp.png');
console.log(`${n} sprites na "cordilheira" — cima: marcados em rosa | baixo: sem eles`);
