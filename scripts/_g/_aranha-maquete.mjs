// 27/10 — THE SPIDER IN THE CAVE, a mock-up IN THE GAME (memory: measure the background in the game, with the image
// treatment): the F1 runs headless to the middle of the cave hall, and the spider (`_aranha-silhueta.mjs`) is added to
// the scene there — only in this page, nothing in src/ — on the hall's back painting (depth just above it: under the
// mist, the opening's halo and the cold beams, which play over it), under the hall's mask, riding the painting's drift.
// Each concept is one photo of the same frame (and `filme` steps the hall with the spiders on, for the drift).
//   node scripts/_g/_aranha-maquete.mjs <outDir> <conceitos.json> [--filme <segundos>]
// conceitos.json: [{ "nome": "pendurada-preto", "pose": "pendurada", "estilo": "preto", "k": 1, "x": 318, "y": 47,
//                    "ancora": "fio" | "pes" | "corpo" }]  (x, y in px of the hall's PAINTING — 429×216; `ancora`: which
//                    point of the spider lands on x, y: the top of the thread, the middle of the feet, or the body)
// Needs `npm run dev` on :5173.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { desenharAranha, pintarAranha } from './_aranha-silhueta.mjs';

const args = process.argv.slice(2);
const iFilme = args.indexOf('--filme');
const FILME = iFilme >= 0 ? Number(args[iFilme + 1]) : 0;
const [OUT, JSON_] = args.filter((a, i) => !a.startsWith('--') && (iFilme < 0 || i !== iFilme + 1));
fs.mkdirSync(OUT, { recursive: true });
const conceitos = JSON_ ? JSON.parse(fs.readFileSync(JSON_, 'utf8')) : [];

// the spiders as PNG data URLs, with the anchor in the sprite
const sprites = await Promise.all(conceitos.map(async (c) => {
  const a = desenharAranha(c.pose, { k: c.k ?? 1, semente: c.semente ?? 7 });
  const buf = pintarAranha(a, { estilo: c.estilo ?? 'preto', ...(c.aro ? { aro: parseInt(c.aro, 16) } : {}) });
  const png = await sharp(buf, { raw: { width: a.w, height: a.h, channels: 4 } }).png().toBuffer();
  // the anchor: top of the thread / the feet's middle (the lowest row's mean x) / the rig's origin
  let ax = a.ox, ay = a.oy;
  if (c.ancora === 'fio') {
    const k = a.m.indexOf(2); // the thread's topmost pixel
    ax = k % a.w; ay = Math.floor(k / a.w);
  }
  if (c.ancora === 'pes' || c.ancora === 'teto') {
    const y = c.ancora === 'pes' ? a.h - 1 - [...Array(a.h).keys()].find((d) => a.m.subarray((a.h - 1 - d) * a.w, (a.h - d) * a.w).some(Boolean))
      : [...Array(a.h).keys()].find((d) => a.m.subarray(d * a.w, (d + 1) * a.w).some(Boolean));
    ay = y;
  }
  return { ...c, w: a.w, h: a.h, ax, ay, url: 'data:image/png;base64,' + png.toString('base64') };
}));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1000);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' }));
await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) > 0.5, null, { timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game, s = g.scene.getScene('Game');
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  s.invulnerableUntil = 1e12;
  if (s.cartas) s.cartas.intocavel = () => true;
  s.elapsed = 30;
  s.director.skipTo(30);
});
const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { x: c.left, y: c.top, width: c.width, height: c.height };
});

// steps the stage (the ship parked, the enemies and their shots hidden: the photo is of the hall)
const passos = (n) => page.evaluate((n) => {
  const g = window.__game, s = g.scene.getScene('Game');
  const int = s.children.list.find((o) => o.texture?.key === 'f1-cav-interior');
  // (before the step too: the step renders — 1st pass, the first concept was photographed at the corner)
  const prende = () => { for (const a of window.__aranhas ?? []) a.img.setPosition(Math.round(int.x + a.x - a.ax), Math.round(int.y + a.y - a.ay)); };
  for (let i = 0; i < n; i++) {
    prende();
    window.__passo.t += 1000 / 60;
    g.step(window.__passo.t, 1000 / 60);
    s.ship.x = 70; s.ship.y = 110; s.ship.body?.setVelocity?.(0, 0);
    for (const gr of [s.enemies?.enemies, s.enemyBullets]) for (const o of gr?.getChildren?.() ?? []) o.setVisible(false);
    prende();
  }
  return s.elapsed;
}, n);

// into the hall: the band of the entrance gone off the left edge
await page.evaluate(() => { window.__entrou = null; });
for (let i = 0; i < 1500; i++) {
  await passos(10);
  const ok = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const L = s.cache.json.get('f1-caverna').largura;
    const faixas = s.children.list.filter((o) => o.texture?.key === 'f1-cav-faixa' && o.visible);
    return s.parallax.cavernaAberta() && faixas.every((f) => f.x + L < 0 || f.x > 384);
  });
  if (ok) break;
}
await passos(60); // a second into the hall
const estado = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const int = s.children.list.find((o) => o.texture?.key === 'f1-cav-interior');
  return { t: +s.elapsed.toFixed(2), interiorX: +int.x.toFixed(1), depth: int.depth };
});
console.log('no salão:', estado);

const foto = async (nome) => {
  const b = await page.screenshot({ clip: geo });
  await sharp(b).resize(1152, 648, { kernel: 'nearest' }).png().toFile(path.join(OUT, `${nome}.png`));
};
await foto('sem-aranha');
// the same frame without the cave's front ceiling band (which of the stalactites are the painting's, which the band's)
await page.evaluate(() => { for (const o of window.__game.scene.getScene('Game').children.list) if (o.texture?.key === 'f1-cav-teto') o.setData('era', o.visible).setVisible(false); });
await passos(1);
await foto('sem-teto');
await page.evaluate(() => { for (const o of window.__game.scene.getScene('Game').children.list) if (o.texture?.key === 'f1-cav-teto') o.setVisible(true); });

// the spiders: one at a time on the same frame
await page.evaluate(async (sprites) => {
  const s = window.__game.scene.getScene('Game');
  const int = s.children.list.find((o) => o.texture?.key === 'f1-cav-interior');
  window.__aranhas = [];
  for (const c of sprites) {
    const chave = 'aranha-maquete-' + c.nome;
    await new Promise((ok) => { const im = new Image(); im.onload = () => { s.textures.addImage(chave, im); ok(); }; im.src = c.url; });
    // just above the painting and its embers (−82.95), under the back mist (−82.6), the halo and the beams
    const img = s.add.image(0, 0, chave).setOrigin(0, 0).setDepth(-82.9).setMask(int.mask).setVisible(false);
    window.__aranhas.push({ img, x: c.x, y: c.y, ax: c.ax, ay: c.ay, nome: c.nome });
  }
}, sprites.map(({ nome, url, x, y, ax, ay }) => ({ nome, url, x, y, ax, ay })));

const ver = (nomes) => page.evaluate((nomes) => { for (const a of window.__aranhas) a.img.setVisible(nomes.includes(a.nome)); }, nomes);
for (const c of sprites) {
  await ver([c.nome]);
  await passos(1);
  await foto(c.nome);
}
if (FILME) {
  // all of them together, the hall going by (photos at 15 fps)
  await ver(sprites.filter((c) => c.filme !== false).map((c) => c.nome));
  fs.mkdirSync(path.join(OUT, 'filme'), { recursive: true });
  for (let i = 0; i < FILME * 15; i++) {
    await passos(4);
    const b = await page.screenshot({ clip: geo });
    await sharp(b).resize(1152, 648, { kernel: 'nearest' }).png().toFile(path.join(OUT, 'filme', `q${String(i).padStart(4, '0')}.png`));
  }
}
console.log(erros.length ? 'erros: ' + erros.join(' | ') : 'sem erro de página');
await browser.close();
