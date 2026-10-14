// A GIF of an F4 elite IN GAME, at real speed, in the REAL chamber: stage 4 jumped to `t` (the wall, the corridor and
// its tables as the script leaves them), then the script is frozen and the elite is spawned alone.
//   node scripts/_elites/_gif-f4-jogo.mjs <out.gif> <larva|tubo|tubos> <t> [seconds] [zoom]   (npm run dev running)
//   larva @ t=20 (chamber A) or 75 (duct) · tubo @ t=9 (chamber A) · tubos @ t=57 (the squeeze: floor + ceiling)
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, CENA = 'larva', T0 = '20', SEG = '9', ZOOM_ARG = '2'] = process.argv.slice(2);
const ZOOM = Number(ZOOM_ARG);
const QUADRO = 1000 / 60;
const POR_FOTO = 3;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 4, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.waitForTimeout(600);

await page.evaluate((t) => {
  const s = window.__game.scene.getScene('Game');
  s.damageShip = () => {};
  if (s.golfinho) s.encerrarGolfinho(false);
  s.elapsed = t;
  s.director.skipTo(t);
  s.aplicaCorredorEMoldura(t);
  s.director.update = () => []; // the script stops here: the chamber stays as it is
  s.spawnHazards = () => {};
}, Number(T0));
// The wall chases its target at 8px/s; 7s cover the worst jump (the `_fundos-f4` recipe).
await page.waitForTimeout(7000);

await page.evaluate((cena) => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  s.enemies.enemies.clear(true, true);
  s.debris.hazards.clear(true, true);
  s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
  s.banner.setAlpha(0);
  s.bannerFaixa.setAlpha(0);
  s.invulnerableUntil = 0;
  s.ship.setPosition(70, 108);
  // Fixed luck: same posts every recording.
  let a = 20261013;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  if (cena === 'larva') s.enemies.spawn('larva', 100);
  if (cena === 'tubo' || cena === 'tubos') s.enemies.spawn('tubo', 190);
  if (cena === 'tubos') s.time.delayedCall(3000, () => s.enemies.spawn('tubo', 30));
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

// The staging: the ship holds the middle of the gap in front of it and does not fire — the pupae hatch, the rings pass.
const quadros = [];
const total = Math.round((Number(SEG) * 60) / POR_FOTO);
for (let i = 0; i < total; i++) {
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const meio = (s.moldura.superficieTetoEm(70) + s.moldura.superficieChaoEm(70)) / 2;
    s.ship.setPosition(70, s.ship.y + Math.sign(meio - s.ship.y) * Math.min(1.5, Math.abs(meio - s.ship.y)));
  });
  await passo(POR_FOTO);
  const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  quadros.push(await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer());
}
await browser.close();
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros');
