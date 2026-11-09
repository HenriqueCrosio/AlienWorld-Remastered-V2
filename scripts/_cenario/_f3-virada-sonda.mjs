// 09/11 — THE TURN'S GUARANTEES, PROBED (round 4, plan `plans/2026-11-09-cenario-casco-rodada4.md`): the whole F3 from its
// start on a stepped clock with fixed luck, the ship NOT protected (it sits in the middle of the screen and takes what
// comes; its lives are refilled), and from the rabo on, every frame: the black's alpha, the ship's real hits, the enemies
// and enemy shots BORN. It asserts: nothing born while the black is past half; no hit from the fade to the clear + 1 s;
// the sky switched on; the Serpent at t=97. Photos at --fotos.
//   node scripts/_cenario/_f3-virada-sonda.mjs <out-dir> [--fotos 50,56,58]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const OUT = args[0];
const FOTOS = (args.includes('--fotos') ? args[args.indexOf('--fotos') + 1] : '').split(',').filter(Boolean).map(Number);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.addInitScript(() => {
  const base = 1762560000000; let k = 0; Date.now = () => base + (k += 16);
  let a = 20261109;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
});
if (args.includes('--antigo')) await page.addInitScript(() => { window.__antigo = true; });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(500);
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  window.Phaser.Math.RND.sow(['20261109']);
  g.loop.sleep();
  window.__P = { t: g.loop.now };
  window.__pisa = (n) => { for (let i = 0; i < n; i++) { window.__P.t += 1000 / 60; g.step(window.__P.t, 1000 / 60); } };
  window.__pisa(2);
  g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja'); g.registry.set('sementeMorte', 20261109);
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico' });
  for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) window.__pisa(1);
  const s = g.scene.getScene('Game');
  s.cartas.abrirMesa = () => {};
  // (`--antigo`: the casco scenery forced OFF, the way the F3 was before round 4 — the comparison of the Act 1)
  if (window.__antigo) s.parallax.cenarioNovo = false;
  window.__R ={ golpes: [], noPreto: [], primeiroDepois: null, pretoVisto: false, fimPreto: null };
  // the real hits: the original damage, counted when it lands (lives refilled after)
  const dano = s.damageShip.bind(s);
  // (before the turn the ship is untouchable — the photos of the Act 1 compare the scenery, not hit flashes)
  s.damageShip = () => { if (s.elapsed < 52) return; const v = s.lives; dano(); if (s.lives < v) window.__R.golpes.push(+s.elapsed.toFixed(2)); };
});

const passo = (n) => page.evaluate((n) => {
  const g = window.__game, R = window.__R;
  for (let i = 0; i < n; i++) {
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    const s = g.scene.getScene('Game');
    if (!s) return null;
    // exposed in the middle while it matters (the turn), parked out of the way before
    const exposta = s.elapsed > 52 && s.elapsed < 60;
    s.ship.setPosition(exposta ? 192 : 60, exposta ? 108 : 90);
    s.ship.body.setVelocity(0, 0);
    if (s.lives < 3) s.lives = 3;
    window.__pisa(1);
    const preto = s.children.list.find((o) => o.name === 'pretoDoCasco');
    const a = preto?.alpha ?? 0;
    // BORN in the dark: every enemy and enemy shot seen for the 1st time (pooled sprites: re-activated = born again)
    R.vistos ??= new WeakMap();
    const nasceu = (o) => { const antes = R.vistos.get(o); R.vistos.set(o, o.active); return o.active && !antes; };
    const novos = [...s.enemies.enemies.getChildren(), ...s.enemies.enemyBullets.getChildren()].filter(nasceu);
    if (preto && R.inicioPreto == null) R.inicioPreto = +s.elapsed.toFixed(2);
    if (a > 0.5 && novos.length) (R.nascidosNoEscuro ??= []).push([+s.elapsed.toFixed(2), novos.map((o) => o.getData?.('kind') ?? o.texture?.key).join(',')]);
    if (preto) R.pretoVisto = true;
    if (a > 0.5) R.noPreto.push([+s.elapsed.toFixed(2), +a.toFixed(2)]);
    if (R.pretoVisto && !preto && R.fimPreto == null) R.fimPreto = +s.elapsed.toFixed(2);
  }
  const s = g.scene.getScene('Game');
  return { t: s.elapsed, boss: !!s.boss, regime: s.parallax.regimeCeu, ceu: !!s.parallax.ceuCasco };
}, n);

let r, f = 0, bossEm = null;
while (true) {
  r = await passo(r && r.t > 50 ? 1 : 30);
  if (!r) break;
  while (FOTOS[f] !== undefined && r.t >= FOTOS[f]) {
    const tela = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
    await sharp(tela).resize(384, 216, { kernel: 'nearest' }).png().toFile(path.join(OUT, `virada-${FOTOS[f]}s.png`));
    f++;
  }
  if (r.boss && bossEm == null) bossEm = +r.t.toFixed(2);
  if (r.t > 99) break;
}
const R = await page.evaluate(() => { const { vistos, ...resto } = window.__R; return resto; });
// the guarantees (spec §1): nothing born while the black is past half; no hit from the fade's start to the clear + the 1 s
// breather (enemies the player saw before the black may still be there)
const RESPIRO = 1;
const golpesProtegidos = R.golpes.filter((t) => R.inicioPreto != null && t >= R.inicioPreto && t <= (R.fimPreto ?? 0) + RESPIRO);
const out = {
  inicioPreto: R.inicioPreto, pretoCheio: R.noPreto.length ? [R.noPreto[0][0], R.noPreto.at(-1)[0]] : null, fimPreto: R.fimPreto,
  nascidosNoEscuro: R.nascidosNoEscuro ?? [], golpesProtegidos, golpesNaVirada: R.golpes.filter((t) => t > 52 && t < 60),
  bossEm, ceuLigado: r?.ceu, regimeNoFim: r?.regime, erros,
};
fs.writeFileSync(path.join(OUT, 'virada.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
const ok = R.noPreto.length > 0 && !golpesProtegidos.length && !(R.nascidosNoEscuro ?? []).length && bossEm != null && Math.abs(bossEm - 97) < 0.6 && !erros.length;
console.log(ok ? 'VIRADA OK' : 'VIRADA FALHOU');
await browser.close();
process.exit(ok ? 0 : 1);
