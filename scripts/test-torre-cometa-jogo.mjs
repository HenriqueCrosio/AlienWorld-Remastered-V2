// THE TOWER'S COMET WOUNDS BY ITS BALL, AGAINST THE SHIP'S HULL, IN THE GAME (27/11, the rebalance, step 2). Him,
// playing: "eu quero o 2px no boss da fase 1 (torre), sempre me incomodou eu poder 'relar' parte da nave nas bolas de fogo
// que ela solta em leque". `?fase=torre1`, the Tower's own `shoot`:
//   1. the wounding circle sits ON the ball (rotated with the flight), in the five angles of the fan;
//   2. the ball touching the WING (outside the old 21×9 box) wounds;
//   3. the TAIL over the ship, the ball clear of the hull, does not.
//   node scripts/test-torre-cometa-jogo.mjs [porta=5173]
import { chromium } from 'playwright';

const PORTA = process.argv[2] ?? '5173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${info !== undefined ? ` → ${JSON.stringify(info)}` : ''}`);
  if (!ok) falhas.push(nome);
};
await page.goto(`http://localhost:${PORTA}/?fase=torre1&mao=nenhuma`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s?.boss && !s.boss.entering && s.stage?.id === 1;
}, null, { timeout: 240000, polling: 200 });

const r = await page.evaluate(async () => {
  const { faixasDaNave } = await import('/src/systems/colisao/colisaoPeloDesenho.ts');
  const s = window.__game.scene.getScene('Game');
  const dormir = (ms) => new Promise((res) => setTimeout(res, ms));
  const nave = s.ship;
  const boss = s.boss;
  // the Tower holds fire (only our shots), the ship holds still (no flap gravity) and is untouchable meanwhile
  boss.update = () => {};
  nave.body.moves = false;
  nave.setAngle(0);
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  const comet = (vooGraus) => {
    boss.shoot((vooGraus * Math.PI) / 180, 0);
    const k = s.enemies.enemyBullets.getChildren().filter((o) => o.active && o.getData('feresoCorpo') === true);
    const b = k[k.length - 1];
    b.body.setVelocity(0, 0);
    return b;
  };
  // ── 1. the circle on the ball ──
  const desvios = [];
  for (const voo of [140, 160, 180, 200, 220]) {
    const b = comet(voo);
    b.setPosition(250, 60);
    b.body.updateFromGameObject();
    const vx = (11.7 - b.width / 2) * b.scaleX, vy = (10.7 - b.height / 2) * b.scaleY;
    const bola = { x: b.x + vx * Math.cos(b.rotation) - vy * Math.sin(b.rotation), y: b.y + vx * Math.sin(b.rotation) + vy * Math.cos(b.rotation) };
    // (the exact circle: Arcade floors `halfWidth`/`center` — see `cascoNoCorpo`)
    desvios.push(Math.round(Math.hypot(b.body.x + b.body.width / 2 - bola.x, b.body.y + b.body.height / 2 - bola.y) * 100) / 100);
    s.enemies.release(b);
  }
  // ── 2 and 3: the ball on the wing, the tail over the ship ──
  const { faixas, caixa } = faixasDaNave(nave);
  const baixa = faixas.filter((f) => f.y1 === caixa.y1);
  const asaX = (baixa[0].x0 + baixa[baixa.length - 1].x1) / 2;
  const golpe = async (prepara) => {
    const b = comet(180);
    prepara(b);
    b.body.updateFromGameObject();
    const v0 = s.lives;
    s.invulnerableUntil = 0;
    await dormir(120);
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    const v1 = s.lives;
    if (b.active) s.enemies.release(b);
    return { perdeu: v0 - v1, caixaAntiga: null };
  };
  const R = (b0) => b0.body.width / 2;
  // the ball's centre 1.5 px under the hull's lowest strip (inside it), the old box 4.5 px under the centre
  let ra = 0, caixaAntigaToca = null;
  const asa = await golpe((b) => {
    ra = R(b);
    const vx = (11.7 - b.width / 2) * b.scaleX, vy = (10.7 - b.height / 2) * b.scaleY;
    const bx = vx * Math.cos(b.rotation) - vy * Math.sin(b.rotation), by = vx * Math.sin(b.rotation) + vy * Math.cos(b.rotation);
    const alvo = { x: asaX, y: caixa.y1 - 1.5 + ra };
    b.setPosition(alvo.x - bx, alvo.y - by);
    const nb = nave.body;
    // would the OLD circle (frame centre) against the OLD box have wounded? (the box: 21×9 on the ship's centre)
    // (the old circle = the frame centre = the sprite's position, radius 4.95)
    const qx = Math.max(nb.left, Math.min(nb.right, b.x)), qy = Math.max(nb.top, Math.min(nb.bottom, b.y));
    caixaAntigaToca = (b.x - qx) ** 2 + (b.y - qy) ** 2 < ra * ra;
  });
  // flying left, the tail is to the RIGHT of the ball: the ball just past the ship's back, the tail over the hull
  const cauda = await golpe((b) => {
    const vx = (11.7 - b.width / 2) * b.scaleX, vy = (10.7 - b.height / 2) * b.scaleY;
    const bx = vx * Math.cos(b.rotation) - vy * Math.sin(b.rotation), by = vx * Math.sin(b.rotation) + vy * Math.cos(b.rotation);
    const alvo = { x: caixa.x0 - R(b) - 2, y: nave.y };
    b.setPosition(alvo.x - bx, alvo.y - by);
  });
  return { desvios, asa, caixaAntigaToca, cauda, raio: ra };
});
conferir(r.desvios.every((d) => d < 0.6), 'o círculo que fere está em cima da bola nos 5 ângulos do leque (desvio < 0,6 px)', r.desvios);
conferir(r.asa.perdeu === 1 && r.caixaAntigaToca === false, 'a bola na asa, fora da caixa antiga, fere', r);
conferir(r.cauda.perdeu === 0, 'a cauda sobre a nave, com a bola fora do casco, não fere', r);
conferir(erros.length === 0, 'sem erro na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
