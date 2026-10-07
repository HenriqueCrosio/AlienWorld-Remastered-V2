// OS ELITES DA F3 NO JOGO REAL (spec 2026-10-06-frente-b-fatia-f3-design.md §7, com a emenda de 07/10).
// Uso: node scripts/probe-elites-f3.mjs [cacador|tentaculo]  (com `npm run dev` rodando). Sandbox, fase 3, invulnerável.
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
const faseDe = (kind) =>
  page.evaluate((k) => window.__game.scene.getScene('Game').enemies.enemies.getChildren().find((x) => x.active && x.getData('kind') === k)?.getData('elite')?.fase, kind);
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

conferir(erros.length === 0, 'sem erros no console', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
