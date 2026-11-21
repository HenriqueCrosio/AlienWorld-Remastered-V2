// A clean still of the F3 (nebula, Act 1) at t≈8 s: no enemies, no hazards — the background for the crystal sheet.
import { createRequire } from 'module';
const require = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json');
const { chromium } = require('playwright');
const out = process.argv[2];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await b.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 3, ship: 'interceptor' }));
await page.waitForFunction(() => window.__game.scene.getScene('Game')?.ship?.active, null, { timeout: 30000 });
await page.waitForTimeout(800);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.director.next = s.director.script.length; s.waves = []; s.hazardRate = 0; s.propRate = 0;
});
await page.waitForTimeout(6000);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  for (const e of [...s.enemies.enemies.getChildren()]) e.destroy();
  for (const h of [...s.debris.hazards.getChildren()]) h.destroy();
  s.ship.setPosition(-100, -100);
});
await page.waitForTimeout(300);
await page.evaluate(() => window.__game.loop.sleep());
await page.locator('canvas').first().screenshot({ path: out });
await b.close();
console.log('ok');
