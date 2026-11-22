// THE LAVA FAN AND THE AIMED SALVO IN GAME (spec 2026-11-22-guardiao-coleira-design.md §5). npm run dev, then
//   node scripts/test-guardiao-lava-jogo.mjs [--porta 5173]
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const QUADRO = 1000 / 60;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
await page.waitForFunction(() => {
  const g = window.__game.scene;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering && s.boss.acao === 'flutua';
}, null, { timeout: 120000, polling: 250 });
await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.damageShip = () => {};
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  window.__step = (n) => {
    for (let i = 0; i < n; i++) {
      window.__passo.t += 1000 / 60;
      g.step(window.__passo.t, 1000 / 60);
    }
  };
});

// ── the lava fan at the jerk ──
const leque = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const b = s.boss;
  s.ship.setPosition(70, 100);
  b.serra?.destroy?.();
  b.serra = null;
  b.acao = 'flutua';
  b.proxima = 'investida';
  b.acaoT = 0;
  b.cdTiro = 99;
  for (let i = 0; i < 400 && b.acao !== 'tranco'; i++) window.__step(1);
  // the ship out of the fan's way (a drop that touches it is spent, even with the ship invulnerable)
  s.ship.setPosition(370, 200);
  const gotas = () => s.enemies.enemyBullets.getChildren().filter((o) => o.active && o.getData('lavaGuardiao') === true);
  const n = gotas().length;
  const L = b.ultimoLeque;
  const x0 = gotas()[0]?.x;
  // step until the drops reach the target column (x = 40)
  for (let i = 0; i < 120 && gotas().length && gotas()[0].x > 40; i++) window.__step(1);
  const ys = gotas().map((o) => o.y).sort((p, q) => p - q);
  return { n, L, x0, ys, xs: gotas().map((o) => Math.round(o.x)) };
});
conferir(leque.n === 5, 'no tranco saem 5 gotas (vida cheia)', leque.n);
const sep = leque.ys.slice(1).map((y, i) => y - leque.ys[i]);
const grandes = sep.filter((s) => s > 27);
conferir(grandes.length === 1 && sep.every((s) => (s > 27 ? Math.abs(s - 36) < 3 : Math.abs(s - 18) < 3)),
  'na coluna x=40: vizinhas a ~18 px, UM vão de ~36 px', { sep, xs: leque.xs });
const faixas = leque.L?.faixas ?? [NaN];
const meio = (faixas[0] + faixas[faixas.length - 1]) / 2;
conferir(Math.abs(meio - 100) < 1.5, 'o leque centra na nave', faixas);
conferir(leque.ys.every((y) => y >= 28 && y <= 192), 'todas dentro da arena na coluna', leque.ys);

// ── the aimed salvo ──
for (const naveY of [50, 170]) {
  const r = await page.evaluate((naveY) => {
    const s = window.__game.scene.getScene('Game');
    const b = s.boss;
    for (let i = 0; i < 300 && b.acao !== 'flutua'; i++) window.__step(1);
    s.ship.setPosition(70, naveY);
    const antes = new Set(s.enemies.enemyBullets.getChildren().filter((o) => o.active && o.texture.key === 'globuloGuardiao'));
    b.acaoT = 99;
    b.cdTiro = 0;
    window.__step(1);
    const novos = s.enemies.enemyBullets.getChildren().filter((o) => o.active && o.texture.key === 'globuloGuardiao' && !antes.has(o));
    const boca = { x: novos[0]?.getData('ox'), y: novos[0]?.getData('oy') };
    const mira = (Math.atan2(naveY - boca.y, 70 - boca.x) * 180) / Math.PI;
    const angs = novos.map((o) => (Math.atan2(o.body.velocity.y, o.body.velocity.x) * 180) / Math.PI).map((a) => (a < 0 ? a + 360 : a));
    return { mira: mira < 0 ? mira + 360 : mira, angs };
  }, naveY);
  const passo = 96 / (r.angs.length - 1);
  const media = r.angs.reduce((s, a) => s + a, 0) / r.angs.length;
  conferir(r.angs.length === 3, `nave em y=${naveY}: salva de 3 (vida cheia)`, r.angs);
  conferir(Math.abs(media - r.mira) <= passo / 2 + 0.5, `nave em y=${naveY}: o centro mira a nave`, r);
  conferir(Math.min(...r.angs.map((a) => Math.abs(a - r.mira))) < 1, `nave em y=${naveY}: um glóbulo na nave`, r);
}

conferir(erros.length === 0, 'nenhum erro de página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
