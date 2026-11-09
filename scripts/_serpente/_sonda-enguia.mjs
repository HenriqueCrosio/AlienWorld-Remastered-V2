// 08/11 — THE EEL IN THE GAME, PROBED (plan `plans/2026-11-08-enguia-instalacao.md`, Task 11): the F3 on the dev
// shortcut `?serpente=fusao&roteiro=maquete` (the approved mock's script and dice), on a fixed clock (1/60 s steps, our
// luck fixed), the ship parked at the mock's `parado` spot (70, 100) and untouchable (every touch counted). After every
// game step the probe waits for the eel's worker to answer, so the run is the same every time — and her redraw rate
// is the one asked (`taxa=30`: her steps on the 1/30 s grid, the approved video's; `taxa=auto`: one per game frame).
// Per step: her cost in the worker (ms) and the main thread's frame (ms). With --filmar <dir>, a photo of every game
// step between --de and --ate (her clock, s), ×2.
//   node scripts/_serpente/_sonda-enguia.mjs <out.json> [--taxa 30|auto] [--filmar <dir>] [--de <s>] [--ate <s>]
// (with `npm run dev` running; do not touch src/ or .html while it runs — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args[0];
const TAXA = val('--taxa', '30'), FILMAR = val('--filmar', null), DE = Number(val('--de', 0)), ATE = Number(val('--ate', 130));
// (08/11) `--q "<query>"`: more of the URL, e.g. `cenario=novo&ceu=2` — the casco sky behind her (plan cenario-casco-arena)
const Q = val('--q', '');

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.addInitScript(() => {
  let a = 20261108;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
});
await page.goto(`http://localhost:5173/?serpente=fusao&roteiro=maquete&taxa=${TAXA}${Q ? `&${Q}` : ''}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.getScene('Game')?.cartas, null, { timeout: 120000 });
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const clip = { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k };
await page.evaluate(() => {
  const g = window.__game, s = g.scene.getScene('Game');
  window.Phaser.Math.RND.sow(['20261108']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now, quadros: 0 };
  s.cartas.abrirMesa = () => {};
  s.victory = () => {};
  window.__reg = { toques: 0, principal: [], enguia: [] };
  const dano = s.damageShip.bind(s);
  s.damageShip = () => { window.__reg.toques++; void dano; };
});

/** n game steps; after each one, the eel's worker is waited for */
const passo = (n) => page.evaluate(async (n) => {
  const g = window.__game, R = window.__reg, P = window.__passo;
  for (let i = 0; i < n; i++) {
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    const s = g.scene.getScene('Game');
    if (!s || !g.scene.isActive('Game')) return null;
    s.invulnerableUntil = 1e12;
    if (!s.over) { s.ship.setPosition(70, 100); s.ship.body.setVelocity(0, 0); }
    P.t += 1000 / 60;
    const a = performance.now();
    g.step(P.t, 1000 / 60);
    const dur = performance.now() - a;
    R.principal.push(dur);
    if (dur > 50) (R.picos ??= []).push({ quadro: P.quadros, ms: +dur.toFixed(1), boss: !!s.boss, ativa: !!s.boss?.enguia?.ativa });
    P.quadros++;
    const e = s.boss?.enguia;
    const n0 = e?.tempos.length ?? 0;
    for (let k = 0; e?.ativa && e.pronta && e.ocupado && k < 2000; k++) await new Promise((ok) => setTimeout(ok, 0));
    if (e && e.tempos.length > n0) R.enguia.push(e.tempos[e.tempos.length - 1]);
    if (R.viuAtiva && !s.boss) return { quadros: P.quadros, acabou: true, ativa: false, t: null, trecho: null };
    if (e?.ativa) R.viuAtiva = true;
  }
  const s = g.scene.getScene('Game'), b = s.boss, e = b?.enguia;
  return { quadros: P.quadros, boss: !!b, ativa: !!e?.ativa, pronta: !!e?.pronta, t: e?.estado?.t ?? null, trecho: e?.estado?.trecho ?? null, acabou: !!R.viuAtiva && (!b || !!e?.estado?.acabou), ms: e?.tempos?.length ? e.tempos[e.tempos.length - 1].ms : null };
}, n);

if (FILMAR) { fs.rmSync(FILMAR, { recursive: true, force: true }); fs.mkdirSync(FILMAR, { recursive: true }); }
let r, fotos = 0, fim = null;
const trechos = [];
// (`--perfil <quadro>`: the main thread's CPU profile of that game step, self time per function)
const PERFIL = val('--perfil', null);
const cdp = PERFIL ? await page.context().newCDPSession(page) : null;
if (cdp) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); }
for (let i = 0; i < 60 * 400; i++) {
  if (cdp && i === Number(PERFIL)) await cdp.send('Profiler.start');
  r = await passo(1);
  if (cdp && i === Number(PERFIL)) {
    const { profile: p } = await cdp.send('Profiler.stop');
    const porId = new Map(p.nodes.map((n) => [n.id, n])), self = new Map();
    p.samples.forEach((id, k) => { const n = porId.get(id), nome = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`; self.set(nome, (self.get(nome) ?? 0) + (p.timeDeltas[k] ?? 0)); });
    for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${(v / 1000).toFixed(1).padStart(7)} ms  ${k}`);
  }
  if (!r) break;
  if (r.trecho && trechos.at(-1)?.trecho !== r.trecho) trechos.push({ t: r.t, trecho: r.trecho });
  if (FILMAR && r.ativa && r.t != null && r.t >= DE && r.t <= ATE) {
    const foto = await page.screenshot({ clip });
    await sharp(foto).resize(768, 432, { kernel: 'nearest' }).png().toFile(path.join(FILMAR, `${String(fotos++).padStart(5, '0')}.png`));
  }
  if (r.t != null && r.t > ATE) break;
  if (r.acabou && !r.ativa) { fim ??= r.quadros; if (r.quadros - fim > 30) break; }
}
const reg = await page.evaluate(() => {
  const R = window.__reg;
  return { toques: R.toques, principal: R.principal, enguia: R.enguia, picos: R.picos ?? [] };
});
const q = (xs, p) => { if (!xs.length) return null; const o = [...xs].sort((a, b) => a - b); return +o[Math.min(o.length - 1, Math.floor(p * o.length))].toFixed(2); };
const ms = reg.enguia.map((x) => x.ms);
const out = {
  taxa: TAXA, ultimo: r, trechos, toques: reg.toques, fotos, erros, picos: reg.picos,
  principal: { p50: q(reg.principal, 0.5), p95: q(reg.principal, 0.95), max: q(reg.principal, 1) },
  worker: { passos: ms.length, p50: q(ms, 0.5), p95: q(ms, 0.95), max: q(ms, 1) },
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, trechos: out.trechos.length }));
await browser.close();
