// 25/11, the Beast's step 8 — THE HEART STOPS in the running game (npm run dev, 5173), in the dark (`besta3`). Checks:
// the phase-3 lock (she holds at 1 hp and pulls the heart); the field of 30 shards (step 12); at the squeeze everything freezes —
// her shards and the player's shots in the air — for ~1.5 s, while the ship moves; the shots fired in the freeze pile
// in front of the ship and follow it; at the burst everything resumes (the pile leaves to the right); the bomb in the
// freeze clears her field and spends the pile; after the heart, the killing blow passes. With <out dir> it films.
//   node scripts/_f4/_besta-coracao.mjs [out dir]
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
  sc.damageShip = () => {};
  return true;
}, null, { timeout: 240000, polling: 100 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  window.__nave = { x: 60, y: 108 };
  sc.events.on('postupdate', () => {
    sc.ship.setPosition(window.__nave.x, window.__nave.y);
    if (sc.ship.body) sc.ship.body.setVelocity(0, 0);
    // (the route test: the body follows at once, so the path is flown by the real hull box)
    if (window.__resetCorpo && sc.ship.body) sc.ship.body.reset(window.__nave.x, window.__nave.y);
  });
});
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss?.predador; return p?.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });

// ── the lock ──
const trava = await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  p.estadoT = 999;
  p.hp = 5;
  sc.boss.damage(100);
  return { hp: p.hp, travada: p.travada, proxima: p.proximoAtaque(), dead: p.dead };
});
conferir(trava.hp === 1 && trava.travada && !trava.dead && trava.proxima === 'coracao', 'a trava da fase 3: ela segura em 1 de vida e puxa o coração', trava);

/** One heart: the ship fires from (60,108) before the freeze, and during it crosses to the pocket by her. */
async function umCoracao(nome, bomba) {
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'chao', null, { timeout: 30000, polling: 50 });
  await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    window.__nave = { x: 60, y: 108 };
    sc.weapons.equipBase();
    sc.bombs = 3;
    window.__s = [];
    const tick = () => {
      const meus = p.lavas.filter((l) => l.tipo === 'metal' && l.b.active);
      const tiros = sc.weapons.bullets.getChildren().filter((b) => b.active);
      window.__s.push({
        t: performance.now(), e: p.estado, cong: p.congelado,
        metal: meus.map((l) => [Math.round(l.b.x), Math.round(l.b.y), Math.round(l.b.body.velocity.x)]),
        voo: tiros.filter((b) => b.getData('gelo') && !b.getData('pilha')).map((b) => [Math.round(b.x), Math.round(b.body.velocity.x)]),
        pilha: tiros.filter((b) => b.getData('pilha')).map((b) => [Math.round(b.x - sc.ship.x), Math.round(b.body.velocity.x)]),
        livres: tiros.filter((b) => !b.getData('gelo')).map((b) => Math.round(b.body.velocity.x)),
        nave: [sc.ship.x, sc.ship.y],
      });
      if (p.estado === 'coracao' || window.__s.length < 10) requestAnimationFrame(tick);
    };
    p.coracao();
    requestAnimationFrame(tick);
  });
  await page.keyboard.down('Space');
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.congelado, null, { timeout: 8000, polling: 16 });
  // the ship crosses the frozen field to the pocket by her, still firing (those shots pile)
  for (const [x, y] of [[90, 80], [140, 80], [200, 80], [228, 108]]) {
    await page.evaluate(([x, y]) => { window.__nave = { x, y }; }, [x, y]);
    await page.waitForTimeout(220);
  }
  if (bomba) {
    await page.keyboard.up('Space');
    await page.keyboard.down('Shift');
    await page.waitForTimeout(120);
    await page.keyboard.up('Shift');
    const r = await page.evaluate(() => {
      const sc = window.__game.scene.getScene('Game');
      const p = sc.boss.predador;
      return { cong: p.congelado, metal: p.lavas.filter((l) => l.tipo === 'metal' && l.b.active).length, pilha: sc.weapons.bullets.getChildren().filter((b) => b.active && b.getData('pilha')).length };
    });
    conferir(r.cong && r.metal === 0 && r.pilha === 0, `${nome}: a bomba no congelamento limpa o campo dela e gasta a pilha`, r);
  }
  await page.waitForFunction(() => !window.__game.scene.getScene('Game').boss.predador.congelado, null, { timeout: 8000, polling: 16 });
  await page.waitForTimeout(300);
  await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado !== 'coracao', null, { timeout: 8000, polling: 50 });
  const s = await page.evaluate(() => window.__s);
  if (bomba) return s;
  const cong = s.filter((q) => q.cong);
  const dur = (cong.at(-1).t - cong[0].t) / 1000;
  const lancados = Math.max(...s.map((q) => q.metal.length));
  conferir(lancados === 30, `${nome}: o campo tem 30 estilhaços`, lancados);
  conferir(Math.abs(dur - 4.5) < 0.15, `${nome}: o coração fica parado ~4,5 s (26/11; era 3,0)`, +dur.toFixed(2));
  const a = cong[2];
  const b = cong.at(-2);
  const parado = a.metal.length > 0 && a.metal.length === b.metal.length && a.metal.every((m, i) => b.metal[i] && m[0] === b.metal[i][0] && m[1] === b.metal[i][1] && m[2] === 0);
  conferir(parado, `${nome}: os estilhaços ficam parados no ar`, { a: a.metal.slice(0, 3), b: b.metal.slice(0, 3) });
  conferir(cong.some((q) => q.voo.length > 0) && cong.every((q) => q.voo.every((v) => v[1] === 0)), `${nome}: os tiros da nave no ar também congelam`, cong[2].voo.slice(0, 3));
  const navesMovem = new Set(cong.map((q) => q.nave.join())).size > 2;
  conferir(navesMovem, `${nome}: só a nave se move`);
  const pilhaMax = Math.max(...cong.map((q) => q.pilha.length));
  // (the harness TELEPORTS the ship 50 px in postupdate, after the pile was placed: the pile is one frame behind on those
  //  frames; in play the ship moves in the physics step, before the scene places it)
  const todas = cong.flatMap((q) => q.pilha);
  const certas = todas.filter((p) => p[0] >= 12 && p[0] <= 22 && p[1] === 0).length;
  const naFrente = todas.every((p) => p[1] === 0) && certas / todas.length > 0.85;
  const ruins = cong.flatMap((q) => q.pilha.filter((p) => !(p[0] >= 12 && p[0] <= 22 && p[1] === 0))).slice(0, 8);
  conferir(pilhaMax >= 3 && naFrente, `${nome}: os tiros do congelamento se acumulam na frente da nave e a acompanham`, { pilhaMax, naFrente: +(certas / todas.length).toFixed(2), ruins });
  const depois = s.filter((q) => !q.cong && q.t > cong.at(-1).t);
  const voltou = depois.find((q) => q.metal.length && q.metal.some((m) => m[2] !== 0));
  conferir(!!voltou, `${nome}: na batida os estilhaços seguem viagem`, voltou?.metal.slice(0, 3));
  const rajada = depois.find((q) => q.livres.filter((v) => v > 0).length >= pilhaMax);
  conferir(!!rajada, `${nome}: e a pilha sai de uma vez para a frente`, { pilhaMax, livres: depois[1]?.livres.length });
  return s;
}

const s1 = await umCoracao('coracao', false);
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const final = await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  return { vista: p.vistas.has('coracao'), travada: p.travada };
});
conferir(final.vista && !final.travada, 'depois do coração a trava abre', final);
await umCoracao('coracao-bomba', true);

/**
 * STEP 12 — THE PUT-OUT ROUTE, measured on the real bodies: at the freeze, the hull box (21×9) is swept along the route
 * (from the left wall, through each put-out shard in order, into the pocket by her) against every LIT shard's real body;
 * then, from the freeze to 1.2 s after the resume, a hull box parked in the pocket is tested every frame against her
 * DRAWN pixels (`tocaDesenho`) and every lava body. The put-out ones have no body.
 */
async function umaRota(nome) {
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'chao', null, { timeout: 30000, polling: 50 });
  await page.evaluate(() => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    window.__nave = { x: 60, y: 200 };
    for (const l of p.lavas) { if (l.b.active) { l.b.setData('lava', false); sc.enemies.release(l.b); } }
    p.coracao();
  });
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.congelado, null, { timeout: 8000, polling: 16 });
  const r = await page.evaluate(async () => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    const W = 21, H = 9;
    const fora = p.lavas.filter((l) => l.b.active && l.b.getData('apagada') === true);
    const acesas = p.lavas.filter((l) => l.b.active && l.b.body.enable).map((l) => l.b.body);
    const ordem = [...p.rotaApagada].map((k) => fora.find((l) => l.b.getData('celula') === k)).filter(Boolean).map((l) => ({ x: l.b.x, y: l.b.y }));
    const POCKET_X = 220;
    const caminho = [{ x: 11, y: ordem[0].y }, ...ordem, { x: POCKET_X, y: ordem.at(-1).y }];
    const gap = (cx, cy, b) => {
      const dx = Math.max(0, Math.abs(cx - (b.x + b.width / 2)) - (W + b.width) / 2);
      const dy = Math.max(0, Math.abs(cy - (b.y + b.height / 2)) - (H + b.height) / 2);
      return dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy);
    };
    let folga = Infinity, comp = 0;
    for (let i = 1; i < caminho.length; i++) {
      const a = caminho[i - 1], c = caminho[i];
      const n = Math.max(1, Math.round(Math.hypot(c.x - a.x, c.y - a.y)));
      comp += n;
      for (let k = 0; k <= n; k++) { const x = a.x + ((c.x - a.x) * k) / n, y = a.y + ((c.y - a.y) * k) / n; for (const b of acesas) folga = Math.min(folga, gap(x, y, b)); }
    }
    // the pocket, every frame from now to 1.2 s after the resume
    const bx = POCKET_X, by = ordem.at(-1).y;
    let toques = 0, quadros = 0, fimEm = null;
    const q = [];
    await new Promise((res) => {
      const tick = () => {
        quadros++;
        const corpo = p.tocaDesenho(bx - W / 2, by - H / 2, bx + W / 2, by + H / 2, true);
        const lava = p.lavas.some((l) => l.b.active && l.b.body.enable && gap(bx, by, l.b.body) <= 0);
        if (corpo || lava) { toques++; if (q.length < 4) q.push({ corpo, lava, quadro: sc.boss.sprite.texture.key + '#' + sc.boss.sprite.frame.name, cong: p.congelado }); }
        if (!p.congelado && fimEm === null) fimEm = performance.now();
        if (fimEm !== null && performance.now() - fimEm > 1200) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { apagadas: fora.length, semCorpo: fora.every((l) => !l.b.body.enable), folga: +folga.toFixed(1), s: +(comp / 110).toFixed(2), parado: p.constructor ? undefined : undefined, toques, quadros, q, caminho: caminho.map((c) => [Math.round(c.x), Math.round(c.y)]) };
  });
  conferir(r.apagadas >= 7 && r.semCorpo, `${nome}: ${r.apagadas} lascas apagadas, nenhuma com corpo`, r.apagadas);
  conferir(r.folga >= 8, `${nome}: pela rota (nos corpos de verdade), a nave passa com ≥ 8 px de folga das acesas`, { folga: r.folga, caminho: r.caminho });
  conferir(r.s <= 2.7, `${nome}: da parede da esquerda ao bolso em ${r.s} s (o coração fica parado 4,5 s)`, r.s);
  conferir(r.toques === 0, `${nome}: no bolso (x 220), nada toca a nave até 1,2 s depois da retomada`, { toques: r.toques, de: r.quadros, q: r.q });
}
for (let i = 0; i < 5; i++) await umaRota(`rota-${i + 1}`);

// the killing blow passes now
const morte = await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  sc.boss.predador.hp = 1;
  sc.boss.damage(5);
  return sc.boss.predador.dead;
});
conferir(morte, 'depois do coração o golpe final mata', morte);
conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
