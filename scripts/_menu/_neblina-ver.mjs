// 19/11 · the night-menu fog and rain at several moments of the storm track, on any port and with any query (the
// fog/rain versions: ?neblina=lisa|pontilhada|nenhuma, ?chuva=nenhuma). Built on _ver-cenario.mjs, but JUMPS the scenery
// clock (fog and rain are pure functions of it) and then steps a second, so a far moment doesn't take minutes.
//   node scripts/_menu/_neblina-ver.mjs <outPrefix> <port> <query> <s1,s2,...>
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, PORTA, QUERY, SEGS] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.goto(`http://localhost:${PORTA}/${QUERY}`, { waitUntil: 'domcontentloaded' });
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
await page.evaluate(() => { window.__game.loop.sleep(); window.__gameHD.loop.sleep(); window.__agora = performance.now(); });
for (const seg of SEGS.split(',').map(Number)) {
  await page.evaluate((seg) => {
    const g = window.__game, hd = window.__gameHD, cena = hd.scene.getScene('MenuHD');
    cena.t = Math.max(0, seg - 1);
    const dt = 1000 / 30;
    while (cena.t < seg - 1e-6) { window.__agora += dt; g.step(window.__agora, dt); hd.step(window.__agora, dt); }
  }, seg);
  const r = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
  await sharp(await page.screenshot({ clip: r })).toFile(`${OUT}-${seg}.png`);
}
await browser.close();
console.log(OUT, SEGS, erros.length ? `ERROS: ${erros.join(' | ')}` : 'sem erros');
process.exit(erros.length ? 1 : 0);
