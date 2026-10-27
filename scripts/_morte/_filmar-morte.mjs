// 26/10 — THE SHIP'S DEATH filmed in the real game, on a stepped clock (60 steps/s, a photo every 2 = 30 fps), one
// panel per style, stacked with its name on top: the comparison side by side. The ship is killed by the REAL path
// (`damageShip` on the last life), with the same seed in every panel; the world is cleared (no script, no enemies, no
// rocks) so only the death is on screen. Panel `antes` replays the old death (the PixelLab fireball, the frozen world).
//   node scripts/_morte/_filmar-morte.mjs <out.webm> <cena> [estilos=antes,estilhacos,desintegra,ruptura] [--gif]
//   (a style `X:sem` = without the player's signature of 27/10 — the overload, the ring, the chain)
//   cenas: f2 (Terminus laranja, vacuum) · f1 (X-Aelo osso, the atmosphere: gravity) · f3 (the Charybdis)
//          · f4 (X-Aelo laranja) · f2preta (Terminus preta)
// (with `npm run dev` running; do not touch src/ or .html while it films — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { webm } from '../_menu/_webm.mjs';

const args = process.argv.slice(2);
const GIF = args.includes('--gif');
/** keep the composed frames (`_q-<name>/`) for close-up checks */
const MANTER = args.includes('--manter');
const [OUT, CENA = 'f2', ESTILOS = 'antes,estilhacos,desintegra,ruptura'] = args.filter((a) => !a.startsWith('--'));
const CENAS = {
  f2: { stage: 2, ship: 'humana', modelo: 'a', pintura: 'laranja', nome: 'TERMINUS laranja · F2, no vácuo', y: 108 },
  f2preta: { stage: 2, ship: 'humana', modelo: 'a', pintura: 'preta', nome: 'TERMINUS preta · F2', y: 108 },
  f1: { stage: 1, ship: 'humana', modelo: 'jato', pintura: 'osso', nome: 'X-AELO osso · F1, na atmosfera (gravidade)', y: 96 },
  f3: { stage: 3, ship: 'alienigena', modelo: 'a', pintura: 'laranja', nome: 'CHARYBDIS · F3', y: 108 },
  f4: { stage: 4, ship: 'humana', modelo: 'jato', pintura: 'laranja', nome: 'X-AELO laranja · F4', y: 108 },
};
const NOMES = {
  antes: 'ANTES — a explosão do PixelLab',
  estilhacos: 'A — ESTILHAÇOS',
  desintegra: 'B — DESINTEGRAÇÃO',
  ruptura: 'C — RUPTURA',
};
const cena = CENAS[CENA];
if (!cena) throw new Error(`cena desconhecida: ${CENA}`);
const estilos = ESTILOS.split(',');
const ZOOM = 2;
const CLIP = { x: 8, y: 30, w: 336, h: 172 };
const NAVE_X = 104;
const MATA_EM = 0.5; // s of flight before the blow
const MAX_S = 5.5;
const ROTULO = 26;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);

async function gravar(estilo) {
  await page.evaluate(() => {
    const g = window.__game;
    g.loop.wake();
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate(({ cena, estilo }) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.registry.set('modeloNave', cena.modelo);
    g.registry.set('pinturaNave', cena.pintura);
    // `estilo:sem` = the death of 26/10 alone, without the player's signature of 27/10 (`MORTE.assinatura`)
    const [est, mod] = estilo.split(':');
    g.registry.set('estiloMorte', est === 'antes' ? undefined : est);
    g.registry.set('assinaturaMorte', mod !== 'sem');
    g.registry.set('sementeMorte', 20261026);
    g.scene.start('Game', { stage: cena.stage, ship: cena.ship, handling: 'diegetico' });
  }, { cena, estilo });
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(700);
  await page.evaluate(({ y, x }) => {
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
    window.__naveEm = { x, y };
    // the same luck in every panel
    let a = 20261026;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const g = window.__game;
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
    // the tweens run on Date.now (memory `avaliar-skill-por-gif`): follow the stepped clock
    const base = Date.now(), t0 = window.__passo.t;
    Date.now = () => base + (window.__passo.t - t0);
  }, { y: cena.y, x: NAVE_X });
  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  const passo = (n) => page.evaluate((n) => {
    const g = window.__game;
    for (let i = 0; i < n; i++) {
      const s = g.scene.getScene('Game');
      if (!g.scene.isActive('Game')) return false;
      // before the blow the ship holds still (no hands on the keys: in the F1 it would fall)
      if (!s.over) {
        s.ship.setPosition(window.__naveEm.x, window.__naveEm.y);
        s.ship.body.setVelocity(0, 0);
      }
      window.__passo.t += 1000 / 60;
      g.step(window.__passo.t, 1000 / 60);
    }
    return g.scene.isActive('Game');
  }, n);
  const quadros = [];
  let morto = false;
  for (let i = 0; i < MAX_S * 30; i++) {
    const seg = i / 30;
    if (!morto && seg >= MATA_EM) {
      morto = true;
      await page.evaluate((estilo) => {
        const s = window.__game.scene.getScene('Game');
        if (estilo === 'antes') {
          // the old death, as it was (25/10): the fireball, the ship gone, the world frozen
          s.over = true;
          s.ship.setVisible(false);
          s.ship.body.enable = false;
          s.fx.explode(s.ship.x, s.ship.y, 1.4);
          s.fx.explode(s.ship.x, s.ship.y, 2.2);
          s.cameras.main.flash(90, 255, 122, 168);
          s.time.delayedCall(900, () => s.scene.start('GameOver', { score: 0, handling: 'diegetico', victory: false, stage: 2, ship: 'humana', baseScore: 0 }));
          return;
        }
        s.lives = 1;
        s.invulnerableUntil = 0;
        s.damageShip();
      }, estilo);
    }
    const vivo = await passo(2);
    if (!vivo) break;
    const foto = await page.screenshot({
      clip: { x: geo.left + CLIP.x * geo.k, y: geo.top + CLIP.y * geo.k, width: CLIP.w * geo.k, height: CLIP.h * geo.k },
    });
    quadros.push(await sharp(foto).resize(CLIP.w * ZOOM, CLIP.h * ZOOM, { kernel: 'nearest' }).png().toBuffer());
  }
  return quadros;
}

const porPainel = [];
for (const e of estilos) {
  const q = await gravar(e);
  console.log(e, q.length, 'quadros');
  porPainel.push(q);
}
await browser.close();

// The panels stacked, each with its name; the shorter ones hold their last frame (the old death ends at 0.9 s).
const W = CLIP.w * ZOOM, HP = CLIP.h * ZOOM;
const rotulo = (txt) => sharp(Buffer.from(
  `<svg width="${W}" height="${ROTULO}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="8" y="${ROTULO - 7}" font-family="Consolas, monospace" font-size="15" fill="#ffb040">${txt}</text></svg>`,
)).png().toBuffer();
const rotulos = await Promise.all(estilos.map((e) => {
  const [est, mod] = e.split(':');
  return rotulo(`${NOMES[est] ?? est}${est === 'antes' ? '' : mod === 'sem' ? ' (26/10, sem a assinatura)' : ' + a assinatura (27/10)'}  ·  ${cena.nome}`);
}));
const n = Math.max(...porPainel.map((q) => q.length));
const H = estilos.length * (HP + ROTULO);
const dir = path.join(path.dirname(OUT), `_q-${path.basename(OUT, path.extname(OUT))}`);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const gifQuadros = [];
for (let i = 0; i < n; i++) {
  const comp = [];
  porPainel.forEach((q, k) => {
    const top = k * (HP + ROTULO);
    comp.push({ input: rotulos[k], left: 0, top });
    comp.push({ input: q[Math.min(i, q.length - 1)], left: 0, top: top + ROTULO });
  });
  const png = await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer();
  fs.writeFileSync(path.join(dir, `${String(i).padStart(5, '0')}.png`), png);
  if (GIF && i % 2 === 0) gifQuadros.push(png);
}
const nq = await webm(dir, OUT, 30);
// a few stills for the sheet: <out>-<s>.png
for (const s of [0.55, 0.75, 1.0, 1.4, 2.0, 2.6]) {
  const i = Math.round(s * 30);
  if (i < n) fs.copyFileSync(path.join(dir, `${String(i).padStart(5, '0')}.png`), OUT.replace(/\.webm$/, `-${String(s).replace('.', '_')}.png`));
}
if (GIF) {
  await sharp(gifQuadros, { join: { animated: true } }).gif({ delay: Array(gifQuadros.length).fill(67), loop: 0 }).toFile(OUT.replace(/\.webm$/, '.gif'));
}
if (!MANTER) fs.rmSync(dir, { recursive: true, force: true });
console.log(OUT, nq, 'quadros', erros.length ? erros : 'sem erro');
