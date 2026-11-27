// 26/11 — WHERE DO THE CANHÃO'S SHOTS GO in the Beast's phase 1? Counts, per state of hers, the scene's
// `bulletHitBoss` (a hit), `bulletAbsorvedByBoss` (the body took it) and her `damage` calls with what they returned.
//   node scripts/_rebalance/robo/_ver-besta1-tiros.mjs [mao=mediana] [s=40]
import { chromium } from 'playwright';
import { instalarCanhao } from './comum.mjs';

const [mao = 'mediana', segs = '40'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
await page.goto(`http://localhost:5173/?fase=besta1&mao=${mao}&registro`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  return g.isActive('Game') && sc?.boss?.predador && sc.boss.devFaseAtual === 'besta1' && sc.boss.predador.estado !== 'surgindo';
}, null, { timeout: 240000, polling: 100 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  window.__c = {};
  const conta = (k) => { const e = p.estado; window.__c[e] ??= {}; window.__c[e][k] = (window.__c[e][k] ?? 0) + 1; };
  const hit = sc.bulletHitBoss.bind(sc);
  sc.bulletHitBoss = (...a) => { conta('hit'); return hit(...a); };
  const abs = sc.bulletAbsorvedByBoss.bind(sc);
  sc.bulletAbsorvedByBoss = (...a) => { conta('absorvido'); return abs(...a); };
  const dmg = p.damage.bind(p);
  p.damage = (n) => { const r = dmg(n); conta(r ? 'dano-mata' : 'dano'); window.__c[p.estado].hpAntes ??= p.hp; return r; };
  const dano = sc.medidas.dano.bind(sc.medidas);
  sc.medidas.dano = (f, d) => { conta('medido:' + f + ':' + d); return dano(f, d); };
});
await instalarCanhao(page);
await page.keyboard.down('Space');
await page.waitForTimeout(Number(segs) * 1000);
console.log(JSON.stringify(await page.evaluate(() => window.__c), null, 1));
await browser.close();
