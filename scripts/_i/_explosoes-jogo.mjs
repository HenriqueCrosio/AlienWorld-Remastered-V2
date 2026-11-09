// BLOCO I, etapa 1 (09/11) — the NEW EXPLOSIONS FILMED IN THE GAME (plan `plans/2026-11-09-bloco-i-explosoes.md` Task 7):
// `_h/_filmar.mjs` (a stage on a stepped clock, fixed luck, the ship parked and untouchable) plus a KILLER: the parked
// ship does not shoot, so every `--matar` s one target on screen dies by the game's own path (`matarInimigo`,
// `killHazard`, `ferirConstrucao`) and explodes with its material; `--pula T` jumps the script to T at the start;
// `--chefe T` kills the boss at T (`killBoss`).
//   node scripts/_i/_explosoes-jogo.mjs <out> --fase N --real --quadros [--pula T] [--matar 0.4] [--alvos inimigo,peca,prop]
//        [--chefe T] [--fotos …] [--video --de A --ate B] [--q …]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args[0];
const Q = val('--q', ''), REAL = args.includes('--real'), VIDEO = args.includes('--video');
const FASE = Number(val('--fase', 3)), QUADROS_T = args.includes('--quadros');
const PULA = Number(val('--pula', 0)), MATAR = Number(val('--matar', 0)), CHEFE = Number(val('--chefe', 0));
const ALVOS = (val('--alvos', 'inimigo,peca,prop') || '').split(',');
const FOTOS = (val('--fotos', '') || '').split(',').filter(Boolean).map(Number).sort((a, b) => a - b);
const DE = Number(val('--de', 0)), ATE = Number(val('--ate', Math.max(0, ...FOTOS) + 0.1));
fs.mkdirSync(OUT, { recursive: true });
const QUADROS = path.join(OUT, 'q');
if (VIDEO) { fs.rmSync(QUADROS, { recursive: true, force: true }); fs.mkdirSync(QUADROS, { recursive: true }); }

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.addInitScript(() => {
  // Phaser seeds its RND from Date.now at boot, before the probe can sow it: a fixed clock makes the casco pieces (and
  // everything drawn before the sow) the same in the before and the after.
  const base = 1762560000000;
  let k = 0;
  Date.now = () => base + (k += 16);
  let a = 20261108;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
});
await page.goto(`http://localhost:5173/${Q ? `?${Q}` : ''}`, { waitUntil: 'domcontentloaded' });
if (REAL) await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
else await page.waitForFunction(() => window.__game?.scene?.getScene('Game')?.cartas, null, { timeout: 120000 });
await page.waitForTimeout(500);
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const clip = { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k };

await page.evaluate(({ fase, pula, matar, alvos, chefe }) => { window.__fase = fase; window.__pula = pula; window.__matar = matar; window.__alvos = alvos; window.__chefe = chefe; window.__ultimaMorte = -1; window.__chefeMorto = false; }, { fase: FASE, pula: PULA, matar: MATAR, alvos: ALVOS, chefe: CHEFE });
await page.evaluate((real) => {
  const g = window.__game;
  window.Phaser.Math.RND.sow(['20261108']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now, quadros: 0 };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + (window.__passo.t - t0);
  window.__pisa = (n) => { for (let i = 0; i < n; i++) { window.__passo.t += 1000 / 60; window.__passo.quadros++; g.step(window.__passo.t, 1000 / 60); } };
  if (real) {
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    window.__pisa(2);
    g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja'); g.registry.set('sementeMorte', 20261026);
    const velha = g.scene.getScene('Game'); if (velha) velha.cartas = null;
    g.scene.start('Game', { stage: window.__fase, ship: 'humana', handling: 'diegetico' });
    for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) window.__pisa(1);
  }
  const s = g.scene.getScene('Game');
  if (window.__pula) s.director.skipTo(window.__pula);
  s.cartas.abrirMesa = () => {};
  s.victory = () => {};
  // untouchable without the invulnerability blink (the photos would catch the ship invisible)
  window.__toques = 0;
  s.damageShip = () => { window.__toques++; };
  window.__q0 = window.__passo.quadros;
}, REAL);

/** n game steps (the ship parked and untouchable); returns the clock in seconds */
const passo = (n) => page.evaluate(({ n, real, quadros }) => {
  const g = window.__game;
  for (let i = 0; i < n; i++) {
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    const s = g.scene.getScene('Game');
    if (!s || !g.scene.isActive('Game')) return null;
    s.lives = 3;
    if (!s.over) { s.ship.setPosition(60, 90); s.ship.body.setVelocity(0, 0); }
    window.__pisa(1);
    // the killer: one target on screen every `__matar` s, by the game's own death path
    const sc = g.scene.getScene('Game');
    const tt = (window.__passo.quadros - window.__q0) / 60;
    if (window.__matar > 0 && sc && !sc.over && tt - window.__ultimaMorte >= window.__matar) {
      const naTela = (o) => o.active && o.x > 24 && o.x < 360 && o.y > 16 && o.y < 200;
      const fila = [];
      if (window.__alvos.includes('inimigo')) for (const e of sc.enemies.enemies.getChildren()) if (naTela(e)) fila.push(() => sc.matarInimigo(e));
      if (window.__alvos.includes('peca')) for (const h of sc.debris.hazards.getChildren()) if (naTela(h)) fila.push(() => sc.killHazard(h));
      if (window.__alvos.includes('prop')) for (const p of sc.terrain.props.getChildren()) if (naTela(p)) fila.push(() => sc.ferirConstrucao(p, 9999));
      if (fila.length) { fila[window.__passo.quadros % fila.length](); window.__ultimaMorte = tt; }
    }
    // the boss: spawned at once (the script's `skipTo` drops events — the boss would never come), killed at `__chefe`
    if (window.__chefe > 0 && sc && !window.__chefeNasceu) { window.__chefeNasceu = true; sc.spawnBoss(); }
    if (window.__chefe > 0 && !window.__chefeMorto && sc?.boss && tt >= window.__chefe) { window.__chefeMorto = true; sc.killBoss(); }
  }
  const s = g.scene.getScene('Game');
  return real && !quadros ? s.elapsed : (window.__passo.quadros - window.__q0) / 60;
}, { n, real: REAL, quadros: QUADROS_T });

let t = 0, f = 0, nq = 0;
while (t !== null && t < ATE) {
  const perto = VIDEO && t >= DE - 0.05;
  t = await passo(perto ? 2 : (FOTOS[f] !== undefined && FOTOS[f] - t < 1.5) || DE - t < 1.5 ? 1 : 30);
  if (t === null) break;
  if (VIDEO && t >= DE && t <= ATE) {
    const tela = await page.screenshot({ clip });
    await sharp(tela).resize(768, 432, { kernel: 'nearest' }).png().toFile(path.join(QUADROS, `${String(nq++).padStart(5, '0')}.png`));
  }
  while (FOTOS[f] !== undefined && t >= FOTOS[f]) {
    const tela = await page.screenshot({ clip });
    await sharp(tela).resize(384, 216, { kernel: 'nearest' }).png().toFile(path.join(OUT, `foto-${FOTOS[f]}s.png`));
    console.log(`foto ${FOTOS[f]}s (t=${t.toFixed(2)})`);
    f++;
  }
}
if (VIDEO && nq) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(QUADROS, '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(OUT, 'video.mp4')]);
  console.log(`video: ${nq} quadros → ${path.join(OUT, 'video.mp4')}`);
}
console.log(erros.length ? erros : 'sem erro de página');
await browser.close();
