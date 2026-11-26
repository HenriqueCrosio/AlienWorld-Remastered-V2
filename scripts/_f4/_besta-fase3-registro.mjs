// 26/11 — WHAT HAPPENS in natural phase-3 play: every sound played (name, time, force), every attack, the eyes' moments,
// and photos at the eyes' steps and the heart's freeze. Ship invulnerable, drifting (not dodging on purpose).
//   node scripts/_f4/_besta-fase3-registro.mjs <outDir> [seconds=90]
import { chromium } from 'playwright';
import fs from 'node:fs';

const [out, segArg = '90'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/?fase=besta3&mao=nenhuma', { waitUntil: 'domcontentloaded' });
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
  const Som = window.__som;
  window.__log = [];
  const t0 = sc.time.now;
  const T = () => +((sc.time.now - t0) / 1000).toFixed(2);
  for (const k of ['tocar', 'laco']) {
    const f = Som[k].bind(Som);
    Som[k] = (nome, ...a) => { window.__log.push({ t: T(), k, nome, op: a[0] && typeof a[0] === 'object' ? a[0].forca : a[0] }); return f(nome, ...a); };
  }
  for (const m of ['olhos', 'acenderOlhos', 'apagarOlhos', 'coracao', 'congelar', 'descongelar', 'arremessar', 'golpear', 'agachar']) {
    if (typeof p[m] !== 'function') continue;
    const f = p[m].bind(p);
    p[m] = (...a) => { window.__log.push({ t: T(), k: 'boss', nome: m, estado: p.estado }); return f(...a); };
  }
  window.__marcos = {};
  sc.events.on('postupdate', () => {
    const y = 100 + 60 * Math.sin(sc.time.now / 1900);
    sc.ship.setPosition(70 + 25 * Math.sin(sc.time.now / 2900), y); sc.ship.body.setVelocity(0, 0);
  });
});
const fim = Date.now() + Number(segArg) * 1000 * 3;
let fotos = 0;
let ultimo = 0;
while (Date.now() < fim) {
  const r = await page.evaluate(() => { const sc = window.__game.scene.getScene('Game'); return { t: sc.time.now, log: window.__log.length, est: sc.boss.predador.estado, fase: sc.boss.predador.fase }; });
  // photo every ~0.5 s of game time while the eyes or the heart run
  if ((r.est === 'olhos' || r.est === 'coracao' || r.est === 'escuro') && r.t - ultimo > 450 && fotos < 80) {
    ultimo = r.t;
    await page.screenshot({ path: `${out}/f${String(fotos++).padStart(2, '0')}-${r.est}-${Math.round(r.t)}.png` });
  }
  const tempo = await page.evaluate(() => window.__game.scene.getScene('Game').time.now);
  if (tempo > Number(segArg) * 1000 + 20000) break;
  await page.waitForTimeout(60);
}
const log = await page.evaluate(() => window.__log);
fs.writeFileSync(`${out}/log.json`, JSON.stringify(log, null, 0));
const cont = {};
for (const l of log) if (l.k !== 'boss') cont[l.nome] = (cont[l.nome] ?? 0) + 1;
console.log(JSON.stringify(cont, null, 1));
console.log('boss', log.filter((l) => l.k === 'boss').map((l) => `${l.t}:${l.nome}`).join(' '));
console.log('erros', erros.slice(0, 5));
await browser.close();
