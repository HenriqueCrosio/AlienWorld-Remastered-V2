// 25/11 — HOW OFTEN CAN THE BEAST BE HIT? (him: "vi que em poucas vezes consegui dar dano na besta durante o escuro, é
// algo do localhost de teste ou não?"). In the running game, phase 1 (`besta1`) and the dark (`besta3`), unattended for
// `S` seconds: the ship, invulnerable, follows the CORE's height at x = 40 holding the trigger. Counts the time her core
// can be hit (its body on, she on screen), the shots that land on the core, and the shots absorbed by her body.
//   node scripts/_f4/_besta-exposta.mjs [S=60]
import { chromium } from 'playwright';

const S = Number(process.argv[2] ?? 60);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function medir(fase) {
  const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.goto(`http://localhost:5173/?fase=${fase}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const g = window.__game?.scene;
    if (!g) return false;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const sc = g.getScene('Game');
    if (!g.isActive('Game') || !sc?.boss?.predador) return false;
    sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    sc.damageShip = () => {};
    return true;
  }, null, { timeout: 240000, polling: 100 });
  await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss.predador; return p.estado === 'chao' && (!p.constructor || true); }, null, { timeout: 90000, polling: 50 });
  if (fase === 'besta3') await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.breu, null, { timeout: 30000, polling: 50 });
  await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    window.__m = { t: 0, exposta: 0, core: 0, casco: 0, estados: {} };
    const hit = sc.bulletHitBoss.bind(sc);
    sc.bulletHitBoss = (...a) => { window.__m.core++; return hit(...a); };
    const abs = sc.bulletAbsorvedByBoss.bind(sc);
    sc.bulletAbsorvedByBoss = (...a) => { window.__m.casco++; return abs(...a); };
    // never let her die: the measure is the exposure, not the kill
    sc.events.on('postupdate', (_t, dt) => {
      const m = window.__m;
      if (p.hp < 40) p.hp = 40;
      m.t += dt / 1000;
      const on = sc.boss.core.body?.enable && sc.boss.sprite.visible;
      if (on) m.exposta += dt / 1000;
      m.estados[p.estado] = (m.estados[p.estado] ?? 0) + dt / 1000;
      const y = Math.min(200, Math.max(14, sc.boss.core.y));
      sc.ship.setPosition(40, y);
      sc.ship.body?.reset(40, y);
    });
  });
  await page.keyboard.down('Space');
  await page.waitForTimeout(S * 1000);
  await page.keyboard.up('Space');
  const m = await page.evaluate(() => window.__m);
  await page.close();
  const top = Object.entries(m.estados).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${Math.round((v / m.t) * 100)}%`).join(' · ');
  console.log(`${fase}: ${m.t.toFixed(0)} s · o core atingível ${Math.round((m.exposta / m.t) * 100)} % do tempo · tiros no core ${m.core} (${(m.core / m.t).toFixed(1)}/s) · absorvidos no corpo ${m.casco}`);
  console.log(`   onde o tempo vai: ${top}`);
  if (erros.length) console.log('   erros:', erros.slice(0, 3));
}

await medir('besta1');
await medir('besta3');
await browser.close();
