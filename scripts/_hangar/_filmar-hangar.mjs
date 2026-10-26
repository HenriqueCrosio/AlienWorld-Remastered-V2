// 25/10 (night) — THE HANGAR filmed in the real game on a stepped clock at 30 fps, with real keys on a script: the
// entrance, the paints of the jato, the arrow to the "a", its paints, back and forth, and the take-off (engine, veil).
// Stops just before the F1. Writes <outDir>/hangar.webm and a few stills (quadro-<s>.png).
//   node scripts/_hangar/_filmar-hangar.mjs <outDir> [largura=1536]      (with `npm run dev` running)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { webm } from '../_menu/_webm.mjs';

const [OUT, LARG = '1536'] = process.argv.slice(2);
const W = Number(LARG), H = Math.round((W * 9) / 16);
const QUADROS = path.join(OUT, '_q');
fs.rmSync(QUADROS, { recursive: true, force: true });
fs.mkdirSync(QUADROS, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game;
  g.registry.set('modeloNave', 'jato');
  g.registry.set('pinturaNave', 'osso');
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.scene.start('Hangar', { handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.getScene('Hangar')?.estado?.pronto, null, { timeout: 30000 });
await page.evaluate(() => {
  window.__game.loop.sleep();
  window.__gameHD.loop.sleep();
  window.__game.scene.getScene('Hangar').estado.t = 0;
  window.__relogio = performance.now();
});
const passo = () => page.evaluate(() => {
  const dt = 1000 / 30;
  window.__relogio += dt;
  window.__game.step(window.__relogio, dt);
  window.__gameHD.step(window.__relogio, dt);
});
// The script: [second, key].
const ROTEIRO = [[3.2, 'ArrowDown'], [4.8, 'ArrowUp'], [6.2, 'ArrowRight'], [7.8, 'ArrowDown'], [9.4, 'ArrowUp'], [10.8, 'ArrowLeft'],
  [12.2, 'ArrowRight'], [13.4, 'ArrowDown'], [15, 'Enter']];
const FIM = 16.25; // the take-off ends at +1.35 s; stop before the F1
const fotos = [2.5, 5.2, 7, 8.4, 15.4, 16];
let k = 0;
for (let i = 0; i < Math.round(FIM * 30); i++) {
  const s = i / 30;
  while (k < ROTEIRO.length && ROTEIRO[k][0] <= s) {
    await page.keyboard.down(ROTEIRO[k][1]);
    await passo();
    await page.keyboard.up(ROTEIRO[k][1]);
    k++;
  }
  await passo();
  const f = path.join(QUADROS, `${String(i).padStart(5, '0')}.png`);
  await page.screenshot({ path: f });
  const foto = fotos.find((x) => Math.abs(x - s) < 1 / 60);
  if (foto !== undefined) fs.copyFileSync(f, path.join(OUT, `quadro-${String(foto).replace('.', '_')}.png`));
}
const n = await webm(QUADROS, path.join(OUT, 'hangar.webm'), 30);
fs.rmSync(QUADROS, { recursive: true, force: true });
console.log(path.join(OUT, 'hangar.webm'), n, 'quadros', erros.length ? erros : 'sem erro');
await browser.close();
