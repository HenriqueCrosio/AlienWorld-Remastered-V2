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
while ((await t()) < 64) { await page.waitForTimeout(500); await respirar(); }
// espera um respiradouro ENTRAR no miolo da tela, e congela
let info = null;
for (let i = 0; i < 60; i++) {
  info = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const p = s.terrain.props.getChildren().filter(o => o.active && o.getData('kind') === 'respiradouro');
    const alvo = p.find(o => o.x > 90 && o.x < 300);
    if (!alvo) return null;
    window.__game.scene.pause('Game');
    return { x: Math.round(alvo.x), y: Math.round(alvo.y), tex: alvo.texture.key,
             topo: Math.round(alvo.y - alvo.displayHeight), alt: Math.round(alvo.displayHeight), depth: alvo.depth };
  });
  if (info) break;
  await page.waitForTimeout(200); await respirar();
}
console.log('respiradouro ' + JSON.stringify(info));
const buf = await page.screenshot();
await sharp(buf).resize(384*5, 216*5, { kernel: 'nearest' }).toFile('scripts/_f3/resp-cena.png');
// recorte em volta dele, 8x
const cx = Math.max(0, Math.min(384-110, info.x - 55));
await sharp(buf).extract({ left: cx, top: 120, width: 110, height: 96 })
  .resize(110*8, 96*8, { kernel: 'nearest' }).toFile('scripts/_f3/resp-zoom.png');
console.log('crista do casco y=150 · pe do prop y=' + info.y + ' · topo do prop y=' + info.topo);
console.log('sobreposicao com a faixa: ' + (info.y - 150) + 'px de ' + info.alt + ' (' + Math.round((info.y-150)/info.alt*100) + '%)');
console.log('coroa acima da crista: ' + (150 - info.topo) + 'px');
await browser.close();
