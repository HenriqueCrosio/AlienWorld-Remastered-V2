// THE LAVA PULSES AND THE AIMED SALVO IN GAME (spec 2026-11-22-guardiao-coleira-design.md §5). npm run dev, then
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

// ── the lava pulses at the jerk (22/11): A (7) then B (8), straight, from ONE point — he HOLDS at the stop meanwhile ──
const pulsos = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const b = s.boss;
  s.ship.setPosition(370, 200); // out of the way: a drop that touches the ship is spent, even invulnerable
  b.serra?.destroy?.();
  b.serra = null;
  b.acao = 'flutua';
  b.proxima = 'investida';
  b.acaoT = 0;
  b.cdTiro = 99;
  const gotas = () => s.enemies.enemyBullets.getChildren().filter((o) => o.active && o.getData('lavaGuardiao') === true);
  for (let i = 0; i < 400 && b.acao !== 'tranco'; i++) window.__step(1);
  const parada = { x: b.sprite.x, y: b.sprite.y };
  const vistos = [];
  let P = null, maxDesvio = 0, acaoFim = null, quadrosSegura = 0, yMin = 999, yMax = -999;
  const vel0 = new Map();
  for (let i = 0; i < 120; i++) {
    if (b.ultimoPulso !== P) {
      P = b.ultimoPulso;
      vistos.push({ n: P.angulos.length, ox: P.ox, oy: P.oy, vel: P.vel, t: P.t });
      for (const o of gotas()) if (!vel0.has(o)) vel0.set(o, { x: o.body.velocity.x, y: o.body.velocity.y });
    }
    if (b.acao === 'segura') {
      quadrosSegura++;
      maxDesvio = Math.max(maxDesvio, Math.abs(b.sprite.x - parada.x), Math.abs(b.sprite.y - parada.y));
    }
    if (b.acao === 'volta' && acaoFim === null) acaoFim = { i, pulsos: vistos.length };
    for (const o of gotas()) { yMin = Math.min(yMin, o.y); yMax = Math.max(yMax, o.y); }
    window.__step(1);
  }
  let curva = 0;
  for (const [o, v] of vel0) if (o.active) curva = Math.max(curva, Math.abs(o.body.velocity.y - v.y), Math.abs(o.body.velocity.x - v.x));
  return { vistos, maxDesvio, acaoFim, quadrosSegura, curva, yMin, yMax };
});
const V = pulsos.vistos;
conferir(V.length === 2 && V[0].n === 7 && V[1].n === 8, 'vida cheia: 2 pulsos, A com 7 e B com 8', V);
conferir(V.every((p) => p.vel === 160), 'a 160 px/s (a escolha dele)', V.map((p) => p.vel));
conferir(V.length === 2 && Math.abs(V[1].t - V[0].t - 400) < 20, '0,4 s entre os pulsos', V.map((p) => p.t));
conferir(V.length === 2 && Math.hypot(V[1].ox - V[0].ox, V[1].oy - V[0].oy) < 2.5, 'os dois do MESMO ponto: arcos concêntricos', V);
conferir(pulsos.quadrosSegura > 20 && pulsos.maxDesvio <= 2, 'ele SEGURA na parada enquanto os pulsos saem (só o mini-tranco)', pulsos);
conferir(pulsos.acaoFim?.pulsos === 2, 'a volta só começa depois do último pulso', pulsos.acaoFim);
conferir(pulsos.curva < 0.5, 'as gotas são retas (sem gravidade)', pulsos.curva);
conferir(pulsos.yMin < 20 && pulsos.yMax > 200, 'a lava ATRAVESSA as bordas da arena (30 e 190) até a linha da tela', { yMin: pulsos.yMin, yMax: pulsos.yMax });

// ── "cobra quem não percebe o padrão": the ship PARKED takes lava in every lunge ──
for (const naveY of [8, 60, 105, 160, 208]) {
  const toques = await page.evaluate((naveY) => {
    const s = window.__game.scene.getScene('Game');
    const b = s.boss;
    for (let i = 0; i < 300 && b.acao !== 'flutua'; i++) window.__step(1);
    // the last lunge's drops leave, with his cycle held (no saw, no telegraph, no salvo meanwhile)
    b.acaoT = 99;
    b.cdTiro = 99;
    for (let i = 0; i < 240; i++) window.__step(1);
    const parado = { acao: b.acao, x: Math.round(b.sprite.x) };
    // a TOUCH = the ship's overlap: it releases the drop and calls `damageShip` right after (GameScene). The lava's own
    // edge splash clears `lavaGuardiao` before releasing, so it never counts.
    let n = 0, lava = false;
    const solta = s.enemies.release.bind(s.enemies);
    const fere = s.damageShip;
    s.enemies.release = (o) => {
      lava = o.getData('lavaGuardiao') === true;
      return solta(o);
    };
    s.damageShip = () => {
      if (lava) n++;
      lava = false;
    };
    b.serra?.destroy?.();
    b.serra = null;
    b.acao = 'flutua';
    b.proxima = 'investida';
    b.acaoT = 0;
    b.cdTiro = 99;
    const origens = [];
    let P = b.ultimoPulso;
    for (let i = 0; i < 300; i++) {
      s.ship.setPosition(60, naveY);
      window.__step(1);
      if (b.ultimoPulso !== P) { P = b.ultimoPulso; origens.push([Math.round(P.ox), Math.round(P.oy)]); }
    }
    s.enemies.release = solta;
    s.damageShip = fere;
    return { n, parado, origens };
  }, naveY);
  conferir(toques.n >= 1, `nave PARADA em (60, ${naveY}): a lava a acerta`, toques);
}

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
