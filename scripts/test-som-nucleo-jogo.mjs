// BLOCK SOUND (17/11) — sheet 5c (the F4 core) IN THE GAME. The Guardião: the fan of globules, the telegraph with its
// lock and the lunge, the saw (warning, launch, the spin loop, the bite, the jolts — the loop silent while stuck), the
// shell bursting. The Predador: the landing, the ceiling grip, the chest charge, the gallop loop on the charge, the slash
// that MISSES turning into the one that HITS when the ship is struck, the lava (charge, throw, landing), the exit and its
// warning, the rip with the molten metal, the dark and its heartbeat (two takes), the death.
//   npm run dev  in another terminal, then  node scripts/test-som-nucleo-jogo.mjs
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
const conta = (t, n) => t.filter((x) => x === n).length;
const antesDe = (t, a, b) => t.indexOf(a) >= 0 && t.indexOf(a) < t.indexOf(b);

await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScene('Menu').scene.start('Game', { stage: 4, ship: 'interceptor' });
});
await page.waitForTimeout(500);
await page.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.stage?.id === 4 && s.ship?.active; }, null, { timeout: 30000 });
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; s.spawnBoss(); });
await page.waitForFunction(() => { const b = window.__game.scene.getScene('Game').boss; return b && !b.entering; }, null, { timeout: 30000 });
ok((await diag()).lugar === 'interior', 'the F4 fight is INSIDE the creature (no vacuum containment)', (await diag()).lugar);

// the way to the core: the Predador heard FAR AWAY, from the script (round 2: *"antes mesmo do encontro"*)
{
  const roteiro = await page.evaluate(async () => {
    const { STAGE_4 } = await import('/src/systems/StageDirector.ts');
    return STAGE_4.filter((e) => e.type === 'urro').map((e) => ({ t: e.t, som: e.som, forca: e.forca }));
  });
  ok(roteiro.length >= 2 && roteiro.every((e) => e.t < 118), `the F4 script has roars BEFORE the encounter (${roteiro.map((e) => e.t).join(', ')} s)`, roteiro);
  ok(roteiro.every((e, i) => i === 0 || e.forca >= roteiro[i - 1].forca), 'each roar nearer than the last', roteiro);
  const n = await desde();
  await page.evaluate((e) => window.__game.scene.getScene('Game').runEvent({ type: 'urro', ...e }), roteiro[0]);
  await page.waitForTimeout(150);
  ok((await novos(n)).includes(roteiro[0].som), 'the script event plays the far roar', await novos(n));
}

async function ouvir(fn, ms) {
  const n0 = await desde();
  await page.evaluate((f) => { const s = window.__game.scene.getScene('Game'); new Function('s', 'b', 'p', f)(s, s.boss, s.boss.predador); }, fn);
  await page.waitForTimeout(ms);
  return novos(n0);
}
const vozes = async () => (await diag()).vozes;

// ── the Guardião ──
let t = await ouvir("b.acao = 'flutua'; b.cdTiro = 0;", 600);
ok(t.includes('guardiao.leque'), 'he spits his FAN of globules (one sound per fan)', t);
t = await ouvir("b.acao = 'flutua'; b.acaoT = 0; b.proxima = 'investida';", 1600);
ok(antesDe(t, 'guardiao.telegrafo', 'guardiao.trava') && antesDe(t, 'guardiao.trava', 'guardiao.investida'), 'the telegraph (the heart), the LOCK, then the LUNGE', t);
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.acao === 'flutua', null, { timeout: 8000 });
const n0 = await desde();
await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; b.acaoT = 0; b.proxima = 'serra'; });
// (the first diagonal's angle is drawn 24–48°: a shallow one leaves by the left before the bottom bite — the game's own
// rule. The test pins it at 45°, so both bites happen)
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.serra, null, { timeout: 4000 });
await page.evaluate(() => { window.__game.scene.getScene('Game').boss.serra.ang = Math.PI / 4; });
await page.waitForTimeout(900);
ok((await vozes()).includes('guardiao.serra.giro'), 'the saw flies: its SPIN loop sounds', await vozes());
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.serra?.cravada, null, { timeout: 6000 }).catch(() => {});
await page.waitForTimeout(250);
ok(!(await vozes()).includes('guardiao.serra.giro'), 'stuck in the edge, the spin loop is SILENT', await vozes());
await page.waitForFunction(() => !window.__game.scene.getScene('Game').boss.serra, null, { timeout: 12000 }).catch(() => {});
t = await novos(n0);
ok(antesDe(t, 'guardiao.serra.aviso', 'guardiao.serra.lanca'), 'the saw: the WARNING thread, then the LAUNCH', t);
ok(conta(t, 'guardiao.serra.crava') >= 2, `the saw BITES the edges (${conta(t, 'guardiao.serra.crava')}×)`, t);
ok(conta(t, 'guardiao.serra.tranco') >= 3, `one JOLT per attempt to turn: 2 on top + 1 below (${conta(t, 'guardiao.serra.tranco')})`, t);
await page.waitForTimeout(300); // (the loop's 90 ms fade)
ok(!(await vozes()).includes('guardiao.serra.giro'), 'the saw gone, its loop is gone', await vozes());

// ── the change ──
// (damage(999): more than his whole life — the dev one-shot that passes the step lock of 23/11)
t = await ouvir('b.hpGuardiao = 1; b.damage(999);', 4200);
ok(t.includes('guardiao.casca'), 'the SHELL bursts', t);
ok(antesDe(t, 'predador.urro', 'predador.pouso'), 'the Predador comes out ROARING (his F), then LANDS', t);
await page.waitForFunction(() => ['chao', 'teto'].includes(window.__game.scene.getScene('Game').boss.predador?.estado), null, { timeout: 8000 });

// ── the Predador ──
const nG = await desde();
await page.evaluate(() => window.__game.scene.getScene('Game').boss.predador.carregar());
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador?.estado === 'bote', null, { timeout: 6000 });
await page.waitForTimeout(100);
ok((await vozes()).includes('predador.galope'), 'on the charge he GALLOPS (the loop)', await vozes());
await page.waitForTimeout(3500);
t = await novos(nG);
ok(antesDe(t, 'predador.carga', 'predador.golpe.erra'), 'the chest CHARGES, then the slash', t);
ok(!(await vozes()).includes('predador.galope'), 'the slash stops the gallop', await vozes());
ok(!t.includes('predador.golpe.acerta'), 'the ship untouched: the slash is the MISS', t);
await page.waitForFunction(() => ['chao', 'teto'].includes(window.__game.scene.getScene('Game').boss.predador?.estado), null, { timeout: 8000 });
const n1 = await desde();
await page.evaluate(() => window.__game.scene.getScene('Game').boss.predador.carregar());
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador?.estado === 'slash', null, { timeout: 6000 });
await page.waitForTimeout(120);
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.ship.setData('golpeEm', s.time.now); });
await page.waitForTimeout(200);
t = await novos(n1);
ok(antesDe(t, 'predador.golpe.erra', 'predador.golpe.acerta'), 'struck mid-swing: the miss gives way to the HIT', t);
ok(!(await vozes()).includes('predador.golpe.erra'), 'the miss is silenced at the hit', await vozes());
await page.waitForFunction(() => ['chao', 'teto'].includes(window.__game.scene.getScene('Game').boss.predador?.estado), null, { timeout: 8000 });
// (the balls are aimed at the ship and burst ON it: out of the way for this one — its body off, back after)
// (and mid-screen: from the left edge the first ball flies off the screen before it lands)
const nL = await desde();
// (the boss is called at the START of the F4 here, with its scenery pieces still on the floor — and a piece is COVER: it
// takes the ball a pixel before the floor. The real arena clears them (`soFundo`); so does the test)
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  for (const g of [s.terrain.props, s.debris.hazards]) [...g.getChildren()].forEach((o) => o.destroy());
  s.ship.body.enable = false;
  s.ship.setPosition(200, 108);
  s.boss.predador.telegrafarLava();
});
// (wait for the balls to be thrown and to come down, not a fixed time)
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.lavas.length > 0, null, { timeout: 4000 }).catch(() => {});
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.lavas.length === 0, null, { timeout: 6000 }).catch(() => {});
await page.waitForTimeout(100);
t = await novos(nL);
await page.evaluate(() => { window.__game.scene.getScene('Game').ship.body.enable = true; });
ok(antesDe(t, 'predador.lava.carga', 'predador.lava.arremesso') && antesDe(t, 'predador.lava.arremesso', 'predador.lava.impacto'), 'the lava: the chest boils, the throw, the landing', t);
await page.waitForFunction(() => ['chao', 'teto'].includes(window.__game.scene.getScene('Game').boss.predador?.estado), null, { timeout: 8000 });
t = await ouvir("p.irPara(p.constructor.ANCORAS.find((a) => a.lado === 'teto'));", 1200);
ok(t.includes('predador.agarra'), 'he leaps and GRIPS the ceiling', t);
await page.waitForFunction(() => ['chao', 'teto'].includes(window.__game.scene.getScene('Game').boss.predador?.estado), null, { timeout: 8000 });
t = await ouvir('p.sair();', 6000);
ok(antesDe(t, 'predador.urro3', 'predador.aviso'), 'he leaves the screen ROARING (his D)', t);
ok(antesDe(t, 'predador.aviso', 'predador.rasgo') && antesDe(t, 'predador.rasgo', 'predador.metal'), 'out and back: the WARNING at the edge, the RIP, the molten METAL', t);

// ── phase 2: a roar (his E) ──
await page.waitForFunction(() => ['chao', 'teto'].includes(window.__game.scene.getScene('Game').boss.predador?.estado), null, { timeout: 10000 });
t = await ouvir('p.hp = Math.floor(p.constructor.HP * 0.6);', 500);
ok(t.includes('predador.urro2'), 'phase 2: he ROARS (his E)', t);

// ── the dark ──
await ouvir('p.hp = Math.floor(p.constructor.HP * 0.3);', 0);
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador?.breu, null, { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(1500);
const nB = await desde();
await page.waitForTimeout(5500); // (two of the core's 2.4 s pulses)
const tB = await novos(nB);
t = (await diag()).tocados;
ok(t.includes('predador.breu'), 'phase 3: he roars and the light DIES', t.slice(-12));
const batidas = conta(tB, 'predador.pulso') + conta(tB, 'predador.pulso2');
ok(batidas >= 1, `in the dark, his HEARTBEAT on the core's slow pulse (${batidas})`, t);

// ── the death ── (only where he can be hurt: not while out of the screen)
await page.waitForFunction(() => ['chao', 'teto'].includes(window.__game.scene.getScene('Game').boss.predador?.estado), null, { timeout: 10000 });
t = await ouvir('p.hp = 1; b.damage(5);', 1500);
ok(t.includes('predador.morte'), 'the DEATH', t);
await page.waitForTimeout(400);
ok(!(await vozes()).includes('predador.galope'), 'dead, no gallop left running', await vozes());

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
