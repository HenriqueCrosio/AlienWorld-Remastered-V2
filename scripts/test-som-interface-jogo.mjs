// BLOCK SOUND (17/11) — sheet 6 (the interface) IN THE GAME: the menu (move, adjust, START — and the START survives the
// scene change into the hangar), the hangar and its pause (open, move, close), the card table (the deal, the move, the
// choice + its rarity), the stars (a step per star, the jingle of the three), the extra life on the next stage, SHIP
// LOST, the stage-cleared screen, the dawn result (the counter loop, the medal, the record), the Archive (move, back).
//   npm run dev  in another terminal, then  node scripts/test-som-interface-jogo.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const porta = process.argv.includes('--porta') ? process.argv[process.argv.indexOf('--porta') + 1] : '5173';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1200);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());
const diag = () => page.evaluate(() => window.__som.diagnostico());
const desde = async () => (await diag()).tocados.length;
const novos = async (n0) => (await diag()).tocados.slice(n0);
const ativa = (k) => page.waitForFunction((x) => window.__game.scene.isActive(x), k, { timeout: 20000 }).then(() => true, () => false);
const cena = (k, dados) => page.evaluate(([x, d]) => { const g = window.__game; const a = g.scene.getScenes(true)[0]; a.scene.start(x, d); }, [k, dados]);
const conta = (t, n) => t.filter((x) => x === n).length;

// ── the menu ──
await cena('Menu', { direto: true });
await ativa('Menu');
await page.waitForTimeout(1500);
let n = await desde();
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(150);
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(150);
let t = await novos(n);
ok(conta(t, 'ui.mover') === 2, `the menu: ↑↓ MOVE (${conta(t, 'ui.mover')})`, t);
n = await desde();
await page.keyboard.press('Enter');
ok(await ativa('Hangar'), 'START opens the hangar');
await page.waitForTimeout(120);
t = await novos(n);
ok(t.includes('ui.comecar'), 'START has its own sound', t);
// the rule itself, without the scene's timing: an interface one-shot and a world one, then a scene change
const sobrevive = await page.evaluate(async () => {
  const S = window.__som;
  S.tocar('ui.comecar');
  S.tocar('explosao.metalGrande');
  S.trocarDeCena('atmosfera', 50);
  await new Promise((r) => setTimeout(r, 150));
  return S.diagnostico().vozes;
});
ok(sobrevive.includes('ui.comecar') && !sobrevive.includes('explosao.metalGrande'), 'a scene change drains the WORLD but the interface one-shot finishes (it is the screen)', sobrevive);

// ── the hangar and its pause ──
await page.waitForTimeout(1500);
// (← then →: one of the two changes side — the arrow does not pass the edge, and there it is silent)
n = await desde();
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(150);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
t = await novos(n);
ok(conta(t, 'ui.mover') >= 1 && conta(t, 'ui.mover') <= 2, `the hangar: another ship MOVES (${conta(t, 'ui.mover')})`, t);
n = await desde();
await page.keyboard.press('Escape');
ok(await ativa('Pausa'), 'the hangar pause opened');
await page.waitForTimeout(300);
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(150);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
t = await novos(n);
ok(t.indexOf('ui.pausa.abrir') >= 0 && t.indexOf('ui.pausa.abrir') < t.indexOf('ui.mover') && t.indexOf('ui.mover') < t.indexOf('ui.pausa.fechar'), 'the pause: OPENS, moves, CLOSES', t);

// ── a stage: the card table, the stars, SHIP LOST ──
await cena('Game', { stage: 1, ship: 'interceptor' });
await page.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.ship?.active; }, null, { timeout: 30000 });
await page.waitForTimeout(800);
const ids = await page.evaluate(async () => {
  const { CARTAS } = await import('/src/data/catalogoCartas.ts');
  const lista = Object.values(CARTAS);
  const uma = (r) => lista.find((c) => c.raridade === r);
  return [uma('comum'), uma('rara'), uma('epica')].filter(Boolean).map((c) => ({ id: c.id, raridade: c.raridade }));
});
n = await desde();
await page.evaluate((ops) => { const s = window.__game.scene.getScene('Game'); s.scene.launch('Cartas', { opcoes: ops.map((o) => o.id), titulo: 'TESTE', onEscolha: () => {} }); }, ids);
await page.waitForTimeout(900);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(200);
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
t = await novos(n);
ok(t.includes('cartas.mesa'), 'the card table: the DEAL', t);
ok(t.includes('ui.mover'), 'the card table: → MOVES', t);
const raridades = t.filter((x) => x.startsWith('cartas.raridade.'));
ok(t.includes('cartas.escolher') && raridades.length === 1, `the choice and ONE rarity over it (${raridades.join()})`, t);
ok(raridades.length === 1 && ids.some((o) => `cartas.raridade.${o.raridade}` === raridades[0]), 'the rarity is the chosen card\'s', { ids, raridades });

n = await desde();
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); for (let i = 0; i < 3; i++) s.pecas.pegar(s.physics.add.sprite(-50, -50, '__DEFAULT')); });
await page.waitForTimeout(500);
t = await novos(n);
ok(t.join().includes('estrela.pegar1,estrela.pegar2,estrela.pegar3'), 'the stars: each one a STEP higher', t);
ok(t.indexOf('estrela.completa') > t.indexOf('estrela.pegar3'), 'the three: the JINGLE after the third', t);

n = await desde();
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.damageShip = () => {}; s.gameOver(); });
const derrota = await page.waitForFunction(() => { const g = window.__game; return g.scene.isActive('Pausa') && g.scene.getScene('Pausa').ctx?.tipo === 'derrota'; }, null, { timeout: 20000 }).then(() => true, () => false);
ok(derrota, 'the SHIP LOST window opened');
t = await novos(n);
ok(t.includes('ui.navePerdida') && !t.includes('ui.pausa.abrir'), 'SHIP LOST has its own sting (not the pause\'s)', t);

// ── the extra life on the next stage ──
n = await desde();
await page.evaluate(async () => {
  const { colecaoCompleta } = await import('/src/pecas.ts');
  const g = window.__game;
  colecaoCompleta(g.registry, 2);
  for (const sc of g.scene.getScenes(true)) if (sc.scene.key === 'Pausa') sc.scene.stop();
  g.scene.getScene('Game').scene.start('Game', { stage: 2, ship: 'interceptor' });
});
await page.waitForTimeout(2600);
ok((await novos(n)).includes('vida.extra'), 'the stage after three stars starts with the EXTRA LIFE chime', await novos(n));

// ── the stage-cleared screen ──
n = await desde();
await cena('GameOver', { score: 1234, handling: 'diegetico', victory: true, stage: 2, practice: true });
await ativa('GameOver');
await page.waitForTimeout(300);
ok((await novos(n)).includes('resultado.fase'), 'STAGE CLEARED has its sting', await novos(n));

// ── the dawn result ──
n = await desde();
await cena('Menu', { resultado: { score: 987654321, handling: 'diegetico', ensaio: true } });
await ativa('Menu');
await page.waitForFunction(() => window.__som.diagnostico().vozes.includes('resultado.conta'), null, { timeout: 8000 }).then(() => true, () => false);
ok((await diag()).vozes.includes('resultado.conta'), 'the result: the COUNTER runs while the points count', (await diag()).vozes);
await page.waitForTimeout(2200);
t = await novos(n);
ok(!(await diag()).vozes.includes('resultado.conta'), 'the counter stops when the points land', (await diag()).vozes);
ok(t.indexOf('resultado.medalha') > t.indexOf('resultado.conta'), 'the MEDAL on the final number', t);
ok(t.includes('resultado.recorde'), 'a new record: its run', t);

// ── the Archive ──
await cena('Arquivo');
await ativa('Arquivo');
await page.waitForTimeout(800);
n = await desde();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
await page.keyboard.press('Escape');
await ativa('Menu');
await page.waitForTimeout(200);
t = await novos(n);
ok(t.includes('ui.mover') && t.includes('ui.voltar'), 'the Archive: MOVE and BACK', t);

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
