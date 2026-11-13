// BLOCO I, etapa 2 (13/11) — the FULL-SCREEN FLASHES, today × the concept, filmed in the game WITHOUT touching src/:
// the page patches `Camera.flash` at run time. In `--modo novo` every flash is rerouted by its family (the answers of
// 13/11): IMPACT and SIGNAL = a local light at the source (pixel, Bayer, ADD), HIT ON THE SHIP = the vignette (the
// edges light up, the middle stays readable), LAUNCH = the full screen, weaker and shorter; and a global ceiling of 3
// flashes per second (the next ones come attenuated).
//   node scripts/_i/_flashes-conceitos.mjs <out-dir> --cena cutscene1|cutscene2|cutscene3|final|golpe|capitania --modo hoje|novo [--de A] [--ate B]
// (with `npm run dev` running; do not touch src/ or .html while it runs — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args[0], CENA = val('--cena', 'cutscene1'), MODO = val('--modo', 'novo');
const PADRAO = { cutscene1: [1.5, 40], cutscene2: [1.5, 60], cutscene3: [1.5, 60], final: [15.5, 26], golpe: [2.5, 12], capitania: [3, 16] }[CENA];
const CHAVE = { cutscene1: 'Interlude', cutscene2: 'Interlude2', cutscene3: 'Interlude3', final: 'Interlude4' }[CENA] ?? '';
const DE = Number(val('--de', PADRAO[0])), ATE = Number(val('--ate', PADRAO[1]));
fs.mkdirSync(OUT, { recursive: true });
const Q = path.join(OUT, 'q');
fs.rmSync(Q, { recursive: true, force: true });
fs.mkdirSync(Q, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.addInitScript(() => {
  const base = 1762560000000;
  let k = 0;
  Date.now = () => base + (k += 16);
  let a = 20261113;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
});
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(500);
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const clip = { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k };

// ── the run-time patch ─────────────────────────────────────────────────────────────────────────────────────────────
await page.evaluate((modo) => {
  const P = window.Phaser;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const NIVEIS = 4, K = 6;
  window.__flashLog = [];
  window.__estouro = null;
  const janela = [];

  // where the last particle burst happened: `explodeBig`, the boss turns and the cutscene chains all burst right
  // before they flash, so this is the SOURCE of the light (and the count gives the size: 16 per `escala`)
  const Em = P.GameObjects.Particles.ParticleEmitter.prototype;
  const explode0 = Em.explode;
  Em.explode = function (n, x, y) {
    // a timer of a boss killed by the probe (`killBoss` out of its own path) may still fire on its destroyed emitter
    if (!this.scene) { (window.__orfaos ??= []).push(Math.round(window.__passo.t)); return this; }
    if (x !== undefined) window.__estouro = { n, x, y };
    return explode0.call(this, n, x, y);
  };

  /** a canvas texture of K frames (the light dying), each pixel quantised to NIVEIS levels through the Bayer 4×4 */
  const assa = (scene, chave, w, h, forca) => {
    if (scene.textures.exists(chave)) return;
    const t = scene.textures.createCanvas(chave, w * K, h);
    const ctx = t.getContext(), img = ctx.createImageData(w * K, h);
    for (let k = 0; k < K; k++) {
      const m = 1 - k / K;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = forca(x, y) * m;
        const q = Math.min(NIVEIS, Math.floor(v * NIVEIS + BAYER[(y & 3) * 4 + (x & 3)] / 16));
        if (q <= 0) continue;
        const i = (y * w * K + k * w + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round((q / NIVEIS) * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    t.refresh();
    for (let k = 0; k < K; k++) t.add(k, 0, k * w, 0, w, h);
  };
  const toca = (scene, img, ms) => {
    let i = 0;
    scene.time.addEvent({ delay: ms / K, repeat: K - 1, callback: () => { i++; if (i >= K) img.destroy(); else img.setFrame(i); } });
  };
  const cor = (r, g, b) => (r << 16) | (g << 8) | b;

  const local = (scene, x, y, R, ms, tinta, pico) => {
    const chave = `clarao-${R}`;
    assa(scene, chave, 2 * R, 2 * R, (px, py) => { const d = Math.hypot(px - R + 0.5, py - R + 0.5) / R; return d >= 1 ? 0 : (1 - d) * (1 - d); });
    toca(scene, scene.add.image(Math.round(x), Math.round(y), chave, 0).setBlendMode(P.BlendModes.ADD).setTint(tinta).setAlpha(pico).setDepth(90), ms);
  };
  const vinheta = (scene, ms, tinta, pico) => {
    assa(scene, 'clarao-vinheta', 384, 216, (px, py) => { const e = Math.hypot((px - 191.5) / 192, (py - 107.5) / 108); return Math.max(0, Math.min(1, (e - 0.7) / 0.5)); });
    toca(scene, scene.add.image(192, 108, 'clarao-vinheta', 0).setScrollFactor(0).setBlendMode(P.BlendModes.ADD).setTint(tinta).setAlpha(pico).setDepth(98), ms);
  };
  const telaFraca = (scene, ms, tinta, pico) => {
    const r = scene.add.rectangle(192, 108, 384, 216, tinta, pico).setScrollFactor(0).setDepth(98);
    scene.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
  };

  // the 21 flashes by their signature (ms,r,g,b) → the family
  const FAMILIA = {
    '120,255,190,110': 'impacto', '500,255,210,120': 'impacto', '800,255,170,90': 'impacto',
    // cutscene 3's closing flash has NO source on screen (the mouth is already sealed; the scene hands over 0.8 s
    // later): it is punctuation, the family of the launches
    '700,255,150,80': 'largada',
    '140,255,150,80': 'impacto', '260,140,0,0': 'impacto', '220,255,232,180': 'impacto',
    '90,255,122,168': 'golpe', '70,62,224,240': 'golpe', '60,120,80,48': 'golpe',
    '200,62,224,240': 'sinalNave', '160,232,60,140': 'sinalChefe', '180,232,48,107': 'sinalChefe', '220,255,255,255': 'sinalChefe',
    '160,255,212,71': 'largada', '160,255,80,80': 'largada', '400,180,230,255': 'largada',
  };

  const Cam = P.Cameras.Scene2D.Camera.prototype;
  const flash0 = Cam.flash;
  Cam.flash = function (ms = 250, r = 255, g = 255, b = 255, ...resto) {
    const scene = this.scene, fam = FAMILIA[`${ms},${r},${g},${b}`] ?? 'desconhecido';
    window.__flashLog.push({ t: Math.round(scene.time.now), cena: scene.scene.key, fam, ms, rgb: [r, g, b] });
    if (modo === 'hoje' || fam === 'desconhecido') return flash0.call(this, ms, r, g, b, ...resto);
    // the ceiling: 3 per second, everything added; past it the next one comes attenuated
    const agora = scene.time.now;
    while (janela.length && janela[0] < agora - 1000) janela.shift();
    const f = janela.length < 3 ? 1 : 0.35;
    janela.push(agora);
    const tinta = cor(r, g, b), e = window.__estouro;
    if (fam === 'impacto') {
      const longo = ms >= 400;
      const R = longo ? 150 : ms === 220 ? 120 : Math.max(40, Math.min(120, Math.round(56 * ((e?.n ?? 16) / 16))));
      const x = ms === 220 ? 192 : e?.x ?? 192, y = ms === 220 ? 108 : e?.y ?? 108;
      local(scene, x, y, R, longo ? ms : Math.max(ms * 1.5, 220), tinta, 0.6 * f);
    } else if (fam === 'sinalNave') {
      const n = scene.ship;
      local(scene, n?.x ?? 192, n?.y ?? 108, 56, 300, tinta, 0.7 * f);
    } else if (fam === 'sinalChefe') {
      const c = scene.boss?.sprite ?? e ?? { x: 192, y: 108 };
      local(scene, c.x, c.y, 100, 300, tinta, 0.7 * f);
    } else if (fam === 'golpe') {
      vinheta(scene, Math.max(ms * 2, 180), tinta, 0.75 * f);
    } else {
      telaFraca(scene, ms * 0.75, tinta, 0.28 * f);
    }
    return this;
  };
}, MODO);

// ── the stage on a stepped clock ───────────────────────────────────────────────────────────────────────────────────
await page.evaluate(({ cena, chave }) => {
  const g = window.__game;
  window.Phaser.Math.RND.sow(['20261113']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now, quadros: 0 };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + (window.__passo.t - t0);
  window.__pisa = (n) => { for (let i = 0; i < n; i++) { window.__passo.t += 1000 / 60; window.__passo.quadros++; g.step(window.__passo.t, 1000 / 60); } };
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  window.__pisa(2);
  g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja'); g.registry.set('sementeMorte', 20261026);
  if (chave) {
    g.scene.start(chave, { score: 0, handling: 'diegetico' });
    window.__pisa(2);
  } else {
    const velha = g.scene.getScene('Game'); if (velha) velha.cartas = null;
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
    for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) window.__pisa(1);
    const s = g.scene.getScene('Game');
    s.cartas.abrirMesa = () => {};
    s.victory = () => {};
    window.__golpear = s.damageShip.bind(s);
    s.damageShip = () => {};
  }
  window.__q0 = window.__passo.quadros;
  window.__feito = {};
}, { cena: CENA, chave: CHAVE });

/** n steps; returns the clock in seconds, or null when the scene is over */
const passo = (n) => page.evaluate(({ n, cena, chave }) => {
  const g = window.__game;
  const uma = (nome, t, tt, fn) => { if (tt >= t && !window.__feito[nome]) { window.__feito[nome] = true; fn(); } };
  for (let i = 0; i < n; i++) {
    const tt = (window.__passo.quadros - window.__q0) / 60;
    if (chave) {
      if (!g.scene.isActive(chave)) return null;
      // cutscene 2 waits on the ship panel (the dock offers the alien ship): stay in the ship it came with
      const sc = g.scene.getScene(chave);
      if (sc.panel && !window.__feito.painel) {
        window.__feito.painel = true;
        sc.escolher(sc.naveId ?? 'humana');
        for (const c of document.querySelectorAll('canvas')) if (c !== g.canvas) c.style.visibility = 'hidden';
      }
      if (g.scene.isActive('Cartas')) {
        const d = g.scene.getScene('Cartas').sys.settings.data;
        g.scene.stop('Cartas');
        d?.onEscolha?.(d.opcoes[0]?.id ?? d.opcoes[0]);
        for (const c of document.querySelectorAll('canvas')) if (c !== g.canvas) c.style.visibility = 'hidden';
      }
    } else {
      if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
      if (g.scene.isPaused('Game')) g.scene.resume('Game');
      const s = g.scene.getScene('Game');
      if (!s || !g.scene.isActive('Game')) return null;
      if (!s.over) { s.ship.setPosition(96, 108); s.ship.body.setVelocity(0, 0); }
      if (cena === 'golpe') {
        // two hull losses, then the hit that kills
        if (tt < 8) s.lives = 3;
        uma('g1', 3.5, tt, () => window.__golpear());
        uma('g2', 6, tt, () => { s.invulnerableUntil = 0; window.__golpear(); });
        uma('g3', 8.5, tt, () => { s.lives = 1; s.invulnerableUntil = 0; window.__golpear(); });
      } else {
        s.lives = 3;
        if (!window.__feito.nasceu) { window.__feito.nasceu = true; s.spawnBoss(); }
        uma('bomba', 5, tt, () => { s.bombs = 3; s.useBomb(); });
        uma('furia', 8, tt, () => { if (s.boss) s.boss.hp = Math.floor(s.boss.maxHp / 2); });
        uma('morte', 11, tt, () => { if (s.boss && s.boss.damage(99999)) s.killBoss(); });
      }
    }
    window.__pisa(1);
  }
  return (window.__passo.quadros - window.__q0) / 60;
}, { n, cena: CENA, chave: CHAVE });

let t = 0, nq = 0;
while (t !== null && t < ATE) {
  t = await passo(t >= DE - 0.05 ? 2 : Math.max(1, Math.min(30, Math.floor((DE - t) * 60))));
  if (t === null) break;
  if (t >= DE) {
    const tela = await page.screenshot({ clip });
    await sharp(tela).resize(768, 432, { kernel: 'nearest' }).png().toFile(path.join(Q, `${String(nq++).padStart(5, '0')}.png`));
  }
}
const log = await page.evaluate(() => window.__flashLog);
const orfaos = await page.evaluate(() => window.__orfaos ?? []);
if (orfaos.length) console.log(`estouros em emissor destruído: ${orfaos.length} (o 1º em ${orfaos[0]} ms)`);
fs.writeFileSync(path.join(OUT, 'flashes.json'), JSON.stringify(log, null, 1));
console.log(`${CENA} ${MODO}: ${nq} quadros, ${log.length} flashes (${[...new Set(log.map((l) => l.fam))].join(', ')})`);
if (nq) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(Q, '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(OUT, 'video.mp4')]);
console.log(erros.length ? erros : 'sem erro de página');
await browser.close();
