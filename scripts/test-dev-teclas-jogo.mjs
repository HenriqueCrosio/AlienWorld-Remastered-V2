// THE DEV KEYS IN THE GAME (24/11, the Beast's step 1 — spec 2026-11-24-besta-refeita §7): the URL opens a boss phase
// with a hand, key 7 goes to the next phase, key 8 swaps the hand and restarts at the same phase.
//   npm run dev, then  node --experimental-transform-types scripts/test-dev-teclas-jogo.mjs [--porta 5173]
import { chromium } from 'playwright';
import { MAOS } from '../src/dev/maos.ts';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
// (the F4 opens a card table at the start of the practice: close it, as the other in-game tests do)
const naFase = (alvo, s = 120) =>
  page.waitForFunction((a) => {
    const g = window.__game?.scene;
    if (!g) return false;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const sc = g.getScene('Game');
    if (!g.isActive('Game') || !sc?.boss) return false;
    sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    sc.damageShip = () => {};
    return sc.boss.devFaseAtual === a;
  }, alvo, { timeout: s * 1000, polling: 200 }).then(() => true, () => false);
const mao = () => page.evaluate(() => window.__game.registry.get('cartas'));
const igual = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ── the URL ──
await page.goto(`http://localhost:${porta}/?fase=besta2&mao=forte`, { waitUntil: 'domcontentloaded' });
conferir(await naFase('besta2', 180), '?fase=besta2 abre a F4 e chega à Besta fase 2', null);
conferir(igual(await mao(), MAOS.forte), '&mao=forte: a mão é a forte', await mao());
const arma = await page.evaluate(() => window.__game.scene.getScene('Game').cartas.arma());
conferir(typeof arma === 'string' && arma.length > 0, 'a arma nasceu da mão (montarArma)', arma);

// ── key 7 ──
await page.keyboard.press('7');
conferir(await naFase('besta3', 15), 'a tecla 7 leva à besta3', await page.evaluate(() => window.__game.scene.getScene('Game').boss.devFaseAtual));

// ── key 8 ──
await page.keyboard.press('8');
const aberto = await page.waitForSelector('#dev-mao', { timeout: 5000 }).then(() => true, () => false);
conferir(aberto, 'a tecla 8 abre o painel das mãos', null);
const botoes = await page.$$eval('#dev-mao button', (bs) => bs.map((b) => b.dataset.mao));
conferir(botoes.join() === 'nenhuma,mediana,forte,sandbox', 'um botão por mão, na ordem das teclas 1–4', botoes);
conferir(await page.evaluate(() => window.__game.scene.isPaused('Game')), 'com o painel aberto, a fase pausa', null);
await page.keyboard.press('Escape');
const fechou = await page.evaluate(() => !document.getElementById('dev-mao') && !window.__game.scene.isPaused('Game'));
conferir(fechou, 'o ESC fecha o painel e a fase volta', null);
await page.keyboard.press('8');
await page.waitForSelector('#dev-mao', { timeout: 5000 }).catch(() => {});
await page.keyboard.press('1');
conferir(await naFase('besta3', 180), 'a mão "nenhuma" reinicia a luta na mesma fase (besta3)', null);
conferir((await mao()).length === 0, 'e sem cartas', await mao());

// ── the URL on the F1 (the F1 entry zeroes the hand: devMao comes after it) ──
await page.goto(`http://localhost:${porta}/?fase=torre2&mao=mediana`, { waitUntil: 'domcontentloaded' });
conferir(await naFase('torre2', 180), '?fase=torre2 chega à Torre no ar', null);
conferir(igual(await mao(), MAOS.mediana), 'e com a mediana, mesmo na F1', await mao());

conferir(erros.length === 0, 'sem erros na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
