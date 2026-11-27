// 26/11 — WHY DOES THE BEAST'S PHASE 1 TAKE SO LONG FOR THE CANHÃO? `?fase=besta1`, the canhão's controller, the fire
// held; every second her state, life, the lock, the thirst, the core's body, the ship; a photo every 4 s.
//   node scripts/_rebalance/robo/_ver-besta1.mjs <outDir> [mao=mediana] [s=60]
import fs from 'node:fs';
import { chromium } from 'playwright';
import { instalarCanhao } from './comum.mjs';

const [out, mao = 'mediana', segs = '60'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
await page.goto(`http://localhost:5173/?fase=besta1&mao=${mao}&registro`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  return g.isActive('Game') && sc?.boss?.predador && sc.boss.devFaseAtual === 'besta1';
}, null, { timeout: 240000, polling: 100 });
await instalarCanhao(page);
await page.keyboard.down('Space');
const linhas = [];
for (let i = 0; i < Number(segs); i++) {
  const l = await page.evaluate(() => {
    const g = window.__game.scene;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const sc = g.getScene('Game');
    const p = sc.boss?.predador;
    if (!p) return null;
    const c = sc.boss.core;
    return {
      t: +(sc.time.now / 1000).toFixed(1),
      est: p.estado,
      hp: +p.hp.toFixed(1),
      vistas: [...p.vistas].join('+'),
      sede: p.sedeAberta,
      rec: p.recuperando,
      core: c.body.enable ? `${Math.round(c.x)},${Math.round(c.y)}` : 'off',
      vis: sc.boss.sprite.visible,
      nave: `${Math.round(sc.ship.x)},${Math.round(sc.ship.y)}`,
    };
  });
  if (!l) break;
  linhas.push(l);
  console.log(JSON.stringify(l));
  if (i % 4 === 0) await page.screenshot({ path: `${out}/t${String(i).padStart(3, '0')}.png` });
  await page.waitForTimeout(1000);
}
fs.writeFileSync(`${out}/linhas.json`, JSON.stringify(linhas));
await browser.close();
