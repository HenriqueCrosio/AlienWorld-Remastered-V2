// 25/11, the Beast's step 8: FILMS the heart stopping in the dark (`besta3`): the ship fires from the left, and in the
// freeze it crosses the frozen field to the pocket by her (still firing: the pile), so the pile leaves at the burst.
//   node scripts/_f4/_besta-coracao-filme.mjs <out dir> [--parado]   (--parado: the ship stays put, it takes the field)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2];
const PARADO = process.argv.includes('--parado');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/?fase=besta3&mao=nenhuma', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  if (!g.isActive('Game') || !sc?.boss) return false;
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  // the touches while the heart is stopped (the path through the frozen field must be clear) and after (the pocket)
  window.__toques = { gelo: 0, depois: 0 };
  sc.damageShip = () => { const p = sc.boss?.predador; if (p?.congelado) { window.__toques.gelo++; (window.__toques.onde ??= []).push([Math.round(sc.ship.x), Math.round(sc.ship.y), Math.round((sc.time.now - p.congeladoDesde) / 10) / 100]); } else if (p?.vistas?.has('coracao')) {
    window.__toques.depois++;
    if ((window.__toques.quem ??= []).length < 4) {
      const b = sc.boss.sprite.body;
      const nb = sc.ship.body;
      const tiros = sc.enemies.enemyBullets.getChildren().filter((t) => t.active && Math.abs(t.x - sc.ship.x) < 20 && Math.abs(t.y - sc.ship.y) < 14).map((t) => [t.texture.key, Math.round(t.x), Math.round(t.y)]);
      window.__toques.quem.push({ e: p.estado, k: sc.boss.sprite.anims.currentAnim?.key, nave: [nb.left, nb.top, nb.right, nb.bottom].map(Math.round), boss: b.enable ? [b.left, b.top, b.right, b.bottom].map(Math.round) : null, tiros });
    }
  } };
  return true;
}, null, { timeout: 240000, polling: 100 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  window.__nave = { x: 60, y: 108 };
  sc.events.on('preupdate', () => {
    sc.ship.setPosition(window.__nave.x, window.__nave.y);
    if (sc.ship.body) { sc.ship.body.reset(window.__nave.x, window.__nave.y); }
  });
});
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss?.predador; return p?.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  p.estadoT = 999;
  sc.weapons.equipBase();
  p.coracao();
});
await page.keyboard.down('Space');
// the path across the field during the freeze (by time since it froze)
// (at the ship's real speed, 110 px/s per axis: up into the corridor between the top and middle arcs, along it, down by her)
// (the middle arc's gap between its shards at x 54 and 90 is x 60–84: the ship crosses it centred at x≈72)
const rota = [[0, 60, 108], [0.12, 72, 108], [0.45, 72, 74], [1.55, 196, 74], [1.9, 226, 108]];
const naRota = (t) => {
  for (let i = 1; i < rota.length; i++) if (t <= rota[i][0]) { const [t0, x0, y0] = rota[i - 1]; const [t1, x1, y1] = rota[i]; const k = (t - t0) / (t1 - t0); return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]; }
  return rota.at(-1).slice(1);
};
const t0 = Date.now();
let gelou = 0;
const tempos = [];
let n = 0;
while (Date.now() - t0 < 6800) {
  const st = await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; const s = window.__game.scene.getScene('Game').boss.sprite; return { e: p.estado, cong: p.congelado, k: s.anims.currentAnim?.key ?? s.texture.key, q: s.frame.name }; });
  if (st.cong && !gelou) gelou = Date.now();
  if (gelou && !PARADO) { const [x, y] = naRota((Date.now() - gelou) / 1000); await page.evaluate(([x, y]) => { window.__nave = { x, y }; }, [x, y]); }
  await page.screenshot({ path: path.join(OUT, `${n++}.png`) });
  tempos.push({ t: Date.now() - t0, ...st });
}
await page.keyboard.up('Space');
fs.writeFileSync(path.join(OUT, 'tempos.json'), JSON.stringify(tempos));
console.log('quadros', n, 'toques', JSON.stringify(await page.evaluate(() => window.__toques)), 'erros', JSON.stringify(erros.slice(0, 5)));
await browser.close();
