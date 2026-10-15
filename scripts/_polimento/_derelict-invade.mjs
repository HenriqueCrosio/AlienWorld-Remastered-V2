// 14/10 — DO THE OLD `derelict` BANDS POKE INTO THE F4 CORRIDOR? Plays stage 4 (frame stepping, no card tables) and,
// every second, measures for each column of the screen how many px of the ceiling/floor `derelict` band (Parallax,
// depth −75) lie INSIDE the corridor — past the border's surface line — and are not hidden by a table. Prints the
// worst columns per second, and a summary.
//   node scripts/_polimento/_derelict-invade.mjs [until t]   (npm run dev running)
import { chromium } from 'playwright';

const ATE = Number(process.argv[2] ?? 110);
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
const r = await page.evaluate(async (ate) => {
  const g = window.__game;
  g.loop.sleep();
  let agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  const linhas = [];
  let pior = { px: 0 };
  while (s().elapsed < ate) {
    const c = s();
    c.cartas.abrirMesa = () => {};
    if (c.golfinho && c.elapsed >= 45) c.matarGolfinho();
    for (let i = 0; i < 60; i++) {
      s().damageShip = () => {};
      agora += 1000 / 60;
      g.step(agora, 1000 / 60);
    }
    const m = s().moldura;
    const mesas = s().terrain.props.getChildren().filter((p) => p.active && String(p.getData('kind')).startsWith('mesa'));
    const bandas = s().parallax.layers.filter((l) => l.key === 'derelict' && l.depth === -75);
    let teto = 0, chao = 0, colsT = 0, colsC = 0;
    for (let x = 0; x < 384; x += 2) {
      if (mesas.some((p) => { const b = p.getBounds(); return x >= b.x && x <= b.right; })) continue;
      for (const l of bandas) {
        for (const sp of l.sprites) {
          if (!sp.visible || sp.alpha === 0) continue;
          const b = sp.getBounds();
          if (x < b.x || x > b.right) continue;
          if (l.teto) { const d = b.bottom - m.superficieTetoEm(x); if (d > 0) { teto = Math.max(teto, d); colsT++; } }
          else { const d = m.superficieChaoEm(x) - b.y; if (d > 0) { chao = Math.max(chao, d); colsC++; } }
        }
      }
    }
    const t = Math.round(s().elapsed);
    linhas.push(`t=${t} teto ${Math.round(teto)}px (${colsT * 2} col) · chão ${Math.round(chao)}px (${colsC * 2} col) · espessura ${Math.round(m.espessura)} duto=${m.duto}`);
    if (teto + chao > pior.px) pior = { px: teto + chao, t };
    await new Promise((res) => setTimeout(res, 0));
  }
  return { linhas, pior };
}, ATE);
console.log(r.linhas.join('\n'));
console.log('pior', JSON.stringify(r.pior));
await browser.close();
