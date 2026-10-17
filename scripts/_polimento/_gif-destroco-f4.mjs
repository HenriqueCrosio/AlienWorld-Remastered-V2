// 17/10 — ITEM 8 IN MOTION: the F4 `destroco` concepts in the real F4 (a mock in memory, nothing in the code changes).
// Plays the F4 by frame stepping up to T0 (the recipe of `_sequencia.mjs`), then swaps what a `destroco` spawn draws:
//   <pieces dir> — every hazard `destroco` is drawn with one of the dir's pieces, at SCALE 1 (the art law: the variant
//                  is drawn at its native size, so the F4 no longer enlarges it), hitbox 0.7 of the art as today;
//   atual        — today's game, untouched (the F2 grey hull, 0.9–1.6) — the "before".
// To have something to look at, one extra `destroco` is pushed into the corridor every ~1.1 s (Math.random: a mock).
// One photo every 4 game frames (15 fps), at the native 384×216.
//   node scripts/_polimento/_gif-destroco-f4.mjs <pieces dir | atual> <t0> <dur s> <out.gif>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [DIR, T0_S, DUR_S, OUT] = process.argv.slice(2);
const T0 = Number(T0_S), DUR = Number(DUR_S), PASSO = 4;
const urls = DIR === 'atual' ? [] : fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort().map((f) => '/' + path.posix.join(DIR.replace(/\\/g, '/'), f));

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
await page.evaluate(() => {
  const g = window.__game;
  g.loop.sleep();
  window.__agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  window.__extra = { ativo: false, prox: 0 };
  window.__passos = (k) => {
    for (let i = 0; i < k; i++) {
      if (g.scene.isActive('Game')) {
        const c = s();
        c.damageShip = () => {};
        if (c.cartas) c.cartas.abrirMesa = () => {};
        if (c.golfinho && c.elapsed >= 45) c.matarGolfinho();
        const E = window.__extra;
        if (E.ativo && (E.prox -= 1 / 60) <= 0) {
          E.prox = 0.8 + Math.random() * 0.6;
          const m = c.moldura, teto = m.superficieTetoEm(383), chao = m.superficieChaoEm(383);
          if (chao - teto > 70) c.debris.spawnEm('destroco', 424, teto + 32 + Math.random() * (chao - teto - 64));
        }
      }
      if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
      window.__agora += 1000 / 60;
      g.step(window.__agora, 1000 / 60);
    }
  };
  window.__carregar = async (urls) => {
    const c = s(), keys = [];
    for (let i = 0; i < urls.length; i++) {
      const key = `destroco-gif-${i}`;
      await new Promise((res, rej) => { const im = new Image(); im.onload = () => { c.textures.addImage(key, im); res(); }; im.onerror = rej; im.src = urls[i]; });
      keys.push(key);
    }
    if (keys.length) {
      const orig = c.debris.spawnEm.bind(c.debris);
      c.debris.spawnEm = (kind, x, y) => {
        const h = orig(kind, x, y);
        if (kind !== 'destroco') return h;
        h.setTexture(keys[Math.floor(Math.random() * keys.length)]).setScale(1);
        const b = h.body;
        b.setSize(h.width * 0.7, h.height * 0.7);
        b.reset(h.x, h.y);
        h.setVelocityX(b.velocity.x || -84);
        return h;
      };
      // What is already on screen keeps today's art; clear it so the GIF shows only the concept.
      for (const h of c.debris.hazards.getChildren().slice()) if (h.getData('kind') === 'destroco') h.destroy();
    }
    window.__extra.ativo = true;
  };
});
await page.evaluate(async (t) => {
  const s = () => window.__game.scene.getScene('Game');
  while (!(window.__game.scene.isActive('Game') && s().elapsed >= t)) { window.__passos(10); await new Promise((r) => setTimeout(r, 0)); }
}, T0 - 4);
await page.evaluate((u) => window.__carregar(u), urls);
// 4s of warm-up so the corridor is already populated when the GIF starts.
await page.evaluate(async () => { for (let i = 0; i < 240; i += 10) { window.__passos(10); await new Promise((r) => setTimeout(r, 0)); } });

const tmp = fs.mkdtempSync(path.join(path.dirname(OUT), '.tmp-gif-'));
const quadros = [];
for (let n = 0; n < Math.round((DUR * 60) / PASSO); n++) {
  await page.evaluate((k) => window.__passos(k), PASSO);
  const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  const arq = path.join(tmp, `${String(n).padStart(3, '0')}.png`);
  await page.screenshot({ path: arq, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
  quadros.push(arq);
}
await browser.close();
const paginas = [];
for (const q of quadros) paginas.push(await sharp(q).resize(384, 216, { kernel: 'nearest' }).png().toBuffer());
await sharp(paginas, { join: { animated: true } }).gif({ delay: Array(paginas.length).fill(67), loop: 0 }).toFile(OUT);
fs.copyFileSync(quadros[Math.floor(quadros.length / 2)], OUT.replace(/\.gif$/, '.png'));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(OUT, paginas.length, 'frames');
