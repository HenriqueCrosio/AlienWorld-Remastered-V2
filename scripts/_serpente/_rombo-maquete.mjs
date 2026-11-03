// 28/10 — THE BREACH CONCEPTS IN THE GAME (S1, spec `2026-10-28-serpente-luta-s1-design.md` §1), without touching src/:
// the F3 practice run on a deterministic start; once the serpent stands, the world is frozen, the hull is revealed in
// the PROW's family (as the real run has it at t≈94), her post moves to x 300 and the derelict plates hide; the concept
// goes on the hull band (its back at depth −74, right above the band; its LIP — the hull and torn edges of the band's
// lower rows, not the dark cavity — at depth 35, over her coils), under the Atmosfera like the rest of the scene.
// The concept is cut to its torn area (the mask's box + 4 px: the rest is the base strip, which the band lays with its
// own pieces). Two photos per concept: the breach alone on the hull (`-so`), and her at the LOW post, sunk into it.
// Output: <out>/maquete-<X>-{so,ela}.png (the full frame ×2) and <out>/maquete-<X>-{so,ela}-zoom.png (the breach ×3).
//   node scripts/_serpente/_rombo-maquete.mjs <dir dos conceitos> <out> [A,B,C,D]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [DIR, OUT, QUAIS = 'A,B,C,D'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const POSTO = 300, CRISTA = 150, CEU = 34, MEIO = 159, BAIXO = 142;
/** each concept's torn area in the piece (its mask's box), + 4 px */
const CAIXA = { A: [74, 246], B: [76, 242], C: [48, 272], D: [76, 244] };
/** the lip: the concept's pixels from this row of the piece down that are not the cavity's near-black */
const LABIO_DE = CEU + 18, ESCURO = 34;

const recorte = (arq, q) => sharp(arq).extract({ left: CAIXA[q][0], top: 0, width: CAIXA[q][1] - CAIXA[q][0], height: 100 });

async function labio(arq, q) {
  const { data, info } = await recorte(arq, q).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    const lum = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
    if (y < LABIO_DE || lum < ESCURO) out[i + 3] = 0;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const q of QUAIS.split(',')) {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
  const fundo = 'data:image/png;base64,' + (await recorte(path.join(DIR, `conceito-${q}.png`), q).png().toBuffer()).toString('base64');
  const frente = 'data:image/png;base64,' + (await labio(path.join(DIR, `conceito-${q}.png`), q)).toString('base64');
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    let a = 20261026;
    Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    window.Phaser.Math.RND.sow(['20261026']);
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
    const base = Date.now(), t0 = window.__passo.t;
    Date.now = () => base + (window.__passo.t - t0);
    window.__pisa = (n) => { for (let i = 0; i < n; i++) { window.__passo.t += 1000 / 60; g.step(window.__passo.t, 1000 / 60); } };
    window.__pisa(2);
    g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja'); g.registry.set('sementeMorte', 20261026);
    const velha = g.scene.getScene('Game'); if (velha) velha.cartas = null;
    g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico', practice: true });
    for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) window.__pisa(1);
    const s = g.scene.getScene('Game');
    s.cartas.abrirMesa = () => {};
    for (let i = 0; i < 4; i++) { if (g.scene.isActive('Cartas')) g.scene.stop('Cartas'); if (g.scene.isPaused('Game')) g.scene.resume('Game'); window.__pisa(12); }
    s.victory = () => {}; s.invulnerableUntil = 1e12; s.lives = 3;
    // the boss arrives (it slides in from the right today)
    for (let i = 0; i < 1200 && (!s.boss || s.boss.entering); i++) { s.enemies.enemies.clear(true, true); window.__pisa(1); }
  });
  // the textures (async: they are decoded by the browser)
  await page.evaluate(({ fundo, frente }) => new Promise((ok) => {
    const s = window.__game.scene.getScene('Game');
    let n = 0;
    const pronto = () => { if (++n === 2) ok(); };
    s.textures.once('addtexture-rombo-fundo', pronto);
    s.textures.once('addtexture-rombo-labio', pronto);
    s.textures.addBase64('rombo-fundo', fundo);
    s.textures.addBase64('rombo-labio', frente);
  }), { fundo, frente });
  await page.evaluate(({ POSTO, CRISTA, CEU, MEIO, x0p }) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    const p = s.parallax, b = s.boss;
    // the world stops (the hull, the front strip, the far layers)
    const upd = p.update.bind(p);
    p.update = (dt) => upd(dt, 0);
    // the hull revealed, in the PROW's family
    p.revealCasco(1, 60);
    p.cascoDist = 3500;
    for (const layer of p.layers) {
      if (!layer.casco) continue;
      for (const sp of layer.sprites) sp.destroy();
      layer.sprites = [];
      layer.nextX = -60;
      while (layer.nextX < 384 + 120) p.emit(layer);
    }
    // her post at x 300, no charge, the derelict plates hidden
    b.constructor.STATION_X = POSTO;
    b.cdPrincipal = 1e9;
    b.cdSecundario = 1e9;
    for (const pl of b.brecha) pl.setVisible(false);
    // (the S1 takes the star off every form: not in the mock either; its alpha is reset every frame, so hide it)
    b.cabeca.setVisible(false);
    const x0 = POSTO - MEIO + x0p, y0 = CRISTA - CEU;
    s.add.image(x0, y0, 'rombo-fundo').setOrigin(0, 0).setDepth(-74);
    s.add.image(x0, y0, 'rombo-labio').setOrigin(0, 0).setDepth(35);
    // settle at the post (the ship parked on the left, visible)
    for (let i = 0; i < 240; i++) {
      s.enemies.enemies.clear(true, true);
      s.enemies.enemyBullets?.clear(true, true);
      s.ship.setPosition(60, 96); s.ship.body.setVelocity(0, 0); s.ship.setVisible(true).setAlpha(1);
      window.__pisa(1);
    }
  }, { POSTO, CRISTA, CEU, MEIO, x0p: CAIXA[q][0] });
  const clip = { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k };
  const foto = async (nome) => {
    const tela = await page.screenshot({ clip });
    await sharp(tela).resize(384 * 2, 216 * 2, { kernel: 'nearest' }).png().toFile(path.join(OUT, `maquete-${q}-${nome}.png`));
    // (in two steps: a second `resize` in one sharp chain REPLACES the first)
    const nativa = await sharp(tela).resize(384, 216, { kernel: 'nearest' }).png().toBuffer();
    const recorte = await sharp(nativa).extract({ left: 196, top: 40, width: 188, height: 176 }).png().toBuffer();
    await sharp(recorte).resize(564, 528, { kernel: 'nearest' }).png().toFile(path.join(OUT, `maquete-${q}-${nome}-zoom.png`));
  };
  // 1) the breach alone (her sprite hidden for one frame drawn at the same instant)
  await page.evaluate(() => { const g = window.__game, b = g.scene.getScene('Game').boss; b.sprite.setVisible(false); g.renderer.preRender(); g.scene.render(g.renderer); g.renderer.postRender(); });
  await foto('so');
  // 2) her at the low post, sunk into the breach
  await page.evaluate((BAIXO) => {
    const g = window.__game, s = g.scene.getScene('Game'), b = s.boss;
    b.sprite.setVisible(true);
    b.constructor.BASE_Y = BAIXO;
    for (let i = 0; i < 150; i++) { s.enemies.enemies.clear(true, true); s.enemies.enemyBullets?.clear(true, true); s.ship.setPosition(60, 96); s.ship.body.setVelocity(0, 0); s.ship.setVisible(true).setAlpha(1); window.__pisa(1); }
  }, BAIXO);
  await foto('ela');
  console.log(q, erros.length ? erros : 'ok');
  await page.close();
}
await browser.close();
