// 26/11 — LOOK at the lava throws in natural play (phase from argv), ship moving: for each throw, photos at steps and the
// fate of every ball (where it died: ceiling / floor / off-screen, its highest point).
//   node scripts/_f4/_besta-lava-fotos.mjs <outDir> <fase> [throws=6]
import { chromium } from 'playwright';
import fs from 'node:fs';

const [out, fase = 'besta2', nArg = '6'] = process.argv.slice(2);
const N = Number(nArg);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:5173/?fase=${fase}&mao=nenhuma`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  if (!g.isActive('Game') || !sc?.boss?.predador) return false;
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  return true;
}, null, { timeout: 240000, polling: 100 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  window.__tiros = [];
  const orig = p.arremessar.bind(p);
  p.arremessar = (t) => {
    const n0 = p.lavas.length;
    const mirado = p.lavaN % 2 === 1;
    orig(t);
    const bolas = p.lavas.slice(n0).filter((l) => l.tipo === 'bola').map((l) => ({ l, x0: Math.round(l.b.x), y0: Math.round(l.b.y), vx: Math.round(l.b.body.velocity.x), vy: Math.round(l.b.body.velocity.y), minY: l.b.y, fim: null }));
    window.__tiros.push({ t: sc.time.now, mirado, lado: p.ancora?.lado, clipe: p.clipeLava, besta: [Math.round(p.sprite.x), Math.round(p.sprite.y)], nave: [Math.round(sc.ship.x), Math.round(sc.ship.y)], bolas });
  };
  sc.events.on('postupdate', () => {
    for (const tr of window.__tiros) for (const b of tr.bolas) {
      if (b.fim) continue;
      if (b.l.b.active && b.l.b.getData('lava')) { b.minY = Math.min(b.minY, b.l.b.y); b.ult = [Math.round(b.l.b.x), Math.round(b.l.b.y)]; }
      else b.fim = { em: b.ult, vida: Math.round(sc.time.now - tr.t) };
    }
    const y = 100 + 70 * Math.sin(sc.time.now / 1700);
    sc.ship.setPosition(60 + 30 * Math.sin(sc.time.now / 2300), y); sc.ship.body.setVelocity(0, 0);
  });
});
for (let w = 0; w < N; w++) {
  await page.waitForFunction((w) => window.__tiros.length > w, w, { timeout: 180000, polling: 30 });
  for (const s of [0.15, 0.35, 0.6, 0.9, 1.3]) {
    await page.waitForFunction(([w, s]) => window.__game.scene.getScene('Game').time.now - window.__tiros[w].t >= s * 1000, [w, s], { timeout: 30000, polling: 20 });
    await page.screenshot({ path: `${out}/tiro${w + 1}-${String(s).replace('.', '_')}.png` });
  }
  await page.waitForTimeout(800);
  const r = await page.evaluate((w) => { const tr = window.__tiros[w]; return { ...tr, bolas: tr.bolas.map(({ l, ...b }) => ({ ...b, minY: Math.round(b.minY) })) }; }, w);
  console.log(`tiro ${w + 1}`, JSON.stringify(r));
}
console.log('erros', erros.slice(0, 5));
await browser.close();
