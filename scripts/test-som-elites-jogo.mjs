// BLOCK SOUND (16/11) — sheet 4 (the elites) IN THE GAME: each gesture plays its sound at the game's own moment.
// The mining drone drills (a loop) until it notices you, alerts, fires, blinks; the sentinel's wheel rolls only while it
// rolls, it opens, fires the heavy ball and the minigun, takes a shot on the shield and closes; the squid surfaces, aims,
// locks, fires the needles and inks; the Larva bores, comes out and lays; the pupa hatches and the SWARM loop starts; the
// Tube swells and pulses; a spore sticking to the ship sounds.
//   npm run dev  in another terminal, then  node scripts/test-som-elites-jogo.mjs
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
const vozes = async () => (await diag()).vozes;

async function iniciar(stage) {
  await page.evaluate((st) => {
    const g = window.__game;
    const dados = { stage: st, ship: 'interceptor' };
    if (g.scene.isActive('Game')) g.scene.getScene('Game').scene.restart(dados);
    else g.scene.getScene('Menu').scene.start('Game', dados);
  }, stage);
  await page.waitForTimeout(500);
  await page.waitForFunction((st) => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.stage?.id === st && s.ship?.active; }, stage, { timeout: 30000 });
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; });
}
/** runs `fn` in the Game scene (s), waits `ms`, returns the sounds played meanwhile */
async function ouvir(fn, ms) {
  const n0 = await desde();
  await page.evaluate((f) => new Function('s', f)(window.__game.scene.getScene('Game')), fn);
  await page.waitForTimeout(ms);
  return novos(n0);
}
const antes = (t, a, b) => t.includes(a) && t.includes(b) && t.indexOf(a) < t.indexOf(b);

// ── F2: the mining drone ──
await iniciar(2);
let t = await ouvir(`window.__d = s.enemies.spawn('droneMineracao', 100, 300); s.ship.setPosition(60, 190);`, 700);
ok((await vozes()).includes('drone.minerar'), 'the mining drone DRILLS (a loop) while it works in the rock', await vozes());
t = await ouvir(`s.ship.setPosition(window.__d.x - 70, window.__d.y);`, 800);
ok(t.includes('drone.alerta'), 'it notices you and ALERTS', t);
ok(!(await vozes()).includes('drone.minerar'), 'the drill stops when it stops mining', await vozes());
// far away, so it hunts and fires instead of reaching the ship and blowing up
t = await ouvir(`s.ship.setPosition(30, 20);`, 2200);
ok(t.includes('drone.tiro'), 'it fires its crystals', t);
t = await ouvir(`s.ship.setPosition(window.__d.x - 10, window.__d.y);`, 900);
ok(t.includes('drone.pisca'), 'close up it BLINKS before blowing itself up', t);

// ── F2: the sentinel ──
await iniciar(2);
t = await ouvir(`window.__sen = s.enemies.spawn('sentinela', 100);`, 300);
ok((await vozes()).includes('sentinela.rolar'), 'the sentinel\'s WHEEL rolls', await vozes());
t = await ouvir('', 3800);
ok(t.includes('sentinela.abrir'), 'it OPENS at its post', t);
ok(t.includes('sentinela.balaco') && t.includes('sentinela.minigun'), 'it fires the heavy ball and the minigun', t);
const sobrecarga = t;
const escudo = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const e = window.__sen;
  const n0 = window.__som.diagnostico().tocados.length;
  const bloqueou = s.enemies.bloqueia(e, e.x - 60, e.y, 1);
  return { bloqueou, tocados: window.__som.diagnostico().tocados.slice(n0) };
});
ok(!escudo.bloqueou || escudo.tocados.includes('sentinela.escudo'), 'a shot on the shield sounds the shield', escudo);
t = await ouvir('', 5000);
ok(t.includes('sentinela.fechar'), 'it CLOSES and rolls on', t);
ok([...sobrecarga, ...t].includes('sentinela.sobrecarga'), 'the OVERLOAD spins up before the sweep', [...sobrecarga, ...t]);

// ── F3: the squid ──
await iniciar(3);
t = await ouvir(`s.enemies.spawn('cacador', 100);`, 3600);
ok(antes(t, 'lula.surge', 'lula.mira') && antes(t, 'lula.mira', 'lula.trava') && antes(t, 'lula.trava', 'lula.agulhas'), 'the squid surfaces, AIMS, LOCKS, fires the needles — in that order', t);
ok(t.includes('lula.tinta'), 'and inks', t);

// ── F4: the Larva, the pupa, the swarm, the Tube, the spore ──
await iniciar(4);
t = await ouvir(`s.enemies.spawn('larva', 120);`, 2200);
ok(t.includes('larva.perfura') && t.includes('larva.sai') && t.includes('larva.poe'), 'the Larva bores, comes out and lays its pupae', t);
t = await ouvir('', 2600);
ok(t.includes('pupa.eclode'), 'a pupa HATCHES', t);
ok((await vozes()).includes('mosca.zumbido'), 'the SWARM loop buzzes while flies are alive', await vozes());
const n = await page.evaluate(() => window.__som.diagnostico().vozes.filter((v) => v === 'mosca.zumbido').length);
ok(n === 1, `ONE loop for the whole swarm (${n})`, n);

t = await ouvir(`const e = s.enemies.spawn('tubo', 200); e.getData('elite').espera = 99;`, 7000);
ok(antes(t, 'tubo.incha', 'tubo.pulso'), 'the Tube SWELLS, then pulses', t);
t = await ouvir(`s.esporos.soltar(s.ship.x, s.ship.y, { ang: 0, vel: 0, freiaS: 1, atrasoS: 0 }); const g = s.esporos.grupo.getChildren(); s.tocarEsporo(g[g.length - 1]);`, 300);
ok(t.includes('esporo.grudar'), 'a spore sticking to the ship sounds', t);

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
