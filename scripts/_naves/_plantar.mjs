// Plants ship candidates in the REAL game: phase <fase> stepped to <t> (no damage, no card table), the player's
// ship at (x,y) with today's sprite of <tier>, then each candidate PNG swapped in (texture only, thrust anim off) —
// the Atmosfera treats it like the real ship. Writes <out>-hoje.png and <out>-<label>.png (the full frame, ×3).
//   node scripts/_naves/_plantar.mjs <out> <fase> <t> <tier> <x,y> <label=png> [<label=png> ...]
// (needs `npm run dev` on :5173; the contrast numbers on the sheets come from `_contraste-jogo.mjs` over these shots)
import fs from 'node:fs';
const R = 'C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/';
const { chromium } = await import('file:///' + R.replace(/ /g, '%20') + 'node_modules/playwright/index.mjs');
const [OUT, FASE, T, TIER, XY, ...CANDS] = process.argv.slice(2);
const [X, Y] = XY.split(',').map(Number);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(([fase, tier]) => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.registry.set('tierNave', tier);
  g.scene.start('Game', { stage: fase, ship: 'humana', handling: 'diegetico' });
}, [Number(FASE), Number(TIER)]);
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 60000 });
await page.evaluate(async ([T, X, Y]) => {
  const g = window.__game;
  g.loop.sleep();
  let agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  while (s().elapsed < T) {
    if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
    const c = s();
    c.damageShip = () => {};
    if (c.cartas) c.cartas.abrirMesa = () => {};
    if (c.golfinho && c.elapsed >= 45) c.matarGolfinho();
    if (c.ship) { c.ship.setPosition(X, Y); c.ship.body?.setVelocity(0, 0); }
    agora += 1000 / 60;
    g.step(agora, 1000 / 60);
    await new Promise((r) => setTimeout(r, 0));
  }
  window.__agora = agora;
}, [Number(T), X, Y]);
const clip = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
const foto = async (nome) => {
  await page.evaluate(([X, Y]) => { const g = window.__game, c = g.scene.getScene('Game'); c.ship.setPosition(X, Y).setVisible(true).setAlpha(1); window.__agora += 1; g.step(window.__agora, 1); }, [X, Y]);
  await page.screenshot({ path: `${OUT}-${nome}.png`, clip });
};
await foto('hoje');
for (const item of CANDS) {
  const [rot, arq] = item.split('=');
  const uri = 'data:image/png;base64,' + fs.readFileSync(arq).toString('base64');
  await page.evaluate(async ([rot, uri]) => {
    const c = window.__game.scene.getScene('Game');
    const key = 'cand-' + rot;
    if (!c.textures.exists(key)) await new Promise((res) => { c.textures.once('addtexture-' + key, res); c.textures.addBase64(key, uri); });
    c.animMotor = null;
    c.ship.anims.stop();
    c.ship.setTexture(key);
  }, [rot, uri]);
  await foto(rot);
}
await browser.close();
console.log(OUT, 'hoje +', CANDS.length);
