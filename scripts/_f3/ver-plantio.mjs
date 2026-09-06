// A/B do PLANTIO dos props de casco: os mesmos três props, plantados no fundo, no meio e na
// frente da faixa, com a cena congelada. É o único jeito de julgar o assentamento sem depender
// do sorteio — e sem confundir prop com destroço do parallax.
import { chromium } from 'playwright';
import sharp from 'sharp';
const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
const respirar = () => page.evaluate(() => { const s=window.__game.scene.getScenes(true)[0]; if(s.lives!==undefined) s.lives=9; });
const t = () => page.evaluate(() => Number((window.__game.scene.getScenes(true)[0].elapsed ?? 0).toFixed(1)));
while ((await t()) < 66) { await page.waitForTimeout(500); await respirar(); }

const info = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  // limpa o que o sorteio pôs na tela, para o A/B mostrar só o que ele está comparando
  for (const o of [...s.terrain.props.getChildren()]) o.destroy();
  const out = [];
  const plantios = [186, 192, 199];
  const xs = [70, 190, 310];
  for (let i = 0; i < 3; i++) {
    s.terrain.spawn('respiradouro');
    const p = s.terrain.props.getChildren().at(-1);
    p.setTexture('respiradouro');
    p.x = xs[i];
    p.y = plantios[i];
    p.setDepth(-0.5 - (199 - plantios[i]) * 0.002);
    const som = p.getData('sombra');
    if (som) { som.x = p.x; som.y = p.y + 1; som.setDepth(p.depth - 0.001); }
    out.push({ pe: p.y, topo: Math.round(p.y - p.displayHeight), coroa: 150 - Math.round(p.y - p.displayHeight), depth: Number(p.depth.toFixed(3)), sombra: !!som });
  }
  window.__game.scene.pause('Game');
  return out;
});
console.table(info);
const buf = await page.screenshot();
await sharp(buf).extract({ left: 0, top: 110, width: 384, height: 106 })
  .resize(384*4, 106*4, { kernel: 'nearest' }).toFile('scripts/_f3/plantio-ab.png');
console.log('scripts/_f3/plantio-ab.png  (fundo 186 | meio 192 | frente 199, x4)');
await browser.close();
