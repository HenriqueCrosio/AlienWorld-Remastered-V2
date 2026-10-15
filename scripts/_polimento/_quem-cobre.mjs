// 14/10 — WHO COVERS THIS PIXEL: jumps a stage to `t`, waits, and lists every visible display object whose bounds
// contain each given screen point (native 384×216 coordinates), front to back, with texture, depth, alpha, tint and
// bounds. Also saves the frame. For tracking down hard edges and seams found by the sweep.
//   node scripts/_polimento/_quem-cobre.mjs <stage> <t> <out.png> x,y [x,y …]   (npm run dev running)
import { chromium } from 'playwright';

const [FASE, T, OUT, ...PONTOS] = process.argv.slice(2);
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
await page.waitForTimeout(500);
if (T.startsWith('~')) {
  // `~t`: PLAYED up to t (frame stepping, mesas skipped): reaches what `skipTo` does not replay (the F3 cloud
  // opening onto the hull, the F4 chambers' borders…).
  await page.evaluate(async (alvo) => {
    const g = window.__game;
    g.loop.sleep();
    let agora = g.loop.now;
    const s = () => g.scene.getScene('Game');
    while (!(g.scene.isActive('Game') && s().elapsed >= alvo)) {
      if (g.scene.isActive('Cartas')) {
        g.scene.stop('Cartas');
        g.scene.resume('Game');
      }
      // The script holds its clock until the dolphin dies (`seguraEm`): kill it on arrival, as the sweep does.
      if (g.scene.isActive("Game")) { if (s().cartas) s().cartas.abrirMesa = () => {}; if (s().golfinho && s().elapsed >= 45) s().matarGolfinho(); }
      for (let i = 0; i < 60; i++) {
        if (g.scene.isActive('Game')) s().damageShip = () => {};
        agora += 1000 / 60;
        g.step(agora, 1000 / 60);
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    g.loop.wake();
  }, Number(T.slice(1)));
} else {
  await page.evaluate((t) => {
    const s = window.__game.scene.getScene('Game');
    s.damageShip = () => {};
    s.elapsed = t;
    s.director.skipTo(t);
    s.aplicaCorredorEMoldura?.(t);
  }, Number(T));
  await page.waitForTimeout(4000);
}
const r = await page.evaluate((pts) => {
  const g = window.__game;
  g.loop.sleep();
  const s = g.scene.getScene('Game');
  const out = {};
  const todos = [];
  const varre = (lista) => {
    for (const o of lista) {
      if (o.list) varre(o.list);
      if (!o.visible || o.alpha === 0 || !o.getBounds) continue;
      todos.push(o);
    }
  };
  varre(s.children.list);
  for (const p of pts) {
    const [x, y] = p.split(',').map(Number);
    out[p] = todos
      .filter((o) => {
        const b = o.getBounds();
        return x >= b.x && x <= b.right && y >= b.y && y <= b.bottom;
      })
      .sort((a, b) => b.depth - a.depth)
      .map((o) => {
        const b = o.getBounds();
        return `${o.type} ${o.texture?.key ?? o.name ?? ''} d=${o.depth} a=${(o.alpha ?? 1).toFixed(2)} tint=${(o.tintTopLeft ?? 0xffffff).toString(16)} sc=${(o.scaleX ?? 1).toFixed(2)} [${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}×${Math.round(b.height)}]`;
      });
  }
  return out;
}, PONTOS);
const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
await page.screenshot({ path: OUT, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
for (const [p, l] of Object.entries(r)) console.log(`── ${p}\n  ${l.join('\n  ')}`);
await browser.close();
