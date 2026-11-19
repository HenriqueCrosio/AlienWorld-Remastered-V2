// BLOCK SOUND (18/11) — sheet 8, a probe of the triggers that only the REAL scenery fires: the invaders on the F1's clock,
// the spider walking in the cave, the heart and the furnace following the frames of the pieces on screen, the eel and the
// dolphins on their own clocks. Prints when each one was heard, in stage seconds.
//   npm run dev  in another terminal, then  node scripts/_som/_sonda-ambiente.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, reducedMotion: 'reduce' });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1200);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());

async function fase(stage, inicio) {
  await page.evaluate((id) => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: id, ship: 'interceptor' }), stage);
  await page.waitForFunction((id) => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.ship?.active && s.stage?.id === id; }, stage, { timeout: 60000 });
  await page.evaluate((t) => {
    const s = window.__game.scene.getScene('Game');
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    s.elapsed = t;
  }, inicio);
}
/** waits until every name was heard (or `ms` passes) and says which were */
async function ouvir(rotulo, nomes, ms) {
  const n0 = await page.evaluate(() => window.__som.diagnostico().tocados.length);
  const fim = Date.now() + ms;
  let ouvidos = [];
  while (Date.now() < fim) {
    await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); if (s.scene.isActive()) s.invulnerableUntil = Number.MAX_SAFE_INTEGER; });
    if (await page.evaluate(() => window.__game.scene.isActive('Cartas'))) await page.keyboard.press('Enter');
    ouvidos = (await page.evaluate(() => window.__som.diagnostico().tocados)).slice(n0);
    if (nomes.every((p) => ouvidos.some((x) => x.startsWith(p)))) break;
    await page.waitForTimeout(250);
  }
  for (const p of nomes) console.log(`${ouvidos.some((x) => x.startsWith(p)) ? '✔' : '✘'} ${rotulo}: ${p}`);
}

await fase(1, 12);
await ouvir('F1, o horizonte', ['fx.f1.flyby', 'fx.f1.artilharia', 'fx.f1.explosao'], 14000);
await fase(1, 39.4);
await ouvir('F1, a caverna', ['fx.f1.aranha'], 40000);
console.log('lugar na caverna:', await page.evaluate(() => window.__som.lugarAgora()));

await fase(3, 18);
await ouvir('F3, a nebulosa', ['fx.f3.enguia'], 6000);

await fase(4, 2);
await ouvir('F4, o cenário vivo', ['fx.f4.coracao', 'fx.f4.fornalha'], 45000);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  Object.defineProperty(s.agua, 'estadoAtual', { configurable: true, get: () => ({ estado: 'submerso', nivel: 1, alpha: 1 }) });
  s.relogioDoDuelo = 6.4;
});
await ouvir('F4, o duelo', ['fx.f4.golfinho'], 4000);

console.log(erros.length ? `erros: ${erros.join(' | ')}` : 'sem erros na página');
await browser.close();
