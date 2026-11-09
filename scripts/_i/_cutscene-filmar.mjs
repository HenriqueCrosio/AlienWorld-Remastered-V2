// BLOCO I, etapa 1 (09/11) — a CUTSCENE FILMED on a stepped clock (plan `plans/2026-11-09-bloco-i-explosoes.md` Task 7):
// it starts the scene by its key, steps it 1/60 s at a time and starts recording at the first new explosion on screen
// (a sprite whose texture is `explosao-…`), for `--dur` s. 30 fps, ×2 nearest.
//   node scripts/_i/_cutscene-filmar.mjs <out-dir> [--cena Interlude] [--dur 5] [--antes 0]
// (with `npm run dev` running; do not touch src/ or .html while it runs — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args[0], CENA = val('--cena', 'Interlude'), DUR = Number(val('--dur', 5));
fs.mkdirSync(OUT, { recursive: true });
const Q = path.join(OUT, 'q');
fs.rmSync(Q, { recursive: true, force: true });
fs.mkdirSync(Q, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.addInitScript(() => {
  const base = 1762560000000;
  let k = 0;
  Date.now = () => base + (k += 16);
});
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(500);
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const clip = { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k };

await page.evaluate((cena) => {
  const g = window.__game;
  window.Phaser.Math.RND.sow(['20261109']);
  g.loop.sleep();
  window.__t = g.loop.now;
  window.__pisa = (n) => { for (let i = 0; i < n; i++) { window.__t += 1000 / 60; g.step(window.__t, 1000 / 60); } };
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  window.__pisa(2);
  g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja');
  g.scene.start(cena, { score: 0, handling: 'diegetico' });
  window.__pisa(2);
}, CENA);

// step until the first new explosion is on screen (at most 40 s)
const achou = await page.evaluate((cena) => {
  const g = window.__game;
  for (let i = 0; i < 60 * 40; i++) {
    window.__pisa(1);
    const s = g.scene.getScene(cena);
    if (!s || !g.scene.isActive(cena)) return -1;
    // the cutscenes wait on the card table (`mesaDaCutscene` launches the 'Cartas' scene): choose its first card
    // through the table's own callback, and close it
    if (g.scene.isActive('Cartas')) {
      const d = g.scene.getScene('Cartas').sys.settings.data;
      g.scene.stop('Cartas');
      d?.onEscolha?.(d.opcoes[0]?.id ?? d.opcoes[0]);
      // the table is drawn on the HD text layer (another canvas on top), which does not close with the scene: hide it
      // for this film (the cutscene's text cards go with it — the film is about the explosions)
      for (const c of document.querySelectorAll('canvas')) if (c !== g.canvas) c.style.visibility = 'hidden';
    }
    if (s.children.list.some((o) => o.texture?.key?.startsWith('explosao-'))) return i / 60;
  }
  return -2;
}, CENA);
console.log('primeira explosão nova em', achou, 's');
let n = 0;
if (achou >= 0) {
  for (let f = 0; f < DUR * 30; f++) {
    await page.evaluate(() => window.__pisa(2));
    const tela = await page.screenshot({ clip });
    await sharp(tela).resize(768, 432, { kernel: 'nearest' }).png().toFile(path.join(Q, `${String(n++).padStart(5, '0')}.png`));
    if (f === 30 || f === 60) await sharp(tela).resize(384, 216, { kernel: 'nearest' }).png().toFile(path.join(OUT, `foto-${f / 30}s.png`));
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(Q, '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(OUT, 'video.mp4')]);
  console.log(`video: ${n} quadros`);
}
console.log(erros.length ? erros : 'sem erro de página');
await browser.close();
