// 19/11 · films the night-menu fog and rain: clips at real speed starting at given moments of the storm track, or a
// time-lapse of the whole arc (one frame every <passo> s). Frames as JPEG, then ffmpeg to mp4.
//   node scripts/_menu/_neblina-filmar.mjs <outDir> <port> <query> clip <s1,s2,...> <dur> <fps>
//   node scripts/_menu/_neblina-filmar.mjs <outDir> <port> <query> lapso <passo> <fps>
import { execFileSync } from 'child_process';
import fs from 'fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, PORTA, QUERY, MODO, A1, A2, A3] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
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
const r = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
const passo = (alvo, saltar) => page.evaluate(([alvo, saltar]) => {
  const g = window.__game, hd = window.__gameHD, cena = hd.scene.getScene('MenuHD');
  if (saltar) cena.t = Math.max(0, alvo - 1);
  const dt = 1000 / 30;
  while (cena.t < alvo - 1e-6) { window.__agora += dt; g.step(window.__agora, dt); hd.step(window.__agora, dt); }
}, [alvo, saltar]);
const filme = async (nome, tempos, fps, saltarSempre) => {
  const pasta = `${OUT}/${nome}`;
  fs.mkdirSync(pasta, { recursive: true });
  let n = 0;
  for (const [j, t] of tempos.entries()) {
    await passo(t, saltarSempre || j === 0);
    await sharp(await page.screenshot({ clip: r, type: 'png' })).jpeg({ quality: 90 }).toFile(`${pasta}/${String(n++).padStart(5, '0')}.jpg`);
  }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-i', `${pasta}/%05d.jpg`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-vf', 'scale=1536:-2', `${OUT}/${nome}.mp4`]);
  fs.rmSync(pasta, { recursive: true });
};
if (MODO === 'clip') {
  const fps = Number(A3);
  for (const s0 of A1.split(',').map(Number)) {
    const tempos = Array.from({ length: Math.round(Number(A2) * fps) }, (_, j) => s0 + j / fps);
    await filme(`clip-${s0}`, tempos, fps, false);
  }
} else {
  const tempos = []; for (let t = 1; t < 376; t += Number(A1)) tempos.push(t);
  await filme('lapso', tempos, Number(A2), true);
}
await browser.close();
console.log(OUT, erros.length ? `ERROS: ${erros.join(' | ')}` : 'sem erros');
process.exit(erros.length ? 1 : 0);
