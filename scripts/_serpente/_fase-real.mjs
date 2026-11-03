// 29/10 — THE ARENA IN THE REAL RUN (S1b): the F3 from its start (not the practice), on a stepped clock with fixed
// luck, the ship untouchable and the waves cleared, until the serpent stands in her breach. Logs her arrival's steps
// (the hull arriving, the brake, the tremble, the burst, the rise) with the second, and photographs the arena at each.
//   node scripts/_serpente/_fase-real.mjs <out-dir>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  let a = 20261026;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.Phaser.Math.RND.sow(['20261026']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now, seg: 0 };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + (window.__passo.t - t0);
  window.__pisa = (n) => { for (let i = 0; i < n; i++) { window.__passo.t += 1000 / 60; window.__passo.seg += 1 / 60; g.step(window.__passo.t, 1000 / 60); } };
  window.__pisa(2);
  g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja'); g.registry.set('sementeMorte', 20261026);
  const velha = g.scene.getScene('Game'); if (velha) velha.cartas = null;
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico' });
  for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) window.__pisa(1);
  const s = g.scene.getScene('Game');
  s.cartas.abrirMesa = () => {};
  window.__passo.seg = 0;
});
const fotos = [];
let ultimo = '';
for (let q = 0; q < 140 * 4; q++) {
  const r = await page.evaluate(() => {
    const g = window.__game;
    for (let i = 0; i < 15; i++) {
      if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
      if (g.scene.isPaused('Game')) g.scene.resume('Game');
      const s = g.scene.getScene('Game');
      if (!s) return null;
      s.invulnerableUntil = 1e12;
      s.lives = 3;
      s.enemies?.enemies?.clear(true, true);
      s.ship?.setPosition(60, 90);
      window.__pisa(1);
    }
    const s = g.scene.getScene('Game');
    const b = s?.boss;
    return { seg: +window.__passo.seg.toFixed(2), estado: b ? `${b.entrada ?? 'luta'}|${b.entering ? 'entrando' : ''}` : 'sem chefe' };
  });
  if (!r) break;
  if (r.estado !== ultimo) {
    ultimo = r.estado;
    const tela = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
    const arq = path.join(OUT, `${String(fotos.length).padStart(2, '0')}-${r.seg}s.png`);
    await sharp(tela).resize(768, 432, { kernel: 'nearest' }).png().toFile(arq);
    fotos.push([r.seg, r.estado]);
    console.log(r.seg, r.estado);
  }
  if (r.estado === 'luta|') break;
}
console.log(erros.length ? erros : 'sem erro de página');
await browser.close();
