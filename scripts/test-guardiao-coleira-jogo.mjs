// THE GUARDIAN'S LEASH IN GAME (spec 2026-11-22-guardiao-coleira-design.md §4, §11). npm run dev, then
//   node scripts/test-guardiao-coleira-jogo.mjs [--porta 5173] [--tranco A|B|C] [--fotos <dir>]
// The F4 boss practice, the ship invulnerable and parked at (70, 108). Forces two lunges (one aimed high, one low) and
// checks, frame by frame: the body never passes the leash's stop by more than the jerk's overshoot; the ropes are taut at
// the jerk; he is back at the station within 1.5 s of the jerk; no page error. --fotos saves a few screenshots per lunge.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const tranco = arg('--tranco', 'A');
const FOTOS = arg('--fotos', null);
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/?tranco=${tranco}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
await page.waitForFunction(() => window.__game.scene.getScene('Game')?.cartas, null, { timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game.scene;
  for (const k of ['meio', 'fim']) g.getScene('Game').cartas.abertas.add(k);
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
});
await page.waitForFunction(() => {
  const g = window.__game.scene;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering;
}, null, { timeout: 120000 });

if (FOTOS) fs.mkdirSync(FOTOS, { recursive: true });
for (const [rotulo, naveY] of [['alta', 60], ['baixa', 160]]) {
  // park the ship where the lunge will aim, wait for him to settle at the station, then force the lunge
  await page.evaluate((naveY) => {
    const s = window.__game.scene.getScene('Game');
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    s.ship.setPosition(70, naveY);
  }, naveY);
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.acao === 'flutua', null, { timeout: 20000 });
  await page.evaluate(() => {
    const b = window.__game.scene.getScene('Game').boss;
    b.serra?.destroy?.();
    b.serra = null;
    b.proxima = 'investida';
    b.acaoT = 0;
  });
  const fotos = [];
  const linhas = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    const b = s.boss;
    const out = [];
    const fim = performance.now() + 4200;
    while (performance.now() < fim) {
      await new Promise((r) => requestAnimationFrame(r));
      out.push({ t: performance.now(), acao: b.acao, x: b.sprite.x, y: b.sprite.y, parada: b.xParadaEm(b.sprite.y), esticada: b.cabos.esticada, passa: b.tranco.passa });
      if (b.acao === 'flutua' && out.some((l) => l.acao === 'volta')) break;
    }
    return out;
  });
  const iTranco = linhas.findIndex((l) => l.acao === 'tranco');
  conferir(iTranco > 0, `${rotulo}: houve tranco`, linhas.map((l) => l.acao).filter((a, i, v) => a !== v[i - 1]));
  if (iTranco > 0) {
    const t = linhas[iTranco];
    const piorX = Math.min(...linhas.map((l) => l.x - (l.parada - t.passa - 1)));
    conferir(piorX >= -2, `${rotulo}: o corpo nunca passa da parada além do tranco`, { piorX, parada: t.parada, x: t.x });
    conferir(linhas.slice(iTranco, iTranco + 3).some((l) => l.esticada), `${rotulo}: as cordas esticadas no tranco`, null);
    const iFim = linhas.findIndex((l, i) => i > iTranco && l.acao === 'flutua');
    const dt = iFim > 0 ? (linhas[iFim].t - t.t) / 1000 : Infinity;
    conferir(dt <= 1.5, `${rotulo}: de volta à estação em ≤ 1,5 s depois do tranco`, { dt });
    console.log(`     ${rotulo}: parada x=${t.x.toFixed(1)} y=${t.y.toFixed(1)} (alvo ${t.parada.toFixed(1)})`);
  }
  if (FOTOS) {
    // a second lunge, photographed at its key moments
    await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.acao === 'flutua', null, { timeout: 20000 });
    await page.screenshot({ path: path.join(FOTOS, `${rotulo}-0-estacao.png`) });
    await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; b.serra?.destroy?.(); b.serra = null; b.proxima = 'investida'; b.acaoT = 0; });
    for (const [nome, alvo] of [['1-investe', 'investe'], ['2-tranco', 'tranco'], ['3-volta', 'volta']]) {
      await page.waitForFunction((a) => window.__game.scene.getScene('Game').boss.acao === a, alvo, { timeout: 8000, polling: 'raf' });
      if (alvo === 'volta') await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(FOTOS, `${rotulo}-${nome}.png`) });
      fotos.push(nome);
    }
  }
}
conferir(erros.length === 0, 'nenhum erro de página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
