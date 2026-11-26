// 25/11, the Beast step 4: films the NEW Beast in the running game (npm run dev, 5173), scene by scene, forcing each
// move: the surge (the Guardian dies → urro → pulo → vira), lava, golpe (carga → quatro → galope → golpe), the ceiling
// (agarra, the hand-over-hand walk, the lava of hand 1 and hand 2, solta), the return (sair → aviso → galope → rasgo
// → levanta) and the death. With `--caixas` it draws the body box (green = casca, red = inteiro) and the core (cyan)
// from the per-frame table. The ship is made invulnerable and parked; nothing is edited in src.
//   node scripts/_f4/_ver-besta-nova.mjs <out dir> [--caixas] [scene...]
// Writes <out>/<scene>/<n>.png + <out>/<scene>/tempos.json (ms since the scene start, the state, the clip, the frame).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const OUT = args[0];
const CAIXAS = args.includes('--caixas');
const SO = args.slice(1).filter((a) => !a.startsWith('--'));
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
await page.goto('http://localhost:5173/?fase=besta1&mao=nenhuma', { waitUntil: 'domcontentloaded' });

// the fight is running and the Guardian is about to swap: park the ship, make it invulnerable
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  if (!g.isActive('Game') || !sc?.boss) return false;
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  sc.damageShip = () => {};
  return true;
}, null, { timeout: 240000, polling: 100 });

await page.evaluate((caixas) => {
  const sc = window.__game.scene.getScene('Game');
  window.__fixar = () => { sc.ship.setPosition(60, 108); if (sc.ship.body) sc.ship.body.setVelocity(0, 0); };
  sc.events.on('postupdate', () => window.__fixar());
  if (!caixas) return;
  const g = sc.add.graphics().setDepth(999);
  sc.events.on('postupdate', () => {
    g.clear();
    const b = sc.boss?.sprite?.body;
    const p = sc.boss?.predador;
    if (!b || !p || !b.enable) return;
    g.lineStyle(1, p.modoCorpo === 'inteiro' ? 0xff4040 : 0x40ff70, 1).strokeRect(b.x, b.y, b.width, b.height);
    const c = sc.boss.core.body;
    if (c?.enable) g.lineStyle(1, 0x40ffff, 1).strokeRect(c.x, c.y, c.width, c.height);
  });
}, CAIXAS);

const estado = () => page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss?.predador;
  const s = sc.boss?.sprite;
  return p ? { e: p.estado, k: s.anims.currentAnim?.key ?? s.texture.key, q: s.frame.name, x: Math.round(s.x), y: Math.round(s.y), mao: p.mao, hp: p.hp } : null;
});

async function filmar(nome, ms, antes) {
  if (SO.length && !SO.includes(nome)) { if (antes) await page.evaluate(antes); return; }
  const dir = path.join(OUT, nome);
  fs.mkdirSync(dir, { recursive: true });
  if (antes) await page.evaluate(antes);
  const t0 = Date.now();
  const tempos = [];
  let n = 0;
  while (Date.now() - t0 < ms) {
    await page.screenshot({ path: path.join(dir, `${n}.png`) });
    tempos.push({ t: Date.now() - t0, ...(await estado()) });
    n++;
  }
  fs.writeFileSync(path.join(dir, 'tempos.json'), JSON.stringify(tempos));
  console.log(nome, n, 'quadros', JSON.stringify(tempos.at(-1)));
}

// wait for her to be parked (floor or ceiling), then freeze her choice so the next scene is ours
async function parada(lado) {
  await page.waitForFunction((lado) => {
    const p = window.__game.scene.getScene('Game').boss?.predador;
    return p && p.estado === lado;
  }, lado, { timeout: 30000, polling: 50 });
  await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.estadoT = 999; });
}

// 1. the surge: from the swap to her first idle
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss?.forma === 'guardiao', null, { timeout: 30000 });
await page.waitForFunction(() => !!window.__game.scene.getScene('Game').boss?.predador, null, { timeout: 30000, polling: 20 });
await filmar('surge', 3400);
await parada('chao');
await filmar('lava', 2600, () => window.__game.scene.getScene('Game').boss.predador.telegrafarLava());
await parada('chao');
// step 5: the whole thirst, from her side pose to her side pose (turn, open, the ring, close, the jolt, turn back)
await filmar('sede', 6000, () => window.__game.scene.getScene('Game').boss.predador.sede());
await parada('chao');
await filmar('golpe', 3600, () => window.__game.scene.getScene('Game').boss.predador.carregar());
await parada('chao');
const P = 'window.__game.scene.getScene("Game").boss.predador';
await filmar('agarra', 1300, new Function(`const p=${P}; p.irPara(p.constructor.ANCORAS[2]);`));
await parada('teto');
// the walk: 322 (hand 1) -> 210 arrives on hand 2 (a cycle and a half), so the next lava is the OTHER hand's
await filmar('teto-anda', 2400, new Function(`const p=${P}; p.irPara(p.constructor.ANCORAS[3]);`));
await parada('teto');
await filmar('teto-lava-2', 2600, new Function(`const p=${P}; p.telegrafarLava();`));
await parada('teto');
await filmar('teto-volta', 2400, new Function(`const p=${P}; p.irPara(p.constructor.ANCORAS[2]);`));
await parada('teto');
await filmar('teto-lava-1', 1700, new Function(`const p=${P}; p.telegrafarLava();`));
await parada('teto');
await page.evaluate(new Function(`const p=${P}; p.irPara(p.constructor.ANCORAS[3]);`));
await parada('teto');
// letting go from hand 2: one swap first, then the grab backwards
await filmar('solta', 2000, new Function(`const p=${P}; p.irPara(p.constructor.ANCORAS[0]);`));
await parada('chao');
// step 6: the return along the walls (floor → left wall → ceiling → right wall → the rip)
await filmar('volta', 8500, new Function(`const p=${P}; p.volta();`));
await parada('chao');
await filmar('salto-tras', 1200, new Function(`const p=${P}; p.mover(200, p.sprite.y); p.irPara(p.constructor.ANCORAS[0]);`));
await parada('chao');
await filmar('morte', 2200, new Function(`const p=${P}; window.__game.scene.getScene('Game').boss.damage(9999);`));
console.log('erros', JSON.stringify(erros.slice(0, 10)));
await browser.close();
