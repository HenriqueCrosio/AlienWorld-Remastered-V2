// THE BLEEDING CEILING IN GAME, at real speed (23/11, step 5): one bleeding in the F4 boss practice (33–0%), panels
// stacked, one per `modo` (`le` = the ship READS it: in a gap of the 1st wave while it falls, then into the 1st wave's
// old column after its last drop passed the ship's height, at its real top speed, 110 px/s; `parada` = it stays put
// under a 1st-wave column). Invulnerable and not firing; it prints the lives lost (the game's 1400 ms i-frames).
//   npm run dev, then  node scripts/_guardiao/_gif-teto.mjs <out.gif> [--porta 5173] [--zoom 2]
//     [--paineis le,parada] [--nave 100:110] [--fotos <dir>]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2];
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const PORTA = arg('--porta', '5173');
const ZOOM = Number(arg('--zoom', '2'));
const PAINEIS = arg('--paineis', 'le,parada').split(',');
const ROTULOS = PAINEIS.map((m) => `teto que sangra ${m === 'le' ? 'lendo' : 'parada'}`);
const [NAVE_X, NAVE_Y] = arg('--nave', '100:110').split(':').map(Number);
const FOTOS = arg('--fotos', null);
const QUADRO = 1000 / 60;
const POR_FOTO = 3;

async function filmar(modo, k) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
  await page.goto(`http://localhost:${PORTA}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
  await page.waitForFunction(() => {
    const g = window.__game.scene;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const s = g.getScene('Game');
    return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering && s.boss.acao === 'flutua';
  }, null, { timeout: 120000, polling: 250 });
  await page.evaluate(({ NAVE_X, NAVE_Y }) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    window.__dano = 0;
    // a LIFE = a call outside the game's 1400 ms i-frames (the real ones are off: invulnerable)
    s.damageShip = () => {
      const t = window.__passo?.t ?? 0;
      if (t - (window.__ultimo ?? -1e9) >= 1400) { window.__dano++; window.__ultimo = t; }
    };
    const b = s.boss;
    b.hpGuardiao = b.constructor.HP_GUARDIAO * 0.2;
    b.serra?.destroy?.();
    b.serra = null;
    b.acao = 'flutua';
    b.proxima = 'teto';
    b.acaoT = 0.6;
    b.cdTiro = 99;
    s.ship.setPosition(NAVE_X, NAVE_Y);
    window.__casa = { x: NAVE_X, y: NAVE_Y };
    window.__empurroes = 0;
    window.__maxEmpurrao = 0;
    window.__fim = 0;
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
  }, { NAVE_X, NAVE_Y });
  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  const passo = (n, le) =>
    page.evaluate(({ n, QUADRO, le }) => {
      const g = window.__game;
      const s = g.scene.getScene('Game');
      const b = s.boss;
      const V = 110 / 60;
      for (let i = 0; i < n; i++) {
        if (b.acao === 'flutua') b.cdTiro = 99;
        const a = b.teto;
        // the robot: once the 1st wave lights, into a gap of it (the nearest 2nd-wave point); after the 1st wave's last
        // drop passed its height, into the nearest 1st-wave column (the 2nd wave falls in the gaps)
        let alvo = window.__casa;
        if (le && a) {
          const T = a.constructor;
          const A = [32, 96, 160, 224], B = [64, 128, 192, 256];
          const perto = (xs) => xs.reduce((m, x) => (Math.abs(x - s.ship.x) < Math.abs(m - s.ship.x) ? x : m), xs[0]);
          const passou = a.t >= T.ultima(0) + T.queda(36, s.ship.y + 8.5);
          if (a.t >= T.inicio(0)) alvo = { x: passou ? perto(A) : perto(B), y: window.__casa.y };
        }
        if (le || !a) {
          const dx = alvo.x - s.ship.x, dy = alvo.y - s.ship.y, d = Math.hypot(dx, dy);
          if (d > 0.5) s.ship.setPosition(s.ship.x + (dx / d) * Math.min(d, V), s.ship.y + (dy / d) * Math.min(d, V));
        }
        const antes = { x: s.ship.x, y: s.ship.y };
        window.__passo.t += QUADRO;
        g.step(window.__passo.t, QUADRO);
        const m = Math.hypot(s.ship.x - antes.x, s.ship.y - antes.y);
        if (m > 0.01) { window.__empurroes++; window.__maxEmpurrao = Math.max(window.__maxEmpurrao, m); }
        if (b.teto) window.__comecou = true;
        if (window.__comecou && b.acao === 'flutua' && !b.teto) window.__fim++;
      }
      return window.__fim;
    }, { n, QUADRO, le });
  const fotos = [];
  if (FOTOS) mkdirSync(`${FOTOS}/${k}`, { recursive: true });
  for (let i = 0; i < 60 * 10 / POR_FOTO; i++) {
    const fim = await passo(POR_FOTO, modo === 'le');
    const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
    fotos.push(await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer());
    if (FOTOS) await sharp(foto).resize(384, 216, { kernel: 'nearest' }).png().toFile(`${FOTOS}/${k}/${String(i).padStart(3, '0')}.png`);
    if (fim > 30) break;
  }
  const r = await page.evaluate(() => ({ e: window.__empurroes, m: window.__maxEmpurrao, d: window.__dano, x: window.__game.scene.getScene('Game').ship.x }));
  console.log(`${modo}: ${r.e} quadros empurrada (máx ${r.m.toFixed(1)} px/quadro), vidas ${r.d}, x final ${r.x.toFixed(0)}, ${fotos.length} quadros`);
  await browser.close();
  return fotos;
}

const filmes = [];
for (const [k, p] of PAINEIS.entries()) filmes.push(await filmar(p, k));
const W = 384 * ZOOM, H = 216 * ZOOM, GAP = 8;
const rotulo = (txt) =>
  Buffer.from(
    `<svg width="${W}" height="${H}"><rect x="8" y="${H - 34}" width="${txt.length * 11 + 16}" height="26" fill="#0e1016" opacity="0.8"/>` +
      `<text x="16" y="${H - 15}" font-family="monospace" font-size="18" fill="#e8e0d0">${txt}</text></svg>`,
  );
const n = Math.max(...filmes.map((f) => f.length));
const quadros = [];
for (let i = 0; i < n; i++) {
  quadros.push(
    await sharp({ create: { width: W, height: H * filmes.length + GAP * (filmes.length - 1), channels: 4, background: { r: 14, g: 16, b: 22, alpha: 1 } } })
      .composite(filmes.flatMap((f, k) => [
        { input: f[Math.min(i, f.length - 1)], left: 0, top: k * (H + GAP) },
        { input: rotulo(ROTULOS[k].toUpperCase()), left: 0, top: k * (H + GAP) },
      ]))
      .png()
      .toBuffer(),
  );
}
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0, colours: 96, interFrameMaxError: 8 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros');
