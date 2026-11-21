// THE CAPITÂNIA'S DENSITY, MEASURED (21/11, rebalance front 0). npm run dev, then
//   node scripts/_rebalance/medir-capitania.mjs [--porta 5174] [--s 24]
// The F2 boss practice; the ship invulnerable and parked; a "competent player" removes each kamikaze 1.5 s after it is
// born (the answer the fight asks for is to shoot them). Samples every 100 ms, first in the WHOLE phase (hp 100%), then
// in the FURY (hp forced to 49%): the enemy shots on screen split by kind (tracer, flak shell, shard), the kamikazes
// alive, and the DENIED AREA — the share of the play field (left of her hull) within 12 px of a threat.
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const S = Number(arg('--s', '24'));
// How long the 'player' takes to kill each kamikaze (ms); --mata 0 = never (they live until they leave the screen).
const MATA = Number(arg('--mata', '1500'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 2, handling: 'diegetico', practice: true }));
// The practice clock jumps past the F2 mid-stage card table (70 s): mark it as already opened, or it pauses the fight.
await page.waitForFunction(() => window.__game.scene.getScene('Game')?.cartas, null, { timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game.scene;
  g.getScene('Game').cartas.abertas.add('meio');
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
});
await page.waitForFunction(() => {
  const s = window.__game.scene.getScene('Game');
  return window.__game.scene.isActive('Game') && s.boss && !s.boss.entering;
}, null, { timeout: 90000 });

async function amostrar(rotulo, hpFrac) {
  return page.evaluate(async ({ S, hpFrac, MATA }) => {
    const s = window.__game.scene.getScene('Game');
    const b = s.boss;
    b.hp = Math.round(b.maxHp * hpFrac);
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    s.ship.setPosition(70, 108);
    const nasc = new Map();
    const linhas = [];
    const fim = performance.now() + S * 1000;
    while (performance.now() < fim) {
      await new Promise((r) => setTimeout(r, 100));
      b.hp = Math.max(b.hp, Math.round(b.maxHp * hpFrac) - 1); // keep the phase: the ship does not shoot, but be sure
      const agora = performance.now();
      const kams = s.enemies.enemies.getChildren().filter((e) => e.active && e.getData('kind') === 'kamikaze');
      for (const k of kams) {
        if (!nasc.has(k)) nasc.set(k, agora);
        else if (MATA > 0 && agora - nasc.get(k) > MATA) { k.destroy(); nasc.delete(k); }
      }
      const tiros = s.enemies.enemyBullets.getChildren().filter((t) => t.active);
      let tracer = 0, capsula = 0, estilhaco = 0;
      for (const t of tiros) {
        if (t.getData('tracer') === true) tracer++;
        else if (t.getData('flak') === true) capsula++;
        else estilhaco++;
      }
      const vivos = kams.filter((k) => k.active);
      // DENIED AREA: 8 px cells over x in [0, hull - 50], y in [0, 216]; a cell is denied if a threat is within 12 px.
      const ameacas = [...tiros.map((t) => [t.x, t.y]), ...vivos.map((k) => [k.x, k.y])];
      const xMax = b.sprite.x - 50;
      let celulas = 0, negadas = 0;
      for (let x = 4; x < xMax; x += 8)
        for (let y = 4; y < 216; y += 8) {
          celulas++;
          if (ameacas.some(([ax, ay]) => (ax - x) ** 2 + (ay - y) ** 2 < 144)) negadas++;
        }
      linhas.push({ tracer, capsula, estilhaco, kam: vivos.length, caca: vivos.filter((k) => !k.getData('apagou')).length, negada: negadas / celulas });
    }
    return linhas;
  }, { S, hpFrac, MATA }).then((linhas) => ({ rotulo, linhas }));
}

const resumo = ({ rotulo, linhas }) => {
  const col = (k) => linhas.map((l) => l[k]).sort((a, b) => a - b);
  const m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const p = (a, q) => a[Math.min(a.length - 1, Math.floor(a.length * q))];
  const total = linhas.map((l) => l.tracer + l.capsula + l.estilhaco + l.kam).sort((a, b) => a - b);
  const calmo = linhas.filter((l) => l.tracer + l.capsula + l.estilhaco + l.kam <= 2).length / linhas.length;
  console.log(`\n=== ${rotulo} (${linhas.length} amostras) ===`);
  for (const k of ['tracer', 'capsula', 'estilhaco', 'kam', 'caca']) {
    const a = col(k);
    console.log(`${k.padEnd(10)} media ${m(a).toFixed(1).padStart(5)} · p90 ${String(p(a, 0.9)).padStart(3)} · max ${String(a[a.length - 1]).padStart(3)}`);
  }
  console.log(`AMEACAS    media ${m(total).toFixed(1).padStart(5)} · p90 ${String(p(total, 0.9)).padStart(3)} · max ${String(total[total.length - 1]).padStart(3)}`);
  const n = col('negada');
  console.log(`AREA NEGADA media ${(100 * m(n)).toFixed(1)}% · p90 ${(100 * p(n, 0.9)).toFixed(1)}% · max ${(100 * n[n.length - 1]).toFixed(1)}%`);
  console.log(`tempo CALMO (<=2 ameacas na tela): ${(100 * calmo).toFixed(0)}%`);
};

// VARIANTS, patched only in this page's boss instance (src/ untouched) — to measure options before choosing one.
// ⚠️ He chose A (21/11) and it is now IN src/ (BossCapitania): without --variante, the fury measured is A's. Measured
// before it, the fury was 18.8 threats on screen on average (max 33), 13.6% of the field denied at p90.
//   A = the silence back: fury cycle 3.4 → 4.0 s, the late capsule 0.9 s after (inside the cycle, not 3 s into the
//       next), 6 shards instead of 8 that die after 1.2 s (a local blast, not a ring crossing the whole screen).
//   C = A + the fury wave at 3 tracers per battery instead of 4.
//   B = alternate: in the fury, one cycle launches kamikazes, the next throws the flak — never both in one cycle.
const variante = arg('--variante', '');
if (variante) {
  await page.evaluate((v) => {
    const s = window.__game.scene.getScene('Game');
    const b = s.boss;
    const P = Object.getPrototypeOf(b);
    if (v === 'K1') {
      // K1 = the fury launches 2 (as the whole phase) and keeps at most 3 alive.
      const launch = P.launch;
      b.launch = function (count) {
        if (!this.enraged) return launch.call(this, count);
        const vivos = this.enemies.countOf('kamikaze');
        return launch.call(this, Math.min(2, 3 - vivos + (5 - 3) > 0 ? Math.min(2, Math.max(0, 3 - vivos)) : 0));
      };
    }
    if (v === 'K2' || v === 'K3') {
      const COMB = v === 'K3' ? 3000 : 4000;
      // K2 = FUEL: the kamikazes she launches chase for 4 s; then the engine dies, they stop turning, drift straight
      // and are culled off screen (any edge).
      const E = s.enemies, chase = Object.getPrototypeOf(E).updateChaser;
      E.updateChaser = function (e, def, target) {
        const agora = this.scene.time.now;
        if (!e.getData('nasceuEm')) e.setData('nasceuEm', agora);
        if (agora - e.getData('nasceuEm') > COMB) {
          e.body.setAcceleration(0, 0);
          e.setData('apagou', true);
          if (e.x < -30 || e.x > 414 || e.y < -30 || e.y > 246) e.destroy();
          return;
        }
        return chase.call(this, e, def, target);
      };
      if (v === 'K3') {
        const launch = P.launch;
        b.launch = function (count) {
          const cacando = this.enemies.enemies.getChildren().filter((k) => k.active && k.getData('kind') === 'kamikaze' && !k.getData('apagou')).length;
          return launch.call(this, Math.max(0, Math.min(count, 3 - cacando)));
        };
      }
    }
    if (v === 'C') {
      // C = A + the fury wave at 3 tracers per battery (as in the whole phase), still tighter and earlier.
      const burst = P.burst;
      b.burst = function (bat, count, spread) { return burst.call(this, bat, Math.min(count, 3), spread); };
    }
    if (v === 'A' || v === 'C') {
      Object.defineProperty(b, 'cycleLength', { get() { return this.enraged ? 4.0 : 4.2; } });
      b.flakVolley = function (target) {
        this.lancarCapsulas(target, 2);
        this.scene.time.delayedCall(900, () => { if (!this.dead && this.sprite.active) this.lancarCapsulas(target, 1); });
      };
      b.detonate = function (shell) {
        const { x, y } = shell;
        this.enemies.release(shell);
        this.muzzleFx.explode(22, x, y);
        this.scene.cameras.main.shake(110, 0.005);
        const n = 6, off = Math.random() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * Math.PI * 2;
          const sh = this.bullets.get(x, y);
          if (!sh) return;
          sh.setActive(true).setVisible(true); sh.body.enable = true; sh.anims.stop();
          sh.setTexture('bolt2').setScale(0.9).setTint(0xffd27a); sh.setBlendMode(1); sh.setRotation(a);
          sh.setData('ox', x); sh.setData('oy', y); sh.setData('flak', false);
          sh.setVelocity(Math.cos(a) * 96, Math.sin(a) * 96);
          const marca = `${x},${y},${i}`; sh.setData('marca', marca);
          this.scene.time.delayedCall(1200, () => { if (sh.active && sh.getData('marca') === marca) this.enemies.release(sh); });
        }
      };
    }
    if (v === 'B') {
      let ciclo = 0, ultimo = 0;
      const upd = P.update;
      b.update = function (dt, target) { if (this.cycleT < ultimo) ciclo++; ultimo = this.cycleT; return upd.call(this, dt, target); };
      const desc = Object.getOwnPropertyDescriptor(P, 'beats');
      Object.defineProperty(b, 'beats', { get() {
        const bs = desc.get.call(this);
        if (!this.enraged) return bs;
        return ciclo % 2 === 0 ? bs.filter((x) => x.at !== 1.5) : bs.filter((x) => x.at !== 0);
      } });
    }
  }, variante);
}

resumo(await amostrar('INTEIRA (100%)', 1));
resumo(await amostrar(`FURIA (49%)${variante ? ` · variante ${variante}` : ''}`, 0.49));
if (erros.length) console.log('\nERROS:', erros);
await browser.close();
