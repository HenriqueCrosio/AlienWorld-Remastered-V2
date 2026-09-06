// A VIDA DE CADA MISSIL do lanca-misseis: onde nasce, quanto vive, e QUEM o absorve.
// O Henrique: "o primeiro canhao esta soltando o missel e explodindo antes de tudo".
import { chromium } from 'playwright';
const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
for (let i=0;i<60;i++){ if (await page.evaluate(()=>!!(window.__game?.scene.getScene('Game')?.terrain))) break; await page.waitForTimeout(250); }

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__m = [];
  const oFire = s.terrain.fireAt.bind(s.terrain);
  s.terrain.fireAt = (p, alvo) => {
    const r = oFire(p, alvo);
    const b = s.enemies.enemyBullets.getChildren().find((o) => o.active && o.getData('missile') === true && !o.getData('__m'));
    if (b) {
      if (!p.__uid) p.__uid = 'p' + Math.round(Math.random()*9999);
      const reg = { dono: p.__uid, propX: Math.round(p.x), propY: Math.round(p.y), bx: Math.round(b.x), by: Math.round(b.y),
                    nasceu: performance.now(), morreu: null, morteX: null, por: null, dist: null };
      b.setData('__m', reg);
      window.__m.push(reg);
    }
    return r;
  };
  // quem absorve: envelopa o handler do cenario
  const oCover = s.enemyBulletHitCover.bind(s);
  s.enemyBulletHitCover = (bullet, cover) => {
    const reg = bullet.getData('__m');
    if (reg && reg.morreu !== null) return oCover(bullet, cover);
    const antes = bullet.active;
    const r = oCover(bullet, cover);
    if (reg && antes && !bullet.active) {
      reg.morreu = performance.now(); reg.morteX = Math.round(bullet.x);
      if (!cover.__uid) cover.__uid = 'p' + Math.round(Math.random()*9999);
      reg.por = cover.getData('kind') + '/' + cover.__uid + (cover.__uid === reg.dono ? ' ← O PROPRIO DONO' : ' (outro)');
      reg.dist = Math.round(Math.hypot(bullet.x - reg.bx, bullet.y - reg.by));
    }
    return r;
  };
});

const viva = () => page.evaluate(() => { const s=window.__game.scene.getScene('Game'); if(!s||!s.scene.isActive()) return null; s.lives=9; return Number((s.elapsed??0).toFixed(1)); });
let t=0; while ((t = await viva()) !== null && t < 84) await page.waitForTimeout(500);
const m = await page.evaluate(() => window.__m.map((r) => ({
  dono: r.dono, prop: r.propX + ',' + r.propY, nasceu_em: r.bx + ',' + r.by,
  vida_ms: r.morreu ? Math.round(r.morreu - r.nasceu) : null,
  andou_px: r.dist, absorvido_por: r.por,
})));
console.table(m);
const cedo = m.filter((r) => r.vida_ms !== null && r.vida_ms < 400);
console.log('misseis: ' + m.length + '  |  absorvidos pelo cenario: ' + m.filter(r=>r.absorvido_por).length + '  |  em menos de 400ms: ' + cedo.length);
await browser.close();
