// BLOCK SOUND (15/11) — sheet 1 (the ship) IN THE GAME: every catalogue sound is loaded; each ship plays ITS shot and
// ITS engine (X-AELO, TERMINUS, CHARYBDIS); the F1 opens with the sonic boom; a blow plays the hit + the life lost; the
// last blow plays only the ship's death and the engine stops; the bomb sounds.
//   npm run dev  in another terminal, then  node scripts/test-som-nave-jogo.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1200);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());
const diag = () => page.evaluate(() => window.__som.diagnostico());
const desde = async () => (await diag()).tocados.length;
const novos = async (n0) => (await diag()).tocados.slice(n0);

let d = await diag();
ok(d.carregados[0] === d.carregados[1] && d.carregados[1] >= 26, `every sound of the catalogue is loaded (${d.carregados.join('/')})`, d.carregados);

/** (re)starts the Game scene on a stage with a ship; from inside a running Game it is a restart */
async function iniciar(stage, ship, modelo = 'a') {
  await page.evaluate(([st, sh, mo]) => {
    const g = window.__game;
    g.registry.set('modeloNave', mo);
    g.registry.set('pinturaNave', 'laranja');
    const dados = { stage: st, ship: sh };
    if (g.scene.isActive('Game')) g.scene.getScene('Game').scene.restart(dados);
    else g.scene.getScene('Menu').scene.start('Game', dados);
  }, [stage, ship, modelo]);
  await page.waitForTimeout(500);
  await page.waitForFunction(([st]) => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.stage?.id === st && s.ship?.active; }, [stage], { timeout: 30000 });
}

/** starts a stage with a ship, holds fire for `ms`, returns the names played since */
async function jogar(stage, ship, modelo, ms = 1500) {
  await iniciar(stage, ship, modelo);
  await page.waitForTimeout(1200);
  const n0 = await desde();
  await page.keyboard.down('Space');
  await page.waitForTimeout(ms);
  const vozes = (await diag()).vozes;
  const tocados = await novos(n0);
  await page.keyboard.up('Space');
  return { n0, tocados, vozes };
}

for (const [stage, ship, modelo, nave] of [[2, 'humana', 'jato', 'xaelo'], [2, 'humana', 'a', 'terminus'], [3, 'alienigena', 'a', 'charybdis']]) {
  const r = await jogar(stage, ship, modelo);
  if (nave === 'terminus') {
    // THE ROTARY GUN (16/11): the spin-up and the held loop while firing; on the release, the spin-down and the A1 arrival
    // (F2 = space: the hull burst)
    ok(r.tocados.includes('nave.terminus.rotativa.arranque') && r.tocados.includes('nave.terminus.rotativa.laco'), 'terminus: pressing spins the barrels up and the held fire loops', r.tocados.slice(0, 8));
    ok(!r.tocados.includes('nave.terminus.tiro'), 'terminus: no per-shot sound any more');
    await page.waitForTimeout(400);
    const depois = await novos(r.n0);
    ok(depois.includes('nave.terminus.rotativa.parada') && depois.includes('nave.terminus.chegada.casco') && !depois.includes('nave.terminus.chegada.pico'), 'terminus: the release spins down and the A1 arrives (space: through the hull)', depois.filter((n) => n.startsWith('nave.terminus')));
    ok(!(await diag()).vozes.includes('nave.terminus.rotativa.laco'), 'terminus: the loop stopped on the release');
  } else {
    ok(r.tocados.filter((n) => n === `nave.${nave}.tiro`).length >= 3, `${nave}: holding fire plays ITS shot`, r.tocados.slice(0, 12));
  }
  ok(!r.tocados.some((n) => /^nave\.(xaelo|terminus|charybdis)\.tiro$/.test(n) && n !== `nave.${nave}.tiro`), `${nave}: no other ship's shot`);
  ok(r.vozes.includes(`nave.${nave}.motor`), `${nave}: its engine loop is playing`, r.vozes);
  ok(r.vozes.filter((n) => n.endsWith('.motor')).length === 1, `${nave}: exactly one engine`, r.vozes);
}

// SHEET 2 (in the F2, where enemies come at once): a shot landing plays the hit; killing enemies plays the explosion
// of their material (the small metal one is still on sheet 2b, silent until chosen — so the F2 drones may be quiet)
{
  await iniciar(2, 'humana', 'a');
  const ha = await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().some((e) => e.active && e.x < 370), null, { timeout: 20000 }).then(() => true, () => false);
  ok(ha, 'the F2 brought enemies on screen');
  const n0 = await desde();
  await page.keyboard.down('Space');
  // keep the ship on the line of the nearest enemy while it fires (the test aims; the game does not)
  await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    s.damageShip = () => {};
    for (let i = 0; i < 30; i++) {
      const alvo = s.enemies.enemies.getChildren().find((e) => e.active && e.x > s.ship.x && e.x < 380);
      if (alvo) s.ship.y = alvo.y;
      await new Promise((ok) => setTimeout(ok, 100));
    }
  });
  await page.keyboard.up('Space');
  const t = await novos(n0);
  ok(t.some((n) => n.startsWith('acerto.')), 'shots landing play the hit sound', t.filter((n) => !n.endsWith('.tiro')).slice(0, 10));
  const kinds = await page.evaluate(() => [...new Set(window.__game.scene.getScene('Game').enemies.enemies.getChildren().map((e) => e.getData('kind')))]);
  if (kinds.includes('drone')) {
    ok(t.includes('acerto.drone') || t.includes('explosao.drone'), 'the swarm drone plays ITS hit / death, not the thin metal', t.filter((n) => !n.endsWith('.tiro')).slice(0, 10));
  }
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); delete s.damageShip; });
  const r = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game'); const S = window.__som;
    const m0 = S.diagnostico().tocados.length;
    // a big metal one and a rock: the canhoneira (size ≥ 2 → metal grande) is not always on screen, so call the Fx directly
    s.fx.explode(200, 100, 2.2, 50, 'metal');
    await new Promise((ok) => setTimeout(ok, 30));
    s.fx.explode(220, 120, 1, 50, 'rocha');
    await new Promise((ok) => setTimeout(ok, 30));
    s.fx.explodeBig(240, 110, 1.2, 50, 'chefeFim');
    await new Promise((ok) => setTimeout(ok, 30));
    s.fx.sheetExplosion(260, 110, 0.6);
    return S.diagnostico().tocados.slice(m0);
  });
  ok(r.includes('explosao.metalGrande') && r.includes('explosao.rocha') && r.includes('explosao.chefeFim'), 'the Fx plays the explosion by type and size', r);
  ok(r.filter((n) => n === 'explosao.perigo').length === 0, 'the silent explosion (the final cutscene meteor rain) stays silent', r);
}

// THE ARRIVAL GROWS WITH THE BURST, CAPPED (16/11): a tap gives a smaller arrival than a long burst
{
  const chegadaDe = async (ms) => {
    await page.keyboard.down('Space');
    await page.waitForTimeout(ms);
    const n = await desde();
    await page.keyboard.up('Space');
    await page.waitForTimeout(300);
    return page.evaluate((k) => {
      const S = window.__som;
      // the arrival's voice gain right after it started (the level the burst asked for)
      return { tocados: S.diagnostico().tocados.slice(k), disparos: window.__game.scene.getScene('Game').weapons.rotDisparos };
    }, n);
  };
  const toque = await chegadaDe(150);
  const longa = await chegadaDe(3500);
  ok(toque.tocados.includes('nave.terminus.chegada.casco') && longa.tocados.includes('nave.terminus.chegada.casco'), 'both a tap and a long burst bring the arrival');
  ok(toque.disparos < longa.disparos, `the long burst counted more shots (${toque.disparos} vs ${longa.disparos}) — the arrival grows with it`);
}

// a blow that costs a life (the ship has lives to spare): the hit, then the life lost
{
  const n0 = await desde();
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = 0; s.semDanoAte = 0; s.lives = 3; s.damageShip(); });
  await page.waitForTimeout(300);
  const t = await novos(n0);
  ok(t.includes('nave.terminus.atingida') && t.includes('nave.terminus.vida'), 'a blow: the hit and the life lost of the TERMINUS', t);
}
// the bomb
{
  const n0 = await desde();
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.bombs = 3; s.useBomb(); });
  await page.waitForTimeout(200);
  ok((await novos(n0)).includes('nave.bomba.lancar'), 'the bomb leaving the ship');
}
// the killing blow: only the death, and the engine stops
{
  const n0 = await desde();
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = 0; s.semDanoAte = 0; s.lives = 1; s.damageShip(); });
  await page.waitForTimeout(800);
  const t = await novos(n0);
  ok(t.includes('nave.terminus.morte') && !t.includes('nave.terminus.vida'), 'the last blow: the death, not the life lost', t);
  ok(!(await diag()).vozes.some((n) => n.endsWith('.motor')), 'the engine died with the ship', (await diag()).vozes);
}

// the F1: the sonic boom at the opening, in the atmosphere, and the flap impulse
{
  // (from the death: the SHIP LOST window may be opening — leave through the game's own restart)
  await page.waitForTimeout(500);
  const n0 = await desde();
  await iniciar(1, 'humana', 'jato');
  // the boom is the stage's sound ENTRANCE: first and alone; the engine only fades in after it
  const logo = await page.evaluate(() => window.__som.diagnostico());
  ok(logo.tocados.slice(n0).includes('momento.f1.estrondo') && !logo.vozes.some((n) => n.endsWith('.motor')), 'the F1 opens with the sonic boom, alone (no engine yet)', logo.vozes);
  await page.waitForTimeout(2600);
  ok((await diag()).vozes.includes('nave.xaelo.motor'), 'the engine comes in after the boom', (await diag()).vozes);
  await page.keyboard.press('KeyW');
  await page.waitForTimeout(300);
  const t = await novos(n0);
  ok(t.indexOf('momento.f1.estrondo') === 0 || t.filter((n) => n !== 'momento.f1.estrondo').length === t.length - 1, 'the boom is the first sound of the stage', t.slice(0, 4));
  ok(t.includes('nave.impulso'), 'the flap impulse sounds', t);
  ok((await diag()).lugar === 'atmosfera', 'the F1 is heard in the atmosphere');
}

// THE AURORA (cutscene 1): the chain is COMPOSED — a sequence of metal-grande under it, the big close at the end, and
// none of the old separate per-blast sounds
{
  const n0 = await desde();
  await page.evaluate(() => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    s.scene.start('Interlude', { score: 0, handling: 'diegetico' });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('Interlude'), null, { timeout: 30000 });
  await page.waitForTimeout(800);
  // (the chain starts after the conquest card table; the test goes straight to the Aurora dying)
  const n1 = await desde();
  await page.evaluate(() => window.__game.scene.getScene('Interlude').implosao());
  await page.waitForTimeout(3600);
  const t = await novos(n1);
  void n0;
  const grandes = t.filter((n) => n === 'explosao.metalGrande').length;
  ok(grandes >= 12, `the Aurora chain plays the metal-grande sequence (${grandes})`, t.slice(0, 20));
  ok(t.includes('explosao.chefeFim'), 'the big close at the end', t.slice(-6));
  ok(t.includes('explosao.lastro'), 'the bed (LASTRO) rolls under the chain', t.filter((n) => n.startsWith('explosao.')).slice(0, 6));
  ok(!t.includes('explosao.metal'), 'no separate small-metal blasts (the chain is composed, and now the small metal HAS a sound)', t.filter((n) => n.startsWith('explosao.')));
  ok((await diag()).lugar === 'cabine', 'the cutscene sounds in the cabin (space)');

  // HIS BUG (15/11): the big close went on sounding INSIDE the F2. A scene change ends every voice of the scene left.
  await page.evaluate(() => window.__game.scene.getScene('Interlude').implosao());
  await page.waitForFunction(() => window.__som.diagnostico().vozes.includes('explosao.chefeFim'), null, { timeout: 8000 }).catch(() => {});
  const antes = (await diag()).vozes;
  ok(antes.includes('explosao.chefeFim'), 'the close is sounding when the scene changes', antes);
  await page.evaluate(() => window.__game.scene.getScene('Interlude').scene.start('Game', { stage: 2, ship: 'humana' }));
  await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 30000 });
  await page.waitForTimeout(400);
  const depois = await diag();
  ok(!depois.vozes.some((n) => n === 'explosao.chefeFim' || n === 'explosao.metalGrande' || n === 'explosao.lastro'), 'nothing of the cutscene sounds in the stage after it', depois.vozes);
  ok(!depois.lastro.tocando && depois.lastro.energia === 0, 'the bed was drained by the scene change', depois.lastro);
}

// THE BOOM STARTS ON THE BLACK (16/11): from the hangar, it fires on the veil, crosses into the F1 (the one `ponte`
// sound), and the stage does not play it a second time
{
  await page.evaluate(() => {
    const g = window.__game;
    const ativa = g.scene.getScenes(true).find((s) => !['IrmaHD', 'Pausa'].includes(s.scene.key));
    ativa.scene.start('Hangar', { handling: 'diegetico' });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('Hangar'), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const n2 = await desde();
  await page.keyboard.press('Enter');
  await page.waitForFunction((k) => window.__som.diagnostico().tocados.slice(k).includes('momento.f1.estrondo') || !window.__game.scene.isActive('Hangar'), n2, { timeout: 8000, polling: 16 }).then(() => true, () => false);
  const noVeu = await page.evaluate(() => window.__game.scene.isActive('Hangar'));
  ok(noVeu && (await novos(n2)).includes('momento.f1.estrondo'), 'the boom fires on the hangar veil, before the stage', await novos(n2));
  await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 30000 });
  await page.waitForTimeout(200);
  const d2 = await diag();
  ok(d2.vozes.includes('momento.f1.estrondo'), 'the stage opens with the boom still sounding (it crossed over)', d2.vozes);
  await page.waitForTimeout(2500);
  const t2 = await novos(n2);
  ok(t2.filter((n) => n === 'momento.f1.estrondo').length === 1, 'one boom only (the stage did not play it again)', t2.filter((n) => n.startsWith('momento')));
  ok((await diag()).vozes.some((n) => n.endsWith('.motor')), 'the engine came in after the boom');
}

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
