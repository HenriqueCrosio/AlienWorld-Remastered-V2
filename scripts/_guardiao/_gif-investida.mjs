// THE LEASHED LUNGE IN GAME, at real speed (spec 2026-11-22-guardiao-coleira-design.md §10, step 1): the three jerks
// (A dry · B elastic · C vibrating) stacked, each with two lunges — the ship parked HIGH, then LOW — in the F4 boss
// practice, the ship invulnerable and not firing. The game clock is stepped (the _sonda/_gif-sonda-jogo.mjs recipe):
// one photo every 3 game frames, the GIF plays at the game's speed.
//   npm run dev, then  node scripts/_guardiao/_gif-investida.mjs <out.gif> [--porta 5173] [--zoom 2] [--variantes ABC]
import { chromium } from 'playwright';
import sharp from 'sharp';

const OUT = process.argv[2];
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const PORTA = arg('--porta', '5173');
const ZOOM = Number(arg('--zoom', '2'));
const VARIANTES = arg('--variantes', 'ABC').split('');
const QUADRO = 1000 / 60;
const POR_FOTO = 3;
/** per lunge: the ship's height, and how long to film it (s) — the charge 1.15 + lunge + jerk + return 0.8 + a breath */
const CENAS = arg('--cenas', '70:3.6,150:3.6').split(',').map((c) => c.split(':').map(Number));
/** `--desvia`: after the jerk the ship slides into the lava fan's gap at 150 px/s (step 2: shows the corridor works —
 * parked, the invulnerable ship would just eat the drops that touch it) */
const DESVIA = process.argv.includes('--desvia');

async function filmar(v) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => console.log(`[ERRO ${v}] ${e.stack}`));
  await page.goto(`http://localhost:${PORTA}/?tranco=${v}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
  await page.waitForFunction(() => {
    const g = window.__game.scene;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const s = g.getScene('Game');
    return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering && s.boss.acao === 'flutua';
  }, null, { timeout: 120000, polling: 250 });
  await page.evaluate(() => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    s.damageShip = () => {};
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
  });
  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  const passo = (n) =>
    page.evaluate(({ n, QUADRO, DESVIA }) => {
      const g = window.__game;
      const s = g.scene.getScene('Game');
      for (let i = 0; i < n; i++) {
        window.__passo.t += QUADRO;
        g.step(window.__passo.t, QUADRO);
        if (!DESVIA) continue;
        const L = s.boss.ultimoLeque;
        if (L && L !== window.__ultimoLeque) {
          window.__ultimoLeque = L;
          window.__alvoY = L.faixas[L.vao];
        }
        if (window.__alvoY != null) {
          const dy = window.__alvoY - s.ship.y;
          s.ship.setPosition(s.ship.x, s.ship.y + Math.sign(dy) * Math.min(Math.abs(dy), 2.5));
        }
      }
    }, { n, QUADRO, DESVIA });
  const fotos = [];
  for (const [naveY, seg] of CENAS) {
    await page.evaluate((naveY) => {
      window.__alvoY = null;
      const b = window.__game.scene.getScene('Game').boss;
      window.__game.scene.getScene('Game').ship.setPosition(70, naveY);
      b.serra?.destroy?.();
      b.serra = null;
      b.acao = 'flutua';
      b.proxima = 'investida';
      b.acaoT = 0;
    }, naveY);
    for (let i = 0; i < Math.round((seg * 60) / POR_FOTO); i++) {
      await passo(POR_FOTO);
      const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
      fotos.push(await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer());
    }
  }
  await browser.close();
  return fotos;
}

const filmes = [];
for (const v of VARIANTES) filmes.push(await filmar(v));
const W = 384 * ZOOM, H = 216 * ZOOM, GAP = 8;
const n = Math.min(...filmes.map((f) => f.length));
const quadros = [];
for (let i = 0; i < n; i++) {
  quadros.push(
    await sharp({ create: { width: W, height: H * filmes.length + GAP * (filmes.length - 1), channels: 4, background: { r: 14, g: 16, b: 22, alpha: 1 } } })
      .composite(filmes.map((f, k) => ({ input: f[i], left: 0, top: k * (H + GAP) })))
      .png()
      .toBuffer(),
  );
}
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0, colours: 96, interFrameMaxError: 8 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros', VARIANTES.join(' · '));
