// The 3 pieces (the stars). F2 with the human ship: jump to each mark, check a carrier gets marked, kill it, fly onto
// the piece, and at the end simulate the full collection → 1-UP on F3. 25/10: no tiers — the ship never evolves, every
// F1–F3 has the 3 stars, the HUD shows them in the top-right corner (empty → filled), and the ship is the single human
// ship in the paint picked in the hangar (here the black one, `pinturaNave`).
//   node scripts/probe-pecas.mjs <outDir>   (needs `npm run dev` on :5173)
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || /missing|__MISSING/i.test(m.text())) erros.push(m.text()); });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).filter((s) => s.scene.key !== 'Game').forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('pinturaNave', 'preta');
  g.registry.set('umUpNaFase', 0);
  g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
});
await page.waitForTimeout(1500);

const estrelas = () => page.evaluate(() => window.__game.scene.getScene('Game').pecas.hud.map((i) => i.texture.key.replace('estrela-', '')).join(','));
const inicio = { estrelas: await estrelas(), total: await page.evaluate(() => window.__game.scene.getScene('Game').pecas.total) };
await page.screenshot({ path: `${OUT}/peca-hud-vazio.png` });

const passos = [];
for (let k = 0; k < 3; k++) {
  // jump the script clock to the k-th mark and wait for enemies to spawn
  await page.evaluate((k) => {
    const s = window.__game.scene.getScene('Game');
    const t = [0.25, 0.5, 0.75][k] * s.director.bossTime;
    s.elapsed = t;
    s.director.skipTo(t);
    s.invulnerableUntil = s.time.now + 60000; // the probe cannot dodge
    // The mid-phase card table ("SUPRIMENTO ENCONTRADO") pauses the phase — the probe skips it, as `_plantar.mjs` does.
    s.cartas.abrirMesa = () => {};
    const g = window.__game;
    if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
  }, k);
  // A carrier, or (no enemy on screen at the mark) the piece floating in by itself `ESPERA_MAX` seconds of GAME time
  // later — under swiftshader the game clock runs slower than the wall clock, so the wait is long.
  let marcado = null, solta = false;
  for (let i = 0; i < 120 && !marcado && !solta; i++) {
    await page.waitForTimeout(250);
    [marcado, solta] = await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      const e = s.enemies.enemies.getChildren().find((x) => x.active && x.getData('portador'));
      return [e ? { x: Math.round(e.x), y: Math.round(e.y) } : null, s.pecas.soltas.getChildren().length > 0];
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
  passos.push({ marca: k + 1, portador: marcado, pecaSoltou: r.soltas, pegas, estrelas: await estrelas() });
  if (k === 1) await page.screenshot({ path: `${OUT}/peca-hud-2.png` });
}
// (29/09) O texto da HUD mora na camada HD (a lista da cena da fase não o tem mais): lido pelo campo.
const hud = await page.evaluate(() => window.__game.scene.getScene('Game').hud.text);
const nave = await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); return { tex: s.ship.texture.key, anim: s.ship.anims.currentAnim?.key }; });
await page.screenshot({ path: `${OUT}/peca-hud.png` });

// end of phase with the full collection
await page.evaluate(() => window.__game.scene.getScene('Game').victory());
await page.waitForTimeout(800);
const depois = await page.evaluate(() => ({ umUpNaFase: window.__game.registry.get('umUpNaFase') }));

// F3 entry: the same ship, 1 extra life, and the 3 stars again (no tier ceiling any more)
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).filter((s) => s.scene.key !== 'Game').forEach((s) => s.scene.stop());
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico' });
});
await page.waitForTimeout(1500);
const f3 = await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); return { tex: s.ship.texture.key, vidas: s.lives, pecas: s.pecas.total }; });

console.log(JSON.stringify({ inicio, passos, hud, nave, depois, f3, erros }, null, 2));
await browser.close();
