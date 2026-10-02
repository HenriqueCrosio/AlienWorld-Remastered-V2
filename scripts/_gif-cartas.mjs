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
// cartas · se a nave atira · onde ficam os alvos · [segundo, lançador] = forçar um disparo de carta naquele instante
// (a espera real é de 3–4s, e o GIF ficaria longo esperando).
const CENARIOS = {
  explosivo: { cartas: ['EFF_001'], atira: true, bando: 'cacho' },
  fragmentado: { cartas: ['EFF_001', 'EFF_002', 'EFF_003'], atira: true, bando: 'cacho' },
  emcadeia: { cartas: ['EFF_004', 'EFF_006', 'EFF_007', 'EFF_001'], atira: true, bando: 'cacho' },
  missil: { cartas: ['WPN_009', 'WPN_009'], atira: false, bando: 'espalhado', forcar: [[0.1, 'missil'], [1.6, 'missil']] },
  flare: { cartas: ['EFF_010'], atira: false, bando: 'atras', forcar: [[0.1, 'flare'], [1.2, 'flare']], clip: { x: 0, y: 46, w: 200, h: 116 } },
};
const NOME_MODO = { jogo: 'ANTES — a explosão de sempre', variada: 'A — a de sempre, variando', aprovada: 'A + B — a arte aprovada de cada carta, variando' };
const cen = CENARIOS[CENARIO];
if (!cen) throw new Error(`cenário desconhecido: ${CENARIO}`);
const { cartas } = cen;
const modos = MODOS.split(',');
const QUADRO = 1000 / 60;
const POR_FOTO = 3;
const ZOOM = 2; // o mundo é 384×216; a foto sai em 2× do mundo, sem suavizar
const CLIP = cen.clip ?? { x: 46, y: 46, w: 270, h: 116 }; // a janela do mundo que entra no GIF
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
  await page.evaluate(({ cartas, modo, bando }) => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    // Nave intocável SEM i-frames: com eles ela pisca (60ms), e o GIF a pegaria some-aparece.
    s.damageShip = () => {};
    for (const id of cartas) s.cartas.aplicar(id);
    s.cartas.explosao.arte = modo;
    // Os lançadores só disparam quando o GIF manda (`forcar`).
    s.cartas.lancadores.proximoMissil = Infinity;
    s.cartas.lancadores.proximoFlare = Infinity;
    // O bando, parado: um CACHO na linha da nave; ESPALHADO na vertical (o míssil tem que fazer a curva); ATRÁS da nave
    // (o flare é armadilha para quem persegue).
    const y0 = s.ship.y;
    const x0 = s.ship.x;
    const BANDOS = {
      cacho: [[190, 0, 6], [205, -12, 6], [205, 12, 6], [222, -4, 6], [222, 18, 6], [238, -14, 6], [240, 6, 6]],
      espalhado: [[230, -45, 6], [250, 40, 6], [270, -10, 6]],
      atras: [[x0 - 30, 0, 1]],
    };
    BANDOS[bando].forEach(([x, dy, hp]) => {
      s.enemies.spawn('drone', y0 + dy, x);
      const kids = s.enemies.enemies.getChildren();
      const e = kids[kids.length - 1];
      e.setPosition(x, y0 + dy);
      e.body.setVelocity(0, 0);
      e.setData('hp', hp);
    });
    // Sem o letreiro da fase por cima do bando.
    s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
    s.banner.setAlpha(0);
    s.bannerFaixa.setAlpha(0);
    // O RELÓGIO À MÃO: o laço do Phaser dorme e cada `step` avança exatamente um quadro.
    const g = window.__game;
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
  }, { cartas, modo, bando: cen.bando });

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

  if (cen.atira) await page.keyboard.down('Space'); // a nave atira o tempo todo
  const quadros = [];
  const total = Math.round((Number(SEG) * 60) / POR_FOTO);
  const forcar = [...(cen.forcar ?? [])];
  for (let i = 0; i < total; i++) {
    const seg = (i * POR_FOTO) / 60;
    while (forcar.length && forcar[0][0] <= seg) {
      const [, qual] = forcar.shift();
      await page.evaluate((qual) => {
        const s = window.__game.scene.getScene('Game');
        s.cartas.lancadores[qual === 'missil' ? 'proximoMissil' : 'proximoFlare'] = s.time.now;
      }, qual);
      await passo(1);
      await page.evaluate(() => {
        const l = window.__game.scene.getScene('Game').cartas.lancadores;
        l.proximoMissil = Infinity;
        l.proximoFlare = Infinity;
      });
    }
    await passo(POR_FOTO);
    const foto = await page.screenshot({
      clip: { x: geo.left + CLIP.x * geo.k, y: geo.top + CLIP.y * geo.k, width: CLIP.w * geo.k, height: CLIP.h * geo.k },
    });
    quadros.push(await sharp(foto).resize(CLIP.w * ZOOM, CLIP.h * ZOOM, { kernel: 'nearest' }).png().toBuffer());
  }
  if (cen.atira) await page.keyboard.up('Space');
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
