// BLOCK M1 (14/11) — the pause and the settings IN THE GAME (plan `plans/2026-11-14-bloco-m1-pausa-configuracoes.md` Task 10):
//   fase     — ESC opens and closes (and does not reopen by itself), RESTART, QUIT, the auto-pause on blur;
//   config   — a volume step is recorded and reaches the playing track; the key profile is mirrored;
//   cutscene — SKIP runs to the card table (never past it), the pause over the table, SKIP after the choice;
//   hangar   — three lines, QUIT goes to the menu;
//   menu     — SETTINGS over the living menu (the menu is not paused), ESC gives the keyboard back;
//   igual    — a pause in the middle does not change the run (stepped clock, fixed luck).
//   npm run dev  in another terminal, then  node scripts/test-pausa-jogo.mjs [section …]
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const secoes = process.argv.slice(2);
const roda = (s) => !secoes.length || secoes.includes(s);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const erros = [];
async function abrir(sufixo = '', init = null) {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => erros.push(`${sufixo || '/'}: ${e}`));
  if (init) await page.addInitScript(init);
  await page.goto(`http://localhost:5173/${sufixo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.waitForTimeout(1200);
  return page;
}
const tecla = async (page, ...ks) => { for (const k of ks) { await page.keyboard.press(k); await page.waitForTimeout(160); } };
/** the probe does not play: the ship cannot be hit (a death would end the stage under the test) */
const imortal = (page) => page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.damageShip = () => {}; s.invulnerableUntil = 1e12; });
const ativa = (page, chave, ms = 15000) => page.waitForFunction((k) => window.__game.scene.isActive(k), chave, { timeout: ms }).then(() => true, () => false);
/** what the page says about the pause and the scenes around it */
const ver = (page) => page.evaluate(() => {
  const g = window.__game, hd = window.__gameHD;
  const p = g.scene.isActive('Pausa') ? g.scene.getScene('Pausa').diagnostico() : null;
  const jogo = g.scene.getScene('Game');
  return {
    pausa: !!p, estado: p?.estado ?? null, textos: p?.textos ?? [],
    ativas: g.scene.getScenes(true).map((s) => s.scene.key),
    gamePausada: g.scene.isPaused('Game'), elapsed: jogo?.elapsed ?? null,
    mesa: hd ? hd.scene.isActive('Cartas') : g.scene.isActive('Cartas'),
    mesaPausada: hd ? hd.scene.isPaused('Cartas') : g.scene.isPaused('Cartas'),
    prefs: JSON.parse(localStorage.getItem('alienworld:preferencias') ?? 'null'),
    teclas: localStorage.getItem('aw.teclas'),
    volumes: g.sound.sounds.filter((s) => s.isPlaying).map((s) => +s.volume.toFixed(3)),
  };
});

if (roda('fase')) {
  const page = await abrir();
  // stage 2 (free flight): the F1 is flap, and a parked ship falls
  await tecla(page, 'KeyV');
  ok(await ativa(page, 'Game'), 'the stage opened');
  await imortal(page);
  await page.waitForTimeout(3500);
  await tecla(page, 'Escape');
  await page.waitForTimeout(300);
  let v = await ver(page);
  ok(v.pausa && v.gamePausada, 'ESC: the pause is open and the stage is paused', v.ativas);
  ok(v.textos.join('|').includes('CONTINUAR') && v.textos.includes('REINICIAR A FASE') && v.textos.includes('CONFIGURAÇÕES') && v.textos.includes('SAIR PARA O MENU'), 'the four lines of a stage', v.textos);
  const parado = v.elapsed;
  await page.waitForTimeout(800);
  v = await ver(page);
  ok(v.elapsed === parado, 'the stage clock does not move while paused', [parado, v.elapsed]);
  await tecla(page, 'Escape');
  await page.waitForTimeout(700);
  v = await ver(page);
  ok(!v.pausa && !v.gamePausada && v.ativas.includes('Game'), 'ESC again: closed, the stage runs — and it did not reopen by itself', v.ativas);
  ok(v.elapsed > parado, 'the stage clock moves again', [parado, v.elapsed]);

  // CONTINUE with the confirm key
  await tecla(page, 'Escape', 'Enter');
  await page.waitForTimeout(400);
  ok(!(await ver(page)).pausa, 'CONTINUE closes');

  // RESTART: NO first, then YES
  await tecla(page, 'Escape', 'ArrowDown', 'Enter', 'Enter');
  await page.waitForTimeout(300);
  v = await ver(page);
  ok(v.pausa && v.estado.tela === 'lista' && v.estado.cursor === 1, 'RESTART → NO: back on the list, nothing happened', v.estado);
  const antes = v.elapsed;
  await tecla(page, 'Enter', 'ArrowLeft', 'Enter');
  await page.waitForTimeout(1500);
  v = await ver(page);
  ok(!v.pausa && v.ativas.includes('Game') && v.elapsed < antes && v.elapsed < 3, 'RESTART → YES: the stage started again from the beginning', [antes, v.elapsed, v.ativas]);
  await imortal(page);

  // the auto-pause: the window lost focus
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__game.events.emit('blur'));
  await page.waitForTimeout(400);
  v = await ver(page);
  ok(v.pausa && v.gamePausada, 'the window lost focus: the pause opens by itself', v.ativas);
  await page.evaluate(() => window.__game.events.emit('focus'));
  await page.waitForTimeout(400);
  ok((await ver(page)).pausa, 'the focus coming back does NOT close it');

  // QUIT
  await tecla(page, 'ArrowUp', 'Enter', 'ArrowRight', 'Enter');
  ok(await ativa(page, 'Menu', 5000), 'QUIT → YES: the main menu');
  ok(!(await ver(page)).pausa, 'and the pause is gone');
  await page.close();
}

if (roda('config')) {
  const page = await abrir();
  await tecla(page, 'KeyV');
  await ativa(page, 'Game');
  await imortal(page);
  await page.waitForTimeout(2500);
  await tecla(page, 'Escape', 'ArrowDown', 'ArrowDown', 'Enter');
  let v = await ver(page);
  ok(v.estado?.tela === 'config' && v.textos.includes('VOLUME GERAL'), 'SETTINGS opens on the audio tab', v.estado);
  ok(!v.textos.includes('JOGO'), 'no GAME tab before the first victory', v.textos);
  await tecla(page, 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft');
  v = await ver(page);
  ok(v.prefs?.v === 1 && v.prefs.volume.musica === 5 && v.prefs.volume.geral === 10, 'five steps down on MUSIC are recorded at once', v.prefs);
  await tecla(page, 'KeyE', 'ArrowRight');
  v = await ver(page);
  ok(v.prefs.teclas === 'classico' && v.teclas === 'classico', 'the key profile is recorded and mirrored to the old key', [v.prefs, v.teclas]);
  ok(v.textos.includes('Z') && v.textos.includes('X'), 'the key map shows the classic keys (Z, X)', v.textos);
  await tecla(page, 'KeyE', 'ArrowDown', 'Enter');
  v = await ver(page);
  ok(v.prefs.reduzirClaroes === true, 'reduce flashes is recorded', v.prefs);
  await tecla(page, 'Escape');
  v = await ver(page);
  ok(v.estado?.tela === 'lista' && v.estado.cursor === 2, 'ESC goes back to the small window, on SETTINGS', v.estado);
  await tecla(page, 'Escape');
  await page.waitForTimeout(600);
  v = await ver(page);
  ok(!v.pausa, 'and ESC again closes');
  // the track (when the browser lets it play): half the music volume, not ducked any more
  ok(v.volumes.every((x) => x <= 0.45 * 0.5 + 0.01), 'the playing track is at half volume (or the browser has no audio)', v.volumes);
  // the classic profile is live without restarting the stage: Z fires
  const atira = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    return [...s.reader.keys.keys()].join(',');
  });
  if (atira) ok(atira.includes('Z') && !atira.includes('SPACE'), 'the stage re-read the key map (Z in, SPACE out)', atira);
  await page.close();
}

if (roda('cutscene')) {
  const page = await abrir();
  await tecla(page, 'KeyI');
  ok(await ativa(page, 'Interlude'), 'cutscene 1 opened');
  await page.waitForTimeout(1500);
  await tecla(page, 'Escape');
  let v = await ver(page);
  ok(v.pausa && v.textos.includes('PULAR A CENA') && !v.textos.includes('REINICIAR A FASE'), 'a cutscene: SKIP in the place of RESTART', v.textos);
  await tecla(page, 'ArrowDown', 'Enter');
  const t0 = Date.now();
  const chegou = await page.waitForFunction(() => (window.__gameHD ?? window.__game).scene.isActive('Cartas'), null, { timeout: 8000 }).then(() => true, () => false);
  ok(chegou, `SKIP before the choice: the card table opens (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const escala = await page.evaluate(() => { const s = window.__game.scene.getScene('Interlude'); return [s.time.timeScale, s.tweens.timeScale]; });
  ok(escala[0] === 1 && escala[1] === 1, 'the choice is on the normal clock again', escala);
  await page.waitForTimeout(900);

  // the pause over the table
  await tecla(page, 'Escape');
  await page.waitForTimeout(300);
  v = await ver(page);
  ok(v.pausa && v.mesaPausada && v.textos.length >= 4 && !v.textos.includes('PULAR A CENA') && !v.textos.includes('REINICIAR A FASE'), 'ESC on the table: the pause of a choice (three lines), the table goes quiet', v);
  await tecla(page, 'ArrowDown', 'ArrowUp');
  v = await ver(page);
  ok(v.estado?.cursor === 0 && v.mesa === false, 'the arrows move the pause, not the table underneath', v.estado);
  await tecla(page, 'Escape');
  await page.waitForTimeout(700);
  v = await ver(page);
  ok(!v.pausa && v.mesa && !v.mesaPausada, 'ESC closes it, the table is back — and the pause did not reopen', v);

  // choose a card, then skip the rest
  await tecla(page, 'Enter');
  await page.waitForTimeout(1200);
  v = await ver(page);
  ok(!v.mesa && v.ativas.includes('Interlude'), 'the card chosen, the cutscene goes on', v.ativas);
  await tecla(page, 'Escape', 'ArrowDown', 'Enter');
  ok(await ativa(page, 'Game', 8000), 'SKIP after the choice: the next stage');
  const fase = await page.evaluate(() => window.__game.scene.getScene('Game').stage?.id);
  ok(fase === 2, 'and it is stage 2', fase);
  await page.close();
}

if (roda('hangar')) {
  const page = await abrir();
  await tecla(page, 'KeyQ', 'Enter');
  ok(await ativa(page, 'Hangar'), 'the hangar opened');
  await page.waitForTimeout(2000);
  await tecla(page, 'Escape');
  let v = await ver(page);
  ok(v.pausa && !v.textos.includes('REINICIAR A FASE') && !v.textos.includes('PULAR A CENA') && v.textos.includes('SAIR PARA O MENU'), 'the hangar: three lines', v.textos);
  await tecla(page, 'ArrowUp', 'Enter', 'ArrowRight', 'Enter');
  ok(await ativa(page, 'Menu', 5000), 'QUIT → the main menu');
  await page.close();
}

if (roda('menu')) {
  const page = await abrir();
  await tecla(page, 'KeyQ', 'ArrowUp', 'Enter');
  await page.waitForTimeout(300);
  let v = await ver(page);
  ok(v.pausa && v.estado.tela === 'config' && v.ativas.includes('Menu'), 'SETTINGS from the main menu: the big window, the menu still running behind', v.ativas);
  const cursor = await page.evaluate(() => window.__game.scene.getScene('Menu').cursorMenu);
  await tecla(page, 'ArrowDown', 'ArrowDown');
  ok((await page.evaluate(() => window.__game.scene.getScene('Menu').cursorMenu)) === cursor, 'the arrows do not move the menu underneath');
  await tecla(page, 'Escape');
  await page.waitForTimeout(600);
  v = await ver(page);
  ok(!v.pausa && v.ativas.includes('Menu'), 'ESC closes; the menu is there');
  await tecla(page, 'ArrowUp');
  ok((await page.evaluate(() => window.__game.scene.getScene('Menu').cursorMenu)) === cursor - 1, 'and the menu has its keyboard back');
  await page.close();
}

if (roda('igual')) {
  // The same stage on a stepped clock with fixed luck: straight, and with the pause open for 300 steps in the middle.
  const init = () => {
    const base = 1762560000000;
    let k = 0;
    Date.now = () => base + (k += 16);
    let a = 20261114;
    Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  const corrida = async (comPausa) => {
    const page = await abrir('?semhd', init);
    await page.evaluate(() => {
      const g = window.__game;
      window.Phaser.Math.RND.sow(['20261114']);
      g.loop.sleep();
      let t = g.loop.now;
      window.__pisa = (n) => { for (let i = 0; i < n; i++) { t += 1000 / 60; g.step(t, 1000 / 60); } };
      g.scene.getScenes(true).forEach((s) => s.scene.stop());
      window.__pisa(2);
      g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja');
      g.scene.start('Game', { stage: 2, handling: 'diegetico', ship: 'humana' });
      for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) window.__pisa(1);
      const s = g.scene.getScene('Game');
      s.cartas.abrirMesa = () => {};
      s.damageShip = () => {};
      window.__passosDoJogo = (n) => { for (let i = 0; i < n; i++) { s.ship.setPosition(60, 108); s.ship.body.setVelocity(0, 0); window.__pisa(1); } };
      window.__passosDoJogo(480);
    });
    // (the straight run: 480 steps here + the rest up to 18 s of stage clock below)
    if (comPausa) {
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.__pisa(300));
      const aberta = await page.evaluate(() => window.__game.scene.isActive('Pausa') && window.__game.scene.isPaused('Game'));
      ok(aberta, 'the pause opened in the stepped run');
      await page.keyboard.press('Escape');
      // closing takes game steps too (the key is read in one, the stage resumes in the next): count the steps the
      // STAGE really ran, by its own clock, so both runs stop on the same one
      await page.evaluate(() => window.__pisa(3));
    }
    const r = await page.evaluate(() => {
      const cena = window.__game.scene.getScene('Game');
      for (let i = 0; i < 2000 && cena.elapsed < 18 - 1e-6; i++) window.__passosDoJogo(1);
      const s = window.__game.scene.getScene('Game');
      const lista = (grupo) => grupo.getChildren().filter((o) => o.active).map((o) => [Math.round(o.x * 10) / 10, Math.round(o.y * 10) / 10]);
      return { elapsed: +s.elapsed.toFixed(3), inimigos: lista(s.enemies.enemies), pecas: lista(s.debris.hazards), score: s.score };
    });
    await page.close();
    return r;
  };
  const a = await corrida(false);
  const a2 = await corrida(false);
  const b = await corrida(true);
  const igual = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  ok(a.inimigos.length + a.pecas.length > 0, `the straight run has something on screen (${a.inimigos.length} enemies, ${a.pecas.length} pieces, t=${a.elapsed})`);
  if (!igual(a, a2)) console.log('  (two straight runs already differ: the comparison below is only the clock and the counts)', JSON.stringify({ a, a2, b }));
  ok(a.elapsed === b.elapsed, 'both runs stop on the same stage clock', [a.elapsed, b.elapsed]);
  ok(igual(a, a2) ? igual(a, b) : a.inimigos.length === b.inimigos.length && a.pecas.length === b.pecas.length, 'the run is the same with and without the pause (enemies, pieces, score)', { a, b });
}

if (erros.length) { console.log(erros); falhas += erros.length; }
console.log(falhas === 0 ? '\n✔ THE PAUSE IN THE GAME' : `\n✘ ${falhas} asserts failed`);
await browser.close();
process.exitCode = falhas ? 1 : 0;
