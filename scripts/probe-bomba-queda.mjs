// A BOMBA DE QUEDA (spec 2026-10-03-bomba-de-queda-design.md): cai em parábola na atmosfera e explode no solo (ou na
// construção), é arremessada reta no vácuo e explode no pavio, detona no contato, e a de pânico volta pela chave.
// Uso: node scripts/probe-bomba-queda.mjs   (com `npm run dev` rodando)
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

/** A fase `stage` LIMPA (humana, roteiro desligado, nave intocável), com a nave parada em (80, y). */
async function fase(stage, y) {
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    // ⚠️ A INSTÂNCIA DA CENA É REAPROVEITADA: sem apagar, a espera abaixo passaria antes de a cena nova montar.
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = undefined;
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate((stage) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.scene.start('Game', { stage, ship: 'humana', handling: 'diegetico' });
  }, stage);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(400);
  await page.evaluate((y) => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    s.terrain.props.clear(true, true);
    s.invulnerableUntil = s.time.now + 1e9;
    s.ship.setPosition(80, y);
    s.ship.body.setVelocity(0, 0);
  }, y);
}
const cena = (f, arg) => page.evaluate(f, arg);
const estado = () =>
  cena(() => {
    const s = window.__game.scene.getScene('Game');
    return { bombas: s.bombs, noAr: s.bombas.quantas, pos: s.bombas.posicoes[0] ?? null, zona: s.zone };
  });

// ── 1. F1 (atmosfera): cai abaixo da nave e explode na torreta posta no chão ──
await fase(1, 110);
await cena(() => {
  const s = window.__game.scene.getScene('Game');
  s.terrain.spawn('turret');
  const t = s.terrain.props.getChildren().at(-1);
  t.setX(78);
  t.body.setVelocity(0, 0);
  window.__torreta = t;
});
await page.keyboard.press('Shift');
await page.waitForTimeout(60);
const f1a = await estado();
await page.waitForTimeout(250);
const f1b = await estado();
conferir(f1a.zona === 'atmosfera' && f1a.bombas === 2 && f1a.noAr === 1, 'F1: Shift solta UMA bomba e o estoque cai 1', f1a);
conferir(f1b.pos && f1a.pos && f1b.pos.y > f1a.pos.y + 10, 'F1: a bomba CAI (desce em parábola)', { antes: f1a.pos, depois: f1b.pos });
await page.waitForTimeout(1200);
const f1c = await estado();
const torreta = await cena(() => window.__torreta.active);
conferir(f1c.noAr === 0 && !torreta, 'F1: ela explode no chão/na torreta, e a torreta no raio é destruída', { noAr: f1c.noAr, torretaViva: torreta });

// ── 2. VÁCUO (F2): arremessada para a frente, reta, explode no pavio ──
await fase(2, 108);
await page.keyboard.press('Shift');
await page.waitForTimeout(60);
const v0 = await estado();
await page.waitForTimeout(300);
const v1 = await estado();
conferir(v0.zona === 'vacuo' && v1.pos && v0.pos && v1.pos.x > v0.pos.x + 20 && Math.abs(v1.pos.y - v0.pos.y) < 3, 'vácuo: sai para a FRENTE e segue reta', { v0: v0.pos, v1: v1.pos });
let explodiuEm = null;
for (let t = 360; t < 2500; t += 50) {
  await page.waitForTimeout(50);
  if ((await estado()).noAr === 0) {
    explodiuEm = t;
    break;
  }
}
conferir(explodiuEm !== null && explodiuEm >= 1200 && explodiuEm <= 1900, 'vácuo: explode no PAVIO (~1,5s)', explodiuEm);

// ── 3. CONTATO: um drone no caminho detona antes do pavio ──
await fase(2, 108);
await cena(() => {
  const s = window.__game.scene.getScene('Game');
  s.enemies.spawn('drone', 108, 140);
  const d = s.enemies.enemies.getChildren().at(-1);
  d.setPosition(140, 108);
  d.body.setVelocity(0, 0);
  d.setData('baseY', 108);
  window.__drone = d;
});
await page.keyboard.press('Shift');
await page.waitForTimeout(700);
const contato = await cena(() => ({ noAr: window.__game.scene.getScene('Game').bombas.quantas, drone: window.__drone.active }));
conferir(contato.noAr === 0 && !contato.drone, 'contato: o drone no caminho detona a bomba (antes do pavio) e morre', contato);

// ── 4. A DE PÂNICO volta pela chave ──
await fase(2, 108);
await cena(() => {
  window.__game.scene.getScene('Game').bombaModo = 'panico';
});
await page.keyboard.press('Shift');
await page.waitForTimeout(100);
const panico = await cena(() => {
  const s = window.__game.scene.getScene('Game');
  return { noAr: s.bombas.quantas, bombas: s.bombs };
});
conferir(panico.noAr === 0 && panico.bombas === 2, "bombaModo = 'panico': a bomba antiga (nada no ar, o estoque cai)", panico);

conferir(erros.length === 0, 'nenhum erro no console', erros);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
await browser.close();
process.exit(falhas.length ? 1 : 0);
