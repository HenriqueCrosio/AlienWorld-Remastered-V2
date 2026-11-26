// 26/11 — THE STOPPED HEART PLAYED LIKE A PERSON (him: "até entender que você precisa passar por eles, o jogador já tomou o
// dano... muitas vezes, além de não dar tempo de passar, o vão aberto não é suficiente para passar a nave direito").
// `?fase=besta3`, the heart forced from several usual spots of the ship. The ship does nothing during the throw; at the
// freeze it waits a REACTION (0.8 s), then flies at 110 px/s along a path planned on the real lit bodies (its hull box +
// 3 px each side) to the pocket in front of her, and holds there through the resume. Hits counted by moment; photos at
// each step.
//   node scripts/_f4/_besta-coracao-humano.mjs [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';

const out = process.argv[2];
if (out) fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${info !== undefined ? ` → ${JSON.stringify(info)}` : ''}`);
  if (!ok) falhas.push(nome);
};
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
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss.predador; return p.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  window.__alvo = { x: 60, y: 110 };
  window.__off = null;
  sc.events.on('postupdate', () => {
    const o = window.__off ?? { x: 0, y: 0 };
    sc.ship.setPosition(window.__alvo.x - o.x, window.__alvo.y - o.y);
    sc.ship.body.setVelocity(0, 0);
  });
});
await page.waitForTimeout(400);
await page.evaluate(() => { const sc = window.__game.scene.getScene('Game'); const nb = sc.ship.body; window.__off = { x: nb.x + nb.width / 2 - sc.ship.x, y: nb.y + nb.height / 2 - sc.ship.y }; });

const INICIOS = [[60, 110], [90, 60], [120, 160], [45, 40], [150, 100], [70, 135]];
let n = 0;
for (const [x0, y0] of INICIOS) {
  n++;
  await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss.predador; return ['chao', 'recupera'].includes(p.estado); }, null, { timeout: 60000, polling: 50 });
  await page.evaluate(([x0, y0]) => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    for (const l of p.lavas) if (l.b.active) { l.b.setData('lava', false); sc.enemies.release(l.b); }
    window.__alvo = { x: x0, y: y0 };
    window.__m = { fase: 'lanca', hits: { lanca: 0, parado: 0, volta: 0 }, t0: sc.time.now };
    sc.damageShip = () => { window.__m.hits[window.__m.fase]++; };
    p.recuperando = false;
    p.coracao();
  }, [x0, y0]);
  const foto = async (nome) => { if (out) await page.screenshot({ path: `${out}/c${n}-${nome}.png` }); };
  await page.waitForFunction(() => window.__game.scene.getScene('Game').time.now - window.__m.t0 > 500, null, { polling: 20 });
  await foto('0-lanca');
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.congelado, null, { timeout: 15000, polling: 10 });
  await page.evaluate(() => { window.__m.fase = 'parado'; window.__m.tc = window.__game.scene.getScene('Game').time.now; });
  await foto('1-congela');
  const tc = (s) => page.waitForFunction((s) => window.__game.scene.getScene("Game").time.now - window.__m.tc >= s * 1000, s, { polling: 10 });
  await page.waitForFunction(() => window.__game.scene.getScene('Game').time.now - window.__m.tc >= 650, null, { polling: 10 });
  await foto('2-rota');
  // the reaction, then the plan on the real lit bodies and the flight
  await page.waitForFunction(() => window.__game.scene.getScene('Game').time.now - window.__m.tc >= 800, null, { polling: 10 });
  const plano = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    const nb = sc.ship.body;
    const hw = nb.width / 2 + 3, hh = nb.height / 2 + 3;
    const caixas = p.lavas.filter((l) => l.b.active && l.b.body.enable).map((l) => l.b.body).map((b) => [b.left - hw, b.top - hh, b.right + hw, b.bottom + hh]);
    const C = 3, X1 = 260, Y0 = 24, Y1 = 186;
    const W = Math.ceil(X1 / C), H = Math.ceil((Y1 - Y0) / C);
    const livre = (i, j) => { const x = i * C, y = Y0 + j * C; return !caixas.some((c) => x > c[0] && x < c[2] && y > c[1] && y < c[3]); };
    const si = Math.round((nb.x + nb.width / 2) / C), sj = Math.round((nb.y + nb.height / 2 - Y0) / C);
    const prev = new Map(); const fila = [[si, sj]]; prev.set(si + ',' + sj, null);
    let fim = null;
    while (fila.length) {
      const [i, j] = fila.shift();
      if (i * C >= 222) { fim = [i, j]; break; }
      for (const [di, dj] of [[1, 0], [0, 1], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const a = i + di, b = j + dj, k = a + ',' + b;
        if (a < 2 || a >= W || b < 0 || b >= H || prev.has(k) || !livre(a, b)) continue;
        prev.set(k, [i, j]); fila.push([a, b]);
      }
    }
    if (!fim) return { ok: false, comeco: livre(si, sj) };
    const pts = []; for (let c = fim; c; c = prev.get(c[0] + ',' + c[1])) pts.unshift({ x: c[0] * C, y: Y0 + c[1] * C });
    let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    window.__pts = pts;
    return { ok: true, L: Math.round(L), s: +(L / 110).toFixed(2) };
  });
  // fly the path at 110 px/s
  await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    let k = 0;
    const passo = (_t, dt) => {
      const pts = window.__pts;
      if (!pts || k >= pts.length) return sc.events.off('update', passo);
      let d = (110 * dt) / 1000;
      while (d > 0 && k < pts.length) {
        const a = window.__alvo, q = pts[k], dx = q.x - a.x, dy = q.y - a.y, h = Math.hypot(dx, dy);
        if (h <= d) { a.x = q.x; a.y = q.y; d -= h; k++; } else { a.x += (dx / h) * d; a.y += (dy / h) * d; d = 0; }
      }
    };
    sc.events.on('update', passo);
  });
  await tc(1.6); await foto('3-voando');
  await tc(3.05); await foto('4-batida1');
  await page.waitForFunction(() => !window.__game.scene.getScene('Game').boss.predador.congelado, null, { timeout: 15000, polling: 10 });
  await page.evaluate(() => { window.__m.fase = 'volta'; window.__m.tv = window.__game.scene.getScene('Game').time.now; });
  await foto('5-volta');
  await page.waitForFunction(() => window.__game.scene.getScene('Game').time.now - window.__m.tv >= 500, null, { polling: 10 });
  await foto('6-volta-meio-s');
  await page.waitForFunction(() => window.__game.scene.getScene('Game').time.now - window.__m.tv >= 1500, null, { polling: 10 });
  const m = await page.evaluate(() => window.__m.hits);
  const nome = `início (${x0},${y0})`;
  conferir(m.lanca === 0, `${nome}: o lançamento não fere (o campo só se forma)`, m);
  conferir(plano.ok, `${nome}: há caminho entre as acesas até o bolso (caixa da nave + 3 px)`, plano);
  conferir(plano.ok && 0.8 + plano.s <= 4.5 - 0.8, `${nome}: reagindo em 0,8 s e voando a 110 px/s chega ao bolso com ≥ 0,8 s de sobra`, plano.s);
  conferir(m.parado === 0 && m.volta === 0, `${nome}: quem lê e passa não toma dano (nem parado, nem na retomada)`, m);
}
conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
