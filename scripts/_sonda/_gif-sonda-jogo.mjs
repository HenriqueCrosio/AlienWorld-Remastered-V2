// THE SONDA IN GAME, at real speed (spec 2026-11-20-bloco-f-sonda-design.md): the F2 (the dark one) and the F3 (the rust
// one) side by side, two waves of 3 each — a DIVE and a diagonal CUT — with the ship aiming at the first wave (the dodge,
// the warning and the shot), not firing, so they pass and leave by the left. The game clock is stepped frame by frame
// (the `_elites/_gif-f4-jogo.mjs` recipe): every photo is 3 game frames apart, the GIF plays at the game's speed.
//   npm run dev, then  node scripts/_sonda/_gif-sonda-jogo.mjs <out.gif> [seconds=12] [zoom=2]
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, SEG = '12', ZOOM_ARG = '2'] = process.argv.slice(2);
const ZOOM = Number(ZOOM_ARG);
const QUADRO = 1000 / 60;
const POR_FOTO = 3;

/** one stage: jumped to `t`, the script frozen, two waves spawned in game time; returns the photos */
async function filmar(stage, t, semente) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__game?.scene, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate((st) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.scene.start('Game', { stage: st, ship: 'interceptor', handling: 'diegetico' });
  }, stage);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.evaluate((t0) => {
    const s = window.__game.scene.getScene('Game');
    s.damageShip = () => {};
    s.elapsed = t0;
    s.director.skipTo(t0);
    s.director.update = () => [];
    s.spawnHazards = () => {};
  }, t);
  await page.waitForTimeout(2500);
  const caminhos = await page.evaluate((seed) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    s.enemies.enemies.clear(true, true);
    s.debris.hazards.clear(true, true);
    s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
    s.banner.setAlpha(0);
    s.bannerFaixa.setAlpha(0);
    s.ship.setPosition(70, 108);
    // fixed luck: the same paths and shooters every recording
    let a = seed;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let q = Math.imul(a ^ (a >>> 15), 1 | a);
      q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
      return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
    };
    window.__ondas = [];
    const onda = (y, depois) => {
      for (let i = 0; i < 3; i++) {
        s.time.delayedCall(depois + i * 300, () => {
          const e = s.enemies.spawn('sonda', y);
          if (i === 0) window.__ondas.push(e.getData('elite').caminho.tipo);
        });
      }
    };
    onda(100, 0);
    onda(100, 5200);
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
    return null;
  }, semente);
  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  const passo = (n) =>
    page.evaluate(({ n, QUADRO }) => {
      const g = window.__game;
      for (let i = 0; i < n; i++) {
        window.__passo.t += QUADRO;
        g.step(window.__passo.t, QUADRO);
      }
    }, { n, QUADRO });
  // FOGO=1: the ship holds its fire (the orbs pop in it, the sondas die in their material)
  if (process.env.FOGO) await page.keyboard.down('Space');
  const fotos = [];
  const total = Math.round((Number(SEG) * 60) / POR_FOTO);
  for (let i = 0; i < total; i++) {
    // the staging: during the first wave the ship AIMS at the leader (glides to her height), then it rests
    const tipo = await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      const vivas = s.enemies.enemies.getChildren().filter((e) => e.active && e.getData('kind') === 'sonda');
      const alvo = s.time.now < 5000 + (window.__inicio ??= s.time.now) ? vivas[0] : null;
      const y = alvo && alvo.x < 360 ? alvo.y : 150;
      s.ship.setPosition(70, s.ship.y + Math.sign(y - s.ship.y) * Math.min(2, Math.abs(y - s.ship.y)));
      return window.__ondas.join(' → ');
    });
    if (i === total - 1) console.log(`F${stage}: ${tipo}`);
    await passo(POR_FOTO);
    const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
    fotos.push(await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer());
  }
  await browser.close();
  return fotos;
}

const [s1, s2, t2, t3] = (process.env.SEMENTES ?? '20261120,20261121,3,18').split(',').map(Number);
const f2 = await filmar(2, t2, s1);
const f3 = await filmar(3, t3, s2);
const W = 384 * ZOOM;
const H = 216 * ZOOM;
const quadros = [];
for (let i = 0; i < Math.min(f2.length, f3.length); i++) {
  quadros.push(
    await sharp({ create: { width: W * 2 + 8, height: H, channels: 4, background: { r: 14, g: 16, b: 22, alpha: 1 } } })
      .composite([{ input: f2[i], left: 0, top: 0 }, { input: f3[i], left: W + 8, top: 0 }])
      .png()
      .toBuffer(),
  );
}
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros');
