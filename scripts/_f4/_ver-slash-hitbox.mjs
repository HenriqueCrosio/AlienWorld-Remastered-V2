// THE BEAST'S SLASH vs. THE SHIP (24/11, him: "a garra passa pela nave" when the ship waits for the last instant of
// the charge and climbs to the top-left corner). Reaches the Predador, forces charge → bote → slash in two scenes and
// films it with the REAL arcade bodies drawn on top (red = the beast's body, yellow = her core, cyan = the ship), and
// counts the frames in which the bodies overlap.
//   A: the ship parked in the top-left corner the whole time
//   B: the ship low by the left wall when the aim is taken, then climbing to the corner during the bote
//   npm run dev, then  node scripts/_f4/_ver-slash-hitbox.mjs --saida <dir> [--porta 5173]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const saida = arg('--saida', 'scripts/_f4/_slash-hitbox');
fs.mkdirSync(saida, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
await page.waitForFunction(() => {
  const g = window.__game.scene;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering && s.boss.acao === 'flutua';
}, null, { timeout: 120000, polling: 250 });

await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  window.__hits = 0;
  s.damageShip = () => { window.__hits++; };
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  window.__step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      window.__passo.t += 1000 / 60;
      g.step(window.__passo.t, 1000 / 60);
    }
  };
  // the dev one-shot (a hit ≥ his whole life skips the lock), then let the beast surge
  s.boss.damage(s.boss.constructor.HP_GUARDIAO);
});
await page.waitForFunction(() => {
  const b = window.__game.scene.getScene('Game').boss;
  window.__step(10);
  return b.predador && b.predador.estado === 'chao';
}, null, { timeout: 180000, polling: 50 });

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const gr = s.add.graphics().setDepth(99999);
  window.__desenhar = () => {
    const p = s.boss.predador;
    gr.clear();
    const bb = p.sprite.body;
    if (bb.enable) { gr.lineStyle(1, 0xff3030, 1); gr.strokeRect(bb.x, bb.y, bb.width, bb.height); }
    const cb = p.core.body;
    if (cb.enable) { gr.lineStyle(1, 0xffe040, 1); gr.strokeRect(cb.x, cb.y, cb.width, cb.height); }
    const nb = s.ship.body;
    gr.lineStyle(1, 0x40e0ff, 1); gr.strokeRect(nb.x, nb.y, nb.width, nb.height);
  };
  window.__toca = () => {
    const p = s.boss.predador;
    const bb = p.sprite.body;
    const nb = s.ship.body;
    return bb.enable && bb.x < nb.x + nb.width && nb.x < bb.x + bb.width && bb.y < nb.y + nb.height && nb.y < bb.y + bb.height;
  };
});

async function cena(nome, inicio, depois) {
  const dir = path.join(saida, nome);
  fs.mkdirSync(dir, { recursive: true });
  const r = await page.evaluate(({ inicio }) => {
    const s = window.__game.scene.getScene('Game');
    const p = s.boss.predador;
    // back on the first ground anchor, then the charge (the slash), never the lava
    p.tween?.stop();
    p.ancora = p.constructor.ANCORAS[0];
    p.mover(p.ancora.x, p.yApoio('chao'));
    p.pousar(p.ancora);
    p.hp = p.constructor.HP; // phase 1
    s.ship.setPosition(inicio.x, inicio.y);
    s.ship.body.reset(inicio.x, inicio.y);
    window.__hits = 0;
    p.carregar();
    return { carga: p.estadoT };
  }, { inicio });
  let q = 0;
  const log = [];
  for (let i = 0; i < 60 * 3.2; i++) {
    const info = await page.evaluate(({ depois }) => {
      const s = window.__game.scene.getScene('Game');
      const p = s.boss.predador;
      // B: once the bote starts, the ship climbs to the corner at 180 px/s
      if (depois && (p.estado === 'bote' || p.estado === 'slash')) {
        const dx = depois.x - s.ship.x;
        const dy = depois.y - s.ship.y;
        const d = Math.hypot(dx, dy);
        const v = 180 / 60;
        if (d > v) s.ship.setPosition(s.ship.x + (dx / d) * v, s.ship.y + (dy / d) * v);
        else s.ship.setPosition(depois.x, depois.y);
      } else if (!depois || p.estado === 'carga') {
        // hold the ship still (the scene's input would drift it)
      }
      s.ship.body.reset(s.ship.x, s.ship.y);
      window.__step();
      window.__desenhar();
      const bb = p.sprite.body;
      return { estado: p.estado, toca: window.__toca(), hits: window.__hits, px: Math.round(p.sprite.x), py: Math.round(p.sprite.y), bx: Math.round(bb.x), by: Math.round(bb.y), bw: Math.round(bb.width), bh: Math.round(bb.height), nx: Math.round(s.ship.x), ny: Math.round(s.ship.y), quadro: p.sprite.frame.name };
    }, { depois });
    log.push(info);
    if (info.estado === 'recupera' && log.filter((l) => l.estado === 'recupera').length > 20) break;
    if ((info.estado === 'bote' || info.estado === 'slash' || (info.estado === 'carga' && i % 6 === 0)) && i % 2 === 0) {
      await page.locator('canvas').first().screenshot({ path: path.join(dir, `q${String(q++).padStart(3, '0')}.png`) });
    }
  }
  fs.writeFileSync(path.join(dir, 'log.json'), JSON.stringify(log, null, 1));
  const toques = log.filter((l) => l.toca && (l.estado === 'slash' || l.estado === 'bote')).length;
  console.log(`${nome}: carga ${r.carga.toFixed(2)} s · quadros de bote+slash ${log.filter((l) => l.estado === 'bote' || l.estado === 'slash').length} · corpos se tocando ${toques} · dano registrado ${log.at(-1).hits}`);
  const sl = log.filter((l) => l.estado === 'slash');
  if (sl.length) {
    const topo = Math.min(...sl.map((l) => l.by));
    const esq = Math.min(...sl.map((l) => l.bx));
    console.log(`   slash: o topo do corpo chega a y=${topo}, a esquerda a x=${esq}; a nave em ${sl[0].nx},${sl[0].ny} → ${sl.at(-1).nx},${sl.at(-1).ny}; o centro dele ${sl[0].px},${sl[0].py}`);
  }
}

await cena('A-canto', { x: 16, y: 16 }, null);
await cena('B-sobe', { x: 20, y: 150 }, { x: 16, y: 16 });
await cena('C-meio', { x: 40, y: 110 }, null);
console.log(erros.length ? `erros: ${erros.join(' | ')}` : 'sem erros na página');
await browser.close();
