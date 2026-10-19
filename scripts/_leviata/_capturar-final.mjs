// BLOCO D · passo 2 — previews of the weakened Leviathan inside the REAL final scene, chapter 4 (the wound): the
// cutscene (dev key F on the menu) is paused once it reaches chapter 4, the body texture `f8Leviata` is swapped for
// each candidate at scale 1, the old lava layer, the particles and the ship are hidden. Two framings per candidate:
// facing LEFT (mirrored, today's composition) and facing RIGHT (as the base was drawn). Needs `npm run dev`.
//   node scripts/_leviata/_capturar-final.mjs <imgDir> <png> [<png> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const [imgDir, ...pngs] = process.argv.slice(2);
fs.mkdirSync(imgDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F');
await page.waitForFunction(() => window.__game.scene.getScene('Interlude4')?.estado?.capitulo === 4, null, { polling: 50, timeout: 30000 });
await page.waitForTimeout(400);

await page.evaluate(async (texs) => {
  const s = window.__game.scene.getScene('Interlude4');
  s.scene.pause();
  for (const [k, url] of texs) {
    if (s.textures.exists(k)) continue;
    await new Promise((res) => { s.textures.once(`addtexture-${k}`, res); s.textures.addBase64(k, url); });
  }
  for (const o of s.children.list) {
    if (o.texture?.key === 'f8LeviataLava' || o.type === 'ParticleEmitter') o.setVisible(false);
  }
  s.ship?.setVisible(false);
}, pngs.map((f) => [`fer-${path.basename(f, '.png')}`, `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`]));

const foto = () => page.evaluate(() => new Promise((res) => window.__game.renderer.snapshot((img) => {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  res(c.toDataURL('image/png'));
}))).then((u) => Buffer.from(u.split(',')[1], 'base64'));

for (const f of ['hoje', ...pngs]) {
  const nome = f === 'hoje' ? 'hoje' : path.basename(f, '.png');
  const quadros = [];
  // A cut from `_recortar-novo.mjs` (…-cena.png + …-caixa.json) already faces left and sits where its frame put it:
  // same placement rule as today's (box at 19, 41 of the frame → LEV_X/Y = 12, 6). Anything else: both facings.
  // (…-contido-cena50.png and the like share the box of their cut.)
  const caixaArq = f.replace(/(-contido)?-cena\d*\.png$/, '-caixa.json');
  const caixa = f !== 'hoje' && caixaArq !== f && fs.existsSync(caixaArq) ? JSON.parse(fs.readFileSync(caixaArq, 'utf8')) : null;
  const pos = caixa ? { x: 12 + caixa.left - 19, y: 6 + caixa.top - 41 } : { x: 12, y: 6 };
  for (const flip of f === 'hoje' || caixa ? [false] : [true, false]) {
    await page.evaluate(({ k, flip, pos }) => {
      const s = window.__game.scene.getScene('Interlude4');
      const corpo = s.children.list.find((o) => o.getData?.('levCorpo') || o.texture?.key === 'f8Leviata' || o.texture?.key?.startsWith('fer-'));
      corpo.setData('levCorpo', true);
      corpo.setTexture(k).setFlipX(flip).setPosition(pos.x, pos.y);
      // Today's lava layer goes back on only for today's body.
      for (const o of s.children.list) if (o.texture?.key === 'f8LeviataLava') o.setVisible(k === 'f8Leviata');
    }, { k: f === 'hoje' ? 'f8Leviata' : `fer-${nome}`, flip, pos });
    await new Promise((r) => setTimeout(r, 200));
    quadros.push(await foto());
  }
  const lado = await sharp({ create: { width: 384 * quadros.length + 4 * (quadros.length - 1), height: 216, channels: 4, background: '#262c3a' } })
    .composite(quadros.map((q, i) => ({ input: q, left: i * 388, top: 0 }))).png().toBuffer();
  const m = await sharp(lado).metadata();
  await sharp(lado).resize(m.width * 2, m.height * 2, { kernel: 'nearest' }).toFile(path.join(imgDir, `${nome}-final.png`));
  console.log(nome);
}
await browser.close();
