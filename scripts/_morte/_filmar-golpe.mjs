// 26/10 — EACH SHIP'S WHOLE ARC, filmed in the real game on a stepped clock (60 steps/s, a photo every 2 = 30 fps): the
// ship flies (a slow sway, so the scar is seen riding on it), loses a life at 0.5 s and another at 2.3 s (the hull loss,
// `MORTE.golpe` — the second one leaves it on the last life: the smoke and the coughing engine start), and dies at 4.1 s
// in its own style (no override). One panel per ship, stacked, with its name; plus a close-up of the first hull
// loss of each, side by side (×4), as a GIF.
//   node scripts/_morte/_filmar-golpe.mjs <out.webm> [naves=xaelo,terminus,charybdis] [--manter]
// (with `npm run dev` running; do not touch src/ or .html while it films — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { webm } from '../_menu/_webm.mjs';

const args = process.argv.slice(2);
const MANTER = args.includes('--manter');
const [OUT, NAVES = 'xaelo,terminus,charybdis'] = args.filter((a) => !a.startsWith('--'));
const CENAS = {
  xaelo: { stage: 2, ship: 'humana', modelo: 'jato', pintura: 'osso', nome: 'X-AELO osso · C, ruptura · F2' },
  terminus: { stage: 2, ship: 'humana', modelo: 'a', pintura: 'laranja', nome: 'TERMINUS laranja · A, estilhaços · F2' },
  charybdis: { stage: 3, ship: 'alienigena', modelo: 'a', pintura: 'laranja', nome: 'CHARYBDIS · B, desintegração · F3' },
  xaelof1: { stage: 1, ship: 'humana', modelo: 'jato', pintura: 'laranja', nome: 'X-AELO laranja · C, ruptura · F1' },
  terminuspreta: { stage: 4, ship: 'humana', modelo: 'a', pintura: 'preta', nome: 'TERMINUS preta · A, estilhaços · F4' },
};
const naves = NAVES.split(',');
for (const n of naves) if (!CENAS[n]) throw new Error(`nave desconhecida: ${n}`);
const ZOOM = 2;
const CLIP = { x: 8, y: 30, w: 336, h: 172 };
const NAVE_X = 104;
const NAVE_Y = 108;
const GOLPES = [0.5, 2.3];
const MATA_EM = 4.1;
const MAX_S = 8.5;
const ROTULO = 26;
/** the close-up: around the ship, ×4, from just before the first hit */
const PERTO = { w: 80, h: 56, zoom: 4, de: 0.4, ate: 2.0 };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);

async function gravar(cena) {
  await page.evaluate(() => {
    const g = window.__game;
    g.loop.wake();
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate((cena) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.registry.set('modeloNave', cena.modelo);
    g.registry.set('pinturaNave', cena.pintura);
    g.registry.set('estiloMorte', undefined);
    g.registry.set('sementeMorte', 20261026);
    g.scene.start('Game', { stage: cena.stage, ship: cena.ship, handling: 'diegetico' });
  }, cena);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(700);
  await page.evaluate(({ x, y }) => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    s.enemies.enemyBullets?.clear(true, true);
    s.spawnHazards = () => {};
    s.debris.hazards.clear(true, true);
    s.parallax.setForegroundDimmed(true, 0);
    s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
    s.banner.setAlpha(0);
    s.bannerFaixa.setAlpha(0);
    s.invulnerableUntil = 0;
    s.lives = 3;
    window.__naveEm = { x, y };
    let a = 20261026;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const g = window.__game;
    g.loop.sleep();
    window.__passo = { t: g.loop.now, seg: 0 };
    const base = Date.now(), t0 = window.__passo.t;
    Date.now = () => base + (window.__passo.t - t0);
  }, { x: NAVE_X, y: NAVE_Y });
  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  // a step: the ship sways slowly (a sine on y, with the matching speed so it tilts as it does under the hand)
  const passo = (n) => page.evaluate((n) => {
    const g = window.__game;
    for (let i = 0; i < n; i++) {
      const s = g.scene.getScene('Game');
      if (!g.scene.isActive('Game')) return null;
      const P = window.__passo;
      if (!s.over) {
        const w = (2 * Math.PI) / 2.4;
        s.ship.setPosition(window.__naveEm.x, window.__naveEm.y + 12 * Math.sin(w * P.seg));
        s.ship.body.setVelocity(0, 12 * w * Math.cos(w * P.seg));
      }
      P.t += 1000 / 60;
      P.seg += 1 / 60;
      g.step(P.t, 1000 / 60);
    }
    const s = g.scene.getScene('Game');
    return g.scene.isActive('Game') ? { x: s.ship.x, y: s.ship.y } : null;
  }, n);
  const quadros = [];
  const perto = [];
  const golpes = [...GOLPES];
  let morto = false;
  for (let i = 0; i < MAX_S * 30; i++) {
    const seg = i / 30;
    if (golpes.length && seg >= golpes[0]) {
      golpes.shift();
      await page.evaluate(() => {
        const s = window.__game.scene.getScene('Game');
        s.invulnerableUntil = 0;
        s.damageShip();
      });
    }
    if (!morto && seg >= MATA_EM) {
      morto = true;
      await page.evaluate(() => {
        const s = window.__game.scene.getScene('Game');
        s.lives = 1;
        s.invulnerableUntil = 0;
        s.damageShip();
      });
    }
    const nave = await passo(2);
    if (!nave) break;
    const foto = await page.screenshot({
      clip: { x: geo.left + CLIP.x * geo.k, y: geo.top + CLIP.y * geo.k, width: CLIP.w * geo.k, height: CLIP.h * geo.k },
    });
    quadros.push(await sharp(foto).resize(CLIP.w * ZOOM, CLIP.h * ZOOM, { kernel: 'nearest' }).png().toBuffer());
    if (seg >= PERTO.de && seg <= PERTO.ate) {
      // the close-up holds still on the ship's sway centre (the bite and the pieces, not the camera, move)
      const px = Math.round(NAVE_X - PERTO.w / 2), py = Math.round(NAVE_Y - PERTO.h / 2);
      const f = await page.screenshot({
        clip: { x: geo.left + px * geo.k, y: geo.top + py * geo.k, width: PERTO.w * geo.k, height: PERTO.h * geo.k },
      });
      perto.push(await sharp(f).resize(PERTO.w * PERTO.zoom, PERTO.h * PERTO.zoom, { kernel: 'nearest' }).png().toBuffer());
    }
  }
  return { quadros, perto };
}

const porPainel = [];
for (const n of naves) {
  const r = await gravar(CENAS[n]);
  console.log(n, r.quadros.length, 'quadros', r.perto.length, 'de perto');
  porPainel.push(r);
}
await browser.close();

const rotulo = (txt, w) => sharp(Buffer.from(
  `<svg width="${w}" height="${ROTULO}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="8" y="${ROTULO - 7}" font-family="Consolas, monospace" font-size="15" fill="#ffb040">${txt}</text></svg>`,
)).png().toBuffer();

// THE FILM: the panels stacked; the shorter ones hold their last frame.
const W = CLIP.w * ZOOM, HP = CLIP.h * ZOOM;
const rotulos = await Promise.all(naves.map((n) => rotulo(CENAS[n].nome, W)));
const nq = Math.max(...porPainel.map((p) => p.quadros.length));
const H = naves.length * (HP + ROTULO);
const dir = path.join(path.dirname(OUT), `_q-${path.basename(OUT, path.extname(OUT))}`);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
for (let i = 0; i < nq; i++) {
  const comp = [];
  porPainel.forEach((p, k) => {
    const top = k * (HP + ROTULO);
    comp.push({ input: rotulos[k], left: 0, top });
    comp.push({ input: p.quadros[Math.min(i, p.quadros.length - 1)], left: 0, top: top + ROTULO });
  });
  const png = await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer();
  fs.writeFileSync(path.join(dir, `${String(i).padStart(5, '0')}.png`), png);
}
const feitos = await webm(dir, OUT, 30);
for (const s of [0.6, 0.8, 2.4, 3.0, 4.4, 5.0]) {
  const i = Math.round(s * 30);
  if (i < nq) fs.copyFileSync(path.join(dir, `${String(i).padStart(5, '0')}.png`), OUT.replace(/\.webm$/, `-${String(s).replace('.', '_')}.png`));
}
if (!MANTER) fs.rmSync(dir, { recursive: true, force: true });

// THE CLOSE-UP: the first hull loss of each ship, side by side, ×4, at 15 fps (every other photo), looping.
const WP = PERTO.w * PERTO.zoom, HPP = PERTO.h * PERTO.zoom, GAP = 6;
const rotulosP = await Promise.all(naves.map((n) => rotulo(CENAS[n].nome.split(' · ').slice(0, 2).join(' · '), WP)));
const np = Math.max(...porPainel.map((p) => p.perto.length));
const gif = [];
for (let i = 0; i < np; i += 2) {
  const comp = [];
  porPainel.forEach((p, k) => {
    const left = k * (WP + GAP);
    comp.push({ input: rotulosP[k], left, top: 0 });
    comp.push({ input: p.perto[Math.min(i, p.perto.length - 1)], left, top: ROTULO });
  });
  gif.push(await sharp({ create: { width: naves.length * (WP + GAP) - GAP, height: HPP + ROTULO, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer());
}
const outGif = OUT.replace(/\.webm$/, '-perto.gif');
await sharp(gif, { join: { animated: true } }).gif({ delay: Array(gif.length).fill(67), loop: 0 }).toFile(outGif);
console.log(OUT, feitos, 'quadros ·', outGif, gif.length, 'quadros ·', erros.length ? erros : 'sem erro');
