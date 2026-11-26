// 25/11, the Beast's step 6 — THE RETURN in the running game (npm run dev, 5173): half a loop in front of the ship (his
// call: no left wall). Checks: the whole run with no error and every leg in order, from the floor and from the ceiling;
// her wounding box never leaves the screen; the core is on the whole way; a ship parked low in front of the right wall
// is struck by the BD corner attack; the phase-2 lock pulls the return and opens after its rip.
//   node scripts/_f4/_besta-volta.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${info !== undefined ? ` → ${JSON.stringify(info)}` : ''}`);
  if (!ok) falhas.push(nome);
};

await page.goto('http://localhost:5173/?fase=besta1&mao=nenhuma', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  if (!g.isActive('Game') || !sc?.boss) return false;
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  window.__golpes = [];
  sc.damageShip = () => { const t = sc.boss?.predador?.trechoAtual; window.__golpes.push(t ? t.nome : sc.boss?.predador?.estado); };
  return true;
}, null, { timeout: 240000, polling: 100 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  window.__nave = { x: 60, y: 30 };
  sc.events.on('postupdate', () => {
    sc.ship.setPosition(window.__nave.x, window.__nave.y);
    if (sc.ship.body) sc.ship.body.setVelocity(0, 0);
  });
});
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss?.predador?.estado === 'chao', null, { timeout: 60000, polling: 50 });

// the phase-2 lock: at the floor of phase 2 the next move is the return
const trava = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').boss.predador;
  p.vistas.add('sede');
  p.hp = 180 * 0.331;
  p.estadoT = 999;
  return { fase: p.fase, travada: p.travada, proxima: p.proximoAtaque() };
});
conferir(trava.fase === 2 && trava.travada && trava.proxima === 'volta', 'a trava da fase 2 puxa a volta', trava);

// the run: sample every frame from the page itself (requestAnimationFrame), the ship parked in the bottom-left corner
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  window.__nave = { x: 236, y: 120 };
  window.__amostras = [];
  // sampled at the physics step (collision time): in `update` the box size is new and its position still the last one
  const tick = () => {
    const b = sc.boss.sprite.body;
    const t = p.trechoAtual;
    window.__amostras.push({ e: p.estado, t: t?.nome ?? null, borda: t?.borda ?? null, exp: t?.exposta ?? null, core: sc.boss.core.body.enable, box: b.enable ? [b.left, b.top, b.right, b.bottom] : null, sx: sc.boss.sprite.x, q: sc.boss.sprite.frame.name, k: sc.boss.sprite.texture.key, flip: sc.boss.sprite.flipX, off: [b.offset.x, b.offset.y, b.sourceWidth ?? b.width] });
    if (!(p.estado === 'volta' || p.estado === 'rasgo' || window.__amostras.length < 5)) sc.physics.world.off('worldstep', tick);
  };
  p.volta();
  sc.physics.world.on('worldstep', tick);
});
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'recupera' || window.__game.scene.getScene('Game').boss.predador.estado === 'chao', null, { timeout: 45000, polling: 50 });
const r = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').boss.predador;
  return { amostras: window.__amostras, golpes: window.__golpes, vista: p.vistas.has('volta'), travada: p.travada };
});
const ordem = r.amostras.map((a) => a.t).filter((t, i, a) => t && t !== a[i - 1]);
console.log('legs:', ordem.join(' → '));
const esperado = ['agarra', 'troca 1', 'troca 2', 'quina CD', 'descida', 'parede', 'descida 2', 'descola', 'voo', 'pouso'];
conferir(ordem.join() === esperado.join(), 'todos os trechos, na ordem', ordem);
const fora = r.amostras.filter((a) => a.box && (a.box[0] < -2 || a.box[2] > 386 || a.box[1] < -2 || a.box[3] > 218));
const porTrecho = {};
r.amostras.forEach((a, i) => { if (fora.includes(a)) (porTrecho[a.t] ??= []).push(i - r.amostras.findIndex((b) => b.t === a.t)); });
console.log('off-screen samples by leg (index inside the leg):', JSON.stringify(porTrecho));
for (const f of fora) console.log(JSON.stringify(f));
conferir(fora.length === 0, 'a caixa que fere nunca sai da tela', fora.slice(0, 3));
const exp = r.amostras.filter((a) => a.t);
conferir(exp.length > 0 && exp.every((a) => a.core), 'o core ligado a volta inteira', exp.filter((a) => !a.core).length);
const minX = Math.min(...r.amostras.filter((a) => a.t && a.box).map((a) => a.box[0]));
conferir(minX > 60, 'nunca vai para a borda da esquerda (a caixa sempre à direita de x=60)', minX);
// (25/11, step 11: the corner strikes went — they hit the air; the slow wall's own test is _besta-parede.mjs)
conferir(r.amostras.some((a) => a.e === 'rasgo'), 'termina no rasgo', null);
conferir(r.vista && !r.travada, 'depois do rasgo a trava da fase 2 abre', { vista: r.vista, travada: r.travada });
// ── from the ceiling: hanging at the far anchor (hand 2), she walks to the corner anchor and starts at the corner ──
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'chao', null, { timeout: 45000, polling: 50 });
await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').boss.predador;
  p.estadoT = 999;
  p.irPara(p.constructor.ANCORAS[3]);
});
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'teto', null, { timeout: 45000, polling: 50 });
await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').boss.predador;
  p.estadoT = 999;
  window.__legs2 = [];
  const tick = () => {
    const t = p.trechoAtual?.nome;
    if (t && t !== window.__legs2.at(-1)) window.__legs2.push(t);
    if (p.estado !== 'recupera' && p.estado !== 'chao') requestAnimationFrame(tick);
  };
  window.__maoAntes = p.mao;
  p.volta();
  requestAnimationFrame(tick);
});
await page.waitForFunction(() => ['recupera', 'chao'].includes(window.__game.scene.getScene('Game').boss.predador.estado), null, { timeout: 45000, polling: 50 });
const doTeto = await page.evaluate(() => ({ legs: window.__legs2, mao: window.__maoAntes }));
conferir(doTeto.legs[0] === 'quina CD' && doTeto.legs.at(-1) === 'pouso', `do teto (mão ${doTeto.mao}): anda até o canto e começa na quina`, doTeto.legs);

conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
