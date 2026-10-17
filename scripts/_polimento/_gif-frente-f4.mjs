// 17/10 — THE F4 FOREGROUND CONCEPTS IN MOTION (a mock in memory, nothing in the code changes). A foreground gives
// depth by PARALLAX — it slides faster than the border — and a still photo cannot show that, so this records a GIF.
// Plays the F4 by frame stepping up to T0 (the recipe of `_sequencia.mjs`), then for DUR seconds moves the pieces of
// one concept at depth 60, in one of two placements:
//   borda — rooted on the screen edge, floor and ceiling (flipped), sliding at 1.3× the world (84 px/s). A piece is
//           picked among those whose height ≤ the band's thinnest column over the next 520 px minus 3: it never
//           crosses the border's surface line while it crosses the screen.
//   solto — floating in the middle of the corridor at 1.6× the world, with a slow drift and turn, kept inside the
//           corridor with 10 px of margin from both surfaces: it never touches the border.
//   jogo  — 17/10, after the install: touches NOTHING, the foreground is the game's own `PrimeiroPlanoF4` (pieces dir
//           ignored).
// One photo every 4 game frames (15 fps), at the native 384×216.
// [depth=60]: at 60 the Atmosfera's fog goes over the pieces and melts them into the band; ≥ 99 puts them on the
// CLEAN camera (no fog, no grain), as the nearest thing to the lens.
//   node scripts/_polimento/_gif-frente-f4.mjs <pieces dir> <borda|solto|jogo> <t0> <dur s> <out.gif> [depth=60]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [DIR, MODO, T0_S, DUR_S, OUT, PROF_S = '60'] = process.argv.slice(2);
const T0 = Number(T0_S), DUR = Number(DUR_S), PASSO = 4;
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
await page.evaluate(({ urls, modo, prof }) => {
  const g = window.__game;
  g.loop.sleep();
  window.__agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  let semente = 4243;
  const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
  window.__frente = { pecas: null, vivos: [], prox: [0, 0] };
  // The foreground step: move, retire, spawn. Runs once per game frame, after `g.step`.
  const frente = (dt) => {
    const c = s(), m = c.moldura, F = window.__frente;
    if (!F.pecas || modo === 'jogo') return;
    for (const v of F.vivos) {
      v.o.x -= v.vx * dt;
      if (v.vy) { v.o.y += v.vy * dt; v.o.rotation += v.vr * dt; }
    }
    F.vivos = F.vivos.filter((v) => (v.o.x + v.o.displayWidth + 4 > 0 ? true : (v.o.destroy(), false)));
    if (modo === 'borda') {
      for (const [i, teto] of [false, true].entries()) {
        if (F.vivos.some((v) => v.teto === teto && v.o.x + v.o.displayWidth + F.prox[i] > 384)) continue;
        let banda = 999;
        for (let x = 384; x < 904; x += 4) banda = Math.min(banda, teto ? m.superficieTetoEm(x) : 216 - m.superficieChaoEm(x));
        // ⚠️ TALL ENOUGH TO READ (17/10): the band is darkest at the screen edge and lights up only near its surface (the
        // lava line, the rib arcs). A short piece sits on the dark part and vanishes — so a piece must fill ≥ 55% of it.
        const cabem = F.pecas.filter((p) => p.h <= banda - 3 && p.h >= 0.55 * (banda - 3));
        F.prox[i] = 40 + rnd() * 70;
        if (!cabem.length) continue;
        const p = cabem[Math.floor(rnd() * cabem.length)];
        const o = c.add.image(386, teto ? 0 : 216, p.key).setOrigin(0, teto ? 0 : 1).setFlipY(teto).setDepth(prof);
        F.vivos.push({ o, teto, vx: 84 * 1.3 });
      }
    } else {
      F.prox[0] -= dt;
      if (F.prox[0] <= 0) {
        F.prox[0] = 0.9 + rnd() * 1.6;
        const p = F.pecas[Math.floor(rnd() * F.pecas.length)];
        const teto = m.superficieTetoEm(400), chao = m.superficieChaoEm(400);
        const folga = 10 + Math.max(p.w, p.h) / 2;
        if (chao - teto > 2 * folga) {
          const y = teto + folga + rnd() * (chao - teto - 2 * folga);
          const o = c.add.image(400, y, p.key).setDepth(prof).setRotation(rnd() * 6.28);
          F.vivos.push({ o, vx: 84 * 1.6, vy: (rnd() - 0.5) * 8, vr: (rnd() - 0.5) * 0.8 });
        }
      }
      // Never touching the border: a fragment the corridor narrows onto is pushed back inside it.
      for (const v of F.vivos) {
        const x = Math.max(0, Math.min(383, v.o.x)), r = Math.max(v.o.displayWidth, v.o.displayHeight) / 2 + 10;
        v.o.y = Math.max(m.superficieTetoEm(x) + r, Math.min(m.superficieChaoEm(x) - r, v.o.y));
      }
    }
  };
  window.__passos = (k) => {
    for (let i = 0; i < k; i++) {
      if (g.scene.isActive('Game')) {
        s().damageShip = () => {};
        if (s().cartas) s().cartas.abrirMesa = () => {};
        if (s().golfinho && s().elapsed >= 45) s().matarGolfinho();
      }
      if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
      frente(1 / 60);
      window.__agora += 1000 / 60;
      g.step(window.__agora, 1000 / 60);
    }
  };
  window.__carregar = async () => {
    const c = s(), pecas = [];
    for (let i = 0; i < urls.length; i++) {
      const key = `frente-gif-${i}`;
      await new Promise((res, rej) => { const im = new Image(); im.onload = () => { c.textures.addImage(key, im); res(); }; im.onerror = rej; im.src = urls[i]; });
      const f = c.textures.get(key).getSourceImage();
      pecas.push({ key, w: f.width, h: f.height });
    }
    window.__frente.pecas = pecas;
  };
}, { urls, modo: MODO, prof: Number(PROF_S) });
// Up to T0 − 4s without pieces, then 4s of warm-up so the screen is already populated when the GIF starts.
await page.evaluate(async (t) => {
  const s = () => window.__game.scene.getScene('Game');
  while (!(window.__game.scene.isActive('Game') && s().elapsed >= t)) { window.__passos(10); await new Promise((r) => setTimeout(r, 0)); }
}, T0 - 4);
if (MODO !== 'jogo') await page.evaluate(() => window.__carregar());
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
