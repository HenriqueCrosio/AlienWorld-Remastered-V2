// BLOCK SOUND (19/11) — the final cutscene's flyover as it LEAVES: for each ship, the level at the end of the effects'
// chain (`Som.fimNo`, short RMS) every 250 ms from the ship's entry until 3 s after she is out of the frame, with the
// ship's x. A good exit falls off over ~2 s after she leaves; a cut is a drop of many dB in one step.
//   npm run dev  in another terminal, then  node scripts/_som/_medir-sobrevoo-final.mjs [porta]
import { chromium } from 'playwright';

const porta = process.argv[2] ?? '5173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1200);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());
for (const [nome, ship, modelo] of [['X-AELO', 'interceptor', 'jato'], ['TERMINUS', 'interceptor', 'a'], ['MANTA', 'alienigena', 'a']]) {
  await page.evaluate(([s, m]) => {
    const g = window.__game;
    g.registry.set('modeloNave', m);
    g.scene.getScenes(true)[0].scene.start('Interlude4', { score: 0, handling: 'diegetico', ship: s, stage: 4, practice: true });
  }, [ship, modelo]);
  await page.waitForFunction(() => window.__game.scene.isActive('Interlude4'), null, { timeout: 30000 });
  await page.evaluate(() => { window.__t0Final = window.__game.scene.getScene('Interlude4').time.now; });
  // the music off: only the world
  await page.evaluate(() => window.__music.stop(null, 0));
  const linhas = await page.evaluate(async () => {
    const cena = window.__game.scene.getScene('Interlude4');
    const ctx = window.__som.contexto();
    const an = ctx.createAnalyser(); an.fftSize = 4096; window.__som.fimNo.connect(an);
    const buf = new Float32Array(an.fftSize);
    while (cena.time.now - window.__t0Final < 24000) await new Promise((r) => setTimeout(r, 50));
    const out = [];
    const t0 = window.__t0Final + 24000;
    while (cena.time.now - t0 < 11500) {
      an.getFloatTimeDomainData(buf);
      let e = 0; for (const v of buf) e += v * v;
      const nave = cena.children.list.find((o) => o.depth === cena.ship?.depth && o === cena.ship) ?? cena.ship;
      out.push([((cena.time.now - t0) / 1000).toFixed(2), (10 * Math.log10(e / buf.length + 1e-12)).toFixed(1), Math.round(nave.x)]);
      await new Promise((r) => setTimeout(r, 250));
    }
    return out;
  });
  console.log(`== ${nome}`);
  console.log(linhas.map(([t, db, x]) => `${t}s ${db}dB x${x}`).join('  '));
}
await browser.close();
