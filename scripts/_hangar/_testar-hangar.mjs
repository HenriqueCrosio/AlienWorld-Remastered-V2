// 25/10 (night) — THE HANGAR FLOW with real keys: the menu's COMEÇAR opens the hangar (the HD scenery on), → takes the
// arrow to the "a", ↓ repaints it black, ENTER takes off: after the engine and the veil the F1 starts with
// modeloNave = 'a' and pinturaNave = 'preta', the ship sprite in that paint, and the hangar's HD scene is gone. Then
// again from the menu: ESC in the hangar goes back to the menu (settled, no opening).
//   node scripts/_hangar/_testar-hangar.mjs        (needs `npm run dev` on :5173)
const R = 'C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/';
const { chromium } = await import('file:///' + R.replace(/ /g, '%20') + 'node_modules/playwright/index.mjs');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const falhas = [];
const conferir = (ok, msg, dado) => { console.log(`${ok ? 'ok  ' : 'FALHA'} ${msg}`); if (!ok) falhas.push({ msg, dado }); };
const esperar = (f, arg, ms = 20000) => page.waitForFunction(f, arg, { timeout: ms }).then(() => true).catch(() => false);
const apertar = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(350); };

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await esperar(() => window.__game?.scene?.isActive('Menu'));
await page.waitForTimeout(1200);
await page.evaluate(() => { window.__game.registry.set('modeloNave', 'jato'); window.__game.registry.set('pinturaNave', 'osso'); });
// Skip the opening (any key), then COMEÇAR.
await apertar('KeyQ');
await apertar('Enter');
conferir(await esperar(() => window.__game.scene.isActive('Hangar')), 'COMEÇAR abre o hangar');
conferir(await esperar(() => !!window.__gameHD?.scene.getScene('HangarHD')?.cenario), 'o cenário do hangar monta na camada HD');
const e0 = await page.evaluate(() => { const e = window.__game.scene.getScene('Hangar').estado; return { lado: e.lado, p: e.pinturas[e.lado] }; });
conferir(e0.lado === 'esq' && e0.p === 0, `a seta começa na nave do registry (jato osso → esq/0: ${e0.lado}/${e0.p})`, e0);
await page.waitForTimeout(1000);
await apertar('ArrowRight');
await apertar('ArrowDown');
const e1 = await page.evaluate(() => { const e = window.__game.scene.getScene('Hangar').estado; return { lado: e.lado, p: e.pinturas[e.lado] }; });
conferir(e1.lado === 'dir' && e1.p === 1, `→ e ↓ levam à "a" preta (${e1.lado}/${e1.p})`, e1);
await apertar('Enter');
conferir(await esperar(() => window.__game.scene.isActive('Game'), null, 15000), 'ENTER decola: a F1 começa');
const jogo = await page.evaluate(() => {
  const g = window.__game, c = g.scene.getScene('Game');
  return { modelo: g.registry.get('modeloNave'), pintura: g.registry.get('pinturaNave'), tex: c.ship?.texture?.key, hangarHD: !!window.__gameHD.scene.getScene('HangarHD') };
});
conferir(jogo.modelo === 'a' && jogo.pintura === 'preta', `a escolha vai para o registry (${jogo.modelo}-${jogo.pintura})`, jogo);
conferir(/^naveHumanaPreta/.test(jogo.tex ?? ''), `a F1 começa na "a" preta (${jogo.tex})`, jogo);
conferir(!jogo.hangarHD, 'a cena do hangar sai da camada HD', jogo);

// ESC volta ao menu.
await page.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach((s) => s.scene.stop()); g.scene.start('Hangar', { handling: 'diegetico' }); });
await esperar(() => window.__game.scene.isActive('Hangar'));
await page.waitForTimeout(800);
await apertar('Escape');
conferir(await esperar(() => window.__game.scene.isActive('Menu') && window.__game.scene.getScene('Menu').settled), 'ESC volta ao menu, já pousado');
conferir(erros.length === 0, `sem erro no console (${erros.length})`, erros);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo ok');
await browser.close();
process.exit(falhas.length ? 1 : 0);
