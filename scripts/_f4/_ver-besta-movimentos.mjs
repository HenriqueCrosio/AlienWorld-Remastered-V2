// THE BEAST'S MOVES, one by one (24/11, the analysis of the last boss): reaches the Predador with the dev one-shot and
// films every transition and attack with the REAL bodies drawn (red = body, yellow = core, cyan = ship), one folder per
// move, a frame every 3 steps (20/s). The ship sits still at (60, 110), untouchable.
//   npm run dev, then  node scripts/_f4/_ver-besta-movimentos.mjs --saida <dir> [--porta 5173]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const saida = arg('--saida', 'scripts/_f4/_besta-movimentos');
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
  s.damageShip = () => {};
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  window.__step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      window.__passo.t += 1000 / 60;
      s.ship.setPosition(60, 110);
      s.ship.body.reset(60, 110);
      g.step(window.__passo.t, 1000 / 60);
    }
  };
  const gr = s.add.graphics().setDepth(99999);
  window.__desenhar = () => {
    gr.clear();
    const p = s.boss.predador;
    if (!p) return;
    const bb = p.sprite.body;
    if (bb.enable) { gr.lineStyle(1, 0xff3030, 1); gr.strokeRect(bb.x, bb.y, bb.width, bb.height); }
    const cb = p.core.body;
    if (cb.enable) { gr.lineStyle(1, 0xffe040, 1); gr.strokeRect(cb.x, cb.y, cb.width, cb.height); }
    const nb = s.ship.body;
    gr.lineStyle(1, 0x40e0ff, 1); gr.strokeRect(nb.x, nb.y, nb.width, nb.height);
  };
  window.__naAncora = (i) => { const p = s.boss.predador; p.tween?.stop(); p.recuperando = false; p.ancora = p.constructor.ANCORAS[i]; p.mover(p.ancora.x, p.yApoio(p.ancora.lado)); p.pousar(p.ancora); p.estadoT = 99; return p; };
  s.boss.damage(s.boss.constructor.HP_GUARDIAO);
});

async function filmar(nome, preparar, ateEstado, maxPassos = 60 * 4) {
  const dir = path.join(saida, nome);
  fs.mkdirSync(dir, { recursive: true });
  await page.evaluate(preparar);
  let q = 0;
  for (let i = 0; i < maxPassos; i++) {
    const est = await page.evaluate(() => { window.__step(); window.__desenhar(); return window.__game.scene.getScene('Game').boss.predador?.estado; });
    if (i % 3 === 0) await page.locator('canvas').first().screenshot({ path: path.join(dir, `q${String(q++).padStart(3, '0')}.png`) });
    if (i > 6 && ateEstado.includes(est)) break;
  }
  console.log(`${nome}: ${q} quadros`);
}

// the surge (from the one-shot until she lands)
await filmar('0-surge', () => {}, ['chao'], 60 * 12);

await filmar('1-lava-chao', `(() => { window.__naAncora(0); window.__game.scene.getScene('Game').boss.predador.telegrafarLava(); })()`, ['chao'], 60 * 3);
await filmar('2-chao-para-direita', `(() => { window.__naAncora(1); const p = window.__game.scene.getScene('Game').boss.predador; p.irPara(p.constructor.ANCORAS[0]); })()`, ['chao']);
await filmar('3-chao-para-teto', `(() => { window.__naAncora(0); const p = window.__game.scene.getScene('Game').boss.predador; p.irPara(p.constructor.ANCORAS[2]); })()`, ['teto']);
await filmar('4-lava-teto', `(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.estadoT = 99; p.telegrafarLava(); })()`, ['teto'], 60 * 3);
await filmar('5-teto-para-teto', `(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.irPara(p.constructor.ANCORAS[3]); })()`, ['teto']);
await filmar('6-teto-para-chao', `(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.irPara(p.constructor.ANCORAS[1]); })()`, ['chao']);
await filmar('7-sai-e-rasgo', `(() => { window.__naAncora(0); const p = window.__game.scene.getScene('Game').boss.predador; p.hp = 100; p.fasePassada = 2; p.sair(); })()`, ['chao', 'teto'], 60 * 9);
await filmar('8-breu', `(() => { window.__naAncora(0); const p = window.__game.scene.getScene('Game').boss.predador; p.hp = 50; p.estado='chao'; p.estadoT = 99; })()`, ['__nunca'], 60 * 2);
await filmar('9-slash-no-breu', `(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.tween?.stop(); p.ancora = p.constructor.ANCORAS[0]; p.mover(p.ancora.x, p.yApoio('chao')); p.pousar(p.ancora); p.carregar(); })()`, ['recupera'], 60 * 4);
console.log(erros.length ? `erros: ${erros.join(' | ')}` : 'sem erros na página');
await browser.close();
