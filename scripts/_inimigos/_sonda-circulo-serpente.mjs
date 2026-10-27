// 27/10 — the serpent's live head: where its hit circle sits against the drawn head (the glow), in each phase.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log('ERRO', String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico', practice: true });
});
for (let k = 0; k < 300; k++) {
  const r = await page.evaluate(() => {
    const g = window.__game, s = g.scene.getScene('Game');
    if (!s?.cartas) return false;
    s.cartas.abrirMesa = () => {};
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    s.invulnerableUntil = 1e12;
    return !!s.boss && !s.boss.entering;
  });
  if (r) break;
  await page.waitForTimeout(100);
}
await page.waitForTimeout(300);
console.log(await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const c = s.boss.targets[0], b = c.body;
  return JSON.stringify({ cabeca: { x: Math.round(c.x), y: Math.round(c.y) }, circulo: { x: Math.round(b.center.x), y: Math.round(b.center.y), r: Math.round(b.halfWidth) } });
}));
await browser.close();
