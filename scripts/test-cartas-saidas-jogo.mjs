// THE TWO WAYS OUT OF 21/11, IN THE GAME (27/11, the rebalance, step 1):
// 1. the MULTIPLE SHOT in one line — the Triple only comes to the table with the Double in hand, and Double + Triple
//    fire 3 shots (never 5);
// 2. the Electric's diminishing return — after a lock the same enemy takes no shock for `imuneMs` (not from the shot,
//    not from the arc), and the arc spends no jump on an immune enemy.
// Opens the F2 clean (the probe-cartas-novas way). Usage: node scripts/test-cartas-saidas-jogo.mjs [porta=5173]
import { chromium } from 'playwright';

const PORTA = process.argv[2] ?? '5173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${info !== undefined ? ` → ${JSON.stringify(info)}` : ''}`);
  if (!ok) falhas.push(nome);
};

await page.goto(`http://localhost:${PORTA}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

/** The F2 clean, with the given cards: no script, the ship untouchable, no enemy left. */
async function fase(cartas) {
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = undefined;
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate(() => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(400);
  await page.evaluate((cartas) => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    s.invulnerableUntil = s.time.now + 1e9;
    for (const id of cartas) s.cartas.aplicar(id);
  }, cartas);
}

// ── 1. THE MULTIPLE SHOT ──
await fase([]);
const multiplo = await page.evaluate(async () => {
  const { sortear } = await import('/src/cartas.ts');
  const s = window.__game.scene.getScene('Game');
  const reg = window.__game.registry;
  const oferecido = (mao) => {
    reg.set('cartas', mao);
    let n = 0;
    for (let i = 0; i < 3000; i++) if (sortear(reg, { fase: 3 }).includes('WPN_002')) n++;
    return n;
  };
  const semDuplo = oferecido([]);
  const comDuplo = oferecido(['WPN_001']);
  // the game's own path: the cards picked one after the other, and the weapon the ship ends up firing
  reg.set('cartas', []);
  s.cartas.aplicar('WPN_001');
  s.cartas.aplicar('WPN_002');
  const arma = s.weapons.current;
  return { semDuplo, comDuplo, pellets: arma.pellets, bocas: arma.muzzles?.length };
});
conferir(multiplo.semDuplo === 0, 'sem o Duplo, o Triplo nunca vem à mesa (3000 mesas)', multiplo.semDuplo);
conferir(multiplo.comDuplo > 0, 'com o Duplo, o Triplo vem', multiplo.comDuplo);
conferir(multiplo.pellets === 3 && multiplo.bocas === 3, 'Duplo + Triplo = 3 tiros, não 5', multiplo);

// ── 2. THE ELECTRIC'S DIMINISHING RETURN ──
await fase(['EFF_011', 'EFF_012']);
const eletrico = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const alvo = (kind, x, y) => {
    s.enemies.spawn(kind, y, x);
    const kids = s.enemies.enemies.getChildren();
    const e = kids[kids.length - 1];
    e.setPosition(x, y);
    e.body.setVelocity(0, 0);
    e.setData('baseY', y);
    e.setData('hp', 99);
    return e;
  };
  const N = (await import('/src/data/numerosCartas.ts')).NUMEROS.eletrico;
  const el = s.cartas.eletrico;
  const ate = (e) => e.getData('eletrificadoAte') ?? 0;

  // the same enemy, shocked again inside the lock and inside the immunity: nothing renews
  const a = alvo('canhoneira', 300, 60);
  el.eletrificar(a, false, 0);
  const trava1 = ate(a);
  await dormir(200);
  el.eletrificar(a, false, 0);
  const renovouNaTrava = ate(a) !== trava1;
  await dormir(N.travaMs + 300);
  el.eletrificar(a, false, 0);
  const renovouNaImunidade = ate(a) !== trava1;
  await dormir(N.imuneMs);
  el.eletrificar(a, false, 0);
  const voltouDepois = ate(a) > s.time.now;

  // the arc skips the immune one and jumps to the next
  s.enemies.enemies.clear(true, true);
  const fila = [0, 1, 2, 3, 4].map((i) => alvo('drone', 200 + i * 20, 140));
  el.eletrificar(fila[1], false, 0); // fila[1] immune now
  const imune1 = fila[1].getData('eletricoImuneAte');
  const trava1b = ate(fila[1]);
  el.eletrificar(fila[0], true, 0);
  await dormir(60);
  const levaram = fila.map((e) => ate(e) > s.time.now);
  return { renovouNaTrava, renovouNaImunidade, voltouDepois, levaram, fila1Igual: ate(fila[1]) === trava1b && fila[1].getData('eletricoImuneAte') === imune1 };
});
conferir(!eletrico.renovouNaTrava, 'um choque durante a trava não a renova', eletrico);
conferir(!eletrico.renovouNaImunidade, 'um choque na imunidade (depois da trava) não trava', eletrico);
conferir(eletrico.voltouDepois, 'passada a imunidade, o choque volta a travar', eletrico);
conferir(eletrico.fila1Igual, 'o arco não mexe no imune', eletrico);
// fila[1] is still in its own lock (shocked ~60 ms before), so all five read locked; the arc's 3 jumps went to 2, 3, 4.
conferir(eletrico.levaram.every(Boolean), 'o arco não gasta salto no imune: pula para os 3 seguintes', eletrico.levaram);

conferir(erros.length === 0, 'sem erro na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
