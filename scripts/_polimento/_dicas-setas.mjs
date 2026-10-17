// 17/10 — ITEM 16, BEFORE × AFTER: the control hints of the ship panel (Interlude 2) and the card table, photographed
// with today's text; the panel also with the old one put back in memory (`antes`) — on the card table the old
// "[<-  ->]" was plain ASCII in the same font, so it needs no photo.
//   node scripts/_polimento/_dicas-setas.mjs <out dir>
import { chromium } from 'playwright';

const OUT = process.argv[2];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
const shot = async (arq) => {
  const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  await page.screenshot({ path: arq, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
};
// The ship panel.
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.scene.start('Interlude2', { score: 0, ship: 'humana', handling: 'diegetico', stage: 2 });
});
await page.waitForTimeout(2500);
await page.evaluate(() => window.__game.scene.getScene('Interlude2').escolha());
await page.waitForTimeout(1500);
await shot(`${OUT}/painel-depois.png`);
await page.evaluate(() => window.__game.scene.getScene('Interlude2').panel.rodape.setText('[←→] escolher  ·  [ENTER] selecionar  ·  [ESC] sair'));
await page.waitForTimeout(200);
await shot(`${OUT}/painel-antes.png`);
// The card table.
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 1, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => window.__game.scene.getScene('Game').cartas.abrirMesa('meio', 'SUPRIMENTO ENCONTRADO'));
await page.waitForTimeout(1500);
await shot(`${OUT}/mesa-depois.png`);
await browser.close();
console.log('ok', OUT);
