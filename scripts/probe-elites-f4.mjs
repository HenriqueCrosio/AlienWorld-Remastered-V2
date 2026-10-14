// THE F4 ELITES IN THE REAL GAME (spec 2026-10-12-frente-b-fatia-f4-design.md §7): the Larva (hole, posts inside the
// gap, pupae, flies) and the Tube (rooted on the wall, the spores). Sandbox, stage 4, untouchable ship.
// Every cycle is watched FROM INSIDE the page, frame by frame (the lesson of the squid's probe). Points are read from
// `s.score` (the kills): `totalScore()` also adds 10 per second of clock, which is not what is being asked here.
//   node scripts/probe-elites-f4.mjs   (npm run dev running)
import { chromium } from 'playwright';
import { ELITES } from '../src/data/numerosElites.ts';

const L = ELITES.larva, T = ELITES.tubo;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.addInitScript(() => {
  localStorage.setItem('alienworld.sandbox', JSON.stringify({
    fase: 4, repetir: false, intervalo: 999,
    inimigos: { drone: 0, batedor: 0, canhoneira: 0, kamikaze: 0, cargueiro: 0, aguaViva: 0, aranha: 0, droneMineracao: 0, sentinela: 0, cacador: 0, larva: 0, tubo: 0, mosca: 0 },
  }));
});
await page.goto('http://localhost:5173/?sandbox', { waitUntil: 'networkidle' });
await page.waitForSelector('#sandbox:not([hidden]) .no', { timeout: 30000 });
await page.click('button[data-acao="jogar"]');
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').arena, null, { timeout: 30000 });
await page.keyboard.press('Digit3'); // untouchable

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const espera = (ms) => page.waitForTimeout(ms);
const semTipo = (kind, ms) =>
  page.waitForFunction((kind) => !window.__game.scene.getScene('Game').enemies.enemies.getChildren().some((x) => x.active && x.getData('kind') === kind), kind, { timeout: ms });

// Counts what is BORN (by kind), the shots, and the holes (images with `data.buraco`).
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__nascidos = [];
  const spawn = s.enemies.spawn.bind(s.enemies);
  s.enemies.spawn = (kind, y, x) => {
    const e = spawn(kind, y, x);
    window.__nascidos.push(kind);
    return e;
  };
  window.__esporos = [];
  const soltar = s.esporos.soltar.bind(s.esporos);
  s.esporos.soltar = (x, y, solta) => {
    window.__esporos.push({ x, y, ...solta });
    return soltar(x, y, solta);
  };
  window.__buracos = [];
  const image = s.add.image.bind(s.add);
  s.add.image = (...a) => {
    const im = image(...a);
    queueMicrotask(() => {
      if (!im.getData('buraco')) return;
      window.__buracos.push(im);
      im.__nasceu = { x: im.x, y: im.y, chao: s.moldura.superficieChaoEm(im.x), teto: s.moldura.superficieTetoEm(im.x) };
    });
    return im;
  };
  window.__um = (kind) => s.enemies.enemies.getChildren().find((x) => x.active && x.getData('kind') === kind);
});

{
  // ── THE LARVA: the whole cycle, watched from inside ──
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.ship.setPosition(60, 108);
    window.__nascidos = [];
    const antes = s.score;
    s.enemies.spawn('larva', 100);
    const e = window.__um('larva');
    const V = (window.__larva = { fases: [], postos: [], pupasNoPoe: [], foraDoVao: 0, cruzou: 0, pontos: null, textura: null, abre: null });
    const st0 = e.getData('elite');
    V.abre = { fase: st0.fase, visivel: e.visible, corpo: e.body.enable, r: s.ferirInimigo(e, 5, 'probe', { x: e.x - 30, y: e.y }), hp: e.getData('hp'), buracos: s.children.list.filter((o) => o.getData && o.getData('buraco')).length };
    const olhar = () => {
      if (!e.active) {
        V.pontos = s.score - antes;
        s.events.off('postupdate', olhar);
        return;
      }
      const st = e.getData('elite');
      if (V.fases.at(-1) !== st.fase) {
        V.fases.push(st.fase);
        if (st.fase === 'poe') {
          const m = s.moldura;
          V.postos.push({ x: e.x, y: e.y, teto: m.superficieTetoEm(e.x), chao: m.superficieChaoEm(e.x) });
        }
        if ((st.fase === 'tranco' && V.fases.includes('poe')) || st.fase === 'perfura') V.pupasNoPoe.push(window.__nascidos.filter((k) => k === 'pupa').length);
        if (st.fase === 'poe' && !V.textura) V.textura = e.texture.key;
      }
      // Flying free she never enters the ship's half; tied to a hole (`ancora`) she rides the wall, which scrolls (§9.5).
      if (e.visible && !st.ancora && e.x < 200) V.cruzou++;
      if (st.ancora && e.visible) V.presaMinX = Math.min(V.presaMinX ?? 999, e.x);
    };
    s.events.on('postupdate', olhar);
  });
  await page.waitForFunction(() => window.__larva.pontos !== null, null, { timeout: 15000 });
  const V = await page.evaluate(() => window.__larva);
  conferir(V.abre.fase === 'abre' && !V.abre.visivel && !V.abre.corpo && V.abre.r === 'bloqueado' && V.abre.hp === L.hp && V.abre.buracos === 1, 'antes de sair: só o BURACO existe — ela invisível, sem corpo, intocável', V.abre);
  conferir(JSON.stringify(V.fases) === JSON.stringify(['abre', 'sai', 'tranco', 'poe', 'tranco', 'poe', 'tranco', 'poe', 'tranco', 'perfura', 'mergulha']), 'o ciclo: buraco, sai, tranco ao 1º posto, 3 paradas, tranco à superfície, perfura, mergulha (§9.5)', V.fases);
  conferir(V.postos.length === 3 && V.postos.every((p) => p.x >= L.postoX[0] && p.x <= L.postoX[1] && p.y >= p.teto + L.postoMargem - 1 && p.y <= p.chao - L.postoMargem + 1), 'os 3 postos: na metade direita e DENTRO do vão', V.postos);
  conferir(V.postos.slice(1).every((p, k) => Math.abs(p.y - V.postos[k].y) >= L.postoDistY - 1), 'o ziguezague: cada posto longe da altura do anterior', V.postos.map((p) => p.y));
  conferir(V.cruzou === 0, 'voando solta, ela nunca cruza para o lado da nave', V.cruzou);
  conferir(V.presaMinX >= ELITES.buraco.colunas[0] - 84 * (L.trancoS + L.perfuraS + L.mergulhaS) - 8, 'presa a um buraco, ela só anda com a parede (sai e mergulha na metade direita)', V.presaMinX);
  conferir(JSON.stringify(V.pupasNoPoe) === JSON.stringify([2, 4, 6, 6]), `${L.pupasPorParada} pupas por parada`, V.pupasNoPoe);
  conferir(V.pontos === 0, 'mergulhou viva: sem pontos', V.pontos);
  conferir(V.textura.startsWith('eliteLarvaAPoeAnim'), 'a 1ª Larva é a variação A', V.textura);

  // The two holes (arrival, exit) open and go away by themselves.
  const nBuracos = await page.evaluate(() => window.__buracos.length);
  await espera(1600);
  const vivos = await page.evaluate(() => window.__buracos.filter((b) => b.active).length);
  conferir(nBuracos === 2 && vivos === 0, 'dois buracos (chegada e saída), e a cicatriz some', { nBuracos, vivos });
  const lugares = await page.evaluate(() => window.__buracos.map((b) => b.__nasceu));
  conferir(lugares.length >= 2 && lugares.every((l) => l.y >= l.chao || l.y <= l.teto), 'todo buraco nasce NA BORDA (dentro da faixa do chão ou do teto), nunca no meio do vão (§9.5)', lugares);

  // The pupae left alone hatch into flies, which chase the ship.
  await page.waitForFunction(() => window.__nascidos.filter((k) => k === 'mosca').length >= 6, null, { timeout: 6000 });
  const moscas = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const m = s.enemies.enemies.getChildren().filter((x) => x.active && x.getData('kind') === 'mosca');
    return { pupas: window.__nascidos.filter((k) => k === 'pupa').length, moscas: window.__nascidos.filter((k) => k === 'mosca').length, indo: m.every((x) => x.body.velocity.x < 0), hp: m[0]?.getData('hp') };
  });
  conferir(moscas.pupas === 6 && moscas.moscas === 6 && moscas.indo && moscas.hp === 1, 'deixadas, as pupas viram MOSCAS que voam para a nave (1 de vida)', moscas);
  await page.keyboard.press('Digit2'); // clear
  await espera(200);

  // A pupa that is shot does not become a fly.
  const tiro = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    window.__nascidos = [];
    const antes = s.score;
    const p = s.enemies.spawn('pupa', 100, 250);
    const r = s.ferirInimigo(p, 1, 'probe');
    return { r, pontos: s.score - antes };
  });
  await espera(2600);
  const depois = await page.evaluate(() => window.__nascidos.filter((k) => k === 'mosca').length);
  conferir(tiro.r === 'morto' && tiro.pontos === ELITES.pupa.score && depois === 0, 'a pupa atirada morre com 1 tiro e NÃO vira mosca (o ciclo cortado)', { ...tiro, moscas: depois });

  // The hole rides its surface (the border here: the sandbox has no tables).
  const sup = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    s.enemies.spawn('larva', 100);
    await new Promise((r) => setTimeout(r, 100));
    const b = window.__buracos.at(-1);
    const xMundo = s.moldura.mundoDe(b.x);
    await new Promise((r) => setTimeout(r, 300));
    const textura = window.__um('larva').texture.key;
    return { desvio: Math.abs(b.x - Math.round(s.moldura.telaDe(xMundo))), andou: b.__nasceu.x - b.x, textura };
  });
  conferir(sup.desvio <= 1 && sup.andou > 15, 'o buraco anda com a borda onde abriu', sup);
  conferir(sup.textura.startsWith('eliteLarvaD'), 'a 2ª Larva é a variação D (as duas alternam)', sup.textura);

  // Killed while drilling: the exit hole still closes.
  await page.waitForFunction(() => window.__um('larva')?.getData('elite').fase === 'perfura', null, { timeout: 8000 });
  const morta = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const antes = s.score;
    const r = s.ferirInimigo(window.__um('larva'), 99, 'probe');
    return { r, pontos: s.score - antes };
  });
  await espera(1600);
  const restam = await page.evaluate(() => window.__buracos.filter((b) => b.active).length);
  conferir(morta.r === 'morto' && morta.pontos === L.score && restam === 0, 'morta perfurando: vale os pontos, e o buraco aberto fecha', { ...morta, restam });
  await page.keyboard.press('Digit2');
  await espera(200);
}

{
  // ── THE TUBE on the FLOOR: rooted, rolling with the wall, two pulses ──
  await page.evaluate((afunda) => {
    const s = window.__game.scene.getScene('Game');
    s.ship.setPosition(60, 108);
    window.__esporos = [];
    s.enemies.spawn('tubo', 190);
    const e = window.__um('tubo');
    const V = (window.__tubo = { desvio: 0, amostras: 0, salvas: [], fases: [e.getData('elite').fase], x0: null, textura: null, fim: false, teto: e.getData('elite').teto, esperando: { visivel: e.visible, corpo: e.body.enable, r: s.ferirInimigo(e, 5, 'probe') } });
    let vistos = 0;
    const olhar = () => {
      if (!e.active) {
        V.fim = true;
        s.events.off('postupdate', olhar);
        return;
      }
      const st = e.getData('elite');
      if (V.fases.at(-1) !== st.fase) V.fases.push(st.fase);
      if (st.fase === 'aguarda') return;
      if (V.x0 === null) { V.x0 = e.x; V.textura = e.texture.key; }
      if (e.x >= -40) {
        V.desvio = Math.max(V.desvio, Math.abs(e.y - (s.moldura.superficieChaoEm(e.x) + afunda)));
        V.amostras++;
      }
      if (window.__esporos.length > vistos) {
        V.salvas.push(window.__esporos.slice(vistos));
        vistos = window.__esporos.length;
      }
    };
    s.events.on('postupdate', olhar);
  }, T.afunda);
  await page.waitForFunction(() => window.__tubo.fim, null, { timeout: 20000 });
  const V = await page.evaluate(() => window.__tubo);
  conferir(!V.teto && !V.esperando.visivel && !V.esperando.corpo && V.esperando.r === 'bloqueado', 'esperando lugar na parede: fora da tela, invisível, intocável', V.esperando);
  conferir(V.x0 > 384 + 18 && V.amostras > 60 && V.desvio === 0, `plantado fora da tela e, a passagem inteira, o pé na linha da parede (${T.afunda}px dentro)`, { x0: V.x0, amostras: V.amostras, desvio: V.desvio });
  conferir(JSON.stringify(V.fases) === JSON.stringify(['aguarda', 'rola', 'incha', 'pulsa', 'rola', 'incha', 'pulsa', 'rola']), 'rola → incha → pulsa, duas vezes', V.fases);
  const [s1 = [], s2 = []] = V.salvas;
  conferir(V.salvas.length === 2 && s1.length === T.esporosN && s2.length === T.esporosN, `2 pulsos de ${T.esporosN} esporos`, V.salvas.map((s) => s.length));
  const cone = (ELITES.esporo.coneGraus * Math.PI) / 180;
  conferir([...s1, ...s2].every((d) => Math.abs(d.ang + Math.PI / 2) <= cone + 1e-6), `a nuvem do chão SOBE, num cone de ±${ELITES.esporo.coneGraus}°`, s1.map((d) => d.ang.toFixed(2)));
  const alturas = [...s1, ...s2].map((d) => (d.vel * d.freiaS) / 2);
  conferir(Math.max(...alturas) - Math.min(...alturas) > 15 && new Set([...s1, ...s2].map((d) => d.atrasoS.toFixed(3))).size > T.esporosN, 'orgânica: cada esporo para numa altura e sai no seu instante (não é um arco)', alturas.map((a) => a.toFixed(0)));
  conferir(V.textura.startsWith('eliteTuboCPulsoAnim'), 'o 1º Tubo é a variação C', V.textura);

  // ── On the CEILING: flipped, the ring opens downwards; and the 2nd Tube is variation D ──
  const teto = await page.evaluate(async (afunda) => {
    const s = window.__game.scene.getScene('Game');
    window.__esporos = [];
    s.enemies.spawn('tubo', 30);
    const e = window.__um('tubo');
    await new Promise((ok) => {
      const olhar = () => { if (e.getData('elite').fase === 'pulsa' || !e.active) { s.events.off('postupdate', olhar); ok(); } };
      s.events.on('postupdate', olhar);
    });
    return { teto: e.getData('elite').teto, flipY: e.flipY, desvio: Math.abs(e.y - (s.moldura.superficieTetoEm(e.x) - afunda)), textura: e.texture.key, angs: window.__esporos.map((d) => d.ang) };
  }, T.afunda);
  conferir(teto.teto && teto.flipY && teto.desvio === 0 && teto.angs.length === T.esporosN && teto.angs.every((a) => Math.sin(a) > 0), 'no TETO: espelhado, o pé na linha do teto, a nuvem DESCE', teto);
  conferir(teto.textura.startsWith('eliteTuboDPulsoAnim'), 'o 2º Tubo é a variação D (as duas alternam)', teto.textura);
  await page.keyboard.press('Digit2');
  await espera(200);

  // ── The root foot: born with the plant, under the Tube, on the surface line ──
  const pe = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    s.enemies.spawn('tubo', 190);
    await new Promise((ok) => {
      const olhar = () => { const e = window.__um('tubo'); if (!e || e.getData('elite').fase !== 'aguarda') { s.events.off('postupdate', olhar); ok(); } };
      s.events.on('postupdate', olhar);
    });
    await new Promise((r) => setTimeout(r, 200));
    const e = window.__um('tubo'), p = e.getData('elite').pe;
    return { tem: !!p?.active, dx: Math.abs(p.x - e.x), dy: Math.abs(p.y - s.moldura.superficieChaoEm(e.x)), textura: p.texture.key, frente: p.depth > e.depth };
  });
  conferir(pe.tem && pe.dx === 0 && pe.dy === 0 && pe.textura.startsWith('eliteTuboPe') && pe.frente, 'o Tubo tem o PÉ DE RAÍZES: colado nele, na linha da superfície, na frente (§9.4)', pe);
  await page.keyboard.press('Digit2');
  await espera(200);

  // ── The spore: no damage, the ship slows down (renews, never stacks); the shot goes through it ──
  const lento = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    const vidas = s.lives;
    s.esporos.soltar(s.ship.x, s.ship.y, { ang: 0, vel: 0, freiaS: 1, atrasoS: 0 });
    await new Promise((r) => setTimeout(r, 120));
    const ate1 = s.lentaAte;
    const max = s.ship.body.maxVelocity.x;
    s.esporos.soltar(s.ship.x, s.ship.y, { ang: 0, vel: 0, freiaS: 1, atrasoS: 0 });
    await new Promise((r) => setTimeout(r, 120));
    return { vidas: s.lives - vidas, lenta: s.lentaAte > s.time.now, max, renovou: s.lentaAte > ate1, dura: s.lentaAte - s.time.now };
  });
  conferir(lento.vidas === 0 && lento.lenta && Math.abs(lento.max - 110 * ELITES.lentidao.velocidade) < 0.5, `o esporo NÃO fere: a nave fica lenta (${ELITES.lentidao.velocidade * 100}% do teto)`, lento);
  conferir(lento.renovou && lento.dura <= ELITES.lentidao.duracaoS * 1000, 'outro esporo RENOVA a lentidão, sem somar', lento);
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return s.time.now > s.lentaAte + 100; }, null, { timeout: 5000 });
  const voltou = await page.evaluate(() => window.__game.scene.getScene('Game').ship.body.maxVelocity.x);
  conferir(Math.abs(voltou - 110) < 0.5, 'acabou a lentidão: o teto volta ao normal', voltou);
  // A spore in front of the ship, the trigger held for 0.4 s: the bullets go through and it lives on.
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.esporos.soltar(s.ship.x + 150, s.ship.y, { ang: 0, vel: 0, freiaS: 1, atrasoS: 0 });
    window.__alvoEsporo = s.esporos.grupo.getChildren().at(-1);
  });
  await page.keyboard.down('Space');
  await espera(400);
  const atravessa = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    return { vivo: window.__alvoEsporo.active, alfa: window.__alvoEsporo.alpha, tiros: s.weapons.bullets.countActive(true) };
  });
  await page.keyboard.up('Space');
  conferir(atravessa.tiros > 0 && atravessa.vivo && atravessa.alfa > 0.5, 'o tiro ATRAVESSA o esporo (ele não se destrói)', atravessa);

  // ── Killed while swelling: it does not pulse ──
  await page.evaluate(() => {
    window.__esporos = [];
    window.__game.scene.getScene('Game').enemies.spawn('tubo', 190);
  });
  await page.waitForFunction(() => window.__um('tubo')?.getData('elite').fase === 'incha', null, { timeout: 15000 });
  const morto = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const antes = s.score;
    const r = s.ferirInimigo(window.__um('tubo'), 99, 'probe');
    return { r, pontos: s.score - antes };
  });
  await espera(1200);
  const tiros = await page.evaluate(() => window.__esporos.length);
  conferir(morto.r === 'morto' && morto.pontos === T.score && tiros === 0, 'morto enquanto incha, ele não pulsa', { ...morto, tiros });
}

conferir(erros.length === 0, 'sem erros no console', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
