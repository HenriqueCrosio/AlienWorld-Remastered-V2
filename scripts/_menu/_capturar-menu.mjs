// BLOCO E — the menu as it is today, for the opening questions. Real-speed stepped capture (the `_gif-menu.mjs`
// mould): the loop sleeps once the Menu scene is up, Date.now follows the stepped clock (tweens use it).
// The DEV hint lines are hidden (they never ship). Outputs, in <outDir>:
//   menu-<t>s.png   full screen ×3 at the chosen moments
//   menu-abertura.gif  the whole opening, ×2, 10 fps
//   menu-repouso-marcado.png  the rest state ×3 with numbered markers on each piece
//   node scripts/_menu/_capturar-menu.mjs <outDir> [segundos=20]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, SEG_S = '20'] = process.argv.slice(2);
const QUADRO = 1000 / 60, POR_FOTO = 6, SEG = Number(SEG_S);
const MOMENTOS = [0.6, 2.4, 5, 9, 14, SEG];
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.getScene('Menu')?.sys?.isActive(), null, { polling: 4, timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game;
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + Math.round(window.__passo.t - t0);
  const esconderDev = () => {
    // The menu text lives in the HD layer (a second Phaser.Game, `__gameHD`), so look in both games.
    const cenas = [...g.scene.getScenes(true), ...(window.__gameHD?.scene.getScenes(true) ?? [])];
    for (const cena of cenas) {
      for (const o of cena.children.list) {
        if (typeof o.text === 'string' && /\[B\] chef|\[I\]\[O\]/.test(o.text)) o.setVisible(false);
      }
    }
  };
  window.__esconderDev = esconderDev;
  esconderDev();
});
const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { k: c.width / 384, left: c.left, top: c.top };
});
// Full screen resolution: the menu text is drawn by the HD layer, and shrinking to 384 scrambles it.
const foto = async () => {
  const f = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  return sharp(f).resize(1152, 648, { kernel: 'nearest' }).png().toBuffer();
};
const quadros = [];
const leviNoMomento = {};
let t = 0, proximo = 0;
const total = Math.round(SEG * 60);
for (let passo = 0; passo < total; passo += POR_FOTO) {
  const lev = await page.evaluate(({ n, QUADRO }) => {
    const g = window.__game;
    for (let k = 0; k < n; k++) { window.__passo.t += QUADRO; g.step(window.__passo.t, QUADRO); }
    window.__esconderDev();
    const l = g.scene.getScene('Menu').leviatan;
    return l ? { x: l.x, y: l.y } : null;
  }, { n: POR_FOTO, QUADRO });
  t = ((passo + POR_FOTO) * QUADRO) / 1000;
  const tela = await foto();
  quadros.push(await sharp(tela).resize(768, 432).png().toBuffer());
  while (proximo < MOMENTOS.length && t >= MOMENTOS[proximo] - 1e-6) {
    fs.writeFileSync(path.join(OUT, `menu-${MOMENTOS[proximo]}s.png`), tela);
    leviNoMomento[MOMENTOS[proximo]] = lev;
    proximo++;
  }
}
await browser.close();
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(path.join(OUT, 'menu-abertura.gif'));

// Numbered markers (game coords; drawn ×3).
const marca = (n, x, y) => `<circle cx="${x * 3}" cy="${y * 3}" r="17" fill="#ffb347" stroke="#0d0f15" stroke-width="3"/>` +
  `<text x="${x * 3}" y="${y * 3 + 7}" font-family="Segoe UI, sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#0d0f15">${n}</text>`;
const marcar = async (fonte, destino, marcas) => {
  const svg = `<svg width="1152" height="648" xmlns="http://www.w3.org/2000/svg">${marcas.map((m) => marca(...m)).join('')}</svg>`;
  await sharp(fonte).composite([{ input: Buffer.from(svg) }]).toFile(destino);
};
await marcar(path.join(OUT, `menu-${SEG}s.png`), path.join(OUT, 'menu-repouso-marcado.png'), [
  [1, 322, 52], [2, 236, 26], [3, 30, 150], [4, 110, 172], [5, 92, 64], [6, 362, 136], [7, 236, 64],
  [8, 110, 122], [9, 125, 156], [10, 50, 194], [11, 40, 34],
]);
const meio = leviNoMomento[9];
if (meio) await marcar(path.join(OUT, 'menu-9s.png'), path.join(OUT, 'menu-travessia-marcado.png'), [[12, meio.x, meio.y - 22]]);
console.log(OUT, quadros.length, 'quadros', JSON.stringify(leviNoMomento));
