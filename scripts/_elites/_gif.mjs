// A GIF of an F2 elite IN GAME, at real speed (the recipe of `_gif-cartas.mjs`: Phaser's clock frozen and stepped by
// hand, 1/60 s per step, one photo every 3 steps = 20 fps). Clean F2 (script off), untouchable ship.
//   node scripts/_elites/_gif.mjs <out.gif> <drone|sentinela> [seconds] [zoom]   (npm run dev running)
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, CENA = 'drone', SEG = '8', ZOOM_ARG = '2'] = process.argv.slice(2);
const ZOOM = Number(ZOOM_ARG);
const QUADRO = 1000 / 60;
const POR_FOTO = 3;

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
  g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.waitForTimeout(600);

await page.evaluate((cena) => {
  const s = window.__game.scene.getScene('Game');
  s.director.update = () => [];
  s.spawnHazards = () => {};
  s.enemies.enemies.clear(true, true);
  s.debris.hazards.clear(true, true);
  s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
  s.banner.setAlpha(0);
  s.bannerFaixa.setAlpha(0);
  s.damageShip = () => {};
  s.invulnerableUntil = 0;
  s.ship.setPosition(60, cena === 'drone' ? 100 : 108);
  s.enemies.spawn(cena === 'drone' ? 'droneMineracao' : 'sentinela', cena === 'drone' ? 92 : 108);
  // Fixed luck: same shots every recording.
  let a = 20261005;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const g = window.__game;
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
}, CENA);

const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { k: c.width / 384, left: c.left, top: c.top };
});
const passo = (n) =>
  page.evaluate(({ n, QUADRO }) => {
    const g = window.__game;
    for (let i = 0; i < n; i++) {
      window.__passo.t += QUADRO;
      g.step(window.__passo.t, QUADRO);
    }
  }, { n, QUADRO });

// The staging: the drone works ~2.5 s (the window to kill it), then the ship drifts closer and it wakes. The sentinel
// does its cycles on its own while the ship holds the line and fires (the shots die on the shield).
const quadros = [];
const total = Math.round((Number(SEG) * 60) / POR_FOTO);
for (let i = 0; i < total; i++) {
  const t = (i * POR_FOTO) / 60;
  await page.evaluate(({ cena, t }) => {
    const s = window.__game.scene.getScene('Game');
    const e = s.enemies.enemies.getChildren().find((x) => x.active);
    if (cena === 'drone' && t > 2.5 && e?.getData('elite')?.fase === 'minerando') s.ship.setPosition(Math.min(s.ship.x + 3, e.x - 70), s.ship.y);
    // 06/10: the ship backs off while it attacks — the bursts read FROM AFAR (their spacing) — then lets it close in.
    if (cena === 'drone' && t < 8.5 && e?.getData('elite')?.fase === 'ataque') s.ship.setPosition(Math.max(16, Math.min(s.ship.x, e.x - 130)), s.ship.y);
    if (cena === 'sentinela' && e) s.ship.setPosition(60, s.ship.y + Math.sign(e.y - s.ship.y) * Math.min(1.5, Math.abs(e.y - s.ship.y)));
  }, { cena: CENA, t });
  if (CENA === 'sentinela' && i === 20) await page.keyboard.down('Space');
  await passo(POR_FOTO);
  const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  quadros.push(await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer());
}
await page.keyboard.up('Space');
await browser.close();
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros');
