// PROTOTYPE (feat/cartas-preview): the 3 pieces. F2 with the human ship: jump to each mark, check a carrier gets
// marked, kill it, fly onto the piece, and at the end simulate the full collection → tier up + 1-UP on F3.
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).filter((s) => s.scene.key !== 'Game').forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('tierNave', 1); // the human reached T1 (the jet) on F1
  g.registry.set('umUpNaFase', 0);
  g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
});
await page.waitForTimeout(1500);

const passos = [];
for (let k = 0; k < 3; k++) {
  // jump the script clock to the k-th mark and wait for enemies to spawn
  await page.evaluate((k) => {
    const s = window.__game.scene.getScene('Game');
    const t = [0.25, 0.5, 0.75][k] * s.director.bossTime;
    s.elapsed = t;
    s.director.skipTo(t);
    s.invulnerableUntil = s.time.now + 60000; // the probe cannot dodge
  }, k);
  let marcado = null;
  for (let i = 0; i < 40 && !marcado; i++) {
    await page.waitForTimeout(250);
    marcado = await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      const e = s.enemies.enemies.getChildren().find((x) => x.active && x.getData('portador'));
      return e ? { x: Math.round(e.x), y: Math.round(e.y) } : null;
    });
  }
  if (k === 0 && marcado) await page.screenshot({ path: `${OUT}/peca-portador.png` });
  // kill the carrier and put the ship on the piece
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const e = s.enemies.enemies.getChildren().find((x) => x.active && x.getData('portador'));
    if (e) s.matarInimigo(e);
    return { soltas: s.pecas.soltas.getChildren().length };
  });
  await page.waitForTimeout(200);
  if (k === 0) await page.screenshot({ path: `${OUT}/peca-solta.png` });
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const p = s.pecas.soltas.getChildren()[0];
    if (p) { s.ship.body.reset(p.x, p.y); }
  });
  await page.waitForTimeout(400);
  const pegas = await page.evaluate(() => window.__game.scene.getScene('Game').pecas.pegas);
  passos.push({ marca: k + 1, portador: marcado, pecaSoltou: r.soltas, pegas });
}
// (29/09) O texto da HUD mora na camada HD (a lista da cena da fase não o tem mais): lido pelo campo.
const hud = await page.evaluate(() => window.__game.scene.getScene('Game').hud.text);
await page.screenshot({ path: `${OUT}/peca-hud.png` });

// end of phase with the full collection
await page.evaluate(() => window.__game.scene.getScene('Game').victory());
await page.waitForTimeout(800);
const depois = await page.evaluate(() => ({ tier: window.__game.registry.get('tierNave'), umUpNaFase: window.__game.registry.get('umUpNaFase') }));

// F3 entry: tier 2 visual + 1 extra life
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).filter((s) => s.scene.key !== 'Game').forEach((s) => s.scene.stop());
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico' });
});
await page.waitForTimeout(1500);
const f3 = await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); return { tex: s.ship.texture.key, vidas: s.lives }; });

console.log(JSON.stringify({ passos, hud, depois, f3, erros }, null, 2));
await browser.close();
