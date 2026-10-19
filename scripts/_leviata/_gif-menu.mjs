// BLOCO D — the menu crossing at real speed (the `_gif-final-cap4.mjs` mould): the loop sleeps as soon as the Menu
// scene is up and each `step` moves 1/60 s; one photo every 3 steps. The top of the screen (the sky band the
// Leviathan crosses), ×2. A second GIF follows the creature, cropped around it, ×4.
//   node scripts/_leviata/_gif-menu.mjs <outDir> [segundos=14]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, SEG_S = '14'] = process.argv.slice(2);
const QUADRO = 1000 / 60, POR_FOTO = 3, SEG = Number(SEG_S);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.getScene('Menu')?.sys?.isActive(), null, { polling: 4, timeout: 30000 });
// ⚠️ Phaser's TweenManager keeps its own clock on Date.now() (the crossing is a tween): it follows the stepped clock.
await page.evaluate(() => {
  const g = window.__game;
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + Math.round(window.__passo.t - t0);
});
const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { k: c.width / 384, left: c.left, top: c.top };
});
const faixa = [], perto = [];
for (let i = 0; i < Math.round((SEG * 60) / POR_FOTO); i++) {
  const lev = await page.evaluate(({ n, QUADRO }) => {
    const g = window.__game;
    for (let k = 0; k < n; k++) { window.__passo.t += QUADRO; g.step(window.__passo.t, QUADRO); }
    const l = g.scene.getScene('Menu').leviatan;
    return l ? { x: l.x, y: l.y } : null;
  }, { n: POR_FOTO, QUADRO });
  const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  const nat = await sharp(foto).resize(384, 216, { kernel: 'nearest' }).png().toBuffer();
  faixa.push(await sharp(nat).extract({ left: 0, top: 0, width: 384, height: 120 }).resize(768, 240, { kernel: 'nearest' }).png().toBuffer());
  const cx = Math.max(0, Math.min(384 - 128, Math.round((lev?.x ?? 0) - 64)));
  const cy = Math.max(0, Math.min(216 - 64, Math.round((lev?.y ?? 56) - 32)));
  perto.push(await sharp(nat).extract({ left: cx, top: cy, width: 128, height: 64 }).resize(512, 256, { kernel: 'nearest' }).png().toBuffer());
}
await browser.close();
const gif = (qs, out) => sharp(qs, { join: { animated: true } })
  .gif({ delay: Array(qs.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 }).toFile(out);
await gif(faixa, path.join(OUT, 'menu-travessia.gif'));
await gif(perto, path.join(OUT, 'menu-perto.gif'));
fs.writeFileSync(path.join(OUT, 'menu-quadro.png'), faixa[Math.round(faixa.length * 0.4)]);
fs.writeFileSync(path.join(OUT, 'menu-perto-quadro.png'), perto[Math.round(perto.length * 0.4)]);
console.log(OUT, faixa.length, 'quadros');
