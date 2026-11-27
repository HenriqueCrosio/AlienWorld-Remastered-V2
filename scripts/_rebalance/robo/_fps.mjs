// 26/11 — HOW FAST DOES THE GAME RUN under the robots? `?fase=capitania1`, N pages at once in one browser each; for
// 10 s of real time: the frames per second the game made and how much game time went by (Phaser slows its clock
// when the frames are long). The robots' numbers depend on this (the calibration ran 3 at once).
//   node scripts/_rebalance/robo/_fps.mjs [porta=5174] [n=1]
import { chromium } from 'playwright';

const [porta = '5174', n = '1'] = process.argv.slice(2);
const abrir = async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
  await page.goto(`http://localhost:${porta}/?fase=capitania1&mao=mediana`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const g = window.__game?.scene;
    if (!g) return false;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const sc = g.getScene('Game');
    return g.isActive('Game') && sc?.boss && !sc.boss.entering;
  }, null, { timeout: 240000, polling: 100 });
  return { browser, page };
};
const pags = await Promise.all(Array.from({ length: Number(n) }, abrir));
const medir = (page) => page.evaluate(async () => {
  const g = window.__game, sc = g.scene.getScene('Game');
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  const f0 = g.loop.frame, t0 = sc.time.now, r0 = performance.now();
  const dts = [];
  const on = (_t, dt) => dts.push(dt);
  sc.events.on('postupdate', on);
  await new Promise((res) => setTimeout(res, 10000));
  sc.events.off('postupdate', on);
  const real = (performance.now() - r0) / 1000;
  dts.sort((a, b) => a - b);
  return { fps: +((g.loop.frame - f0) / real).toFixed(1), jogoPorReal: +((sc.time.now - t0) / 1000 / real).toFixed(2), dtMediana: +dts[Math.floor(dts.length / 2)].toFixed(1), dtP90: +dts[Math.floor(dts.length * 0.9)].toFixed(1) };
});
const rs = await Promise.all(pags.map(({ page }) => medir(page)));
console.log(`${n} página(s) ao mesmo tempo:`, JSON.stringify(rs));
for (const { browser } of pags) await browser.close();
