// 26/11 — LOOK at the eyes as the player sees them: for 3 appearances, photos on her beat (the peak) and between beats,
// plus the tell. `?fase=besta3`, ship parked, not invulnerable-blinking (damage swallowed instead).
//   node scripts/_f4/_besta-olhos-fotos.mjs <outDir>
import { chromium } from 'playwright';
import fs from 'node:fs';
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/?fase=besta3&mao=nenhuma', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene; if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game'); if (!g.isActive('Game') || !sc?.boss?.predador) return false;
  sc.damageShip = () => {}; return true;
}, null, { timeout: 240000, polling: 100 });
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss.predador; return p.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });
await page.evaluate(() => { const sc = window.__game.scene.getScene('Game'); sc.events.on('postupdate', () => { sc.ship.setPosition(70, 100); sc.ship.body.setVelocity(0, 0); }); });
for (let n = 1; n <= 3; n++) {
  await page.waitForFunction(() => ['chao', 'recupera'].includes(window.__game.scene.getScene('Game').boss.predador.estado), null, { timeout: 60000, polling: 50 });
  await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.recuperando = false; p.olhos(); });
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.luzesOlhos.length > 0, null, { timeout: 15000, polling: 10 });
  const P = 1.25;
  for (const [nome, t] of [['batida2', P / 4 + P], ['entre2', P / 4 + P * 1.5], ['batida3', P / 4 + 2 * P], ['entre3', P / 4 + 2.6 * P]]) {
    await page.waitForFunction((t) => window.__game.scene.getScene('Game').boss.predador.olhosT >= t, t, { timeout: 20000, polling: 5 });
    await page.screenshot({ path: `${out}/o${n}-${nome}.png` });
  }
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.olhosAvisando, null, { timeout: 20000, polling: 10 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/o${n}-aviso.png` });
}
await browser.close();
