// PROTOTYPE (29/09): mixed-resolution panorama — 4 text options x 6 screens. Usage: node scripts/probe-mista.mjs <outdir>; then node scripts/folha-mista.mjs <outdir> <sheetdir>.
import { chromium } from 'playwright';
const OUT = process.argv[2];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const erros = [];
const COLS = { hoje: '', silk: '?fonte=silkscreen', pixel: '?ui3x=pixel', lisa: '?ui3x=lisa' };
const espelhar = (key) => {
  const g = window.__game, hd = window.__gameHD;
  if (!hd) return 0;
  const sc = g.scene.getScene(key);
  const out = [];
  const vis = (o) => { for (let p = o; p; p = p.parentContainer) if (!p.visible) return false; return true; };
  const walk = (list) => list.forEach((o) => {
    if (o.list) walk(o.list);
    if (!o.__px || !vis(o)) return;
    const m = o.getWorldTransformMatrix();
    let a = o.alpha; for (let p = o.parentContainer; p; p = p.parentContainer) a *= p.alpha;
    out.push({ value: o.text, x: m.tx, y: m.ty, ...o.__px, ox: o.originX, oy: o.originY, alpha: a });
    o.setVisible(false);
  });
  walk(sc.children.list);
  hd.scene.start('EspelhoHD', { textos: out });
  return out.length;
};
for (const [col, q] of Object.entries(COLS)) {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => erros.push(col + ': ' + e.message));
  await page.goto('http://localhost:5173/' + q, { waitUntil: 'networkidle' });
  await page.waitForTimeout(7000);
  const n = await page.evaluate(espelhar, 'Menu');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${col}-menu.png` });
  await page.evaluate(() => {
    const g = window.__game;
    window.__gameHD?.scene.stop('EspelhoHD');
    g.scene.getScenes(true).filter((s) => s.scene.key !== 'Game').forEach((s) => s.scene.stop());
    g.registry.set('cartas', []); g.registry.set('tierNave', 1);
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
  });
  await page.waitForTimeout(4000);
  for (const layout of ['cartucho', 'compacto', 'lista']) {
    await page.evaluate((layout) => {
      const g = window.__game; g.registry.set('layoutCartas', layout);
      const s = g.scene.getScene('Game'); s.invulnerableUntil = s.time.now + 60000; s.scene.pause();
      s.scene.launch('Cartas', { opcoes: ['WPN_001', 'EFF_006', 'DEF_003'], titulo: 'SUPRIMENTO ENCONTRADO', onEscolha: () => {} });
    }, layout);
    await page.waitForTimeout(900);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${col}-${layout}.png` });
    await page.evaluate(() => { window.__game.scene.stop('Cartas'); });
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.scene.resume();
    s.showBanner('ALERTA · CAPITÂNIA À FRENTE', 0xffb040);
  });
  await page.waitForTimeout(250);
  await page.evaluate((f) => { window.__game.scene.getScene('Game').scene.pause(); return (0, eval)('(' + f + ')')('Game'); }, espelhar.toString());
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${col}-jogo.png` });
  await page.evaluate(() => {
    const g = window.__game;
    window.__gameHD?.scene.stop('EspelhoHD');
    g.scene.getScenes(true).forEach((s) => s.scene.stop()); g.scene.stop('Game');
    g.scene.start('GameOver', { score: 48210, handling: 'diegetico', victory: true, stage: 2, ship: 'humana' });
  });
  await page.waitForTimeout(2500);
  await page.evaluate(espelhar, 'GameOver');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${col}-fim.png` });
  console.log(col, 'menu textos espelhados:', n);
  await page.close();
}
console.log(JSON.stringify({ erros }));
await browser.close();
