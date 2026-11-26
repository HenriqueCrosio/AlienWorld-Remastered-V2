// 25/11: lets the new Beast fight on her own (the ship invulnerable, drifting up and down) and logs every state change
// with the clip, for N seconds — to catch errors and stuck states the forced scenes do not show.
//   node scripts/_f4/_besta-solta.mjs <fase: besta1|besta2|besta3> <seconds>
import { chromium } from 'playwright';
const [fase, seg] = [process.argv[2] ?? 'besta2', Number(process.argv[3] ?? 40)];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
await page.goto(`http://localhost:5173/?fase=${fase}&mao=nenhuma`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene; if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game'); if (!g.isActive('Game') || !sc?.boss) return false;
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER; sc.damageShip = () => {};
  return !!sc.boss.predador && sc.boss.predador.estado !== 'surgindo';
}, null, { timeout: 240000, polling: 100 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  window.__log = [];
  let ant = '';
  const t0 = sc.time.now;
  sc.events.on('postupdate', () => {
    const p = sc.boss?.predador; if (!p) return;
    sc.ship.setPosition(70, 108 + Math.sin((sc.time.now - t0) / 900) * 60);
    const k = `${p.estado}|${sc.boss.sprite.anims.currentAnim?.key ?? ''}|${sc.boss.sprite.texture.key}`;
    if (k !== ant) { window.__log.push([Math.round(sc.time.now - t0), p.estado, sc.boss.sprite.anims.currentAnim?.key, sc.boss.sprite.texture.key, Math.round(sc.boss.sprite.x), Math.round(sc.boss.sprite.y), p.fase, p.breu]); ant = k; }
  });
});
await page.waitForTimeout(seg * 1000);
const log = await page.evaluate(() => window.__log);
for (const l of log) console.log(l.join(' '));
console.log('erros', JSON.stringify(erros.slice(0, 10)));
await browser.close();
