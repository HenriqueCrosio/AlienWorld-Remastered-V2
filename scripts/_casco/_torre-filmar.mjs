// F3 HULL LAUNCHER (10/11) — THE NEW LAUNCHERS FIRING, FILMED IN THE REAL GAME: the F3 on a stepped clock with fixed luck
// up to a calm moment of the Act 2, the hull's props cleared, the three variants planted through `terrain.spawn` and
// left to fire at the parked ship. A video (30 fps, ×3 nearest), native photos, and a log of every missile's birth
// (which variant, which mouth, where) to check that the four mouths take turns.
//   node scripts/_casco/_torre-filmar.mjs <out-dir> [--t 61.2] [--dur 9] [--nave 60,90]
// (with `npm run dev` running; do not touch src/ or .html while it runs — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args[0];
const T = Number(val('--t', 61.2)), DUR = Number(val('--dur', 9));
const VEL = Number(val("--vel", 36));
const NAVE = val('--nave', '60,90').split(',').map(Number);
const QUADROS = path.join(OUT, 'q');
fs.rmSync(QUADROS, { recursive: true, force: true });
fs.mkdirSync(QUADROS, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.addInitScript(() => {
  const base = 1762560000000;
  let k = 0;
  Date.now = () => base + (k += 16);
  let a = 20261108;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
});
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(500);
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const clip = { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k };

await page.evaluate(() => {
  const g = window.__game;
  window.Phaser.Math.RND.sow(['20261108']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now, quadros: 0 };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + (window.__passo.t - t0);
  window.__pisa = (n) => { for (let i = 0; i < n; i++) { window.__passo.t += 1000 / 60; window.__passo.quadros++; g.step(window.__passo.t, 1000 / 60); } };
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  window.__pisa(2);
  g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja'); g.registry.set('sementeMorte', 20261026);
  const velha = g.scene.getScene('Game'); if (velha) velha.cartas = null;
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico' });
  for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) window.__pisa(1);
  const s = g.scene.getScene('Game');
  s.cartas.abrirMesa = () => {};
  s.victory = () => {};
  s.damageShip = () => {};
  window.__nascidos = [];
  window.__vistos = new Set();
});

const passo = (n, nave) => page.evaluate(({ n, nave }) => {
  const g = window.__game;
  for (let i = 0; i < n; i++) {
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    const s = g.scene.getScene('Game');
    if (!s || !g.scene.isActive('Game')) return null;
    s.lives = 3;
    if (!s.over) { s.ship.setPosition(nave[0], nave[1]); s.ship.body.setVelocity(0, 0); }
    window.__pisa(1);
    // every missile's birth: the launcher it came from and where it was born, in the launcher's own frame
    for (const b of s.enemies.enemyBullets.getChildren()) {
      if (!b.active || b.getData('rastroCasco') !== true) continue;
      // the pool recycles its sprites: a birth is the slot + where it was born, not the slot alone
      const chave = `${b.getData('ox')},${b.getData('oy')}`;
      if (b.__nasc === chave) continue;
      b.__nasc = chave;
      const p = b.getData('atirador');
      if (!p) continue;
      window.__nascidos.push({
        t: Number(s.elapsed.toFixed(2)), arte: p.texture.key,
        // back to the un-mirrored art: x from the CENTRE, y from the TOP (the `BOCAS_DA_ARTE` convention)
        boca: [Math.round(p.x - b.getData('ox')), Math.round(b.getData('oy') - (p.y - p.displayHeight))],
      });
    }
  }
  return g.scene.getScene('Game').elapsed;
}, { n, nave });

let t = 0;
while (t !== null && t < T) t = await passo(T - t < 1.5 ? 1 : 30, NAVE);

// `--vel` px/s: how fast the planted launchers ride the hull in the film (the game's scroll is 84; slower shows more
// shots per launcher). `--x` moves the row.
const X0 = Number(val('--x', 190));
const PECAS = [['lancaMisseis', X0, 196], ['lancaMisseis2', X0 + 85, 188], ['lancaMisseis3', X0 + 170, 198]];
await page.evaluate(({ PECAS, VEL }) => {
  const s = window.__game.scene.getScene('Game');
  const grupo = s.terrain.props;
  grupo.getChildren().slice().forEach((p) => p.destroy());
  PECAS.forEach(([textura, x, pe]) => {
    s.terrain.spawn('lancaMisseis', { x });
    const p = grupo.getChildren().at(-1);
    p.setTexture(textura);
    p.y = pe;
    p.body.reset(p.x, p.y);
    p.setVelocityX(-VEL);
    const sombra = p.getData('sombra');
    if (sombra) sombra.y = pe + 1;
  });
}, { PECAS, VEL });

let nq = 0;
const fim = T + DUR;
const FOTOS = [0.1, 1.2, 2.4, 3.6, 5.0].map((d) => T + d);
let f = 0;
while (t !== null && t < fim) {
  t = await passo(2, NAVE);
  if (t === null) break;
  const tela = await page.screenshot({ clip });
  await sharp(tela).resize(1152, 648, { kernel: 'nearest' }).png().toFile(path.join(QUADROS, `${String(nq++).padStart(5, '0')}.png`));
  if (FOTOS[f] !== undefined && t >= FOTOS[f]) {
    await sharp(tela).resize(384, 216, { kernel: 'nearest' }).png().toFile(path.join(OUT, `foto-${f}.png`));
    f++;
  }
}
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(QUADROS, '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '14', path.join(OUT, 'video.mp4')]);
const nascidos = await page.evaluate(() => window.__nascidos);
fs.writeFileSync(path.join(OUT, 'nascidos.json'), JSON.stringify(nascidos, null, 2) + '\n');
console.log(`${nq} frames → ${path.join(OUT, 'video.mp4')}`);
for (const n of nascidos) console.log(`  t=${n.t} ${n.arte} mouth (${n.boca})`);
console.log(erros.length ? erros : 'sem erro de página');
await browser.close();
