// PROTOTYPE: the card table in its three layouts, same 3 cards, over live F2 gameplay (for the comparison sheet).
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).filter((s) => s.scene.key !== 'Game').forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('tierNave', 1);
  g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
});
await page.waitForTimeout(4000);

for (const layout of ['cartucho', 'compacto', 'lista']) {
  await page.evaluate((layout) => {
    const g = window.__game;
    g.registry.set('layoutCartas', layout);
    const s = g.scene.getScene('Game');
    s.invulnerableUntil = s.time.now + 60000;
    s.scene.pause();
    s.scene.launch('Cartas', { opcoes: ['WPN_001', 'EFF_006', 'DEF_003'], titulo: 'SUPRIMENTO ENCONTRADO', onEscolha: () => {} });
  }, layout);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/layout-${layout}-1.png` });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/layout-${layout}-2.png` });
  await page.evaluate(() => { window.__game.scene.stop('Cartas'); });
  await page.waitForTimeout(300);
}
console.log(JSON.stringify({ erros }));
await browser.close();
