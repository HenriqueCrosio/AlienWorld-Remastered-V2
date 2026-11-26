// 26/11 — LOOK at the slow wall in natural phase-2 play (no forced attacks): for each wall the boss throws, photos at
// steps and the pool count, to see what the player sees. Ship invulnerable, parked, not shooting.
//   node scripts/_f4/_besta-parede-fotos.mjs <outDir> [walls=3]
import { chromium } from 'playwright';
import fs from 'node:fs';

const out = process.argv[2];
const N = Number(process.argv[3] ?? 3);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
const ATIRA = process.argv.includes('--atira');
await page.goto(`http://localhost:5173/?fase=besta2&mao=${ATIRA ? 'mediana' : 'nenhuma'}${ATIRA ? '&atira' : ''}`, { waitUntil: 'domcontentloaded' });
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
  window.__paredes = [];
  const orig = p.lancarParede.bind(p);
  p.lancarParede = () => {
    const pool = sc.enemies.enemyBullets;
    const antes = { ativos: pool.countActive(true), total: pool.getLength(), lavas: p.lavas.length };
    window.__paredes.push({ t: sc.time.now, antes, fig: p.paredeN % 3 });
    orig();
  };
  window.__falhou = 0;
  const pool = sc.enemies.enemyBullets;
  const get = pool.get.bind(pool);
  pool.get = (...a) => { const r = get(...a); if (!r) window.__falhou++; return r; };
  const ATIRA = new URLSearchParams(location.search).has('atira');
  sc.events.on('postupdate', () => {
    const y = ATIRA ? 100 + 70 * Math.sin(sc.time.now / 1300) : 100;
    sc.ship.setPosition(60, y); sc.ship.body.setVelocity(0, 0);
  });
});
if (ATIRA) await page.keyboard.down('Space');
for (let w = 0; w < N; w++) {
  await page.waitForFunction((w) => window.__paredes.length > w, w, { timeout: 180000, polling: 50 });
  for (const s of [0.5, 1.5, 2.5, 3.5, 5, 6.5]) {
    await page.waitForFunction(([w, s]) => window.__game.scene.getScene('Game').time.now - window.__paredes[w].t >= s * 1000, [w, s], { timeout: 30000, polling: 30 });
    const info = await page.evaluate(() => {
      const sc = window.__game.scene.getScene('Game');
      const p = sc.boss.predador;
      const pecas = p.lavas.filter((l) => l.b.active && l.b.getData('parede'));
      const pool = sc.enemies.enemyBullets;
      return { falhou: window.__falhou, fase: p.fase, hp: sc.boss.hp, pecas: pecas.length, visiveis: pecas.filter((l) => l.b.visible && l.b.x > 0 && l.b.x < 384 && l.b.y > 0 && l.b.y < 216).length, ativos: pool.countActive(true), total: pool.getLength(), outras: Object.entries(p.lavas.filter((l) => l.b.active && !l.b.getData('parede')).reduce((m, l) => ((m[l.tipo] = (m[l.tipo] ?? 0) + 1), m), {})).join(' '), estado: p.estado, cam: [sc.cameras.main.scrollX, sc.cameras.main.scrollY] };
    });
    console.log(`parede ${w + 1} +${s}s`, JSON.stringify(info));
    await page.screenshot({ path: `${out}/parede${w + 1}-${String(s).replace('.', '_')}.png` });
  }
  console.log('lançamento', JSON.stringify(await page.evaluate((w) => window.__paredes[w], w)));
}
console.log('erros', erros.slice(0, 5));
await browser.close();
