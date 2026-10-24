// Checks the T3 removal in the real game: per (phase, ship, tier) the pieces total and the ship texture.
// Expected (23/10): F1/F2 3 pieces; F3 humana T1 3, T2 0; F4 shows naveHumanaT2 even with a stale tier 3; manta T1 3, T2 0.
//   node scripts/_naves/_testar-tiers.mjs   (needs `npm run dev` on :5173)
const R = 'C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/';
const { chromium } = await import('file:///' + R.replace(/ /g, '%20') + 'node_modules/playwright/index.mjs');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || /missing|__MISSING/i.test(m.text())) erros.push(m.text()); });
page.on('requestfailed', (r) => erros.push('FAIL ' + r.url()));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const casos = [[1, 'humana', 0], [2, 'humana', 1], [3, 'humana', 1], [3, 'humana', 2], [4, 'humana', 2], [4, 'humana', 3], [3, 'alienigena', 1], [3, 'alienigena', 2]];
for (const [fase, ship, tier] of casos) {
  const r = await page.evaluate(async ([fase, ship, tier]) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.registry.set('tierNave', tier);
    g.scene.start('Game', { stage: fase, ship, handling: 'diegetico' });
    for (let i = 0; i < 200 && !(g.scene.isActive('Game') && g.scene.getScene('Game').pecas); i++) await new Promise((r) => setTimeout(r, 100));
    const c = g.scene.getScene('Game');
    return { pecas: c.pecas.total, tex: c.ship.texture.key, tierReg: g.registry.get('tierNave') };
  }, [fase, ship, tier]);
  console.log(`F${fase} ${ship} T${tier} -> peças ${r.pecas}, textura ${r.tex}, tier no registry ${r.tierReg}`);
}
console.log('erros:', erros.length ? erros.slice(0, 8) : 'nenhum');
await browser.close();
