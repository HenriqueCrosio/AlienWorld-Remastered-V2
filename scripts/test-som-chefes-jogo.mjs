// BLOCK SOUND (16/11) — sheet 5 (the bosses) IN THE GAME. 5a, the machines: the F1 tower's fan (the metronome), the
// takeoff at half life, the missile's charge then its launch, the aimed shot in the air; the Capitânia's hangar, the
// rolling broadside (one sound per battery), the flak (launch, burst) and the frenzy at half life.
//   npm run dev  in another terminal, then  node scripts/test-som-chefes-jogo.mjs
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

async function iniciar(stage) {
  await page.evaluate((st) => {
    const g = window.__game;
    const dados = { stage: st, ship: 'interceptor' };
    if (g.scene.isActive('Game')) g.scene.getScene('Game').scene.restart(dados);
    else g.scene.getScene('Menu').scene.start('Game', dados);
  }, stage);
  await page.waitForTimeout(500);
  await page.waitForFunction((st) => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.stage?.id === st && s.ship?.active; }, stage, { timeout: 30000 });
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; s.spawnBoss(); });
  // the boss sails in to its station
  await page.waitForFunction(() => { const b = window.__game.scene.getScene('Game').boss; return b && !b.entering; }, null, { timeout: 30000 });
}
async function ouvir(fn, ms) {
  const n0 = await desde();
  await page.evaluate((f) => new Function('s', 'b', f)(window.__game.scene.getScene('Game'), window.__game.scene.getScene('Game').boss), fn);
  await page.waitForTimeout(ms);
  return novos(n0);
}
const conta = (t, n) => t.filter((x) => x === n).length;

// ── 5a · the F1 tower ──
await iniciar(1);
let t = await ouvir('', 2300);
ok(t.includes('chefe.torre.leque'), 'the tower fires its FAN (the metronome)', t);
t = await ouvir('b.hp = Math.floor(b.maxHp / 2) + 1; b.damage(2);', 1600);
ok(t.includes('chefe.torre.decolagem'), 'at half life it TAKES OFF', t);
ok((await diag()).vozes.includes('chefe.torre.motor'), 'in the air her THRUSTERS loop', (await diag()).vozes);
t = await ouvir('b.missileCooldown = 0;', 1500);
ok(t.indexOf('chefe.torre.missilCarga') >= 0 && t.indexOf('chefe.torre.missilCarga') < t.indexOf('chefe.torre.missil'), 'in the air: the missile CHARGES, then LAUNCHES', t);
t = await ouvir('b.fanMute = 0; b.cooldown = 0;', 900);
ok(t.includes('chefe.torre.mirado'), 'in the air the fan is followed by the AIMED shot', t);

// ── 5a · the Capitânia ──
await iniciar(2);
// (the hangar holds at most 5 live kamikazes: clear the first cycle's — twice, since they are born 180 ms apart —
// then restart the score)
const limpa = "[...s.enemies.enemies.getChildren()].forEach((e) => e.getData('kind') === 'kamikaze' && e.destroy());";
await ouvir(limpa, 1000);
t = await ouvir(`${limpa} b.cycleT = 0; b.beatIdx = 0;`, 2200);
ok(t.includes('chefe.capitania.hangar'), 'the Capitânia\'s HANGAR drops its interceptors', t);
ok(conta(t, 'chefe.capitania.bordada') === 3, `the broadside rolls: one sound per battery (${conta(t, 'chefe.capitania.bordada')})`, t);
// (the ship in a corner: a shell that touches it is absorbed before it can burst)
t = await ouvir('b.hp = Math.floor(b.maxHp / 2) - 1; s.ship.setPosition(14, 204);', 5000);
ok(t.includes('chefe.capitania.furia'), 'at half life: the FRENZY', t);
ok(t.includes('chefe.capitania.flak') && t.includes('chefe.capitania.flakEstouro'), 'the flak: launched, then bursting', t);
ok(t.indexOf('chefe.capitania.flakPavio') >= 0 && t.indexOf('chefe.capitania.flakPavio') < t.indexOf('chefe.capitania.flakEstouro'), 'the fuse CLICKS before the burst', t);

// ── 5b · the Serpente ──
const n0 = await desde();
await iniciar(3);
t = await novos(n0);
ok(t.includes('serpente.chegada.tremor') && t.indexOf('serpente.chegada.tremor') < t.indexOf('serpente.chegada.rompe'), 'the hull TREMBLES, then she BREAKS OUT', t);
t = await ouvir("b.ciclo.estado = 'pausa'; b.ciclo.t = 0;", 4500);
ok(t.includes('serpente.tiro'), 'her heads fire (one sound per salvo)', t);
t = await ouvir("b.habs.raio.comecar(); b.ciclo.hab = 'raio'; b.ciclo.estado = 'hab';", 6000);
const raio = ['serpente.raio.leitura', 'serpente.raio.trava', 'serpente.raio.carga', 'serpente.raio.disparo', 'serpente.raio.recupera'];
ok(raio.every((n) => t.includes(n)), 'the beam: reads, locks, charges, fires, snaps shut', raio.filter((n) => !t.includes(n)));
ok(raio.every((n, i) => i === 0 || t.indexOf(raio[i - 1]) < t.indexOf(n)), 'in that order', t.filter((n) => raio.includes(n)));
t = await ouvir("b.habs.chuva.comecar(); b.ciclo.hab = 'chuva'; b.ciclo.estado = 'hab';", 5000);
ok(t.includes('serpente.chuva.onda') && t.includes('serpente.chuva.impacto'), 'the rain: the waves come down and burst on the hull', t);
const cabecas = await page.evaluate(() => window.__game.scene.getScene('Game').boss.corpoHab.cores.length);
// (at least one per head: her own cycle may start a rain of its own inside the window)
ok(conta(t, 'serpente.chuva.salva') >= cabecas, `each head launches ITS salvo (${conta(t, 'serpente.chuva.salva')} for ${cabecas} heads)`, t);
// (the skill opens with her jaws: the breath starts ~1.2 s in, the first spark ~4.6 s in)
t = await ouvir("b.habs.gas.comecar(); b.ciclo.hab = 'gas'; b.ciclo.estado = 'hab';", 3000);
ok((await diag()).vozes.includes('serpente.gas.sopro'), 'the green BREATHES the gas (a loop)', (await diag()).vozes);
t = [...t, ...(await ouvir('', 4000))];
ok(t.includes('serpente.gas.carga') && t.includes('serpente.gas.faisca'), 'the orange charges, then the spark strikes', t);
t = await ouvir('b.corpoHab.contra();', 300);
ok(t.includes('serpente.dor'), 'the jelly in their faces: they FLINCH', t);
t = await ouvir('b.habs.gas.abortar(); b.transicao();', 900);
ok(t.includes('serpente.cabecaMorre'), 'a head DIES between the forms', t);
ok(!(await diag()).vozes.includes('serpente.gas.sopro'), 'an aborted gas stops its breath', (await diag()).vozes);
const nFusao = await desde();
t = await ouvir('b.fusao();', 6000);
ok(t.includes('serpente.fusao.afunda') && t.includes('serpente.fusao.converge'), 'the fusion: the heads sink, the lights converge', t);

// ── 5b · the eel (her worker's hazards and gestures) ──
const temEnguia = await page.waitForFunction(() => window.__game.scene.getScene('Game').boss?.enguia?.ativa, null, { timeout: 30000 }).then(() => true, () => false);
ok(temEnguia, 'the eel comes out of the fusion', temEnguia);
t = await ouvir('', 16000);
const daEnguia = t.filter((n) => n.startsWith('enguia.'));
ok(t.includes('enguia.canos.carga') && t.includes('enguia.canos.jato'), 'her fire pipes CHARGE, then the jets cross', daEnguia);
// (her entry's arc — the first scrape — already runs inside the fusion's wait: counted from the fusion)
const desdeAFusao = (await novos(nFusao)).filter((n) => n.startsWith('enguia.raspa'));
ok(desdeAFusao.length > 0, 'her body SCRAPES the hull (one of the two variations)', desdeAFusao);
t = await ouvir('b.enguia.mordida(22);', 300);
ok(t.includes('enguia.anel'), 'a ring torn off: her pain', t);

// ── the Aurora's last blast (cutscene 1): its own hollow boom, not the open-air boss's end ──
const n1 = await desde();
await page.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach((s) => s.scene.stop()); g.scene.start('Interlude', { score: 0, handling: 'diegetico' }); });
await page.waitForFunction(() => window.__game.scene.isActive('Interlude'), null, { timeout: 20000 });
await page.evaluate(() => window.__game.scene.getScene('Interlude').implosao());
await page.waitForTimeout(3600);
t = await novos(n1);
ok(t.includes('momento.aurora.fim') && !t.includes('explosao.chefeFim'), 'the Aurora ends on a HOLLOW muffled boom, not the open-air one', t.filter((n) => !n.startsWith('explosao.metal')));

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
