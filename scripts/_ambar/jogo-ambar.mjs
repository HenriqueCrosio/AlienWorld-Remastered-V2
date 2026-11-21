// The amber crystals in game: the F3 still (grey and amber side by side), the draw counted in the F3 and the F2, and
// one crystal dying (frames). Writes to the folder given.
import { createRequire } from 'module';
const require = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json');
const { chromium } = require('playwright');
const out = process.argv[2];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
async function fase(n) {
  await page.evaluate((f) => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: f, ship: 'interceptor' }), n);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game')?.ship?.active, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    s.director.next = s.director.script.length; s.waves = []; s.hazardRate = 0; s.propRate = 0;
    for (const e of [...s.enemies.enemies.getChildren()]) e.destroy();
    for (const h of [...s.debris.hazards.getChildren()]) h.destroy();
  });
}
const contar = () => page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const c = {};
  for (let i = 0; i < 800; i++) { const h = s.debris.spawnEm('asteroid', 600, 100); c[h.texture.key] = (c[h.texture.key] ?? 0) + 1; h.destroy(); }
  return c;
});
await fase(2);
const f2 = await contar();
await fase(3);
const f3 = await contar();
await page.waitForTimeout(5000);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  for (const h of [...s.debris.hazards.getChildren()]) h.destroy();
  s.ship.setPosition(40, 190);
  const tex = ['asteroid', 'asteroidAmbar', 'asteroid4', 'asteroidAmbar2', 'asteroid6', 'asteroidAmbar', 'asteroid2', 'asteroidAmbar2'];
  tex.forEach((t, i) => {
    const h = s.debris.spawnEm('asteroid', 70 + i * 40, i % 2 ? 80 : 120);
    h.setTexture(t); h.setScale(1); h.setAngularVelocity(i % 2 ? 0 : 0); h.setVelocity(0, 0); h.setAngle(i * 25); h.setFlipX(false);
  });
});
await page.waitForTimeout(200);
await page.evaluate(() => window.__game.loop.sleep());
await page.locator('canvas').first().screenshot({ path: `${out}/f3-ambar.png` });
await page.evaluate(() => window.__game.loop.wake());
// the death: kill the medium crystal and take a few frames
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const h = s.debris.hazards.getChildren().find((o) => o.texture.key === 'asteroidAmbar2');
  s.killHazard(h, { x: h.x - 20, y: h.y });
});
for (const ms of [60, 200, 450]) {
  await page.waitForTimeout(ms === 60 ? 60 : ms - (ms === 200 ? 60 : 200));
  await page.locator('canvas').first().screenshot({ path: `${out}/morte-${ms}.png`, clip: { x: 300, y: 60, width: 420, height: 380 } });
}
console.log(JSON.stringify({ f2, f3, erros }));
await b.close();
