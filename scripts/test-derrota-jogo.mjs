// BLOCK M3 (15/11) — the SHIP LOST window IN THE GAME (spec `specs/2026-11-15-bloco-m3-nave-perdida-design.md`):
//   janela   — the death opens it over the frozen stage; the score, the record, the medal; the old screen is not used;
//   tiro     — the fire key held through the death does not retry; a new press does, from the score of the stage entry;
//   config   — SETTINGS opens the big window and ESC comes back to the scoreboard; nothing resumes the dead stage;
//   sair     — QUIT and ESC go to the main menu; the blur does not open a pause over it;
//   controle — a simulated controller: the bottom button retries, the right one goes to the menu.
//   npm run dev  in another terminal, then  node scripts/test-derrota-jogo.mjs [section …]
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const secoes = process.argv.slice(2);
const roda = (s) => !secoes.length || secoes.includes(s);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const erros = [];
async function abrir() {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.addInitScript(() => {
    const pad = { connected: false, id: '', index: 0, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad.connected ? pad : null, null, null, null];
  });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.waitForTimeout(1200);
  return page;
}
const tecla = async (page, ...ks) => { for (const k of ks) { await page.keyboard.press(k); await page.waitForTimeout(160); } };
const ativa = (page, chave, ms = 20000) => page.waitForFunction((k) => window.__game.scene.isActive(k), chave, { timeout: ms }).then(() => true, () => false);
const segurar = (page, i, v) => page.evaluate(([b, on]) => { window.__pad.buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 }; }, [i, v]);
const quadros = (page, n) => page.evaluate((k) => new Promise((ok2) => { const g = window.__game; const alvo = g.loop.frame + k; const olha = () => (g.loop.frame >= alvo ? ok2(null) : setTimeout(olha, 8)); olha(); }), n);
const botao = async (page, ...is) => { for (const i of is) { await segurar(page, i, true); await quadros(page, 2); await segurar(page, i, false); await quadros(page, 2); } };
const ver = (page) => page.evaluate(() => {
  const g = window.__game;
  const p = g.scene.isActive('Pausa') ? g.scene.getScene('Pausa').diagnostico() : null;
  const jogo = g.scene.getScene('Game');
  return {
    janela: !!p, estado: p?.estado ?? null, textos: p?.textos ?? [],
    ativas: g.scene.getScenes(true).map((s) => s.scene.key),
    gamePausada: g.scene.isPaused('Game'), elapsed: jogo?.elapsed ?? null, over: jogo?.over ?? null,
    total: jogo ? jogo.scoreBase + jogo.score : null, base: jogo?.scoreBase ?? null,
    recorde: jogo ? localStorage.getItem(`alienworld:record:${jogo.handling}`) : null,
  };
});
/** stage 2 from the menu, a few seconds of it, then the ship is lost with `pontos` on the board */
async function morrer(page, pontos, recorde, espera = 2500) {
  await tecla(page, 'KeyV');
  await ativa(page, 'Game');
  await page.waitForTimeout(espera);
  return perder(page, pontos, recorde);
}
async function perder(page, pontos, recorde) {
  const final = await page.evaluate(([p, r]) => {
    const s = window.__game.scene.getScene('Game');
    s.damageShip = () => {};
    if (r) localStorage.setItem(`alienworld:record:${s.handling}`, String(r));
    else localStorage.removeItem(`alienworld:record:${s.handling}`);
    s.score = p - s.scoreBase;
    s.gameOver();
    return s.scoreBase + s.score;
  }, [pontos, recorde]);
  return final;
}

if (roda('janela')) {
  const page = await abrir();
  const final = await morrer(page, 1700, 900);
  let v = await ver(page);
  ok(!v.janela && v.over === true, 'the death plays first: no window yet', v.ativas);
  ok(await ativa(page, 'Pausa'), 'at the end of the death the window opens');
  await page.waitForTimeout(500);
  v = await ver(page);
  ok(v.gamePausada && !v.ativas.includes('GameOver'), 'over the stage, frozen on its last frame (the old screen is not used)', v.ativas);
  ok(v.estado?.tela === 'lista' && v.estado.cursor === 0, 'the cursor on TRY AGAIN', v.estado);
  const t = v.textos;
  ok(t.includes('NAVE PERDIDA') && t.includes('a fase 2 continua esperando'), 'the title and the stage', t);
  ok(t.includes('TENTAR DE NOVO') && t.includes('CONFIGURAÇÕES') && t.includes('SAIR PARA O MENU') && !t.includes('CONTINUAR'), 'the three lines, no CONTINUE', t);
  const pontos = t[t.indexOf('PONTOS') + 1];
  ok(Number(pontos) >= final && Number(pontos) >= 1500, `the points of the run (${pontos})`, [final, t]);
  ok(t.includes('★ NOVO RECORDE') && v.recorde === pontos, 'the record was beaten: said and recorded', [v.recorde, t]);
  ok(t.includes('MEDALHA DE PRATA'), 'the silver medal', t);
  const parado = v.elapsed;
  await page.waitForTimeout(700);
  ok((await ver(page)).elapsed === parado, 'the stage clock does not move under it');
  await page.close();

  // below the bronze and below the record
  const p2 = await abrir();
  await morrer(p2, 200, 5000);
  await ativa(p2, 'Pausa');
  await p2.waitForTimeout(400);
  v = await ver(p2);
  ok(v.textos.includes('RECORDE') && !v.textos.includes('★ NOVO RECORDE') && v.textos.includes('5000') && v.recorde === '5000', 'no record: the old one is shown and kept', v.textos);
  ok(!v.textos.some((s) => s.includes('MEDALHA')), 'no medal: the row does not exist', v.textos);
  await p2.close();
}

if (roda('tiro')) {
  const page = await abrir();
  await tecla(page, 'KeyV');
  await ativa(page, 'Game');
  await page.waitForTimeout(2500);
  // the fire key goes down BEFORE the death and stays down through it
  await page.keyboard.down('Space');
  await perder(page, 800, 0);
  await ativa(page, 'Pausa');
  await page.waitForTimeout(1200);
  let v = await ver(page);
  ok(v.janela && v.gamePausada && v.over === true, 'the fire key held through the death does not retry', v.ativas);
  await page.keyboard.up('Space');
  await page.waitForTimeout(200);
  const base = v.base;
  await tecla(page, 'Space');
  await page.waitForTimeout(1500);
  v = await ver(page);
  ok(!v.janela && v.ativas.includes('Game') && v.over === false && v.elapsed < 3, 'a new press tries again: the stage from its beginning', v);
  ok(v.total === base, 'with the score of the stage entry', [v.total, base]);
  await page.close();
}

if (roda('config')) {
  const page = await abrir();
  await morrer(page, 700, 0);
  await ativa(page, 'Pausa');
  await page.waitForTimeout(600);
  await tecla(page, 'ArrowDown', 'Enter');
  let v = await ver(page);
  ok(v.estado?.tela === 'config' && v.textos.includes('VOLUME GERAL'), 'SETTINGS opens the big window', v.estado);
  await tecla(page, 'Escape');
  v = await ver(page);
  ok(v.janela && v.estado?.tela === 'lista' && v.estado.cursor === 1 && v.textos.includes('NAVE PERDIDA'), 'ESC comes back to the scoreboard, on SETTINGS', v.estado);
  ok(v.gamePausada && v.over === true, 'and the dead stage did not resume');
  await tecla(page, 'ArrowUp', 'Enter');
  await page.waitForTimeout(1500);
  v = await ver(page);
  ok(!v.janela && v.ativas.includes('Game') && v.over === false, 'ENTER on TRY AGAIN: the stage again', v.ativas);
  await page.close();
}

if (roda('sair')) {
  const page = await abrir();
  await morrer(page, 700, 0);
  await ativa(page, 'Pausa');
  await page.waitForTimeout(600);
  // the window lost focus: nothing new opens, nothing closes
  await page.evaluate(() => window.__game.events.emit('blur'));
  await page.waitForTimeout(300);
  let v = await ver(page);
  ok(v.janela && v.textos.includes('NAVE PERDIDA') && v.estado.tela === 'lista', 'losing focus leaves the scoreboard as it is', v.estado);
  await tecla(page, 'ArrowUp', 'Enter');
  ok(await ativa(page, 'Menu', 5000), 'QUIT: the main menu, without asking');
  v = await ver(page);
  ok(!v.janela && !v.ativas.includes('Game'), 'and the window and the stage are gone', v.ativas);

  // ESC does the same; and the pause works again afterwards
  await morrer(page, 700, 0);
  await ativa(page, 'Pausa');
  await page.waitForTimeout(600);
  await tecla(page, 'Escape');
  ok(await ativa(page, 'Menu', 5000), 'ESC: the main menu');
  await tecla(page, 'KeyV');
  await ativa(page, 'Game');
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.damageShip = () => {}; s.invulnerableUntil = 1e12; });
  await page.waitForTimeout(2500);
  await tecla(page, 'Escape');
  await page.waitForTimeout(300);
  v = await ver(page);
  ok(v.janela && v.textos.includes('PAUSA') && v.textos.includes('CONTINUAR'), 'the pause of the next stage is the ordinary one', v.textos);
  await page.close();
}

if (roda('controle')) {
  const B = { A: 0, B: 1 };
  const page = await abrir();
  await page.evaluate(() => { window.__pad.id = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'; window.__pad.connected = true; });
  await page.waitForTimeout(300);
  await tecla(page, 'KeyV');
  await ativa(page, 'Game');
  await page.waitForTimeout(2500);
  // the button held through the death
  await segurar(page, B.A, true);
  await perder(page, 700, 0);
  await ativa(page, 'Pausa');
  await page.waitForTimeout(1000);
  let v = await ver(page);
  ok(v.janela && v.over === true, 'the button held through the death does not retry', v.ativas);
  await segurar(page, B.A, false);
  await quadros(page, 3);
  await botao(page, B.A);
  await page.waitForTimeout(1500);
  v = await ver(page);
  ok(!v.janela && v.ativas.includes('Game') && v.over === false, 'the bottom button tries again', v.ativas);
  await perder(page, 700, 0);
  await ativa(page, 'Pausa');
  await page.waitForTimeout(700);
  await botao(page, B.B);
  ok(await ativa(page, 'Menu', 5000), 'the right button goes to the menu');
  await page.close();
}

if (erros.length) { console.log(erros); falhas += erros.length; }
console.log(falhas === 0 ? '\n✔ THE SHIP LOST WINDOW IN THE GAME' : `\n✘ ${falhas} asserts failed`);
await browser.close();
process.exitCode = falhas ? 1 : 0;
