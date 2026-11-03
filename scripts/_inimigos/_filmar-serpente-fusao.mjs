// 28/10 — THE SERPENT'S FUSION, filmed in the real game on a stepped clock (60 steps/s, a photo every 2 = 30 fps), for
// the before/after of the fusion's bites (spec `docs/superpowers/specs/2026-10-28-serpente-fusao-mordidas-design.md`).
// The practice arena of the F3; the three heads go down fast (no film), then the fusion is filmed from its first
// frame to 4 s after the death, under the ship's REAL bullets (5 a second, sweeping over the live head) and nothing
// else — the same luck every run, so "antes" and "depois" differ only by the code.
//   node scripts/_inimigos/_filmar-serpente-fusao.mjs <dir> <nome>            → <dir>/cru/<nome>/*.png + <dir>/<nome>.webm
//   node scripts/_inimigos/_filmar-serpente-fusao.mjs <dir> --lado=antes,depois → <dir>/lado.webm (side by side, labelled)
// (with `npm run dev` running; do not touch src/ or .html while it films — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { webm } from '../_menu/_webm.mjs';

const args = process.argv.slice(2);
const [DIR, NOME] = args.filter((a) => !a.startsWith('--'));
const LADO = args.find((a) => a.startsWith('--lado='))?.slice(7).split(',');
const ZOOM = 3;
// the crop (game px): the fusion, its head and where its pieces fly (it charges left, too)
const CROP = { x: 96, y: 0, w: 288, h: 216 };
const ROTULO = 24;

const rotulo = (txt, w, cor = '#c8cdd8') => sharp(Buffer.from(
  `<svg width="${w}" height="${ROTULO}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="${ROTULO - 7}" font-family="Consolas, monospace" font-size="14" fill="${cor}">${txt}</text></svg>`,
)).png().toBuffer();

if (LADO) {
  // the two runs side by side, each under its label; the shorter one holds its last frame
  const dirs = LADO.map((n) => path.join(DIR, 'cru', n));
  const quadros = dirs.map((d) => fs.readdirSync(d).filter((n) => n.endsWith('.png')).sort());
  const CW = CROP.w * ZOOM, CH = CROP.h * ZOOM, GAP = 4;
  const W = LADO.length * (CW + GAP) - GAP, H = ROTULO + CH;
  const cab = await Promise.all(LADO.map((n) => rotulo(n, CW, n === 'antes' ? '#c8cdd8' : '#ffb040')));
  const out = path.join(DIR, 'cru', '_lado');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const nq = Math.max(...quadros.map((q) => q.length));
  for (let i = 0; i < nq; i++) {
    const comp = [];
    LADO.forEach((_, c) => {
      comp.push({ input: cab[c], left: c * (CW + GAP), top: 0 });
      comp.push({ input: path.join(dirs[c], quadros[c][Math.min(i, quadros[c].length - 1)]), left: c * (CW + GAP), top: ROTULO });
    });
    await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(path.join(out, `${String(i).padStart(5, '0')}.png`));
  }
  const n = await webm(out, path.join(DIR, 'lado.webm'), 30);
  fs.rmSync(out, { recursive: true, force: true });
  console.log(path.join(DIR, 'lado.webm'), n, 'quadros', `${W}x${H}`);
  process.exit(0);
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);
const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { k: c.width / 384, left: c.left, top: c.top };
});

// A DETERMINISTIC START (as in `_sonda-serpente-fusao.mjs`: before and after must differ only by the code): the luck —
// ours and Phaser's own, which the parallax uses for its tints — is fixed and the clock goes on steps BEFORE the phase
// starts; no real-time wait after this.
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  let a = 20261026;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  window.Phaser.Math.RND.sow(['20261026']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now, seg: 0 };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + (window.__passo.t - t0);
  const pisa = (n) => {
    for (let i = 0; i < n; i++) {
      window.__passo.t += 1000 / 60;
      g.step(window.__passo.t, 1000 / 60);
    }
  };
  pisa(2);
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.registry.set('modeloNave', 'a');
  g.registry.set('pinturaNave', 'laranja');
  g.registry.set('estiloMorte', undefined);
  g.registry.set('sementeMorte', 20261026);
  g.registry.set('destrocosVariantes', undefined);
  const velha = g.scene.getScene('Game');
  if (velha) velha.cartas = null;
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico', practice: true });
  for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) pisa(1);
  const s = g.scene.getScene('Game');
  s.cartas.abrirMesa = () => {};
  for (let i = 0; i < 4; i++) {
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    pisa(12);
  }
  s.victory = () => {};
  s.enemies.enemies.clear(true, true);
  s.enemies.enemyBullets?.clear(true, true);
  s.spawnHazards = () => {};
  s.debris.hazards.clear(true, true);
  s.parallax.setForegroundDimmed(true, 0);
  s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
  s.banner.setAlpha(0);
  s.bannerFaixa.setAlpha(0);
  s.invulnerableUntil = 1e12;
  s.lives = 3;
});

/** `n` steps; the ship parked on the left fires every `cada` steps over the live head (a slow sweep of ±8 px). */
const passo = (n, cada) => page.evaluate(({ n, cada }) => {
  const g = window.__game;
  for (let i = 0; i < n; i++) {
    if (!g.scene.isActive('Game')) return null;
    const s = g.scene.getScene('Game');
    const P = window.__passo;
    const b = s.boss;
    const vivo = b && !b.isDead && !b.entering;
    const alvo = vivo ? b.targets?.find((x) => x.active) : undefined;
    if (!s.over) {
      s.ship.setPosition(40, alvo ? alvo.y + Math.sin(P.seg * 1.3) * 8 : 108);
      s.ship.body.setVelocity(0, 0);
      if (alvo && Math.round(P.seg * 60) % cada === 0) s.weapons.shoot(s.ship.x + 10, s.ship.y);
    }
    if (s.boss) {
      s.enemies.enemies.clear(true, true);
      s.enemies.enemyBullets?.clear(true, true);
    }
    P.t += 1000 / 60;
    P.seg += 1 / 60;
    g.step(P.t, 1000 / 60);
  }
  const s = g.scene.getScene('Game');
  const b = s.boss;
  return b ? { entrando: !!b.entering, morto: !!b.isDead, fase: b.faseIdx, imune: b.imune > 0, vida: b.hpTotal / b.maxHpTotal, mord: s.destrocos.mordidas(b.sprite) } : { morto: true };
}, { n, cada });

// the boss arrives
let r;
for (let i = 0; i < 1200; i++) {
  r = await passo(2, 6);
  if (r && !r.entrando && r.fase !== undefined) break;
}
// the three heads, fast and unfilmed: the bullets plus a drain, until the fusion stands (its scene over) — a small
// drain: what a head's last hit overshoots comes off the whole fight's life (the boss's `hpTotal`)
for (let i = 0; i < 6000; i++) {
  if (r.fase < 3) {
    await page.evaluate(() => {
      const b = window.__game.scene.getScene('Game').boss;
      if (b && !b.isDead) b.damage(1);
    });
  }
  r = await passo(2, 6);
  if (r.fase === 3 && !r.imune) break;
}
console.log('a fusão de pé:', JSON.stringify(r));

const dir = path.join(DIR, 'cru', NOME);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const clip = { x: geo.left + CROP.x * geo.k, y: geo.top + CROP.y * geo.k, width: CROP.w * geo.k, height: CROP.h * geo.k };
const log = [];
let morteEm;
for (let i = 0; i < 30 * 40; i++) {
  r = await passo(2, 12);
  if (!r) break;
  if (r.mord > (log.at(-1)?.mord ?? 0)) log.push({ seg: +(i / 30).toFixed(2), mord: r.mord, vida: +r.vida.toFixed(3) });
  if (r.morto && morteEm === undefined) morteEm = i / 30;
  const foto = await page.screenshot({ clip });
  await sharp(foto).resize(CROP.w * ZOOM, CROP.h * ZOOM, { kernel: 'nearest' }).png().toFile(path.join(dir, `${String(i).padStart(5, '0')}.png`));
  if (morteEm !== undefined && i / 30 - morteEm >= 4) break;
}
await browser.close();
const n = await webm(dir, path.join(DIR, `${NOME}.webm`), 30);
console.log(path.join(DIR, `${NOME}.webm`), n, 'quadros', 'mordidas:', JSON.stringify(log), 'morte em', morteEm, 's', erros.length ? erros : 'sem erro');
