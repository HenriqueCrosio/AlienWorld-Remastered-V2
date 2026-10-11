// OS ELITES DA F3 NO JOGO REAL (spec 2026-10-06-frente-b-fatia-f3-design.md §7, com a emenda de 07/10).
// Uso: node scripts/probe-elites-f3.mjs [cacador|tentaculo]  (com `npm run dev` rodando). Sandbox, fase 3, invulnerável.
// A serpente do casco (o posto do Tentáculo, §3.4) roda no RELÓGIO MANUAL (1/60 s por passo, como o `_gif.mjs`): os
// trios saem a 0,33s um do outro, e no software renderer uma ida e volta do playwright demora mais que isso.
import { chromium } from 'playwright';
import { ELITES } from '../src/data/numerosElites.ts';

const SO = process.argv[2];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.addInitScript(() => {
  localStorage.setItem('alienworld.sandbox', JSON.stringify({
    fase: 3, repetir: false, intervalo: 999,
    inimigos: { drone: 0, batedor: 0, canhoneira: 0, kamikaze: 0, cargueiro: 0, aguaViva: 0, aranha: 0, droneMineracao: 0, sentinela: 0, cacador: 0, tentaculo: 0 },
  }));
});
await page.goto('http://localhost:5173/?sandbox', { waitUntil: 'networkidle' });
await page.waitForSelector('#sandbox:not([hidden]) .no', { timeout: 30000 });
await page.click('button[data-acao="jogar"]');
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').arena, null, { timeout: 30000 });
await page.keyboard.press('Digit3'); // invulnerável

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const espera = (ms) => page.waitForTimeout(ms);
const esperaFase = (kind, fase, ms = 8000) =>
  page.waitForFunction(({ kind, fase }) => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.active && x.getData('kind') === kind)?.getData('elite')?.fase === fase, { kind, fase }, { timeout: ms });

// Conta os DISPAROS e as TINTAS criadas (sprites com `data.tinta`).
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const t = s.enemies.tiros;
  window.__disparos = [];
  const orig = t.disparar.bind(t);
  t.disparar = (x, y, ang, vel, vestir) => {
    const ok = orig(x, y, ang, vel, vestir);
    window.__disparos.push({ ang, vel });
    return ok;
  };
  window.__tintas = [];
  const add = s.add.sprite.bind(s.add);
  s.add.sprite = (...a) => {
    const sp = add(...a);
    queueMicrotask(() => sp.getData('tinta') && window.__tintas.push(sp.getData('tinta')));
    return sp;
  };
});

if (!SO || SO === 'cacador') {
  // ── A LULA ──
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.ship.setPosition(60, 108);
    s.enemies.spawn('cacador', 108);
  });
  await espera(200);
  const escondida = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'cacador');
    const hp = e.getData('hp');
    const r = s.ferirInimigo(e, 5, 'probe', { x: e.x - 30, y: e.y });
    return { fase: e.getData('elite').fase, visivel: e.visible, corpo: e.body.enable, r, perdeu: hp - e.getData('hp'), x: e.x };
  });
  conferir(escondida.fase === 'escondido' && !escondida.visivel && !escondida.corpo && escondida.r === 'bloqueado' && escondida.perdeu === 0 && escondida.x >= 220, 'escondida: invisível, sem corpo, intocável (até a bomba) e já num posto da metade direita', escondida);

  await esperaFase('cacador', 'mira');
  const mira = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'cacador');
    return { visivel: e.visible, corpo: e.body.enable, textura: e.texture.key };
  });
  conferir(mira.visivel && mira.corpo, 'surgiu: visível e com corpo na MIRA', mira);

  await esperaFase('cacador', 'trava');
  await page.evaluate(() => window.__game.scene.getScene('Game').ship.setPosition(60, 40)); // sai da linha depois da trava
  await esperaFase('cacador', 'some');
  const rajada = await page.evaluate(() => window.__disparos);
  const angs = rajada.map((d) => d.ang.toFixed(3));
  conferir(rajada.length === 3 && new Set(angs).size === 1, 'a rajada: 3 agulhas, TODAS na linha travada (a nave saiu e elas não seguiram)', rajada);
  const agulhas = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemyBullets.getChildren().filter((b) => b.active && b.texture.key === 'eliteTiroAgulha').length);
  conferir(agulhas >= 1, 'as agulhas têm a arte dela', agulhas);
  await espera(100);
  const t1 = await page.evaluate(() => [...window.__tintas]);
  conferir(t1[0] === 'sopro', 'o 1º sumiço solta o SOPRO', t1);

  // Morta na MIRA: não atira.
  await esperaFase('cacador', 'mira', 6000);
  const morta = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    window.__disparos = [];
    const e = s.enemies.enemies.getChildren().find((x) => x.getData('kind') === 'cacador');
    s.ferirInimigo(e, 99, 'probe');
    return e.active;
  });
  await espera(900);
  const depois = await page.evaluate(() => window.__disparos.length);
  conferir(!morta && depois === 0, 'morta na mira, ela não atira', { viva: morta, disparos: depois });

  // Os 3 sumiços: sopro, sopro, CORTINA — e depois ela vai embora sem pontos.
  await page.evaluate(() => {
    window.__tintas = [];
    const s = window.__game.scene.getScene('Game');
    s.ship.setPosition(40, 200);
    s.enemies.spawn('cacador', 100);
  });
  await page.waitForFunction(() => !window.__game.scene.getScene('Game').enemies.enemies.getChildren().some((x) => x.active && x.getData('kind') === 'cacador'), null, { timeout: 15000 });
  const tintas = await page.evaluate(() => window.__tintas);
  conferir(JSON.stringify(tintas) === JSON.stringify(['sopro', 'sopro', 'cortina']), 'a tinta dos 3 sumiços: sopro, sopro, CORTINA — e ela vai embora', tintas);

  // A tinta: depth entre os inimigos e os tiros/nave.
  const camadas = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.enemies.spawn('cacador', 100);
    const e = s.enemies.enemies.getChildren().find((x) => x.active && x.getData('kind') === 'cacador');
    return { inimigo: e.depth, nave: s.ship.depth, tiro: s.enemies.enemyBullets.getChildren()[0]?.depth, tiroNave: s.weapons.bullets.getChildren()[0]?.depth };
  });
  conferir(camadas.inimigo < 0.5 && camadas.nave > 0.5 && camadas.tiro > 0.5 && (camadas.tiroNave ?? 1) > 0.5, 'a tinta (0,5) fica por cima dos inimigos e por baixo da nave e de todo tiro', camadas);

  // O RABO: viva, ela some de vez, sem pontos.
  const rabo = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const antes = s.totalScore();
    s.enemies.aoRabo();
    return { viva: s.enemies.enemies.getChildren().some((x) => x.active && x.getData('kind') === 'cacador'), pontos: s.totalScore() - antes };
  });
  conferir(!rabo.viva && rabo.pontos === 0, 'o rabo chega: a lula some de vez, sem pontos', rabo);
}

if (!SO || SO === 'tentaculo') {
  // ── A SERPENTE DO CASCO, no posto do Tentáculo (o casco revelado, como no ato 2), no relógio manual ──
  await page.evaluate(() => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    s.parallax.setNebulaDensity(0, 0);
    s.parallax.revealCasco(1, 0);
    s.enemies.enemyBullets.getChildren().forEach((b) => b.active && s.enemies.release(b));
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
    window.__step = (n = 1) => {
      for (let i = 0; i < n; i++) {
        window.__passo.t += 1000 / 60;
        g.step(window.__passo.t, 1000 / 60);
      }
    };
    // Passa quadro a quadro até `fn` devolver algo (ou `max` quadros).
    window.__ate = (fn, max = 600) => {
      for (let i = 0; i < max; i++) {
        const r = fn();
        if (r) return r;
        window.__step(1);
      }
      return null;
    };
    window.__tent = () => s.enemies.enemies.getChildren().find((x) => x.active && x.getData('kind') === 'tentaculo');
    window.__disparos = [];
    window.__step(2);
    s.ship.setPosition(100, 100);
    s.enemies.spawn('tentaculo', 100);
  });
  // Os espinhos, com a posição e o instante de cada um (o contador lá de cima só guarda rumo e velocidade).
  await page.evaluate(() => {
    const t = window.__game.scene.getScene('Game').enemies.tiros;
    const orig = t.disparar.bind(t);
    window.__esp = [];
    t.disparar = (x, y, ang, vel, vestir) => {
      window.__esp.push({ x, y, ang, vel, t: window.__passo.t });
      return orig(x, y, ang, vel, vestir);
    };
  });
  const T = ELITES.tentaculo;
  const t0 = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const e = window.__tent();
    const st = e.getData('elite');
    const hp = e.getData('hp');
    const placas = s.children.list.filter((o) => o.texture?.key?.startsWith('casco') && o.depth < -1).map((o) => o.depth);
    const r = s.ferirInimigo(e, 5, 'probe', { x: e.x - 20, y: e.y });
    return { fase: st.fase, x: e.x, y: e.y, depth: e.depth, placa: Math.min(...placas), corpo: e.body.enable, r, perdeu: hp - e.getData('hp') };
  });
  conferir(t0.fase === 'sobe' && t0.x === 100 + T.distNave && t0.y > T.cristaY + 40 && !t0.corpo && t0.r === 'bloqueado' && t0.perdeu === 0, 'SOBE: nasce sumida no casco, à frente da nave, e lá dentro é intocável', t0);
  conferir(t0.depth < t0.placa, 'ela fica ATRÁS das placas do casco: quem a corta é a beirada real da placa (sem fresta)', t0);

  const dePe = await page.evaluate(() =>
    window.__ate(() => {
      const s = window.__game.scene.getScene('Game');
      const e = window.__tent();
      const st = e.getData('elite');
      if (st.fase !== 'balanca1' || st.t < 0.2) return null;
      const hp = e.getData('hp');
      const r = s.ferirInimigo(e, 1, 'probe', { x: e.x - 20, y: e.y });
      s.enemies.empurrar(e, 30);
      return { x: e.x, y: e.y, base: e.body.bottom, corpo: e.body.enable, r, perdeu: hp - e.getData('hp'), vel: s.enemies.velChao };
    }),
  );
  conferir(dePe && dePe.y === T.cristaY && dePe.corpo && dePe.base <= T.cristaY && dePe.r === 'vivo' && dePe.perdeu === 1, 'BALANÇA: de pé, o pivô na crista, a hitbox toda acima dela — a janela para feri-la', dePe);
  const parada = await page.evaluate(() => {
    window.__step(12);
    return window.__tent().x;
  });
  conferir(parada === dePe.x && dePe.vel > 0, 'fica PARADA na tela com o casco correndo, e o tranco não a arrasta', { x: parada, antes: dePe.x, vel: dePe.vel });

  const esp = await page.evaluate(() => window.__ate(() => window.__tent().getData('elite').fase === 'balanca2' && window.__esp));
  // A distância (com sinal) da nave à linha de cada espinho: o vão é a nave ficar ENTRE os dois trios.
  const lado = (e) => (100 - e.x) * -Math.sin(e.ang) + (100 - e.y) * Math.cos(e.ang);
  const tempos = [...new Set((esp ?? []).map((e) => e.t))];
  const trios = tempos.map((t) => esp.filter((e) => e.t === t).map(lado));
  conferir(esp?.length === 6 && tempos.length === 2 && trios.every((t) => t.length === 3) && esp.every((e) => e.ang === esp[0].ang && e.vel === T.velEspinho), 'ESPINHOS: 2 trios (sem o do meio), retos e paralelos', esp);
  conferir(tempos.length === 2 && Math.abs((tempos[1] - tempos[0]) / 1000 - T.trioAtrasoS) < 0.03, 'o 2º trio sai com atraso depois do 1º', tempos);
  conferir(trios.length === 2 && Math.max(...trios[0]) * Math.min(...trios[1]) < 0 && trios.flat().every((d) => Math.abs(d) >= 14), 'o VÃO: a nave parada fica entre os dois trios (≥14px de cada lado)', trios);

  const bote = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const st = () => window.__tent().getData('elite');
    const antes = window.__ate(() => st().fase === 'bote' && { boca: st().boca.body.enable });
    const pico = window.__ate(() => st().boca.body.enable && st().t > 0.8 && { x: st().boca.x, y: st().boca.y });
    window.__step(1);
    const morde = s.physics.overlap(s.ship, st().boca);
    s.ship.setPosition(60, 48); // a nave desvia
    window.__step(1);
    const desviou = !s.physics.overlap(s.ship, st().boca);
    const depois = window.__ate(() => st().fase === 'balanca3' && { boca: st().boca.body.enable });
    return { antes, pico, morde, desviou, depois };
  });
  conferir(bote.antes && !bote.antes.boca && bote.depois && !bote.depois.boca, 'BOTE: a boca só existe enquanto a cabeça está lançada (o recuo é o aviso)', bote);
  conferir(bote.pico && Math.hypot(bote.pico.x - 100, bote.pico.y - 100) < 12 && bote.morde && bote.desviou, 'o bote FERE: a boca chega onde a nave estava; quem saiu de lá não é mordido', bote);

  const fim = await page.evaluate(() => {
    const t0 = window.__passo.t;
    const foi = window.__ate(() => !window.__tent(), 300);
    return { foi: !!foi, corpos: window.__game.scene.getScene('Game').enemies.corposElite.countActive(true), s: (window.__passo.t - t0) / 1000 };
  });
  conferir(fim.foi && fim.corpos === 0 && fim.s < 1.2, 'um ciclo por aparição: balança, afunda e vai embora, sem deixar a boca para trás', fim);
  await page.evaluate(() => window.__game.loop.wake());
}

conferir(erros.length === 0, 'sem erros no console', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
