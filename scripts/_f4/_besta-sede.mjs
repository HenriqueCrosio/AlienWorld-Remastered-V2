// 25/11, the Beast's step 5 — THE THIRST in the running game (npm run dev, 5173): the phase-1 lock, then one thirst per
// weapon with the ship parked and firing only while the ring is open. Checks: no life lost with the ring open, shots
// drunk, ≤ 24 returned, each returned shot on the line back to the ship's muzzle, the spreader as a fan, the bomb
// clearing the return. With <out dir> it also films each thirst (PNG + tempos.json for `_gif-jogo.py`).
//   node scripts/_f4/_besta-sede.mjs [out dir]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? null;
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
  sc.damageShip = () => {};
  return true;
}, null, { timeout: 240000, polling: 100 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  window.__nave = { x: 60, y: 108 };
  sc.events.on('postupdate', () => {
    sc.ship.setPosition(window.__nave.x, window.__nave.y);
    if (sc.ship.body) sc.ship.body.setVelocity(0, 0);
  });
});
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss?.predador?.estado === 'chao', null, { timeout: 60000, polling: 50 });
const P = () => window.__game.scene.getScene('Game').boss.predador;

// every returned shot is logged (`lancarLava` with a colour = the thirst's)
await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').boss.predador;
  window.__volta = [];
  const orig = p.lancarLava.bind(p);
  p.lancarLava = (x, y, vx, vy, tipo, cor, forma) => {
    const r = orig(x, y, vx, vy, tipo, cor, forma);
    if (cor !== undefined) {
      const l = p.lavas.at(-1);
      window.__volta.push({ x, y, vx, vy, t: performance.now(), tex: l?.b.texture.key, hit: l ? [l.b.body.sourceWidth * Math.abs(l.b.scaleX), l.b.body.sourceHeight * Math.abs(l.b.scaleY)] : null });
    }
    return r;
  };
  p.estadoT = 999;
});

// ── the lock: phase 1 does not pass 66 % before a thirst with its return ──
const trava = await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  sc.boss.damage(100);
  return { hp: p.hp, fase: p.fase, travada: p.travada, proxima: p.proximoAtaque() };
});
conferir(Math.abs(trava.hp - 180 * 0.661) < 1e-6 && trava.fase === 1 && trava.travada, 'a trava: damage(100) com a vida cheia para em 66,1 %', trava);
conferir(trava.proxima === 'sede', 'com a trava, a próxima jogada é a sede', trava.proxima);

async function filmar(nome, enquanto) {
  const dir = OUT ? path.join(OUT, nome) : null;
  if (dir) fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const tempos = [];
  let n = 0;
  while (await page.evaluate(enquanto)) {
    if (dir) await page.screenshot({ path: path.join(dir, `${n}.png`) });
    else await page.waitForTimeout(30);
    tempos.push({ t: Date.now() - t0, ...(await page.evaluate(() => {
      const p = window.__game.scene.getScene('Game').boss.predador;
      const s = window.__game.scene.getScene('Game').boss.sprite;
      return { e: p.estado, k: s.anims.currentAnim?.key ?? s.texture.key, q: s.frame.name, hp: p.hp, bebidos: p.bebidos.length, aberta: p.sedeAberta };
    })) });
    n++;
    if (Date.now() - t0 > 9000) break;
  }
  if (dir) fs.writeFileSync(path.join(dir, 'tempos.json'), JSON.stringify(tempos));
  return tempos;
}

/** One thirst: the ship at (x, y = the core's height), `arma` equipped, firing only while the ring is open. */
async function umaSede(nome, arma, naveX, girando = false) {
  await page.waitForFunction(() => {
    const p = window.__game.scene.getScene('Game').boss.predador;
    return p.estado === 'chao' || p.estado === 'sede';
  }, null, { timeout: 30000, polling: 50 });
  await page.evaluate(([arma, naveX]) => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    p.hp = 180;
    window.__volta = [];
    if (arma === 'base' || arma === 'duplo' || arma === 'triplo') sc.weapons.equipBase(); else sc.weapons.equip(arma);
    // the Duplo / Triplo cards on the base gun (`cartas.ts` montarArma), patched in place for the test
    if (arma === 'duplo') sc.weapons.weapon = { ...sc.weapons.weapon, muzzles: [{ dy: -2, angle: 0 }, { dy: 2, angle: 0 }], pellets: 2, forma: 2 };
    if (arma === 'triplo') sc.weapons.weapon = { ...sc.weapons.weapon, muzzles: [{ dy: -3, angle: -5 }, { dy: 0, angle: 0 }, { dy: 3, angle: 5 }], pellets: 3, forma: 3 };
    window.__nave.x = naveX;
    if (p.estado !== 'sede') p.sede();
  }, [arma, naveX]);
  // (a spun-up gun: the player was already firing when she turned — the HMG starts at a fifth of its rate)
  if (girando) await page.keyboard.down('Space');
  // the ring opens: the ship goes to the core's height and fires
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.sedeAberta, null, { timeout: 5000, polling: 16 });
  const aberto = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    window.__nave.y = Math.round(sc.boss.core.y);
    return { hp: sc.boss.predador.hp, y: window.__nave.y, core: [Math.round(sc.boss.core.x), Math.round(sc.boss.core.y)] };
  });
  await page.keyboard.down('Space');
  let fechou = null;
  const tempos = await filmar(nome, async () => {
    const p = window.__game.scene.getScene('Game').boss.predador;
    return p.estado === 'sede' || p.estado === 'recupera';
  }).then(async (t) => t);
  // (the fire stops when the ring closes — the loop above ran to the end; read the life at the close from the log)
  await page.keyboard.up('Space');
  const fim = tempos.findLast((q) => q.aberta) ?? tempos[0];
  fechou = fim;
  const volta = await page.evaluate(() => window.__volta);
  const muzzle = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    return { x: sc.ship.x, y: sc.ship.y };
  });
  const naLinha = volta.every((d) => d.vx < 0 && Math.abs(d.y + ((muzzle.x - d.x) * d.vy) / d.vx - muzzle.y) <= 8);
  const rumos = new Set(volta.map((d) => Math.round((Math.atan2(d.vy, d.vx) * 180) / Math.PI)));
  const bebeu = Math.max(...tempos.map((q) => q.bebidos));
  console.log(`\n[${nome}] ring at core ${aberto.core}, ship y ${aberto.y}; drunk ${bebeu}, returned ${volta.length}, headings ${[...rumos].join(',')}`);
  conferir(Math.abs(fechou.hp - aberto.hp) < 1e-6, `${nome}: nenhuma vida perdida com o anel aberto`, [aberto.hp, fechou.hp]);
  conferir(bebeu > 0, `${nome}: o anel bebeu`, bebeu);
  conferir(volta.length >= 1 && volta.length <= 24, `${nome}: 1 a 24 devolvidos`, volta.length);
  return { volta, rumos, naLinha, bebeu };
}

// the lock above already pulled the thirst: let her pick it herself
await page.evaluate(() => { window.__game.scene.getScene('Game').boss.predador.estadoT = 0; });
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'sede', null, { timeout: 5000, polling: 16 });
conferir(true, 'ela escolheu a sede sozinha');
const base = await umaSede('sede-base', 'base', 60);
conferir(base.naLinha, 'base: cada devolvido volta pela linha até a boca da nave');
conferir(base.volta.every((d) => d.tex === 'lavaGota') && base.volta.every((d) => d.hit?.map(Math.round).join('x') === '6x6'), 'base: uma conta só, acerto 6 px', [...new Set(base.volta.map((d) => d.tex))]);
const pos = await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  p.hp = 180;
  const travada = p.travada;
  sc.boss.damage(100);
  return { travada, hp: p.hp, vista: p.vistas.has('sede') };
});
conferir(pos.vista && !pos.travada && Math.abs(pos.hp - 80) < 1e-6, 'depois do tranco a trava abre (damage(100) passa)', pos);
await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.hp = 180; p.estadoT = 999; });

const hmg = await umaSede('sede-hmg', 'hmg', 60, true);
conferir(hmg.naLinha, 'HMG: os devolvidos voltam pela linha até a nave (a parede)');
conferir(hmg.bebeu > 24 && hmg.volta.length <= 24, 'HMG: bebeu mais de 24 e devolveu no máximo 24', [hmg.bebeu, hmg.volta.length]);
await page.evaluate(() => { window.__game.scene.getScene('Game').boss.predador.estadoT = 999; });

const leque = await umaSede('sede-dispersor', 'spread', 200);
conferir(leque.rumos.size >= 3, 'dispersor: volta em leque (≥ 3 rumos)', [...leque.rumos]);
await page.evaluate(() => { window.__game.scene.getScene('Game').boss.predador.estadoT = 999; });

// ── 25/11, his idea: the return wears the SHAPE of the shot (one bead, a pair for the Duplo, three for the Triplo) ──
for (const [arma, forma] of [['duplo', 2], ['triplo', 3]]) {
  await page.evaluate(() => { window.__game.scene.getScene('Game').boss.predador.estadoT = 999; });
  const r = await umaSede(`sede-${arma}`, arma, 60);
  const tex = new Set(r.volta.map((d) => d.tex));
  const hits = new Set(r.volta.map((d) => d.hit?.map(Math.round).join('x')));
  conferir(r.volta.length > 0 && tex.size === 1 && tex.has(`sedeGota${forma}`), `${arma}: devolve na forma dele (${forma} contas)`, [...tex]);
  conferir(hits.size === 1 && hits.has('6x6'), `${arma}: o acerto é o mesmo 6 px (só visual)`, [...hits]);
}
await page.evaluate(() => { window.__game.scene.getScene('Game').boss.predador.estadoT = 999; });

// ── the bomb: the returned shots are plain enemy shots (whatever the bomb in force does to those, it does to them).
// Today's drop bomb hurts by radius and clears no shot; the panic bomb (`BOMBA.modo = 'panico'`) clears them all. ──
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  p.hp = 180;
  window.__volta = [];
  sc.weapons.equip('hmg');
  window.__nave.x = 60;
  p.sede();
});
await page.keyboard.down('Space');
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.sedeAberta, null, { timeout: 5000, polling: 16 });
await page.evaluate(() => { window.__nave.y = Math.round(window.__game.scene.getScene('Game').boss.core.y); });
await page.waitForFunction(() => !window.__game.scene.getScene('Game').boss.predador.sedeAberta, null, { timeout: 5000, polling: 16 });
await page.keyboard.up('Space');
await page.waitForFunction(() => window.__volta.length >= 6, null, { timeout: 5000, polling: 16 });
const bomba = await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const vivas = () => sc.boss.predador.lavas.filter((l) => l.tipo === 'gota' && l.b.active);
  const antes = vivas();
  const doGrupo = antes.every((l) => sc.enemies.enemyBullets.contains(l.b));
  sc.bombaDePanico();
  return { antes: antes.length, doGrupo, depois: vivas().length };
});
conferir(bomba.doGrupo, 'os devolvidos são tiros inimigos comuns (a bomba que valer vale para eles)', bomba);
conferir(bomba.antes > 0 && bomba.depois === 0, 'a bomba de pânico limpa a devolução', bomba);

conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
