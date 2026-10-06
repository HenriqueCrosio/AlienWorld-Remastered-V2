// The REAL F3 backdrops for the art sheets (spec fatia F3 §5): the nebula of act 1 (with the veils) and the hull of
// act 2, photographed at 1× (384×216) with the screen emptied. Phaser's clock frozen and stepped by hand (the
// `_gif.mjs` recipe), the director running (the nebula and the hull ARE its events), every spawn swept away.
//   node scripts/_elites/_fundos-f3.mjs <outDir>   (npm run dev running)
import fs from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.waitForTimeout(600);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.damageShip = () => {};
  s.spawnHazards = () => {};
  s.ship.setVisible(false);
  const g = window.__game;
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
});
const ate = (seg) =>
  page.evaluate(async (seg) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    while (s.elapsed < seg) {
      for (let i = 0; i < 30; i++) {
        window.__passo.t += 1000 / 60;
        g.step(window.__passo.t, 1000 / 60);
      }
      s.enemies.enemies.clear(true, true);
      s.enemies.enemyBullets.getChildren().forEach((b) => b.active && s.enemies.release(b));
      s.debris?.hazards?.clear(true, true);
      s.terrain?.props?.clear(true, true);
      if (s.miniboss?.sprite) s.miniboss.sprite.setVisible(false);
      s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
      s.banner?.setAlpha(0);
      s.bannerFaixa?.setAlpha(0);
    }
    return s.elapsed;
  }, seg);
const foto = async (nome) => {
  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  const png = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  await sharp(png).resize(384, 216, { kernel: 'nearest' }).png().toFile(`${out}/${nome}.png`);
  console.log(nome);
};
console.log('t', await ate(12));
await foto('fundo-nebulosa');
console.log('t', await ate(48));
// The turn to the hull rides on the tail's tween, which the hand-stepped clock does not carry: call it directly.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.children.list.filter((o) => o.texture?.key?.startsWith?.('rabo')).forEach((o) => o.destroy());
  s.escurecerParaOCasco();
});
console.log('t', await ate(56));
await foto('fundo-casco');
await browser.close();
