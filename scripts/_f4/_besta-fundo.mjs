// 25/11, the Beast's step 9: the arena WITHOUT her (her sprite, core light and body hidden), lit (`besta1`) and in the
// dark (`besta3`), at the game's native 384×216 — the background the recolour candidates are judged on, side by side at
// game size (memory `veredito-lado-a-lado-com-o-jogo`).
//   node scripts/_f4/_besta-fundo.mjs <out dir>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const fase of ['besta1', 'besta3']) {
  const page = await browser.newPage({ viewport: { width: 384, height: 216 } });
  await page.goto(`http://localhost:5173/?fase=${fase}&mao=nenhuma`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const g = window.__game?.scene;
    if (!g) return false;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const sc = g.getScene('Game');
    if (!g.isActive('Game') || !sc?.boss) return false;
    sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    sc.damageShip = () => {};
    return true;
  }, null, { timeout: 240000, polling: 100 });
  await page.waitForFunction((f) => { const p = window.__game.scene.getScene('Game').boss?.predador; return p && p.estado === 'chao' && (f === 'besta1' || p.breu); }, fase, { timeout: 90000, polling: 50 });
  await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    p.estadoT = 999;
    sc.ship.setPosition(-100, -100);
    sc.events.on('postupdate', () => {
      sc.boss.sprite.setVisible(false);
      p.luz.setVisible(false);
      if (p.revela) p.revela.setVisible(false);
      if (p.halo) p.halo.setVisible(false);
      sc.ship.setPosition(-100, -100);
    });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${fase}.png`) });
  await page.close();
}
await browser.close();
console.log('ok');
