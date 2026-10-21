// Photographs Stage 1 at several moments (immortal ship parked in a corner) for the G block review.
import { chromium } from 'playwright';
import path from 'node:path';

const out = process.argv[2];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
page.on('pageerror', (e) => console.log(`[page error] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' });
});
await page.waitForTimeout(400);
await page.evaluate(() => {
  setInterval(() => {
    const s = window.__game.scene.getScene('Game');
    if (!s) return;
    s.invulnerableUntil = 1e12;
    if (s.ship) { s.ship.x = 30; s.ship.y = 30; s.ship.body?.setVelocity?.(0, 0); }
  }, 60);
});

let last = 400;
for (const t of [4000, 10000, 16000, 22000, 28000, 34000, 40000, 46000, 52000, 58000]) {
  await page.waitForTimeout(t - last);
  last = t;
  const canvas = await page.$('canvas');
  await canvas.screenshot({ path: path.join(out, `f1-${String(t / 1000).padStart(2, '0')}s.png`) });
}
await browser.close();
console.log('ok');
