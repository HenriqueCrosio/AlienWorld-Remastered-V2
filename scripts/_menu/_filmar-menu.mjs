// BLOCO E · the real menu (src/, not the mock), filmed on a stepped clock at 30 fps for his sheet: the opening and a
// stretch of the scenery after it (the storm, the searchlights, the Leviathan). The DEV shortcut lines are hidden.
//   node scripts/_menu/_filmar-menu.mjs <outDir> [segundos=24] [largura=1536]      (with `npm run dev` running)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { webm } from './_webm.mjs';

const [OUT, SEG = '24', LARG = '1536'] = process.argv.slice(2);
const W = Number(LARG);
const H = Math.round((W * 9) / 16);
const QUADROS = path.join(OUT, '_q');
fs.mkdirSync(QUADROS, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene.getScene('Menu')?.estado?.pronto, null, { timeout: 60000 });
// From the very start: both games asleep, the opening and the scenery clocks back to 0, the DEV lines hidden.
await page.evaluate(() => {
  const g = window.__game, hd = window.__gameHD;
  g.loop.sleep();
  hd.loop.sleep();
  g.scene.getScene('Menu').estado.tAbertura = 0;
  hd.scene.getScene('MenuHD').t = 0;
  for (const cena of hd.scene.getScenes(true)) {
    for (const o of cena.children.list) if (typeof o.text === 'string' && /\[B\] chef|\[I\]\[O\]/.test(o.text)) o.setVisible(false);
  }
  window.__relogio = performance.now();
});
const clip = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
const total = Math.round(Number(SEG) * 30);
// 2.43 s: the first lightning's first strike, with the bolt (at 2.5 s it is between strikes, dim and without it).
const momentos = [2.43, 4, 5.5, 9.4, 10.6, 14].map((s) => Math.round(s * 30));
for (let i = 0; i < total; i++) {
  await page.evaluate(() => {
    const dt = 1000 / 30;
    window.__relogio += dt;
    window.__game.step(window.__relogio, dt);
    window.__gameHD.step(window.__relogio, dt);
  });
  const arq = path.join(QUADROS, `${String(i).padStart(4, '0')}.png`);
  await page.screenshot({ path: arq, clip });
  if (momentos.includes(i + 1)) fs.copyFileSync(arq, path.join(OUT, `t${((i + 1) / 30).toFixed(1)}.png`));
}
await browser.close();
await webm(QUADROS, path.join(OUT, 'menu.webm'), 30);
fs.rmSync(QUADROS, { recursive: true, force: true });
console.log(OUT, total, 'quadros');
