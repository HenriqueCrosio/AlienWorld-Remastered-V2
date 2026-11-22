// THE ALTERNATING LAVA PULSES IN GAME, at real speed (22/11): two lunges (the ship HIGH, then LOW) in the F4 boss
// practice at a chosen life step; panels stacked, one per URL query (`--variantes`, each one a query string, e.g.
// `lavaVel=160&lavaEntre=0.4`; the 22/11 SEGURA × RECUA film was made with `lava=segura,lava=recua`, RECUA since removed).
// The ship READS the pattern: for the next pulse to reach its column it slides, at its real top speed (110 px/s), to the
// nearest gap. Invulnerable and not firing; it prints the lava touches. The game clock is stepped (_gif-investida.mjs).
//   npm run dev, then  node scripts/_guardiao/_gif-pulsos.mjs <out.gif> [--porta 5173] [--zoom 2] [--degrau 1]
//     [--variantes padrao] [--rotulos A,B] [--cenas 70:5,150:5] [--parada]   (--parada: the ship does NOT read)
import { chromium } from 'playwright';
import sharp from 'sharp';

const OUT = process.argv[2];
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const PORTA = arg('--porta', '5173');
const ZOOM = Number(arg('--zoom', '2'));
const DEGRAU = Number(arg('--degrau', '1'));
const VARIANTES = arg('--variantes', 'padrao').split(',');
const ROTULOS = arg('--rotulos', VARIANTES.join(',')).split(',');
const QUADRO = 1000 / 60;
const POR_FOTO = 3;
const CENAS = arg('--cenas', '70:5,150:5').split(',').map((c) => c.split(':').map(Number));
const LE = !process.argv.includes('--parada');
const NAVE_X = 60;

async function filmar(v) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => console.log(`[ERRO ${v}] ${e.stack}`));
  page.on('console', (m) => { if (m.text().startsWith('TOQUE')) console.log(v, m.text()); });
  await page.goto(`http://localhost:${PORTA}/?${v}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
  await page.waitForFunction(() => {
    const g = window.__game.scene;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const s = g.getScene('Game');
    return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering && s.boss.acao === 'flutua';
  }, null, { timeout: 120000, polling: 250 });
  await page.evaluate((DEGRAU) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    const b = s.boss;
    const HP = b.constructor.HP_GUARDIAO;
    b.hpGuardiao = HP * [1, 0.5, 0.2][DEGRAU];
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
    window.__pulsos = [];
    // the TOUCHES: the ship's overlap releases the drop and calls `damageShip` right after (GameScene) — a touch is the
    // two together. (A distance test missed real hits: the ship's box reaches ~16 px ahead of its center.) The lava's own
    // edge splash clears `lavaGuardiao` before releasing, so it never counts.
    window.__toques = 0;
    window.__lava = null;
    const solta = s.enemies.release.bind(s.enemies);
    s.enemies.release = (o) => {
      window.__lava = o.getData('lavaGuardiao') === true
        ? { x: o.x, y: o.y, bx: o.body.center.x, by: o.body.center.y, quem: (new Error().stack ?? '').split('\n').slice(2, 4).map((l) => l.trim().replace(/\(.*\//, '(')).join(' < ') }
        : null;
      return solta(o);
    };
    s.damageShip = () => {
      const lava = window.__lava;
      window.__lava = null;
      if (!lava) return; // not lava (the boss's body, a globule…): not what this film counts
      window.__toques++;
      const nb = s.ship.body;
      console.log(`TOQUE t=${s.time.now.toFixed(0)} pulso#${window.__pulsos.length} nave=(${s.ship.x.toFixed(0)},${s.ship.y.toFixed(1)}) caixa=[${nb.left.toFixed(0)}..${nb.right.toFixed(0)}, ${nb.top.toFixed(0)}..${nb.bottom.toFixed(0)}] gota=(${lava.x.toFixed(0)},${lava.y.toFixed(1)}) corpo=(${lava.bx.toFixed(0)},${lava.by.toFixed(1)}) por ${lava.quem}`);
    };
  }, DEGRAU);
  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  const passo = (n) =>
    page.evaluate(({ n, QUADRO, LE }) => {
      const g = window.__game;
      const s = g.scene.getScene('Game');
      for (let i = 0; i < n; i++) {
        window.__passo.t += QUADRO;
        g.step(window.__passo.t, QUADRO);
        window.__lava = null; // the overlap releases and hurts in the SAME step: a flag left over is stale
        const P = s.boss.ultimoPulso;
        if (P && !window.__pulsos.includes(P)) window.__pulsos.push(P);
        if (!LE) continue;
        // the next pulse to threaten the ship: only the rays NEAR its height count (a player reads those, not the fan's
        // far edge); a pulse is done once those rays passed the ship's rear, and the next is the one whose near rays
        // reach its nose first
        const agora = s.time.now, x = s.ship.x, MEIA = 12;
        let prox = null, tProx = Infinity;
        for (const p of window.__pulsos) {
          const dec = (agora - p.t) / 1000;
          const perto = p.angulos.filter((a) => Math.abs(p.oy + (x - p.ox) * Math.tan(a) - s.ship.y) < 28);
          if (!perto.length) continue;
          const chega = (col, a) => (p.ox - col) / (p.vel * Math.abs(Math.cos(a))) - dec;
          if (Math.max(...perto.map((a) => chega(x - MEIA, a))) <= 0) continue;
          const tFrente = Math.min(...perto.map((a) => chega(x + MEIA, a)));
          if (tFrente < tProx) { tProx = tFrente; prox = p; }
        }
        if (!prox) continue;
        // the spots: the middle of each gap the ship (box 21×9) fits through, and the screen edge only where it fits
        // between the outermost ray and the edge (11.5 px from the ray: half the box + the drop + 2 of room)
        // a sloped ray rises or falls along the ship's 21 px: take each ray's span from the tail to the nose
        const faixas = prox.angulos
          .map((a) => [x - 11, x + 11].map((c) => prox.oy + (c - prox.ox) * Math.tan(a)))
          .map(([p, q]) => ({ lo: Math.min(p, q), hi: Math.max(p, q) }))
          .sort((a, b) => a.lo - b.lo);
        const lugares = [];
        for (let j = 1; j < faixas.length; j++) {
          if (faixas[j].lo - faixas[j - 1].hi >= 23) lugares.push((faixas[j].lo + faixas[j - 1].hi) / 2);
        }
        if (faixas[0].lo - 11.5 >= 6) lugares.push(Math.min(faixas[0].lo - 11.5, 20));
        const ult = faixas[faixas.length - 1].hi;
        if (ult + 11.5 <= 210) lugares.push(Math.max(ult + 11.5, 196));
        let alvo = null;
        for (const m of lugares.filter((m) => m >= 6 && m <= 210)) {
          if (alvo === null || Math.abs(m - s.ship.y) < Math.abs(alvo - s.ship.y)) alvo = m;
        }
        if (alvo === null) continue;
        const dy = alvo - s.ship.y;
        s.ship.setPosition(s.ship.x, s.ship.y + Math.sign(dy) * Math.min(Math.abs(dy), 110 / 60));
      }
    }, { n, QUADRO, LE });
  const fotos = [];
  for (const [naveY, seg] of CENAS) {
    await page.evaluate(({ naveY, NAVE_X, QUADRO }) => {
      window.__pulsos = [];
      const g = window.__game;
      const s = g.scene.getScene('Game');
      const b = s.boss;
      // the last lunge's lava leaves the screen first (teleporting the ship into drops in flight is not a read)
      const lava = () => s.enemies.enemyBullets.getChildren().some((o) => o.active && o.getData('lavaGuardiao') === true);
      // …with his cycle HELD once he is back at the station (no new lunge, saw or salvo the ship doesn't know about), and
      // the ship out of the way behind him (it does not read while waiting)
      for (let i = 0; i < 600 && (lava() || b.acao !== 'flutua'); i++) {
        s.ship.setPosition(372, 208);
        if (b.acao === 'flutua') { b.acaoT = 99; b.cdTiro = 99; }
        window.__passo.t += QUADRO;
        g.step(window.__passo.t, QUADRO);
        window.__lava = null; // the overlap releases and hurts in the SAME step: a flag left over is stale
      }
      window.__pulsos = [];
      s.ship.setPosition(NAVE_X, naveY);
      b.serra?.destroy?.();
      b.serra = null;
      b.acao = 'flutua';
      b.proxima = 'investida';
      b.acaoT = 0;
    }, { naveY, NAVE_X, QUADRO });
    for (let i = 0; i < Math.round((seg * 60) / POR_FOTO); i++) {
      await passo(POR_FOTO);
      const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
      fotos.push(await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer());
    }
  }
  console.log(`${v}: ${await page.evaluate(() => window.__toques)} toques de lava na nave (${LE ? 'lendo o padrão' : 'parada'})`);
  await browser.close();
  return fotos;
}

const filmes = [];
for (const v of VARIANTES) filmes.push(await filmar(v));
const W = 384 * ZOOM, H = 216 * ZOOM, GAP = 8;
const rotulo = (txt) =>
  Buffer.from(
    `<svg width="${W}" height="${H}"><rect x="8" y="${H - 34}" width="${txt.length * 11 + 16}" height="26" fill="#0e1016" opacity="0.8"/>` +
      `<text x="16" y="${H - 15}" font-family="monospace" font-size="18" fill="#e8e0d0">${txt}</text></svg>`,
  );
const n = Math.min(...filmes.map((f) => f.length));
const quadros = [];
for (let i = 0; i < n; i++) {
  quadros.push(
    await sharp({ create: { width: W, height: H * filmes.length + GAP * (filmes.length - 1), channels: 4, background: { r: 14, g: 16, b: 22, alpha: 1 } } })
      .composite(filmes.flatMap((f, k) => [
        { input: f[i], left: 0, top: k * (H + GAP) },
        { input: rotulo(ROTULOS[k].toUpperCase()), left: 0, top: k * (H + GAP) },
      ]))
      .png()
      .toBuffer(),
  );
}
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0, colours: 96, interFrameMaxError: 8 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros', VARIANTES.join(' · '), 'degrau', DEGRAU);
