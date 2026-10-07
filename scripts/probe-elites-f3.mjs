// OS ELITES DA F3 NO JOGO REAL (spec 2026-10-06-frente-b-fatia-f3-design.md §7, com a emenda de 07/10).
// Uso: node scripts/probe-elites-f3.mjs [cacador|tentaculo]  (com `npm run dev` rodando). Sandbox, fase 3, invulnerável.
// O Tentáculo roda no RELÓGIO MANUAL (1/60 s por passo, como o `_gif.mjs`): o bote dura 0,7s, e no software renderer
// uma ida e volta do playwright demora mais que isso.
import { chromium } from 'playwright';

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
  // ── O TENTÁCULO (o casco revelado, como no ato 2), no relógio manual ──
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
  const t0 = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const e = window.__tent();
    const st = e.getData('elite');
    const hp = e.getData('hp');
    const r = s.ferirInimigo(e, 5, 'probe', { x: e.x - 20, y: e.y });
    return { fase: st.fase, racha: st.racha.x, vel: s.enemies.velChao, r, perdeu: hp - e.getData('hp') };
  });
  conferir(t0.fase === 'aviso1' && t0.racha > 100 + 40 && t0.r === 'bloqueado' && t0.perdeu === 0, 'AVISO 1: a rachadura nasce À FRENTE da nave, e a cabeça dentro do casco é intocável', t0);
  const t1 = await page.evaluate(() => {
    window.__step(24);
    return window.__tent().getData('elite').racha.x;
  });
  conferir(Math.abs(t1 - t0.racha + t0.vel * 0.4) < 2, 'a rachadura ANDA COM O CHÃO (a regra do casco)', { andou: t1 - t0.racha, esperado: -t0.vel * 0.4 });

  const bote0 = await page.evaluate(() =>
    window.__ate(() => {
      const st = window.__tent().getData('elite');
      return st.fase === 'bote' && { racha: st.racha.x, nave: window.__game.scene.getScene('Game').ship.x, alvo: st.alvo };
    }),
  );
  conferir(Math.abs(bote0.racha - bote0.nave) < 12 && Math.abs(bote0.alvo.x - 100) < 1 && Math.abs(bote0.alvo.y - 100) < 1, 'no fim do aviso a rachadura chegou SOB a nave, e o bote vai aonde ela estava', bote0);
  const bote = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.ship.setPosition(40, 30); // a nave desvia
    return window.__ate(() => {
      const e = window.__tent();
      const st = e.getData('elite');
      if (st.fase !== 'bote' || st.t < 0.5) return null;
      const gomosFora = st.gomos.filter((g) => g.visible && g.body.enable).length;
      const hp = e.getData('hp');
      const r = s.ferirInimigo(e, 1, 'probe', { x: e.x - 20, y: e.y });
      return { x: e.x, y: e.y, gomosFora, r, perdeu: hp - e.getData('hp') };
    });
  });
  conferir(bote && Math.hypot(bote.x - 100, bote.y - 100) < 20 && bote.gomosFora >= 4 && bote.r === 'vivo' && bote.perdeu === 1, 'o BOTE: a cabeça chega ao ponto (não persegue), o corpo sai atrás, e a cabeça exposta é ferida', bote);

  const pausa = await page.evaluate(() =>
    window.__ate(() => {
      const e = window.__tent();
      if (e.getData('elite').fase !== 'pausa') return null;
      const s = window.__game.scene.getScene('Game');
      return { visivel: e.visible, corpo: e.body.enable, gomos: s.enemies.corposElite.getChildren().filter((g) => g.visible).length };
    }),
  );
  conferir(pausa && !pausa.visivel && !pausa.corpo && pausa.gomos === 0, 'depois do MERGULHO por trás do casco: sumiu inteiro', pausa);

  const av2 = await page.evaluate(() =>
    window.__ate(() => {
      const st = window.__tent().getData('elite');
      return st.fase === 'aviso2' && { racha: st.racha.x, nave: window.__game.scene.getScene('Game').ship.x };
    }),
  );
  conferir(av2 && av2.racha - av2.nave >= 140, 'AVISO 2: a rachadura LONGE da nave (≥140px à frente)', av2);

  // De pé: a nave na altura dos GOMOS atira — o corpo absorve, a cabeça não perde vida.
  const dePe = await page.evaluate(() =>
    window.__ate(() => {
      const s = window.__game.scene.getScene('Game');
      const e = window.__tent();
      const st = e.getData('elite');
      if (st.fase !== 'segura') return null;
      const g = st.gomos[4];
      s.ship.setPosition(Math.max(20, g.x - 90), g.y);
      return { hp: e.getData('hp'), bloq: s.medidas.resumo().bloqueados.tiro ?? 0, raiz: st.raizX, cabeca: e.x, bolinhas: window.__disparos.length };
    }),
  );
  await page.keyboard.down('Space');
  await page.evaluate(() => window.__step(21));
  await page.keyboard.up('Space');
  const absorveu = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    return { hp: window.__tent()?.getData('hp'), bloq: s.medidas.resumo().bloqueados.tiro ?? 0 };
  });
  conferir(absorveu.hp === dePe.hp && absorveu.bloq > dePe.bloq, 'os GOMOS absorvem o tiro sem dano (só a cabeça fere e é ferida)', { antes: dePe, depois: absorveu });
  conferir(dePe.bolinhas === 6 && Math.abs(dePe.cabeca - dePe.raiz) < 2, 'a MEIA-LUA: 6 tiros; a torre fica rígida sobre a raiz que rola', dePe);
  const bolinhas = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemyBullets.getChildren().filter((b) => b.active && b.texture.key === 'eliteTiroBolinha').map((b) => Math.round(b.body.velocity.y)));
  conferir(bolinhas.length > 0 && bolinhas.every((vy) => vy < 0), 'as bolinhas da meia-lua sobem (cobrem área, não miram)', bolinhas);

  const fim = await page.evaluate(() => {
    const foi = window.__ate(() => !window.__tent(), 300);
    return { foi: !!foi, gomos: window.__game.scene.getScene('Game').enemies.corposElite.countActive(true) };
  });
  conferir(fim.foi && fim.gomos === 0, 'um ciclo por aparição: afunda e vai embora, sem deixar gomo para trás', fim);
  await page.evaluate(() => window.__game.loop.wake());
}

conferir(erros.length === 0, 'sem erros no console', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
