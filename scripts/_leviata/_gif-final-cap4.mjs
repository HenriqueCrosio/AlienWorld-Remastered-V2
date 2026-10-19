// BLOCO D — the GIF of the final cutscene's chapter 4 (the wound) at real speed, the `_gif-bomba.mjs` mould: the
// Phaser loop sleeps and each `step` moves 1/60 s; one photo every 3 steps (50 ms per frame). From the cut to the
// fall (T.FERIDA → T.QUEDA, 8 s): the body drifting, the lava fading, the ship leaving the hole.
//   node scripts/_leviata/_gif-final-cap4.mjs <out.gif> [segundos=8] [capitulo=4]   (npm run dev running)
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT = 'cap4.gif', SEG_S = '8', CAP_S = '4'] = process.argv.slice(2);
const CAP = Number(CAP_S);
const QUADRO = 1000 / 60, POR_FOTO = 3, ZOOM = 2, SEG = Number(SEG_S);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F');
// Stop just before the cut, then drive the clock by hand.
await page.waitForFunction((c) => (window.__game.scene.getScene('Interlude4')?.estado?.capitulo ?? 0) >= c - 1, CAP, { polling: 16, timeout: 30000 });
await page.waitForFunction((c) => window.__game.scene.getScene('Interlude4').estado.capitulo === c, CAP, { polling: 4, timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game;
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  // ⚠️ 18/10: Phaser's TweenManager keeps its OWN clock on Date.now() — with the loop stepped by hand, tweens ran on
  // real time (the screenshot latency) while timers ran on the stepped clock. Date.now follows the stepped clock.
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + Math.round(window.__passo.t - t0);
});
const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { k: c.width / 384, left: c.left, top: c.top };
});
const quadros = [];
for (let i = 0; i < Math.round((SEG * 60) / POR_FOTO); i++) {
  await page.evaluate(({ n, QUADRO }) => {
    const g = window.__game;
    for (let k = 0; k < n; k++) { window.__passo.t += QUADRO; g.step(window.__passo.t, QUADRO); }
  }, { n: POR_FOTO, QUADRO });
  const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  quadros.push(await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer());
}
await browser.close();
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros');
