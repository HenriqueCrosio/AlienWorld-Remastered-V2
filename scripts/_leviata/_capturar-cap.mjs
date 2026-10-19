// BLOCO D — previews inside ANY chapter of the final cutscene (dev key F): the scene is paused once it reaches the
// chapter, the texture <chave> is swapped for each candidate, the textures in <esconder> (comma list) and the ship are
// hidden. With the chapter's own Atmosfera on. Today's art (the untouched texture) comes first, named "hoje".
//   node scripts/_leviata/_capturar-cap.mjs <capitulo> <chave> <esconder|-> <imgDir> <png> [<png> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const [CAP_S, CHAVE, ESC, imgDir, ...pngs] = process.argv.slice(2);
const CAP = Number(CAP_S);
const esconder = ESC === '-' ? [] : ESC.split(',');
fs.mkdirSync(imgDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F');
await page.waitForFunction((c) => window.__game.scene.getScene('Interlude4')?.estado?.capitulo === c, CAP, { polling: 50, timeout: 60000 });
await page.waitForTimeout(1500);

await page.evaluate(async ({ texs, esconder }) => {
  const s = window.__game.scene.getScene('Interlude4');
  s.scene.pause();
  for (const [k, url] of texs) {
    if (s.textures.exists(k)) continue;
    await new Promise((res) => { s.textures.once(`addtexture-${k}`, res); s.textures.addBase64(k, url); });
  }
  for (const o of s.children.list) if (esconder.includes(o.texture?.key)) o.setVisible(false);
  s.ship?.setVisible(false);
}, { texs: pngs.map((f) => [`cand-${path.basename(f, '.png')}`, `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`]), esconder });

const foto = () => page.evaluate(() => new Promise((res) => window.__game.renderer.snapshot((img) => {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  res(c.toDataURL('image/png'));
}))).then((u) => Buffer.from(u.split(',')[1], 'base64'));

for (const f of ['hoje', ...pngs]) {
  const nome = f === 'hoje' ? 'hoje' : path.basename(f, '.png');
  await page.evaluate(({ chave, k, esconder }) => {
    const s = window.__game.scene.getScene('Interlude4');
    const alvo = s.children.list.find((o) => o.getData?.('candAlvo') || o.texture?.key === chave);
    alvo.setData('candAlvo', true);
    alvo.setTexture(k ?? chave);
    // Today's companion layers (the lava) show only with today's art.
    for (const o of s.children.list) if (esconder.includes(o.texture?.key)) o.setVisible(!k);
  }, { chave: CHAVE, k: f === 'hoje' ? null : `cand-${nome}`, esconder });
  await new Promise((r) => setTimeout(r, 200));
  const q = await foto();
  const m = await sharp(q).metadata();
  await sharp(q).resize(m.width * 2, m.height * 2, { kernel: 'nearest' }).toFile(path.join(imgDir, `${nome}-cap${CAP}.png`));
  console.log(nome);
}
await browser.close();
