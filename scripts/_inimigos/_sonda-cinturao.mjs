// 27/10 — STEP 2, THE BELT UNDER REAL FIRE: the ship parked on the left fires the game's own bullets at one piece held
// in place (still turning). Checks: the asteroid takes its marks and breaks like a rock (pieces in the air after it is
// gone); the wreck stays (indestructible) and loses one pixel every second shot (`dureza` 2); the F4's wreck is marked
// too; no page error. Photographs each piece, 4×.
//   node scripts/_inimigos/_sonda-cinturao.mjs <out-prefix>      (with `npm run dev` running)
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT] = process.argv.slice(2);
let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => { erros.push(String(e)); console.log('ERRO DE PÁGINA', String(e)); });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1000);
const geo = await page.evaluate(() => {
  const r = window.__game.canvas.getBoundingClientRect();
  return { k: r.width / 384, l: r.left, t: r.top };
});

async function fase(stage) {
  // (a fresh page per phase: starting another phase in the same page leaves it loading forever — see `_sonda-chefes`)
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.evaluate((stage) => {
    const g = window.__game;
    g.loop.wake();
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = null;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.registry.set('destrocosVariantes', undefined);
    g.scene.start('Game', { stage, ship: 'humana', handling: 'diegetico' });
  }, stage);
  // (a phase may open its card table at the start and pause itself: closed while waiting)
  await page.waitForFunction(() => {
    const g = window.__game, s = g.scene.getScene('Game');
    if (!s?.cartas) return false;
    s.cartas.abrirMesa = () => {};
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    // (and the new run's belt group, not the last run's, destroyed with it)
    return g.scene.isActive('Game') && !!s.debris?.hazards?.children;
  }, null, { timeout: 90000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const g = window.__game, s = g.scene.getScene('Game');
    s.cartas.abrirMesa = () => {};
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    s.director.update = () => [];
    s.spawnHazards = () => {};
    s.enemies.enemies.clear(true, true);
    s.debris.hazards.clear(true, true);
    s.invulnerableUntil = 1e12;
    s.lives = 99;
    g.loop.sleep();
    window.__t = g.loop.now;
    window.__passo = (n, alvo) => {
      for (let i = 0; i < n; i++) {
        s.enemies.enemies.clear(true, true);
        s.enemies.enemyBullets?.clear(true, true);
        s.ship.setPosition(60, alvo?.active ? alvo.y : 108);
        s.ship.body.setVelocity(0, 0);
        if (alvo?.active) alvo.body.setVelocity(0, 0);
        if (alvo?.active && i % 6 === 0) s.weapons.shoot(s.ship.x + 10, s.ship.y);
        window.__t += 1000 / 60;
        g.step(window.__t, 1000 / 60);
      }
    };
  });
}

const foto = async (nome, x, y, L = 70) => {
  const png = await page.screenshot({ clip: { x: geo.l + (x - L / 2) * geo.k, y: geo.t + (y - L / 2) * geo.k, width: L * geo.k, height: L * geo.k } });
  await sharp(png).resize(L * 4, L * 4, { kernel: 'nearest' }).png().toFile(`${OUT}-${nome}.png`);
};

// the asteroid: two marks, then it breaks
await fase(2);
const ast = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const h = s.debris.spawnEm('asteroid', 220, 108);
  h.setScale(1.8);
  window.__h = h;
  let furosMax = 0, vivo = true;
  for (let k = 0; k < 40 && vivo; k++) {
    window.__passo(3, h);
    vivo = h.active;
    if (vivo) furosMax = Math.max(furosMax, s.destrocos.furosDe(h));
  }
  window.__passo(12, null);
  return { furosMax, morto: !h.active, pedacos: s.destrocos.corpos.length, ativo: s.destrocos.ativo };
});
await foto('asteroide-quebra', 225, 108);
ok(ast.furosMax >= 2, `asteroide: as marcas dos tiros antes de morrer (${ast.furosMax} px)`);
ok(ast.morto && ast.pedacos >= 3, `asteroide: quebrou em pedaços de rocha (${ast.pedacos} no ar)`);

// the wreck (F2): 40 shots, indestructible, one pixel every second shot
const des = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.debris.hazards.clear(true, true);
  const h = s.debris.spawnEm('destroco', 220, 108);
  h.setScale(1.4);
  let acertos = 0;
  const f0 = s.bulletHitHazard.bind(s);
  s.bulletHitHazard = (b, x) => {
    if (b.active && x === h) acertos++;
    return f0(b, x);
  };
  window.__h = h;
  window.__passo(6 * 40, h);
  return { vivo: h.active, hp: h.getData('hp'), acertos, furos: s.destrocos.furosDe(h), x: h.x, y: h.y };
});
await foto('destroco-f2', des.x, des.y, 90);
ok(des.vivo && des.hp === Infinity, 'destroço (F2): continua lá, indestrutível');
ok(des.furos > 0 && Math.abs(des.furos - des.acertos / 2) <= 3, `destroço (F2): 1 px a cada 2 tiros (${des.furos} px em ${des.acertos} tiros)`);

// the wreck swallowed (F4)
await fase(4);
const d4 = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const h = s.debris.spawnEm('destroco', 220, 108);
  window.__passo(6 * 30, h);
  const cic = s.destrocos.cicatrizes.get(h);
  return { vivo: h.active, furos: s.destrocos.furosDe(h), mat: cic?.mat, x: h.x, y: h.y };
});
await foto('destroco-f4', d4.x, d4.y, 90);
ok(d4.vivo && d4.furos > 0 && d4.mat === 'biomec', `destroço engolido (F4): marcado, de aço tomado de carne (${d4.furos} px, ${d4.mat})`);

await browser.close();
ok(erros.length === 0, `sem erro de página${erros.length ? `: ${erros.join(' | ')}` : ''}`);
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
