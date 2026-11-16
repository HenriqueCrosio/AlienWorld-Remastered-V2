// BLOCK SOUND (16/11) — sheet 3 (the common enemies and the hazards) IN THE GAME: each hook plays its sound at the
// game's own moment. The gunship warns (the 0.45 s blink) and then fires; the spider's fan plays ONE heavy shot; the
// spider crouches, jumps and lands; the jellyfish crackles; the carrier's bay drops a drone; the colony turret warns and
// fires its cannon, the hull launcher its rocket; the sensor mine wakes with its fuse; a rock hitting the ship adds the
// collision only when the hit COUNTS; the duct door tears before its blast; the sphincter's gas hisses until it lights,
// then the ignition and the splatter.
//   npm run dev  in another terminal, then  node scripts/test-som-inimigos-jogo.mjs
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
ok(d.carregados[0] === d.carregados[1], `every sound of the catalogue is loaded (${d.carregados.join('/')})`, d.carregados);

async function iniciar(stage, ship = 'interceptor') {
  await page.evaluate(([st, sh]) => {
    const g = window.__game;
    const dados = { stage: st, ship: sh };
    if (g.scene.isActive('Game')) g.scene.getScene('Game').scene.restart(dados);
    else g.scene.getScene('Menu').scene.start('Game', dados);
  }, [stage, ship]);
  await page.waitForTimeout(500);
  await page.waitForFunction((st) => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.stage?.id === st && s.ship?.active; }, stage, { timeout: 30000 });
  // nobody dies here: the test listens, it does not play (the rock's collision is tested on its own below)
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; });
}
/** runs `fn` in the Game scene, waits `ms`, returns the sounds played meanwhile */
async function ouvir(fn, ms, arg) {
  const n0 = await desde();
  await page.evaluate(([f, a]) => new Function('s', 'a', f)(window.__game.scene.getScene('Game'), a), [fn, arg]);
  await page.waitForTimeout(ms);
  return novos(n0);
}
const conta = (lista, nome) => lista.filter((n) => n === nome).length;

// ── the F2: the gunship, the carrier, the sensor mine, the rock ──
await iniciar(2);
let t = await ouvir(`const e = s.enemies.spawn('canhoneira', 90, 300); e.setData('cooldown', 0.05);`, 1100);
ok(t.includes('inimigo.aviso'), 'the gunship WARNS (its blink)', t);
ok(t.includes('inimigo.tiro') && t.indexOf('inimigo.aviso') < t.indexOf('inimigo.tiro'), 'then it FIRES, after the warning', t);

t = await ouvir(`const e = s.enemies.spawn('cargueiro', 60, 330); e.setData('spawnCd', 0.05);`, 600);
ok(t.includes('cargueiro.largar'), 'the carrier\'s bay drops a drone', t);

t = await ouvir(`s.debris.spawnEm('sensor', s.ship.x + 20, s.ship.y);`, 400);
ok(t.includes('sensor.acordar') && t.includes('sensor.pavio'), 'the sensor mine wakes with its fuse', t);

t = await ouvir(`s.invulnerableUntil = 0; s.damageShip('perigo.impacto');`, 300);
ok(t.includes('perigo.impacto'), 'a rock hitting the ship plays the collision', t);
t = await ouvir(`s.damageShip('perigo.impacto');`, 300);
ok(!t.includes('perigo.impacto'), 'inside the i-frames the collision does not sound again', t);
t = await ouvir(`s.invulnerableUntil = 0; const h = s.debris.spawnEm('asteroid', s.ship.x, s.ship.y); h.body.reset(s.ship.x, s.ship.y);`, 400);
ok(t.includes('perigo.impacto'), 'an ASTEROID on the ship plays it through the real overlap', t);
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; });

t = await ouvir(`s.enemies.spawn('kamikaze', 100);`, 900);
ok(conta(t, 'kamikaze.travar') === 1, 'the kamikaze LOCKS once, when it enters the screen', t);

// the ship's ricochet: the TERMINUS draws among HIS 5; the X-AELO plays his laser one; the Manta's is capped
t = await ouvir(`for (let i = 0; i < 40; i++) { s.ricocheteEm = -Infinity; s.ricochetear(200); }`, 300);
// (40 calls in one frame: the voice cap refuses most — what counts is that the draw varies)
const sorteados = new Set(t.filter((n) => n.startsWith('nave.terminus.ricochete')));
ok(sorteados.size >= 3, `the TERMINUS draws among its 5 ricochets (${sorteados.size} different)`, [...sorteados]);
await page.evaluate(() => { const r = window.__game.registry; r.set('modeloNave', 'jato'); r.set('pinturaNave', 'laranja'); });
await iniciar(2);
t = await ouvir(`s.ricocheteEm = -Infinity; s.ricochetear(200);`, 200);
ok(t.includes('nave.xaelo.ricochete'), 'the X-AELO ricochets with the laser one', t);
await page.evaluate(() => { const r = window.__game.registry; r.set('modeloNave', 'a'); r.set('pinturaNave', 'laranja'); });
await iniciar(2, 'alienigena');
t = await ouvir(`s.ricocheteEm = -Infinity; s.ricochetear(200); s.ricochetear(200); s.ricochetear(200);`, 200);
ok(conta(t, 'nave.charybdis.ricochete') === 1, 'the Manta\'s shot RICOCHETS, at most one per 110 ms', t);
t = await ouvir(`s.ricocheteEm = -Infinity; const h = s.debris.spawnEm('destroco', 250, 100); const b = s.weapons.bullets.get(250, 100); b.setActive(true).setVisible(true); b.body.enable = true; b.setData('damage', 1); s.bulletHitHazard(b, h);`, 200);
ok(t.includes('nave.charybdis.ricochete') && !t.includes('acerto.metal'), 'a shot on the indestructible wreck ricochets instead of the metal hit', t);
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; });

// ── the F3: the spider, the jellyfish, the hull launcher ──
await iniciar(3);
t = await ouvir(`const e = s.enemies.spawn('aranha', 170, 300); e.setVelocityX(0); e.setData('cooldown', 0.05); window.__aranha = e;`, 1000);
ok(conta(t, 'aranha.tiro') === 1 && !t.includes('inimigo.tiro'), 'the spider\'s fan of 3 plays ONE heavy shot (not the gunship\'s)', t);
t = await ouvir(`window.__aranha.setData('puloCd', 0); window.__aranha.setData('cooldown', 99);`, 2200);
ok(t.includes('aranha.aviso') && t.includes('aranha.salto') && t.includes('aranha.pouso'), 'the spider crouches, jumps and lands', t);
ok(t.indexOf('aranha.aviso') < t.indexOf('aranha.salto') && t.indexOf('aranha.salto') < t.indexOf('aranha.pouso'), 'in that order', t);

t = await ouvir(`const e = s.enemies.spawn('aguaViva', 100, 250); e.setData('estalo', 0.05);`, 500);
ok(t.includes('aguaviva.estalo'), 'the jellyfish crackles', t);

t = await ouvir(`s.terrain.spawn('lancaMisseis'); const ps = s.terrain.props.getChildren(); const p = ps[ps.length - 1]; p.setX(300); p.setData('cooldown', 0);`, 900);
ok(t.includes('torre.aviso') && t.includes('torre.missil'), 'the hull launcher warns and fires a ROCKET', t);

// ── the F1: the colony turret ──
await iniciar(1);
t = await ouvir(`s.terrain.spawn('turret'); const ps = s.terrain.props.getChildren(); const p = ps[ps.length - 1]; p.setX(300); p.setData('cooldown', 0);`, 900);
ok(t.includes('torre.aviso') && t.includes('torre.tiro') && !t.includes('torre.missil'), 'the colony turret warns and fires its CANNON', t);

// ── the F4: the door, the sphincter ──
await iniciar(4);
t = await ouvir(`s.terrain.spawn('porta', { hp: 1 }); const ps = s.terrain.props.getChildren(); const p = ps[ps.length - 1]; s.matarPorta(p);`, 400);
ok(t.includes('porta.romper') && t.includes('explosao.carne') && t.indexOf('porta.romper') < t.indexOf('explosao.carne'), 'the door TEARS first, then the meat blast', t);

const gas = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  const S = window.__som;
  s.terrain.spawn('garganta'); const gs = s.terrain.props.getChildren(); const g = gs[gs.length - 1];
  s.esfincter.armar(g);
  await new Promise((r) => setTimeout(r, 300));
  const armado = S.diagnostico().vozes.includes('esfincter.gas');
  s.esfincter.relogio = 1e6; // the cloud is dense
  const n0 = S.diagnostico().tocados.length;
  s.esfincter.acender();
  await new Promise((r) => setTimeout(r, 400));
  return { armado, depois: S.diagnostico().vozes.includes('esfincter.gas'), tocados: S.diagnostico().tocados.slice(n0) };
});
ok(gas.armado, 'the sphincter\'s gas hisses while the cloud grows', gas);
ok(!gas.depois, 'the hiss stops when the gas lights', gas);
ok(gas.tocados.includes('esfincter.acender') && gas.tocados.includes('esfincter.respingo'), 'the ignition, then the splatter', gas.tocados);

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
