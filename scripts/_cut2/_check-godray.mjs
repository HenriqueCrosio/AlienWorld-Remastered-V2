import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
await page.waitForTimeout(4000);
const info = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const rays = s.children.list.filter(o => o.texture && o.texture.key === 'godRay');
  const halos = s.children.list.filter(o => o.texture && o.texture.key === 'colonyLight' && o.depth < 71);
  const core = s.children.list.filter(o => o.texture && o.texture.key === 'colonyLight' && o.depth === 71);
  return { rays: rays.map(r => ({x: Math.round(r.x), y: Math.round(r.y), alpha: r.alpha, scale: [r.scaleX, r.scaleY], angle: r.angle})), halos: halos.length, core: core.length };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
