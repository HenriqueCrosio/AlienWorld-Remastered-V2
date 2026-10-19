// BLOCO D — the chapter-4 GIF (the ship leaving the wound) once per LINEAGE + TIER, the `_gif-final-cap4.mjs` mould:
// instead of the dev key F (always the default ship), the tier goes into the registry and Interlude4 starts with the
// ship. One GIF per entry, at real speed.
//   node scripts/_leviata/_gif-cap4-naves.mjs <outDir> [segundos=8] [humana:1 humana:2 ... alienigena:2]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT_DIR, SEG_S = '8', ...lista] = process.argv.slice(2);
const NAVES = (lista.length ? lista : ['humana:1', 'humana:2', 'humana:3', 'alienigena:1', 'alienigena:2']).map((s) => {
  const [ship, tier] = s.split(':');
  return { ship, tier: Number(tier) };
});
const QUADRO = 1000 / 60, POR_FOTO = 3, ZOOM = 2, SEG = Number(SEG_S);
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const { ship, tier } of NAVES) {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(({ ship, tier }) => {
    const g = window.__game;
    g.registry.set('tierNave', tier);
    const ativa = g.scene.getScenes(true)[0];
    ativa.scene.start('Interlude4', { score: 21000, handling: 'diegetico', ship, stage: null, stageDone: 4, practice: false, baseScore: 15200 });
  }, { ship, tier });
  await page.waitForFunction(() => window.__game.scene.getScene('Interlude4')?.estado?.capitulo === 4, null, { polling: 4, timeout: 30000 });
  await page.evaluate(() => {
    const g = window.__game;
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
    // ⚠️ 18/10: Phaser's TweenManager keeps its OWN clock on Date.now() — with the loop stepped by hand, tweens ran on
    // real time (the screenshot latency) while timers ran on the stepped clock. Date.now follows the stepped clock.
    const base = Date.now(), t0 = window.__passo.t;
    Date.now = () => base + Math.round(window.__passo.t - t0);
  });
  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  const quadros = [];
  for (let i = 0; i < Math.round((SEG * 60) / POR_FOTO); i++) {
    await page.evaluate(({ n, QUADRO }) => {
      const g = window.__game;
      for (let k = 0; k < n; k++) { window.__passo.t += QUADRO; g.step(window.__passo.t, QUADRO); }
    }, { n: POR_FOTO, QUADRO });
    const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
    quadros.push(await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer());
  }
  await page.close();
  const out = path.join(OUT_DIR, `cap4-${ship}-t${tier}.gif`);
  await sharp(quadros, { join: { animated: true } })
    .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
    .toFile(out);
  // A still at ~2.4 s (ship stabilised, before it heads off) for the side-by-side.
  fs.writeFileSync(out.replace('.gif', '-quadro.png'), quadros[Math.min(quadros.length - 1, 48)]);
  console.log(out, quadros.length, 'quadros');
}
await browser.close();
