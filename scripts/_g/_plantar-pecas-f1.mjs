// BLOCO G · round 6 — candidate structures PLANTED IN THE REAL GAME (not pasted over a screenshot, as round 3 did): the
// F1 starts, the scene is paused (it still renders), enemies and the real props are hidden, and each candidate PNG is
// loaded as a texture and placed as the game places a prop — origin on the foot, the foot inside the planting band,
// depth −0.5 − (213 − foot)·0.002, so the front rubble strip (−0.2) covers the foot and the image treatment applies to it.
// Each piece is brought to its GAME box first (trimmed; reduced when bigger — never enlarged; alpha binary).
//   node scripts/_g/_plantar-pecas-f1.mjs <paineis.json> <outDir>      (with `npm run dev` running)
// paineis.json: { "paineis": [ { "nome": "predio", "t": 20, "pecas": [ { "arq": "…png", "x": 60, "pe": 208,
//                 "caixa": { "w": 64, "h": 64 }, "espelha": false } ] } ] }
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const [LISTA, OUT] = process.argv.slice(2);
const { paineis } = JSON.parse(fs.readFileSync(LISTA, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

async function preparar(arq, caixa) {
  const t = await sharp(arq).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  let { width: w, height: h } = t.info;
  const k = Math.min(1, caixa.w / w, caixa.h / h);
  let raw = await sharp(t.data).ensureAlpha().raw().toBuffer();
  if (k < 1) {
    w = Math.max(1, Math.round(w * k));
    h = Math.max(1, Math.round(h * k));
    raw = await sharp(t.data).resize(w, h, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  }
  for (let i = 3; i < raw.length; i += 4) raw[i] = raw[i] >= 128 ? 255 : 0;
  const png = await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' }));
await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) > 1, null, { timeout: 30000 });
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.scene.pause();
  if (window.__gameHD?.canvas) window.__gameHD.canvas.style.visibility = 'hidden';
  for (const gr of [s?.enemies?.enemies, s?.debris?.hazards, s?.enemyBullets, s?.terrain?.props]) if (gr?.children) gr.getChildren().forEach((o) => o.setVisible(false));
  s.ship?.setVisible(false);
  window.__plantadas = [];
});
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });

for (const pn of paineis) {
  const pecas = [];
  for (const [j, p] of pn.pecas.entries()) pecas.push({ ...p, url: await preparar(p.arq, p.caixa), chave: `planta-${pn.nome}-${j}` });
  await page.evaluate(async ({ pecas, t }) => {
    const s = window.__game.scene.getScene('Game');
    for (const o of window.__plantadas) o.destroy();
    window.__plantadas = [];
    for (const p of pecas) {
      if (!s.textures.exists(p.chave)) {
        await new Promise((res) => { s.textures.once(`addtexture-${p.chave}`, res); s.textures.addBase64(p.chave, p.url); });
      }
      const img = s.add.image(p.x, p.pe, p.chave).setOrigin(0.5, 1).setDepth(-0.5 - (213 - p.pe) * 0.002).setFlipX(!!p.espelha);
      window.__plantadas.push(img);
    }
    const par = s.parallax;
    par.setRelogio(t);
    par.update(0, 0);
  }, { pecas: pecas.map(({ url, chave, x, pe, espelha }) => ({ url, chave, x, pe, espelha })), t: pn.t ?? 20 });
  await page.waitForTimeout(150);
  const shot = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  await sharp(shot).resize(384, 216, { kernel: 'nearest' }).resize(384 * 3, 216 * 3, { kernel: 'nearest' }).png().toFile(path.join(OUT, `${pn.nome}.png`));
  console.log(pn.nome, pecas.length);
}
await browser.close();
