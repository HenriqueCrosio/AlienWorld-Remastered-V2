import { chromium } from 'playwright';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.keyboard.press('C');
await page.waitForTimeout(2500);
await page.evaluate(() => { const s = window.__game.scene.getScenes(true)[0]; s.lives = 99; s.invulnerableUntil = 1e15; });
// Espera o chefe estacionar e o idle voltar (fim de uma salva).
for (let i = 0; i < 60; i++) {
  const st = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const b = s.boss;
    if (!b || b.entering) return null;
    return {
      anim: b.sprite.anims.currentAnim?.key ?? null,
      tint: b.sprite.tintTopLeft.toString(16),
      blend: b.sprite.blendMode,
      alpha: b.sprite.alpha,
    };
  });
  if (st?.anim === 'capitania-idle') { console.log('idle', JSON.stringify(st)); break; }
  await page.waitForTimeout(250);
}
await page.screenshot({ path: 'probe-capitania-idle.png' });
await browser.close();
