// 29/10 — S1b (spec `2026-10-29-serpente-luta-s1b-design.md` §8): the charge comes from UNDER the hull and the dodge is
// SIDEWAYS: `desvia` leaves the column when the crack locks (40 px left, or right at the edge) and comes back after
// she sank; in the triple rain it moves under the widest gap among the falling drops. Both live at x 60 and move at the
// ship's real speed (110 px/s).
// 28/10 — THE SERPENT'S FIGHT, PROBED (S1, spec `2026-10-28-serpente-luta-s1-design.md` §8): the F3 practice run on a
// deterministic start (our luck and Phaser's own fixed, the clock on steps from before the phase), the whole fight
// under the ship's REAL bullets, played by one of two probe players:
//   - `parado`: parked at x 40, following the live head's height, firing every 0.1 s;
//   - `desvia`: the same, but when she LOCKS her height (the charge starts — after the warning; a player who moves
//     during the warning is followed) it leaves the lane: 60 px up if there is room, else 70 px down, and goes back to
//     following the head once her body has passed back to its right (the window's recoil) — at the ship's own speed (150 px/s), never teleporting. (Today's fight has no
//     lock: there it dodges at the warning's start, which is when the old charge became inevitable.)
// The ship is untouchable (the fight goes on), but every hit is COUNTED: contact with the boss (the rising edges of
// the overlap) and shots. Also: the fight's length per form, how far left the live head went, the charge's states seen,
// the star's visibility, where the world stands (its speed, the breach) — what each version of the fight exposes.
// With --filmar <dir>, a photo every 2 steps (30 fps) of the whole screen, ×2, for the sheet's film.
//   node scripts/_serpente/_sonda-luta.mjs <out.json> <parado|desvia> [--filmar <dir>] [--ate <s>]
// (with `npm run dev` running; do not touch src/ or .html while it runs — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const [OUT, JOGADOR = 'parado'] = args.filter((a, i) => !a.startsWith('--') && !['--filmar', '--ate'].includes(args[i - 1]));
const FILMAR = args.includes('--filmar') ? args[args.indexOf('--filmar') + 1] : null;
const ATE = args.includes('--ate') ? Number(args[args.indexOf('--ate') + 1]) : 150;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const clip = { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k };

await page.evaluate((JOGADOR) => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  let a = 20261026;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.Phaser.Math.RND.sow(['20261026']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now, seg: 0 };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + (window.__passo.t - t0);
  const pisa = (n) => { for (let i = 0; i < n; i++) { window.__passo.t += 1000 / 60; g.step(window.__passo.t, 1000 / 60); } };
  pisa(2);
  g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja'); g.registry.set('sementeMorte', 20261026); g.registry.set('destrocosVariantes', undefined);
  const velha = g.scene.getScene('Game'); if (velha) velha.cartas = null;
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico', practice: true });
  for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) pisa(1);
  const s = g.scene.getScene('Game');
  s.cartas.abrirMesa = () => {};
  for (let i = 0; i < 4; i++) { if (g.scene.isActive('Cartas')) g.scene.stop('Cartas'); if (g.scene.isPaused('Game')) g.scene.resume('Game'); pisa(12); }
  s.victory = () => {};
  s.lives = 3;
  // every hit counted, none felt: the ship stays untouchable, and `damageShip` is watched before its own check
  const R = (window.__reg = { contato: 0, tiro: 0, emContato: false, estados: {}, dano: {}, contatos: [], minCabecaX: 999, formas: {}, estrela: 0, quadros: 0, mundo: [], jogador: JOGADOR });
  const dano = s.damageShip.bind(s);
  s.damageShip = (...a) => {
    const b = s.boss;
    const contato = b && !b.isDead && s.physics.overlap(s.ship, b.sprite);
    if (contato) {
      if (!R.emContato) {
        R.contato++;
        const bd = b.sprite.body;
        R.contatos.push({ seg: +window.__passo.seg.toFixed(2), fase: b.faseIdx, inv: b.investida, boss: { x: +b.sprite.x.toFixed(0), y: +b.sprite.y.toFixed(0), corpo: [bd.x | 0, bd.y | 0, bd.width | 0, bd.height | 0] }, nave: { x: +s.ship.x.toFixed(0), y: +s.ship.y.toFixed(0) } });
      }
      R.emContato = true;
      R.contatoQuadro = R.quadros;
    } else R.tiro++;
    return dano(...a);
  };
  window.__nave = { x: 60, y: 100, fuga: null };
}, JOGADOR);

/** n steps of the fight, played by the probe player; returns a summary */
const passo = (n) => page.evaluate((n) => {
  const g = window.__game;
  const R = window.__reg, N = window.__nave;
  for (let i = 0; i < n; i++) {
    if (!g.scene.isActive('Game')) return null;
    const s = g.scene.getScene('Game');
    const P = window.__passo;
    const b = s.boss;
    s.invulnerableUntil = 1e12;
    s.enemies.enemies.clear(true, true);
    const vivo = b && !b.isDead && !b.entering;
    const alvo = vivo ? b.targets?.find((x) => x.active) : undefined;
    // the player: follow the live head's height at x 60; the dodger leaves the COLUMN sideways at the lock
    // (her head hidden in the hull: the player holds the last height it saw)
    const vista = alvo && b.sprite.visible && b.corpo !== 'nada';
    if (vista) N.ultimaY = alvo.y;
    let quer = Math.min(140, N.ultimaY ?? 100), querX = 60;
    const inv = b?.investida;
    if (R.jogador === 'desvia' && vivo) {
      if (inv === 'trava' && N.fuga === null) N.fuga = N.x - 40 >= 16 ? N.x - 40 : N.x + 60;
      // (back once she sank — and a new lock, B's second burst, starts over)
      if (inv === 'afunda' || inv === 'volta' || inv === 'emerge' || inv === 'nao' || inv === 'mergulho') N.fuga = null;
      if (N.fuga !== null) querX = N.fuga;
      // the rain: under the widest gap among the drops falling towards the ship
      const caindo = s.enemies.enemyBullets.getChildren().filter((o) => o.active && o.body && o.body.velocity.y > 50 && o.y < N.y && o.y > -20);
      if (caindo.length > 3 && N.fuga === null) {
        let melhor = querX, folga = -1;
        for (let x = 16; x <= 220; x += 4) {
          const d = Math.min(...caindo.map((o) => Math.abs(o.x - x)));
          if (d > folga + 0.5) { folga = d; melhor = x; }
        }
        querX = melhor;
      }
    }
    quer = Math.max(28, Math.min(204, quer));
    const V = 110 / 60;
    N.y += Math.max(-V, Math.min(V, quer - N.y));
    N.x += Math.max(-V, Math.min(V, querX - N.x));
    if (!s.over) {
      s.ship.setPosition(N.x, N.y);
      s.ship.body.setVelocity(0, 0);
      s.ship.setVisible(true).setAlpha(1);
      if (alvo && Math.round(P.seg * 60) % 6 === 0) s.weapons.shoot(s.ship.x + 10, s.ship.y);
    }
    // the contact's rising edge: out of contact once a frame passes without `damageShip` from the body
    if (R.emContato && R.quadros - (R.contatoQuadro ?? 0) > 1) R.emContato = false;
    // the timeline: every change of her state (the charge, the rain, the form, the fusion's scene), with the second
    if (b && !b.isDead) {
      const e = `${b.faseIdx}|${b.entrada ?? ''}|${inv}|${b.chuva ?? ''}|${b.fusaoPasso ?? ''}`;
      if (e !== R.ultimoEstado) { (R.linha ??= []).push([+P.seg.toFixed(2), e]); R.ultimoEstado = e; }
    }
    if (vivo) {
      R.estados[inv] = (R.estados[inv] ?? 0) + 1;
      if (alvo) R.minCabecaX = Math.min(R.minCabecaX, alvo.x);
      const f = (R.formas[b.faseIdx] ??= { quadros: 0, desde: P.seg });
      f.quadros++;
      if (b.cabeca?.visible) R.estrela++;
    }
    R.quadros++;
    const hp0 = b && !b.isDead ? b.hpTotal : null;
    P.t += 1000 / 60;
    P.seg += 1 / 60;
    g.step(P.t, 1000 / 60);
    // the damage dealt, by the state she was in (does the window pay?)
    const b1 = g.scene.getScene('Game').boss;
    if (hp0 !== null && b1) R.dano[inv] = +((R.dano[inv] ?? 0) + Math.max(0, hp0 - b1.hpTotal)).toFixed(2);
  }
  const s = g.scene.getScene('Game');
  const b = s.boss;
  return { seg: +window.__passo.seg.toFixed(2), boss: !!b, morto: !b || b.isDead, entrando: !!b?.entering, fase: b?.faseIdx, vida: b ? +(b.hpTotal / b.maxHpTotal).toFixed(3) : 0, x: b ? +b.sprite.x.toFixed(1) : 0 };
}, n);

let r, chegada, morte, i = 0;
const quadros = [];
if (FILMAR) {
  fs.rmSync(FILMAR, { recursive: true, force: true });
  fs.mkdirSync(FILMAR, { recursive: true });
}
for (; i < 30 * ATE; i++) {
  r = await passo(2);
  if (!r) break;
  if (r.boss && !r.entrando && chegada === undefined) chegada = r.seg;
  if (r.morto && chegada !== undefined && morte === undefined) morte = r.seg;
  if (FILMAR) {
    const foto = await page.screenshot({ clip });
    await sharp(foto).resize(768, 432, { kernel: 'nearest' }).png().toFile(path.join(FILMAR, `${String(i).padStart(5, '0')}.png`));
  }
  if (morte !== undefined && r.seg - morte > 3) break;
}
const reg = await page.evaluate(() => { const R = window.__reg; return { linha: R.linha, contato: R.contato, contatos: R.contatos, tiro: R.tiro, estados: R.estados, dano: R.dano, minCabecaX: +R.minCabecaX.toFixed(1), formas: R.formas, estrelaQuadros: R.estrela }; });
const out = { jogador: JOGADOR, chegada, morte, luta: morte !== undefined && chegada !== undefined ? +(morte - chegada).toFixed(2) : null, ...reg, ultimo: r, erros };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
await browser.close();
