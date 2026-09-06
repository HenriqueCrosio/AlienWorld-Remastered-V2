// scripts/_f3/ab-veus.mjs — descartável, não commitar.
import { chromium } from 'playwright';
import sharp from 'sharp';
const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage();
await p.setViewportSize({ width: 384, height: 216 });
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.keyboard.press('m');
await p.waitForTimeout(6000);

const tiros = [];
for (const a of [0.38, 0.26, 0.16]) {
  await p.evaluate((alpha) => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 9;
    for (const l of s.parallax.layers) {
      if (l.primeiroPlano && l.key === 'nebula3') {
        l.alpha = alpha;
        for (const sp of l.sprites) sp.setAlpha(alpha);
      }
    }
  }, a);
  await p.waitForTimeout(400);
  const f = `scripts/_f3/veu-${String(a).replace('.', '')}.png`;
  await p.screenshot({ path: f });
  tiros.push(await sharp(f).resize(768, 432, { kernel: 'nearest' }).toBuffer());
}
await b.close();
await sharp({ create: { width: 768, height: 1320, channels: 4, background: { r: 24, g: 24, b: 30, alpha: 1 } } })
  .composite(tiros.map((t, i) => ({ input: t, top: i * 440, left: 0 })))
  .png()
  .toFile('scripts/_f3/veus-ab.png');
console.log('veus-ab.png: 0.38 (hoje) / 0.26 / 0.16, de cima para baixo');
