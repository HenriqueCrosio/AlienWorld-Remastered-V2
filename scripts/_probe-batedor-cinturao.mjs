// Sonda rápida: Fase 2, imortal, espera um batedor aparecer BEM DENTRO da tela e tira print.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('V');
await page.waitForTimeout(1200);

for (let i = 0; i < 60; i++) {
  await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s?.lives !== undefined) s.lives = 9;
  });
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const vivos = (g) => (g?.getChildren() ?? []).filter((o) => o.active);
    const bat = vivos(s?.enemies?.enemies).filter((e) => e.getData('kind') === 'batedor');
    return { n: bat.length, elapsed: s?.elapsed, x: bat.map((b) => Math.round(b.x)) };
  });
  console.log(JSON.stringify(info));
  if (info.n > 0 && info.x.some((x) => x > 100 && x < 280)) break;
  await page.waitForTimeout(300);
}

await page.screenshot({ path: 'probe-batedor-cinturao.png' });
await browser.close();
