// 17/10 — HOW MUCH ROOM THE F4 FOREGROUND HAS. The foreground must never cross the border's surface line (his rule
// for block C), so its pieces live in the band between the screen edge and that line. This plays the F4 by frame
// stepping (the recipe of `_sequencia.mjs`) and logs, once a second, the band thickness over the 384 screen columns:
// ceiling = `superficieTetoEm(x)`, floor = 216 − `superficieChaoEm(x)` (min / median / max) and the border in use.
//   node scripts/_polimento/_espessura-borda-f4.mjs [t1=125]
import { chromium } from 'playwright';

const T1 = Number(process.argv[2] ?? 125);
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
const linhas = await page.evaluate(async (T1) => {
  const g = window.__game; g.loop.sleep();
  let agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  const out = [];
  let prox = 0;
  while (true) {
    if (!g.scene.isActive('Game')) { if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); } }
    const c = s();
    c.damageShip = () => {};
    if (c.cartas) c.cartas.abrirMesa = () => {};
    if (c.golfinho && c.elapsed >= 45) c.matarGolfinho();
    agora += 1000 / 60; g.step(agora, 1000 / 60);
    await new Promise((r) => setTimeout(r, 0));
    if (c.elapsed >= prox) {
      prox += 1;
      const m = c.moldura;
      const teto = [], chao = [];
      for (let x = 0; x < 384; x++) { teto.push(Math.round(m.superficieTetoEm(x))); chao.push(Math.round(216 - m.superficieChaoEm(x))); }
      const st = (a) => { const b = [...a].sort((p, q) => p - q); return `${b[0]}/${b[b.length >> 1]}/${b[b.length - 1]}`; };
      out.push(`t=${c.elapsed.toFixed(0).padStart(3)} teto ${st(teto).padEnd(11)} chao ${st(chao).padEnd(11)} ${m.faixaEm(192, false)}${m.duto ? ' duto' : ''}`);
    }
    if (c.elapsed > T1) break;
  }
  return out;
}, T1);
console.log(linhas.join('\n'));
await browser.close();
