// BLOCO G · the CAVE probe (21/10, spec `2026-10-21-f1-caverna-design.md` — the rock band IN FRONT of the ship): the
// stage jumps to 30 s (the waves moved for the cave start at 31,5), the loop is put to sleep and stepped at 60 Hz with
// the ship parked (x 70, y 120) and untouchable; the enemies LIVE (none may hide behind the rock). The cave's state is
// read along the way. Needs `npm run dev` on :5173.   node scripts/_g/_probe-caverna-f1.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, msg, visto) => { console.log(`${c ? '✔' : '✘'} ${msg}${c ? '' : ` — visto: ${JSON.stringify(visto)}`}`); if (!c) falhas++; };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' }));
await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) > 0.5, null, { timeout: 30000 });

const inicio = await page.evaluate(() => {
  const g = window.__game, s = g.scene.getScene('Game');
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  s.invulnerableUntil = 1e12;
  if (s.cartas) s.cartas.intocavel = () => true;
  s.elapsed = 30;
  s.director.skipTo(30);
  window.__cav = { escondidos: [], cobriuEntrada: false, cobriuSaida: false, noSalao: [] };
  return { bossTime: s.director.bossTime, temCaverna: !!s.parallax.caverna };
});
ok(inicio.temCaverna, 'a caverna está montada na F1', inicio);
ok(inicio.bossTime === 84, 'o roteiro foi empurrado: o chefão aos 84 s', inicio.bossTime);

// Step to a stage time, the ship parked; watches every frame for a covered screen and for anything hidden behind the rock.
const andarAte = (alvo, naveY = 120) => page.evaluate(({ alvo, naveY }) => {
  const g = window.__game, s = g.scene.getScene('Game');
  const D = s.cache.json.get('f1-caverna'), L = D.largura;
  const Q = 1000 / 60;
  const W = window.__cav;
  let primeiraAberta = null, ultimaAberta = null;
  const faixas = () => s.children.list.filter((o) => o.texture?.key === 'f1-cav-faixa' && o.visible);
  const atras = (fx, x, y) => { const f = D.fundo[Math.max(0, Math.min(215, Math.round(y)))]; return x >= fx + f + 1 && x <= fx + L - 2 - f; };
  while (s.elapsed < alvo) {
    window.__passo.t += Q;
    g.step(window.__passo.t, Q);
    s.ship.x = 70; s.ship.y = naveY; s.ship.body?.setVelocity?.(0, 0);
    if (s.parallax.cavernaAberta()) { if (primeiraAberta === null) primeiraAberta = s.elapsed; ultimaAberta = s.elapsed; }
    for (const fx of faixas()) {
      // a tela inteira coberta: em toda linha, a rocha vai de antes de x 0 a depois de x 383
      if (D.fundo.every((f) => fx.x + f + 1 <= 0 && fx.x + L - 2 - f >= 383)) W[fx.flipX ? 'cobriuSaida' : 'cobriuEntrada'] = true;
      for (const gr of [s.enemies?.enemies, s.enemyBullets, s.terrain?.props]) for (const o of gr?.getChildren?.() ?? []) {
        if (!o.active || !o.visible || o.x < 0 || o.x > 384 || o.y < 0 || o.y > 216) continue;
        if (atras(fx.x, o.x, o.y) && W.escondidos.length < 5) W.escondidos.push({ t: +s.elapsed.toFixed(2), x: Math.round(o.x), y: Math.round(o.y), tex: o.texture?.key });
      }
    }
    // O SALÃO SEM PEÇA NENHUMA: o perigo dele são o teto e o chão (as rochas da rodada 2 liam flutuando e saíram, ele,
    // 21/10) — nenhuma peça do terreno na tela enquanto ele está aberto.
    if (s.parallax.cavernaAberta()) for (const p of s.terrain?.props?.getChildren?.() ?? []) {
      if (p.active && p.x + p.width / 2 > 0 && p.x - p.width / 2 < 384 && W.noSalao.length < 5) W.noSalao.push({ t: +s.elapsed.toFixed(2), tex: p.texture?.key, x: Math.round(p.x) });
    }
  }
  const c = s.parallax.caverna, b = s.ship.body;
  const fs = faixas();
  return {
    t: +s.elapsed.toFixed(2), ativa: c.ativa(), aberta: c.aberta(), pintura: s.parallax.pinturaNaTela(), primeiraAberta, ultimaAberta,
    tempoNaCaverna: +s.tempoNaCaverna.toFixed(2),
    faixas: fs.map((o) => ({ x: o.x, flip: o.flipX, depth: o.depth, alfa: o.alpha, aura: !!o.mask?.invertAlpha && String(o.mask?.bitmapMask?.texture?.key).startsWith('aura:') })),
    naveDepth: s.ship.depth,
    mordeMeio: c.morde(b.left, b.right, b.top, b.bottom),
    mordeTeto: c.morde(b.left, b.right, 2, 2 + b.height),
    mordeChao: c.morde(b.left, b.right, 212 - b.height, 212),
  };
}, { alvo, naveY });

let e = await andarAte(39.9);
ok(!e.ativa, 'antes do evento, nada da caverna', e);
e = await andarAte(41);
ok(e.ativa && !e.aberta && e.pintura === 'paintBgF1', 'aos 40 s a rocha da entrada entra; o tom ainda é o da F1', e);
const f41 = e.faixas.find((f) => !f.flip);
ok(f41 && f41.depth > e.naveDepth && f41.alfa === 1, 'a rocha passa NA FRENTE da nave, sólida', { faixas: e.faixas, nave: e.naveDepth });
ok(e.faixas.every((f) => f.aura), 'a aura da nave fura a rocha (a máscara invertida da silhueta)', e.faixas);
e = await andarAte(42);
const f42 = e.faixas.find((f) => !f.flip);
ok(f41.x - f42.x > 180 && f41.x - f42.x < 240, 'a rocha anda ~2,5× o mundo (~207 px/s)', [f41.x, f42.x]);
e = await andarAte(43.6);
ok(e.aberta && e.primeiraAberta > 43 && e.primeiraAberta < 43.5, 'a troca passa pela nave (~43,2 s): o tom passa ao da caverna', e);
ok(!e.mordeTeto && !e.mordeChao, 'atrás da rocha nada morde (o teto e o chão só mordem à vista)', e);
e = await andarAte(46);
ok(e.pintura === 'paintBgCaverna' && !e.mordeMeio, 'no salão, no meio do vão, nada morde', e);
ok(e.mordeTeto && e.mordeChao, 'no salão, encostada no teto ou no chão, a caverna morde', e);
e = await andarAte(56.9);
ok(e.aberta, 'o salão segue até a troca da saída', e);
e = await andarAte(57.8);
ok(!e.aberta && e.ativa, 'a troca da saída passa pela nave (~57,2 s): o tom volta ao da F1', e);
ok(e.ultimaAberta > 56.9 && e.ultimaAberta < 57.5, 'na hora prevista', e.ultimaAberta);
ok(e.tempoNaCaverna > 13 && e.tempoNaCaverna < 15, 'o relógio da invasão pausou de troca a troca (~14 s)', e.tempoNaCaverna);
e = await andarAte(60);
ok(!e.ativa && e.pintura === 'paintBgF1', 'a rocha da saída passa inteira (~59,2 s) e a caverna acaba', e);
const W = await page.evaluate(() => window.__cav);
ok(W.cobriuEntrada && W.cobriuSaida, 'a tela fica INTEIRA coberta por um instante, na entrada e na saída (o lado de fora nunca junto com o salão)', W);
ok(W.escondidos.length === 0, 'nenhum inimigo, tiro nem peça escondido atrás da rocha da frente', W.escondidos);
ok(W.noSalao.length === 0, 'nenhuma peça do terreno no salão (o perigo dele são o teto e o chão)', W.noSalao);
ok(erros.length === 0, 'nenhum erro de página', erros);

// O TREINO salta para o chefão: nada da caverna fica na tela.
await page.evaluate(() => window.__game.scene.getScene('Game').scene.start('Game', { stage: 1, handling: 'free', practice: true }));
await page.waitForTimeout(1500);
const treino = await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); return { ativa: s.parallax.caverna?.ativa(), t: s.elapsed }; });
ok(treino.ativa === false, 'o treino salta por cima da caverna sem deixar nada dela', treino);

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
