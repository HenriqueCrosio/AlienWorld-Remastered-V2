import { chromium } from 'playwright';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.keyboard.press('C');
await page.waitForTimeout(3000);
await page.evaluate(() => { const s = window.__game.scene.getScenes(true)[0]; s.lives = 99; s.invulnerableUntil = 1e15; });
await page.waitForTimeout(3000);
const box = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const b = s.boss;
  return { x: b.sprite.x, y: b.sprite.y, w: b.sprite.displayWidth, h: b.sprite.displayHeight,
           tex: b.sprite.texture.key, escala: b.sprite.scaleX, tint: b.sprite.tintTopLeft.toString(16) };
});
console.log(JSON.stringify(box));
// A tela é 384x216 ampliada 3x (1152x648). Recorta o boss.
const sx = (box.x - box.w / 2) * 3, sy = (box.y - box.h / 2) * 3;
await page.screenshot({
  path: 'probe-capitania-crop.png',
  clip: { x: Math.max(0, sx - 30), y: Math.max(0, sy - 30), width: box.w * 3 + 60, height: box.h * 3 + 60 },
});
await browser.close();
