// BLOCO D · the far silhouette as installed (`leviathanLonge`, his pick of 19/10: the shadow with the cold rim, small,
// behind the dead fleet, barely swimming, gone from F3), photographed in the REAL game:
//   A · F2 stills, paused, start (setApproach 0) and end (1): today's old art, then three width ranges — the game's
//       (40→60) and a smaller and a bigger one for him to compare (the row of the sheet is set by hand);
//   B · the RULER: a hull of the dead fleet moved over the silhouette (staged, to show the layer order);
//   C · F2 at real speed (stepped loop + fake Date.now, `avaliar-skill-por-gif`), the whole frame and a ×4 crop;
//   D · the end of F1: the atmosphere broken by hand, the first sighting.
// Needs `npm run dev` on :5173.
//   node scripts/_leviata/_capturar-silhueta-longe.mjs <outDir> [segundos=6]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const [OUT = 'docs/superpowers/folhas/2026-10-19/leviata/silhueta/longe', SEG_S = '6'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const OPCOES = { pequeno: [32, 48], medio: [40, 60], grande: [48, 72] };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
const foto = () => page.evaluate(() => new Promise((res) => window.__game.renderer.snapshot((img) => {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  res(c.toDataURL('image/png'));
}))).then((u) => Buffer.from(u.split(',')[1], 'base64'));
const ampliar = async (buf, k) => { const m = await sharp(buf).metadata(); return sharp(buf).resize(m.width * k, m.height * k, { kernel: 'nearest' }).png().toBuffer(); };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrir(tecla, ate = 1) {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await espera(1200);
  await page.keyboard.press(tecla);
  await page.waitForFunction((t) => (window.__game.scene.getScene('Game')?.elapsed ?? 0) >= t, ate, { polling: 16, timeout: 30000 });
}
const semInimigos = () => page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  for (const g of [s.enemies?.enemies, s.debris?.hazards]) g?.getChildren().forEach((o) => o.setVisible(false));
});

// ─── A · F2 stills ───
await abrir('V');
await page.evaluate(() => window.__game.scene.getScene('Game').scene.pause());
await semInimigos();
const celulas = [];
for (const nome of ['hoje', ...Object.keys(OPCOES)]) {
  for (const t of [0, 1]) {
    await page.evaluate(({ nome, t, op }) => {
      const p = window.__game.scene.getScene('Game').parallax;
      const l = p.leviathan;
      const lin = (a, b) => a + (b - a) * t;
      if (nome === 'hoje') {
        l.setTexture('leviathan').setScale(lin(0.5, 1.15)).setTint(0x2a3352).setAlpha(lin(0.45, 0.8))
          .setPosition(lin(304, 250), lin(72, 84)).setDepth(-94);
      } else {
        l.setTexture('leviathanLonge').setScale(1).clearTint().setDepth(-96.5);
        p.setApproach(t);
        p.larguraLeviata(lin(op[0], op[1]));
      }
    }, { nome, t, op: OPCOES[nome] ?? null });
    await espera(150);
    const f = await foto();
    fs.writeFileSync(path.join(OUT, `${nome}-${t ? 'fim' : 'inicio'}.png`), await ampliar(f, 2));
    celulas.push(f);
  }
}
// the comparison grid: a row per option, start | end, 1×
await sharp({ create: { width: 384 * 2 + 6, height: (216 + 6) * 4 - 6, channels: 4, background: '#0d0f15' } })
  .composite(celulas.map((input, k) => ({ input, left: (k % 2) * 390, top: Math.floor(k / 2) * 222 })))
  .png().toFile(path.join(OUT, 'grade-f2.png'));
console.log('A ok');

// (B · a staged "ruler" — a dead-fleet hull moved over it — was dropped: the hull is 158 px and swallowed it whole.)

// ─── C · F2 at real speed ───
async function gravar(nomeGif, seg, caixa, z) {
  await page.evaluate(() => {
    const g = window.__game;
    // the ship cannot die in the recording (the "untouchable" of the cards: no blinking, unlike the i-frames)
    const s = g.scene.getScene('Game');
    if (s?.cartas) s.cartas.intocavel = () => true;
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
    const base = Date.now(), t0 = window.__passo.t;
    Date.now = () => base + Math.round(window.__passo.t - t0);
  });
  const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
  const inteiros = [], zooms = [];
  const QUADRO = 1000 / 60, POR_FOTO = 3;
  for (let i = 0; i < Math.round((seg * 60) / POR_FOTO); i++) {
    await page.evaluate(({ n, QUADRO }) => {
      const g = window.__game;
      for (let k = 0; k < n; k++) { window.__passo.t += QUADRO; g.step(window.__passo.t, QUADRO); }
      const s = g.scene.getScene('Game');
      // (a group already destroyed has no `children`: in F1 the debris one is)
      for (const gr of [s?.enemies?.enemies, s?.debris?.hazards]) if (gr?.children) gr.getChildren().forEach((o) => o.setVisible(false));
    }, { n: POR_FOTO, QUADRO });
    const shot = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
    const um = await sharp(shot).resize(384, 216, { kernel: 'nearest' }).png().toBuffer();
    inteiros.push(await ampliar(um, 2));
    zooms.push(await ampliar(await sharp(um).extract(caixa).png().toBuffer(), z));
  }
  const gif = (qs, out) => sharp(qs, { join: { animated: true } }).gif({ delay: Array(qs.length).fill(50), loop: 0 }).toFile(out);
  await gif(inteiros, path.join(OUT, `${nomeGif}.gif`));
  await gif(zooms, path.join(OUT, `${nomeGif}-zoom.gif`));
}
await abrir('V', 1);
await gravar('jogo-f2', Number(SEG_S), { left: 268, top: 14, width: 110, height: 60 }, 4);
console.log('C ok');

// ─── D · the end of F1 ───
await abrir('1', 2);
// only the sky (the scene's own `breakAtmosphere` also swaps the handling, which breaks outside the boss fight)
await page.evaluate(() => window.__game.scene.getScene('Game').parallax.breakAtmosphere());
await gravar('jogo-f1-fim', 7, { left: 280, top: 0, width: 104, height: 56 }, 4);
console.log('D ok');
await browser.close();
