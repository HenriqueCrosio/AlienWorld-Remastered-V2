// BLOCO G · round 4 — the F1 boss fight filmed on a STEPPED clock (30 fps, fake Date.now), the world canvas only: the
// training jump straight to the Tower, half its life taken (the TAKEOFF: the dust of the Leviathan's crash at its foot,
// the plumes lighting up), a few seconds of flight, the death (the crash explosion at its size), and the climb to
// zero-G with the ship's nose locked at 45°. The ship is untouchable and parked; the Tower's shots are hidden.
//   node scripts/_g/_filmar-chefe-f1.mjs <outDir>      (with `npm run dev` running)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { webm } from '../_menu/_webm.mjs';

const [OUT] = process.argv.slice(2);
const Z = 3;
const QUADROS = path.join(OUT, '_q-chefe');
fs.rmSync(QUADROS, { recursive: true, force: true });
fs.mkdirSync(QUADROS, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free', practice: true }));
// In training the stage clock jumps to the boss, and the mid-stage card table opens at once and pauses the game: the
// first card is taken by code (the table answers once it has settled in, so it is retried).
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => {
    const g = window.__game;
    // The table lives in the text layer (the HD game); the world keeps a twin. Both are asked.
    const mesas = [window.__gameHD?.scene.getScene('Cartas'), g.scene.getScene('Cartas')].filter((c) => c?.sys.isActive());
    for (const c of mesas) { try { c.confirmar(0); } catch { /* not ready yet */ } }
    if (mesas.length) return 'mesa';
    return g.scene.getScene('Game')?.boss ? 'chefe' : 'esperando';
  });
  if (st === 'chefe') break;
}
await page.waitForFunction(() => !!window.__game.scene.getScene('Game')?.boss, null, { timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game;
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + Math.round(window.__passo.t - t0);
  const s = g.scene.getScene('Game');
  if (s?.cartas) s.cartas.intocavel = () => true;
  s.invulnerableUntil = 1e12;
  if (window.__gameHD?.canvas) window.__gameHD.canvas.style.visibility = 'hidden';
});
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const foto = async () => {
  const shot = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  return sharp(shot).resize(384, 216, { kernel: 'nearest' }).png().toBuffer();
};

// The script, in photos (30 per second): when to hit the Tower, and how hard.
//   after it parks (entering ends) + 1 s: down to 49% → the takeoff;  + 4 s of flight: the killing blow.
const roteiro = { decola: null, mata: null };
const total = 30 * 22;
const marcas = { decolagem: null, voo: null, morte: null, subida: null };
let n = 0;
for (let i = 0; i < total; i++) {
  const ev = await page.evaluate(({ QUADRO }) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    for (let k = 0; k < 2; k++) {
      window.__passo.t += QUADRO;
      g.step(window.__passo.t, QUADRO);
      if (s?.ship) { s.ship.x = 60; s.ship.y = 50; s.ship.body?.setVelocity?.(0, 0); }
    }
    for (const gr of [s?.enemyBullets, s?.enemies?.enemies]) if (gr?.children) gr.getChildren().forEach((o) => o.setVisible(false));
    const b = s.boss;
    return { tem: !!b, parado: b ? !b.entering : false, decolando: b ? b.takingOff : false, ar: b ? b.airborne : false, hp: b?.hp, max: b?.maxHp, zona: s.zone, angulo: s.ship.angle };
  }, { QUADRO: 1000 / 60 });
  if (ev.tem && ev.parado && roteiro.decola === null) roteiro.decola = i + 30;
  if (i === roteiro.decola) {
    await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; b.damage(b.hp - b.maxHp * 0.49); });
    marcas.decolagem = i + 12;
  }
  if (ev.ar && roteiro.mata === null) { roteiro.mata = i + 120; marcas.voo = i + 60; }
  if (i === roteiro.mata) {
    await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); if (s.boss.damage(9999)) s.killBoss(); });
    // Round 5 (the bigger death): the chain at ~0.7 s, the big blast at ~1.5 s, the chunks flying, the fire on the rubble.
    marcas['morte-cadeia'] = i + 20;
    marcas.morte = i + 44;
    marcas['morte-estilhacos'] = i + 56;
    marcas['morte-incendio'] = i + 62;
    marcas.subida = i + 36 + 30 + 45;
  }
  const f = await foto();
  const arq = path.join(QUADROS, `${String(n++).padStart(5, '0')}.png`);
  await sharp(f).resize(384 * Z, 216 * Z, { kernel: 'nearest' }).png().toFile(arq);
  for (const [nome, q] of Object.entries(marcas)) if (q === i) fs.copyFileSync(arq, path.join(OUT, `chefe-${nome}.png`));
  if (ev.zona === 'vacuo' && i > (roteiro.mata ?? 1e9) + 36 + 30 + 150) break; // ~5 s of the climb
}
await browser.close();
await webm(QUADROS, path.join(OUT, 'chefe.webm'), 30);
fs.rmSync(QUADROS, { recursive: true, force: true });
console.log(path.join(OUT, 'chefe.webm'), n, 'quadros', JSON.stringify(roteiro));
