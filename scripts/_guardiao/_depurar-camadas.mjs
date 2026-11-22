// debug: where the rope layer sits among the scene's display list in the F4 boss practice
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log('ERR', String(e)));
await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
await page.waitForFunction(() => {
  const g = window.__game.scene;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s.boss && !s.boss.entering;
}, null, { timeout: 120000 });
const r = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const b = s.boss;
  const img = s.children.list.find((o) => o.texture?.key === 'guardiaoCabos');
  const tex = s.textures.get('guardiaoCabos');
  const d = tex.context.getImageData(0, 0, 384, 216).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
  const lista = s.children.list.filter((o) => o.visible !== false).map((o) => ({ k: o.texture?.key ?? o.type, d: o.depth, a: +(o.alpha ?? 1).toFixed(2), w: Math.round(o.displayWidth ?? 0) }))
    .filter((o) => o.d > -3 && o.d < 3).sort((a, c) => a.d - c.d);
  return { img: img ? { d: img.depth, vis: img.visible, a: img.alpha, x: img.x, y: img.y } : null, pixels: n, cabos: b.cabos.cabos.map((c) => ({ anc: c.ancora, max: Math.round(c.max), L: Math.round(c.corda.comprimento), raiz: c.raiz, p: c.corda.pontos().slice(-1) })), lista: lista.slice(0, 40), cams: s.cameras.cameras.length };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
