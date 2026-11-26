// 26/11 — THE EMBERS CAN BE SHOT (his idea, his "B": visual only, the cost is the time lost on the bait). `?fase=besta3`,
// the eyes forced; the ship flies to a fake ember's height and SHOOTS for real (the fire key held) until it bursts.
// Checks: it takes the shots (no shot reaches her), bursts at 3, her life does not move, the sparks fall and go out on the
// floor's drawn edge, the true light stays lit and she still leaps. Photos at each step.
//   node scripts/_f4/_besta-olhos-brasa.mjs [outDir]
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
  sc.damageShip = () => {};
  return true;
}, null, { timeout: 240000, polling: 100 });
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss.predador; return p.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });
const foto = async (nome) => { if (out) await page.screenshot({ path: `${out}/${nome}.png` }); };

const UMA = async (n) => {
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'chao', null, { timeout: 40000, polling: 50 });
  await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    for (const l of p.lavas) if (l.b.active) { l.b.setData('lava', false); sc.enemies.release(l.b); }
    window.__alvo = { x: 40, y: 110 };
    if (!window.__preso) {
      window.__preso = true;
      sc.events.on('postupdate', () => { sc.ship.setPosition(window.__alvo.x, window.__alvo.y); sc.ship.body.setVelocity(0, 0); });
    }
    p.estadoT = 999;
    p.olhos();
  });
  await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss.predador; return p.estado === 'olhos' && p.luzesOlhos.length === 3; }, null, { timeout: 15000, polling: 30 });
  // the fake ember to shoot: one whose row the true light does not share
  const alvo = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    const v = p.luzesOlhos.find((o) => o.l.verdadeira);
    // (a shot flies right along its row: an ember behind her on her row is shielded — the shot finds her first)
    const livre = (o) => Math.abs(o.l.y - v.l.y) >= 24 || o.brilho.x < v.brilho.x;
    const f = p.luzesOlhos.filter((o) => !o.l.verdadeira && livre(o)).sort((a, b) => Math.abs(b.l.y - v.l.y) - Math.abs(a.l.y - v.l.y))[0];
    if (!f) return { atras: p.luzesOlhos.filter((o) => !o.l.verdadeira).map((o) => [Math.round(o.brilho.x), Math.round(o.l.y)]), v: [Math.round(v.brilho.x), Math.round(v.l.y)] };
    const i = p.luzesOlhos.indexOf(f);
    // the ship's shot leaves its nose: put the ship's body centre on the ember's row
    const nb = sc.ship.body;
    const oy = nb.y + nb.height / 2 - sc.ship.y;
    window.__alvo = { x: 40, y: f.l.y - oy };
    window.__hp = p.hp;
    return { i, x: Math.round(f.brilho.x), y: Math.round(f.l.y), borda: f.l.borda, vy: Math.round(v.l.y), vx: Math.round(v.brilho.x) };
  });
  if (alvo.atras) {
    console.log(`(aparição ${n}: as duas brasas ficam atrás dela, na linha dela — ${JSON.stringify(alvo)}; o tiro acha ela primeiro)`);
    await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado !== 'olhos', null, { timeout: 20000, polling: 50 });
    return false;
  }
  await page.waitForTimeout(500);
  await foto(`b${n}-0-acesas`);
  await page.keyboard.down('Space');
  await page.waitForFunction((i) => window.__game.scene.getScene('Game').boss.predador.luzesOlhos[i]?.golpes >= 1, alvo.i, { timeout: 4000, polling: 10 }).catch(() => {});
  await foto(`b${n}-1-acerto`);
  const estourou = await page.waitForFunction((i) => window.__game.scene.getScene('Game').boss.predador.luzesOlhos[i]?.morta, alvo.i, { timeout: 5000, polling: 10 }).then(() => true).catch(() => false);
  await page.keyboard.up('Space');
  const r1 = await page.evaluate((i) => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    const o = p.luzesOlhos[i];
    return { golpes: o?.golpes, hp: p.hp, hp0: window.__hp, faiscas: p.faiscas.getAliveParticleCount(), estado: p.estado, verdadeiraViva: p.luzesOlhos.some((q) => q.l.verdadeira && !q.morta && q.brilho.visible) };
  }, alvo.i);
  await page.waitForTimeout(250);
  await foto(`b${n}-2-estouro`);
  await page.waitForTimeout(550);
  await foto(`b${n}-3-caindo`);
  // where the sparks are while they fall: never under the floor's drawn edge
  let maisBaixo = 0;
  for (let k = 0; k < 25; k++) {
    const y = await page.evaluate(() => { let m = 0; window.__game.scene.getScene('Game').boss.predador.faiscas.forEachAlive((pt) => { m = Math.max(m, pt.y); }); return m; });
    maisBaixo = Math.max(maisBaixo, y);
    await page.waitForTimeout(60);
  }
  await foto(`b${n}-4-no-chao`);
  await page.waitForTimeout(1500);
  const r2 = await page.evaluate(() => ({ faiscas: window.__game.scene.getScene('Game').boss.predador.faiscas.getAliveParticleCount() }));
  const saltou = await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.olhosSaltando, null, { timeout: 12000, polling: 20 }).then(() => true).catch(() => false);
  const nome = `aparição ${n} (brasa ${alvo.borda} em ${alvo.x},${alvo.y}; ela em ${alvo.vx},${alvo.vy})`;
  conferir(estourou && r1.golpes === 3, `${nome}: a brasa toma os tiros e estoura no 3º`, r1.golpes);
  conferir(r1.hp === r1.hp0, `${nome}: a vida dela não se mexe (é só visual)`, [r1.hp0, r1.hp]);
  conferir(r1.faiscas > 8, `${nome}: o estouro solta faíscas`, r1.faiscas);
  conferir(maisBaixo <= 192, `${nome}: as faíscas caem e somem na borda do chão (y ${Math.round(maisBaixo)} ≤ 190 + 2)`, Math.round(maisBaixo));
  conferir(r2.faiscas === 0, `${nome}: nenhuma faísca fica no ar`, r2.faiscas);
  conferir(r1.verdadeiraViva, `${nome}: a verdadeira segue acesa`);
  conferir(saltou, `${nome}: ela ainda salta (o castigo é o tempo perdido)`);
  return true;
};
let feitas = 0;
for (let n = 1; n <= 4 && feitas < 2; n++) if (await UMA(n)) feitas++;
conferir(feitas === 2, 'duas aparições com uma brasa ao alcance', feitas);
conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
