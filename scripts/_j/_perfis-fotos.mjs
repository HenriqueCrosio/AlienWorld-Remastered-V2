// BLOCO J (14/11) — the Atmosfera profiles SIDE BY SIDE: one stage on a stepped clock (the ship parked and untouchable),
// one photo of each PAINTING 5 s after it reaches the screen (the profile switch takes up to 4 s), with the numbers of
// the picture (luma, black and white points, saturation, mean colour) and of the profile the game is applying.
//   npm run dev  in another terminal, then  node scripts/_j/_perfis-fotos.mjs <out> --fase N
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args[0];
const FASE = Number(val('--fase', 1));
const ATE = Number(val('--ate', 150));
/** the paintings each stage is expected to show; the run ends when all were photographed */
const ESPERADAS = {
  1: ['paintBgF1', 'paintBgCaverna', 'paintBgZeroG'],
  2: ['paintBgF2'],
  3: ['paintBgF3', 'paintBgF3Casco', 'paintBgF3Arena'],
  4: ['paintBgF4a', 'paintBgF4b', 'paintBgF4c', 'paintBgF4d'],
}[FASE];
if (!OUT || !ESPERADAS) { console.error('usage: _perfis-fotos.mjs <out> --fase 1..4'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.addInitScript(() => {
  const base = 1762560000000;
  let k = 0;
  Date.now = () => base + (k += 16);
  let a = 20261114;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
});
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(500);
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const clip = { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k };

await page.evaluate((fase) => {
  const g = window.__game;
  window.Phaser.Math.RND.sow(['20261114']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now, quadros: 0 };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + (window.__passo.t - t0);
  window.__pisa = (n) => { for (let i = 0; i < n; i++) { window.__passo.t += 1000 / 60; window.__passo.quadros++; g.step(window.__passo.t, 1000 / 60); } };
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  window.__pisa(2);
  g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja'); g.registry.set('sementeMorte', 20261026);
  const velha = g.scene.getScene('Game'); if (velha) velha.cartas = null;
  g.scene.start('Game', { stage: fase, ship: 'humana', handling: 'diegetico' });
  for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) window.__pisa(1);
  const s = g.scene.getScene('Game');
  s.cartas.abrirMesa = () => {};
  s.victory = () => {};
  s.damageShip = () => {};
  window.__q0 = window.__passo.quadros;
}, FASE);

/** n game steps; returns the clock, the painting on screen and the profile being applied */
const passo = (n, fase) => page.evaluate(({ n, fase }) => {
  const g = window.__game;
  for (let i = 0; i < n; i++) {
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    const s = g.scene.getScene('Game');
    if (!s || !g.scene.isActive('Game')) return null;
    s.lives = 3;
    if (!s.over) { s.ship.setPosition(60, 108); s.ship.body.setVelocity(0, 0); }
    // chamber B of the F4 only lets the stage clock go when the dolphin dies (the cheat of `probe-atmosfera-fases`)
    if (s.golfinho?.vulneravel) s.golfinho.damage(9999);
    window.__pisa(1);
  }
  const s = g.scene.getScene('Game');
  const t = (window.__passo.quadros - window.__q0) / 60;
  // the F1 only leaves the atmosphere when its boss dies: the probe breaks it by hand once the cave is behind
  if (fase === 1 && t > 75 && s.parallax.pinturaNaTela() === 'paintBgF1' && !window.__rompeu) { window.__rompeu = true; s.parallax.breakAtmosphere(); }
  return { t, pintura: s.parallax.pinturaNaTela(), atm: s.atm?.estado() ?? null };
}, { n, fase });

/** luma, black/white points (p5/p95), mean saturation and mean colour of a 384×216 photo */
async function medir(buf) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const lumas = new Float32Array(n);
  let sr = 0, sg = 0, sb = 0, ss = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    lumas[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    ss += mx === 0 ? 0 : (mx - mn) / mx;
    sr += r; sg += g; sb += b;
  }
  const ord = Float32Array.from(lumas).sort();
  const media = lumas.reduce((a, v) => a + v, 0) / n;
  return {
    luma: +media.toFixed(1), p5: +ord[Math.floor(n * 0.05)].toFixed(1), p95: +ord[Math.floor(n * 0.95)].toFixed(1),
    sat: +(ss / n).toFixed(3), cor: [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)],
  };
}

const vistaEm = {}; // painting → the clock when it first reached the screen
const feitas = {};
let e = { t: 0 };
while (e && e.t < ATE && ESPERADAS.some((p) => !feitas[p])) {
  e = await passo(30, FASE);
  if (!e) break;
  if (vistaEm[e.pintura] === undefined) { vistaEm[e.pintura] = e.t; console.log(`${e.pintura} na tela em t=${e.t.toFixed(1)}`); }
  if (!feitas[e.pintura] && e.t - vistaEm[e.pintura] >= 5) {
    const tela = await page.screenshot({ clip });
    const foto = await sharp(tela).resize(384, 216, { kernel: 'nearest' }).png().toBuffer();
    fs.writeFileSync(path.join(OUT, `${e.pintura}.png`), foto);
    feitas[e.pintura] = { pintura: e.pintura, t: +e.t.toFixed(1), atm: e.atm, medida: await medir(foto) };
    console.log(`foto ${e.pintura} (t=${e.t.toFixed(1)})`, JSON.stringify(feitas[e.pintura].medida));
  }
}
fs.writeFileSync(path.join(OUT, `fase${FASE}.json`), JSON.stringify(Object.values(feitas), null, 2));
const faltou = ESPERADAS.filter((p) => !feitas[p]);
console.log(faltou.length ? `FALTOU: ${faltou.join(', ')}` : 'todas as pinturas fotografadas');
console.log(erros.length ? erros : 'sem erro de página');
await browser.close();
process.exitCode = faltou.length || erros.length ? 1 : 0;
