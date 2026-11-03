// 29/10 — THE ARENA, CLEAN (S1b, spec `2026-10-29-serpente-luta-s1b-design.md` §5): the F3 practice run on a
// deterministic start, until the serpent stands in the breach; then the world is frozen and she is hidden (sprite, veins,
// shadow), the enemies cleared, the ship parked. One native photo (384×216) of the hull band with the breach, under the
// Atmosfera like the rest of the scene — the canvas the crack/tear concepts are baked on, without touching src/.
//   node scripts/_serpente/_arena-foto.mjs <out-dir> [naveX naveY]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, NX = '70', NY = '100'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
await page.evaluate(({ nx, ny }) => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  let a = 20261026;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.Phaser.Math.RND.sow(['20261026']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + (window.__passo.t - t0);
  window.__pisa = (n) => { for (let i = 0; i < n; i++) { window.__passo.t += 1000 / 60; g.step(window.__passo.t, 1000 / 60); } };
  window.__pisa(2);
  g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja'); g.registry.set('sementeMorte', 20261026);
  const velha = g.scene.getScene('Game'); if (velha) velha.cartas = null;
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico', practice: true });
  for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) window.__pisa(1);
  const s = g.scene.getScene('Game');
  s.cartas.abrirMesa = () => {};
  for (let i = 0; i < 4; i++) { if (g.scene.isActive('Cartas')) g.scene.stop('Cartas'); if (g.scene.isPaused('Game')) g.scene.resume('Game'); window.__pisa(12); }
  s.victory = () => {}; s.invulnerableUntil = 1e12; s.lives = 3;
  for (let i = 0; i < 2400 && (!s.boss || s.boss.entering || s.boss.entrada); i++) { s.enemies.enemies.clear(true, true); window.__pisa(1); }
  const b = s.boss;
  b.cdPrincipal = 1e9; b.cdSecundario = 1e9; b.cdInvestida = 1e9;
  for (let i = 0; i < 90; i++) {
    s.enemies.enemies.clear(true, true);
    s.enemies.enemyBullets?.clear(true, true);
    s.ship.setPosition(nx, ny); s.ship.body.setVelocity(0, 0); s.ship.setVisible(true).setAlpha(1);
    window.__pisa(1);
  }
  b.sprite.setVisible(false); b.veias.setVisible(false); b.sombra.setVisible(false);
  g.renderer.preRender(); g.scene.render(g.renderer); g.renderer.postRender();
}, { nx: Number(NX), ny: Number(NY) });
const tela = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
await sharp(tela).resize(384, 216, { kernel: 'nearest' }).png().toFile(path.join(OUT, 'arena.png'));
// the same without the ship (the concepts that move the ship paste its patch: the difference of the two photos)
await page.evaluate(() => {
  const g = window.__game, s = g.scene.getScene('Game');
  s.ship.setVisible(false);
  for (const o of s.children.list) if (o !== s.ship && o.visible && Math.abs(o.x - s.ship.x) < 30 && Math.abs(o.y - s.ship.y) < 20 && o.depth > -1 && o.depth < 30) o.setVisible(false);
  g.renderer.preRender(); g.scene.render(g.renderer); g.renderer.postRender();
});
const tela1 = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
await sharp(tela1).resize(384, 216, { kernel: 'nearest' }).png().toFile(path.join(OUT, 'arena-semnave.png'));
// her too, on frame 0 of form A at a known place, veins and shadow off: how the scene grades HER (the concepts composite
// her raw frames and need her in-game colour; the hull's grade is another — it sits far back)
await page.evaluate(() => {
  const g = window.__game, b = g.scene.getScene('Game').boss;
  b.sprite.anims.stop();
  b.sprite.setTexture('serpenteAnim0').setPosition(300, 110).setVisible(true);
  g.renderer.preRender(); g.scene.render(g.renderer); g.renderer.postRender();
});
const tela2 = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
await sharp(tela2).resize(384, 216, { kernel: 'nearest' }).png().toFile(path.join(OUT, 'ela.png'));
const info = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const casco = s.parallax.layers.find((l) => l.casco);
  return { pecas: casco.sprites.map((p) => ({ x: Math.round(p.x), key: p.texture.key, w: p.width })).sort((a, b) => a.x - b.x) };
});
fs.writeFileSync(path.join(OUT, 'arena.json'), JSON.stringify(info, null, 1));
console.log(erros.length ? erros : 'ok', JSON.stringify(info));
await browser.close();
