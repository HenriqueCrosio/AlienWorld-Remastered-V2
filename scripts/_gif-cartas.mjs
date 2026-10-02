// UM GIF DA CARTA EM JOGO, na velocidade real: o relógio do Phaser é CONGELADO e avançado à mão, 1/60s por passo, com
// uma foto do mundo a cada 3 passos (20 qps no GIF: o atraso do GIF é em centésimos, e 50ms é exato). A captura é
// lenta (SwiftShader), mas o jogo não sabe disso. A cena é a F2 limpa (como a probe-cartas-novas), a nave atirando
// num bando de alvos parados.
//
// Com VÁRIOS modos de arte (`ExplosaoDoJogador.arte`), grava o MESMO cenário uma vez por modo e empilha os painéis,
// um em cima do outro, com o nome de cada um — a comparação lado a lado.
//
// Uso: node scripts/_gif-cartas.mjs <out.gif> <cenario> [segundos] [modos] [nave]   (npm run dev rodando)
//   cenários: fragmentado · emcadeia · explosivo · casco
//   modos: jogo,variada,aprovada (padrão: aprovada) · nave: humana | alienigena
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, CENARIO = 'fragmentado', SEG = '2.5', MODOS = 'aprovada', NAVE = 'humana'] = process.argv.slice(2);
const CENARIOS = {
  explosivo: ['EFF_001'],
  fragmentado: ['EFF_001', 'EFF_002', 'EFF_003'],
  emcadeia: ['EFF_004', 'EFF_006', 'EFF_007', 'EFF_001'],
};
const NOME_MODO = { jogo: 'ANTES — a explosão de sempre', variada: 'A — a de sempre, variando', aprovada: 'A + B — a arte aprovada de cada carta, variando' };
const cartas = CENARIOS[CENARIO];
if (!cartas) throw new Error(`cenário desconhecido: ${CENARIO}`);
const modos = MODOS.split(',');
const QUADRO = 1000 / 60;
const POR_FOTO = 3;
const ZOOM = 2; // o mundo é 384×216; a foto sai em 2× do mundo, sem suavizar
const CLIP = { x: 46, y: 46, w: 270, h: 116 }; // a janela do mundo que entra no GIF
const ROTULO = 26;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

async function gravar(modo) {
  // A F2 limpa: o roteiro desligado, a nave intocável, as cartas dadas.
  await page.evaluate(() => {
    const g = window.__game;
    g.loop.wake();
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = undefined;
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate((nave) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.scene.start('Game', { stage: 2, ship: nave, handling: 'diegetico' });
  }, NAVE);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(600);
  await page.evaluate(({ cartas, modo }) => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    s.invulnerableUntil = s.time.now + 1e9;
    for (const id of cartas) s.cartas.aplicar(id);
    s.cartas.explosao.arte = modo;
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
  }, { cartas, modo });

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
  const total = Math.round((Number(SEG) * 60) / POR_FOTO);
  for (let i = 0; i < total; i++) {
    await passo(POR_FOTO);
    const foto = await page.screenshot({
      clip: { x: geo.left + CLIP.x * geo.k, y: geo.top + CLIP.y * geo.k, width: CLIP.w * geo.k, height: CLIP.h * geo.k },
    });
    quadros.push(await sharp(foto).resize(CLIP.w * ZOOM, CLIP.h * ZOOM, { kernel: 'nearest' }).png().toBuffer());
  }
  await page.keyboard.up('Space');
  return quadros;
}

const porModo = [];
for (const m of modos) porModo.push(await gravar(m));
await browser.close();

// Os painéis empilhados, cada um com o nome do modo em cima.
const W = CLIP.w * ZOOM;
const H = CLIP.h * ZOOM;
const comRotulo = modos.length > 1;
const PH = H + (comRotulo ? ROTULO : 0);
const rotulos = await Promise.all(modos.map((m) => sharp(Buffer.from(
  `<svg width="${W}" height="${ROTULO}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="8" y="18" font-family="Consolas, monospace" font-size="15" fill="#ffb040">${NOME_MODO[m] ?? m}</text></svg>`,
)).png().toBuffer()));
const n = Math.min(...porModo.map((q) => q.length));
const quadros = [];
for (let i = 0; i < n; i++) {
  const comp = [];
  porModo.forEach((q, k) => {
    if (comRotulo) comp.push({ input: rotulos[k], left: 0, top: k * PH });
    comp.push({ input: q[i], left: 0, top: k * PH + (comRotulo ? ROTULO : 0) });
  });
  quadros.push(await sharp({ create: { width: W, height: PH * modos.length, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer());
}
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros ×', modos.length, 'painéis');
