// WHERE A SERPENT COMES OUT FROM BEHIND HIM (23/11): the serpent layer filled bright green for the photo only, so the cord
// that shows from behind the body stands out from the painted tentacles. A magnified crop per moment.
//   npm run dev, then  node scripts/_guardiao/_raiz-verde.mjs <out.png> [--porta 5173] [--quadros 40,70,100]
//     [--recorte x,y,w,h] [--zoom 5] [--sem-verde]
import { chromium } from 'playwright';
import sharp from 'sharp';

const OUT = process.argv[2];
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const PORTA = arg('--porta', '5173');
const QUADROS = arg('--quadros', '40,70,100').split(',').map(Number);
const [RX, RY, RW, RH] = arg('--recorte', '270,110,114,90').split(',').map(Number);
const Z = Number(arg('--zoom', '5'));
const VERDE = !process.argv.includes('--sem-verde');

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto(`http://localhost:${PORTA}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
await page.waitForFunction(() => {
  const g = window.__game.scene;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering && s.boss.acao === 'flutua';
}, null, { timeout: 120000, polling: 250 });
await page.evaluate(() => {
  const g = window.__game, s = g.scene.getScene('Game'), b = s.boss;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.damageShip = () => {};
  b.hpGuardiao = b.constructor.HP_GUARDIAO * 0.5;
  b.acao = 'flutua';
  b.proxima = 'serpentes';
  b.acaoT = 0;
  b.cdTiro = 99;
  s.ship.setPosition(80, 110);
  g.loop.sleep();
  window.__t = g.loop.now;
  window.__q = 0;
});
const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { k: c.width / 384, left: c.left, top: c.top };
});
const fotos = [];
for (const q of QUADROS) {
  await page.evaluate(([q, verde]) => {
    const g = window.__game, b = g.scene.getScene('Game').boss;
    for (; window.__q < q; window.__q++) { window.__t += 1000 / 60; g.step(window.__t, 1000 / 60); }
    if (verde) b.serpentes.img.setTintFill(0x22ff44);
    g.step(window.__t, 0);
  }, [q, VERDE]);
  const foto = await page.screenshot({ clip: { x: geo.left + RX * geo.k, y: geo.top + RY * geo.k, width: RW * geo.k, height: RH * geo.k } });
  fotos.push(await sharp(foto).resize(RW * Z, RH * Z, { kernel: 'nearest' }).png().toBuffer());
  await page.evaluate(() => window.__game.scene.getScene('Game').boss.serpentes.img.clearTint());
}
await sharp({ create: { width: RW * Z * fotos.length + 8 * (fotos.length - 1), height: RH * Z, channels: 4, background: '#000' } })
  .composite(fotos.map((f, k) => ({ input: f, left: k * (RW * Z + 8), top: 0 })))
  .png()
  .toFile(OUT);
console.log(OUT);
await browser.close();
