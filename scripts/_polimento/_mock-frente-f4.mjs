// 17/10 — THE F4 FOREGROUND CONCEPTS ON THE REAL STAGE (a mock in memory, nothing in the code changes). Plays the F4
// by frame stepping (the recipe of `_sequencia.mjs`) and, at each time, lays the pieces of one concept along the floor
// and the ceiling at depth 60 (in front of everything, where the old `derelict` foreground lived): a piece every
// 40–110 px, picked among those that FIT the band under it — its height ≤ the band's thinnest column under the piece
// minus 3 px, so it never crosses the border's surface line. Ceiling pieces are the same pieces flipped.
//   node scripts/_polimento/_mock-frente-f4.mjs <pieces dir> <out prefix> <t...>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [DIR, OUT, ...TS] = process.argv.slice(2);
const urls = fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort().map((f) => '/' + path.posix.join(DIR.replace(/\\/g, '/'), f));
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
  window.__ate = async (alvo) => {
    while (!(g.scene.isActive('Game') && s().elapsed >= alvo)) {
      if (g.scene.isActive('Game')) {
        s().damageShip = () => {};
        if (s().cartas) s().cartas.abrirMesa = () => {};
        if (s().golfinho && s().elapsed >= 45) s().matarGolfinho();
      }
      if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
      window.__agora += 1000 / 60;
      g.step(window.__agora, 1000 / 60);
      await new Promise((r) => setTimeout(r, 0));
    }
  };
});
for (const t of TS) {
  await page.evaluate((a) => window.__ate(a), Number(t));
  const n = await page.evaluate(async ({ urls, t }) => {
    const s = window.__game.scene.getScene('Game');
    if (!window.__pecas) {
      window.__pecas = [];
      for (let i = 0; i < urls.length; i++) {
        const key = `frente-mock-${i}`;
        await new Promise((res, rej) => { const im = new Image(); im.onload = () => { s.textures.addImage(key, im); res(); }; im.onerror = rej; im.src = urls[i]; });
        const f = s.textures.get(key).getSourceImage();
        window.__pecas.push({ key, w: f.width, h: f.height });
      }
    }
    (window.__mock ?? []).forEach((o) => o.destroy());
    window.__mock = [];
    let semente = Math.round(t * 7919) % 2147483647 || 1;
    const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
    const m = s.moldura;
    for (const teto of [false, true]) {
      for (let x = -10 + rnd() * 40; x < 394; ) {
        const banda = (w) => { let b = 999; for (let xi = Math.max(0, Math.floor(x)); xi <= Math.min(383, x + w); xi++) b = Math.min(b, teto ? m.superficieTetoEm(xi) : 216 - m.superficieChaoEm(xi)); return b; };
        const cabem = window.__pecas.filter((p) => p.h <= banda(p.w) - 3);
        if (cabem.length) {
          const p = cabem[Math.floor(rnd() * cabem.length)];
          window.__mock.push(s.add.image(Math.round(x), teto ? 0 : 216, p.key).setOrigin(0, teto ? 0 : 1).setFlipY(teto).setDepth(60));
          x += p.w + 40 + rnd() * 70;
        } else x += 20;
      }
    }
    // The loop sleeps: one step so the frame on the canvas is drawn WITH the pieces (the photo is the last render).
    window.__agora += 1000 / 60;
    window.__game.step(window.__agora, 1000 / 60);
    return window.__mock.length;
  }, { urls, t: Number(t) });
  const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  const arq = `${OUT}-t${t}.png`;
  await page.screenshot({ path: arq, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
  console.log(arq, n, 'pieces');
}
await browser.close();
