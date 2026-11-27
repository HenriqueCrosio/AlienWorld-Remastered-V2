// THE ROBOTS' COMMON GROUND (spec 2026-11-26-medicao-das-lutas §4): open a boss fight with a hand and the recorder on,
// keep the card tables out of the way, read the summary, print the table.
import { chromium } from 'playwright';

/** The first dev phase of each boss fight (`src/dev/fasesDev.ts`); 'guardiao' is the F4 fight, Guardian → Beast. */
export const PRIMEIRA = { torre: 'torre1', capitania: 'capitania1', serpente: 'serpenteA', guardiao: 'guardiao1' };

export const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);

/** Opens the fight; resolves with { browser, page, erros } once the Game scene has its boss and the recorder. */
export async function abrirLuta({ porta = '5173', chefe, mao }) {
  const fase = PRIMEIRA[chefe];
  if (!fase) throw new Error(`chefe desconhecido: ${chefe} (${Object.keys(PRIMEIRA).join(', ')})`);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.goto(`http://localhost:${porta}/?fase=${fase}&mao=${mao}&registro`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const g = window.__game?.scene;
    if (!g) return false;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const sc = g.getScene('Game');
    return g.isActive('Game') && sc?.boss && window.__registro;
  }, null, { timeout: 240000, polling: 100 });
  return { browser, page, erros };
}

/** One look at the fight (and the card tables closed): { t (game s), morto, comecou }. */
export async function olhar(page) {
  return page.evaluate(() => {
    const g = window.__game.scene;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const sc = g.getScene('Game');
    return { t: sc.time.now / 1000, morto: !!sc.boss?.isDead || !sc.boss, cena: g.getScenes(true).map((s) => s.scene.key).join(',') };
  });
}

const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const pct = (n) => `${Math.round(n * 100)}%`;

/** The summary as a table, one line per phase and the whole fight. */
export function imprimir(rotulo, r) {
  console.log(`\n=== ${rotulo} ===  ${r.terminou ? 'MORTO' : 'NÃO MORREU (teto)'}  ${f1(r.s)} s  mão [${r.mao.join(' ')}]`);
  console.log('fase           s     dano  tiros acerto golpes vidas ameaças(méd/pico) área(méd/pico) respiro');
  for (const f of [...r.fases, r.total]) {
    console.log(
      `${f.fase.padEnd(12)} ${f1(f.s).padStart(6)} ${f1(f.dano).padStart(7)} ${String(f.disparos).padStart(6)} ${pct(f.acerto).padStart(6)} ${String(f.golpes).padStart(6)} ${String(f.vidas).padStart(5)}   ${f1(f.ameacasMedia).padStart(5)}/${String(f.ameacasPico).padStart(3)}      ${pct(f.areaMedia).padStart(4)}/${pct(f.areaPico).padStart(4)}   ${f1(f.respiroMax)} s`,
    );
  }
  const causas = Object.entries(r.total.porCausa).map(([k, v]) => `${k} ${v}`).join(' · ');
  if (causas) console.log(`golpes por causa: ${causas}`);
}

/** THE CANHÃO's controller (spec §4.1): invulnerable, 90 px left of the weak point, level with it, at the ship's speed. */
export async function instalarCanhao(page) {
  await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const DIST = 90;
    // the weak point: the live targets with a body (the nearest), else the left part of the boss's body
    const ponto = (b) => {
      const s = sc.ship;
      const t = (b.targets ?? []).filter((o) => o.active && o.body?.enable);
      if (t.length) {
        t.sort((a, c) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(c.x - s.x, c.y - s.y));
        return { x: t[0].x, y: t[0].y };
      }
      const c = b.sprite?.body;
      if (c && b.sprite.active && b.sprite.visible) return { x: c.left + 12, y: c.y + c.height / 2 };
      return null;
    };
    sc.events.on('postupdate', (_t, dt) => {
      sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
      const b = sc.boss;
      if (!b || b.isDead) return;
      const p = ponto(b);
      if (!p) return;
      const nb = sc.ship.body;
      const ox = nb.x + nb.width / 2 - sc.ship.x;
      const oy = nb.y + nb.height / 2 - sc.ship.y;
      const gx = Math.min(Math.max(16, p.x - DIST), Math.max(16, p.x - 30));
      const gy = Math.min(202, Math.max(14, p.y));
      const cx = sc.ship.x + ox, cy = sc.ship.y + oy;
      const dx = gx - cx, dy = gy - cy, h = Math.hypot(dx, dy);
      const passo = ((nb.maxVelocity?.x || 110) * dt) / 1000;
      const k = h > passo ? passo / h : 1;
      sc.ship.setPosition(sc.ship.x + dx * k, sc.ship.y + dy * k);
      nb.setVelocity(0, 0);
    });
  });
}
