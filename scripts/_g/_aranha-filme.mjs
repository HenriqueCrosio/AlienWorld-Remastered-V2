// 27/10 — THE SPIDER OF THE CAVE, filmed in the game (src/f1/aranhaCaverna.ts): the F1 jumps to 30 s and is stepped at
// 60 Hz with the ship parked (x 70, y 120) and untouchable, through the whole hall; a photo every 2 steps (30 fps).
// Two films: the whole screen at 3×, and the ceiling (y 14–98, under the HUD) at 4× — and the spider's state along the way.
//   node scripts/_g/_aranha-filme.mjs <outDir> [de=41] [ate=57]
// Needs `npm run dev` on :5173.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { webm } from '../_menu/_webm.mjs';

const [OUT, DE = '41', ATE = '57'] = process.argv.slice(2);
const de = Number(DE), ate = Number(ATE);
fs.mkdirSync(OUT, { recursive: true });
const dirs = { tela: path.join(OUT, 'q-tela'), teto: path.join(OUT, 'q-teto') };
for (const d of Object.values(dirs)) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1000);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' }));
await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) > 0.5, null, { timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game, s = g.scene.getScene('Game');
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  s.invulnerableUntil = 1e12;
  if (s.cartas) s.cartas.intocavel = () => true;
  s.elapsed = 30;
  s.director.skipTo(30);
});
const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { x: c.left, y: c.top, width: c.width, height: c.height };
});
const passos = (n) => page.evaluate((n) => {
  const g = window.__game, s = g.scene.getScene('Game');
  for (let i = 0; i < n; i++) {
    window.__passo.t += 1000 / 60;
    g.step(window.__passo.t, 1000 / 60);
    s.ship.x = 70; s.ship.y = 120; s.ship.body?.setVelocity?.(0, 0);
  }
  const a = s.children.list.find((o) => o.texture?.key === 'f1-aranha');
  return { t: +s.elapsed.toFixed(2), aranha: a ? { x: a.x, y: a.y, q: a.frame.name, vis: a.visible } : null };
}, n);

let e = await passos(1);
while (e.t < de) e = await passos(30);
const linhas = [];
let i = 0;
while (e.t < ate) {
  e = await passos(2);
  if (i % 15 === 0) linhas.push(`${e.t}s ${e.aranha ? `${e.aranha.vis ? 'vê' : '--'} ${e.aranha.q} (${e.aranha.x}, ${e.aranha.y})` : 'sem aranha'}`);
  const foto = await page.screenshot({ clip: geo });
  const nome = `q${String(i).padStart(4, '0')}.png`;
  await sharp(foto).resize(1152, 648, { kernel: 'nearest' }).png().toFile(path.join(dirs.tela, nome));
  // (two steps: a second `resize` in one sharp chain REPLACES the first — the 1st take cropped the HUD corner)
  const nativo = await sharp(foto).resize(384, 216, { kernel: 'nearest' }).png().toBuffer();
  await sharp(nativo).extract({ left: 30, top: 14, width: 354, height: 84 })
    .resize(354 * 4, 84 * 4, { kernel: 'nearest' }).png().toFile(path.join(dirs.teto, nome));
  i++;
}
console.log(linhas.join('\n'));
for (const [n, d] of Object.entries(dirs)) await webm(d, path.join(OUT, `aranha-${n}.webm`), 30);
console.log(`${i} quadros`, erros.length ? 'erros: ' + erros.join(' | ') : 'sem erro de página');
await browser.close();
