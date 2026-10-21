// BLOCO G · the F1 as it is now, filmed on a STEPPED clock (60 Hz steps, a photo every 2 = 30 fps, fake Date.now so
// the tweens follow — the lesson of block D) for his sheet. The world canvas only (no HUD): the ship parked high on
// the left and untouchable; the enemies and the hazards hidden with --limpo (the background is what is judged).
//   node scripts/_g/_filmar-f1.mjs <outDir> [segundos=70] [--limpo] [--saida]
//   --saida: films the atmosphere exit instead (breakAtmosphere 1 s in, 8 s long) → saida.webm
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { webm } from '../_menu/_webm.mjs';

const args = process.argv.slice(2);
const OUT = args[0];
const SAIDA = args.includes('--saida');
const LIMPO = args.includes('--limpo');
const SEG = SAIDA ? 8 : Number(args.find((a, i) => i > 0 && /^\d+$/.test(a)) ?? 70);
const Z = 3;
const QUADROS = path.join(OUT, SAIDA ? '_q-saida' : LIMPO ? '_q-limpo' : '_q');
fs.rmSync(QUADROS, { recursive: true, force: true });
fs.mkdirSync(QUADROS, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' }));
await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) > 0, null, { timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game;
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + Math.round(window.__passo.t - t0);
  const s = g.scene.getScene('Game');
  if (s?.cartas) s.cartas.intocavel = () => true;
  s.invulnerableUntil = 1e12;
  // The text layer (HUD, banners) is a canvas of its own on top: hidden, the background is what is judged.
  if (window.__gameHD?.canvas) window.__gameHD.canvas.style.visibility = 'hidden';
});
// A screenshot of the world canvas, NOT `renderer.snapshot`: the snapshot is taken at the NEXT render, and with the
// loop asleep between steps that render never comes (20/10: the first run hung on its first photo).
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const foto = async () => {
  const shot = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  return sharp(shot).resize(384, 216, { kernel: 'nearest' }).png().toBuffer();
};

const QUADRO = 1000 / 60;
const total = Math.round(SEG * 30);
// The stills come from the clean run (the background is what is judged). `--fotos=14,26.5,…` adds stills at those
// seconds; `--so-fotos` takes ONLY those (no frames, no video — a fast pass to photograph what the stage spawns).
const FOTOS = (args.find((a) => a.startsWith('--fotos='))?.slice(8).split(',').map(Number) ?? []).map((s) => Math.round(s * 30));
const SO_FOTOS = args.includes('--so-fotos');
const marcas = [...(LIMPO && !SO_FOTOS ? [0, 10, 20, 30, 40, 50, 60].map((s) => s * 30) : []), ...FOTOS];
for (let i = 0; i < total; i++) {
  await page.evaluate(({ QUADRO, limpo, saida, i }) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    if (saida && i === 30) s.breakAtmosphere();
    for (let k = 0; k < 2; k++) {
      window.__passo.t += QUADRO;
      g.step(window.__passo.t, QUADRO);
      if (s?.ship) { s.ship.x = 40; s.ship.y = 40; s.ship.body?.setVelocity?.(0, 0); }
    }
    if (limpo) for (const gr of [s?.enemies?.enemies, s?.debris?.hazards, s?.enemyBullets]) if (gr?.children) gr.getChildren().forEach((o) => o.setVisible(false));
  }, { QUADRO, limpo: LIMPO, saida: SAIDA, i });
  if (SO_FOTOS && !marcas.includes(i)) continue;
  const f = await foto();
  const arq = path.join(QUADROS, `${String(i).padStart(5, '0')}.png`);
  await sharp(f).resize(384 * Z, 216 * Z, { kernel: 'nearest' }).png().toFile(arq);
  if (marcas.includes(i)) fs.copyFileSync(arq, path.join(OUT, `t${String(Math.round((i / 30) * 10) / 10).padStart(2, '0')}.png`));
}
await browser.close();
if (SO_FOTOS) { fs.rmSync(QUADROS, { recursive: true, force: true }); console.log('fotos', FOTOS.map((i) => i / 30).join(', ')); process.exit(0); }
const nome = SAIDA ? 'saida.webm' : LIMPO ? 'f1-limpo.webm' : 'f1.webm';
await webm(QUADROS, path.join(OUT, nome), 30);
fs.rmSync(QUADROS, { recursive: true, force: true });
console.log(path.join(OUT, nome), total, 'quadros');
