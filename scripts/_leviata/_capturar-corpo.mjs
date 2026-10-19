// BLOCO D — previews for the body concept sheet, step 2 of 2: the REAL game, paused, with the Leviathan's texture
// swapped for each concept (the reductions from `_folha-corpo.mjs`) — same depth, tint, alpha and layers in front.
//   · menu: mid-crossing (~6s), the swim sprite gets the 70px concept at scale 1 (today: 116² frame at 0.6);
//   · F2: the distant silhouette far (stage start: scale 0.5 of 116px) and near (setApproach(1): 1.15 of 116px).
//     The 133px concept is drawn at the matching scale (×116/133) so the on-screen size is the same as today's.
// Needs `npm run dev` on :5173.
//   node scripts/_leviata/_capturar-corpo.mjs <imgDir>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const [imgDir] = process.argv.slice(2);
const red = path.join(imgDir, 'red');
const nomes = ['hoje', ...new Set(fs.readdirSync(red).map((f) => f.replace(/-(70|133)\.png$/, '')))].sort();

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

// Load every reduction as a texture in the given scene.
const carregar = (cena) =>
  page.evaluate(
    async ({ cena, texs }) => {
      const s = window.__game.scene.getScene(cena);
      for (const [k, url] of texs) {
        if (s.textures.exists(k)) continue;
        await new Promise((res) => {
          s.textures.once(`addtexture-${k}`, res);
          s.textures.addBase64(k, url);
        });
      }
    },
    {
      cena,
      texs: fs.readdirSync(red).map((f) => [`lev-${f.replace(/\.png$/, '')}`,
        `data:image/png;base64,${fs.readFileSync(path.join(red, f)).toString('base64')}`]),
    },
  );

// The renderer's own snapshot: exactly the 384×216 frame.
const foto = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        window.__game.renderer.snapshot((img) => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          c.getContext('2d').drawImage(img, 0, 0);
          res(c.toDataURL('image/png'));
        });
      }),
  ).then((u) => Buffer.from(u.split(',')[1], 'base64'));

const ampliar = async (buf, k) => {
  const m = await sharp(buf).metadata();
  return sharp(buf).resize(m.width * k, m.height * k, { kernel: 'nearest' }).png().toBuffer();
};

// ─── menu ───
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await carregar('Menu');
await page.waitForTimeout(6500);
const pos = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Menu');
  s.scene.pause();
  s.leviatan.anims.stop();
  return { x: s.leviatan.x, y: s.leviatan.y, alpha: s.leviatan.alpha };
});
console.log('menu, leviatã em', pos);
const recorte = { left: 0, top: 0, width: 384, height: 120 };
for (const n of nomes) {
  await page.evaluate((k) => {
    const l = window.__game.scene.getScene('Menu').leviatan;
    if (k === 'lev-hoje') l.setTexture('leviathanSwimSheet', 0).setScale(0.6);
    else l.setTexture(k).setScale(1);
  }, n === 'hoje' ? 'lev-hoje' : `lev-${n}-70`);
  await new Promise((r) => setTimeout(r, 250));
  const f = await foto();
  fs.writeFileSync(path.join(imgDir, `${n}-menu.png`), await ampliar(await sharp(f).extract(recorte).toBuffer(), 3));
  // Zoom on the creature itself (x≈70, y=56).
  const zoom = { left: 20, top: 30, width: 110, height: 52 };
  fs.writeFileSync(path.join(imgDir, `${n}-menu-zoom.png`), await ampliar(await sharp(f).extract(zoom).toBuffer(), 5));
}

// ─── F2 ───
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.resume());
await page.keyboard.press('V');
// The same stage moment on every run (a fixed wait drifted with load time and caught different rocks in front).
await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) >= 1, null, { polling: 16, timeout: 30000 });
await carregar('Game');
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.scene.pause();
  // No enemies or debris in the way of the comparison.
  for (const g of [s.enemies?.enemies, s.debris?.hazards]) g?.getChildren().forEach((o) => o.setVisible(false));
});
for (const n of nomes) {
  const quadros = [];
  for (const t of [0, 1]) {
    await page.evaluate(({ k, t }) => {
      const p = window.__game.scene.getScene('Game').parallax;
      p.setApproach(t);
      const sx = p.leviathan.scaleX;
      if (k === 'lev-hoje') p.leviathan.setTexture('leviathan');
      else p.leviathan.setTexture(k).setScale((sx * 116) / 133);
    }, { k: n === 'hoje' ? 'lev-hoje' : `lev-${n}-133`, t });
    await new Promise((r) => setTimeout(r, 250));
    quadros.push(await foto());
    await page.evaluate(() => window.__game.scene.getScene('Game').parallax.leviathan.setTexture('leviathan'));
  }
  const lado = await sharp({ create: { width: 384 * 2 + 4, height: 216, channels: 4, background: '#262c3a' } })
    .composite([{ input: quadros[0], left: 0, top: 0 }, { input: quadros[1], left: 388, top: 0 }]).png().toBuffer();
  fs.writeFileSync(path.join(imgDir, `${n}-f2.png`), await ampliar(lado, 2));
  // Zoom on the near silhouette (centre 250, 84; 133px wide).
  const zoom = { left: 170, top: 44, width: 164, height: 80 };
  fs.writeFileSync(path.join(imgDir, `${n}-f2-zoom.png`), await ampliar(await sharp(quadros[1]).extract(zoom).toBuffer(), 4));
  console.log(n);
}

await browser.close();
