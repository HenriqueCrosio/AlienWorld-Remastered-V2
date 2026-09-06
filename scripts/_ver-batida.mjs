// Fotografa a BATIDA quadro a quadro durante a espera, para julgar o movimento e o tamanho.
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
await page.waitForTimeout(3000);

const t = () => page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.lives = 9; return s.elapsed ?? 0; });
while ((await t()) < 43.5) await page.waitForTimeout(600);

const tiros = [];
for (let i = 0; i < 6; i++) {
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const r = s.children.list.find((o) => o.texture && o.texture.key === 'raboLeviata');
    return r ? { ang: Number(r.angle.toFixed(1)), x: Math.round(r.x), y: Math.round(r.y) } : null;
  });
  console.log(`quadro ${i}: ${JSON.stringify(info)}`);
  tiros.push(await page.screenshot());
  await page.waitForTimeout(420);
}
await browser.close();

const comp = tiros.map((b, i) => ({ input: b, left: (i % 3) * 384, top: Math.floor(i / 3) * 216 }));
await sharp({ create: { width: 1152, height: 432, channels: 4, background: { r: 8, g: 10, b: 18, alpha: 255 } } })
  .composite(comp).png().toBuffer()
  .then((b) => sharp(b).resize(2304, 864, { kernel: 'nearest' }).toFile('scripts/_f3/batida.png'));
console.log('batida.png pronto');
