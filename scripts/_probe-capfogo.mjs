// Foto da Capitânia NO CLARÃO DA SALVA (capitania-fire) — treino [C], espera a onda (t≈0.8).
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
// Espera o chefe chegar na posição (entering=false) e a onda começar.
for (let i = 0; i < 40; i++) {
  const st = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const b = s.boss;
    return b && !b.entering ? { anim: b.sprite.anims.currentAnim?.key ?? null } : null;
  });
  if (st?.anim === 'capitania-fire') break;
  await page.waitForTimeout(250);
}
const prova = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const b = s.boss;
  return { anim: b.sprite.anims.currentAnim?.key ?? null, tocando: b.sprite.anims.isPlaying };
});
console.log('salva', JSON.stringify(prova));
await page.screenshot({ path: 'probe-capitania-fogo.png' });
await browser.close();
