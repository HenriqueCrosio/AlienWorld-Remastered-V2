// The REAL F4 backdrops for the art sheets (spec fatia F4 §5): chambers A and B and the duct, photographed at 1× (384×216)
// with the screen emptied, the border (Moldura) in place. Next to each photo goes the surface of the wall per
// column (`<name>.json`: chao[x], teto[x]) — the Tube candidates sit on the REAL edge.
//   node scripts/_elites/_fundos-f4.mjs <outDir>   (npm run dev running)
import fs from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const PARADAS = [
  { t: 20, nome: 'fundo-camara-a' },
  { t: 52, nome: 'fundo-camara-b' }, // the rib cage after the dolphin: the squeeze, where the two Tubes go
  { t: 74, nome: 'fundo-duto' },
];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 4, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.waitForTimeout(600);

for (const p of PARADAS) {
  await page.evaluate((t) => {
    const s = window.__game.scene.getScene('Game');
    s.lives = 999;
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    s.damageShip = () => {};
    if (s.golfinho) s.encerrarGolfinho(false);
    s.elapsed = t;
    s.director.skipTo(t);
    s.aplicaCorredorEMoldura(t);
  }, p.t);
  // The wall chases its target at 8px/s; 7s cover the worst jump (the `_ver-bordas` recipe).
  await page.waitForTimeout(7000);
  const info = await page.evaluate(() => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    g.loop.sleep();
    s.enemies.enemies.getChildren().forEach((e) => e.setVisible(false));
    s.enemies.enemyBullets.getChildren().forEach((b) => b.setVisible(false));
    s.debris?.hazards?.getChildren().forEach((h) => h.setVisible(false));
    s.weapons?.bullets?.getChildren?.().forEach((b) => b.setVisible(false));
    s.terrain?.props?.getChildren().forEach((m) => m.setVisible(false)); // the tables: the Tube is born on a plate without one
    s.ship.setAlpha(0); // `setVisible` is rewritten every frame by the invulnerability blink
    s.banner?.setAlpha(0);
    s.bannerFaixa?.setAlpha(0);
    g.loop.wake();
    const chao = [], teto = [];
    for (let x = 0; x < 384; x++) {
      chao.push(Math.round(s.moldura.superficieChaoEm(x)));
      teto.push(Math.round(s.moldura.superficieTetoEm(x)));
    }
    return { t: s.elapsed, chao, teto };
  });
  await page.waitForTimeout(60);
  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  const png = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  await sharp(png).resize(384, 216, { kernel: 'nearest' }).png().toFile(`${out}/${p.nome}.png`);
  fs.writeFileSync(`${out}/${p.nome}.json`, JSON.stringify(info));
  console.log(p.nome, 't', info.t.toFixed(1), 'chao', info.chao[300], 'teto', info.teto[300]);
}
await browser.close();
