// BLOCO E · a quick look at the menu scenery as the game builds it: mounts MenuCenaHD in the HD layer under a finished
// opening, hides the menu's text, runs the scenery clock on fixed 1/30 s steps up to <segundos>, and takes the screen.
// Deterministic: the same <segundos> always gives the same frame (a lightning at 2.43 s, say).
//   node scripts/_menu/_ver-cenario.mjs <out.png> [segundos=6]      (with `npm run dev` running)
// Modules are imported by the URL the page already loaded them with (after an HMR Vite serves them with `?t=`, and a
// bare `import('/src/x.ts')` would make a SECOND instance, one that doesn't see the running layer).
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, SEG = '6'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__gameHD?.textures.exists('menuK4-raio2') && window.__game?.scene.isActive('Menu'), null, { timeout: 60000 });
const info = await page.evaluate(async () => {
  const carregado = (fim) =>
    performance.getEntriesByType('resource').map((e) => new URL(e.name).pathname + new URL(e.name).search)
      .find((u) => u.split('?')[0].endsWith(fim));
  const hd = window.__gameHD;
  let cena = hd.scene.getScene('MenuHD');
  if (!cena) {
    const { MenuCenaHD, CHAVE_MENU_HD } = await import(carregado('/src/menu/MenuCenaHD.ts') ?? '/src/menu/MenuCenaHD.ts');
    window.__estadoMenu = { tAbertura: 99, pulou: true, reduzido: false, pronto: false, congelado: false };
    // Straight on the layer's scene manager (the same thing `cenaDeFundoHD` does), not through a module import.
    cena = hd.scene.add(CHAVE_MENU_HD, MenuCenaHD, true, { estado: window.__estadoMenu });
    hd.scene.sendToBack(CHAVE_MENU_HD);
  } else {
    window.__estadoMenu = window.__game.scene.getScene('Menu').estado;
  }
  const irmas = hd.scene.getScenes(true).filter((c) => c.sys.settings.key.startsWith('irma:'));
  for (const c of irmas) c.sys.setVisible(false);
  return { zoomCena: cena.cameras.main.zoom, zoomIrma: irmas[0]?.cameras.main.zoom };
});
await page.waitForFunction(() => window.__estadoMenu?.pronto, null, { timeout: 30000 });
// From here, a stepped clock: both games asleep, stepped 1/30 s at a time, the scenery clock from 0 to SEG.
await page.evaluate((seg) => {
  const g = window.__game, hd = window.__gameHD, cena = hd.scene.getScene('MenuHD');
  g.loop.sleep();
  hd.loop.sleep();
  cena.t = 0;
  const dt = 1000 / 30;
  let agora = performance.now();
  while (cena.t < seg - 1e-6) {
    agora += dt;
    g.step(agora, dt);
    hd.step(agora, dt);
  }
}, Number(SEG));
const r = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
const tela = await page.screenshot({ clip: r });
await sharp(tela).toFile(OUT);
await browser.close();
console.log(OUT, `zoom ${info.zoomCena} (irmã ${info.zoomIrma})`, erros.length ? `ERROS: ${erros.join(' | ')}` : 'sem erros');
process.exit(erros.length ? 1 : 0);
