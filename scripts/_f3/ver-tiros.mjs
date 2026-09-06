// OS PROJETEIS DOS DOIS CHEFES, congelados e ampliados. Espera um tiro de cada estar EM VOO,
// pausa a cena e recorta em volta dele -- medir cor no PNG nao diz nada sobre ler na tela.
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
for (let i = 0; i < 60; i++) {
  if (await page.evaluate(() => !!(window.__game?.scene.getScene('Game')?.terrain))) break;
  await page.waitForTimeout(250);
}
const respirar = () => page.evaluate(() => { const s=window.__game.scene.getScenes(true)[0]; if(s.lives!==undefined) s.lives=9; });
const t = () => page.evaluate(() => Number((window.__game.scene.getScenes(true)[0].elapsed ?? 0).toFixed(1)));

const pegar = async (tex, alvoT, nome) => {
  while ((await t()) < alvoT) { await page.waitForTimeout(400); await respirar(); }
  for (let i = 0; i < 400; i++) {
    const r = await page.evaluate((tx) => {
      const s = window.__game.scene.getScene('Game');
      const bs = s.enemies.enemyBullets.getChildren().filter((b) => b.active && b.texture.key === tx);
      const lim = tx === 'shotVeneno' ? [40, 150] : [40, 344];
      const b = bs.find((o) => o.x > lim[0] && o.x < lim[1] && o.y > 30 && o.y < 190);
      if (!b) return null;
      window.__game.scene.pause('Game');
      return { n: bs.length, x: Math.round(b.x), y: Math.round(b.y), tex: b.texture.key,
               w: Math.round(b.displayWidth), h: Math.round(b.displayHeight),
               corpo: [Math.round(b.body.width), Math.round(b.body.height)], blend: b.blendMode, tint: b.tintTopLeft.toString(16) };
    }, tex);
    if (r) return r;
    await page.waitForTimeout(60); await respirar();
  }
  return null;
};

const a = await pegar('shotAranha', 56, 'aranha');
console.log('aranha   ' + JSON.stringify(a));
if (a) {
  const buf = await page.screenshot();
  const L = Math.max(0, Math.min(384-64, a.x-32)), T = Math.max(0, Math.min(216-48, a.y-24));
  await sharp(buf).extract({ left: L, top: T, width: 64, height: 48 }).resize(64*10, 48*10, { kernel:'nearest' }).toFile('scripts/_f3/tiro-aranha.png');
}
await page.evaluate(() => window.__game.scene.resume('Game'));
const s = await pegar('shotVeneno', 92, 'serpente');
console.log('serpente ' + JSON.stringify(s));
if (s) {
  const buf = await page.screenshot();
  const L = Math.max(0, Math.min(384-64, s.x-32)), T = Math.max(0, Math.min(216-48, s.y-24));
  await sharp(buf).extract({ left: L, top: T, width: 64, height: 48 }).resize(64*10, 48*10, { kernel:'nearest' }).toFile('scripts/_f3/tiro-serpente.png');
}
await browser.close();
