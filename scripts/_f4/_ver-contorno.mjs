// O CONTORNO DA BORDA B — a câmara do golfinho antes, durante e depois do duelo, e o duto de
// referência (o fio aceso). Monta a folha de contato.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-contorno.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'scripts/_f4/_folha-contorno.png';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(700);

const salta = (t) =>
  page.evaluate((t) => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 999;
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    s.elapsed = t;
    s.director.skipTo(t);
    s.aplicaCorredorEMoldura(t);
  }, t);
const ate = (t) =>
  page.waitForFunction((a) => window.__game.scene.getScenes(true)[0].elapsed >= a, t, {
    timeout: 120000,
    polling: 16,
  });

const tiras = [];
const foto = async (rotulo) => {
  console.log(rotulo);
  tiras.push(await page.screenshot());
};

await salta(38);
await ate(42.2); await foto('a junta A|B');
await ate(47); await foto('duelo');
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].golfinho?.vulneravel, null, {
  timeout: 60000,
  polling: 50,
});
await page.evaluate(() => window.__game.scene.getScenes(true)[0].matarGolfinho());
await page.waitForTimeout(4000); await foto('depois do golfinho');
await ate(66.5); await foto('entrando no duto');
await ate(72); await foto('duto (referência)');
await ate(106.5); await foto('fim do duto');
await browser.close();

const PAD = 6, COLS = 2;
const linhas = Math.ceil(tiras.length / COLS);
await sharp({
  create: { width: COLS * (768 + PAD) + PAD, height: linhas * (432 + PAD) + PAD, channels: 4,
    background: { r: 24, g: 24, b: 28, alpha: 1 } },
})
  .composite(tiras.map((buf, i) => ({ input: buf, left: PAD + (i % COLS) * (768 + PAD),
    top: PAD + Math.floor(i / COLS) * (432 + PAD) })))
  .png()
  .toFile(saida);
console.log(saida);
