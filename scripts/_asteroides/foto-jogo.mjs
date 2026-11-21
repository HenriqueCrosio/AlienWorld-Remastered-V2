// A still of the F2 in game: the stage frozen, the six new asteroids laid out, and the mining drones on both rocks.
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
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 2, ship: 'interceptor' }));
await page.waitForFunction(() => window.__game.scene.getScene('Game')?.ship?.active, null, { timeout: 30000 });
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.director.next = s.director.script.length; s.waves = []; s.hazardRate = 0; s.propRate = 0;
  for (const e of [...s.enemies.enemies.getChildren()]) e.destroy();
  for (const h of [...s.debris.hazards.getChildren()]) h.destroy();
  const tex = ['asteroid', 'asteroid2', 'asteroid3', 'asteroid4', 'asteroid5', 'asteroid6'];
  const out = [];
  tex.forEach((t, i) => {
    const h = s.debris.spawnEm('asteroid', 140 + i * 38, 40);
    h.setTexture(t); h.setScale(1); h.setAngularVelocity(0); h.setVelocity(0, 0); h.setAngle(0);
    out.push([t, h.displayWidth]);
  });
  // two miners, one on each rock (the luck picks the rock; force them)
  const d1 = s.enemies.spawn('droneMineracao', 120, 190);
  const d2 = s.enemies.spawn('droneMineracao', 120, 300);
  const rochas = s.debris.hazards.getChildren().filter((h) => h.getData('kind') === 'mineravel');
  return { out, rochas: rochas.map((r) => [r.texture.key, Math.round(r.x), Math.round(r.y)]), drones: [d1, d2].map((d) => [Math.round(d.x), Math.round(d.y)]) };
});
await page.evaluate(() => { const g = window.__game; g.loop.sleep(); });
await page.locator('canvas').first().screenshot({ path: out });
console.log(JSON.stringify(info), erros);
await b.close();
