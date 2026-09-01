// A CUTSCENE 3 como ela está HOJE — 16 quadros ao longo da cena inteira, para olhar antes de
// desenhar qualquer coisa. Ponto de partida da Fatia 6.
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__game.scene.stop('Menu');
  window.__game.scene.start('Interlude3', { score: 4200, handling: 'diegetico', naveId: 'arauto' });
});

const shots = [];
for (let i = 0; i < 16; i++) {
  await page.waitForTimeout(600);
  shots.push(await page.screenshot());
}
const comps = [];
for (let i = 0; i < shots.length; i++) {
  comps.push({
    input: await sharp(shots[i]).resize(320, 180).toBuffer(),
    left: (i % 4) * 320,
    top: Math.floor(i / 4) * 180,
  });
}
await sharp({ create: { width: 1280, height: 720, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
  .composite(comps).png().toFile('scripts/_cut3/cena-hoje.png');
console.log('scripts/_cut3/cena-hoje.png — 16 quadros, 600ms cada (t=0 a ~9,6s)');
await browser.close();
