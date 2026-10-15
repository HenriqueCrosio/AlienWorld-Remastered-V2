// 14/10 — BEFORE × AFTER, LIVE, without touching the game's code: plays a stage up to `t` (frame stepping, the
// dolphin killed, card tables closed), freezes, photographs, runs a JS snippet against the scene `s` (the proposed
// fix, applied in memory), renders one frame and photographs again. For showing a fix before writing it.
//   node scripts/_polimento/_antes-depois.mjs <stage> <t> <out prefix> "<js using s>"   (npm run dev running)
import { chromium } from 'playwright';

const [FASE, T, OUT, JS] = process.argv.slice(2);
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
await page.evaluate(async (alvo) => {
  const g = window.__game;
  g.loop.sleep();
  window.__agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  const fecharMesa = () => {
    if (g.scene.isActive('Cartas')) {
      g.scene.stop('Cartas');
      g.scene.resume('Game');
    }
  };
  const passos = (k) => {
    for (let i = 0; i < k; i++) {
      if (g.scene.isActive('Game')) s().damageShip = () => {};
      window.__agora += 1000 / 60;
      g.step(window.__agora, 1000 / 60);
    }
  };
  while (!(g.scene.isActive('Game') && s().elapsed >= alvo)) {
    // No card tables at all in a photo run (the table's text lives in the separate HD layer, which a stop of
    // `Cartas` does not close).
    if (g.scene.isActive('Game') && s().cartas) s().cartas.abrirMesa = () => {};
    fecharMesa();
    if (g.scene.isActive('Game') && s().golfinho && s().elapsed >= 45) s().matarGolfinho();
    passos(60);
    await new Promise((r) => setTimeout(r, 0));
  }
  // A late card table (it opens 400 ms after the dolphin dies) must not cover the photo.
  // (`scene.stop` is queued: one more step applies it.)
  for (let k = 0; k < 4; k++) { passos(30); fecharMesa(); passos(1); }
}, Number(T));
const foto = async (arq) => {
  const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  await page.screenshot({ path: arq, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
};
await foto(`${OUT}-antes.png`);
await page.evaluate((js) => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  new Function('s', 'g', js)(s, g);
  window.__agora += 0.01;
  g.step(window.__agora, 0.01);
}, JS);
await foto(`${OUT}-depois.png`);
await browser.close();
console.log(`${OUT}-antes.png / -depois.png`);
