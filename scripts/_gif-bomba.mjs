// O GIF DA BOMBA DE QUEDA, na velocidade real (o molde do `_gif-cartas.mjs`: o laço do Phaser dorme e cada `step`
// avança 1/60s; uma foto a cada 3 passos, 50ms por quadro). Dois painéis empilhados:
//   ATMOSFERA (F1) — a nave andando para a frente solta duas bombas; elas caem em parábola sobre as construções que
//   rolam com o chão (torreta e base);
//   VÁCUO (F2) — duas bombas arremessadas: a 1ª bate num drone (contato), a 2ª segue reta e explode no pavio.
// Uso: node scripts/_gif-bomba.mjs <out.gif>   (npm run dev rodando)
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT = 'bomba.gif'] = process.argv.slice(2);
const QUADRO = 1000 / 60;
const POR_FOTO = 3;
const SEG = 3.2;
const ZOOM = 2;
const ROTULO = 22;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const PAINEIS = [
  { nome: 'ATMOSFERA (F1) — solta da barriga, cai em parábola, explode no solo / na construção', stage: 1, y: 70, frente: true, bombas: [0.25, 1.25] },
  { nome: 'VÁCUO (F2) — arremessada reta: contato no drone, pavio de 1,5s', stage: 2, y: 108, frente: false, bombas: [0.25, 1.3] },
];

async function gravar(p) {
  await page.evaluate(() => {
    const g = window.__game;
    g.loop.wake();
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = undefined;
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate((stage) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.scene.start('Game', { stage, ship: 'humana', handling: 'diegetico' });
  }, p.stage);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(600);
  await page.evaluate((p) => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    s.terrain.props.clear(true, true);
    s.invulnerableUntil = s.time.now + 1e9;
    s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
    s.banner.setAlpha(0);
    s.bannerFaixa.setAlpha(0);
    s.ship.setPosition(80, p.y);
    s.ship.body.setVelocity(0, 0);
    if (p.stage === 1) {
      // As construções ROLAM com o chão (a velocidade delas é a do cenário): postas onde as bombas vão cair.
      for (const [tipo, x] of [['turret', 205], ['base', 300]]) {
        s.terrain.spawn(tipo);
        s.terrain.props.getChildren().at(-1).setX(x);
      }
    } else {
      s.enemies.spawn('drone', p.y, 200);
      const d = s.enemies.enemies.getChildren().at(-1);
      d.setPosition(200, p.y);
      d.body.setVelocity(0, 0);
      d.setData('baseY', p.y);
    }
    const g = window.__game;
    g.loop.sleep();
    window.__passo = { t: g.loop.now };
  }, p);

  const geo = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  /** Um quadro: na F1 a nave fica na mesma altura, andando para a FRENTE (a bomba herda esse vx). */
  const passo = (n) =>
    page.evaluate(({ n, QUADRO, p }) => {
      const g = window.__game;
      const s = g.scene.getScene('Game');
      for (let i = 0; i < n; i++) {
        if (p.frente) {
          s.ship.y = p.y;
          s.ship.body.setVelocity(55, 0);
        } else {
          s.ship.setPosition(80, p.y);
          s.ship.body.setVelocity(0, 0);
        }
        window.__passo.t += QUADRO;
        g.step(window.__passo.t, QUADRO);
      }
    }, { n, QUADRO, p });

  const quadros = [];
  const soltar = [...p.bombas];
  const total = Math.round((SEG * 60) / POR_FOTO);
  for (let i = 0; i < total; i++) {
    const seg = (i * POR_FOTO) / 60;
    if (soltar.length && soltar[0] <= seg) {
      soltar.shift();
      await page.keyboard.press('Shift');
      await passo(1);
    }
    await passo(POR_FOTO);
    const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
    quadros.push(await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer());
  }
  await page.evaluate(() => window.__game.loop.wake());
  return quadros;
}

const porPainel = [];
for (const p of PAINEIS) porPainel.push(await gravar(p));
await browser.close();

const W = 384 * ZOOM;
const H = (216 * ZOOM + ROTULO) * PAINEIS.length;
const rotulos = await Promise.all(PAINEIS.map((p) => sharp(Buffer.from(
  `<svg width="${W}" height="${ROTULO}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="${ROTULO - 6}" font-family="Consolas, monospace" font-size="14" fill="#ffb040">${p.nome}</text></svg>`,
)).png().toBuffer()));
const n = Math.min(...porPainel.map((q) => q.length));
const quadros = [];
for (let i = 0; i < n; i++) {
  const comp = [];
  porPainel.forEach((q, k) => {
    const topo = k * (216 * ZOOM + ROTULO);
    comp.push({ input: rotulos[k], left: 0, top: topo });
    comp.push({ input: q[i], left: 0, top: topo + ROTULO });
  });
  quadros.push(await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer());
}
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros ×', PAINEIS.length, 'painéis');
