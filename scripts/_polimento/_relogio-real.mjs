// 15/10 — THE STAGE CLOCK AGAINST THE WALL CLOCK: starts a stage straight away, lets it run at its own pace (no frame
// stepping; the ship cannot be hurt; no card tables) and logs, every `CADA_MS` of wall-clock time, the stage's `elapsed`
// and the fps. Stops when a sprite with texture `KEY` appears (default: the Leviathan's tail of F3) or after `LIMITE_S`.
// Answers "did the moment X arrive earlier than before?" with a number instead of an impression.
//   node scripts/_polimento/_relogio-real.mjs <stage> [texture key] [limit s] [every ms]   (npm run dev running)
import { chromium } from 'playwright';

const [FASE = '3', KEY = 'raboLeviata', LIMITE_S = '60', CADA = '1000'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate((fase) => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: fase, ship: 'humana', handling: 'diegetico' });
}, Number(FASE));
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
const t0 = Date.now();
for (;;) {
  const r = await page.evaluate((key) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    s.damageShip = () => {};
    s.cartas.abrirMesa = () => {};
    const viu = s.children.list.some((o) => o.texture?.key === key && o.visible);
    return { elapsed: s.elapsed, fps: g.loop.actualFps, viu };
  }, KEY);
  const parede = (Date.now() - t0) / 1000;
  console.log(`wall ${parede.toFixed(1)}s  stage t ${r.elapsed.toFixed(1)}  fps ${r.fps.toFixed(0)}${r.viu ? `  <- ${KEY} on screen` : ''}`);
  if (r.viu || parede > Number(LIMITE_S)) break;
  await page.waitForTimeout(Number(CADA));
}
await browser.close();
