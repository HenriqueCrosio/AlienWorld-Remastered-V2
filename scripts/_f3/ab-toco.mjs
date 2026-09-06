// A/B do TOCO contra o CASCO: onde o rabo tem que parar para o toco encostar no chão.
//
// ⚠️ CONGELA A CENA antes de trocar a pose (a regra da casa: A/B sem congelar não é A/B), e
// depois busca a cena por CHAVE — `getScenes(true)` devolve vazio com tudo pausado.
import { chromium } from 'playwright';
import sharp from 'sharp';

const CANDIDATOS = [
  // [rótulo, x do pivô, y do pivô, ângulo]
  ['atual-368-200', 368, 200, -38],
  ['b-372-214', 372, 214, -38],
  ['c-376-226', 376, 226, -38],
  ['d-380-238', 380, 238, -38],
  ['e-376-226-a44', 376, 226, -44],
];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.keyboard.press('m');

const t = () => page.evaluate(() => window.__game.scene.getScene('Game').elapsed ?? 0);
while ((await t()) < 51) {
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.lives = 9; });
  await page.waitForTimeout(900);
}

await page.evaluate(() => window.__game.scene.getScene('Game').scene.pause());

const tiros = [];
for (const [rot, x, y, ang] of CANDIDATOS) {
  await page.evaluate(([x, y, ang]) => {
    const s = window.__game.scene.getScene('Game');
    if (window.__toco) window.__toco.destroy();
    window.__toco = s.add
      .sprite(x, y, 'raboLeviata')
      .setOrigin(0.92, 0.5)
      .setDepth(-76)
      .setScale(3.4)
      .setAngle(ang);
  }, [x, y, ang]);
  await page.waitForTimeout(120);
  const buf = await page.screenshot();
  tiros.push({ rot, buf: await sharp(buf).resize(384 * 2, 216 * 2, { kernel: 'nearest' }).toBuffer() });
  console.log(`${rot}  pivô (${x}, ${y})  ângulo ${ang}°`);
}

await sharp({ create: { width: 384 * 2, height: (216 * 2 + 6) * tiros.length, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } } })
  .composite(tiros.map((t, i) => ({ input: t.buf, left: 0, top: i * (216 * 2 + 6) })))
  .png()
  .toFile('scripts/_f3/ab-toco.png');
console.log('\nscripts/_f3/ab-toco.png — na ordem dos candidatos.');
await browser.close();
