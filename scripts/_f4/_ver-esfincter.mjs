// A SOLEIRA DO NÚCLEO — a cena inteira do esfíncter, da chegada ao gore. Monta a folha de contato.
//
// As perguntas que esta folha responde ANTES de ele jogar:
//   · a criatura RECORTA contra o azul do núcleo, ou some?
//   · o gás lê como gás, ou como mancha na parede?
//   · o cone abre para a DIREITA e ESCURECE, ou clareia no fim?
//   · os pedaços parecem bicho, ou estilhaço genérico?
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-esfincter.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'scripts/_f4/_folha-esfincter.png';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);

const blindar = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 999;
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  });
const salta = (t) =>
  page.evaluate((t) => {
    const s = window.__game.scene.getScenes(true)[0];
    s.elapsed = t;
    s.director.skipTo(t);
    s.aplicaCorredorEMoldura(t);
  }, t);
const ate = (t) =>
  page.waitForFunction((a) => window.__game.scene.getScenes(true)[0].elapsed >= a, t, {
    timeout: 120000,
    polling: 16,
  });

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const p = s.terrain.props.getChildren().find((o) => o.active && o.getData('kind') === 'garganta');
    return {
      t: Math.round(s.elapsed * 10) / 10,
      x: p ? Math.round(p.x) : null,
      denso: s.esfincter?.denso === true,
      inerte: p?.getData('inerte') === true,
      gas: s.children.list.filter((o) => o.name === 'f4Gas').length,
      cone: s.children.list.filter((o) => o.name === 'f4Cone').length,
      gore: s.children.list.filter((o) => o.name === 'f4Gore').length,
    };
  });

const tiras = [];
const foto = async (rotulo) => {
  console.log(rotulo.padEnd(26), JSON.stringify(await estado()));
  tiras.push(await page.screenshot());
};

await blindar();
await salta(107);
await ate(110.2);
await blindar();
await foto('a chegada');

await ate(110.9);
await foto('o gás fino');

// Espera a nuvem ficar densa de verdade, em vez de chutar um instante.
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].esfincter?.denso === true, null, {
  timeout: 20000,
  polling: 40,
});
await foto('o gás DENSO — pronto');

// O tiro.
await page.evaluate(() => window.__game.scene.getScenes(true)[0].matarGarganta());
await page.waitForTimeout(90);
await foto('a ignição');
await page.waitForTimeout(220);
await foto('o cone abrindo');
await page.waitForTimeout(300);
await foto('o cone esfriando');
await page.waitForTimeout(500);
await foto('o gore entrando no núcleo');
await page.waitForTimeout(1400);
await foto('a passagem aberta');

await browser.close();

const PAD = 6,
  COLS = 2;
const linhas = Math.ceil(tiras.length / COLS);
await sharp({
  create: {
    width: COLS * (768 + PAD) + PAD,
    height: linhas * (432 + PAD) + PAD,
    channels: 4,
    background: { r: 24, g: 24, b: 28, alpha: 1 },
  },
})
  .composite(
    tiras.map((input, i) => ({
      input,
      left: PAD + (i % COLS) * (768 + PAD),
      top: PAD + Math.floor(i / COLS) * (432 + PAD),
    })),
  )
  .png()
  .toFile(saida);
console.log(saida);
