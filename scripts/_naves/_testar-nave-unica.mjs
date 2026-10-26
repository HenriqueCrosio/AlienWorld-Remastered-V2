// 25/10 — the ship per lineage in the real game (the tiers left; replaces `_testar-tiers.mjs`). In the evening the
// human became a HANGAR CHOICE: the "a" (on the black "a" mold) in orange or black, and the jato (the old T1) in its
// own paint or in bone. Per case: the ship texture and animation and the pieces total; then the blue thrust exists for
// every choice, every cutscene shows the chosen human (the Aurora and Doca arrivals, the F3 arrival, the final), the
// Doca shows the manta the player leaves with, and the F3 arrival of the manta swims. Writes <outDir>/f1-a-laranja.png,
// f2-a-preta.png, f3-jato-laranja.png, f4-jato-osso.png and doca.png.
// Expected: F1–F3 3 pieces, F4 0; humana → naveHumana / naveHumanaPreta / shipJato / naveJatoOsso by
// `modeloNave` + `pinturaNave`; alienigena → naveAlienT2.
//   node scripts/_naves/_testar-nave-unica.mjs <outDir>   (needs `npm run dev` on :5173)
const R = 'C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/';
const { chromium } = await import('file:///' + R.replace(/ /g, '%20') + 'node_modules/playwright/index.mjs');
const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || /missing|__MISSING/i.test(m.text())) erros.push(m.text()); });
page.on('requestfailed', (r) => erros.push('FAIL ' + r.url()));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 60000 });
await page.waitForTimeout(1500);

// Starts a scene with a clean hand and the hangar choice [modelo, pintura], and waits until `pronto` (a function body
// on the scene) is true.
const iniciar = (cena, dados, escolha, pronto) => page.evaluate(async ([cena, dados, escolha, pronto]) => {
  const g = window.__game;
  // Stop, let the stop land, then start: a stop and a start of the same scene in one frame alternate (every other
  // restart came up stopped).
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  await new Promise((r) => setTimeout(r, 300));
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.registry.set('modeloNave', escolha[0]);
  g.registry.set('pinturaNave', escolha[1]);
  // The scene object outlives a stop: clear what the check reads, or it would pass on the previous run's fields.
  const velha = g.scene.getScene(cena);
  if (velha) { velha.ship = undefined; velha.pecas = undefined; }
  g.scene.start(cena, dados);
  const ok = new Function('s', `return ${pronto};`);
  for (let i = 0; i < 300 && !(g.scene.isActive(cena) && ok(g.scene.getScene(cena))); i++) await new Promise((r) => setTimeout(r, 100));
  return g.scene.isActive(cena);
}, [cena, dados, escolha, pronto]);
const naveDe = (cena) => page.evaluate((cena) => {
  const s = window.__game.scene.getScene(cena).ship;
  return { tex: s.texture.key, anim: s.anims?.currentAnim?.key ?? null };
}, cena);

const resultado = { fases: [], erros };
const casos = [[1, 'humana', 'a', 'laranja'], [2, 'humana', 'a', 'preta'], [3, 'humana', 'jato', 'laranja'], [4, 'humana', 'jato', 'osso'], [3, 'alienigena', 'a', 'preta']];
for (const [fase, ship, modelo, pintura] of casos) {
  await iniciar('Game', { stage: fase, ship, handling: 'diegetico' }, [modelo, pintura], 's.pecas && s.ship');
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const g = window.__game, c = g.scene.getScene('Game');
    return {
      ativas: g.scene.getScenes(true).map((s) => s.scene.key).join(','),
      pecas: c.pecas?.total, estrelasHud: c.pecas?.hud.length, tex: c.ship?.texture?.key, anim: c.ship?.anims?.currentAnim?.key ?? null,
    };
  });
  resultado.fases.push({ caso: `F${fase} ${ship} ${modelo}-${pintura}`, ...r });
  if (ship === 'humana') await page.screenshot({ path: `${OUT}/f${fase}-${modelo}-${pintura}.png` });
}

resultado.motorAzul = await page.evaluate(() => ['nave-humana-thrust-azul', 'nave-humana-preta-thrust-azul', 'ship-jato-thrust-azul', 'nave-jato-osso-thrust-azul']
  .map((k) => `${k}: ${window.__game.anims.exists(k)}`));

// The Aurora: the arrival is the chosen human.
await iniciar('Interlude', { score: 4820, handling: 'diegetico' }, ['jato', 'osso'], 's.ship');
await page.waitForTimeout(800);
resultado.aurora = { esperado: 'naveJatoOsso', ...(await naveDe('Interlude')) };

// The Doca: the arrival is the chosen human; the parked manta (the sprite with a manta texture).
await iniciar('Interlude2', { score: 9140, handling: 'diegetico', ship: 'humana', stage: 3 }, ['a', 'preta'], 's.ship');
await page.waitForTimeout(2500);
resultado.doca = {
  esperado: 'naveHumanaPreta', ...(await naveDe('Interlude2')),
  mantasNaCena: await page.evaluate(() => window.__game.scene.getScene('Interlude2').children.list
    .filter((o) => o.texture && /^naveAlien/.test(o.texture.key)).map((o) => o.texture.key)),
};
await page.screenshot({ path: `${OUT}/doca.png` });

// The F3 arrival with the human and with the manta, and the final cutscene.
await iniciar('Interlude3', { score: 15200, handling: 'diegetico', ship: 'humana', stage: 4 }, ['jato', 'laranja'], 's.ship');
await page.waitForTimeout(800);
resultado.chegadaF3 = { esperado: 'shipJato', ...(await naveDe('Interlude3')) };
await iniciar('Interlude3', { score: 15200, handling: 'diegetico', ship: 'alienigena', stage: 4 }, ['a', 'laranja'], 's.ship');
await page.waitForTimeout(800);
resultado.chegadaF3Manta = { esperado: 'naveAlienT2', ...(await naveDe('Interlude3')) };
await iniciar('Interlude4', { score: 21000, handling: 'diegetico', ship: 'humana', stage: null, stageDone: 4, practice: false, baseScore: 15200 }, ['jato', 'osso'], 's.ship');
await page.waitForTimeout(800);
resultado.final = { esperado: 'naveJatoOsso', ...(await naveDe('Interlude4')) };

console.log(JSON.stringify(resultado, null, 1));
await browser.close();
