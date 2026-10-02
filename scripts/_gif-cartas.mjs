// UM GIF DA CARTA EM JOGO, na velocidade real: o relógio do Phaser é CONGELADO e avançado à mão, 1/60s por passo, com
// uma foto do mundo a cada 3 passos (20 qps no GIF: o atraso do GIF é em centésimos, e 50ms é exato). A captura é lenta (SwiftShader), mas o jogo não sabe disso.
// A cena é a F2 limpa (como a probe-cartas-novas), a nave atirando num bando de alvos parados.
// Uso: node scripts/_gif-cartas.mjs <out.gif> <cenario> [segundos]   (npm run dev rodando)
// Cenários: fragmentado · emcadeia · explosivo
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, CENARIO = 'fragmentado', SEG = '2.5'] = process.argv.slice(2);
const CENARIOS = {
  explosivo: ['EFF_001'],
  fragmentado: ['EFF_001', 'EFF_002', 'EFF_003'],
  emcadeia: ['EFF_004', 'EFF_006', 'EFF_007', 'EFF_001'],
};
const cartas = CENARIOS[CENARIO];
if (!cartas) throw new Error(`cenário desconhecido: ${CENARIO}`);
const QUADRO = 1000 / 60;
const ZOOM = 2; // o mundo é 384×216; a foto sai em 2× do mundo, sem suavizar
const CLIP = { x: 40, y: 38, w: 300, h: 140 }; // a janela do mundo que entra no GIF

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// A F2 limpa: o roteiro desligado, a nave intocável, as cartas dadas.
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  const velha = g.scene.getScene('Game');
  if (velha) velha.cartas = undefined;
});
await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
await page.evaluate(() => {
  const g = window.__game;
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
await page.waitForTimeout(600);
await page.evaluate((cartas) => {
  const s = window.__game.scene.getScene('Game');
  s.director.update = () => [];
  s.enemies.enemies.clear(true, true);
  s.invulnerableUntil = s.time.now + 1e9;
  for (const id of cartas) s.cartas.aplicar(id);
  // O bando: 7 drones parados, num cacho, na linha da nave.
  const y0 = s.ship.y;
  [[190, 0], [205, -12], [205, 12], [222, -4], [222, 18], [238, -14], [240, 6]].forEach(([x, dy]) => {
    s.enemies.spawn('drone', y0 + dy, x);
    const kids = s.enemies.enemies.getChildren();
    const e = kids[kids.length - 1];
    e.setPosition(x, y0 + dy);
    e.body.setVelocity(0, 0);
    e.setData('hp', 6);
  });
  // Sem o letreiro da fase por cima do bando.
  s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
  s.banner.setAlpha(0);
  s.bannerFaixa.setAlpha(0);
  // O RELÓGIO À MÃO: o laço do Phaser dorme e cada `step` avança exatamente um quadro.
  const g = window.__game;
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
}, cartas);

const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { k: c.width / 384, left: c.left, top: c.top };
});
const passo = (n) => page.evaluate(({ n, QUADRO }) => {
  const g = window.__game;
  for (let i = 0; i < n; i++) {
    window.__passo.t += QUADRO;
    g.step(window.__passo.t, QUADRO);
  }
}, { n, QUADRO });

await page.keyboard.down('Space'); // a nave atira o tempo todo
const quadros = [];
const POR_FOTO = 3;
const total = Math.round((Number(SEG) * 60) / POR_FOTO);
for (let i = 0; i < total; i++) {
  await passo(POR_FOTO);
  const foto = await page.screenshot({
    clip: { x: geo.left + CLIP.x * geo.k, y: geo.top + CLIP.y * geo.k, width: CLIP.w * geo.k, height: CLIP.h * geo.k },
  });
  quadros.push(await sharp(foto).resize(CLIP.w * ZOOM, CLIP.h * ZOOM, { kernel: 'nearest' }).png().toBuffer());
}
await page.keyboard.up('Space');
await browser.close();

await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros');
