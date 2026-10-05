// Frames of the F2 elites in the sandbox (provisional or installed art) for a visual check.
//   node scripts/_elites/_quadros.mjs <outDir>
import fs from 'node:fs';
import { chromium } from 'playwright';

const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.addInitScript(() => {
  localStorage.setItem('alienworld.sandbox', JSON.stringify({ fase: 2, repetir: false, intervalo: 999,
    inimigos: { drone: 0, batedor: 0, canhoneira: 0, kamikaze: 0, cargueiro: 0, aguaViva: 0, aranha: 0, droneMineracao: 0, sentinela: 0 } }));
});
await page.goto('http://localhost:5173/?sandbox', { waitUntil: 'networkidle' });
await page.waitForSelector('#sandbox:not([hidden]) .no', { timeout: 30000 });
await page.click('button[data-acao="jogar"]');
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').arena, null, { timeout: 30000 });
await page.keyboard.press('Digit3');
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.ship.setPosition(50, 60);
  s.enemies.spawn('droneMineracao', 150);
  s.enemies.spawn('sentinela', 90);
});
const fase = () => page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().map((e) => `${e.getData('kind')}:${e.getData('elite')?.fase}`).join(' '));
for (const [i, ms] of [800, 900, 700, 700, 800, 900].entries()) {
  await page.waitForTimeout(ms);
  const canvas = await page.$('canvas');
  await canvas.screenshot({ path: `${out}/q${i}.png` });
  console.log(`q${i}`, await fase());
}
await browser.close();
