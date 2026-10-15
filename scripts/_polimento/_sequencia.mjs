// 15/10 — A STRIP OF PHOTOS OF ONE STRETCH OF A STAGE: plays the stage up to `T0` by frame stepping (the dolphin killed,
// no card tables, the ship cannot be hurt — the same recipe as `_antes-depois.mjs`), then photographs every `PASSO`
// seconds of stage time up to `T1`, and logs where the named objects are (x, y, depth, visible). An optional JS
// snippet runs against the scene `s` right after `T0` (a fix tried in memory, as in `_antes-depois.mjs`).
// ⚠️ Stepping runs faster than the wall clock and the tweens follow the wall clock (see the memory of 14/10): use this
// for WHERE things are, never for how long they take.
//   node scripts/_polimento/_sequencia.mjs <stage> <t0> <t1> <step s> <out prefix> ["<js using s>"]
import { chromium } from 'playwright';

const [FASE, T0, T1, PASSO, OUT, JS = ''] = process.argv.slice(2);
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
await page.evaluate(() => {
  const g = window.__game;
  g.loop.sleep();
  window.__agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  window.__passos = (k) => {
    for (let i = 0; i < k; i++) {
      if (g.scene.isActive('Game')) {
        s().damageShip = () => {};
        if (s().cartas) s().cartas.abrirMesa = () => {};
        if (s().golfinho && s().elapsed >= 45) s().matarGolfinho();
      }
      if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
      window.__agora += 1000 / 60;
      g.step(window.__agora, 1000 / 60);
    }
  };
  window.__ate = async (alvo) => {
    while (!(g.scene.isActive('Game') && s().elapsed >= alvo)) {
      // Only as many frames as the target needs (≤ 30 at a time): a fixed 30 overshot fine steps by up to 0.5s.
      const falta = g.scene.isActive('Game') ? Math.ceil((alvo - s().elapsed) * 60) : 30;
      window.__passos(Math.max(1, Math.min(30, falta)));
      await new Promise((r) => setTimeout(r, 0));
    }
  };
});
await page.evaluate((t) => window.__ate(t), Number(T0));
// What the snippet returns is printed (handy for reading positions: "return ...").
if (JS) console.log(await page.evaluate((js) => new Function('s', 'g', js)(window.__game.scene.getScene('Game'), window.__game), JS));
const foto = async (arq) => {
  const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  await page.screenshot({ path: arq, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
};
let n = 0;
for (let t = Number(T0); t <= Number(T1) + 1e-6; t += Number(PASSO)) {
  await page.evaluate((a) => window.__ate(a), t);
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const o = s.children.list.filter((c) => c.visible && (['juntaChao', 'juntaTeto'].includes(c.name) || c.getData?.('kind') === 'garganta'));
    return { t: s.elapsed, o: o.map((c) => `${c.name || c.getData('kind')} x${Math.round(c.x)} y${Math.round(c.y)} d${c.depth} ${c.texture.key}`) };
  });
  // The index keeps frames apart when the step is finer than the 0.1s of the name (a strip for a GIF).
  const arq = `${OUT}-${String(n++).padStart(3, '0')}-t${info.t.toFixed(1)}.png`;
  await foto(arq);
  console.log(arq, '|', info.o.join(' | '));
}
await browser.close();
