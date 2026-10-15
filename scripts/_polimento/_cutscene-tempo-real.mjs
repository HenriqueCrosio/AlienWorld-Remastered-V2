// 14/10 — A CUTSCENE IN REAL TIME: starts an interlude straight away (the payload a finished stage would send) and
// photographs it every `CADA_MS` of wall-clock time, with the game running at its own pace — tweens and timers on the
// same clock, as the player sees it (the frame-stepping sweep runs the game faster than the tweens' wall clock). A
// card table picks the first card; the ship panel takes Enter.
//   node scripts/_polimento/_cutscene-tempo-real.mjs <Interlude|Interlude2|Interlude3|Interlude4> <out dir> [every ms]
import fs from 'node:fs';
import { chromium } from 'playwright';

const [CENA, OUT, CADA = '400'] = process.argv.slice(2);
const PAYLOAD = {
  Interlude: { stage: 2, stageDone: 1, score: 4860 },
  Interlude2: { stage: 3, stageDone: 2, score: 9009 },
  Interlude3: { stage: 4, stageDone: 3, score: 13563 },
  Interlude4: { stage: null, stageDone: 4, score: 20000, practice: false, baseScore: 0, naveX: 70, naveY: 108 },
}[CENA];
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(({ cena, p }) => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start(cena, { ...p, handling: 'diegetico', ship: 'humana' });
}, { cena: CENA, p: PAYLOAD });
const t0 = Date.now();
let n = 0;
for (;;) {
  const ativas = await page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));
  const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  const ms = Date.now() - t0;
  await page.screenshot({ path: `${OUT}/${String(n++).padStart(3, '0')}-${(ms / 1000).toFixed(1)}s-${ativas.join('+')}.png`, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
  if (!ativas.some((k) => k.startsWith('Interlude') || k === 'Cartas') || ms > 60000) break;
  if (ativas.includes('Cartas') && ms % 3 < 2) await page.keyboard.press('Digit1');
  await page.waitForTimeout(Number(CADA));
}
await browser.close();
console.log(CENA, n, 'fotos');
