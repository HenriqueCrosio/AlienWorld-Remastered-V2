// 27/10 — THE MARKS ON A LIVING ENEMY (his report: the big bite did not follow a body that moves; his idea: each hit
// takes 1 px, an explosion 3, the bomb 4, and the big pieces only near the death): an enemy LIVING (its own update
// on, unlike the films), shot from the left a hit every 0.1 s, photographed zoomed while it moves.
//   node scripts/_inimigos/_sonda-movimento.mjs <stage> <kind> <out.png> [tiros=30] [ate=0.12]
import { chromium } from 'playwright';
import sharp from 'sharp';
const [STAGE, KIND, OUT, TIROS = '30', ATE = '0.12'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);
await page.evaluate((stage) => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage, ship: 'humana', handling: 'diegetico' });
}, Number(STAGE));
await page.waitForFunction(() => window.__game.scene.getScene('Game')?.cartas && window.__game.scene.isActive('Game'));
await page.waitForTimeout(600);
const geo = await page.evaluate((kind) => {
  const s = window.__game.scene.getScene('Game');
  s.cartas.abrirMesa = () => {};
  s.director.update = () => [];
  s.enemies.enemies.clear(true, true);
  s.invulnerableUntil = 1e12;
  s.lives = 99;
  s.enemies.intocavel = () => false;
  s.enemies.bloqueia = () => false;
  window.__alvo = s.enemies.spawn(kind, 108, 300);
  const r = window.__game.canvas.getBoundingClientRect();
  return { k: r.width / 384, l: r.left, t: r.top };
}, KIND);
await page.waitForTimeout(1500);
const foto = async () => {
  const p = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const e = window.__alvo;
    s.enemies.enemyBullets?.clear(true, true);
    if (!e?.active) return null;
    const cic = s.destrocos.cicatrizes.get(e);
    let furos = 0;
    furos = s.destrocos.furosDe(e);
    return { x: e.x, y: e.y, w: e.displayWidth, h: e.displayHeight, vida: e.getData('hp') / e.getData('hpMax'), furos, mord: s.destrocos.mordidas(e) };
  });
  if (!p) return null;
  const L = Math.max(p.w, p.h) * 1.4;
  const x = Math.max(0, Math.min(384 - L, p.x - L / 2)), y = Math.max(0, Math.min(216 - L, p.y - L / 2));
  const png = await page.screenshot({ clip: { x: geo.l + x * geo.k, y: geo.t + y * geo.k, width: L * geo.k, height: L * geo.k } });
  console.log(JSON.stringify(p));
  return sharp(png).resize(330, 330, { kernel: 'nearest' }).png().toBuffer();
};
const fotos = [];
const tiro = (fim) => page.evaluate((fim) => {
  const s = window.__game.scene.getScene('Game');
  const e = window.__alvo;
  if (!e?.active) return false;
  const max = e.getData('hpMax'), hp = e.getData('hp');
  // a hit from the left at a random height; near the end (`fim`), down to just above the death
  const dano = fim ? Math.max(0.01, hp - max * fim) : Math.min(hp - max * 0.4, max / 50);
  if (dano <= 0) return true;
  const de = { x: e.x - 60, y: e.y + (Math.random() - 0.5) * e.displayHeight * 0.6 };
  s.fx.hit(e.x - e.displayWidth * 0.3, de.y);
  s.ferirInimigo(e, dano, 'tiro', de);
  return true;
}, fim);
for (let i = 0; i < Number(TIROS); i++) {
  await tiro(0);
  await page.waitForTimeout(100);
  if (i % 10 === 9) fotos.push(await foto());
}
// it moves on with its marks
for (let i = 0; i < 3; i++) {
  await page.waitForTimeout(200);
  fotos.push(await foto());
}
// the end: down past the last thresholds (the big pieces), still alive
await tiro(Number(ATE));
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(150);
  fotos.push(await foto());
}
await browser.close();
const ok = fotos.filter(Boolean);
const comp = ok.map((f, i) => ({ input: f, left: (i % 5) * 334, top: Math.floor(i / 5) * 334 }));
await sharp({ create: { width: 5 * 334, height: Math.ceil(ok.length / 5) * 334, channels: 4, background: '#000' } }).composite(comp).png().toFile(OUT);
console.log(OUT, erros.length ? erros : 'sem erro');
