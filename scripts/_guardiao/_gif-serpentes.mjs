// THE CABLE-SERPENTS IN GAME, at real speed (23/11, step 3): one serpent action in the F4 boss practice, panels stacked,
// one per `degrau:modo` (`le` = the ship READS the strike: at each lock it slides sideways off the strike line at its
// real top speed, 110 px/s, and drifts home after the recoil; `parada` = it stays put and gets punished). Invulnerable
// and not firing; it prints the touches. The game clock is stepped (_gif-pulsos.mjs).
//   npm run dev, then  node scripts/_guardiao/_gif-serpentes.mjs <out.gif> [--porta 5173] [--zoom 2]
//     [--paineis 1:le,1:parada] [--rotulos A,B] [--nave 80:110] [--fotos <dir>]   (--fotos: every frame as PNG too)
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2];
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const PORTA = arg('--porta', '5173');
const ZOOM = Number(arg('--zoom', '2'));
const PAINEIS = arg('--paineis', '1:le').split(',').map((p) => p.split(':'));
const ROTULOS = arg('--rotulos', PAINEIS.map(([d, m]) => `${['', '66-33%', '33-0%'][Number(d)]} ${m === 'le' ? 'lendo' : 'parada'}`).join(',')).split(',');
const [NAVE_X, NAVE_Y] = arg('--nave', '80:110').split(':').map(Number);
const FOTOS = arg('--fotos', null);
const QUADRO = 1000 / 60;
const POR_FOTO = 3;

async function filmar([degrau, modo], k) {
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
  await page.evaluate(({ degrau, NAVE_X, NAVE_Y }) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    window.__tocou = false;
    window.__toques = 0;
    s.damageShip = () => { window.__tocou = true; };
    const b = s.boss;
    b.hpGuardiao = b.constructor.HP_GUARDIAO * [1, 0.5, 0.2][degrau];
    b.serra?.destroy?.();
    b.serra = null;
    b.acao = 'flutua';
    b.proxima = 'serpentes';
    b.acaoT = 0.6;
    b.cdTiro = 99;
    s.ship.setPosition(NAVE_X, NAVE_Y);
    window.__casa = { x: NAVE_X, y: NAVE_Y };
    window.__antes = false;
    window.__fuga = new Map();
    window.__fim = 0;
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
  }, { degrau: Number(degrau), NAVE_X, NAVE_Y });
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
        const L = b.serpentes.lista;
        if (le) {
          // at each lock: sideways off the strike line (perpendicular to head → ship), the side that stays on screen
          for (const sp of L) {
            if (sp.fase !== 'trava' || window.__fuga.has(sp)) continue;
            // off the strike line, PERPENDICULAR to it, to the side with more room: the margin 60 px out to the area's
            // edges and to the OTHER heads standing at their posts in front of him (walls too)
            const dx = sp.alvo.x - sp.cabeca.x, dy = sp.alvo.y - sp.cabeca.y, d = Math.hypot(dx, dy) || 1;
            let px = -dy / d, py = dx / d;
            const folga = (k) => {
              const x = s.ship.x + px * 60 * k, y = s.ship.y + py * 60 * k;
              const cabecas = L.filter((o) => o !== sp && !o.acabou).map((o) => Math.hypot(o.cabeca.x - x, o.cabeca.y - y) - 26);
              return Math.min(x - 16, 170 - x, y - 14, 202 - y, ...cabecas);
            };
            if (folga(-1) > folga(1)) { px = -px; py = -py; }
            window.__fuga.set(sp, { x: px, y: py });
          }
          const ataca = L.find((sp) => sp.atacando && window.__fuga.has(sp));
          if (ataca) {
            const f = window.__fuga.get(ataca);
            // never into his body (x ≥ ~205 at the station): the film counts serpent touches, not the boss's
            s.ship.setPosition(Math.max(16, Math.min(170, s.ship.x + f.x * V)), Math.max(14, Math.min(202, s.ship.y + f.y * V)));
          } else {
            for (const sp of L) if (!sp.atacando) window.__fuga.delete(sp);
            const c = window.__casa, dx = c.x - s.ship.x, dy = c.y - s.ship.y, d = Math.hypot(dx, dy);
            if (d > 0.5) s.ship.setPosition(s.ship.x + (dx / d) * Math.min(d, V * 0.6), s.ship.y + (dy / d) * Math.min(d, V * 0.6));
          }
        }
        window.__tocou = false;
        window.__passo.t += QUADRO;
        g.step(window.__passo.t, QUADRO);
        if (window.__tocou && !window.__antes) {
          window.__toques++;
          console.log(`TOQUE t=${s.time.now.toFixed(0)} nave=(${s.ship.x.toFixed(0)},${s.ship.y.toFixed(0)})`);
        }
        window.__antes = window.__tocou;
        if (b.acao === 'flutua' && L.length && L.every((sp) => sp.acabou)) window.__fim++;
      }
      return window.__fim;
    }, { n, QUADRO, le });
  page.on('console', (m) => { if (m.text().startsWith('TOQUE')) console.log(`${degrau}:${modo}`, m.text()); });
  const fotos = [];
  if (FOTOS) mkdirSync(`${FOTOS}/${k}`, { recursive: true });
  for (let i = 0; i < 60 * 20 / POR_FOTO; i++) {
    const fim = await passo(POR_FOTO, modo === 'le');
    const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
    const png = await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer();
    fotos.push(png);
    if (FOTOS) await sharp(foto).resize(384, 216, { kernel: 'nearest' }).png().toFile(`${FOTOS}/${k}/${String(i).padStart(3, '0')}.png`);
    if (fim > 30) break;
  }
  console.log(`${degrau}:${modo}: ${await page.evaluate(() => window.__toques)} toques na nave, ${fotos.length} quadros`);
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
