// 25/11, the Beast's step 7 — THE EYES IN THE DARK in the running game (npm run dev, 5173), in the dark (`besta3`).
// Three appearances (the figures turn: wall, ceiling, wall). Checks: she leaves the screen; three lights, all in front
// of the ship; the true one peaks with the heart and the embers do not; she leaps after two beats through where the
// ship was at the last beat (a parked ship is struck); a ship that changes height after the beat escapes; she comes
// back to her floor anchor; no console error. With <out dir> it films each appearance.
//   node scripts/_f4/_besta-olhos.mjs [out dir]
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

await page.goto('http://localhost:5173/?fase=besta3&mao=nenhuma', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  if (!g.isActive('Game') || !sc?.boss) return false;
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  window.__golpes = [];
  sc.damageShip = () => { const p = sc.boss?.predador; window.__golpes.push(p?.olhosSaltando ? 'olhos-salto' : p?.estado); };
  return true;
}, null, { timeout: 240000, polling: 100 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  window.__nave = { x: 70, y: 110 };
  sc.events.on('postupdate', () => {
    sc.ship.setPosition(window.__nave.x, window.__nave.y);
    if (sc.ship.body) sc.ship.body.setVelocity(0, 0);
  });
});
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss?.predador; return p?.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });

async function uma(nome, nave, foge) {
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'chao', null, { timeout: 30000, polling: 50 });
  await page.evaluate(([nave, foge]) => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    window.__nave = { ...nave };
    window.__golpes = [];
    window.__a = [];
    p.estadoT = 999;
    p.hp = 60;
    let fugiu = false;
    const tick = () => {
      const L = p.luzesOlhos.map((o) => ({ x: o.l.x, y: o.l.y, v: o.l.verdadeira, a: o.brilho.alpha }));
      // the ship that dodges: at the tell after the last beat (25/11: 4 beats, then the eyes narrow) it changes height
      // by 60 px (from the wall it changes height; under the ceiling one it changes column)
      if (foge && !fugiu && p.estado === 'olhos' && p.luzesOlhos.length && p.olhosAvisando) {
        fugiu = true;
        if (foge === 'x') window.__nave.x += 110;
        else window.__nave.y += window.__nave.y > 108 ? -60 : 60;
      }
      window.__a.push({ e: p.estado, salta: p.olhosSaltando, vis: sc.boss.sprite.visible, batidas: p.olhosBatidas, nb: p.naveBatida, L, core: [sc.boss.core.x, sc.boss.core.y], pulso: p.pulso });
      if (!(p.estado === 'chao' && window.__a.length > 30 && window.__a.some((q) => q.salta))) requestAnimationFrame(tick);
    };
    p.olhos();
    requestAnimationFrame(tick);
  }, [nave, foge]);
  const dir = OUT ? path.join(OUT, nome) : null;
  if (dir) fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const tempos = [];
  let n = 0;
  while (Date.now() - t0 < 12000) {
    const st = await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; const s = window.__game.scene.getScene('Game').boss.sprite; return { e: p.estado, salta: p.olhosSaltando, k: s.anims.currentAnim?.key ?? s.texture.key, q: s.frame.name, x: Math.round(s.x), y: Math.round(s.y), feito: p.estado === 'chao' && window.__a.some((q) => q.salta) }; });
    if (dir) await page.screenshot({ path: path.join(dir, `${n++}.png`) });
    else await page.waitForTimeout(40);
    tempos.push({ t: Date.now() - t0, ...st });
    if (st.feito) break;
  }
  if (dir) fs.writeFileSync(path.join(dir, 'tempos.json'), JSON.stringify(tempos));
  const r = await page.evaluate(() => ({ a: window.__a, golpes: window.__golpes }));
  const a = r.a;
  const acesas = a.filter((q) => q.L.length === 3);
  const L = acesas[0]?.L ?? [];
  console.log(`\n[${nome}] lights ${JSON.stringify(L.map((l) => [Math.round(l.x), Math.round(l.y), l.v]))}`);
  conferir(a.some((q) => q.e === 'olhos' && !q.vis), `${nome}: ela some da tela`);
  conferir(L.length === 3 && L.every((l) => l.x >= 384 * 0.45), `${nome}: três luzes, todas na frente da nave`, L.map((l) => Math.round(l.x)));
  // the true one is bright at each beat, the embers dim
  const nasBatidas = acesas.filter((q, i) => i > 0 && q.batidas > acesas[i - 1].batidas && !q.salta);
  const ok = nasBatidas.length >= 1 && nasBatidas.every((q) => { const v = q.L.find((l) => l.v); const f = q.L.filter((l) => !l.v); return v.a > 0.7 && f.every((l) => l.a < 0.55); });
  conferir(ok, `${nome}: no batimento a verdadeira acende e as brasas não`, nasBatidas.map((q) => q.L.map((l) => +l.a.toFixed(2))));
  const nb = a.findLast((q) => q.nb)?.nb;
  conferir(a.some((q) => q.salta) && nb, `${nome}: salta depois de ${a.find((q) => q.salta)?.batidas} batimentos`, nb);
  // the core's path passes through where the ship was at the last beat
  const caminho = a.filter((q) => q.salta).map((q) => q.core);
  const doTeto = L.find((l) => l.v)?.y < 100 && L.find((l) => l.v)?.x < 330;
  if (doTeto) {
    // from the ceiling: the drop lands on the ship's column
    const xPouso = caminho.at(-1)[0];
    conferir(Math.abs(xPouso - nb.x) < 14, `${nome}: cai na coluna em que a nave estava no último batimento`, [Math.round(xPouso), nb.x]);
    const xs = new Set(a.filter((q) => q.salta).map((q) => Math.round(q.core[0] / 4)));
    conferir(xs.size <= 4, `${nome}: a queda é reta (o corpo não desliza pendurado)`, [...xs].map((x) => x * 4));
  } else {
    const perto = Math.min(...caminho.map(([x, y]) => Math.hypot(x - nb.x, y - nb.y)));
    conferir(perto < 26, `${nome}: o salto passa onde a nave estava no último batimento`, Math.round(perto));
  }
  const leva = r.golpes.includes('olhos-salto');
  conferir(foge ? !leva : leva, foge ? `${nome}: a nave que troca de altura escapa` : `${nome}: a nave parada leva o salto`, [...new Set(r.golpes)]);
  conferir(a.at(-1).e === 'chao', `${nome}: volta ao chão`, a.at(-1).e);
}

await uma('olhos-parede', { x: 70, y: 110 }, false);
await uma('olhos-teto', { x: 110, y: 150 }, false);
// (the ship dodges AWAY from the light's side — up into a descending leap is where her body still passes)
await uma('olhos-parede-foge', { x: 80, y: 70 }, true);
await uma('olhos-parede-baixa-foge', { x: 120, y: 120 }, true);
await uma('olhos-teto-foge', { x: 70, y: 150 }, 'x');

// 25/11 — THE TRUE LIGHT CAN BE SHOT (his call), at half the damage: a shot on the true light lands on her core; the
// embers take nothing
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'chao', null, { timeout: 30000, polling: 50 });
await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.estadoT = 999; p.hp = 60; p.olhos(); });
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss.predador; return p.estado === 'olhos' && p.luzesOlhos.length === 3; }, null, { timeout: 15000, polling: 30 });
const luz = await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  const v = p.luzesOlhos.find((o) => o.l.verdadeira);
  const naLuz = Math.hypot(sc.boss.core.x - v.brilho.x, sc.boss.core.y - v.l.y) < 2 && sc.boss.core.body.enable;
  const antes = p.hp;
  sc.boss.damage(4);
  return { naLuz, perdeu: +(antes - p.hp).toFixed(2), invisivel: !sc.boss.sprite.visible };
});
conferir(luz.naLuz && luz.invisivel, 'olhos: o core (o alvo) está na luz verdadeira, com ela invisível', luz);
conferir(luz.perdeu === 2, 'olhos: um tiro de 4 na luz verdadeira tira 2 (metade do dano)', luz.perdeu);
conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
