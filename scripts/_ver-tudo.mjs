// Fotografa as quatro mudancas: o fundo em resolucao real, o rabo lateral se segurando na
// direita, a faixa da frente escondendo o pe dos props, e o revezamento das 4 bocas.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
await page.waitForTimeout(3000);

const est = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.lives = 9;
    const r = s.children.list.filter((o) => o.texture && String(o.texture.key).startsWith('raboLeviata'));
    const p = s.parallax;
    const pint = s.children.list.filter((o) => o.texture && o.texture.key === 'paintBgF3');
    return {
      t: Number((s.elapsed ?? 0).toFixed(1)),
      nebulaDim: Number(p.nebulaDim.toFixed(2)),
      pintura: pint[0] ? { w: pint[0].width, h: pint[0].height, y: pint[0].y } : null,
      frente: p.cascoFrente ? { y: p.cascoFrente.y, a: Number(p.cascoFrente.alpha.toFixed(2)) } : null,
      rabo: r[0] ? { x: Math.round(r[0].x), y: Math.round(r[0].y), a: Number(r[0].alpha.toFixed(2)) } : null,
    };
  });

console.log('ATO 1  ' + JSON.stringify(await est()));
await page.screenshot({ path: 'scripts/_f3/v2-ato1.png' });

// O rabo: chega em 40.5, segura ate ~47.5, mergulha ate ~51.
for (const alvo of [42.5, 45, 47.5, 50]) {
  while ((await est()).t < alvo) await page.waitForTimeout(700);
  const e = await est();
  console.log(`t=${e.t} nebulaDim=${e.nebulaDim} rabo=${JSON.stringify(e.rabo)} frente=${JSON.stringify(e.frente)}`);
  await page.screenshot({ path: `scripts/_f3/v2-rabo-${Math.round(alvo)}.png` });
}

// Ato 2 com os props e a faixa da frente.
while ((await est()).t < 68) await page.waitForTimeout(1200);
console.log('ATO 2  ' + JSON.stringify(await est()));
await page.screenshot({ path: 'scripts/_f3/v2-ato2.png' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'scripts/_f3/v2-ato2b.png' });
await browser.close();
