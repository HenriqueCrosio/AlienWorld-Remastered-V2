// THE SONDA IN THE GAME (spec 2026-11-20-bloco-f-sonda-design.md). npm run dev, then node scripts/test-sonda-jogo.mjs [--porta 5174]
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const porta = process.argv.includes('--porta') ? process.argv[process.argv.indexOf('--porta') + 1] : '5173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());

/** starts stage `fase`, freezes the stage's own waves (the director's clock far away) and makes the ship untouchable */
async function fase(n) {
  await page.evaluate((f) => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: f, ship: 'interceptor' }), n);
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.ship?.active; }, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    // the stage's own script stops here (no gunship's warning mixes into the count), and so do the hazards and props
    s.director.next = s.director.script.length;
    s.hazardRate = 0;
    s.propRate = 0;
    s.waves = [];
    for (const e of [...s.enemies.enemies.getChildren()]) e.destroy();
  });
}
/** a wave of 3, 0.3 s apart, as the stage spawns them; returns nothing (read them with `sondas()`) */
const onda = () => page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  // the luck pinned while the wave is born: the DIVE, one shooter (in the dispersion the line opens on purpose)
  const sorte = Math.random;
  Math.random = () => 0.1;
  for (let i = 0; i < 3; i++) {
    s.enemies.spawn('sonda', 100);
    await new Promise((r) => setTimeout(r, 300));
  }
  Math.random = sorte;
});
/** the orbs in the air, their size on screen and whether they pop */
const bolinhas = () => page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemyBullets.getChildren()
  .filter((b) => b.active).map((b) => ({ w: b.displayWidth, destrutivel: b.getData('destrutivel') === true })));
const sondas = () => page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren()
  .filter((e) => e.active && e.getData('kind') === 'sonda').map((e) => ({ x: e.x, y: e.y, tex: e.texture.key, w: e.body.width, h: e.body.height })));
const tocados = () => page.evaluate(() => window.__som.diagnostico().tocados.length);
const desde = (n) => page.evaluate((k) => window.__som.diagnostico().tocados.slice(k), n);

// ── F2: the dark one, the path, the shot, the exit ──
await fase(2);
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.ship.setPosition(40, 200); });
let n0 = await tocados();
await onda();
const primeiras = await sondas();
ok(primeiras.length === 3 && primeiras.every((p) => p.tex.startsWith('sondaF2')), 'F2: a onda de 3 nasce com a pele ESCURA', primeiras);
ok(primeiras.every((p) => Math.abs(p.w - 16) < 0.5 && Math.abs(p.h - 14) < 0.5), 'a hitbox fixa 16×14', primeiras);
// the line: at the same x, the same y (they follow the leader's path)
const amostras = [];
const vistas = [];
for (let i = 0; i < 20; i++) { amostras.push(await sondas()); vistas.push(...(await bolinhas())); await page.waitForTimeout(150); }
const lider = amostras.map((a) => a[0]).filter(Boolean);
const ultima = amostras.map((a) => a[a.length - 1]).filter(Boolean);
const yEm = (pts, x) => { const p = pts.reduce((m, q) => (Math.abs(q.x - x) < Math.abs(m.x - x) ? q : m)); return Math.abs(p.x - x) < 6 ? p.y : null; };
const xs = [300, 250, 200];
const difs = xs.map((x) => { const a = yEm(lider, x); const b = yEm(ultima, x); return a === null || b === null ? null : Math.abs(a - b); }).filter((d) => d !== null);
// (round 3: each one sways ±4 px on her own phase, so the line is checked on the PATH itself: one for the whole wave)
const caminhos = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren()
  .filter((e) => e.active && e.getData('kind') === 'sonda').map((e) => JSON.stringify(e.getData('elite').caminho)));
ok(caminhos.length === 3 && new Set(caminhos).size === 1 && difs.length > 0, 'a fila segue o caminho da líder (o mesmo caminho, cada uma no seu balanço)', { caminhos, difs });
await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().every((e) => !e.active || e.getData('kind') !== 'sonda'), null, { timeout: 12000 }).catch(() => {});
ok((await sondas()).length === 0, 'as três saem pela esquerda', await sondas());
let t = await desde(n0);
const tiros = t.filter((x) => x === 'inimigo.tiro').length;
const avisos = t.filter((x) => x === 'inimigo.aviso').length;
ok(tiros >= 1 && tiros <= 6 && avisos === tiros, `atiram (até 3 cada, 1 ou 2 da onda), cada tiro com o aviso antes (${tiros} tiros, ${avisos} avisos)`, t);
ok(vistas.length > 0 && vistas.every((v) => v.w < 8 && v.destrutivel), 'a bolinha pequena (~5 px) e destrutível', vistas.slice(0, 3));
const animF2 = await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.enemies.spawn('sonda', 100); const e = s.enemies.enemies.getChildren().find((q) => q.active && q.getData('kind') === 'sonda'); return e.anims.currentAnim?.key ?? null; });
ok(/^sonda-f2-(voo|sobe|desce)$/.test(animF2 ?? ''), 'a escura voa com os clipes dela (o laço, ou inclinada no caminho)', animF2);
await page.evaluate(() => { for (const e of [...window.__game.scene.getScene('Game').enemies.enemies.getChildren()]) e.destroy(); });

// ── the dodge: the ship kept at her height, in front — measured as her distance from her own path ──
await page.evaluate(() => window.__game.scene.getScene('Game').enemies.spawn('sonda', 100));
const desvios = [];
for (let i = 0; i < 45; i++) {
  const d = await page.evaluate(async () => {
    const { yNoCaminho } = await import('/src/entities/sonda/regras.ts');
    const s = window.__game.scene.getScene('Game');
    const e = s.enemies.enemies.getChildren().find((q) => q.active && q.getData('kind') === 'sonda');
    if (!e) return null;
    s.ship.setPosition(60, e.y);
    const st = e.getData('elite');
    return { x: e.x, desvio: e.y - yNoCaminho(st.caminho, e.x), inicio: st.esquiva.inicio };
  });
  if (!d) break;
  desvios.push(d);
  await page.waitForTimeout(80);
}
const longe = desvios.filter((d) => Math.abs(d.desvio) > 10);
ok(longe.length > 0 && longe.every((d) => d.x <= 340), 'a nave mirando: ela dá o passo de lado, já dentro da tela', desvios.map((d) => [Math.round(d.x), Math.round(d.desvio)]));
ok(Math.abs(desvios[desvios.length - 1]?.desvio ?? 99) <= 4.5, 'e volta ao caminho, só com o balanço (uma vez só)', desvios.slice(-3));
await page.evaluate(() => { for (const e of [...window.__game.scene.getScene('Game').enemies.enemies.getChildren()]) e.destroy(); });

// ── the orb pops in the player's fire: a shot of the ship's own pool, born right in front of her orb ──
{
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.ship.setPosition(60, 150);
    const e = s.enemies.spawn('sonda', 60);
    const st = e.getData('elite');
    st.caminho = { tipo: 'diagonal', y0: 60, y1: 60 };
    st.atira = true;
  });
  await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemyBullets.getChildren()
    .some((b) => b.active && b.getData('destrutivel')), null, { timeout: 8000 }).catch(() => {});
  const n1 = await tocados();
  const lancou = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const orb = s.enemies.enemyBullets.getChildren().find((b) => b.active && b.getData('destrutivel'));
    if (!orb) return false;
    const bala = s.weapons.bullets.get(orb.x - 10, orb.y);
    if (!bala) return false;
    bala.setActive(true).setVisible(true).setTexture('bolt2').setScale(1);
    bala.body.enable = true;
    bala.body.reset(orb.x - 10, orb.y);
    bala.setVelocity(240, 0);
    return true;
  });
  await page.waitForTimeout(400);
  const t1 = await desde(n1);
  ok(lancou && t1.includes('acerto.drone'), 'o tiro da nave estoura a bolinha (o som e a onda de choque)', { lancou, t1 });
  await page.evaluate(() => { for (const e of [...window.__game.scene.getScene('Game').enemies.enemies.getChildren()]) e.destroy(); });
}

// ── the electric holds her still ── (the ship's last shots leave the screen first: they would kill her)
await page.waitForTimeout(2500);
await page.evaluate(() => window.__game.scene.getScene('Game').enemies.spawn('sonda', 100));
await page.waitForTimeout(500);
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); const e = s.enemies.enemies.getChildren().find((q) => q.getData('kind') === 'sonda'); s.enemies.travar(e, 1500); });
const p1 = (await sondas())[0];
await page.waitForTimeout(600);
const p2 = (await sondas())[0];
ok(p1 && p2 && Math.abs(p1.x - p2.x) < 1 && Math.abs(p1.y - p2.y) < 1, 'o elétrico a prende parada no ar', [p1, p2]);

// ── F3: the rust one ──
await fase(3);
await page.evaluate(() => window.__game.scene.getScene('Game').enemies.spawn('sonda', 100));
await page.waitForTimeout(200);
ok((await sondas())[0]?.tex.startsWith('sondaF3'), 'F3: a pele de FERRUGEM', await sondas());
const animF3 = await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.enemies.spawn('sonda', 100); const e = s.enemies.enemies.getChildren().find((q) => q.active && q.getData('kind') === 'sonda'); return e.anims.currentAnim?.key ?? null; });
ok(/^sonda-f3-(voo|sobe|desce)$/.test(animF3 ?? ''), 'a de ferrugem voa com os clipes dela (o laço, ou inclinada no caminho)', animF3);

// ── F1 and the batedor untouched ──
await fase(1);
await page.evaluate(() => window.__game.scene.getScene('Game').enemies.spawn('batedor', 100));
await page.waitForTimeout(200);
const bat = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().filter((e) => e.active && e.getData('kind') === 'batedor').map((e) => e.texture.key));
ok(bat.length === 1 && !bat[0].toLowerCase().includes('cinturao'), 'o batedor da F1 segue o roxo de sempre (não a pele do cinturão)', bat);

ok(erros.length === 0, 'sem erros na página', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
