// 17/10 — ITEM 7 IN MOTION: the F4 mid-plane redrawn at its native size (`_gerar-nativo.mjs`) in the real F4, against
// today's enlarged pieces (a mock in memory, nothing in the code changes). Before the Game scene starts, the textures
// of the organ beat, the machinery glow and the three bridges are swapped for the redraws (the anims are rebuilt from
// the new sheets, 149×198 a frame), and the three layers drop to scale 1: the redraw IS the size they were shown at.
//   <mode> — `nativo` (the redraws) or `hoje` (untouched)
//   node scripts/_polimento/_gif-nativo-f4.mjs <redraws dir> <mode> <t0> <dur s> <out.gif>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [DIR, MODO, T0_S, DUR_S, OUT] = process.argv.slice(2);
const T0 = Number(T0_S), DUR = Number(DUR_S), PASSO = 4;
const u = (f) => '/' + path.posix.join(DIR.replace(/\\/g, '/'), f);
const TROCAS = [
  { key: 'orgaoAnimSheet', url: u('orgao-anim-i2p-11-paleta.png'), quadro: [149, 198], anim: 'f4-orgao-bate' },
  { key: 'maquinarioAnimSheet', url: u('maquinario-anim-i2p-11-paleta.png'), quadro: [149, 198], anim: 'f4-maquinario-brasa' },
  { key: 'f4Ponte', url: u('f4-ponte-edit-11-paleta.png') },
  { key: 'f4Ponte2', url: u('f4-ponte2-edit-11-paleta.png') },
  { key: 'f4Ponte3', url: u('f4-ponte3-edit-11-paleta.png') },
];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
if (MODO === 'nativo') {
  await page.evaluate(async (trocas) => {
    const g = window.__game;
    for (const t of trocas) {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = t.url; });
      if (g.textures.exists(t.key)) g.textures.remove(t.key);
      if (t.quadro) g.textures.addSpriteSheet(t.key, im, { frameWidth: t.quadro[0], frameHeight: t.quadro[1] });
      else g.textures.addImage(t.key, im);
      if (t.anim && g.anims.exists(t.anim)) g.anims.remove(t.anim);
    }
  }, TROCAS);
}
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 4, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.evaluate((nativo) => {
  const g = window.__game;
  g.loop.sleep();
  window.__agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  if (nativo) {
    for (const l of s().parallax.layers) {
      if (!['orgao', 'maquinario', 'f4Ponte'].includes(l.key)) continue;
      l.scale = [1, 1];
      l.sprites.forEach((sp) => sp.setScale(1));
    }
  }
  window.__passos = (k) => {
    for (let i = 0; i < k; i++) {
      if (g.scene.isActive('Game')) {
        const c = s();
        c.damageShip = () => {};
        if (c.cartas) c.cartas.abrirMesa = () => {};
        if (c.golfinho && c.elapsed >= 45) c.matarGolfinho();
      }
      if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
      window.__agora += 1000 / 60;
      g.step(window.__agora, 1000 / 60);
    }
  };
}, MODO === 'nativo');
await page.evaluate(async (t) => {
  const s = () => window.__game.scene.getScene('Game');
  while (!(window.__game.scene.isActive('Game') && s().elapsed >= t)) { window.__passos(10); await new Promise((r) => setTimeout(r, 0)); }
}, T0);

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
// The full-resolution middle frame too: the difference is in the pixel, and the GIF is at 1×.
fs.copyFileSync(quadros[Math.floor(quadros.length / 2)], OUT.replace(/\.gif$/, '.png'));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(OUT, paginas.length, 'frames');
