// Um quadro da cena, de um browser LIMPO (sem cache), no instante pedido.
//   node scripts/_cut3/_ver-agora.mjs [ms]
import { chromium } from 'playwright';
import sharp from 'sharp';

const MS = Number(process.argv[2] ?? 3000);
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__game.scene.stop('Menu');
  window.__game.scene.start('Interlude3', { score: 4200, handling: 'diegetico', ship: 'arauto' });
});
await page.waitForTimeout(MS);
await sharp(await page.screenshot()).png().toFile('scripts/_cut3/_agora.png');
console.log(`scripts/_cut3/_agora.png — t=${MS}ms, browser limpo`);
await browser.close();
