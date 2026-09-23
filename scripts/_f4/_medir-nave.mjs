// O TAMANHO DA NAVE, medido no jogo — o número que a lasca da porta destruída tem de respeitar.
//   node scripts/_f4/_medir-nave.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const n = s.ship;
  return {
    textura: n.texture.key,
    sprite: `${Math.round(n.displayWidth)}x${Math.round(n.displayHeight)}`,
    corpo: `${Math.round(n.body.width)}x${Math.round(n.body.height)}`,
    gapDoDuto: [84, 76, 68],
  };
});
await browser.close();
console.log(JSON.stringify(r, null, 1));
const h = Number(r.corpo.split('x')[1]);
console.log(`\nA nave tem ${h}px de corpo. Os vãos do duto são 84 / 76 / 68.`);
console.log(`A fresta entre as duas lascas precisa de pelo menos ${h}px para a arte não mentir.`);
