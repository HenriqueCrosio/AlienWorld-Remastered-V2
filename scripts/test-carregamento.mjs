// BLOCK M4 (15/11) — the loading screen (spec `specs/2026-11-15-bloco-m4-carregamento-design.md`):
//   the rule of the bar (pure), and in the browser: the screen is up before the game, the bar only grows and reaches
//   100%, the ship leaves, the menu starts and the screen is taken off the page; the same without the HD layer; the
//   files of the screen and the favicon are served; "reduce flashes" calms the storm.
//   npm run dev  in another terminal, then  node scripts/test-carregamento.mjs
import { chromium } from 'playwright';
import { PESO, barra } from '../src/carregamento.ts';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const perto = (a, b) => Math.abs(a - b) < 1e-9;

// the rule
ok(perto(PESO.codigo + PESO.mundo + PESO.hd, 1), 'the three shares of the bar add up to 1');
ok(perto(barra({ mundo: 0, hd: 0 }), PESO.codigo) && perto(barra({ mundo: 1, hd: 1 }), 1), 'it starts on the share of the code and ends on 1');
ok(barra({ mundo: 0.5, hd: 0 }) < barra({ mundo: 0.5, hd: 0.5 }) && barra({ mundo: 0.2, hd: 1 }) < barra({ mundo: 0.6, hd: 1 }), 'each loader pushes it');
ok(perto(barra({ mundo: 7, hd: -3 }), PESO.codigo + PESO.mundo), 'a value out of range is clamped');

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const erros = [];

async function correr(sufixo, prefs) {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => erros.push(`${sufixo}: ${e}`));
  const faltou = [];
  page.on('response', (r) => { if (r.status() >= 400 && /carregamento|favicon/.test(r.url())) faltou.push(r.url()); });
  // the page records what the screen showed, from its first moment
  await page.addInitScript((p) => {
    if (p) localStorage.setItem('alienworld:preferencias', JSON.stringify(p));
    window.__visto = { pcts: [], antesDoJogo: null, saiu: false };
    const olha = () => {
      const c = document.getElementById('carga');
      if (c) {
        if (window.__visto.antesDoJogo === null) window.__visto.antesDoJogo = !window.__game;
        const t = document.getElementById('carga-pct')?.textContent;
        if (t) window.__visto.pcts.push(parseInt(t, 10));
        if (c.classList.contains('saindo')) window.__visto.saiu = true;
      }
      requestAnimationFrame(olha);
    };
    document.addEventListener('DOMContentLoaded', olha);
  }, prefs ?? null);
  await page.goto(`http://localhost:5173/${sufixo}`, { waitUntil: 'domcontentloaded' });
  const calma = await page.evaluate(() => !!document.querySelector('#carga.calma'));
  const camadas = await page.evaluate(() => document.querySelectorAll('#carga .c').length);
  const menu = await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 }).then(() => true, () => false);
  await page.waitForTimeout(600);
  const v = await page.evaluate(() => ({ ...window.__visto, aindaNaPagina: !!document.getElementById('carga') }));
  await page.close();
  return { ...v, menu, faltou, calma, camadas };
}

for (const [sufixo, nome] of [['?carregamento=3', 'held for 3 s'], ['', 'at the real speed'], ['?semhd', 'without the HD layer']]) {
  const v = await correr(sufixo);
  ok(v.antesDoJogo === true, `${nome}: the screen is on the page before the game exists`);
  ok(v.camadas >= 11, `${nome}: the scene has its layers (${v.camadas})`);
  ok(v.pcts.length > 0 && v.pcts.every((p, i) => i === 0 || p >= v.pcts[i - 1]), `${nome}: the bar never goes back`, v.pcts.slice(0, 40));
  ok(v.pcts[v.pcts.length - 1] === 100, `${nome}: it reaches 100%`, v.pcts.slice(-5));
  ok(v.saiu, `${nome}: the ship leaves and the scene goes dark`);
  ok(v.menu && !v.aindaNaPagina, `${nome}: the menu starts and the screen is off the page`, [v.menu, v.aindaNaPagina]);
  ok(v.faltou.length === 0, `${nome}: every file of the screen and the favicon is served`, v.faltou);
  if (sufixo === '?carregamento=3') ok(new Set(v.pcts).size >= 10, 'held: the bar walks through its steps', [...new Set(v.pcts)].length);
  ok(v.calma === false, `${nome}: the storm flashes by default`);
}
{
  const v = await correr('', { v: 2, reduzirClaroes: true });
  ok(v.calma === true && v.menu, '"reduce flashes" on: the storm only glows');
}

if (erros.length) { console.log(erros); falhas += erros.length; }
console.log(falhas === 0 ? '\n✔ THE LOADING SCREEN' : `\n✘ ${falhas} asserts failed`);
await browser.close();
process.exitCode = falhas ? 1 : 0;
