// 17/10 — ITEM 10, BEFORE × AFTER: the top of the screen (HUD line + boss bar) in the F1 boss fight and in the F2.
// ⚠️ The wait to t is capped (2000 × 10 frames): an uncapped loop hung once after the shots.
// `antes` puts the old HUD back in memory (the conduction's dev label, the bar at y=16); `depois` is today's code.
//   node scripts/_polimento/_hud-antes-depois.mjs <out dir>
import { chromium } from 'playwright';

const OUT = process.argv[2];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
for (const [fase, t, chefao, nome] of [[1, 6, true, "f1"], [2, 10, false, "f2"]]) {
  await page.evaluate((fase) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.scene.start('Game', { stage: fase, ship: 'humana', handling: 'diegetico' });
  }, fase);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
  await page.evaluate(async ({ t, chefao }) => {
    const g = window.__game;
    g.loop.sleep();
    let agora = g.loop.now;
    const s = () => g.scene.getScene('Game');
    const passo = () => { const c = s(); c.damageShip = () => {}; if (c.cartas) c.cartas.abrirMesa = () => {}; if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); } agora += 1000 / 60; g.step(agora, 1000 / 60); };
    for (let n = 0; s().elapsed < t && n < 2000; n++) { for (let i = 0; i < 10; i++) passo(); await new Promise((r) => setTimeout(r, 0)); }
    if (chefao) { s().spawnBoss(); for (let i = 0; i < 240; i++) passo(); }
    window.__passo = passo;
  }, { t, chefao });
  for (const modo of ['depois', 'antes']) {
    await page.evaluate((antes) => {
      const c = window.__game.scene.getScene('Game');
      if (antes) {
        const orig = c.updateHud.bind(c);
        c.updateHud = () => { orig(); c.hud.setText(c.hud.text.replace(/^(1G|ZERO-G)   /, `$1 ${c.controller.label}   `)); };
        if (c.boss) { c.boss.barBg?.setY(16); c.boss.bar?.setY(16); }
      }
      window.__passo(); window.__passo();
    }, modo === 'antes');
    const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width }; });
    const arq = `${OUT}/hud-${nome}-${modo}.png`;
    await page.screenshot({ path: arq, clip: { x: c.x, y: c.y, width: c.w, height: 90 } });
  }
}
await browser.close();
console.log('ok', OUT);
