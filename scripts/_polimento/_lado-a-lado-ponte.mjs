// 17/10 — ITEM 7, THE BRIDGE INSTALLED: a fair still of the old enlarged bridge (`assets/raw/f4-ponte*-original.png` at
// ×1.48) and the installed native one (the game's own `f4Ponte*` at 0.955 — the same 1.48 on screen), one at a time in
// the same spot of the real F4, with the layer's origin, tint and depth, under the same Atmosfera. Same harness as
// `_lado-a-lado-nativo.mjs`: the game is stepped to T0 and the mid-plane is emptied and stopped.
//   node scripts/_polimento/_lado-a-lado-ponte.mjs <t0> <out dir>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [T0_S, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
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
  g.scene.start('Game', { stage: 4, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.evaluate(async (t0) => {
  const g = window.__game;
  g.loop.sleep();
  let agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  const passo = () => {
    const c = s();
    c.damageShip = () => {};
    if (c.cartas) c.cartas.abrirMesa = () => {};
    if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
    agora += 1000 / 60;
    g.step(agora, 1000 / 60);
  };
  while (s().elapsed < t0) { for (let i = 0; i < 10; i++) passo(); await new Promise((r) => setTimeout(r, 0)); }
  const c = s();
  for (const n of ['', '2', '3']) {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `/assets/raw/f4-ponte${n}-original.png`; });
    c.textures.addImage(`velhaPonte${n}`, im);
  }
  for (const l of c.parallax.layers) {
    if (!['orgao', 'maquinario', 'f4Ponte'].includes(l.key)) continue;
    l.sprites.forEach((sp) => sp.destroy());
    l.sprites.length = 0;
    l.nextX = 1e9;
  }
  window.__passo = passo;
}, Number(T0_S));
const shot = async (arq) => {
  const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  await page.screenshot({ path: arq, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
};
for (const n of ['', '2', '3'])
  for (const [nome, tex, esc] of [['antes', `velhaPonte${n}`, 1.48], ['depois', `f4Ponte${n}`, 0.955]]) {
    await page.evaluate(([tex, esc]) => {
      const c = window.__game.scene.getScene('Game');
      c.children.list.filter((o) => o.getData?.('ladoALado')).forEach((o) => o.destroy());
      const l = c.parallax.layers.find((k) => k.key === 'f4Ponte');
      c.add.image(192, l.baseY, tex).setOrigin(0.5, 1).setDepth(l.depth).setTint(l.tint).setScale(esc).setData('ladoALado', true);
      window.__game.step(window.__game.loop.now + 16, 16);
    }, [tex, esc]);
    await shot(path.join(OUT, `ponte${n || '1'}-${nome}.png`));
  }
await browser.close();
console.log('ok', OUT);
