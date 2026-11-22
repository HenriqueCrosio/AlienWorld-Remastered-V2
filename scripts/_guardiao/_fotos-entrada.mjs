// THE ENTRY, up close: the Guardian sliding in from the right with the leash ropes, photographed every N game frames
// and cropped/magnified around the rope roots (where the user saw the texture glitch on 22/11).
//   node scripts/_guardiao/_fotos-entrada.mjs <outDir> [--porta 5174] [--cada 12] [--zoom 5] [--gif out.gif]
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const PORTA = arg('--porta', '5174');
const CADA = Number(arg('--cada', '12'));
const ZOOM = Number(arg('--zoom', '5'));
const QUADRO = 1000 / 60;
/** `--gif <file>`: also a GIF of the whole screen at real speed (use --cada 3), the entry + ~2 s at the station */
const GIF = arg('--gif', null);
const quadros = [];
let depois = 0;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log('[ERRO]', e.stack));
await page.goto(`http://localhost:${PORTA}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
await page.waitForFunction(() => {
  const g = window.__game.scene;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao';
}, null, { timeout: 120000, polling: 50 });
await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.damageShip = () => {};
  s.ship.setPosition(60, 110);
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
});
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
let i = 0;
for (;;) {
  const est = await page.evaluate(() => {
    const b = window.__game.scene.getScene('Game').boss;
    return { x: b.sprite.x, entering: b.entering, cabos: b.cabos.cabos.map((c) => ({ L: +c.corda.comprimento.toFixed(1), max: +c.max.toFixed(1) })) };
  });
  const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  const nativa = await sharp(foto).resize(384, 216, { kernel: 'nearest' }).png().toBuffer();
  const nome = `e${String(i).padStart(3, '0')}-x${Math.round(est.x)}.png`;
  await sharp(nativa).extract({ left: 200, top: 0, width: 184, height: 120 }).resize(184 * ZOOM, 120 * ZOOM, { kernel: 'nearest' }).toFile(path.join(OUT, nome));
  // the rope layer ALONE (the CanvasTexture), same crop — to tell a rope glitch from the art under it
  const camada = await page.evaluate(() => {
    const t = window.__game.scene.getScene('Game').textures.get('guardiaoCabos');
    return Array.from(t.context.getImageData(0, 0, 384, 216).data);
  });
  await sharp(Buffer.from(camada), { raw: { width: 384, height: 216, channels: 4 } })
    .extract({ left: 200, top: 0, width: 184, height: 120 })
    .flatten({ background: { r: 40, g: 120, b: 160 } })
    .resize(184 * ZOOM, 120 * ZOOM, { kernel: 'nearest' })
    .toFile(path.join(OUT, 'c-' + nome));
  if (GIF) quadros.push(await sharp(nativa).resize(384 * 2, 216 * 2, { kernel: 'nearest' }).png().toBuffer());
  console.log(nome, est.entering ? 'entrando' : 'parado', JSON.stringify(est.cabos.slice(0, 4)));
  if (!est.entering) depois++;
  if (depois > (GIF ? 40 : 0) || i > 2000) break;
  await passo(CADA);
  i++;
}
await browser.close();
if (GIF) {
  await sharp(quadros, { join: { animated: true } })
    .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * CADA)), loop: 0, colours: 96, interFrameMaxError: 8 })
    .toFile(GIF);
  console.log(GIF, quadros.length, 'quadros');
}
