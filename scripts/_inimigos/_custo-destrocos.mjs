// 26/10 — THE COST of the enemies' debris (`Destrocos`), in the real game on a stepped clock: the engine's own time
// per frame (its update + its PRE_RENDER drawing), in the F2 wave of the films and in a worst case — twelve drones
// killed in the same frame (the chain-reaction card) with three bitten cargueiros on screen. Prints avg / p95 / max ms.
//   node scripts/_inimigos/_custo-destrocos.mjs        (with `npm run dev` running)
// ⚠️ swiftshader (no GPU) makes the frame itself slow; what is measured here is ONLY the engine's CPU time.
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);

async function medir(caso) {
  await page.evaluate(() => {
    const g = window.__game;
    g.loop.wake();
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate(() => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('destrocosVariantes', undefined);
    g.registry.set('sementeMorte', 7);
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(800);
  return page.evaluate((caso) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    s.spawnHazards = () => {};
    s.invulnerableUntil = 1e12;
    s.cartas.abrirMesa = () => {};
    // the engine's own time: its update, and its drawing (re-registered, timed)
    const d = s.destrocos;
    let acc = 0;
    const upd = d.update.bind(d);
    d.update = (dt) => {
      const t0 = performance.now();
      upd(dt);
      acc += performance.now() - t0;
    };
    s.events.off('prerender', d.desenhar, d);
    s.events.on('prerender', () => {
      const t0 = performance.now();
      d.desenhar();
      acc += performance.now() - t0;
    });
    // ...and what the scene calls on it outside the update: the deaths and the bites
    for (const nome of ['morrer', 'ferir', 'vigiar']) {
      const f = d[nome].bind(d);
      d[nome] = (...a) => {
        const t0 = performance.now();
        const x = f(...a);
        acc += performance.now() - t0;
        return x;
      };
    }
    g.loop.sleep();
    let t = g.loop.now;
    const quadros = [];
    const passo = () => {
      acc = 0;
      t += 1000 / 60;
      g.step(t, 1000 / 60);
      quadros.push(acc);
    };
    if (caso === 'onda') {
      for (const [y, x] of [[60, 400], [92, 420], [124, 440], [156, 460], [80, 470], [140, 490], [70, 540], [110, 560], [150, 580]]) s.enemies.spawn('drone', y, x);
      s.enemies.spawn('canhoneira', 108, 430);
      let tiro = 0;
      for (let i = 0; i < 420; i++) {
        if (i - tiro >= 6) {
          tiro = i;
          const alvos = s.enemies.enemies.getChildren().filter((x) => x.active && x.x > 60 && x.x < 340).sort((a, b) => a.x - b.x);
          if (alvos[0]) s.ferirInimigo(alvos[0], 1, 'tiro', { x: 40, y: alvos[0].y });
        }
        passo();
      }
    } else {
      // the worst case: three bitten cargueiros (their wounds smoking), then twelve drones dead in one frame
      s.enemies.update = () => {};
      const cargas = [80, 192, 304].map((x) => s.enemies.spawn('cargueiro', 60, x));
      for (const c of cargas) for (let k = 0; k < 3; k++) s.ferirInimigo(c, 6.01, 'tiro', { x: c.x - 60, y: c.y });
      const drones = [];
      for (let k = 0; k < 12; k++) drones.push(s.enemies.spawn('drone', 120 + (k % 3) * 30, 40 + (k % 4) * 90 + (k > 3 ? 20 : 0)));
      for (let i = 0; i < 30; i++) passo();
      for (const e of drones) s.ferirInimigo(e, 99, 'tiro', { x: e.x - 50, y: e.y });
      for (let i = 0; i < 120; i++) passo();
    }
    const v = quadros.filter((x) => x > 0).sort((a, b) => a - b);
    const media = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
    return { caso, quadrosAtivos: v.length, mediaMs: +media.toFixed(3), p95Ms: +(v[Math.floor(v.length * 0.95)] ?? 0).toFixed(3), maxMs: +(v[v.length - 1] ?? 0).toFixed(3) };
  }, caso);
}

for (const caso of ['onda', 'pior']) console.log(JSON.stringify(await medir(caso)));
await browser.close();
console.log(erros.length ? erros : 'sem erro');
