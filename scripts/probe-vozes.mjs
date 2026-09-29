// PROTOTYPE (29/09): the three voices (jogo/nave/piloto) across screens, mirrored into the HD layer.
// Usage: node scripts/probe-vozes.mjs <outdir> '<json {col: query}>' 'menu,jogo,cutscene,fim,cartucho,compacto,lista'
import { chromium } from 'playwright';
const [OUT, colsJson, telasArg] = process.argv.slice(2);
const COLS = JSON.parse(colsJson);
const TELAS = new Set(telasArg.split(','));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const erros = [];
const espelhar = (key) => {
  const g = window.__game, hd = window.__gameHD;
  if (!hd) return 0;
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
  walk(g.scene.getScene(key).children.list);
  hd.scene.start('EspelhoHD', { textos: out });
  return out.length;
};
const limpar = () => {
  const g = window.__game;
  window.__gameHD?.scene.stop('EspelhoHD');
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.scene.getScenes(false).filter((s) => s.sys.isPaused()).forEach((s) => s.scene.stop());
};
for (const [col, q] of Object.entries(COLS)) {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => erros.push(col + ': ' + e.message));
  await page.goto('http://localhost:5173/' + q, { waitUntil: 'networkidle' });
  await page.waitForTimeout(7000);
  const shot = (t) => page.screenshot({ path: `${OUT}/${col}-${t}.png` });
  if (TELAS.has('menu')) { await page.evaluate(espelhar, 'Menu'); await page.waitForTimeout(300); await shot('menu'); }

  await page.evaluate(limpar);
  await page.evaluate(() => {
    const g = window.__game; g.registry.set('cartas', []); g.registry.set('tierNave', 1);
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
  });
  await page.waitForTimeout(4000);
  for (const layout of ['cartucho', 'compacto', 'lista']) {
    if (!TELAS.has(layout)) continue;
    await page.evaluate((layout) => {
      const g = window.__game; g.registry.set('layoutCartas', layout);
      const s = g.scene.getScene('Game'); s.invulnerableUntil = s.time.now + 60000; s.scene.pause();
      s.scene.launch('Cartas', { opcoes: ['WPN_001', 'EFF_006', 'DEF_003'], titulo: 'SUPRIMENTO ENCONTRADO', onEscolha: () => {} });
    }, layout);
    await page.waitForTimeout(900);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    await shot(layout);
    await page.evaluate(() => { const g = window.__game; g.scene.stop('Cartas'); g.scene.getScene('Game').scene.resume(); });
    await page.waitForTimeout(400);
  }
  if (TELAS.has('jogo')) {
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      s.invulnerableUntil = s.time.now + 60000;
      s.showBanner('ALERTA · CAPITÂNIA À FRENTE', 0xffb040);
    });
    await page.waitForTimeout(250);
    await page.evaluate((f) => { window.__game.scene.getScene('Game').scene.pause(); return (0, eval)('(' + f + ')')('Game'); }, espelhar.toString());
    await page.waitForTimeout(300);
    await shot('jogo');
  }
  if (TELAS.has('cutscene')) {
    await page.evaluate(limpar);
    await page.evaluate(() => window.__game.scene.start('Interlude', { score: 12400, handling: 'diegetico' }));
    await page.waitForTimeout(3000);
    await page.evaluate(() => (() => { const s = window.__game.scene.getScene('Interlude'); s.tweens.killTweensOf(s.banner); return s; })().aviso('CAPITÂNIA AURORA · CONVÉS DE POUSO', 0x3ee0f0));
    await page.waitForTimeout(200);
    await page.evaluate((f) => { window.__game.scene.getScene('Interlude').scene.pause(); return (0, eval)('(' + f + ')')('Interlude'); }, espelhar.toString());
    await page.waitForTimeout(300);
    await shot('cutscene');
  }
  if (TELAS.has('fim')) {
    await page.evaluate(limpar);
    await page.evaluate(() => window.__game.scene.start('GameOver', { score: 48210, handling: 'diegetico', victory: true, stage: 2, ship: 'humana' }));
    await page.waitForTimeout(2500);
    await page.evaluate(espelhar, 'GameOver');
    await page.waitForTimeout(300);
    await shot('fim');
  }
  await page.close();
}
console.log(JSON.stringify({ erros }));
await browser.close();
