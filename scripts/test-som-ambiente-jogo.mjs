// BLOCK SOUND (18/11) — sheet 8 IN THE GAME: the bed of each place, the swaps the screen drives (the cave, the turn of the
// F3's acts, the flooded chamber), the effects tied to the scenery and the depth of the far sounds.
//   npm run dev  in another terminal, then  node scripts/test-som-ambiente-jogo.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const porta = process.argv.includes('--porta') ? process.argv[process.argv.indexOf('--porta') + 1] : '5173';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
// (reduced motion: no lightning, so the only thunder here is the one this test asks for)
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, reducedMotion: 'reduce' });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1200);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());
await page.waitForTimeout(600);

const diag = () => page.evaluate(() => window.__som.diagnostico());
const vozes = async () => (await diag()).vozes;
const desde = async () => (await diag()).tocados.length;
const novos = async (n) => (await diag()).tocados.slice(n);
const cena = (k, d) => page.evaluate(([x, dados]) => window.__game.scene.getScenes(true)[0].scene.start(x, dados), [k, d]);
async function fase(stage) {
  await cena('Game', { stage, ship: 'interceptor' });
  await page.waitForFunction((id) => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.ship?.active && s.stage?.id === id && s.ambiente; }, stage, { timeout: 60000 }).catch((e) => { console.log('a fase não abriu', stage, erros); throw e; });
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; });
  // (the F1 opens on the sonic boom alone: its bed comes in with the engine, after it)
  await page.waitForFunction(() => window.__som.diagnostico().vozes.some((v) => v.startsWith('amb.')), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(400);
}
/** one call of the stage's ambience with a made-up frame */
const quadro = (q) => page.evaluate((o) => {
  const s = window.__game.scene.getScene('Game');
  s.ambiente.quadro(o.dt ?? 0.016, { t: s.elapsed, chefe: false, caverna: false, agua: 'seco', duelo: null, nave: s.ship, perigos: [], ...o });
}, q);

// ── the menu and the hangar ──
ok((await vozes()).includes('amb.menu.noite'), 'the night menu: the storm bed', await vozes());
ok((await vozes()).includes('amb.menu.tempestade'), 'the night menu: his six-minute storm, streamed over the bed', await vozes());
{
  const n = await desde();
  await page.evaluate(async () => {
    const { somDoRelampago } = await import('/src/som/somDaInvasao.ts');
    somDoRelampago(window.__game.scene.getScene('Menu'), true);
  });
  // (19/11, him: the thunder ~1 s after the flash — the bolt is still far)
  const cedo = await (async () => { await page.waitForTimeout(600); return novos(n); })();
  ok(!cedo.some((x) => x.startsWith('fx.menu.trovao')), 'a bolt: no thunder yet 0.6 s after the flash', cedo);
  await page.waitForTimeout(900);
  const t = await novos(n);
  ok(t.some((x) => x.startsWith('fx.menu.trovao.perto')), 'a bolt: the close thunder ~1 s after the flash', t);
}
await cena('Hangar', {});
await page.waitForFunction(() => window.__game.scene.isActive('Hangar'), null, { timeout: 30000 });
await page.waitForTimeout(500);
ok((await vozes()).includes('amb.hangar'), 'the hangar: its own bed', await vozes());
ok((await vozes()).includes('amb.hangar.chuva'), 'the hangar: the rain heard from inside', await vozes());
ok(!(await vozes()).includes('amb.menu.noite'), 'the menu storm did not cross the scene change', await vozes());
ok(!(await vozes()).includes('amb.menu.tempestade'), 'the streamed storm left with the menu', await vozes());

// ── F1: the wind and the cave ──
await fase(1);
ok((await vozes()).includes('amb.f1.fora'), 'F1: the wind', await vozes());
// (the real frames drive it: only what the Parallax answers is forced)
const caverna = (v) => page.evaluate((x) => { window.__game.scene.getScene('Game').parallax.cavernaAberta = () => x; }, v);
await caverna(true);
await page.waitForTimeout(400);
ok((await diag()).lugar === 'caverna', 'the cave OPENS: the acoustics of the cave', (await diag()).lugar);
ok((await vozes()).includes('amb.f1.caverna'), 'the cave: its own bed', await vozes());
await caverna(false);
await page.waitForTimeout(400);
ok((await diag()).lugar === 'atmosfera', 'out of the cave: back to the open air', (await diag()).lugar);
{
  const n = await desde();
  await page.evaluate(async () => {
    const { SomDaInvasao } = await import('/src/som/somDaInvasao.ts');
    const s = new SomDaInvasao(window.__game.scene.getScene('Game'));
    s.nave(150, 204); s.nave(338, 292); s.explodiu(200);
  });
  await page.waitForTimeout(250);
  let t = await novos(n);
  ok(t.filter((x) => x.startsWith('fx.f1.flyby')).length === 2 && new Set(t).size === 2, 'the invaders: a different take for each ship', t);
  ok(!t.some((x) => x.startsWith('fx.f1.explosao')), 'a blast on the horizon is SEEN first', t);
  await page.waitForTimeout(1500);
  t = await novos(n);
  ok(t.some((x) => x.startsWith('fx.f1.explosao')), 'and heard a moment later', t);
}
ok(await page.evaluate(() => window.__som.caudas.size >= 1), 'the far sounds ring in their own tail');

// ── F2: the belt from afar, the rocks close by ──
await fase(2);
ok(await page.evaluate(() => window.__som.caudas.size === 0), 'the tails of the last scene left with it');
ok((await vozes()).includes('amb.f2'), 'F2: the cabin bed', await vozes());
{
  const n = await desde();
  for (let i = 0; i < 16; i++) await quadro({ dt: 8 });
  const t = await novos(n);
  ok(['fx.f2.laser', 'fx.f2.martelo', 'fx.f2.metal'].every((x) => t.includes(x)), 'the laser, the hammers and the dead metal, drawn over the bed', t);
}
{
  const n = await desde();
  const achou = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const casco = s.parallax.pecasDaCamada('derelict')[0];
    if (!casco) return false;
    const q = { t: s.elapsed + 20, chefe: false, caverna: false, agua: 'seco', duelo: null, nave: s.ship, perigos: [] };
    casco.x = 345; s.ambiente.quadro(0.016, q);
    casco.x = 320; s.ambiente.quadro(0.016, q);
    return true;
  });
  ok(achou && (await novos(n)).some((x) => x.startsWith('fx.f2.rangido')), 'a dead capital ship drifting into view: the cabin creaks', await novos(n));
}
{
  const n = await desde();
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const h = s.debris.spawnEm('asteroid', s.ship.x - 5, s.ship.y + 10);
    s.ambiente.quadro(0.016, { t: s.elapsed + 50, chefe: false, caverna: false, agua: 'seco', duelo: null, nave: s.ship, perigos: [h] });
    h.destroy();
  });
  ok((await novos(n)).includes('fx.f2.passa'), 'a rock passing close, without touching', await novos(n));
  const m = await desde();
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const h = s.debris.spawnEm('asteroid', s.ship.x - 5, s.ship.y + 10);
    h.setData('bateu', true);
    s.ambiente.quadro(0.016, { t: s.elapsed + 100, chefe: false, caverna: false, agua: 'seco', duelo: null, nave: s.ship, perigos: [h] });
    h.destroy();
  });
  ok(!(await novos(m)).includes('fx.f2.passa'), 'a rock that HIT the ship is not a near miss');
  const k = await desde();
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.invulnerableUntil = 0; s.semDanoAte = 0;
    s.damageShip('perigo.impacto', 'fx.f2.cascalho');
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  });
  ok((await novos(k)).includes('fx.f2.cascalho'), 'hitting the rock: the gravel', await novos(k));
}

// ── F3: the nebula, then the hull ──
await fase(3);
ok((await vozes()).some((v) => v === 'amb.f3.nebulosa' || v === 'amb.f3.casco'), 'F3: a bed of its place', await vozes());
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.ambiente.noCasco = false; s.ambiente.paraOCasco(); });
await page.waitForTimeout(300);
ok((await vozes()).includes('amb.f3.casco'), 'the turn of the acts: the hull', await vozes());
{
  const n = await desde();
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.ambiente.rabo(); s.parallax.aoEventoDoCenario('vapor', 100); s.parallax.aoEventoDoCenario('faisca', 200); s.parallax.aoEventoDoCenario('clarao', 300); });
  await page.waitForTimeout(900);
  const t = await novos(n);
  ok(t.includes('fx.f3.rabo'), "the Leviathan's tail", t);
  ok(t.includes('fx.f3.vapor') && t.some((x) => x.startsWith('fx.f3.faiscas')), 'the living hull: the vapour and the sparks', t);
  ok(t.includes('fx.f3.baque'), 'the battle far off: the thump after the flash', t);
}

// ── F4: the creature and the flooded chamber ──
await fase(4);
ok((await vozes()).includes('amb.f4.interior'), 'F4: the breathing', await vozes());
{
  const n = await desde();
  const agua = (estado) => page.evaluate((e) => {
    Object.defineProperty(window.__game.scene.getScene('Game').agua, 'estadoAtual', { configurable: true, get: () => ({ estado: e, nivel: 0.5, alpha: 1 }) });
  }, estado);
  await agua('enchendo');
  await page.waitForTimeout(400);
  ok((await novos(n)).includes('fx.f4.agua.sobe'), 'the water rising', await novos(n));
  ok((await diag()).lugar === 'agua', 'the chamber floods: the acoustics of the water', (await diag()).lugar);
  ok((await vozes()).includes('amb.f4.agua'), 'the flooded chamber: its own bed', await vozes());
  const m = await desde();
  await agua('esvaziando');
  await page.waitForTimeout(400);
  ok((await novos(m)).includes('fx.f4.agua.desce'), 'the water draining', await novos(m));
  ok((await diag()).lugar === 'interior', 'drained: back to the creature', (await diag()).lugar);
}

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `${falhas} falha(s)` : 'tudo certo');
process.exitCode = falhas ? 1 : 0;
