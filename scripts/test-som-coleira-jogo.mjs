// THE GUARDIAN ON THE LEASH, step 6 (23/11) — sheet 15 IN THE GAME: each new sound at its moment. The leash's jolt at the
// end of the lunge; the serpents (out of the body, the lock, the strike — in that order); the squeeze's pull; the
// bleeding ceiling (the pump, the drop that was hanging, the splash on the floor).
//   npm run dev  in another terminal, then  node scripts/test-som-coleira-jogo.mjs [--porta 5173]
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const falhas = [];
const ok = (c, msg, visto) => {
  console.log(`${c ? '✔' : '✘'} ${msg}${c ? '' : `  ${JSON.stringify(visto)}`}`);
  if (!c) falhas.push(msg);
};

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

await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 4, ship: 'interceptor' }));
await page.waitForTimeout(500);
await page.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.stage?.id === 4 && s.ship?.active; }, null, { timeout: 30000 });
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; s.spawnBoss(); });
await page.waitForFunction(() => { const b = window.__game.scene.getScene('Game').boss; return b && !b.entering; }, null, { timeout: 30000 });

/** forces the next action `acao` at life `vida` and listens until he is floating again */
async function acao(acao, vida, ms) {
  const n0 = await desde();
  await page.evaluate(({ acao, vida }) => {
    const s = window.__game.scene.getScene('Game');
    const b = s.boss;
    b.hpGuardiao = b.constructor.HP_GUARDIAO * vida;
    b.serra?.destroy?.();
    b.serra = null;
    b.acao = 'flutua';
    b.acaoT = 0;
    b.cdTiro = 99;
    b.proxima = acao;
    s.ship.setPosition(80, 110);
  }, { acao, vida });
  await page.waitForFunction((a) => window.__game.scene.getScene('Game').boss.acao !== 'flutua', acao, { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.acao === 'flutua', null, { timeout: ms }).catch(() => {});
  await page.waitForTimeout(300);
  return novos(n0);
}

let t = await acao('investida', 0.9, 8000);
ok(antesDe(t, 'guardiao.investida', 'guardiao.tranco'), 'the lunge, then the leash JOLT (the cables go taut)', t);
ok(conta(t, 'guardiao.tranco') === 1, 'one jolt per lunge', conta(t, 'guardiao.tranco'));

t = await acao('serpentes', 0.5, 16000);
ok(conta(t, 'guardiao.serpente.sai') === 2, 'the two serpents come OUT of him (one sound each)', conta(t, 'guardiao.serpente.sai'));
ok(conta(t, 'guardiao.serpente.trava') === 4 && conta(t, 'guardiao.serpente.bote') === 4, 'every strike: its LOCK and its STRIKE (4 + 4)', { trava: conta(t, 'guardiao.serpente.trava'), bote: conta(t, 'guardiao.serpente.bote') });
ok(antesDe(t, 'guardiao.serpente.sai', 'guardiao.serpente.trava') && antesDe(t, 'guardiao.serpente.trava', 'guardiao.serpente.bote'), 'out, lock, strike — in that order', t);

await page.evaluate(() => { window.__game.scene.getScene('Game').boss.vezAperto = 0; });
t = await acao('aperto', 0.2, 10000);
ok(conta(t, 'guardiao.aperto.puxao') === 1, 'the squeeze: the PULL on the leash', t);
// sheet 15b, his composition: the swell already tells the gap, then ONE distorted note per ring
ok(antesDe(t, 'guardiao.aperto.puxao', 'guardiao.aperto.inchaAlto') && antesDe(t, 'guardiao.aperto.inchaAlto', 'guardiao.aperto.notaAlta'), 'the HIGH gap: the pull, the bright swell (D), the high note', t);
ok(conta(t, 'guardiao.aperto.notaAlta') === 1 && !t.includes('guardiao.aperto.notaBaixa') && !t.includes('guardiao.aperto.inchaBaixo'), 'one note per ring, and only the high pair', t);
t = await acao('aperto', 0.2, 10000);
ok(antesDe(t, 'guardiao.aperto.inchaBaixo', 'guardiao.aperto.notaBaixa') && !t.includes('guardiao.aperto.notaAlta'), 'the next squeeze, the LOW gap: the dark swell (E), the low note', t);

t = await acao('teto', 0.2, 10000);
ok(conta(t, 'guardiao.teto.bombeia') === 1, 'the ceiling: the PUMP up the cables', t);
// (the voice rule: the same sound twice in one frame plays ONCE — the 4 points of a wave let go together, so one drop
// sound per wave; the columns' drops land a row at a time)
ok(conta(t, 'guardiao.teto.gota') === 2, 'the drops that were HANGING let go with a sound: one per wave (the 4 points together)', conta(t, 'guardiao.teto.gota'));
ok(conta(t, 'guardiao.teto.respingo') >= 6, 'the drops SPLASH on the floor (at least one per row of each wave)', conta(t, 'guardiao.teto.respingo'));
ok(antesDe(t, 'guardiao.teto.bombeia', 'guardiao.teto.gota') && antesDe(t, 'guardiao.teto.gota', 'guardiao.teto.respingo'), 'pump, drop, splash — in that order', t);

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo certo');
process.exit(falhas.length ? 1 : 0);
