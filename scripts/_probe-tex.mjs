import { chromium } from 'playwright';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
const erros = [];
page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('C');
await page.waitForTimeout(2500);
const info = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const amostra = (key) => {
    const img = s.textures.get(key).getSourceImage();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const p = ctx.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1).data;
    return { w: img.width, h: img.height, centro: [...p] };
  };
  const b = s.boss;
  return {
    estatico: amostra('capitania'),
    anim0: amostra('capitaniaAnim0'),
    fire0: amostra('capitaniaFireAnim0'),
    bossTex: b ? b.sprite.texture.key : null,
    bossFrame: b ? b.sprite.frame.name : null,
  };
});
console.log(JSON.stringify(info, null, 1));
console.log('erros console:', erros.slice(0, 10));
await browser.close();
