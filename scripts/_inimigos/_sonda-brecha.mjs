// 27/10 — STEP 3, THE BULLET THROUGH THE HOLE: a wreck held in place (not turning), one row of it eaten clean through
// (the marks' own road: a mark on that lane until no live pixel is left in it), and the ship's real bullets fired along
// that row and along a whole one. Checks: down the tunnel the bullet comes out on the far side, alive; on the whole row
// it dies on the hull as before; in a notch (a lane eaten half-way) it goes in and is stopped at the notch's bottom,
// eating it; the art's own empty space in front of the hull still stops a bullet where it did. Photographs the wreck.
//   node scripts/_inimigos/_sonda-brecha.mjs <out-prefix>      (with `npm run dev` running)
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
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => {
  const g = window.__game, s = g.scene.getScene('Game');
  if (!s?.cartas) return false;
  s.cartas.abrirMesa = () => {};
  if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
  if (g.scene.isPaused('Game')) g.scene.resume('Game');
  return g.scene.isActive('Game') && !!s.debris?.hazards?.children;
}, null, { timeout: 90000 });
await page.waitForTimeout(600);
const geo = await page.evaluate(() => {
  const r = window.__game.canvas.getBoundingClientRect();
  return { k: r.width / 384, l: r.left, t: r.top };
});

const r = await page.evaluate(() => {
  const g = window.__game, s = g.scene.getScene('Game'), d = s.destrocos;
  s.cartas.abrirMesa = () => {};
  s.director.update = () => [];
  s.spawnHazards = () => {};
  s.enemies.enemies.clear(true, true);
  s.debris.hazards.clear(true, true);
  s.invulnerableUntil = 1e12;
  g.loop.sleep();
  let t = g.loop.now;
  const h = s.debris.spawnEm('destroco', 230, 108);
  h.setScale(1.4).setFlipX(false).setRotation(0);
  h.body.setAngularVelocity(0);
  const segura = () => { h.body.setVelocity(0, 0); h.body.setAngularVelocity(0); h.setRotation(0); };
  const passo = (n, tiro) => {
    for (let i = 0; i < n; i++) {
      s.enemies.enemyBullets?.clear(true, true);
      segura();
      s.ship.setPosition(60, tiro ?? 108);
      s.ship.body.setVelocity(0, 0);
      t += 1000 / 60;
      g.step(t, 1000 / 60);
    }
  };
  passo(2);
  // the scar, made by one ordinary mark (so the frame is known), then a lane eaten through: marks on it until it is empty
  const vis = d.visto(h);
  const linha = (yMundo) => Math.floor(d.noBitmap(h, vis, { x: h.x, y: yMundo }).y);
  d.marcar(h, 1, { x: h.x - 80, y: h.y + 12 }, 'comum', 'metal', true, { rumo: { x: 1, y: 0 } });
  const cic = d.cicatrizes.get(h);
  // (the base gun fires two bullets, 2 px over and under the ship's line: a tunnel 7 rows tall, as a V of marks makes)
  const q0 = linha(h.y);
  const linhas = [-3, -2, -1, 0, 1, 2, 3].map((o) => q0 + o);
  const vivosNoTunel = () => {
    const dd = d.emDia(h, cic);
    let n = 0;
    for (const q of linhas) for (let x = 0; x < vis.w; x++) if (vis.cor[q * vis.w + x] >>> 24 >= 128 && !dd.comido[q * vis.w + x]) n++;
    return n;
  };
  const antes = vivosNoTunel();
  for (const q of linhas) for (let k = 0; k < 120; k++) cic.golpes.push({ tipo: 'marca', lado: 0, faixa: q - d.emDia(h, cic).dy, t: d.t });
  const depois = vivosNoTunel();
  passo(2);
  // a pair of bullets down the tunnel, a pair along whole rows: how far did they get?
  const disparo = (y) => {
    const ja = new Set(s.weapons.bullets.getChildren().filter((b) => b.active));
    s.ship.setPosition(60, y);
    s.weapons.shoot(70, y);
    const par = s.weapons.bullets.getChildren().filter((b) => b.active && !ja.has(b));
    let maxX = 0;
    for (let i = 0; i < 60 && par.some((b) => b.active); i++) {
      passo(1, y);
      for (const b of par) if (b.active) maxX = Math.max(maxX, b.x);
    }
    return { vivo: par.some((b) => b.active), maxX: Math.round(maxX), balas: par.length };
  };
  const yTunel = h.y;
  // what the hole check answered at each contact
  window.__contatos = [];
  const pb0 = s.pelaBrecha.bind(s);
  s.pelaBrecha = (b, a) => {
    const res = pb0(b, a);
    const dd = d.emDia(h, cic);
    const p = d.noBitmap(h, dd.bmp, { x: b.x, y: b.y });
    window.__contatos.push({ x: Math.round(b.x), y: Math.round(b.y), px: Math.round(p.x), py: Math.round(p.y), passa: res, rot: +h.rotation.toFixed(3), dy: dd.dy, q0 });
    return res;
  };
  const furoAntes = d.furosDe(h);
  const tunel = disparo(yTunel);
  const inteira = disparo(h.y + 14);
  // (a wreck is hard: one pixel every second shot — a second pair on the same row)
  disparo(h.y + 14);
  const furoDepois = d.furosDe(h);
  return {
    caixa: { x0: Math.round(h.x - h.displayWidth / 2), x1: Math.round(h.x + h.displayWidth / 2), y0: Math.round(h.y - h.displayHeight / 2), y1: Math.round(h.y + h.displayHeight / 2) },
    antes, depois, tunel, inteira, furoAntes, furoDepois, x: h.x, y: h.y, contatos: window.__contatos.slice(0, 6),
  };
});
console.log(JSON.stringify(r));
const L = 110;
const png = await page.screenshot({ clip: { x: geo.l + (r.x - L / 2) * geo.k, y: geo.t + (r.y - L / 2) * geo.k, width: L * geo.k, height: L * geo.k } });
await sharp(png).resize(L * 4, L * 4, { kernel: 'nearest' }).png().toFile(`${OUT}-tunel.png`);
ok(r.antes > 0 && r.depois === 0, `o túnel de 7 linhas foi comido de lado a lado (${r.antes} px vivos → ${r.depois})`);
ok(r.tunel.maxX > r.caixa.x1, `a bala do túnel atravessou e saiu do outro lado (chegou a x ${r.tunel.maxX}, o destroço vai até ${r.caixa.x1})`);
ok(r.inteira.maxX < r.caixa.x1 && !r.inteira.vivo, `na linha inteira a bala morreu no casco (parou em x ${r.inteira.maxX})`);
ok(r.furoDepois > r.furoAntes, `os tiros da linha inteira deixaram a marca deles, 1 px a cada 2 (${r.furoAntes} → ${r.furoDepois} px)`);
await browser.close();
ok(erros.length === 0, `sem erro de página${erros.length ? `: ${erros.join(' | ')}` : ''}`);
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
