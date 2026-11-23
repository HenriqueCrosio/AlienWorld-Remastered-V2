// THE GUARDIAN'S LIFE (23/11, him playing: "não consegui chegar nas próximas etapas… a vida dos dois estão linkadas"):
// the step lock — a STRONG hand cannot skip the new layers (the serpents before 33 %, the squeeze and the ceiling before
// he dies), the extra damage hits the shell, and the rotation pulls the missing attack forward — and the LAYERED bar
// (his: the Guardian's blue over the beast's red; when he falls the border turns red and the bar is hers).
//   npm run dev, then  node scripts/test-guardiao-vida-jogo.mjs [--porta 5173]
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
  window.__step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      window.__passo.t += 1000 / 60;
      g.step(window.__passo.t, 1000 / 60);
    }
  };
  // a STRONG hand: a burst of 300 at once (never ≥ his whole life: that is the dev one-shot)
  window.__rajada = () => { const b = s.boss; for (let i = 0; i < 6; i++) b.damage(300); };
  // the next action now, and run it to the end; returns the action that started
  window.__proxima = () => {
    const b = s.boss;
    b.serra?.destroy?.();
    b.serra = null;
    b.acao = 'flutua';
    b.acaoT = 0;
    b.cdTiro = 99;
    s.ship.setPosition(60, 110);
    window.__step(2);
    const comecou = b.acao;
    for (let i = 0; i < 60 * 40 && b.acao !== 'flutua'; i++) { s.ship.setPosition(60, 110); window.__step(); }
    return comecou;
  };
  window.__barra = () => {
    const b = s.boss;
    return { azul: b.bar.width, fera: b.barFera.width, borda: b.barBorda.strokeColor, vida: b.hpGuardiao / b.constructor.HP_GUARDIAO, degrau: b.degrau };
  };
});

const C = await page.evaluate(() => {
  const b = window.__game.scene.getScene('Game').boss;
  return { HP: b.constructor.HP_GUARDIAO, AZUL: b.constructor.BORDA_AZUL, FERA: b.constructor.BORDA_FERA };
});
conferir(C.HP >= 600, `a vida do Guardião é a da luta nova (${C.HP}; era 90)`, C.HP);

let b0 = await page.evaluate(() => window.__barra());
conferir(b0.azul === 160 && b0.fera === 160 && b0.borda === C.AZUL, 'a barra: a azul do Guardião cheia POR CIMA da vermelha da fera, a borda azul', b0);

// a strong hand at 100 %: stops on the 33 % floor, the serpents not yet seen
await page.evaluate(() => window.__rajada());
let b1 = await page.evaluate(() => window.__barra());
conferir(b1.degrau === 1 && b1.vida > 0.33 && b1.vida < 0.34, 'a mão forte para no piso de 33 % (as serpentes ainda não apareceram)', b1);
conferir(Math.abs(b1.azul - 160 * b1.vida) < 0.01 && b1.fera === 160, 'a azul encolhe e a vermelha aparece por baixo', b1);
const casco = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; const h = b.hpGuardiao; b.damage(5); return { igual: b.hpGuardiao === h, tint: b.sprite.tintTopLeft, frio: b.constructor.CASCO_FRIO }; });
conferir(casco.igual && casco.tint === casco.frio, 'no piso, o golpe bate no CASCO (o brilho frio, sem dano)', casco);

// the rotation pulls the missing attack forward
let a = await page.evaluate(() => window.__proxima());
conferir(a === 'serpentes', 'travado, o próximo ataque é o que falta: as serpentes', a);

// now it passes 33 % and stops on the last floor (the squeeze and the ceiling not yet seen)
await page.evaluate(() => window.__rajada());
let b2 = await page.evaluate(() => window.__barra());
conferir(b2.degrau === 2 && b2.vida > 0 && b2.vida <= 0.011, 'depois das serpentes ela passa dos 33 % e para no último piso (o aperto e o teto ainda não)', b2);
a = await page.evaluate(() => window.__proxima());
const a2 = await page.evaluate(() => window.__proxima());
conferir(a === 'aperto' && a2 === 'teto', 'e o rodízio puxa o aperto e o teto', [a, a2]);

// all seen: now he dies, and the bar becomes the beast's
await page.evaluate(() => window.__rajada());
await page.evaluate(() => window.__step(60 * 6));
const fim = await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); return { forma: s.boss.forma, ...window.__barra() }; });
conferir(fim.forma === 'predador', 'com as camadas vistas, ele cai e vem a fera', fim.forma);
conferir(fim.azul === 0 && fim.fera === 160 && fim.borda === C.FERA, 'a barra agora é a da fera: cheia, vermelha, a borda vermelha', fim);
// (she surges first, untouchable: hit her once she is fighting)
const fera = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const p = s.boss.predador;
  for (let i = 0; i < 60 * 20 && p.hp === p.constructor.HP; i++) { s.boss.damage(1); window.__step(); }
  const h = p.hp;
  return { ...window.__barra(), esperado: 160 * (h / p.constructor.HP) };
});
conferir(fera.fera < 160 && Math.abs(fera.fera - fera.esperado) < 0.01, 'e esvazia com a vida DELA (180, as fases dela não mudam)', fera);

conferir(erros.length === 0, 'sem erros na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
