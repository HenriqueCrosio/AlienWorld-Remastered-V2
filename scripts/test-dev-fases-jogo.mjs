// THE BOSS PHASES FOR THE DEV KEYS (24/11, the Beast's step 1 — spec 2026-11-24-besta-refeita §7): every boss says the
// phase it is in and jumps to the next one, through its own real transition (the Tower takes off, a Serpent head dies,
// the Guardian swaps to the Beast, she roars and goes dark).
//   npm run dev, then  node scripts/test-dev-fases-jogo.mjs [--porta 5173]
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));

async function abrir(stage) {
  await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.evaluate((st) => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: st, handling: 'diegetico', practice: true }), stage);
  await page.waitForFunction(() => {
    const g = window.__game.scene;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const s = g.getScene('Game');
    return g.isActive('Game') && s.boss && !s.boss.entering;
  }, null, { timeout: 180000, polling: 250 });
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; s.damageShip = () => {}; });
}
const fase = () => page.evaluate(() => window.__game.scene.getScene('Game').boss.devFaseAtual);
// (null is a real answer — "not now / no next one" — so a missing method is told apart, never folded into it)
const proxima = () => page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return b.devProximaFase ? b.devProximaFase() : 'sem devProximaFase'; });
// asks until the boss accepts (it refuses during a transition), up to `s` seconds
async function proximaAceita(s = 30) {
  for (let i = 0; i < s * 10; i++) {
    const r = await proxima();
    if (r !== null) return r;
    await page.waitForTimeout(100);
  }
  return null;
}
const chegar = (alvo, s = 30) =>
  page.waitForFunction((a) => window.__game.scene.getScene('Game').boss.devFaseAtual === a, alvo, { timeout: s * 1000, polling: 100 }).then(() => true, () => false);

// ── F1, the Tower ──
await abrir(1);
conferir((await fase()) === 'torre1', 'a Torre começa em torre1', await fase());
conferir((await proxima()) === 'torre2', 'a próxima é torre2', null);
const torre = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return { k: b.hp / b.maxHp, decolando: b.takingOff || b.airborne }; });
conferir(torre.k <= 0.5 && torre.decolando, 'na metade da vida, decolando (a transição de verdade)', torre);
conferir((await fase()) === 'torre2' && (await proxima()) === null, 'em torre2 não há próxima', await fase());

// ── F2, the Capitânia ──
await abrir(2);
conferir((await fase()) === 'capitania1', 'a Capitânia começa em capitania1', await fase());
conferir((await proxima()) === 'capitania2', 'a próxima é capitania2', null);
const cap = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return { k: b.hp / b.maxHp, furia: b.enraged }; });
conferir(cap.k === 0.5 && cap.furia, 'na metade da vida, em fúria', cap);
conferir((await proxima()) === null, 'em capitania2 não há próxima', null);

// ── F3, the Serpent ──
await abrir(3);
conferir((await fase()) === 'serpenteA', 'a Serpente começa em serpenteA', await fase());
for (const [de, para] of [['serpenteA', 'serpenteB'], ['serpenteB', 'serpenteC'], ['serpenteC', 'enguia']]) {
  const r = await proximaAceita();
  conferir(r === para, `${de} → ${para}`, r);
  conferir(await chegar(para, 60), `a cabeça cai e ela chega a ${para}${para === 'enguia' ? ' (pela cena da fusão)' : ''}`, await fase());
}
conferir((await proximaAceita(3)) === null, 'na enguia não há próxima', await fase());

// ── F4, the Guardian and the Beast ──
await abrir(4);
conferir((await fase()) === 'guardiao1', 'o Guardião começa em guardiao1', await fase());
conferir((await proxima()) === 'guardiao2', 'guardiao1 → guardiao2', null);
let g = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return { degrau: b.degrau }; });
conferir(g.degrau === 1 && (await fase()) === 'guardiao2', 'no degrau 1', g);
conferir((await proxima()) === 'guardiao3', 'guardiao2 → guardiao3', null);
g = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return { degrau: b.degrau, serpentes: b.vistas.has('serpentes') }; });
conferir(g.degrau === 2 && g.serpentes, 'no degrau 2, a trava das serpentes dada como cumprida', g);
conferir((await proxima()) === 'besta1', 'guardiao3 → besta1 (a troca)', null);
conferir(await chegar('besta1', 60), 'a fera surge (besta1)', await fase());
conferir((await proximaAceita(40)) === 'besta2', 'depois de surgir, besta1 → besta2', await fase());
conferir((await fase()) === 'besta2', 'em besta2', await fase());
conferir((await proximaAceita(10)) === 'besta3', 'besta2 → besta3', null);
const breu = await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.fasePassada === 3, null, { timeout: 15000, polling: 100 }).then(() => true, () => false);
conferir(breu, 'e ela entra no breu (a transição dela, pousada)', null);
conferir((await proxima()) === null, 'em besta3 não há próxima', null);

conferir(erros.length === 0, 'sem erros na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
