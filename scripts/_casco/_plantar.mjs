// F3 HULL PROPS (10/11) — THE CANDIDATES PLANTED IN THE REAL GAME: the F3 from its start on a stepped clock with fixed
// luck (the recipe of `_cenario/_f3-casco-filmar.mjs`) up to a calm moment of the Act 2; there, for each concept, the
// hull's own props are cleared and the three picked candidates are spawned through `terrain.spawn` (the real planting,
// depth, mirroring and the strip that hides the foot), then dressed with the candidate's texture. One photo per concept,
// all on the same frame of the game. Nothing in src/ changes.
//   node scripts/_casco/_plantar.mjs <out-dir> [--t 66]
// (with `npm run dev` running; do not touch src/ or .html while it runs)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args[0];
const T = Number(val('--t', 66));
const ESC = 'docs/superpowers/folhas/2026-11-10/casco-pecas/escolhidas';
fs.mkdirSync(OUT, { recursive: true });

const url = (arq) => `data:image/png;base64,${fs.readFileSync(arq).toString('base64')}`;
const CONCEITOS = ['torreCraca', 'torreCostela', 'torreEspinho', 'torreTubos', 'ventEspiraculo', 'ventVertebras', 'ventCracas', 'ventBranquias'];
const texturas = {};
for (const c of CONCEITOS) for (const v of 'abc') texturas[`${c}-${v}`] = url(`${ESC}/${c}-${v}.png`);

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

await page.evaluate(async (texturas) => {
  const g = window.__game;
  for (const [key, dataUrl] of Object.entries(texturas)) {
    await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { g.textures.addImage(key, img); res(); };
      img.onerror = rej;
      img.src = dataUrl;
    });
  }
}, texturas);

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
});

const passo = (n) => page.evaluate((n) => {
  const g = window.__game;
  for (let i = 0; i < n; i++) {
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    const s = g.scene.getScene('Game');
    if (!s || !g.scene.isActive('Game')) return null;
    s.lives = 3;
    if (!s.over) { s.ship.setPosition(60, 90); s.ship.body.setVelocity(0, 0); }
    window.__pisa(1);
  }
  return g.scene.getScene('Game').elapsed;
}, n);

let t = 0;
while (t !== null && t < T) t = await passo(T - t < 1.5 ? 1 : 30);

const foto = async (nome) => {
  const tela = await page.screenshot({ clip });
  await sharp(tela).resize(384, 216, { kernel: 'nearest' }).png().toFile(path.join(OUT, `${nome}.png`));
  console.log(nome);
};
/** clear the hull's props, plant `pecas` ([kind, texture|null, x]) and render one frame */
const plantar = (pecas) => page.evaluate((pecas) => {
  const s = window.__game.scene.getScene('Game');
  const grupo = s.terrain.props;
  grupo.getChildren().slice().forEach((p) => p.destroy());
  for (const [kind, textura, x] of pecas) {
    s.terrain.spawn(kind, { x });
    const p = grupo.getChildren().at(-1);
    if (textura) p.setTexture(textura);
    p.y = 194;
    p.setData('cooldown', 99); // no shot in the photo
  }
  window.__pisa(1);
}, pecas);

// today's five (the variant is whatever `pickVariant` draws: dressed by key so all five show)
await plantar([['lancaMisseis', 'lancaMisseis', 120], ['lancaMisseis', 'lancaMisseis2', 190], ['respiradouro', 'respiradouro', 250], ['respiradouro', 'respiradouro2', 300], ['respiradouro', 'respiradouro3', 350]]);
await foto('hoje');
for (const c of CONCEITOS) {
  const kind = c.startsWith('torre') ? 'lancaMisseis' : 'respiradouro';
  await plantar([[kind, `${c}-a`, 150], [kind, `${c}-b`, 240], [kind, `${c}-c`, 330]]);
  await foto(c);
}
console.log(erros.length ? erros : 'sem erro de página');
await browser.close();
